/* =============================================================================
   OS LINKS DA KIWIFY — É AQUI QUE VOCÊ MEXE, E SÓ AQUI.

   Depois de criar cada produto na Kiwify, copie o link de CHECKOUT dele
   (o que começa com https://pay.kiwify.com.br/...) e cole no lugar do texto
   "COLE-AQUI". O site inteiro passa a apontar para ele — catálogo e página
   do produto, tudo de uma vez.

   Enquanto o link estiver como "COLE-AQUI", o botão daquele produto aparece
   cinza escrito "Em breve" e não deixa ninguém clicar. Assim você nunca
   publica um botão quebrado.

   O preço é só texto: escreva do jeito que quer que apareça na tela.
   ============================================================================= */

var PRODUTOS = {

  mat1: {
    checkout: "https://pay.kiwify.com.br/BRUOjDP",
    preco: "34,90"
  },

  mat2: {
    checkout: "COLE-AQUI",
    preco: "34,90"
  },

  mat3: {
    checkout: "COLE-AQUI",
    preco: "34,90"
  },

  combo: {
    checkout: "COLE-AQUI",
    preco: "79,90"
  },

  planilha: {
    checkout: "https://pay.kiwify.com.br/tKkVv1A",
    preco: "29,90"
  },

  niosh: {
    checkout: "https://pay.kiwify.com.br/BFF2tJd",
    preco: "59,90"
  }

};

/* ---------------------------------------------------------------------------
   Daqui para baixo é o que faz os botões funcionarem. Não precisa mexer.
   --------------------------------------------------------------------------- */
(function () {
  function pronto(v) {
    return v && v.indexOf("COLE-AQUI") === -1 && v.indexOf("http") === 0;
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
  });
})();
