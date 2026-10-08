// POST /api/webhook/kiwify?signature=...  — recebe os avisos de venda da Kiwify
// e registra a venda na aba Vendas do painel (KV PRODUTOS, prefixo "venda:").
//
// Como ligar (uma vez, pelo Cássio): Kiwify > Apps > Webhooks > Criar webhook,
// URL https://nucleoexato.com.br/api/webhook/kiwify, eventos "Compra aprovada"
// e "Reembolso" (e "Chargeback" se quiser), todos os produtos. A Kiwify mostra
// um TOKEN: colar na Cloudflare (Pages > Settings > Variables and Secrets) como
// segredo KIWIFY_WEBHOOK_TOKEN e fazer Retry deployment.
//
// Segurança: só aceita chamada cuja assinatura (HMAC-SHA1 do corpo com o token)
// bate. Sem token configurado, recusa tudo (503).
import { json } from "../admin/sessao.js";
import { PREFIXO, normalizarVenda, salvarVenda } from "../admin/vendas.js";
import { listarProdutos } from "../admin/produtos.js";
import { gerarAcesso, encontrarOuCriarCliente } from "../admin/acesso-lib.js";

export async function onRequestPost({ request, env }) {
  if (!env.PRODUTOS) return json({ erro: "Falta ligar o KV PRODUTOS." }, 503);
  if (!env.KIWIFY_WEBHOOK_TOKEN) return json({ erro: "KIWIFY_WEBHOOK_TOKEN não configurado na Cloudflare." }, 503);

  const url = new URL(request.url);
  const assinatura = String(url.searchParams.get("signature") || "").toLowerCase();
  const bruto = await request.text();
  let corpo;
  try { corpo = JSON.parse(bruto); } catch { return json({ erro: "corpo inválido" }, 400); }

  const ok = assinatura && (assinatura === await hmacSha1(env.KIWIFY_WEBHOOK_TOKEN, bruto)
                         || assinatura === await hmacSha1(env.KIWIFY_WEBHOOK_TOKEN, JSON.stringify(corpo)));
  if (!ok) return json({ erro: "assinatura inválida" }, 401);

  const evento = String(corpo.webhook_event_type || "");
  const statusPedido = String(corpo.order_status || "");
  const orderId = String(corpo.order_id || corpo.order_ref || "");
  if (!orderId) return json({ ok: true, ignorado: "sem order_id" });

  const prod = corpo.Product || {};
  const cli = corpo.Customer || {};
  const com = corpo.Commissions || {};
  const centavos = Number(com.charge_amount ?? com.product_base_price ?? 0);
  const valor = Number.isFinite(centavos) ? centavos / 100 : 0;
  const quando = String(corpo.approved_date || corpo.created_at || new Date().toISOString());
  const dataVenda = isoParaData(quando);

  // casa o produto da Kiwify com o do painel pelo nome (o da Kiwify costuma ter um sufixo)
  let produtoId = "", sku = "";
  try {
    const lista = await listarProdutos(env);
    const alvo = norm(prod.product_name || "");
    const cas = lista.find(p => alvo === norm(p.nome)) || lista.find(p => alvo.startsWith(norm(p.nome))) || lista.find(p => alvo.includes(norm(p.nome)) || norm(p.nome).includes(alvo));
    if (cas) { produtoId = cas.id; sku = cas.sku || ""; }
  } catch {}

  const id = "kiwify-" + orderId.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const txt = await env.PRODUTOS.get(PREFIXO + id);
  const anterior = txt ? JSON.parse(txt) : null;

  let status = anterior ? anterior.status : "paga";
  if (/refund|reembols/i.test(evento) || /refunded|reembols/i.test(statusPedido)) status = "reembolsada";
  else if (/chargeback|chargedback/i.test(evento + statusPedido)) status = "reembolsada";
  else if (/approved|paid/i.test(evento + statusPedido)) status = "paga";
  else if (!anterior) return json({ ok: true, ignorado: evento || statusPedido }); // pendente, boleto gerado etc.

  // cadastro do cliente com tudo que a Kiwify manda (nome, e-mail, celular, CPF/CNPJ, cidade/UF)
  let cliente = null;
  try {
    cliente = await encontrarOuCriarCliente(env, {
      nome: cli.full_name || cli.first_name || "", email: cli.email || "", telefone: cli.mobile || cli.phone || "",
      cpfCnpj: cli.CPF || cli.cpf || cli.CNPJ || cli.cnpj || "", cidade: cli.city || "", uf: cli.state || "",
      cep: cli.zipcode || cli.zip_code || "", endereco: cli.street || "", numero: cli.number || "", complemento: cli.complement || "", bairro: cli.neighborhood || "",
      origem: "Kiwify",
    });
  } catch {}

  // código de acesso no painel (a Kiwify entrega pela área de membros; o código é o reforço e o link do e-mail/WhatsApp)
  let codigo = anterior ? (anterior.codigo || "") : "", codigoExpiraEm = anterior ? (anterior.codigoExpiraEm || 0) : 0;
  if (status === "paga" && !codigo && produtoId && env.ACESSOS) {
    try {
      const r = await gerarAcesso(env, { produtoId, plataforma: "Kiwify", numeroVenda: orderId, dataVenda, origin: url.origin });
      codigo = r.codigo; codigoExpiraEm = r.expiraEm;
    } catch {}
  }

  const v = normalizarVenda({
    id, canal: "Kiwify",
    clienteId: cliente ? cliente.id : undefined, comoChamar: cliente ? cliente.comoChamar : undefined, telefone: cliente ? cliente.telefone : undefined,
    codigo, codigoExpiraEm,
    produtoId: anterior ? (anterior.produtoId || produtoId) : produtoId,
    produto: String(prod.product_name || (anterior && anterior.produto) || "Produto Kiwify"),
    sku,
    comprador: String(cli.full_name || cli.first_name || (anterior && anterior.comprador) || ""),
    email: String(cli.email || (anterior && anterior.email) || ""),
    valor: valor || (anterior && anterior.valor) || 0,
    numeroVenda: orderId,
    dataVenda: (anterior && anterior.dataVenda) || dataVenda,
    status,
    entregue: true,            // a Kiwify entrega sozinha pela área de membros
    origem: "kiwify-webhook",
  }, anterior);
  await salvarVenda(env, v);
  return json({ ok: true, id, status });
}

export async function onRequestGet() {
  return json({ ok: true, info: "Webhook da Kiwify do Núcleo Exato. Só aceita POST assinado." });
}

async function hmacSha1(segredo, texto) {
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(texto));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function isoParaData(s) {
  const d = new Date(s);
  if (isNaN(d)) return new Date().toISOString().slice(0, 10);
  // data no fuso de Brasília
  return new Date(d.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}
