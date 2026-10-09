// /api/admin/categorias — as categorias e subcategorias da loja, guardadas no KV
// PRODUTOS (chave "config:categorias"). Editadas na aba Categorias do painel.
//   GET  → a lista inteira (do KV; se o KV ainda não tiver, de dados/conteudo.json).
//   POST → salva a lista inteira (corpo: { categorias: [...] }).
//
// Cada categoria: { id, nome, cor, intro, ativo, subs: [ { id, nome } ] }.
// A ordem da lista é a ordem da coluna lateral da loja. Produto cuja categoria
// ou subcategoria não exista cai em "Outros", nunca some.
import { json, exigirSessao } from "./sessao.js";

export const CHAVE = "config:categorias";

export function slug(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export async function lerCategorias(env, origin) {
  if (env.PRODUTOS) {
    const txt = await env.PRODUTOS.get(CHAVE);
    if (txt) { try { const j = JSON.parse(txt); if (Array.isArray(j) && j.length) return j.map(normalizarCategoria); } catch {} }
  }
  // sem nada salvo ainda: o que está em dados/conteudo.json
  try {
    const r = await env.ASSETS.fetch(origin + "/dados/conteudo.json");
    if (r.ok) return ((await r.json()).categorias || []).filter(c => !c.arquivado).map(normalizarCategoria);
  } catch {}
  return [];
}

export function normalizarCategoria(c) {
  const subs = Array.isArray(c.subs) ? c.subs : [];
  return {
    id: slug(c.id || c.nome), nome: String(c.nome || "").trim(), cor: /^#[0-9a-fA-F]{6}$/.test(c.cor || "") ? c.cor : "#157347",
    intro: String(c.intro || "").trim(), ativo: c.ativo !== false,
    subs: subs.map(s => ({ id: slug(s.id || s.nome), nome: String(s.nome || "").trim() })).filter(s => s.id && s.nome),
  };
}

export function validarCategorias(lista) {
  const erros = [], ids = new Set();
  lista.forEach((c, i) => {
    if (!c.id) erros.push("categoria " + (i + 1) + ": sem id");
    if (!c.nome) erros.push("categoria " + (i + 1) + ": sem nome");
    if (ids.has(c.id)) erros.push("categoria repetida: " + c.id);
    ids.add(c.id);
    const sids = new Set();
    c.subs.forEach(s => { if (sids.has(s.id)) erros.push("subcategoria repetida em " + c.nome + ": " + s.id); sids.add(s.id); });
  });
  return erros;
}

export async function onRequestGet({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  return json({ categorias: await lerCategorias(env, new URL(request.url).origin) });
}

export async function onRequestPost({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.PRODUTOS) return json({ erro: "Falta ligar o KV PRODUTOS ao projeto na Cloudflare." }, 503);
  let corpo;
  try { corpo = await request.json(); } catch { return json({ erro: "corpo inválido" }, 400); }
  const lista = (Array.isArray(corpo.categorias) ? corpo.categorias : []).map(normalizarCategoria).filter(c => c.id || c.nome);
  if (!lista.length) return json({ erro: "A lista de categorias não pode ficar vazia." }, 400);
  const erros = validarCategorias(lista);
  if (erros.length) return json({ erro: erros.join(" · ") }, 400);
  await env.PRODUTOS.put(CHAVE, JSON.stringify(lista));
  return json({ ok: true, categorias: lista });
}
