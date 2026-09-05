/* =============================================================================
 OS LINKS DA KIWIFY E O CONTATO

 ATENÇÃO: este arquivo passou a ser GERADO PELO painel.html em 16/08/2026.
 Editar aqui na mão funciona, mas na próxima vez que você gerar pelo painel
 a sua edição é perdida. Mexa no painel, não aqui.

 A proteção antiga continua valendo: checkout como "COLE-AQUI" deixa o botão
 cinza escrito "Em breve" e sem clique. Nunca se publica botão quebrado.
 ============================================================================= */

var PRODUTOS = {

  sst: {
    checkout: "https://pay.kiwify.com.br/L1YIeBo",
    preco: "59,90"
  },

  niosh: {
    checkout: "https://pay.kiwify.com.br/BFF2tJd",
    preco: "64,90"
  },

  mat1: {
    checkout: "https://pay.kiwify.com.br/BRUOjDP",
    preco: "57,90"
  },

  mat2: {
    checkout: "https://pay.kiwify.com.br/izUs4JT",
    preco: "57,90"
  },

  mat3: {
    checkout: "https://pay.kiwify.com.br/7LegsJT",
    preco: "57,90"
  },

  combo: {
    checkout: "https://pay.kiwify.com.br/MqMD7iJ",
    preco: "97,90"
  },

  planilha: {
    checkout: "https://pay.kiwify.com.br/tKkVv1A",
    preco: "34,90"
  },

  epi: {
    checkout: "https://pay.kiwify.com.br/68Bv0Xr",
    preco: "34,90"
  },

  treinamentos-venc: {
    checkout: "https://pay.kiwify.com.br/BBeUMN0",
    preco: "34,90"
  },

  matriz-sst: {
    checkout: "https://pay.kiwify.com.br/PRg6z9r",
    preco: "34,90"
  },

  cartoes-operador: {
    checkout: "https://pay.kiwify.com.br/PO7kDsp",
    preco: "34,90"
  },

  nr13: {
    checkout: "https://pay.kiwify.com.br/dNRFpTZ",
    preco: "34,90"
  }

};

var CONTATO = {
  whatsapp: "5534999131399",
  email: "nucleoexato@gmail.com"
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

    var precos = document.querySelectorAll("[data-preco]");
    for (var j = 0; j < precos.length; j++) {
      var q = PRODUTOS[precos[j].getAttribute("data-preco")];
      if (q) { precos[j].textContent = q.preco; }
    }

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
                               "?subject=" + encodeURIComponent("Orçamento - " + assunto) +
                               "&body=" + encodeURIComponent(msg));
      }
    }

    var mails = document.querySelectorAll("[data-email]");
    for (var m = 0; m < mails.length; m++) {
      mails[m].textContent = CONTATO.email;
      mails[m].setAttribute("href", "mailto:" + CONTATO.email);
    }

    if (temZap()) {
      var zaps = document.querySelectorAll("[data-so-com-zap]");
      for (var z = 0; z < zaps.length; z++) { zaps[z].style.display = ""; }
    }

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
      var ok = completo();
      previa.textContent = (valor("nome") || valor("necessidade") || valor("contato"))
        ? montaMensagem()
        : "Preencha os campos acima e a mensagem aparece aqui.";

      if (ok) {
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
            "?subject=" + encodeURIComponent("Orçamento - " + valor("area")) +
            "&body=" + encodeURIComponent(montaMensagem()));
        }
        botaoML.setAttribute("href", "mailto:" + CONTATO.email +
          "?subject=" + encodeURIComponent("Orçamento - " + valor("area")) +
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

    for (var k2 in campos) {
      if (!campos[k2]) continue;
      campos[k2].addEventListener("input", atualiza);
      campos[k2].addEventListener("change", atualiza);
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    atualiza();
  });
})();
