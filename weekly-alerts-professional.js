(() => {
  "use strict";

  if (window.__KINECHECK_WEEKLY_TITLE_FIX_V2__) return;
  window.__KINECHECK_WEEKLY_TITLE_FIX_V2__ = true;

  const STYLE_ID = "weekly-alerts-professional-styles-v2";

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      html body #root #app .weekly-evidence-head h1 {
        color: #071a33 !important;
        font-size: clamp(2.25rem, 4vw, 3.65rem) !important;
        line-height: 1.03 !important;
        letter-spacing: -0.045em !important;
        font-weight: 900 !important;
      }

      html body #root #app .weekly-card {
        position: relative !important;
        overflow: hidden !important;
        padding: clamp(1.15rem, 2vw, 1.65rem) !important;
        border: 1px solid rgba(112, 198, 231, 0.26) !important;
        border-radius: 22px !important;
        background: linear-gradient(160deg, #0b2d43 0%, #092234 100%) !important;
        box-shadow: 0 20px 46px rgba(0, 12, 24, 0.28) !important;
      }

      html body #root #app .weekly-card::before {
        content: "" !important;
        position: absolute !important;
        inset: 0 auto 0 0 !important;
        width: 5px !important;
        background: linear-gradient(180deg, #38e0c6, #68a9ff) !important;
      }

      html body #root #app .weekly-card .weekly-card-top,
      html body #root #app .weekly-card .weekly-card-top > div {
        width: 100% !important;
      }

      html body #root #app .weekly-card .weekly-card-top > div {
        box-sizing: border-box !important;
        margin-bottom: 0.85rem !important;
        padding: 1rem 1.15rem 1.1rem !important;
        border: 1px solid rgba(120, 211, 239, 0.2) !important;
        border-radius: 18px !important;
        background: linear-gradient(145deg, rgba(4, 22, 35, 0.96), rgba(13, 50, 70, 0.93)) !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 28px rgba(0,0,0,0.15) !important;
      }

      html body #root #app .weekly-card .weekly-card-top h2 {
        display: block !important;
        max-width: 1080px !important;
        margin: 0.85rem 0 0.7rem !important;
        padding: 0 !important;
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
        opacity: 1 !important;
        filter: none !important;
        font-size: clamp(2rem, 3.3vw, 3.05rem) !important;
        line-height: 1.05 !important;
        letter-spacing: -0.04em !important;
        font-weight: 900 !important;
        text-wrap: balance !important;
        text-shadow: 0 3px 18px rgba(0,0,0,0.48) !important;
      }

      html body #root #app .weekly-card .weekly-reference {
        max-width: 1120px !important;
        margin: 0.25rem 0 0 !important;
        padding: 0.8rem 0.95rem !important;
        border-left: 3px solid #63bdf2 !important;
        border-radius: 0 12px 12px 0 !important;
        background: rgba(2, 15, 25, 0.5) !important;
        color: #d8e8f2 !important;
        -webkit-text-fill-color: #d8e8f2 !important;
        font-size: 0.98rem !important;
        line-height: 1.62 !important;
      }

      html body #root #app .weekly-card .weekly-chip {
        color: #e1f0f7 !important;
        -webkit-text-fill-color: #e1f0f7 !important;
        background: rgba(4, 22, 35, 0.48) !important;
      }

      html body #root #app .weekly-card .weekly-chip.verified {
        color: #77f2da !important;
        -webkit-text-fill-color: #77f2da !important;
        border-color: rgba(69, 224, 202, 0.55) !important;
        background: rgba(43, 187, 164, 0.12) !important;
      }

      html body #root #app .weekly-card .weekly-field {
        border: 1px solid rgba(131, 188, 216, 0.14) !important;
        background: rgba(255, 255, 255, 0.055) !important;
      }

      html body #root #app .weekly-card .weekly-field strong,
      html body #root #app .weekly-card .weekly-implication strong {
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
        opacity: 1 !important;
        font-weight: 850 !important;
      }

      html body #root #app .weekly-card .weekly-field p,
      html body #root #app .weekly-card .weekly-implication p {
        color: #e0edf3 !important;
        -webkit-text-fill-color: #e0edf3 !important;
        opacity: 1 !important;
        line-height: 1.66 !important;
      }

      html body #root #app .weekly-card .weekly-implication {
        border: 1px solid rgba(63, 221, 194, 0.38) !important;
        background: linear-gradient(145deg, rgba(22, 117, 108, 0.34), rgba(8, 49, 52, 0.54)) !important;
      }

      html body #root #app .weekly-card .weekly-implication.teaching {
        border-color: rgba(91, 166, 255, 0.4) !important;
        background: linear-gradient(145deg, rgba(42, 91, 159, 0.35), rgba(14, 41, 76, 0.56)) !important;
      }

      html body #root #app .weekly-actions button {
        color: #f3fbff !important;
        -webkit-text-fill-color: #f3fbff !important;
      }

      html body #root #app .weekly-source-link {
        color: #032334 !important;
        -webkit-text-fill-color: #032334 !important;
        background: linear-gradient(100deg, #35d4bd, #64a7ff) !important;
        font-weight: 850 !important;
      }

      @media (max-width: 820px) {
        html body #root #app .weekly-card .weekly-card-top h2 {
          font-size: clamp(1.75rem, 8vw, 2.35rem) !important;
        }

        html body #root #app .weekly-card .weekly-card-top > div {
          padding: 0.9rem !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function forceReadableElements(root = document) {
    root.querySelectorAll?.(".weekly-card .weekly-card-top h2").forEach((title) => {
      title.style.setProperty("color", "#ffffff", "important");
      title.style.setProperty("-webkit-text-fill-color", "#ffffff", "important");
      title.style.setProperty("opacity", "1", "important");
      title.style.setProperty("font-weight", "900", "important");
      title.style.setProperty("text-shadow", "0 3px 18px rgba(0,0,0,.48)", "important");
    });

    root.querySelectorAll?.(".weekly-implication strong, .weekly-implication p").forEach((element) => {
      element.style.setProperty("color", element.matches("strong") ? "#ffffff" : "#e0edf3", "important");
      element.style.setProperty("-webkit-text-fill-color", element.matches("strong") ? "#ffffff" : "#e0edf3", "important");
      element.style.setProperty("opacity", "1", "important");
    });
  }

  function initialize() {
    installStyles();
    forceReadableElements();

    const app = document.getElementById("app");
    if (!app) return;

    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) forceReadableElements(node);
        });
      }
      forceReadableElements(app);
    }).observe(app, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
