// Biblioteca comum do painel: geração do código de acesso e cadastro de clientes.
// Não é uma rota (não exporta onRequest*). Usada por vendas.js, gerar.js e
// pelo webhook da Kiwify, para que TODA venda, de qualquer canal, gere o acesso
// do mesmo jeito e fique ligada a um cliente cadastrado.
import { json } from "./sessao.js";

/* =========================================================================
   CÓDIGO DE ACESSO (KV ACESSOS)
   ========================================================================= */

export function gerarCodigo() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem O/0/I/1, pra não confundir na digitação
  let c = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (let i = 0; i < 8; i++) c += alfabeto[bytes[i] % alfabeto.length];
  return c;
}

export function linkAcesso(origin, codigo) {
  return origin + "/acesso.html?codigo=" + codigo;
}

export function arquivosDoProduto(p) {
  return (Array.isArray(p.arquivos) && p.arquivos.length) ? p.arquivos : (p.arquivo ? [p.arquivo] : []);
}

// Procura um código já gerado para a mesma plataforma + nº de venda + produto.
export async function codigoExistente(env, { plataforma, numeroVenda, produtoId }) {
  const venda = String(numeroVenda || "").replace(/[#\s]/g, "");
  if (!venda) return null;
  let cur;
  do {
    const pag = await env.ACESSOS.list({ cursor: cur, limit: 1000 });
    for (const k of pag.keys) {
      const m = k.metadata || {};
      if (String(m.numeroVenda || "").replace(/[#\s]/g, "") === venda
          && String(m.plataforma || "") === String(plataforma || "")
          && String(m.produtoId || "") === String(produtoId || "")) {
        return { codigo: k.name, ...m };
      }
    }
    cur = pag.list_complete ? null : pag.cursor;
  } while (cur);
  return null;
}

// Gera (ou devolve o já existente) o código de acesso de uma venda.
// Lança Error com .status quando não dá para gerar (produto sem arquivo etc.).
export async function gerarAcesso(env, { produtoId, plataforma, numeroVenda, dataVenda, meses, origin, reaproveitar = true }) {
  if (!env.PRODUTOS || !env.ACESSOS) throw erro("Faltam ligações KV (PRODUTOS / ACESSOS) na Cloudflare.", 503);
  const venda = String(numeroVenda || "").replace(/[#\s]/g, "");
  if (!venda) throw erro("Informe o número da venda antes de gerar o código.", 400);

  const txt = await env.PRODUTOS.get("produto:" + String(produtoId || ""));
  if (!txt) throw erro("Produto não encontrado no painel.", 404);
  const p = JSON.parse(txt);

  if (reaproveitar) {
    const ja = await codigoExistente(env, { plataforma, numeroVenda: venda, produtoId: p.id });
    if (ja) return { codigo: ja.codigo, expiraEm: ja.expiraEm, link: linkAcesso(origin, ja.codigo), produto: p.nome, produtoObj: p, reaproveitado: true };
  }

  const arquivos = arquivosDoProduto(p);
  if (!arquivos.length) throw erro("Este produto ainda não tem arquivo de entrega cadastrado. Suba os arquivos na aba Arquivos e marque no produto.", 400);
  if (env.ARQUIVOS) {
    const faltando = [];
    for (const a of arquivos) if (!(await env.ARQUIVOS.head(a))) faltando.push(a);
    if (faltando.length) throw erro("Não está(ão) no R2: " + faltando.join(", ") + ". Suba na aba Arquivos antes de gerar o código.", 400);
  }

  const validadeMeses = Number(meses) > 0 ? Number(meses) : 6;
  const codigo = gerarCodigo();
  const criadoEm = Date.now();
  const expiraEm = criadoEm + validadeMeses * 30 * 24 * 60 * 60 * 1000;
  const registro = {
    produto: p.nome, produtoId: p.id, arquivo: arquivos[0], arquivos, sku: p.sku || "",
    plataforma: String(plataforma || ""), numeroVenda: venda, dataVenda: String(dataVenda || ""),
    criadoEm, expiraEm, usos: 0,
  };
  await env.ACESSOS.put(codigo, JSON.stringify(registro), { metadata: registro });
  return { codigo, expiraEm, link: linkAcesso(origin, codigo), produto: p.nome, produtoObj: p, reaproveitado: false };
}

/* =========================================================================
   CLIENTES (KV PRODUTOS, prefixo "cliente:")
   ========================================================================= */

export const PREFIXO_CLIENTE = "cliente:";

export const CAMPOS_CLIENTE = {
  id: "",            // cli-<timestamp><aleatório>
  nome: "",          // nome completo (ou razão social)
  comoChamar: "",    // como tratar nas mensagens (primeiro nome, apelido)
  nascimento: "",    // AAAA-MM-DD (para a homenagem de aniversário)
  cpfCnpj: "",       // só números
  email: "",
  telefone: "",      // só números, com DDD (ex.: 34999131399)
  empresa: "",
  cargo: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  origem: "",        // canal da primeira compra: Mercado Livre | Kiwify | Site | Direta | Shopee | Outra
  obs: "",
  criadoEm: 0,
  atualizadoEm: 0,
};

export function soDigitos(s) { return String(s || "").replace(/\D/g, ""); }
export function normNome(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

export function primeiroNome(s) {
  const p = String(s || "").trim().split(/\s+/)[0] || "";
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : "";
}

export function normalizarCliente(c, anterior) {
  const out = { ...CAMPOS_CLIENTE, ...(anterior || {}) };
  for (const k of Object.keys(CAMPOS_CLIENTE)) if (c[k] !== undefined && c[k] !== null) out[k] = c[k];
  for (const k of ["nome", "comoChamar", "email", "empresa", "cargo", "endereco", "numero", "complemento", "bairro", "cidade", "origem", "obs"]) out[k] = String(out[k] || "").trim();
  out.email = out.email.toLowerCase();
  out.cpfCnpj = soDigitos(out.cpfCnpj);
  out.telefone = soDigitos(out.telefone);
  if (out.telefone.length === 10 || out.telefone.length === 11) out.telefone = "55" + out.telefone; // Brasil sem o 55
  out.cep = soDigitos(out.cep).slice(0, 8);
  out.uf = String(out.uf || "").trim().toUpperCase().slice(0, 2);
  out.nascimento = String(out.nascimento || "").slice(0, 10);
  if (out.nascimento && !/^\d{4}-\d{2}-\d{2}$/.test(out.nascimento)) out.nascimento = "";
  out.obs = out.obs.slice(0, 2000);
  if (!out.id) out.id = "cli-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  out.id = String(out.id).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60);
  out.criadoEm = (anterior && anterior.criadoEm) || out.criadoEm || Date.now();
  out.atualizadoEm = Date.now();
  return out;
}

export async function listarClientes(env) {
  const lista = [];
  let cursor;
  do {
    const pag = await env.PRODUTOS.list({ prefix: PREFIXO_CLIENTE, cursor, limit: 1000 });
    for (const k of pag.keys) {
      const txt = await env.PRODUTOS.get(k.name);
      if (txt) { try { lista.push({ ...CAMPOS_CLIENTE, ...JSON.parse(txt) }); } catch {} }
    }
    cursor = pag.list_complete ? null : pag.cursor;
  } while (cursor);
  lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return lista;
}

export async function lerCliente(env, id) {
  if (!id) return null;
  const txt = await env.PRODUTOS.get(PREFIXO_CLIENTE + String(id).toLowerCase());
  return txt ? { ...CAMPOS_CLIENTE, ...JSON.parse(txt) } : null;
}

export async function salvarCliente(env, c) {
  await env.PRODUTOS.put(PREFIXO_CLIENTE + c.id, JSON.stringify(c));
  return c;
}

// Acha o cliente pelos dados que a venda traz (id, e-mail, CPF/CNPJ, telefone,
// e por último o nome completo) e atualiza o cadastro com o que vier de novo,
// sem apagar o que já estava preenchido. Cria se não existir.
export async function encontrarOuCriarCliente(env, dados) {
  const d = normalizarCliente(dados || {}, null);
  if (!d.nome && !d.email && !d.cpfCnpj && !d.telefone) return null;
  let alvo = null;
  if (dados && dados.id) alvo = await lerCliente(env, dados.id);
  if (!alvo) {
    const todos = await listarClientes(env);
    alvo = (d.email && todos.find(c => c.email && c.email === d.email))
        || (d.cpfCnpj && todos.find(c => c.cpfCnpj && c.cpfCnpj === d.cpfCnpj))
        || (d.telefone && todos.find(c => c.telefone && c.telefone === d.telefone))
        || (d.nome && todos.find(c => normNome(c.nome) === normNome(d.nome)))
        || null;
  }
  // só completa o que estava vazio; não sobrescreve dado já cadastrado
  const merge = {};
  if (alvo) for (const k of Object.keys(CAMPOS_CLIENTE)) {
    if (["id", "criadoEm", "atualizadoEm"].includes(k)) continue;
    if (!alvo[k] && d[k]) merge[k] = d[k];
  }
  const novo = alvo ? normalizarCliente(merge, alvo) : normalizarCliente({ ...d, id: "" }, null);
  if (!novo.comoChamar) novo.comoChamar = primeiroNome(novo.nome);
  await salvarCliente(env, novo);
  return novo;
}

/* ---------- util ---------- */
function erro(mensagem, status) { const e = new Error(mensagem); e.status = status || 400; return e; }
export function respostaErro(e) { return json({ erro: e.message || String(e) }, e.status || 500); }
