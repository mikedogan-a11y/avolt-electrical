/* Calculator Hub — depends on mmd-core.js. Injects chrome + shared disclaimers. */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    MMD.renderPreviewChrome({ hubHref: "index.html" });
    MMD.renderTopDisclaimer(document.querySelector("[data-mmd-top]"));
    MMD.renderBottomDisclaimers(document.querySelector("[data-mmd-bottom]"), {
      calcName: "Calculator Hub",
      assumptions: [
        "Each calculator uses indicative rates and assumptions that can change — see the individual tool for details."
      ],
      warnings: [
        "These tools provide general information only and are not a substitute for personal credit advice."
      ]
    });
  });
})();
