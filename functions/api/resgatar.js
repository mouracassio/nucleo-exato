// GET /api/resgatar?codigo=XXXX — confere o código e entrega o arquivo (do R2).
// Página pública, usada pelo cliente depois de receber o código pelo chat da
// plataforma (Mercado Livre / Shopee).
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const codigo = (url.searchParams.get("codigo") || "").trim().toUpperCase();
  if (!codigo) return paginaErro("Digite o código que você recebeu na mensagem da compra.");

  const registroTexto = await env.ACESSOS.get(codigo);
  if (!registroTexto) return paginaErro("Código não encontrado. Confira se digitou certo — sem espaços, sem O/0 trocados.");

  const registro = JSON.parse(registroTexto);
  if (Date.now() > registro.expiraEm) {
    return paginaErro("Este código venceu. Fale com o Núcleo Exato pela mensagem da compra para gerar um novo.");
  }

  const objeto = await env.ARQUIVOS.get(registro.arquivo);
  if (!objeto) return paginaErro("Arquivo não encontrado. Avise o Núcleo Exato pela mensagem da compra.");

  registro.usos = (registro.usos || 0) + 1;
  registro.ultimoUso = Date.now();
  await env.ACESSOS.put(codigo, JSON.stringify(registro), { metadata: registro });

  const nomeArquivo = registro.arquivo.split("/").pop();
  return new Response(objeto.body, {
    headers: {
      "content-type": objeto.httpMetadata?.contentType || "application/octet-stream",
      "content-disposition": 'inline; filename="' + nomeArquivo + '"',
      "cache-control": "no-store",
    },
  });
}

function paginaErro(msg) {
  const html = "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\">" +
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
    "<title>Núcleo Exato — acesso</title></head>" +
    "<body style=\"font-family:system-ui;max-width:480px;margin:60px auto;padding:0 20px;text-align:center;color:#2b2b2b\">" +
    "<p style=\"font-size:17px\">" + msg + "</p>" +
    "<p><a href=\"/acesso.html\" style=\"color:#1f7a4d\">Tentar de novo</a></p>" +
    "</body></html>";
  return new Response(html, { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
}
