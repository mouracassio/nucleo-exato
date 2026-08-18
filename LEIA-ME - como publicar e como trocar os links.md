# O site da Núcleo Exato — como publicar e como manter

> **v4 · 15/08/2026 (fim da tarde).** O site é **uma empresa de engenharia com cinco áreas**.
> A frente de Segurança do Trabalho começa só com treinamento e palestra — documentação (PGR,
> AET, laudos) ficou para depois, e o texto está guardado em
> `00_Empresa/ESCOPO ADIADO - documentacao de Seguranca do Trabalho.md`.
> As versões anteriores deste arquivo estão na `_Quarentena`.

Site em HTML puro: não precisa de servidor, banco de dados nem programa rodando.

```
index.html                            ← a home
servicos.html                         ← as cinco áreas
servicos-treinamentos.html            ← SSMA e qualidade, todos com certificado
servicos-palestras.html               ← SIPAT, palestra avulsa, escola
servicos-meio-ambiente.html           ← licenciamento, estudos, outorga, PGRS
servicos-qualidade.html               ← 5S, PDCA, processos, indicadores
servicos-educacao.html                ← material sob encomenda e formação
materiais.html                        ← o catálogo de material pronto
quem-somos.html                       ← os dois engenheiros e os registros
contato.html                          ← o formulário de orçamento

matematica-1ano.html                  ← as 6 páginas de venda
matematica-2ano.html
matematica-3ano.html
matematica-combo.html
planilha-de-notas.html
niosh.html

loja.html · quem-assina.html          ← redirecionam para os nomes novos, não apagar
servicos-seguranca-do-trabalho.html   ← redireciona para Treinamentos, não apagar
links.js                              ← ⚠️ É AQUI que você mexe
css/estilo.css
img/
```

**19 páginas.** Menu de todas: `Início · Serviços · Materiais · Quem somos · Contato`.

> Os dois arquivos `loja.html` e `quem-assina.html` são só redirecionadores de uma linha. Existem
> porque esses endereços já circularam. **Não apague** — link antigo que alguém salvou continua
> funcionando por causa deles.

---

## O único arquivo que você mexe: `links.js`

### Parte 1 — os checkouts da Kiwify

Troque `COLE-AQUI` pelo link de checkout. A home, o catálogo e a página do produto passam a
apontar para o lugar certo, tudo de uma vez.

> **Proteção:** enquanto estiver `COLE-AQUI`, o botão fica cinza escrito "Em breve" e não deixa
> clicar. Você nunca publica botão quebrado.

### Parte 2 — o contato

```js
var CONTATO = {
  whatsapp: "5534996931121",
  email: "moura.cassio@outlook.com"
};
```

Só números, começando por `55` + DDD. Trocou aqui, trocou no site inteiro — inclusive no
formulário de orçamento e no e-mail que aparece escrito em várias páginas.

---

## Como funciona o formulário de orçamento

Está em `contato.html` e **não usa servidor nenhum**. Funciona assim:

1. O visitante preenche seis campos: nome, empresa, cidade, contato, área e necessidade.
   Quatro são obrigatórios (nome, contato, área, necessidade).
2. Conforme digita, uma caixa tracejada mostra a **prévia exata** da mensagem que vai sair.
3. O botão "Enviar pelo WhatsApp" fica **cinza e travado** até os obrigatórios estarem
   preenchidos. Aí ele acende e abre o WhatsApp com o texto já escrito.
4. Tem também um botão de e-mail, que faz o mesmo abrindo o programa de e-mail.

**Nada é guardado.** O site não tem banco de dados: a mensagem só existe no WhatsApp depois que
a pessoa aperta enviar.

**Atalho útil:** os botões "Pedir orçamento" das páginas de área levam para
`contato.html?area=qualidade` — e o formulário já abre com a área escolhida. Os valores são
`treinamentos`, `palestras`, `meio-ambiente`, `qualidade`, `educacao`.

---

## Como isso conversa com a Kiwify

| Link | Como é | Para que serve |
|---|---|---|
| **Checkout** | `https://pay.kiwify.com.br/xxxxx` | A tela de pagamento. **É este que vai no `links.js`.** |
| **Página de vendas** | campo dentro do produto, aba Geral | O endereço que a Kiwify mostra como site do produto |

