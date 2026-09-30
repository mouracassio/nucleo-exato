// POST /api/admin/gerar — gera um código de acesso para uma venda de fora da
// Kiwify (Mercado Livre ou Shopee). Corpo: { produtoId, meses, plataforma,
// numeroVenda, dataVenda }. O arquivo entregue é o cadastrado no produto.
// Substitui o antigo /api/gerar (que pedia a SENHA_ADMIN solta).
import { json, exigirSessao } from "./sessao.js";
import { PREFIXO as PREFIXO_VENDA, normalizarVenda, salvarVenda } from "./vendas.js";

export async function onRequestPost({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.PRODUTOS || !env.ACESSOS) return json({ erro: "Faltam ligações KV (PRODUTOS / ACESSOS) na Cloudflare." }, 503);

  let corpo;
  try { corpo = await request.json(); } catch { return json({ erro: "corpo inválido" }, 400); }
  const { produtoId, meses, plataforma, numeroVenda, dataVenda, comprador, valor } = corpo;

  const venda = String(numeroVenda || "").replace(/[#\s]/g, "");
  if (!venda) return json({ erro: "Informe o número da venda da plataforma antes de gerar o código." }, 400);

  // Trava contra código duplicado: mesma plataforma + mesmo nº de venda + mesmo produto.
  {
    let cur;
    do {
      const pag = await env.ACESSOS.list({ cursor: cur, limit: 1000 });
      for (const k of pag.keys) {
        const m = k.metadata || {};
        if (String(m.numeroVenda || "").replace(/[#\s]/g, "") === venda && String(m.plataforma || "") === String(plataforma || "") && String(m.produtoId || "") === String(produtoId || "")) {
          return json({ erro: "Já existe o código " + k.name + " para esta venda e este produto. Use o que já foi gerado (aparece na lista abaixo) em vez de gerar outro." }, 409);
        }
      }
      cur = pag.list_complete ? null : pag.cursor;
    } while (cur);
  }

  const txt = await env.PRODUTOS.get("produto:" + String(produtoId || ""));
  if (!txt) return json({ erro: "produto não encontrado" }, 404);
  const p = JSON.parse(txt);
  const arquivos = (Array.isArray(p.arquivos) && p.arquivos.length) ? p.arquivos : (p.arquivo ? [p.arquivo] : []);
  if (!arquivos.length) return json({ erro: "Este produto ainda não tem arquivo de entrega cadastrado. Suba os arquivos na aba Arquivos e marque no produto." }, 400);
  if (env.ARQUIVOS) {
    const faltando = [];
    for (const a of arquivos) if (!(await env.ARQUIVOS.head(a))) faltando.push(a);
    if (faltando.length) return json({ erro: "Não está(ão) no R2: " + faltando.join(", ") + ". Suba na aba Arquivos antes de gerar o código." }, 400);
  }

  const validadeMeses = Number(meses) > 0 ? Number(meses) : 6;
  const codigo = gerarCodigo();
  const criadoEm = Date.now();
  const expiraEm = criadoEm + validadeMeses * 30 * 24 * 60 * 60 * 1000;

  const registro = {
    produto: p.nome, produtoId: p.id, arquivo: arquivos[0], arquivos, sku: p.sku || "",
    plataforma: String(plataforma || ""), numeroVenda: venda, dataVenda: String(dataVenda || ""),
    criadoEm, expiraEm, usos: 0,
  };
  await env.ACESSOS.put(codigo, JSON.stringify(registro), { metadata: registro });

  // registra a venda na aba Vendas (uma linha por venda + produto)
  let vendaId = "";
  try {
    const canal = String(plataforma || "Outra");
    vendaId = (canal === "Mercado Livre" ? "ml-" : canal === "Shopee" ? "shopee-" : "outra-") + venda + (p.id ? "-" + p.id : "");
    const txtV = await env.PRODUTOS.get(PREFIXO_VENDA + vendaId);
    const anterior = txtV ? JSON.parse(txtV) : null;
    const hoje = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
    const v = normalizarVenda({
      id: vendaId, canal, produtoId: p.id, produto: p.nome, sku: p.sku || "",
      comprador: String(comprador || (anterior && anterior.comprador) || ""),
      valor: (valor !== undefined && valor !== "" && valor !== null) ? valor : (anterior ? anterior.valor : precoNumero(p.preco)),
      numeroVenda: venda, dataVenda: String(dataVenda || (anterior && anterior.dataVenda) || hoje),
      codigo, origem: "gerar",
    }, anterior);
    await salvarVenda(env, v);
  } catch (e) { vendaId = ""; }

  const link = new URL(request.url).origin + "/acesso.html?codigo=" + codigo;
  return json({ codigo, expiraEm, link, produto: p.nome, vendaId, comprador: String(comprador || "") });
}

function gerarCodigo() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem O/0/I/1, pra não confundir na digitação
  let c = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (let i = 0; i < 8; i++) c += alfabeto[bytes[i] % alfabeto.length];
  return c;
}

function precoNumero(preco) {
  const n = Number(String(preco || "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
