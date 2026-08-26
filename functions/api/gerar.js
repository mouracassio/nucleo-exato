// POST /api/gerar — gera um código de acesso com validade, para colar manualmente
// no chat do Mercado Livre ou da Shopee (venda de fora, sem passar e-mail).
// Protegido por senha (variável SENHA_ADMIN, configurada no painel da Cloudflare).
export async function onRequestPost({ request, env }) {
  const senha = request.headers.get("x-senha") || "";
  if (!env.SENHA_ADMIN || senha !== env.SENHA_ADMIN) {
    return json({ erro: "senha incorreta" }, 401);
  }

  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return json({ erro: "corpo inválido" }, 400);
  }

  const { produto, arquivo, meses, sku, nota } = corpo;
  if (!produto || !arquivo) {
    return json({ erro: "produto e arquivo são obrigatórios" }, 400);
  }

  const validadeMeses = Number(meses) > 0 ? Number(meses) : 6;
  const codigo = gerarCodigo();
  const criadoEm = Date.now();
  const expiraEm = criadoEm + validadeMeses * 30 * 24 * 60 * 60 * 1000;

  const registro = {
    produto, arquivo, sku: sku || "", nota: nota || "",
    criadoEm, expiraEm, usos: 0,
  };

  await env.ACESSOS.put(codigo, JSON.stringify(registro), {
    metadata: registro,
  });

  return json({
    codigo,
    expiraEm,
    link: "https://nucleoexato.com.br/acesso.html?codigo=" + codigo,
  });
}

function gerarCodigo() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem O/0/I/1, pra não confundir na digitação
  let c = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (let i = 0; i < 8; i++) c += alfabeto[bytes[i] % alfabeto.length];
  return c;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
