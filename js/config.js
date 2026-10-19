/* Ultra Connect — runtime config.
   Local / LAN previews talk to the same-origin API.
   A hosted static copy (e.g. Vercel) points at the Node API host, and the portal is
   always opened on that host so the session cookie stays first-party. */
(function () {
  "use strict";

  var NODE_HOST = "https://ultra-connect-portal.onrender.com";

  var host = (location.hostname || "").toLowerCase();
  var isVercelStatic = /\.vercel\.app$/.test(host) || /\.vercel\.app$/.test(host.replace(/^www\./, ""));

  window.UC_API_BASE = window.UC_API_BASE_OVERRIDE || (isVercelStatic ? NODE_HOST : "");
  window.UC_PORTAL_URL = (window.UC_API_BASE || "") + "/portal.html";

  function rewriteLinks() {
    if (!window.UC_API_BASE) return;
    var links = document.querySelectorAll('a[href*="portal.html"]');
    for (var i = 0; i < links.length; i++) {
      var hash = (links[i].getAttribute("href").split("#")[1]) || "";
      links[i].setAttribute("href", window.UC_PORTAL_URL + (hash ? "#" + hash : ""));
    }
  }

  if (window.UC_API_BASE && /portal\.html$/.test(location.pathname)) {
    location.replace(window.UC_PORTAL_URL + location.hash);
    return;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", rewriteLinks);
  else rewriteLinks();
})();