```
https://nucleoexato.com.br/matematica-1ano.html
https://nucleoexato.com.br/matematica-2ano.html
https://nucleoexato.com.br/matematica-3ano.html
https://nucleoexato.com.br/matematica-combo.html
https://nucleoexato.com.br/planilha-de-notas.html
https://nucleoexato.com.br/niosh.html
```

---

## Publicar

GitHub → **Add file → Upload files** → arrastar os arquivos alterados → mensagem do commit →
**Commit changes**. A Vercel republica sozinha em menos de um minuto.

## Conferir antes de divulgar

1. A home abre e mostra as cinco áreas?
2. **Materiais** mostra os seis produtos com preço?
3. Cada **Comprar agora** leva ao checkout certo?
4. No **Contato**, o botão do WhatsApp começa cinza e acende ao preencher?
5. A prévia mostra exatamente o que você digitou?
6. No celular está legível?

---

## Como mudar as coisas depois

| O que mudar | Onde |
|---|---|
| Checkout ou preço | `links.js` |
| WhatsApp ou e-mail | `links.js`, bloco `CONTATO` |
| Texto de uma área | o `servicos-*.html` dela |
| Acrescentar uma área | copie um `servicos-*.html`, ajuste, e acrescente o bloco em `servicos.html`, o cartão na home e a opção no `<select>` do `contato.html` |
| Uma arte | troque o arquivo em `img/`, mantendo o nome |
| Acrescentar um produto | copie um `.html` de produto, e acrescente em `links.js` e em `materiais.html` |

---

## Decisões de escrita que valem manter

Foram custosas, não desfaça sem motivo:

- **Não dividimos território.** O site não diz "fulano assina esta área". A empresa tem duas
  formações de engenharia e as duas atendem. No lugar disso, uma linha técnica sem nome:
  *"Todo trabalho técnico sai com ART e responsabilidade de engenheiro registrado no CREA-MG."*
- **Não anunciamos status que não dá para provar.** Nada de "em breve" ou "em desenvolvimento"
  sem que exista mesmo alguma coisa em produção. E nada de estatística de mercado sem fonte.
- **Dizemos o que ainda não fazemos.** Duas vezes: os treinamentos que exigem estrutura prática
  e a documentação de SST. Isso não é fraqueza — é o que faz o resto do site ser acreditado.
- **Promessa por produto, nunca no texto geral.** "Sem marca d'água" vale para a Matemática e
  não vale para o NIOSH. O texto do catálogo diz isso com essa precisão.
- **Os números do CREA aparecem em todas as páginas**, no rodapé. É o que separa a empresa de
  quem vende PGR sem engenheiro, e é conferível na consulta pública do conselho.

## O que continua pendente

- **Registro da empresa no CREA-MG** — enquanto não existir, o serviço é prestado e assinado
  por engenheiro pessoa física, com ART individual. É por isso que a linha técnica do site fala
  em "engenheiro registrado", e não em "a Núcleo Exato".
- **Acúmulo com o cargo público** — regra do estatuto do servidor de MG, a conferir antes de
  ampliar a divulgação.
- **E-mail próprio da empresa** (`contato@nucleoexato.com.br`) — com o domínio dá para ter.
  Enquanto não tem, o site mostra o e-mail de suporte da Kiwify.
- **A lista de serviços de Meio Ambiente** saiu do escopo de 14/08. Confira se sai ou entra
  alguma coisa.
- **Documentação de Segurança do Trabalho** (PGR, AET, LTCAT) está fora do escopo por decisão
  de 15/08. O site diz isso com todas as letras, em `servicos.html`. O texto pronto para quando
  voltar está em `00_Empresa/ESCOPO ADIADO - documentacao de Seguranca do Trabalho.md`.
- **Treinamentos que exigem estrutura prática** (NR-10, NR-33, NR-35, NR-11, NR-12, NR-13) estão
  declarados como fora da lista, na página de Treinamentos. Quando algum entrar, tire-o de lá.

*"Tudo que é verdadeiro respeita o tempo."* — **Prof. Eng. Cássio Moura** · 2026
