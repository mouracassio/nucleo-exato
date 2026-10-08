// Vendas do Núcleo Exato (todos os canais), guardadas no KV PRODUTOS com o
// prefixo "venda:" (o mesmo banco dos produtos, que só lista "produto:").
//
// GET    /api/admin/vendas            → lista (mais recente primeiro)
// POST   /api/admin/vendas            → cria ou atualiza { venda, cliente?, gerarAcesso? }
//                                       · liga a venda ao cliente (cria/atualiza o cadastro)
//                                       · gera o código de acesso na hora, em QUALQUER canal,
//                                         quando o produto tem arquivo de entrega (gerarAcesso !== false)
// DELETE /api/admin/vendas { id }     → apaga uma venda (registro errado/teste)
//
// Quem cria venda sozinho: o webhook da Kiwify (venda aprovada) e gerar.js (reposição de código).
import { json, exigirSessao } from "./sessao.js";
import { gerarAcesso, encontrarOuCriarCliente, lerCliente, soDigitos } from "./acesso-lib.js";

export const PREFIXO = "venda:";

export const CAMPOS = {
  id: "",              // ex.: ml-2000018718174656-<produtoId>, kiwify-<order_id>, manual-<timestamp>
  canal: "",           // Mercado Livre | Kiwify | Site | Direta | Shopee | Outra
  produtoId: "",       // id do produto no painel (pode ficar vazio se não casou)
  produto: "",         // nome do produto como vendido
  sku: "",
  clienteId: "",       // cadastro em "cliente:"
  comprador: "",       // nome (cópia do cadastro, para a lista)
  comoChamar: "",      // como tratar nas mensagens
  email: "",           // cópia do cadastro
  telefone: "",        // cópia do cadastro, só números com DDI (55...)
  valor: 0,            // em reais, número (18.9)
  numeroVenda: "",     // nº da venda/pedido na plataforma
  dataVenda: "",       // AAAA-MM-DD
  codigo: "",          // código de acesso gerado
  codigoExpiraEm: 0,
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
  for (const k of Object.keys(CAMPOS)) if (v[k] !== undefined && v[k] !== null) out[k] = v[k];
  out.id = String(out.id || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80);
  for (const k of ["canal", "produto", "sku", "clienteId", "comprador", "comoChamar", "produtoId"]) out[k] = String(out[k] || "").trim();
  out.email = String(out.email || "").trim().toLowerCase();
  out.telefone = soDigitos(out.telefone);
  out.numeroVenda = String(out.numeroVenda || "").replace(/[#\s]/g, "");
  out.dataVenda = String(out.dataVenda || "").slice(0, 10);
  out.codigo = String(out.codigo || "").trim().toUpperCase();
  out.codigoExpiraEm = Number(out.codigoExpiraEm) || 0;
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

export function prefixoCanal(canal) {
  const c = String(canal || "");
  return c === "Mercado Livre" ? "ml-" : c === "Kiwify" ? "kiwify-" : c === "Shopee" ? "shopee-" : c === "Site" ? "site-" : c === "Direta" ? "direta-" : "outra-";
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
  const dadosCliente = corpo && corpo.cliente && typeof corpo.cliente === "object" ? corpo.cliente : null;
  const querAcesso = !(corpo && corpo.gerarAcesso === false);

  // id: o da venda existente, ou um novo pelo canal + nº do pedido (+ produto), ou manual-<timestamp>
  if (!v0.id) {
    const num = String(v0.numeroVenda || "").replace(/[#\s]/g, "");
    v0.id = num ? prefixoCanal(v0.canal) + num + (v0.produtoId ? "-" + v0.produtoId : "") : "manual-" + Date.now();
  }
  const idLimpo = String(v0.id).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80);
  const txt = await env.PRODUTOS.get(PREFIXO + idLimpo);
  const anterior = txt ? JSON.parse(txt) : null;

  // produto: completa nome/SKU pelo cadastro quando veio só o id
  let produto = null;
  if (v0.produtoId) {
    const tp = await env.PRODUTOS.get("produto:" + String(v0.produtoId));
    if (tp) { produto = JSON.parse(tp); if (!v0.produto) v0.produto = produto.nome; if (!v0.sku) v0.sku = produto.sku || ""; if ((v0.valor === undefined || v0.valor === "") && !anterior) v0.valor = produto.preco; }
  }

  // cliente: cria/atualiza o cadastro e liga a venda a ele
  let cliente = null;
  const avisos = [];
  try {
    if (dadosCliente && (dadosCliente.nome || dadosCliente.email || dadosCliente.cpfCnpj || dadosCliente.telefone || dadosCliente.id)) {
      if (!dadosCliente.origem) dadosCliente.origem = v0.canal || "";
      cliente = await encontrarOuCriarCliente(env, dadosCliente);
    } else if (v0.clienteId || (anterior && anterior.clienteId)) {
      cliente = await lerCliente(env, v0.clienteId || anterior.clienteId);
    } else if (v0.comprador || v0.email) {
      cliente = await encontrarOuCriarCliente(env, { nome: v0.comprador, email: v0.email, telefone: v0.telefone, comoChamar: v0.comoChamar, origem: v0.canal || "" });
    }
  } catch (e) { avisos.push("cliente não salvo: " + (e.message || e)); }
  if (cliente) {
    v0.clienteId = cliente.id;
    v0.comprador = cliente.nome; v0.email = cliente.email; v0.telefone = cliente.telefone; v0.comoChamar = cliente.comoChamar;
  }

  let v = normalizarVenda(v0, anterior);
  const erros = validarVenda(v);
  if (erros.length) return json({ erro: erros.join("; ") }, 400);

  // acesso: gera o código na hora (qualquer canal) se ainda não tem e o produto tem arquivo
  let acesso = null;
  if (querAcesso && !v.codigo && v.produtoId) {
    try {
      const r = await gerarAcesso(env, {
        produtoId: v.produtoId, plataforma: v.canal, numeroVenda: v.numeroVenda || v.id,
        dataVenda: v.dataVenda, meses: corpo.meses, origin: new URL(request.url).origin,
      });
      v.codigo = r.codigo; v.codigoExpiraEm = r.expiraEm;
      acesso = { codigo: r.codigo, expiraEm: r.expiraEm, link: r.link, reaproveitado: r.reaproveitado };
    } catch (e) { avisos.push("código não gerado: " + (e.message || e)); }
  } else if (v.codigo) {
    acesso = { codigo: v.codigo, expiraEm: v.codigoExpiraEm || 0, link: new URL(request.url).origin + "/acesso.html?codigo=" + v.codigo, reaproveitado: true };
  }

  await salvarVenda(env, v);
  return json({ ok: true, venda: v, cliente, acesso, avisos, novo: !anterior });
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
