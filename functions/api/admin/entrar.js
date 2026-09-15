// POST /api/admin/entrar — login do painel. Corpo: { usuario, senha }.
// Confere com os segredos ADMIN_USUARIO e ADMIN_SENHA (Cloudflare Pages →
// Settings → Variables and Secrets) e devolve o cookie de sessão.
import { json, iguais, criarCookie, faltamSegredos } from "./sessao.js";

export async function onRequestPost({ request, env }) {
  const faltam = faltamSegredos(env);
  if (faltam.length) {
    return json({ erro: "O painel ainda não foi configurado na Cloudflare. Faltam os segredos: " + faltam.join(", ") }, 503);
  }

  let corpo;
  try { corpo = await request.json(); } catch { return json({ erro: "corpo inválido" }, 400); }
  const usuario = String(corpo.usuario || "").trim();
  const senha = String(corpo.senha || "");

  // pausa fixa pra desanimar tentativa em massa
  await new Promise(r => setTimeout(r, 400));

  const okU = await iguais(usuario, env.ADMIN_USUARIO);
  const okS = await iguais(senha, env.ADMIN_SENHA);
  if (!okU || !okS) return json({ erro: "usuário ou senha incorretos" }, 401);

  const c = await criarCookie(env);
  return json({ ok: true, usuario, expiraEm: c.expira }, 200, { "set-cookie": c.header });
}
