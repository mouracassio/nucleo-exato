# O site da Núcleo Exato — como publicar e como manter

> **v2 · 15/08/2026.** O site deixou de ser só uma loja: agora tem duas metades, **Loja** e
> **Serviços**. A versão anterior deste arquivo (de 10/08, quando o site ainda era o catálogo
> do Prof. Cássio Moura) está na `_Quarentena`.

Esta pasta é um **site pronto**. São páginas em HTML puro: não precisa de servidor, banco de
dados nem programa nenhum rodando. É só colocar no ar.

```
index.html                       ← a HOME (quem somos, as duas metades)
loja.html                        ← o catálogo  ⚠️ era este o antigo index.html
servicos.html                    ← as três áreas de serviço
servicos-seguranca-do-trabalho.html
servicos-meio-ambiente.html      ← curta de propósito: espera a revisão do Bruno
servicos-educacao.html
quem-assina.html                 ← os dois sócios, com os registros no CREA
contato.html                     ← WhatsApp e e-mail

matematica-1ano.html             ← páginas de venda dos 6 produtos
matematica-2ano.html
matematica-3ano.html
matematica-combo.html
planilha-de-notas.html
niosh.html

links.js                         ← ⚠️ É AQUI que ficam os links da Kiwify E o WhatsApp
css/estilo.css
img/                             ← as artes
```

**São 14 páginas.** O menu de todas elas é o mesmo: `Início · Loja · Serviços · Quem assina ·
Contato`.

---

## O único arquivo que você mexe: `links.js`

Ele tem duas partes.

### Parte 1 — os checkouts da Kiwify

```js
mat1: {
  checkout: "https://pay.kiwify.com.br/BRUOjDP",
  preco: "34,90"
},
```

Troque `COLE-AQUI` pelo link de checkout e, se quiser, ajuste o preço. **Só isso.** A home, o
catálogo e a página do produto passam a apontar para o lugar certo, tudo de uma vez.

> **Proteção:** enquanto o link estiver como `COLE-AQUI`, o botão daquele produto aparece cinza,
> escrito **"Em breve"**, e não deixa ninguém clicar. Você nunca publica um botão quebrado.

### Parte 2 — o contato

```js
var CONTATO = {
  whatsapp: "5534996931121",
  email: "moura.cassio@outlook.com"
};
```

O número é o do **WhatsApp comercial da empresa** (hoje o do Bruno), só com números, começando
por `55` + DDD. Todos os botões **"Pedir orçamento"** do site abrem a conversa com a mensagem já
escrita, e a mensagem diz de qual área veio o pedido ("...orçamento de Segurança do Trabalho").

> Se um dia o número sair do arquivo (voltar a `COLE-AQUI`), esses botões passam a abrir o
> **e-mail** em vez do WhatsApp. O site nunca fica sem contato.

O e-mail aparece escrito por extenso em vários lugares do site, e todos saem daqui — trocou em
`links.js`, trocou no site inteiro.

---

## Como isso conversa com a Kiwify

Existem **dois links diferentes** na Kiwify e é importante não confundir:

| Link | Como é | Para que serve |
|---|---|---|
| **Checkout** | `https://pay.kiwify.com.br/xxxxx` | A tela de pagamento. **É este que vai no `links.js`.** |
| **Página de vendas** | um campo dentro do produto, na aba Geral | O endereço que a Kiwify mostra como "site do produto" |

Endereços finais da "Página de vendas" de cada produto:

```
https://nucleoexato.com.br/matematica-1ano.html
https://nucleoexato.com.br/matematica-2ano.html
https://nucleoexato.com.br/matematica-3ano.html
https://nucleoexato.com.br/matematica-combo.html
https://nucleoexato.com.br/planilha-de-notas.html
https://nucleoexato.com.br/niosh.html
```

O caminho da venda fica assim:

> Instagram / WhatsApp / grupo de professores → **`nucleoexato.com.br`** (home) → **Loja** →
> página do produto → botão **Comprar agora** → **checkout da Kiwify** → acesso liberado na hora.

E o caminho do serviço:

> **`nucleoexato.com.br`** → **Serviços** → a área → botão **Pedir orçamento** → WhatsApp.

---

## Publicar

O site já está no GitHub e conectado à Vercel. Para atualizar: **Add file → Upload files**,
arrastar os arquivos alterados, escrever a mensagem do commit e confirmar. A Vercel republica
sozinha em menos de um minuto.

O passo a passo completo da renomeação (repositório, projeto na Vercel, domínio e DNS) está em
`00_Empresa/TROCAR NOMES - GitHub, Vercel e Kiwify.md`.

## Conferir antes de divulgar

Abra o endereço numa **janela anônima** e veja:

1. A home abre, com as duas metades?
2. **Loja** mostra os seis produtos, com preço?
3. Cada botão **Comprar agora** leva para o checkout certo da Kiwify?
4. Cada botão **Pedir orçamento** abre o WhatsApp com a mensagem escrita?
5. **Serviços**, **Quem assina** e **Contato** abrem, sem link quebrado?
6. No celular está legível? (é só abrir o mesmo link no telefone)

---

## Como mudar as coisas depois

| O que você quer mudar | Onde mexer |
|---|---|
| Link de checkout ou preço | `links.js` |
| Número do WhatsApp ou e-mail | `links.js`, no bloco `CONTATO` |
| Texto de uma página | o `.html` dela, num editor de texto |
| Uma arte | troque o arquivo dentro de `img/`, mantendo o mesmo nome |
| Acrescentar um produto | copie um `.html` parecido, renomeie, ajuste o texto e acrescente o produto em `links.js` e em `loja.html` |
| Acrescentar um serviço | copie `servicos-educacao.html`, ajuste, e acrescente o cartão em `servicos.html` |

---

## O que está deliberadamente incompleto

Não é esquecimento — está esperando decisão ou revisão:

- **`servicos-meio-ambiente.html`** só tem o nome, o registro e um "em breve". A relação de
  serviços do Bruno **não vai ao ar sem ele ler**. O texto pronto está fora do site, em
  `00_Empresa/PENDENTE - Meio Ambiente e perfil do Bruno (esperando revisao).md`.
- **`quem-assina.html`** traz do Bruno só nome, formação e CREA — tudo conferível no conselho.
  O perfil descritivo (tempo de atuação, ARTs, cargo no conselho) está no mesmo arquivo acima.
- **Serviço em nome da empresa**: enquanto a Núcleo Exato não tiver CNPJ + registro no CREA-MG,
  o site diz que quem assina é **o engenheiro, pessoa física, com ART individual**. Está escrito
  assim em todas as páginas de serviço. Não mudar isso antes de resolver a trava.
- **E-mail próprio da empresa** (`contato@nucleoexato.com.br`): com o domínio registrado dá para
  ter. Enquanto não tem, o site mostra o e-mail de suporte da Kiwify.

*"Tudo que é verdadeiro respeita o tempo."* — **Eng. Prof. Cássio Moura** · 2026
