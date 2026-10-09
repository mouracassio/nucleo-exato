// /api/admin/produtos — o cadastro de produtos do site, guardado no KV PRODUTOS.
//   GET  → todos os produtos (ativos e inativos), ordenados.
//   POST → cria ou atualiza um produto. Corpo: o produto inteiro (ver CAMPOS).
//
// Um produto nunca é apagado por aqui: para tirar da loja, desative (ativo=false).
// Para sumir também do painel, marque arquivado=true.
//
// 08/10/2026 (loja v2): subcategoria, tags e destaqueLoja. As categorias e
// subcategorias válidas estão em dados/conteudo.json (chave "categorias").
import { json, exigirSessao } from "./sessao.js";

export const CAMPOS = {
  id: "",              // slug curto e único: epi, nr13, mat1... (vira a chave em links.js e no HTML)
  nome: "",            // título do cartão
  resumo: "",          // texto do cartão (1 a 2 frases)
  preco: "",           // só texto, como aparece: "34,90"
  capa: "",            // caminho da imagem: img/capa-epi.jpg ou /api/imagem/capa-epi.jpg
  alt: "",             // texto alternativo da capa
  pagina: "",          // página própria (niosh.html) ou vazio
  checkout: "",        // link de checkout da Kiwify
  arquivo: "",         // 1º arquivo da entrega (compatibilidade com o cadastro antigo)
  arquivos: [],        // lista de chaves no R2 entregues pelo código: ["entregas/mat3-01.zip", ...]
  sku: "",             // SST-EPI-01
  categoria: "",       // seguranca-do-trabalho | educacao | gestao (ids de dados/conteudo.json)
  subcategoria: "",    // id da subcategoria dentro da categoria (ex.: riscos-pgr, matematica-em, financeira)
  tags: [],            // palavras-chave extras para a busca da loja: ["NR-35", "cinturão", "trava-quedas"]
  ativo: true,         // aparece na loja e pode ser comprado
  destaqueHome: false, // aparece também na página inicial
  destaqueLoja: false, // entra na vitrine rotativa do topo da loja
  arquivado: false,    // some do painel (nunca é apagado do banco)
  ordem: 100,          // menor aparece primeiro
  obs: "",             // anotações internas (não vai pro site)
  entrega: "",         // o que o cliente recebe: "planilha Excel (.xlsx)", "arquivo Word e PDF (.zip)"...
  comoUsar: "",        // 1 a 3 frases de "no dia a dia" para o texto de entrega (vem do LEIA-ME)
};

const PREFIXO = "produto:";

export async function listarProdutos(env) {
  const lista = [];
  let cursor;
  do {
    const pag = await env.PRODUTOS.list({ prefix: PREFIXO, cursor, limit: 1000 });
    for (const k of pag.keys) {
      const txt = await env.PRODUTOS.get(k.name);
      if (txt) { try { lista.push({ ...CAMPOS, ...JSON.parse(txt) }); } catch {} }
    }
    cursor = pag.list_complete ? null : pag.cursor;
  } while (cursor);
  lista.sort((a, b) => (a.ordem - b.ordem) || a.nome.localeCompare(b.nome, "pt-BR"));
  return lista;
}

export function validarProduto(p) {
  const erros = [];
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(p.id || "")) erros.push("id: use só letras minúsculas, números e hífen (ex.: epi, nr13, mat1)");
  if (!p.nome || !p.nome.trim()) erros.push("nome é obrigatório");
  if (!/^\d{1,5},\d{2}$/.test(p.preco || "")) erros.push("preço no formato 34,90");
  if (p.checkout && !/^https:\/\/pay\.kiwify\.com\.br\//.test(p.checkout)) erros.push("checkout precisa começar com https://pay.kiwify.com.br/");
  if (p.pagina && !/^[a-z0-9-]+\.html$/.test(p.pagina)) erros.push("página: nome-do-arquivo.html, sem barra");
  if (p.arquivo && !/^entregas\/[A-Za-z0-9._-]+$/.test(p.arquivo)) erros.push("arquivo: entregas/nome.zip");
  if (!Array.isArray(p.arquivos)) erros.push("arquivos: precisa ser uma lista");
  else {
    if (p.arquivos.length > 40) erros.push("arquivos: no máximo 40 por produto");
    for (const a of p.arquivos) if (!/^entregas\/[A-Za-z0-9._-]+$/.test(String(a || ""))) erros.push("arquivos: " + a + " (use entregas/nome.zip)");
  }
  if (p.capa && !/^(img\/[A-Za-z0-9._-]+|\/api\/imagem\/[A-Za-z0-9._-]+)$/.test(p.capa)) erros.push("capa: img/nome.jpg ou /api/imagem/nome.jpg");
  if (p.subcategoria && !/^[a-z0-9-]{1,40}$/.test(p.subcategoria)) erros.push("subcategoria: só letras minúsculas, números e hífen");
  if (p.tags.length > 30) erros.push("tags: no máximo 30 por produto");
  return erros;
}

export async function onRequestGet({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.PRODUTOS) return json({ erro: "Falta ligar o KV PRODUTOS ao projeto na Cloudflare (Settings → Bindings)." }, 503);
  return json({ produtos: await listarProdutos(env) });
}

export async function onRequestPost({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.PRODUTOS) return json({ erro: "Falta ligar o KV PRODUTOS ao projeto na Cloudflare." }, 503);

  let corpo;
  try { corpo = await request.json(); } catch { return json({ erro: "corpo inválido" }, 400); }

  // atualização parcial: se vier só {id, campo...}, completa com o que já está salvo
  const idPedido = String(corpo.id || "").trim().toLowerCase();
  const salvo = idPedido ? await env.PRODUTOS.get(PREFIXO + idPedido) : null;
  const base = salvo && corpo.parcial ? { ...CAMPOS, ...JSON.parse(salvo) } : { ...CAMPOS };

  const p = { ...base };
  for (const k of Object.keys(CAMPOS)) if (k in corpo) p[k] = corpo[k];
  p.id = idPedido;
  for (const k of ["nome", "resumo", "preco", "capa", "alt", "pagina", "checkout", "arquivo", "sku", "categoria", "subcategoria", "obs", "entrega", "comoUsar"]) p[k] = String(p[k] || "").trim();
  p.arquivos = Array.isArray(p.arquivos) ? p.arquivos.map(a => String(a || "").trim()).filter(Boolean) : [];
  if (typeof p.tags === "string") p.tags = p.tags.split(/[;,]/);
  p.tags = Array.isArray(p.tags) ? [...new Set(p.tags.map(t => String(t || "").trim()).filter(Boolean))] : [];
  // compatibilidade nos dois sentidos com o cadastro antigo de arquivo único
  if (!p.arquivos.length && p.arquivo) p.arquivos = [p.arquivo];
  if (p.arquivos.length) p.arquivo = p.arquivos[0];
  p.ativo = !!p.ativo; p.destaqueHome = !!p.destaqueHome; p.destaqueLoja = !!p.destaqueLoja; p.arquivado = !!p.arquivado;
  p.ordem = Number(p.ordem) || 100;
  if (!p.alt) p.alt = p.nome;

  const erros = validarProduto(p);
  if (erros.length) return json({ erro: erros.join(" · ") }, 400);

  p.criadoEm = salvo ? (JSON.parse(salvo).criadoEm || Date.now()) : Date.now();
  p.atualizadoEm = Date.now();
  await env.PRODUTOS.put(PREFIXO + p.id, JSON.stringify(p));
  return json({ ok: true, produto: p, novo: !salvo });
}
