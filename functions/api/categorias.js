// GET /api/categorias — lista PÚBLICA das categorias e subcategorias ativas da loja.
import { lerCategorias } from "./admin/categorias.js";
export async function onRequestGet({ request, env }) {
  const lista = (await lerCategorias(env, new URL(request.url).origin)).filter(c => c.ativo)
    .map(c => ({ id: c.id, nome: c.nome, cor: c.cor, intro: c.intro, subs: c.subs }));
  return new Response(JSON.stringify({ categorias: lista }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60" },
  });
}
