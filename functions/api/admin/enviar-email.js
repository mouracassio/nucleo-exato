// POST /api/admin/enviar-email — envia o texto de entrega por e-mail, direto do
// painel, sem abrir programa nenhum. Corpo: { para, assunto, texto }.
//
// Usa o Resend (https://resend.com) com o domínio nucleoexato.com.br verificado.
// Como ligar (uma vez, pelo Cássio): criar conta no Resend, adicionar o domínio
// nucleoexato.com.br e colocar os registros DNS que ele mostra na Cloudflare,
// gerar uma API key e salvar na Cloudflare (Pages > Settings > Variables and
// Secrets) como segredo RESEND_API_KEY. Opcional: EMAIL_REMETENTE
// (padrão "Núcleo Exato <contato@nucleoexato.com.br>") e EMAIL_RESPONDER_PARA
// (padrão nucleoexato@gmail.com).
//
// Sem a chave configurada, responde 503 e o painel abre o Gmail já preenchido.
import { json, exigirSessao } from "./sessao.js";

export async function onRequestPost({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.RESEND_API_KEY) return json({ erro: "Envio direto ainda não ligado (falta RESEND_API_KEY na Cloudflare). Use o botão Abrir no Gmail.", pendente: true }, 503);
  let corpo;
  try { corpo = await request.json(); } catch { return json({ erro: "corpo inválido" }, 400); }
  const para = String(corpo.para || "").trim().toLowerCase();
  const assunto = String(corpo.assunto || "").trim().slice(0, 200);
  const texto = String(corpo.texto || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) return json({ erro: "e-mail do destinatário inválido" }, 400);
  if (!assunto || !texto) return json({ erro: "assunto e texto são obrigatórios" }, 400);

  const html = "<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#2b2b2b;max-width:640px\">" +
    esc(texto).replace(/(https?:\/\/[^\s<]+)/g, "<a href=\"$1\" style=\"color:#1f7a4d\">$1</a>").replace(/\n/g, "<br>") + "</div>";

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "authorization": "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_REMETENTE || "Núcleo Exato <contato@nucleoexato.com.br>",
      to: [para],
      reply_to: env.EMAIL_RESPONDER_PARA || "nucleoexato@gmail.com",
      subject: assunto, text: texto, html,
    }),
  });
  let j = {};
  try { j = await r.json(); } catch {}
  if (!r.ok) return json({ erro: "Resend recusou: " + (j.message || j.error || r.status) }, 502);
  return json({ ok: true, id: j.id || "" });
}

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
