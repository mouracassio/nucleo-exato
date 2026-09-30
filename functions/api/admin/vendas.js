// Vendas do Núcleo Exato (todos os canais), guardadas no KV PRODUTOS com o
// prefixo "venda:" (o mesmo banco dos produtos, que só lista "produto:").
//
// GET    /api/admin/vendas            → lista (mais recente primeiro)
// POST   /api/admin/vendas            → cria ou atualiza { venda }
// DELETE /api/admin/vendas { id }     → apaga uma venda (registro errado/teste)
//
// Quem cria venda sozinho: gerar.js (ao gerar o código de uma venda do ML/Shopee)
// e /api/webhook/kiwify (venda aprovada na Kiwify).
import { json, exigirSessao } from "./sessao.js";

export const PREFIXO = "venda:";

export const CAMPOS = {
  id: "",              // ex.: ml-2000018718174656, kiwify-<order_id>, manual-<timestamp>
  canal: "",           // Mercado Livre | Kiwify | Site | Direta | Shopee | Outra
  produtoId: "",       // id do produto no painel (pode ficar vazio se não casou)
  produto: "",         // nome do produto como vendido
  sku: "",
  comprador: "",       // nome
  email: "",           // só para venda fora do ML (o ML não fornece)
  valor: 0,            // em reais, número (18.9)
  numeroVenda: "",     // nº da venda/pedido na plataforma
  dataVenda: "",       // AAAA-MM-DD
  codigo: "",          // código de acesso gerado (ML/Shopee/Direta)
  status: "paga",      // paga | reembolsada | cancelada
  entregue: false,
  avaliado: false,
  obs: "",
  origem: "painel",    // painel | gerar | kiwify-webhook
  criadoEm: 0,
  atualizadoEm: 0,
};

export async function listarVendas(env) {
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
  lista.sort((a, b) => (b.dataVenda || "").localeCompare(a.dataVenda || "") || (b.criadoEm || 0) - (a.criadoEm || 0));
  return lista;
}

export function normalizarVenda(v, anterior) {
  const base = { ...CAMPOS, ...(anterior || {}) };
  const out = { ...base };
  for (const k of Object.keys(CAMPOS)) if (v[k] !== undefined) out[k] = v[k];
  out.id = String(out.id || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80);
  out.canal = String(out.canal || "").trim();
  out.produto = String(out.produto || "").trim();
  out.comprador = String(out.comprador || "").trim();
  out.email = String(out.email || "").trim().toLowerCase();
  out.numeroVenda = String(out.numeroVenda || "").replace(/[#\s]/g, "");
  out.dataVenda = String(out.dataVenda || "").slice(0, 10);
  out.codigo = String(out.codigo || "").trim().toUpperCase();
  out.status = ["paga", "reembolsada", "cancelada"].includes(out.status) ? out.status : "paga";
  out.entregue = !!out.entregue; out.avaliado = !!out.avaliado;
  out.obs = String(out.obs || "").slice(0, 1000);
  let val = out.valor;
  if (typeof val === "string") val = Number(val.replace(/\./g, "").replace(",", "."));
  out.valor = Number.isFinite(Number(val)) ? Math.round(Number(val) * 100) / 100 : 0;
  out.criadoEm = base.criadoEm || Date.now();
  out.atualizadoEm = Date.now();
  return out;
}

export function validarVenda(v) {
  const erros = [];
  if (!v.id) erros.push("id vazio");
  if (!v.canal) erros.push("informe o canal");
  if (!v.produto) erros.push("informe o produto");
  if (!v.dataVenda || !/^\d{4}-\d{2}-\d{2}$/.test(v.dataVenda)) erros.push("data da venda no formato AAAA-MM-DD");
  if (!(v.valor >= 0)) erros.push("valor inválido");
  return erros;
}

export async function salvarVenda(env, v) {
  await env.PRODUTOS.put(PREFIXO + v.id, JSON.stringify(v));
  return v;
}

export async function onRequestGet({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.PRODUTOS) return json({ erro: "Falta ligar o KV PRODUTOS na Cloudflare." }, 503);
  const vendas = await listarVendas(env);
  return json({ total: vendas.length, vendas });
}

export async function onRequestPost({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.PRODUTOS) return json({ erro: "Falta ligar o KV PRODUTOS na Cloudflare." }, 503);
  let corpo;
  try { corpo = await request.json(); } catch { return json({ erro: "corpo inválido" }, 400); }
  const v0 = corpo && corpo.venda ? corpo.venda : corpo;
  if (!v0 || typeof v0 !== "object") return json({ erro: "venda inválida" }, 400);
  if (!v0.id) v0.id = "manual-" + Date.now();
  const idLimpo = String(v0.id).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80);
  const txt = await env.PRODUTOS.get(PREFIXO + idLimpo);
  const anterior = txt ? JSON.parse(txt) : null;
  const v = normalizarVenda(v0, anterior);
  const erros = validarVenda(v);
  if (erros.length) return json({ erro: erros.join("; ") }, 400);
  await salvarVenda(env, v);
  return json({ ok: true, venda: v, novo: !anterior });
}

export async function onRequestDelete({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.PRODUTOS) return json({ erro: "Falta ligar o KV PRODUTOS na Cloudflare." }, 503);
  let corpo;
  try { corpo = await request.json(); } catch { return json({ erro: "corpo inválido" }, 400); }
  const id = String((corpo && corpo.id) || "").trim().toLowerCase();
  if (!id) return json({ erro: "id inválido" }, 400);
  if (!(await env.PRODUTOS.get(PREFIXO + id))) return json({ erro: "venda não encontrada" }, 404);
  await env.PRODUTOS.delete(PREFIXO + id);
  return json({ ok: true, id });
}
