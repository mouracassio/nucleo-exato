/* =============================================================================
   OS LINKS DA KIWIFY E O CONTATO — É AQUI QUE VOCÊ MEXE, E SÓ AQUI.

   PARTE 1 — CHECKOUTS
   Depois de criar cada produto na Kiwify, copie o link de CHECKOUT dele
   (o que começa com https://pay.kiwify.com.br/...) e cole no lugar do texto
   "COLE-AQUI". O site inteiro passa a apontar para ele — catálogo e página
   do produto, tudo de uma vez.

   Enquanto o link estiver como "COLE-AQUI", o botão daquele produto aparece
   cinza escrito "Em breve" e não deixa ninguém clicar. Assim você nunca
   publica um botão quebrado.

   O preço é só texto: escreva do jeito que quer que apareça na tela.

   PARTE 2 — CONTATO
   O número do WhatsApp fica em CONTATO.whatsapp, só com números, começando
   por 55 (Brasil) e o DDD. Exemplo: 5531999998888.
   Todos os botões "Pedir orçamento" do site passam a abrir a conversa já com
   a mensagem escrita. Enquanto o número estiver como "COLE-AQUI", esses
   botões abrem o e-mail em vez do WhatsApp — o site nunca fica sem contato.
   ============================================================================= */

var PRODUTOS = {

  mat1: {
    checkout: "https://pay.kiwify.com.br/BRUOjDP",
    preco: "34,90"
  },

  mat2: {
    checkout: "https://pay.kiwify.com.br/izUs4JT",
    preco: "34,90"
  },

  mat3: {
    checkout: "https://pay.kiwify.com.br/7LegsJT",
    preco: "34,90"
  },

  combo: {
    checkout: "https://pay.kiwify.com.br/MqMD7iJ",
    preco: "79,90"
  },

  planilha: {
    checkout: "https://pay.kiwify.com.br/tKkVv1A",
    preco: "29,90"
  },

  niosh: {
    checkout: "https://pay.kiwify.com.br/BFF2tJd",
    preco: "59,90"
  },

  sst: {
    checkout: "https://pay.kiwify.com.br/L1YIeBo",
    preco: "59,90"
  }

};

var CONTATO = {
  /* WhatsApp comercial da Núcleo Exato — recebe TODOS os pedidos de orçamento.
     Hoje é o número do Bruno (34 99693-1121), decidido em 15/08/2026.
     Formato: só números, começando por 55 (Brasil) + DDD. */
  whatsapp: "5534996931121",
  email: "moura.cassio@outlook.com"
};

/* ---------------------------------------------------------------------------
   Daqui para baixo é o que faz os botões funcionarem. Não precisa mexer.
   --------------------------------------------------------------------------- */
