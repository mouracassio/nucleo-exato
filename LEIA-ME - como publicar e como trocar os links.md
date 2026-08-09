# A sua loja — como publicar e como manter

Esta pasta é um **site pronto**. São páginas em HTML puro: não precisa de servidor, banco de dados
nem programa nenhum rodando. É só colocar no ar.

```
index.html                ← o catálogo (é ESTE o link que vai na bio do Instagram)
matematica-1ano.html      ← página de vendas do 1º ano
matematica-2ano.html
matematica-3ano.html
matematica-combo.html
planilha-de-notas.html
niosh.html
links.js                  ← ⚠️ É AQUI que ficam os links da Kiwify
css/estilo.css
img/                      ← as artes (as mesmas dos anúncios)
```

---

## Como isso conversa com a Kiwify

Existem **dois links diferentes** na Kiwify e é importante não confundir:

| Link | Como é | Para que serve |
|---|---|---|
| **Checkout** | `https://pay.kiwify.com.br/xxxxx` | A tela de pagamento. **É este que vai nos botões do site.** |
| **Página de vendas** | um campo dentro do produto, na aba Geral | O endereço que a Kiwify mostra como "site do produto" |

Hoje, no produto da planilha, esse campo **"Página de vendas" está apontando para o Mercado Livre**.
Depois de publicar esta loja, troque por `https://seu-endereco.vercel.app/planilha-de-notas.html`.
Faça o mesmo em cada produto novo.

O caminho da venda fica assim:

> Instagram / WhatsApp / grupo de professores → **`index.html`** (catálogo) →
> página do produto → botão **Comprar** → **checkout da Kiwify** → acesso liberado na hora.

---

## Passo 1 — pegar os links de checkout

Para cada produto criado na Kiwify: **Produtos → o produto → Links → copiar o link de checkout**
(o que começa com `pay.kiwify.com.br`).

## Passo 2 — colar em `links.js`

Abra `links.js` em qualquer editor de texto. Você vai ver isto:

```js
mat1: {
  checkout: "COLE-AQUI",
  preco: "34,90"
},
```

Troque `COLE-AQUI` pelo link e, se quiser, ajuste o preço. **Só isso.** O catálogo e a página do
produto passam a apontar para o lugar certo, os dois de uma vez.

> **Proteção**: enquanto o link estiver como `COLE-AQUI`, o botão daquele produto aparece cinza,
> escrito **"Em breve"**, e não deixa ninguém clicar. Você nunca vai publicar um botão quebrado.
> Hoje só a planilha está com o link real; os outros cinco estão em "Em breve".

## Passo 3 — publicar na Vercel

Você já tem conta, então tem dois caminhos. **O primeiro é o melhor a longo prazo.**

### Caminho A — pelo GitHub (recomendado)

1. No GitHub, crie um repositório novo, por exemplo `loja-cassio-moura`, e marque como **público**.
2. Na tela do repositório vazio, clique em **uploading an existing file** e arraste **o conteúdo
   desta pasta** (o `index.html` tem que ficar na raiz do repositório, não dentro de outra pasta).
3. Na Vercel: **Add New → Project → Import** o repositório.
4. Em Framework Preset escolha **Other**. Deixe os campos de build vazios. **Deploy**.
5. Em menos de um minuto sai o endereço: `loja-cassio-moura.vercel.app`.

Daí em diante, cada vez que você mudar o `links.js` no GitHub, **a Vercel republica sozinha**.

### Caminho B — arrastar a pasta

Na Vercel, **Add New → Project → Deploy from a folder** (ou instale o `vercel` no terminal e rode
`vercel` dentro desta pasta). Funciona igual, mas cada atualização é um envio manual.

## Passo 4 — conferir antes de divulgar

Abra o endereço numa **janela anônima** e veja:

1. O catálogo abre e mostra os seis produtos?
2. Clicando em "Ver tudo o que vem", a página do produto abre?
3. O botão de comprar leva para o **checkout da Kiwify**, com o preço certo?
4. No celular está legível? (é só abrir o mesmo link no seu telefone)

---

## Como mudar as coisas depois

| O que você quer mudar | Onde mexer |
|---|---|
| Link de checkout ou preço | `links.js` |
| Texto de uma página | o `.html` daquele produto, num editor de texto |
| Uma arte | troque o arquivo dentro de `img/`, mantendo o mesmo nome |
| Acrescentar um produto novo | copie um `.html` parecido, renomeie, ajuste o texto e acrescente o produto em `links.js` e no `index.html` |

## Um domínio próprio, se um dia quiser

Um domínio tipo `cassiomoura.com.br` custa cerca de R$ 40 por ano no registro.br. Depois é só
apontar para a Vercel em **Settings → Domains**. O site continua o mesmo; muda só o endereço —
e o link fica bem melhor de dizer em voz alta numa formação de professores.

---

## Onde divulgar o link do catálogo

- **Bio do Instagram** — é o único link que você tem lá; use o do catálogo, não o de um produto só.
- **Grupos de professores no WhatsApp** — melhor mandar a página do produto específico.
- **Chat do Mercado Livre**, para quem já comprou de você — a mensagem pronta está em
  `Como publicar/MENSAGEM POS-VENDA - copiar e colar no chat.md`.
- **Assinatura de e-mail** e o rodapé dos seus materiais gratuitos.

*"Tudo que é verdadeiro respeita o tempo." — Eng. Prof. Cássio Moura · 2026*
