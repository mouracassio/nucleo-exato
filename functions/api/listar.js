// GET /api/listar — lista os códigos de acesso já gerados (painel interno).
// Protegido por senha (mesma SENHA_ADMIN do gerar-acesso.html).
export async function onRequestGet({ request, env }) {
  const senha = request.headers.get("x-senha") || "";
  if (!env.SENHA_ADMIN || senha !== env.SENHA_ADMIN) {
    return json({ erro: "senha incorreta" }, 401);
  }

  const agora = Date.now();
  const lista = [];
  let cursor;
  do {
    const pagina = await env.ACESSOS.list({ cursor, limit: 1000 });
    for (const chave of pagina.keys) {
      const m = chave.metadata || {};
      lista.push({
        codigo: chave.name,
        produto: m.produto || "",
        sku: m.sku || "",
        nota: m.nota || "",
        criadoEm: m.criadoEm || null,
        expiraEm: m.expiraEm || null,
        usos: m.usos || 0,
        ultimoUso: m.ultimoUso || null,
        status: !m.expiraEm ? "desconhecido" : (agora > m.expiraEm ? "vencido" : (m.usos > 0 ? "usado" : "ativo")),
      });
    }
    cursor = pagina.list_complete ? null : pagina.cursor;
  } while (cursor);

  lista.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
  return json({ total: lista.length, codigos: lista });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
