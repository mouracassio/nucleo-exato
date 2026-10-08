// POST /api/admin/gerar — gera um código de acesso avulso (reposição, teste do
// portão do download, ou venda antiga). Corpo: { produtoId, meses, plataforma,
// numeroVenda, dataVenda, comprador, valor, forcarNovo }.
//
// A venda normal entra pela aba Vendas (POST /api/admin/vendas), que já gera o
// código sozinha. Aqui a venda também é registrada/atualizada, para não haver
// código sem venda.
import { json, exigirSessao } from "./sessao.js";
import { gerarAcesso, encontrarOuCriarCliente, respostaErro } from "./acesso-lib.js";
import { PREFIXO as PREFIXO_VENDA, normalizarVenda, salvarVenda, prefixoCanal } from "./vendas.js";

export async function onRequestPost({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  let corpo;
  try { corpo = await request.json(); } catch { return json({ erro: "corpo inválido" }, 400); }
  const { produtoId, meses, plataforma, numeroVenda, dataVenda, comprador, valor, forcarNovo } = corpo;
  const venda = String(numeroVenda || "").replace(/[#\s]/g, "");
  if (!venda) return json({ erro: "Informe o número da venda da plataforma antes de gerar o código." }, 400);

  let r;
  try {
    r = await gerarAcesso(env, { produtoId, plataforma, numeroVenda: venda, dataVenda, meses, origin: new URL(request.url).origin, reaproveitar: !forcarNovo });
  } catch (e) { return respostaErro(e); }
  const p = r.produtoObj;

  // registra/atualiza a venda na aba Vendas (uma linha por venda + produto)
  let vendaId = "", cliente = null;
  try {
    const canal = String(plataforma || "Outra");
    vendaId = prefixoCanal(canal) + venda + (p.id ? "-" + p.id : "");
    const txtV = await env.PRODUTOS.get(PREFIXO_VENDA + vendaId);
    const anterior = txtV ? JSON.parse(txtV) : null;
    const hoje = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
    if (comprador) cliente = await encontrarOuCriarCliente(env, { nome: comprador, origem: canal });
    const v = normalizarVenda({
      id: vendaId, canal, produtoId: p.id, produto: p.nome, sku: p.sku || "",
      clienteId: cliente ? cliente.id : undefined,
      comprador: cliente ? cliente.nome : String(comprador || (anterior && anterior.comprador) || ""),
      comoChamar: cliente ? cliente.comoChamar : undefined,
      email: cliente ? cliente.email : undefined, telefone: cliente ? cliente.telefone : undefined,
      valor: (valor !== undefined && valor !== "" && valor !== null) ? valor : (anterior ? anterior.valor : precoNumero(p.preco)),
      numeroVenda: venda, dataVenda: String(dataVenda || (anterior && anterior.dataVenda) || hoje),
      codigo: r.codigo, codigoExpiraEm: r.expiraEm, origem: anterior ? anterior.origem : "gerar",
    }, anterior);
    await salvarVenda(env, v);
  } catch (e) { vendaId = ""; }

  return json({ codigo: r.codigo, expiraEm: r.expiraEm, link: r.link, produto: p.nome, produtoId: p.id, entrega: p.entrega || "", comoUsar: p.comoUsar || "", vendaId, cliente, reaproveitado: r.reaproveitado, comprador: String(comprador || "") });
}

function precoNumero(preco) {
  const n = Number(String(preco || "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
