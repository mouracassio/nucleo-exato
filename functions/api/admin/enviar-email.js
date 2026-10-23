// POST /api/admin/enviar-email — envia o e-mail de entrega direto do painel, pela conta nucleoexato@gmail.com,
// usando o script do Google (Apps Script) ligado em /api/admin/config-email.
// Corpo: { para, assunto, texto, anexarChave? }.  anexarChave = "entregas/arquivo.zip" (R2).
//   Se o zip tiver UM arquivo só, o e-mail leva esse arquivo (ex.: a planilha .xlsx); se tiver vários, leva o zip.
//   Acima de LIMITE bytes não envia e devolve { grande:true } para o painel mandar só o link.
import { json, exigirSessao } from "./sessao.js";
import { listarZip, extrairZip } from "./zip-lib.js";
const LIMITE = 15 * 1024 * 1024;
const TIPOS = { xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsm: "application/vnd.ms-excel.sheet.macroEnabled.12", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", pdf: "application/pdf", zip: "application/zip" };

function b64(u8) { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }

export async function onRequestPost({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  const cfg = await env.PRODUTOS.get("config:email", "json");
  if (!cfg || !cfg.url || !cfg.segredo) return json({ erro: "O envio direto ainda não está ligado. Use o botão Enviar pelo Gmail ou ligue na área de e-mail do painel.", pendente: true }, 503);
  let b; try { b = await request.json(); } catch { return json({ erro: "corpo inválido" }, 400); }
  const para = String(b.para || "").trim().toLowerCase();
  const assunto = String(b.assunto || "").trim().slice(0, 200);
  const texto = String(b.texto || "").trim();
  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(para)) return json({ erro: "e-mail do destinatário inválido" }, 400);
  if (!assunto || !texto) return json({ erro: "assunto e texto são obrigatórios" }, 400);

  let anexo = null;
  if (b.anexarChave) {
    const chave = String(b.anexarChave);
    if (!/^entregas\/[A-Za-z0-9._-]+$/.test(chave)) return json({ erro: "arquivo inválido" }, 400);
    if (!env.ARQUIVOS) return json({ erro: "R2 não ligado" }, 503);
    const o = await env.ARQUIVOS.get(chave);
    if (!o) return json({ erro: "O arquivo " + chave + " não está no servidor." }, 404);
    if (o.size > LIMITE * 3) return json({ erro: "Arquivo grande demais para anexar. Envie só o link.", grande: true }, 413);
    const zip = new Uint8Array(await o.arrayBuffer());
    let nome = chave.split("/").pop(), dados = zip;
    if (/\.zip$/i.test(nome)) {
      let ents = [];
      try { ents = listarZip(zip).filter(e => !e.pasta && !/^__MACOSX\//.test(e.nome) && !/(^|\/)\.DS_Store$/.test(e.nome)); } catch (e) { ents = []; }
      if (ents.length === 1) {
        try { dados = await extrairZip(zip, ents[0]); nome = ents[0].nome.split("/").pop(); } catch (e) { dados = zip; }
      }
    }
    if (dados.length > LIMITE) return json({ erro: "O anexo passa de " + Math.round(LIMITE / 1048576) + " MB. Envie só o link.", grande: true }, 413);
    const ext = (nome.split(".").pop() || "").toLowerCase();
    anexo = { nome, tipo: TIPOS[ext] || "application/octet-stream", base64: b64(dados) };
  }

  let j;
  try {
    const r = await fetch(cfg.url, { method: "POST", redirect: "follow", headers: { "content-type": "text/plain;charset=utf-8" }, body: JSON.stringify({ segredo: cfg.segredo, para, assunto, texto, anexo }) });
    j = await r.json();
  } catch (e) { return json({ erro: "O script do Google não respondeu. Tente de novo ou use o Gmail." }, 502); }
  if (!j || !j.ok) return json({ erro: "O Google recusou: " + ((j && j.erro) || "sem detalhe") }, 502);
  return json({ ok: true, anexo: j.anexo || "" });
}
