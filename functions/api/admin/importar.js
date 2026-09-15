// POST /api/admin/importar — carga inicial: lê os produtos que já estão no site
// (links.js + dados/conteudo.json publicados) e cria cada um no KV PRODUTOS,
// sem sobrescrever o que já existir lá. Pode rodar mais de uma vez sem estrago.
import { json, exigirSessao } from "./sessao.js";
import { CAMPOS } from "./produtos.js";

// o que o site estático não sabe: arquivo de entrega (R2) e SKU de cada id
const EXTRAS = {
  sst:                 { arquivo: "entregas/nr01.zip",              sku: "NR01-PSICO" },
  niosh:               { arquivo: "entregas/niosh.zip",             sku: "AP-NIOSH-NR17-CALC-XLS-V1" },
  mat1:                { arquivo: "entregas/matematica-1ano.zip",   sku: "MAT-EM-1ANO" },
  mat2:                { arquivo: "entregas/matematica-2ano.zip",   sku: "MAT-EM-2ANO" },
  mat3:                { arquivo: "entregas/matematica-3ano.zip",   sku: "MAT-EM-3ANO" },
  combo:               { arquivo: "entregas/matematica-combo.zip",  sku: "MAT-EM-COMBO" },
  planilha:            { arquivo: "entregas/planilha-de-notas.zip", sku: "PLAN-NOTAS" },
  epi:                 { arquivo: "entregas/epi.zip",               sku: "SST-EPI-01" },
  "treinamentos-venc": { arquivo: "entregas/treinamentos-venc.zip", sku: "SST-TREIN-01" },
  "matriz-sst":        { arquivo: "entregas/matriz-sst.zip",        sku: "SST-DOC-01" },
  "cartoes-operador":  { arquivo: "entregas/cartoes-operador.zip",  sku: "SST-CARD-01" },
  nr13:                { arquivo: "entregas/nr13.zip",              sku: "SST-NR13-01" },
};

export async function onRequestPost({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.PRODUTOS) return json({ erro: "Falta ligar o KV PRODUTOS ao projeto na Cloudflare." }, 503);

  const base = new URL(request.url).origin;
  const [linksTxt, conteudoTxt] = await Promise.all([
    env.ASSETS.fetch(base + "/links.js").then(r => r.ok ? r.text() : ""),
    env.ASSETS.fetch(base + "/dados/conteudo.json").then(r => r.ok ? r.text() : ""),
  ]);

  // links.js: preço e checkout por id
  const links = {};
  const re = /["']?([a-z0-9-]+)["']?\s*:\s*\{\s*checkout\s*:\s*"([^"]*)"\s*,\s*preco\s*:\s*"([^"]*)"\s*\}/g;
  let m;
  while ((m = re.exec(linksTxt))) links[m[1]] = { checkout: m[2], preco: m[3] };

  // conteudo.json: nome, resumo, capa, página, categoria
  let conteudo = {};
  try { conteudo = JSON.parse(conteudoTxt); } catch {}
  const doJson = {};
  for (const p of (conteudo.produtos || [])) doJson[p.id] = p;

  const ids = new Set([...Object.keys(links), ...Object.keys(doJson)]);
  const criados = [], pulados = [], avisos = [];
  let ordem = 10;

  for (const id of ids) {
    const chave = "produto:" + id;
    if (await env.PRODUTOS.get(chave)) { pulados.push(id); ordem += 10; continue; }
    const j = doJson[id] || {};
    const l = links[id] || {};
    const x = EXTRAS[id] || {};
    const p = {
      ...CAMPOS,
      id,
      nome: j.nome || id,
      resumo: j.resumo || "",
      preco: l.preco || j.preco || "",
      capa: j.capa || "",
      alt: j.alt || j.nome || id,
      pagina: j.pagina || "",
      checkout: l.checkout || (j.destino && j.destino.checkout) || "",
      arquivo: x.arquivo || "",
      sku: x.sku || "",
      categoria: j.categoria || "",
      ativo: j.ativo !== undefined ? !!j.ativo : true,
      destaqueHome: !!j.destaqueHome,
      arquivado: !!j.arquivado,
      ordem,
      obs: "importado do site em " + new Date().toISOString().slice(0, 10),
      criadoEm: Date.now(),
      atualizadoEm: Date.now(),
    };
    if (!p.preco) avisos.push(id + ": sem preço no links.js");
    if (!p.checkout) avisos.push(id + ": sem checkout");
    if (!p.nome || p.nome === id) avisos.push(id + ": sem nome no conteudo.json (edite no painel)");
    await env.PRODUTOS.put(chave, JSON.stringify(p));
    criados.push(id);
    ordem += 10;
  }

  return json({ ok: true, criados, pulados, avisos, fontes: { links: Object.keys(links).length, conteudo: Object.keys(doJson).length } });
}
