(() => {
  const DATA_URL = "./weekly-alerts.json?v=20260731-1";
  const STORAGE_KEY = "kinecheck_weekly_evidence_state_v1";
  const NAV_ID = "weekly-alerts-nav";
  let dataset = null;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

  function readState() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        read: Array.isArray(value.read) ? value.read : [],
        favorites: Array.isArray(value.favorites) ? value.favorites : [],
      };
    } catch {
      return { read: [], favorites: [] };
    }
  }

  function writeState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateUnreadBadge();
  }

  function toggleState(collection, id) {
    const state = readState();
    const values = new Set(state[collection]);
    values.has(id) ? values.delete(id) : values.add(id);
    state[collection] = [...values];
    writeState(state);
  }

  function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value || "";
    return new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  }

  function injectStyles() {
    if (document.getElementById("weekly-alerts-styles")) return;
    const style = document.createElement("style");
    style.id = "weekly-alerts-styles";
    style.textContent = `
      #${NAV_ID}{position:relative}
      .weekly-nav-count{display:inline-grid;place-items:center;min-width:1.45rem;height:1.45rem;padding:0 .35rem;margin-left:auto;border-radius:999px;background:#22c7a9;color:#03241e;font-size:.72rem;font-weight:800}
      .weekly-evidence-head{display:grid;gap:1rem;margin-bottom:1.2rem}
      .weekly-evidence-head h1{margin-bottom:.35rem}
      .weekly-evidence-meta{display:flex;flex-wrap:wrap;gap:.55rem;align-items:center}
      .weekly-editorial-note{padding:1rem 1.1rem;border:1px solid rgba(47,207,179,.28);border-radius:16px;background:rgba(47,207,179,.08);line-height:1.6}
      .weekly-tools{display:grid;grid-template-columns:minmax(220px,1fr) repeat(2,minmax(150px,220px));gap:.75rem;margin:1rem 0 1.25rem}
      .weekly-tools input,.weekly-tools select{width:100%;border:1px solid rgba(140,174,194,.3);border-radius:12px;background:#102c40;color:#f3f8fb;padding:.8rem .9rem}
      .weekly-results{display:grid;gap:1rem}
      .weekly-card{border:1px solid rgba(140,174,194,.24);border-radius:18px;background:rgba(9,35,52,.92);padding:1.15rem;box-shadow:0 12px 32px rgba(0,0,0,.12)}
      .weekly-card.is-read{opacity:.82}
      .weekly-card-top{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}
      .weekly-card h2{font-size:1.22rem;margin:.65rem 0 .45rem;line-height:1.3}
      .weekly-reference{font-size:.9rem;line-height:1.55;color:#b9cbd6}
      .weekly-chip-row{display:flex;flex-wrap:wrap;gap:.4rem;margin:.6rem 0}
      .weekly-chip{display:inline-flex;align-items:center;border:1px solid rgba(140,174,194,.25);border-radius:999px;padding:.25rem .55rem;font-size:.75rem;color:#cfe0e9}
      .weekly-chip.verified{border-color:rgba(47,207,179,.45);color:#6ee7cd}
      .weekly-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem;margin:1rem 0}
      .weekly-field{padding:.85rem;border-radius:14px;background:rgba(255,255,255,.035)}
      .weekly-field strong{display:block;margin-bottom:.35rem;color:#f6fbfd}
      .weekly-field p{margin:0;line-height:1.55;color:#c8d7df}
      .weekly-implications{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem}
      .weekly-implication{padding:1rem;border-radius:14px;background:rgba(34,199,169,.075);border:1px solid rgba(34,199,169,.18)}
      .weekly-implication.teaching{background:rgba(77,151,255,.07);border-color:rgba(77,151,255,.18)}
      .weekly-implication strong{display:block;margin-bottom:.4rem}
      .weekly-implication p{margin:0;line-height:1.58}
      .weekly-actions{display:flex;flex-wrap:wrap;gap:.55rem;align-items:center;margin-top:1rem}
      .weekly-actions button,.weekly-source-link{border:1px solid rgba(140,174,194,.28);border-radius:10px;background:transparent;color:#edf7fb;padding:.65rem .8rem;text-decoration:none;cursor:pointer;font:inherit}
      .weekly-source-link{background:#1dbb9f;color:#052b25;border-color:#1dbb9f;font-weight:800}
      .weekly-actions button.is-active{border-color:#f0c969;color:#f0c969}
      .weekly-watch{margin-top:1.4rem;padding:1rem;border-radius:16px;border:1px solid rgba(240,201,105,.35);background:rgba(240,201,105,.08)}
      .weekly-watch h2{margin-top:0;font-size:1.1rem}
      .weekly-watch article+article{margin-top:.85rem;padding-top:.85rem;border-top:1px solid rgba(240,201,105,.2)}
      .weekly-empty{padding:1.25rem;border-radius:16px;background:rgba(255,255,255,.04)}
      @media(max-width:820px){.weekly-tools,.weekly-grid,.weekly-implications{grid-template-columns:1fr}.weekly-card-top{display:block}.weekly-card{padding:1rem}}
    `;
    document.head.appendChild(style);
  }

  async function loadDataset() {
    if (dataset) return dataset;
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("No fue posible cargar las alertas semanales.");
    dataset = await response.json();
    return dataset;
  }

  function markSidebarActive(button) {
    document.querySelectorAll(".sidebar button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  }

  function itemSearchText(item) {
    return [
      item.title,
      item.authors,
      item.citation,
      item.studyType,
      item.population,
      item.mainFinding,
      item.clinicalImplication,
      item.teachingImplication,
      ...(item.topics || []),
    ].join(" ").toLowerCase();
  }

  function alertCard(item, state) {
    const isRead = state.read.includes(item.id);
    const isFavorite = state.favorites.includes(item.id);
    return `
      <article class="weekly-card ${isRead ? "is-read" : ""}" data-alert-card="${escapeHtml(item.id)}">
        <div class="weekly-card-top">
          <div>
            <div class="weekly-chip-row">
              <span class="weekly-chip verified">${escapeHtml(item.status)}</span>
              <span class="weekly-chip">${escapeHtml(item.source)}</span>
              <span class="weekly-chip">Alerta ${escapeHtml(formatDate(item.alertDate))}</span>
              ${item.pedroScore ? `<span class="weekly-chip">PEDro ${escapeHtml(item.pedroScore)}</span>` : ""}
            </div>
            <h2>${escapeHtml(item.title)}</h2>
            <p class="weekly-reference">${escapeHtml(item.citation)}</p>
          </div>
        </div>
        <div class="weekly-chip-row">${(item.topics || []).map((topic) => `<span class="weekly-chip">${escapeHtml(topic)}</span>`).join("")}</div>
        <div class="weekly-grid">
          <div class="weekly-field"><strong>Tipo de estudio</strong><p>${escapeHtml(item.studyType)}</p></div>
          <div class="weekly-field"><strong>Población</strong><p>${escapeHtml(item.population)}</p></div>
          <div class="weekly-field"><strong>Hallazgo principal</strong><p>${escapeHtml(item.mainFinding)}</p></div>
          <div class="weekly-field"><strong>Calidad y limitaciones</strong><p>${escapeHtml(item.quality)}</p></div>
        </div>
        <div class="weekly-implications">
          <div class="weekly-implication"><strong>Implicación clínica</strong><p>${escapeHtml(item.clinicalImplication)}</p></div>
          <div class="weekly-implication teaching"><strong>Implicación docente</strong><p>${escapeHtml(item.teachingImplication)}</p></div>
        </div>
        <div class="weekly-actions">
          <a class="weekly-source-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Abrir fuente original</a>
          <button type="button" data-alert-action="read" data-alert-id="${escapeHtml(item.id)}">${isRead ? "Marcar como pendiente" : "Marcar como revisada"}</button>
          <button type="button" class="${isFavorite ? "is-active" : ""}" data-alert-action="favorite" data-alert-id="${escapeHtml(item.id)}">${isFavorite ? "Favorita ★" : "Guardar favorita"}</button>
        </div>
      </article>
    `;
  }

  function watchlistMarkup(items) {
    if (!items?.length) return "";
    return `
      <section class="weekly-watch">
        <h2>Vigilancia de guías clínicas</h2>
        ${items.map((item) => `
          <article>
            <div class="weekly-chip-row"><span class="weekly-chip">${escapeHtml(item.status)}</span><span class="weekly-chip">${escapeHtml(item.source)}</span></div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.message)}</p>
            <a class="weekly-source-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Revisar estado oficial</a>
          </article>
        `).join("")}
      </section>
    `;
  }

  function renderFiltered() {
    const results = document.getElementById("weekly-results");
    if (!results || !dataset) return;
    const query = document.getElementById("weekly-search")?.value.trim().toLowerCase() || "";
    const source = document.getElementById("weekly-source")?.value || "";
    const status = document.getElementById("weekly-status")?.value || "";
    const state = readState();
    const rows = (dataset.items || []).filter((item) => {
      const matchesQuery = !query || itemSearchText(item).includes(query);
      const matchesSource = !source || item.source === source;
      const matchesStatus = !status
        || (status === "unread" && !state.read.includes(item.id))
        || (status === "read" && state.read.includes(item.id))
        || (status === "favorite" && state.favorites.includes(item.id));
      return matchesQuery && matchesSource && matchesStatus;
    });
    results.innerHTML = rows.length
      ? rows.map((item) => alertCard(item, state)).join("")
      : '<div class="weekly-empty">No hay alertas que coincidan con estos filtros.</div>';
  }

  async function renderAlerts(button) {
    const app = document.getElementById("app");
    if (!app) return;
    markSidebarActive(button);
    app.innerHTML = '<div class="weekly-empty">Cargando alertas verificadas…</div>';
    try {
      await loadDataset();
      const sources = [...new Set((dataset.items || []).map((item) => item.source))];
      app.innerHTML = `
        <div class="weekly-evidence-head">
          <div>
            <span class="badge">ACTUALIZACIÓN CONTINUA</span>
            <h1>Alertas semanales de evidencia</h1>
            <p>PubMed, PEDro y vigilancia de guías clínicas, traducidos a decisiones clínicas y oportunidades docentes.</p>
          </div>
          <div class="weekly-evidence-meta">
            <span class="weekly-chip verified">${dataset.items.length} referencias verificadas</span>
            <span class="weekly-chip">Última revisión: ${escapeHtml(formatDate(dataset.lastReviewed))}</span>
            <span class="weekly-chip">Versión ${escapeHtml(dataset.version)}</span>
          </div>
          <div class="weekly-editorial-note"><strong>Criterio editorial:</strong> ${escapeHtml(dataset.editorialNote)}</div>
        </div>
        <section class="weekly-tools" aria-label="Filtros de alertas">
          <input id="weekly-search" type="search" placeholder="Buscar región, intervención o concepto">
          <select id="weekly-source"><option value="">Todas las fuentes</option>${sources.map((source) => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`).join("")}</select>
          <select id="weekly-status"><option value="">Todas las alertas</option><option value="unread">Pendientes</option><option value="read">Revisadas</option><option value="favorite">Favoritas</option></select>
        </section>
        <div id="weekly-results" class="weekly-results"></div>
        ${watchlistMarkup(dataset.watchlist)}
      `;
      ["weekly-search", "weekly-source", "weekly-status"].forEach((id) => {
        const control = document.getElementById(id);
        if (control) control.addEventListener("input", renderFiltered);
      });
      app.addEventListener("click", (event) => {
        const action = event.target.closest("[data-alert-action]");
        if (!action) return;
        const collection = action.dataset.alertAction === "favorite" ? "favorites" : "read";
        toggleState(collection, action.dataset.alertId);
        renderFiltered();
      });
      renderFiltered();
      document.getElementById("sidebar")?.classList.remove("mobile-open");
      const overlay = document.getElementById("nav-overlay");
      if (overlay) overlay.hidden = true;
    } catch (error) {
      app.innerHTML = `<div class="weekly-empty"><strong>No fue posible cargar las alertas.</strong><p>${escapeHtml(error.message)}</p></div>`;
    }
  }

  function updateUnreadBadge() {
    const button = document.getElementById(NAV_ID);
    if (!button || !dataset) return;
    const state = readState();
    const unread = (dataset.items || []).filter((item) => !state.read.includes(item.id)).length;
    let badge = button.querySelector(".weekly-nav-count");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "weekly-nav-count";
      button.appendChild(badge);
    }
    badge.textContent = String(unread);
    badge.hidden = unread === 0;
    button.setAttribute("aria-label", `Alertas semanales, ${unread} pendientes`);
  }

  async function installNavigation() {
    const root = document.getElementById("root");
    const sidebar = document.getElementById("sidebar");
    if (!root || root.hidden || !sidebar || document.getElementById(NAV_ID)) return;
    const libraryButton = sidebar.querySelector('[data-view="library"]');
    if (!libraryButton) return;
    const button = document.createElement("button");
    button.id = NAV_ID;
    button.type = "button";
    button.innerHTML = "<span>Alertas semanales</span>";
    button.addEventListener("click", () => renderAlerts(button));
    libraryButton.insertAdjacentElement("afterend", button);
    try {
      await loadDataset();
      updateUnreadBadge();
    } catch {
      button.title = "Las alertas no están disponibles temporalmente";
    }
  }

  function init() {
    injectStyles();
    installNavigation();
    const root = document.getElementById("root");
    if (!root) return;
    const observer = new MutationObserver(() => installNavigation());
    observer.observe(root, { attributes: true, attributeFilter: ["hidden"] });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
