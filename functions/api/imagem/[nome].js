// GET /api/imagem/<nome> — serve uma capa que foi enviada pelo painel (R2, pasta img/).
export async function onRequestGet({ params, env }) {
  const nome = String(params.nome || "");
  if (!/^[A-Za-z0-9._-]+$/.test(nome) || !env.ARQUIVOS) return new Response("não encontrado", { status: 404 });
  const obj = await env.ARQUIVOS.get("img/" + nome);
  if (!obj) return new Response("não encontrado", { status: 404 });
  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType || "image/jpeg",
      "cache-control": "public, max-age=86400",
    },
  });
}
