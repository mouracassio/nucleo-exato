// Clientes do Núcleo Exato (todos os canais), guardados no KV PRODUTOS com o
// prefixo "cliente:". Cadastro completo, como um cadastro oficial: nada é
// obrigatório além do nome, mas tudo pode ser preenchido (venda direta).
//
// GET    /api/admin/clientes            → lista em ordem alfabética
// POST   /api/admin/clientes            → cria ou atualiza { cliente }
// DELETE /api/admin/clientes { id }     → apaga (registro errado/teste)
import { json, exigirSessao } from "./sessao.js";
import { PREFIXO_CLIENTE, listarClientes, lerCliente, normalizarCliente, salvarCliente, primeiroNome } from "./acesso-lib.js";

export async function onRequestGet({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.PRODUTOS) return json({ erro: "Falta ligar o KV PRODUTOS na Cloudflare." }, 503);
  const clientes = await listarClientes(env);
  return json({ total: clientes.length, clientes });
}

export async function onRequestPost({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.PRODUTOS) return json({ erro: "Falta ligar o KV PRODUTOS na Cloudflare." }, 503);
  let corpo;
  try { corpo = await request.json(); } catch { return json({ erro: "corpo inválido" }, 400); }
  const c0 = corpo && corpo.cliente ? corpo.cliente : corpo;
  if (!c0 || typeof c0 !== "object") return json({ erro: "cliente inválido" }, 400);
  const anterior = c0.id ? await lerCliente(env, c0.id) : null;
  const c = normalizarCliente(c0, anterior);
  if (!c.nome) return json({ erro: "informe o nome do cliente" }, 400);
  if (!c.comoChamar) c.comoChamar = primeiroNome(c.nome);
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) return json({ erro: "e-mail inválido" }, 400);
  if (c.cpfCnpj && ![11, 14].includes(c.cpfCnpj.length)) return json({ erro: "CPF tem 11 dígitos e CNPJ tem 14" }, 400);
  await salvarCliente(env, c);
  return json({ ok: true, cliente: c, novo: !anterior });
}

export async function onRequestDelete({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  if (!env.PRODUTOS) return json({ erro: "Falta ligar o KV PRODUTOS na Cloudflare." }, 503);
  let corpo;
  try { corpo = await request.json(); } catch { return json({ erro: "corpo inválido" }, 400); }
  const id = String((corpo && corpo.id) || "").trim().toLowerCase();
  if (!id) return json({ erro: "id inválido" }, 400);
  if (!(await env.PRODUTOS.get(PREFIXO_CLIENTE + id))) return json({ erro: "cliente não encontrado" }, 404);
  await env.PRODUTOS.delete(PREFIXO_CLIENTE + id);
  return json({ ok: true, id });
}
