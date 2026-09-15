// /api/admin/arquivos — os arquivos no R2 (bucket ligado como ARQUIVOS).
//   GET               → lista entregas/* (zips entregues por código) e img/* (capas).
//   PUT ?chave=...    → sobe um arquivo. O corpo da requisição é o arquivo puro
//                       (o painel usa XMLHttpRequest com o File direto, sem formulário),
//                       então o upload é transmitido em fluxo e cabe até 100 MB.
//   DELETE ?chave=... → NÃO EXISTE de propósito: nada é apagado por aqui. Para
//                       trocar um arquivo, suba outro com o mesmo nome; o anterior
//                       é guardado em quarentena/<data>/<nome> antes de ser substituído.
import { json, exigirSessao } from "./sessao.js";

const PREFIXOS_OK = ["entregas/", "img/"];

export async function onRequestGet({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.ARQUIVOS) return json({ erro: "Falta ligar o R2 ARQUIVOS ao projeto na Cloudflare." }, 503);
  const saida = {};
  for (const prefix of PREFIXOS_OK) {
    saida[prefix] = [];
    let cursor;
    do {
      const pag = await env.ARQUIVOS.list({ prefix, cursor, limit: 1000 });
      for (const o of pag.objects) saida[prefix].push({ chave: o.key, tamanho: o.size, enviadoEm: o.uploaded });
      cursor = pag.truncated ? pag.cursor : null;
    } while (cursor);
  }
  return json({ arquivos: saida });
}

export async function onRequestPut({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.ARQUIVOS) return json({ erro: "Falta ligar o R2 ARQUIVOS ao projeto na Cloudflare." }, 503);

  const url = new URL(request.url);
  const chave = (url.searchParams.get("chave") || "").trim();
  if (!PREFIXOS_OK.some(p => chave.startsWith(p)) || !/^[a-z]+\/[A-Za-z0-9._-]+$/.test(chave)) {
    return json({ erro: "chave inválida: use entregas/nome.zip ou img/nome.jpg (sem espaços nem acentos)" }, 400);
  }
  const tamanho = Number(request.headers.get("content-length") || 0);
  if (tamanho > 100 * 1024 * 1024) return json({ erro: "arquivo acima de 100 MB" }, 413);

  // guarda o anterior antes de trocar (nunca apaga)
  const anterior = await env.ARQUIVOS.head(chave);
  if (anterior) {
    const carimbo = new Date().toISOString().replace(/[:.]/g, "-");
    const obj = await env.ARQUIVOS.get(chave);
    if (obj) await env.ARQUIVOS.put("quarentena/" + carimbo + "/" + chave, obj.body, { httpMetadata: obj.httpMetadata });
  }

  const tipo = request.headers.get("content-type") || (chave.endsWith(".zip") ? "application/zip" : "application/octet-stream");
  const salvo = await env.ARQUIVOS.put(chave, request.body, { httpMetadata: { contentType: tipo } });
  return json({ ok: true, chave, tamanho: salvo.size, substituiu: !!anterior });
}
