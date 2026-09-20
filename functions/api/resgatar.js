// GET /api/resgatar?codigo=XXXX — confere o código e entrega o material (do R2).
// Página pública, usada pelo cliente depois de receber o código pelo chat da
// plataforma (Mercado Livre / Shopee).
//
// O produto pode ter VÁRIOS arquivos (registro.arquivos). Nesse caso a página
// mostra a lista para o cliente baixar item por item; ?item=N baixa um deles.
// Produto de arquivo único continua baixando direto, como antes.
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

  const arquivos = (Array.isArray(registro.arquivos) && registro.arquivos.length)
    ? registro.arquivos
    : (registro.arquivo ? [registro.arquivo] : []);
  if (!arquivos.length) return paginaErro("Arquivo não encontrado. Avise o Núcleo Exato pela mensagem da compra.");

  const item = url.searchParams.get("item");

  // lista de arquivos: mostra a página com os links
  if (arquivos.length > 1 && item === null) {
    await registrarUso(env, codigo, registro);
    return paginaLista(codigo, registro, arquivos);
  }

  const indice = item === null ? 0 : Number(item);
  const chave = arquivos[indice];
  if (!chave) return paginaErro("Esse item não existe neste código. Volte e escolha um da lista.");

  const objeto = await env.ARQUIVOS.get(chave);
  if (!objeto) return paginaErro("Arquivo não encontrado. Avise o Núcleo Exato pela mensagem da compra.");

  if (arquivos.length === 1) await registrarUso(env, codigo, registro);

  const nomeArquivo = chave.split("/").pop();
  return new Response(objeto.body, {
    headers: {
      "content-type": objeto.httpMetadata?.contentType || "application/octet-stream",
      "content-disposition": 'attachment; filename="' + nomeArquivo + '"',
      "cache-control": "no-store",
    },
  });
}

async function registrarUso(env, codigo, registro) {
  registro.usos = (registro.usos || 0) + 1;
  registro.ultimoUso = Date.now();
  await env.ACESSOS.put(codigo, JSON.stringify(registro), { metadata: registro });
}

function nomeBonito(chave) {
  let n = chave.split("/").pop().replace(/\.[a-z0-9]+$/i, "");
  n = n.replace(/^mat[0-9]+-/i, "").replace(/^[0-9]{2}-/, "");
  n = n.replace(/[_-]+/g, " ").trim().toLowerCase();
  const mapa = {
    "leia me como usar o material": "Leia-me — como usar o material",
    "plano anual": "Plano anual",
    "bonus apostila gabaritada pdf": "Bônus — Apostila gabaritada",
  };
  if (mapa[n]) return mapa[n];
  const m = n.match(/^aulas (\d+) a (\d+)$/);
  if (m) return "Aulas " + m[1] + " a " + m[2];
  return n.charAt(0).toUpperCase() + n.slice(1);
}

function paginaLista(codigo, registro, arquivos) {
  const venceEm = new Date(registro.expiraEm).toLocaleDateString("pt-BR");
  let itens = "";
  arquivos.forEach((chave, i) => {
    const ext = (chave.split(".").pop() || "").toUpperCase();
    itens += '<li><a href="/api/resgatar?codigo=' + encodeURIComponent(codigo) + '&item=' + i + '">' +
      esc(nomeBonito(chave)) + '</a> <span class="ext">' + esc(ext) + '</span></li>';
  });
  const html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="robots" content="noindex">' +
    '<title>Seu material — Núcleo Exato</title><style>' +
    'body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:0 auto;padding:40px 20px;color:#2b2b2b;line-height:1.55}' +
    'h1{font-size:24px;margin:0 0 6px}.sub{color:#6b6b6b;font-size:15px;margin:0 0 28px}' +
    'ul{list-style:none;padding:0;margin:0}' +
    'li{border:1px solid #e3e3e3;border-radius:10px;margin-bottom:10px;padding:14px 16px;display:flex;align-items:center;gap:10px}' +
    'li a{color:#1f7a4d;text-decoration:none;font-weight:600;flex:1}li a:hover{text-decoration:underline}' +
    '.ext{font-size:12px;color:#6b6b6b;border:1px solid #e3e3e3;border-radius:6px;padding:2px 7px}' +
    '.rodape{margin-top:32px;font-size:13.5px;color:#6b6b6b}' +
    '</style></head><body>' +
    '<h1>' + esc(registro.produto || "Seu material") + '</h1>' +
    '<p class="sub">Clique em cada item para baixar. Baixe todos e guarde no seu computador. ' +
    'Este código vale até ' + venceEm + ' e pode ser usado quantas vezes você precisar até lá.</p>' +
    '<ul>' + itens + '</ul>' +
    '<p class="rodape">Dúvida ou problema para baixar: nucleoexato@gmail.com · WhatsApp (34) 99913-1399.<br>' +
    'Tudo que é verdadeiro respeita o tempo. — Prof. Eng. Cássio Moura</p>' +
    '</body></html>';
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function paginaErro(msg) {
  const html = "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\">" +
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
    "<title>Núcleo Exato — acesso</title></head>" +
    "<body style=\"font-family:system-ui;max-width:480px;margin:60px auto;padding:0 20px;text-align:center;color:#2b2b2b\">" +
    "<p style=\"font-size:17px\">" + esc(msg) + "</p>" +
    "<p><a href=\"/acesso.html\" style=\"color:#1f7a4d\">Tentar de novo</a></p>" +
    "</body></html>";
  return new Response(html, { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
}
