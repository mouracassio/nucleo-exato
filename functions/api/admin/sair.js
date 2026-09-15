// POST /api/admin/sair — encerra a sessão (apaga o cookie).
import { json, apagarCookie } from "./sessao.js";

export async function onRequestPost() {
  return json({ ok: true }, 200, { "set-cookie": apagarCookie() });
}
