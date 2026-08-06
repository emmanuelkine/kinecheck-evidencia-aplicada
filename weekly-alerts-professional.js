(() => {
  "use strict";

  if (window.__KINECHECK_WEEKLY_PROFESSIONAL_STYLE__) return;
  window.__KINECHECK_WEEKLY_PROFESSIONAL_STYLE__ = true;

  function installProfessionalStyles() {
    if (document.getElementById("weekly-alerts-professional-styles")) return;

    const style = document.createElement("style");
    style.id = "weekly-alerts-professional-styles";
    style.textContent = `
      .weekly-evidence-head {
        gap: 1.15rem;
        margin-bottom: 1.5rem;
      }

      .weekly-evidence-head > div:first-child {
        padding: 1.25rem 1.35rem;
        border: 1px solid rgba(74, 222, 200, 0.18);
        border-radius: 20px;
        background:
          radial-gradient(circle at 94% 10%, rgba(72, 190, 255, 0.13), transparent 31%),
          linear-gradient(145deg, rgba(11, 43, 63, 0.98), rgba(8, 31, 49, 0.96));
        box-shadow: 0 18px 45px rgba(0, 16, 29, 0.18);
      }

      .weekly-evidence-head h1 {
        margin: 0.75rem 0 0.55rem;
        color: #f8fcff !important;
        font-size: clamp(2rem, 3.6vw, 3.35rem);
        line-height: 1.04;
        letter-spacing: -0.035em;
        font-weight: 850;
        text-wrap: balance;
      }

      .weekly-evidence-head > div:first-child > p {
        max-width: 920px;
        margin: 0;
        color: #c9dbe7 !important;
        font-size: clamp(1rem, 1.45vw, 1.18rem);
        line-height: 1.65;
      }

      .weekly-editorial-note {
        color: #dcebf2 !important;
        background: linear-gradient(135deg, rgba(47, 207, 179, 0.11), rgba(43, 125, 176, 0.08));
        border-color: rgba(78, 220, 195, 0.3);
        box-shadow: inset 3px 0 0 #3edbc0;
      }

      .weekly-editorial-note strong {
        color: #f5fffd !important;
      }

      .weekly-card {
        position: relative;
        overflow: hidden;
        padding: clamp(1.15rem, 2vw, 1.65rem);
        border: 1px solid rgba(125, 191, 220, 0.23);
        border-radius: 22px;
        background:
          radial-gradient(circle at 100% 0%, rgba(52, 177, 220, 0.11), transparent 30%),
          linear-gradient(160deg, rgba(12, 43, 62, 0.99), rgba(10, 32, 49, 0.98));
        box-shadow: 0 18px 42px rgba(0, 14, 27, 0.22);
      }

      .weekly-card::before {
        content: "";
        position: absolute;
        inset: 0 auto 0 0;
        width: 4px;
        background: linear-gradient(180deg, #45e0ca, #5fa8ff);
      }

      .weekly-card.is-read {
        opacity: 0.9;
      }

      .weekly-card-top,
      .weekly-card-top > div {
        width: 100%;
      }

      .weekly-card h2 {
        max-width: 1050px;
        margin: 0.8rem 0 0.65rem;
        color: #ffffff !important;
        font-size: clamp(1.65rem, 2.55vw, 2.45rem);
        line-height: 1.12;
        letter-spacing: -0.025em;
        font-weight: 850;
        text-wrap: balance;
        text-shadow: 0 2px 18px rgba(0, 0, 0, 0.2);
      }

      .weekly-reference {
        max-width: 1120px;
        margin: 0.3rem 0 1rem;
        padding: 0.8rem 1rem;
        border-left: 3px solid rgba(91, 192, 255, 0.58);
        border-radius: 0 12px 12px 0;
        background: rgba(5, 24, 38, 0.42);
        color: #c5d8e5 !important;
        font-size: 0.97rem;
        line-height: 1.62;
      }

      .weekly-chip-row {
        gap: 0.5rem;
        margin: 0.7rem 0;
      }

      .weekly-chip {
        min-height: 30px;
        padding: 0.34rem 0.68rem;
        border-color: rgba(137, 190, 216, 0.3);
        background: rgba(6, 27, 42, 0.38);
        color: #dcebf3 !important;
        font-size: 0.78rem;
        font-weight: 620;
      }

      .weekly-chip.verified {
        border-color: rgba(69, 224, 202, 0.5);
        background: rgba(43, 187, 164, 0.12);
        color: #72f0d8 !important;
      }

      .weekly-grid {
        gap: 0.9rem;
        margin: 1.15rem 0;
      }

      .weekly-field {
        min-height: 138px;
        padding: 1.05rem 1.1rem;
        border: 1px solid rgba(121, 174, 204, 0.13);
        border-radius: 16px;
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.025));
      }

      .weekly-field strong {
        margin-bottom: 0.55rem;
        color: #ffffff !important;
        font-size: 1.02rem;
        letter-spacing: -0.01em;
      }

      .weekly-field p {
        color: #d5e3eb !important;
        font-size: 0.98rem;
        line-height: 1.66;
      }

      .weekly-implications {
        gap: 0.9rem;
      }

      .weekly-implication {
        min-height: 174px;
        padding: 1.15rem 1.2rem;
        border: 1px solid rgba(63, 221, 194, 0.32);
        border-radius: 17px;
        background: linear-gradient(145deg, rgba(33, 161, 142, 0.15), rgba(14, 70, 69, 0.17));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
      }

      .weekly-implication.teaching {
        border-color: rgba(91, 166, 255, 0.32);
        background: linear-gradient(145deg, rgba(62, 120, 211, 0.15), rgba(24, 58, 104, 0.19));
      }

      .weekly-implication strong {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.62rem;
        color: #ffffff !important;
        font-size: 1.08rem;
        font-weight: 800;
      }

      .weekly-implication strong::before {
        content: "C";
        display: inline-grid;
        place-items: center;
        width: 25px;
        height: 25px;
        border-radius: 8px;
        background: rgba(68, 225, 198, 0.17);
        color: #6ff0d8;
        font-size: 0.75rem;
      }

      .weekly-implication.teaching strong::before {
        content: "D";
        background: rgba(89, 161, 255, 0.18);
        color: #8cc1ff;
      }

      .weekly-implication p {
        margin: 0;
        color: #dce9ef !important;
        font-size: 0.98rem;
        line-height: 1.68;
      }

      .weekly-actions {
        gap: 0.7rem;
        margin-top: 1.2rem;
        padding-top: 1rem;
        border-top: 1px solid rgba(139, 184, 208, 0.13);
      }

      .weekly-actions button,
      .weekly-source-link {
        min-height: 46px;
        padding: 0.72rem 1rem;
        border-radius: 12px;
        font-weight: 720;
        transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
      }

      .weekly-actions button {
        background: rgba(8, 30, 46, 0.48);
        color: #edf8fc !important;
      }

      .weekly-actions button:hover,
      .weekly-source-link:hover {
        transform: translateY(-1px);
      }

      .weekly-source-link {
        border-color: transparent;
        background: linear-gradient(100deg, #35d4bd, #5aa5ff);
        color: #041f2d !important;
        box-shadow: 0 8px 22px rgba(53, 196, 194, 0.18);
      }

      .weekly-watch,
      .weekly-watch h2,
      .weekly-watch strong,
      .weekly-watch p {
        color: #eef8fc !important;
      }

      @media (max-width: 820px) {
        .weekly-evidence-head > div:first-child {
          padding: 1.05rem;
        }

        .weekly-card {
          padding: 1.05rem;
          border-radius: 18px;
        }

        .weekly-field,
        .weekly-implication {
          min-height: auto;
        }

        .weekly-actions > * {
          width: 100%;
          justify-content: center;
          text-align: center;
        }
      }
    `;

    document.head.appendChild(style);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installProfessionalStyles, { once: true });
  } else {
    installProfessionalStyles();
  }
})();
