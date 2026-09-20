// POST /api/admin/gerar — gera um código de acesso para uma venda de fora da
// Kiwify (Mercado Livre ou Shopee). Corpo: { produtoId, meses, plataforma,
// numeroVenda, dataVenda }. O arquivo entregue é o cadastrado no produto.
// Substitui o antigo /api/gerar (que pedia a SENHA_ADMIN solta).
import { json, exigirSessao } from "./sessao.js";

export async function onRequestPost({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.PRODUTOS || !env.ACESSOS) return json({ erro: "Faltam ligações KV (PRODUTOS / ACESSOS) na Cloudflare." }, 503);

  let corpo;
  try { corpo = await request.json(); } catch { return json({ erro: "corpo inválido" }, 400); }
  const { produtoId, meses, plataforma, numeroVenda, dataVenda } = corpo;

  const txt = await env.PRODUTOS.get("produto:" + String(produtoId || ""));
  if (!txt) return json({ erro: "produto não encontrado" }, 404);
  const p = JSON.parse(txt);
  const arquivos = (Array.isArray(p.arquivos) && p.arquivos.length) ? p.arquivos : (p.arquivo ? [p.arquivo] : []);
  if (!arquivos.length) return json({ erro: "Este produto ainda não tem arquivo de entrega cadastrado. Suba os arquivos na aba Arquivos e marque no produto." }, 400);
  if (env.ARQUIVOS) {
    const faltando = [];
    for (const a of arquivos) if (!(await env.ARQUIVOS.head(a))) faltando.push(a);
    if (faltando.length) return json({ erro: "Não está(ão) no R2: " + faltando.join(", ") + ". Suba na aba Arquivos antes de gerar o código." }, 400);
  }

  const validadeMeses = Number(meses) > 0 ? Number(meses) : 6;
  const codigo = gerarCodigo();
  const criadoEm = Date.now();
  const expiraEm = criadoEm + validadeMeses * 30 * 24 * 60 * 60 * 1000;

  const registro = {
    produto: p.nome, produtoId: p.id, arquivo: arquivos[0], arquivos, sku: p.sku || "",
    plataforma: String(plataforma || ""), numeroVenda: String(numeroVenda || ""), dataVenda: String(dataVenda || ""),
    criadoEm, expiraEm, usos: 0,
  };
  await env.ACESSOS.put(codigo, JSON.stringify(registro), { metadata: registro });

  const link = new URL(request.url).origin + "/acesso.html?codigo=" + codigo;
  return json({ codigo, expiraEm, link, produto: p.nome });
}

function gerarCodigo() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem O/0/I/1, pra não confundir na digitação
  let c = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (let i = 0; i < 8; i++) c += alfabeto[bytes[i] % alfabeto.length];
  return c;
}
