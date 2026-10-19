/*
 * Widget MENAO pour les partenaires (ADR 0138). À coller sur le site du partenaire :
 *   <div data-menao-widget data-partenaire="CODE"></div>
 *   <script src="https://menao.fr/widget.js" async></script>
 * Crée l'iframe du widget et ajuste sa hauteur. Aucun cookie, aucun traceur, aucune donnée lue
 * sur la page du partenaire.
 */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script) return;
  var origin = new URL(script.src).origin;
  var TITLE = "MENAO : trouver un artisan du bâtiment vérifié";
  var CODE = /^[a-z0-9-]{3,32}$/;
  var frames = [];

  function mount() {
    var hosts = document.querySelectorAll("[data-menao-widget]");
    for (var i = 0; i < hosts.length; i++) {
      var host = hosts[i];
      if (host.getAttribute("data-menao-ready")) continue;
      host.setAttribute("data-menao-ready", "1");
      var params = new URLSearchParams();
      var code = (host.getAttribute("data-partenaire") || "").trim().toLowerCase();
      var trade = (host.getAttribute("data-metier") || "").trim().toLowerCase();
      if (CODE.test(code)) params.set("p", code);
      if (/^[a-z0-9-]{2,40}$/.test(trade)) params.set("metier", trade);
      var frame = document.createElement("iframe");
      frame.src = origin + "/widget?" + params.toString();
      frame.title = TITLE;
      frame.loading = "lazy";
      frame.style.cssText = "display:block;width:100%;max-width:480px;height:460px;border:0;";
      host.appendChild(frame);
      frames.push(frame);
    }
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== origin) return;
    var data = event.data;
    if (!data || data.type !== "menao:widget-height" || typeof data.height !== "number") return;
    var height = Math.min(2000, Math.max(200, Math.ceil(data.height)));
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === event.source) frames[i].style.height = height + "px";
    }
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
