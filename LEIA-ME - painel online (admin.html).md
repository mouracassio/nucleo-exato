# O painel online — admin.html

> **v1 · 14/09/2026.** Substitui, para PRODUTOS e CÓDIGOS, o fluxo antigo de "editar no
> painel.html local → baixar → subir no GitHub". O `painel.html` local continua valendo só
> para textos de banner, serviços e categorias.

## O que é

`https://nucleoexato.com.br/admin.html` — entra com usuário e senha e faz, pelo navegador:

- **Produtos:** cadastrar, editar, ativar/desativar na loja, marcar destaque na home. Vale na hora.
- **Arquivos:** subir o .zip que o cliente baixa com o código (pasta `entregas/` do R2) e capas (`img/`).
- **Códigos de acesso:** gerar o código de uma venda do Mercado Livre/Shopee e copiar a mensagem pronta.

Nada é apagado por ele: produto sai da loja com a chave "Na loja" desligada, e arquivo
substituído vai para `quarentena/<data>/` dentro do próprio R2.

## Como funciona por dentro (para quem for mexer)

```
admin.html                         ← a tela (HTML + JS puro, usa css/estilo.css)
functions/_middleware.js           ← a "loja dinâmica": injeta os produtos do banco nas
                                      páginas estáticas e no links.js na hora de servir
functions/api/produtos.js          ← GET público: produtos ativos (sem campos internos)
functions/api/imagem/[nome].js     ← serve capa enviada pelo painel (R2 img/)
functions/api/admin/sessao.js      ← login por cookie assinado (HMAC) + helpers
functions/api/admin/entrar.js      ← POST usuário+senha → cookie de 12 h
functions/api/admin/sair.js
functions/api/admin/produtos.js    ← GET lista / POST cria-atualiza (KV PRODUTOS)
functions/api/admin/importar.js    ← carga inicial a partir do links.js + conteudo.json publicados
functions/api/admin/arquivos.js    ← GET lista R2 / PUT upload em fluxo (até 100 MB)
functions/api/admin/gerar.js       ← gera código (KV ACESSOS) com o arquivo do produto
functions/api/admin/codigos.js     ← lista códigos
_routes.json                       ← imagens, css e dados não passam pelas functions
```

O site continua estático. O `_middleware.js` faz três coisas ao servir: troca o bloco
`var PRODUTOS` do `links.js` pelos produtos ativos do banco (preço e checkout atuais);
esconde o cartão de produto desativado; e acrescenta cartão de produto novo no fim da grade
certa (em `materiais.html` por categoria, na home só os marcados "destaque"). Se o banco
estiver vazio, o site sai exatamente como está no GitHub.

## O que precisa existir na Cloudflare (Pages → projeto nucleo-exato → Settings)

**Bindings**
| Tipo | Nome no código | Recurso |
|---|---|---|
| KV | `ACESSOS` | já existia (códigos de acesso) |
| KV | `PRODUTOS` | **novo** — criar o namespace e ligar com este nome |
| R2 | `ARQUIVOS` | bucket `nucleo-exato-entregas` (já existia) |

**Variables and Secrets** (tipo Secret, ambiente Production)
| Nome | O que é |
|---|---|
| `ADMIN_USUARIO` | o usuário do painel |
| `ADMIN_SENHA` | a senha do painel (longa; só o Cássio sabe) |
| `SEGREDO_SESSAO` | uma frase longa aleatória (32+ caracteres) que assina o cookie; ninguém digita, só existe lá |

A antiga `SENHA_ADMIN` deixou de ser usada (o `gerar-acesso.html` agora redireciona para o painel).

Depois de criar segredos ou bindings: Deployments → Retry deployment (eles só entram num deploy novo).

## Primeira vez

1. Entrar em `admin.html`.
2. Produtos → **Importar os produtos que já estão no site** (traz os 12 do `links.js` + `conteudo.json` publicados).
3. Arquivos → subir os .zip que faltam (os 5 do bloco A e o `nr01.zip` novo com o certificado corrigido).
4. Produtos → Editar → conferir "Arquivos de entrega" de cada um.
5. Códigos → gerar um de teste, abrir o link, baixar.

## Limites conhecidos

- Um usuário só, senha única, sessão de 12 h. Adequado para loja de uma pessoa.
- Upload de até 100 MB por arquivo (limite da Cloudflare).
- Produto novo criado pelo painel aparece como cartão na loja, mas não ganha página própria
  (`xxx.html`); para ter página, criar o HTML no repositório como as outras e preencher o campo "Página própria".
- Textos de banner, serviços e categorias continuam no `painel.html` local + GitHub.


## Atualização de 20/09/2026 — vários arquivos por produto

Antes cada produto entregava **um** arquivo pelo código de acesso. Agora entrega **uma lista**.

No painel, em Produtos → Editar, o campo virou "Arquivos de entrega" com seleção múltipla (segure Cmd no Mac, Ctrl no Windows). A ordem em que aparecem marcados é a ordem que o cliente vê.

Quando o produto tem mais de um arquivo, o cliente digita o código em `nucleoexato.com.br/acesso.html` e cai numa página com a lista, baixando item por item. Com um arquivo só, continua baixando direto, como antes — nada do que já estava cadastrado mudou.

Motivo: os produtos de Matemática passaram a ser entregues em blocos pequenos (um zip a cada 5 aulas, com 10 arquivos Word dentro), mais o Plano Anual, o bônus em PDF e o explicativo. Isso evita download de centenas de MB de uma vez e deixa o cliente baixar só o que quer.

Os arquivos desses blocos ficam em cada ano, na pasta `10_Pacote_Site (zips para o painel)`, e sobem para o R2 pelo comando `4 - subir entregas para o R2.command` com as chaves `entregas/mat1-...`, `entregas/mat2-...`, `entregas/mat3-...`.
