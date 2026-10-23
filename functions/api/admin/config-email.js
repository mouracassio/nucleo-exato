// /api/admin/config-email — liga o envio de e-mail pelo painel (Apps Script na conta nucleoexato@gmail.com).
//   GET  -> { ligado, conta }          (nunca devolve o segredo)
//   POST { url, segredo } -> grava em KV "config:email" depois de conferir que o script responde
//                            e que a conta dele é nucleoexato@gmail.com.
//   POST { desligar:true } -> apaga a configuração.
import { json, exigirSessao } from "./sessao.js";
const CONTA = "nucleoexato@gmail.com";
export async function onRequestGet({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  const c = await env.PRODUTOS.get("config:email", "json");
  return json({ ligado: !!(c && c.url && c.segredo), conta: c ? c.conta || "" : "" });
}
export async function onRequestPost({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  let b; try { b = await request.json(); } catch { return json({ erro: "corpo inválido" }, 400); }
  if (b.desligar) { await env.PRODUTOS.delete("config:email"); return json({ ok: true, ligado: false }); }
  const url = String(b.url || "").trim(), segredo = String(b.segredo || "").trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) return json({ erro: "O endereço deve ser o da implantação do script (termina em /exec)." }, 400);
  if (segredo.length < 16) return json({ erro: "Segredo curto demais." }, 400);
  let j;
  try { const r = await fetch(url, { redirect: "follow" }); j = await r.json(); } catch { return json({ erro: "O script não respondeu. Confira o endereço e se a implantação está como 'Qualquer pessoa'." }, 502); }
  if (!j || !j.ok) return json({ erro: "O script respondeu, mas não é o do envio de e-mail." }, 502);
  if (String(j.conta || "").toLowerCase() !== CONTA) return json({ erro: "Este script roda em outra conta (" + (j.conta || "desconhecida") + "). Só vale a conta " + CONTA + "." }, 400);
  await env.PRODUTOS.put("config:email", JSON.stringify({ url, segredo, conta: j.conta, em: new Date().toISOString() }));
  return json({ ok: true, ligado: true, conta: j.conta });
}
