// GA4, loaded only when scripts/build-site.mjs has a GA4_ID (the ID comes in data-ga). Also counts clicks
// on the Google Play links and the "open the app" links, so installs and web sign-ups can be traced to a page.
(function () {
  "use strict";
  var me = document.currentScript;
  var id = me && me.getAttribute("data-ga");
  if (!id) return;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", id);
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    if (a.hostname === "play.google.com") {
      gtag("event", "play_store_click", { link_url: a.href, page_path: location.pathname, transport_type: "beacon" });
    } else if (a.hostname === location.hostname && /^\/app(\/|$)/.test(a.pathname)) {
      gtag("event", "open_app_click", { page_path: location.pathname, transport_type: "beacon" });
    }
  });
})();
