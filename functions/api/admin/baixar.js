// GET /api/admin/baixar?chave=entregas/<nome>.zip — baixa o arquivo de entrega direto do R2 (só com o painel logado).
// Serve para pegar o arquivo da venda na hora, sem procurar na pasta do Mac e sem gastar o código de acesso.
import { json, exigirSessao } from "./sessao.js";

export async function onRequestGet({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.ARQUIVOS) return json({ erro: "Falta ligar o R2 ARQUIVOS ao projeto na Cloudflare." }, 503);
  const chave = new URL(request.url).searchParams.get("chave") || "";
  if (!/^entregas\/[A-Za-z0-9._-]+$/.test(chave)) return json({ erro: "chave inválida" }, 400);
  const obj = await env.ARQUIVOS.get(chave);
  if (!obj) return json({ erro: "arquivo não está no R2: " + chave }, 404);
  const nome = chave.split("/").pop();
  return new Response(obj.body, { headers: {
    "content-type": obj.httpMetadata?.contentType || "application/zip",
    "content-disposition": 'attachment; filename="' + nome + '"',
    "content-length": String(obj.size),
    "cache-control": "no-store",
  } });
}
