// A loja dinâmica — roda antes de qualquer página do site.
//
// O site continua sendo HTML estático, mas os PRODUTOS vivem no KV PRODUTOS
// (editado em admin.html). Este arquivo junta as duas coisas na hora de servir,
// sem ninguém precisar publicar no GitHub:
//
//   1. /links.js        → o bloco "var PRODUTOS = {...}" é trocado pelos produtos
//                          ativos do banco (preço e checkout atuais).
//   2. index.html       → produto desativado some (cartão escondido); produto novo
//                          marcado "destaque na home" ganha um cartão na grade.
//   3. materiais.html   → a LOJA v2 (08/10/2026): a página recebe, dentro de
//                          <script id="loja-dados">, os produtos ativos e as
//                          categorias/subcategorias de dados/conteudo.json, e
//                          monta vitrine, painel lateral, busca e grades no navegador.
//   4. todas as páginas → ganham o campo de busca no topo (leva para a loja).
//
// Se o KV estiver vazio ou desligado, nada muda: o site sai como está no GitHub.

import { lerCategorias } from "./api/admin/categorias.js";

const VERSAO_CSS = "20261008c"; // mude quando css/estilo.css ou css/loja.css mudarem: força o navegador a baixar de novo
let cache = { quando: 0, produtos: null, categorias: null };
const CACHE_MS = 30 * 1000;

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const caminho = url.pathname;

  const ehLinks = caminho === "/links.js";
  const ehHtml = caminho === "/" || caminho.endsWith(".html") || !caminho.includes(".");
  if (!ehLinks && !ehHtml) return next();
  if (caminho === "/admin.html" || caminho === "/admin" || caminho === "/painel.html" || caminho.startsWith("/api/")) return next();

  const resposta = await next();
  const tipo = resposta.headers.get("content-type") || "";
  if (ehHtml && !tipo.includes("text/html")) return resposta;

  const dados = await carregar(env, url.origin);
  if (ehLinks) return dados.produtos.length ? reescreverLinks(resposta, dados.produtos) : resposta;
  return reescreverHtml(resposta, caminho, dados);
}

/* ---------- dados ---------- */

async function carregar(env, origem) {
  if (Date.now() - cache.quando < CACHE_MS && cache.produtos) return cache;
  const produtos = [];
  if (env.PRODUTOS) {
    let cursor;
    do {
      const pag = await env.PRODUTOS.list({ prefix: "produto:", cursor, limit: 1000 });
      for (const k of pag.keys) {
        const txt = await env.PRODUTOS.get(k.name);
        if (txt) { try { produtos.push(JSON.parse(txt)); } catch {} }
      }
      cursor = pag.list_complete ? null : pag.cursor;
    } while (cursor);
  }
  produtos.sort((a, b) => ((a.ordem || 100) - (b.ordem || 100)) || String(a.nome).localeCompare(String(b.nome), "pt-BR"));

  // categorias e subcategorias: as salvas no painel (KV, chave config:categorias);
  // se nunca foram salvas, as de dados/conteudo.json
  let categorias = [];
  try {
    categorias = (await lerCategorias(env, origem)).filter(c => c.ativo)
      .map(c => ({ id: c.id, nome: c.nome, cor: c.cor || "", intro: c.intro || "", subs: (c.subs || []).map(s => ({ id: s.id, nome: s.nome })) }));
  } catch {}

  cache = { quando: Date.now(), produtos, categorias };
  return cache;
}

function publico(p) {
  return { id: p.id, nome: p.nome, resumo: p.resumo || "", preco: p.preco || "", capa: p.capa || "", alt: p.alt || p.nome,
           pagina: p.pagina || "", checkout: p.checkout || "", categoria: p.categoria || "", subcategoria: p.subcategoria || "",
           sku: p.sku || "", tags: Array.isArray(p.tags) ? p.tags : [], entrega: p.entrega || "",
           destaqueHome: !!p.destaqueHome, destaqueLoja: !!p.destaqueLoja, ordem: p.ordem || 100, criadoEm: p.criadoEm || 0 };
}

/* ---------- links.js ---------- */

