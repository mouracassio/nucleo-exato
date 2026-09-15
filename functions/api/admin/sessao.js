// Sessão do painel (admin.html).
// GET /api/admin/sessao — diz se o navegador está logado.
// Este arquivo também exporta as funções de autenticação usadas pelos outros
// endpoints do painel (exigirSessao, criarCookie, etc.).
//
// Como funciona: no login (entrar.js) o servidor confere usuário e senha com os
// segredos ADMIN_USUARIO e ADMIN_SENHA e devolve um cookie assinado com
// SEGREDO_SESSAO (HMAC-SHA256). O cookie vale 12 horas e só o servidor consegue
// fabricar um válido. Nenhuma senha fica guardada no navegador.

const NOME_COOKIE = "ne_sessao";
const HORAS_SESSAO = 12;

export async function onRequestGet({ request, env }) {
  const s = await lerSessao(request, env);
  if (!s) return json({ ok: false }, 401);
  return json({ ok: true, usuario: env.ADMIN_USUARIO || "admin", expiraEm: s.expira });
}

/* ---------- helpers exportados ---------- */

export function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extraHeaders },
  });
}

export function faltamSegredos(env) {
  const f = [];
  if (!env.ADMIN_USUARIO) f.push("ADMIN_USUARIO");
  if (!env.ADMIN_SENHA) f.push("ADMIN_SENHA");
  if (!env.SEGREDO_SESSAO) f.push("SEGREDO_SESSAO");
  return f;
}

export async function assinar(env, texto) {
  const chave = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(env.SEGREDO_SESSAO),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(texto));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// comparação em tempo constante (evita medir o tempo de resposta pra adivinhar)
export async function iguais(a, b) {
  const ha = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(a)));
  const hb = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(b)));
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0 && String(a).length === String(b).length;
}

export async function criarCookie(env) {
  const expira = Date.now() + HORAS_SESSAO * 3600 * 1000;
  const sig = await assinar(env, "sessao|" + expira);
  const valor = expira + "." + sig;
  return {
    expira,
    header: NOME_COOKIE + "=" + valor + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" + (HORAS_SESSAO * 3600),
  };
}

export function apagarCookie() {
  return NOME_COOKIE + "=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}

export async function lerSessao(request, env) {
  if (!env.SEGREDO_SESSAO) return null;
  const cookies = request.headers.get("cookie") || "";
  const m = cookies.match(new RegExp("(?:^|;\\s*)" + NOME_COOKIE + "=([^;]+)"));
  if (!m) return null;
  const [expiraTxt, sig] = m[1].split(".");
  const expira = Number(expiraTxt);
  if (!expira || !sig || Date.now() > expira) return null;
  const esperado = await assinar(env, "sessao|" + expira);
  if (!(await iguais(sig, esperado))) return null;
  return { expira };
}

// Uso nos endpoints: const erro = await exigirSessao(request, env); if (erro) return erro;
export async function exigirSessao(request, env) {
  const s = await lerSessao(request, env);
  if (!s) return json({ erro: "sessão expirada — entre de novo" }, 401);
  return null;
}
