// A loja dinâmica — roda antes de qualquer página do site.
//
// O site continua sendo HTML estático gerado pelo painel.html, mas os PRODUTOS
// passam a viver no KV PRODUTOS (editado em admin.html). Este arquivo junta as
// duas coisas na hora de servir, sem ninguém precisar publicar no GitHub:
//
//   1. /links.js        → o bloco "var PRODUTOS = {...}" é trocado pelos produtos
//                          ativos do banco (preço e checkout atuais).
//   2. páginas .html    → produto desativado some da loja (o cartão é escondido);
//                          produto novo que ainda não está no HTML ganha um cartão
//                          no fim da grade certa (materiais.html por categoria,
//                          index.html só os marcados "destaque na home").
//
// Se o KV estiver vazio ou desligado, nada muda: o site sai como está no GitHub.

let cache = { quando: 0, produtos: null, categorias: null };
const CACHE_MS = 30 * 1000;

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const caminho = url.pathname;

  const ehLinks = caminho === "/links.js";
  const ehHtml = caminho === "/" || caminho.endsWith(".html") || !caminho.includes(".");
  if (!ehLinks && !ehHtml) return next();
  if (caminho === "/admin.html" || caminho.startsWith("/api/")) return next();

  const resposta = await next();
  const dados = await carregar(env, url.origin);
  if (!dados.produtos || !dados.produtos.length) return resposta;

  if (ehLinks) return reescreverLinks(resposta, dados.produtos);

  const tipo = resposta.headers.get("content-type") || "";
  if (!tipo.includes("text/html")) return resposta;
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

  let categorias = [];
  try {
    const r = await env.ASSETS.fetch(origem + "/dados/conteudo.json");
    if (r.ok) categorias = ((await r.json()).categorias || []).filter(c => c.ativo && !c.arquivado).map(c => c.id);
  } catch {}

  cache = { quando: Date.now(), produtos, categorias };
  return cache;
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

function reescreverHtml(resposta, caminho, dados) {
  const { produtos, categorias } = dados;
  const inativos = produtos.filter(p => !p.ativo || p.arquivado).map(p => p.id);
  const ativos = produtos.filter(p => p.ativo && !p.arquivado);
  const ehHome = caminho === "/" || caminho === "/index.html";
  const ehLoja = caminho === "/materiais.html";

  let grade = -1;               // índice da grade .produtos atual
  const vistos = new Set();     // ids que já têm cartão em alguma grade da página
  const porGrade = [];          // ids por grade

  const rw = new HTMLRewriter();

  if (inativos.length) {
    rw.on("head", {
      element(el) {
        const regras = inativos.map(id => '.prod:has([data-produto="' + id + '"]){display:none}').join("");
        el.append("<style>" + regras + "</style>", { html: true });
      },
    });
  }

  if (ehHome || ehLoja) {
    rw.on("div.produtos", {
      element(el) {
        grade++;
        const minha = grade;
        porGrade[minha] = new Set();
        el.onEndTag(fim => {
          let faltam;
          if (ehHome) {
            faltam = ativos.filter(p => p.destaqueHome && !vistos.has(p.id));
          } else {
            const cat = categorias[minha];
            const ultima = minha === categorias.length - 1 || categorias.length === 0;
            faltam = ativos.filter(p => !vistos.has(p.id) && (p.categoria === cat || (ultima && !categorias.includes(p.categoria))));
          }
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
