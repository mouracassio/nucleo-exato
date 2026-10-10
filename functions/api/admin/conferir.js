// /api/admin/conferir — confere os arquivos de entrega de todos os produtos (10/10/2026).
//   GET → para cada produto não arquivado, olha cada arquivo de entrega no R2:
//         existe? tem tamanho? começa com a assinatura certa (zip/xlsx/docx = "PK", pdf = "%PDF")?
//         e, se for zip, o fim do arquivo tem o "índice" do zip (assinatura PK 05 06)?
//         Um zip cortado no meio do envio falha nesse último teste.
// Só lê: não muda nada no R2 nem no cadastro.
import { json, exigirSessao } from "./sessao.js";
import { listarProdutos } from "./produtos.js";

function arquivosDe(p) { return (p.arquivos && p.arquivos.length) ? p.arquivos : (p.arquivo ? [p.arquivo] : []); }

async function conferirChave(env, chave) {
  const head = await env.ARQUIVOS.head(chave);
  if (!head) return { chave, ok: false, problema: "não existe no servidor" };
  if (!head.size) return { chave, ok: false, tamanho: 0, problema: "arquivo vazio" };
  const ini = await env.ARQUIVOS.get(chave, { range: { offset: 0, length: 4 } });
  const b = new Uint8Array(await ini.arrayBuffer());
  const ehZip = b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
  const ehPdf = b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
  const ext = (chave.split(".").pop() || "").toLowerCase();
  const esperaZip = ["zip", "xlsx", "docx", "pptx"].includes(ext);
  if (esperaZip && !ehZip) return { chave, ok: false, tamanho: head.size, problema: "não começa como zip (arquivo corrompido ou de outro tipo)" };
  if (ext === "pdf" && !ehPdf) return { chave, ok: false, tamanho: head.size, problema: "não começa como PDF" };
  if (ehZip) {
    const n = Math.min(head.size, 66000);
    const fim = await env.ARQUIVOS.get(chave, { range: { offset: head.size - n, length: n } });
    const f = new Uint8Array(await fim.arrayBuffer());
    let achou = false;
    for (let i = f.length - 22; i >= 0; i--) { if (f[i] === 0x50 && f[i + 1] === 0x4b && f[i + 2] === 0x05 && f[i + 3] === 0x06) { achou = true; break; } }
    if (!achou) return { chave, ok: false, tamanho: head.size, problema: "zip incompleto (falta o fim do arquivo)" };
  }
  return { chave, ok: true, tamanho: head.size };
}

export async function onRequestGet({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.ARQUIVOS) return json({ erro: "Falta ligar o R2 ARQUIVOS ao projeto na Cloudflare." }, 503);
  const produtos = (await listarProdutos(env)).filter(p => !p.arquivado);
  const cache = {};
  const saida = [];
  for (const p of produtos) {
    const lista = arquivosDe(p);
    const itens = [];
    for (const c of lista) { if (!cache[c]) cache[c] = await conferirChave(env, c); itens.push(cache[c]); }
    saida.push({ id: p.id, sku: p.sku || "", nome: p.nome, ativo: !!p.ativo, semArquivo: !lista.length, ok: lista.length > 0 && itens.every(i => i.ok), arquivos: itens });
  }
  const resumo = { produtos: saida.length, ok: saida.filter(s => s.ok).length, comProblema: saida.filter(s => !s.ok).length, arquivos: Object.keys(cache).length };
  return json({ conferidoEm: Date.now(), resumo, produtos: saida });
}
