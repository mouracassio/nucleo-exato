// GET /api/produtos — lista PÚBLICA dos produtos ativos (sem os campos internos).
// É o que a loja usa; o painel usa /api/admin/produtos.
export async function onRequestGet({ env }) {
  if (!env.PRODUTOS) return resposta({ produtos: [], aviso: "KV PRODUTOS não ligado" });
  const lista = [];
  let cursor;
  do {
    const pag = await env.PRODUTOS.list({ prefix: "produto:", cursor, limit: 1000 });
    for (const k of pag.keys) {
      const txt = await env.PRODUTOS.get(k.name);
      if (!txt) continue;
      try {
        const p = JSON.parse(txt);
        if (!p.ativo || p.arquivado) continue;
        lista.push({ id: p.id, nome: p.nome, resumo: p.resumo, preco: p.preco, capa: p.capa, alt: p.alt,
                     pagina: p.pagina, checkout: p.checkout, categoria: p.categoria, destaqueHome: !!p.destaqueHome, ordem: p.ordem || 100 });
      } catch {}
    }
    cursor = pag.list_complete ? null : pag.cursor;
  } while (cursor);
  lista.sort((a, b) => (a.ordem - b.ordem) || a.nome.localeCompare(b.nome, "pt-BR"));
  return resposta({ produtos: lista });
}

function resposta(obj) {
  return new Response(JSON.stringify(obj), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60" },
  });
}