(function () {
  function pronto(v) {
    return v && v.indexOf("COLE-AQUI") === -1 && v.indexOf("http") === 0;
  }
  function temZap() {
    return CONTATO.whatsapp && CONTATO.whatsapp.indexOf("COLE-AQUI") === -1;
  }
  function soNumeros(v) {
    return String(v).replace(/[^0-9]/g, "");
  }

  document.addEventListener("DOMContentLoaded", function () {

    /* botões de compra */
    var botoes = document.querySelectorAll("[data-produto]");
    for (var i = 0; i < botoes.length; i++) {
      var el = botoes[i];
      var p = PRODUTOS[el.getAttribute("data-produto")];
      if (!p) continue;
      if (pronto(p.checkout)) {
        el.setAttribute("href", p.checkout);
        el.setAttribute("rel", "noopener");
      } else {
        el.classList.add("off");
        el.removeAttribute("href");
        var texto = el.querySelector("[data-rotulo]");
        if (texto) { texto.textContent = "Em breve"; }
        else { el.textContent = "Em breve"; }
      }
    }

    /* preços */
    var precos = document.querySelectorAll("[data-preco]");
    for (var j = 0; j < precos.length; j++) {
      var q = PRODUTOS[precos[j].getAttribute("data-preco")];
      if (q) { precos[j].textContent = q.preco; }
    }

    /* botões de orçamento — viram WhatsApp, ou e-mail se o número não estiver posto */
    var pedidos = document.querySelectorAll("[data-orcamento]");
    for (var k = 0; k < pedidos.length; k++) {
      var b = pedidos[k];
      var assunto = b.getAttribute("data-orcamento") || "um serviço";
      var msg = "Olá! Vim pelo site da Núcleo Exato e gostaria de um orçamento de " + assunto + ".";
      if (temZap()) {
        b.setAttribute("href", "https://wa.me/" + soNumeros(CONTATO.whatsapp) +
                               "?text=" + encodeURIComponent(msg));
        b.setAttribute("target", "_blank");
        b.setAttribute("rel", "noopener");
      } else {
        b.setAttribute("href", "mailto:" + CONTATO.email +
                               "?subject=" + encodeURIComponent("Orçamento — " + assunto) +
                               "&body=" + encodeURIComponent(msg));
      }
    }

    /* o e-mail escrito por extenso, onde aparecer */
    var mails = document.querySelectorAll("[data-email]");
    for (var m = 0; m < mails.length; m++) {
      mails[m].textContent = CONTATO.email;
      mails[m].setAttribute("href", "mailto:" + CONTATO.email);
    }

    /* blocos que só fazem sentido com o WhatsApp posto — ficam escondidos até lá */
    if (temZap()) {
      var zaps = document.querySelectorAll("[data-so-com-zap]");
      for (var z = 0; z < zaps.length; z++) { zaps[z].style.display = ""; }
    }

    /* ----------------------------------------------------------------
       FORMULÁRIO DE ORÇAMENTO (só roda na página de contato)
       Monta a mensagem, mostra a prévia e só então libera o envio.
       ---------------------------------------------------------------- */
    var form = document.getElementById("orc");
    if (!form) return;

    var campos = {
      nome:        document.getElementById("f-nome"),
      empresa:     document.getElementById("f-empresa"),
      cidade:      document.getElementById("f-cidade"),
      contato:     document.getElementById("f-contato"),
      area:        document.getElementById("f-area"),
      necessidade: document.getElementById("f-necessidade")
    };
    var obrigatorios = ["nome", "contato", "area", "necessidade"];
    var previa  = document.getElementById("previa-txt");
    var botao   = document.getElementById("f-enviar");
    var sub     = document.getElementById("f-sub");
    var botaoML = document.getElementById("f-email");

    /* a área pode vir escolhida pelo link: contato.html?area=qualidade */
    (function preSelecionaArea() {
      var m = window.location.search.match(/[?&]area=([^&]+)/);
      if (!m) return;
      var alvo = decodeURIComponent(m[1]).replace(/-/g, " ").toLowerCase();
      var ops = campos.area.options;
      for (var i = 0; i < ops.length; i++) {
        var txt = ops[i].value
          .replace(/&[a-z]+;/g, "")
          .normalize ? ops[i].text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
                     : ops[i].text.toLowerCase();
        if (txt.indexOf(alvo.split(" ")[0]) !== -1 && alvo.split(" ")[0].length > 3) {
          campos.area.selectedIndex = i;
          break;
        }
      }
    })();

    function valor(k) {
      var v = campos[k] ? campos[k].value : "";
      return (v || "").replace(/\s+/g, " ").trim();
    }

    function completo() {
      for (var i = 0; i < obrigatorios.length; i++) {
        if (!valor(obrigatorios[i])) return false;
      }
      return true;
    }

    function montaMensagem() {
      var l = [];
      l.push("Olá! Vim pelo site da Núcleo Exato e gostaria de um orçamento.");
      l.push("");
      l.push("Nome: " + (valor("nome") || "—"));
      if (valor("empresa")) l.push("Empresa: " + valor("empresa"));
      if (valor("cidade"))  l.push("Cidade: " + valor("cidade"));
      l.push("Contato: " + (valor("contato") || "—"));
      l.push("Área: " + (valor("area") || "—"));
      l.push("");
      l.push("Necessidade:");
      l.push(valor("necessidade") || "—");
      return l.join("\n");
    }

    function atualiza() {
      var pronto = completo();
      previa.textContent = (valor("nome") || valor("necessidade") || valor("contato"))
        ? montaMensagem()
        : "Preencha os campos acima e a mensagem aparece aqui.";

      if (pronto) {
        botao.classList.remove("off");
        botao.setAttribute("aria-disabled", "false");
        sub.textContent = "abre o WhatsApp com esta mensagem";
        if (temZap()) {
          botao.setAttribute("href", "https://wa.me/" + soNumeros(CONTATO.whatsapp) +
                                     "?text=" + encodeURIComponent(montaMensagem()));
          botao.setAttribute("target", "_blank");
          botao.setAttribute("rel", "noopener");
        } else {
          botao.setAttribute("href", "mailto:" + CONTATO.email +
            "?subject=" + encodeURIComponent("Orçamento — " + valor("area")) +
            "&body=" + encodeURIComponent(montaMensagem()));
        }
        botaoML.setAttribute("href", "mailto:" + CONTATO.email +
          "?subject=" + encodeURIComponent("Orçamento — " + valor("area")) +
          "&body=" + encodeURIComponent(montaMensagem()));
        botaoML.classList.remove("off");
      } else {
        botao.classList.add("off");
        botao.setAttribute("aria-disabled", "true");
        botao.removeAttribute("href");
        sub.textContent = "preencha os campos marcados com *";
        botaoML.classList.add("off");
        botaoML.removeAttribute("href");
      }
    }

    for (var k in campos) {
      if (!campos[k]) continue;
      campos[k].addEventListener("input", atualiza);
      campos[k].addEventListener("change", atualiza);
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    atualiza();
  });
})();
