// GET /api/produtos.json — preço e checkout de cada produto, direto do painel.
//
// Por que existe: /links.js é arquivo estático e o CDN o entrega com horas de
// cache, então o preço trocado no painel demorava a aparecer na loja. O
// links.js busca este endereço ao abrir a página e corrige os preços na hora.
// Por estar sob /api/, nunca é cacheado.
import { listarProdutos } from "./admin/produtos.js";

export async function onRequestGet({ env }) {
  const saida = {};
  try {
    if (env.PRODUTOS) {
      for (const p of await listarProdutos(env)) {
        if (!p.ativo || p.arquivado) continue;
        saida[p.id] = { checkout: p.checkout || "", preco: p.preco || "" };
      }
    }
  } catch (e) { /* sem banco, devolve vazio e o site segue com o links.js */ }
  return new Response(JSON.stringify(saida), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
