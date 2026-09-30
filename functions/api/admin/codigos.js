// GET /api/admin/codigos — lista os códigos de acesso já gerados (KV ACESSOS).
import { json, exigirSessao } from "./sessao.js";

export async function onRequestGet({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.ACESSOS) return json({ erro: "Falta ligar o KV ACESSOS na Cloudflare." }, 503);

  const agora = Date.now();
  const lista = [];
  let cursor;
  do {
    const pagina = await env.ACESSOS.list({ cursor, limit: 1000 });
    for (const chave of pagina.keys) {
      const m = chave.metadata || {};
      lista.push({
        codigo: chave.name,
        produto: m.produto || "", produtoId: m.produtoId || "", sku: m.sku || "", arquivo: m.arquivo || "",
        plataforma: m.plataforma || "", numeroVenda: m.numeroVenda || "", dataVenda: m.dataVenda || "",
        criadoEm: m.criadoEm || null, expiraEm: m.expiraEm || null, usos: m.usos || 0, ultimoUso: m.ultimoUso || null,
        status: !m.expiraEm ? "desconhecido" : (agora > m.expiraEm ? "vencido" : (m.usos > 0 ? "usado" : "ativo")),
      });
    }
    cursor = pagina.list_complete ? null : pagina.cursor;
  } while (cursor);

  lista.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
  return json({ total: lista.length, codigos: lista });
}

// DELETE /api/admin/codigos — exclui UM código de acesso (usado para limpar
// códigos de teste). Corpo: { codigo }. Exige sessão do painel.
export async function onRequestDelete({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.ACESSOS) return json({ erro: "Falta ligar o KV ACESSOS na Cloudflare." }, 503);
  let corpo;
  try { corpo = await request.json(); } catch { return json({ erro: "corpo inválido" }, 400); }
  const codigo = String((corpo && corpo.codigo) || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,16}$/.test(codigo)) return json({ erro: "código inválido" }, 400);
  if (!(await env.ACESSOS.get(codigo))) return json({ erro: "código não encontrado" }, 404);
  await env.ACESSOS.delete(codigo);
  return json({ ok: true, codigo });
}
