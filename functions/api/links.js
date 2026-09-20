// GET /api/links.js — o links.js com os preços e checkouts do painel (KV PRODUTOS).
//
// Por que existe: /links.js é um arquivo estático do Pages e o CDN o entrega
// direto, com cache de 4 horas, sem passar pelo _middleware.js. Resultado: o
// painel trocava o preço e a loja continuava mostrando o antigo por horas.
// Como /api/* é sempre Function, aqui o preço sai do banco a cada visita.
import { listarProdutos } from "./admin/produtos.js";

export async function onRequestGet({ request, env }) {
  const base = await env.ASSETS.fetch(new URL("/links.js", request.url));
  let texto = await base.text();

  if (env.PRODUTOS) {
    try {
      const ativos = (await listarProdutos(env)).filter(p => p.ativo && !p.arquivado);
      if (ativos.length) {
        const bloco = "var PRODUTOS = {\n" + ativos.map(p =>
          "  " + JSON.stringify(p.id) + ": { checkout: " + JSON.stringify(p.checkout || "COLE-AQUI") +
          ", preco: " + JSON.stringify(p.preco || "") + " }").join(",\n") +
          "\n};\n/* gerado a cada visita a partir do painel — não edite na mão */";
        texto = texto.replace(/var PRODUTOS\s*=\s*\{[\s\S]*?\n\};/, bloco);
      }
    } catch (e) { /* se o banco falhar, vale o arquivo como está */ }
  }

  return new Response(texto, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