async function reescreverLinks(resposta, produtos) {
  const texto = await resposta.text();
  const ativos = produtos.filter(p => p.ativo && !p.arquivado);
  const bloco = "var PRODUTOS = {\n" + ativos.map(p =>
    "  " + JSON.stringify(p.id) + ": { checkout: " + JSON.stringify(p.checkout || "COLE-AQUI") +
    ", preco: " + JSON.stringify(p.preco || "") + " }").join(",\n") +
    "\n};\n/* gerado pelo painel admin.html — os produtos vivem no banco, não neste arquivo */";
  const novo = texto.replace(/var PRODUTOS\s*=\s*\{[\s\S]*?\n\};/, bloco);
  return new Response(novo, {
    status: resposta.status,
    headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=60" },
  });
}

/* ---------- páginas ---------- */

const BUSCA_TOPO = '<form class="busca-topo" action="materiais.html" method="get" role="search">' +
  '<input type="search" name="q" placeholder="Buscar material (NR, planilha, matem&aacute;tica...)" aria-label="Buscar na loja" autocomplete="off">' +
  '<button type="submit" aria-label="Buscar"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></form>';

function reescreverHtml(resposta, caminho, dados) {
  const { produtos, categorias } = dados;
  const inativos = produtos.filter(p => !p.ativo || p.arquivado).map(p => p.id);
  const ativos = produtos.filter(p => p.ativo && !p.arquivado);
  const ehHome = caminho === "/" || caminho === "/index.html";
  const ehLoja = caminho === "/materiais.html" || caminho === "/materiais";

  const rw = new HTMLRewriter();

  // versão nos CSS, para o navegador não usar a cópia velha do cache
  rw.on('link[rel="stylesheet"]', {
    element(el) { const h = el.getAttribute("href") || ""; if (/^css\/[a-z-]+\.css$/.test(h)) el.setAttribute("href", h + "?v=" + VERSAO_CSS); },
  });

  // campo de busca no topo de todas as páginas (a loja já tem o seu, no HTML)
  let buscaPosta = false;
  rw.on("div.barra nav", {
    element(el) { if (!buscaPosta && !ehLoja) { el.before(BUSCA_TOPO, { html: true }); buscaPosta = true; } },
  });

  if (inativos.length) {
    rw.on("head", {
      element(el) {
        const regras = inativos.map(id => '.prod:has([data-produto="' + id + '"]){display:none}').join("");
        el.append("<style>" + regras + "</style>", { html: true });
      },
    });
  }

  if (ehLoja) {
    rw.on("script#loja-dados", {
      element(el) {
        const json = JSON.stringify({ produtos: ativos.map(publico), categorias, geradoEm: Date.now() })
          .replace(/<\//g, "<\\/");
        el.setInnerContent(json, { html: true });
      },
    });
    return rw.transform(resposta);
  }

  if (ehHome && ativos.length) {
    const vistos = new Set();
    rw.on("div.produtos", {
      element(el) {
        el.onEndTag(fim => {
          const faltam = ativos.filter(p => p.destaqueHome && !vistos.has(p.id));
          if (faltam.length) fim.before(faltam.map(cartao).join(""), { html: true });
          faltam.forEach(p => vistos.add(p.id));
        });
      },
    });
    rw.on("div.produtos [data-produto]", {
      element(el) { vistos.add(el.getAttribute("data-produto")); },
    });
  }

  return rw.transform(resposta);
}

function cartao(p) {
  const nome = esc(p.nome), alt = esc(p.alt || p.nome), resumo = esc(p.resumo || "");
  const capa = p.capa ? '<img src="' + esc(p.capa) + '" alt="' + alt + '" loading="lazy">' : "";
  const img = p.pagina ? '<a href="' + esc(p.pagina) + '">' + capa + "</a>" : capa;
  const ver = p.pagina ? '<a class="ver" href="' + esc(p.pagina) + '">Ver tudo o que vem &rarr;</a>' : "";
  const href = p.checkout ? ' href="' + esc(p.checkout) + '" rel="noopener"' : "";
  return '<div class="prod">' + img +
    '<div class="txt"><h3>' + nome + "</h3><p>" + resumo + "</p>" +
    '<div class="rod"><div class="val">R$ <span data-preco="' + esc(p.id) + '">' + esc(p.preco) + "</span></div>" +
    '<a class="bt" data-produto="' + esc(p.id) + '"' + href + '><span data-rotulo>Comprar agora</span></a></div>' +
    ver + "</div></div>";
}

function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
