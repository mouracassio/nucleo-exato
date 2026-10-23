// GET /api/admin/indice — onde fica, no Mac, o arquivo de cada produto de entrega.
// Os dados vêm de indice-dados.js, gerado por 02_Ferramentas.../indice_arquivos/gerar_indice.py
// (comando "5 - atualizar o indice de arquivos"). Só com o painel logado: o caminho das suas pastas não é público.
import { json, exigirSessao } from "./sessao.js";
import dados from "./indice-dados.js";

export async function onRequestGet({ request, env }) {
  const erro = await exigirSessao(request, env); if (erro) return erro;
  return json(dados);
}
