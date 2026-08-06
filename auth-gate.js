const C = window.KINECHECK_CONFIG || {};
const EXPECTED_COURSE = "evidencia-aplicada";
const SESSION_KEY = "kinecheck_course_session_v2:evidencia-aplicada";
const LEGACY_SESSION_KEY = "kinecheck_course_session_v1:evidencia-aplicada";
const $ = (selector) => document.querySelector(selector);

const shell = $("#access-shell");
const profileShell = $("#profile-shell");
const root = $("#root");
const msg = $("#auth-message");
const busy = $("#access-progress");
const ecosystemEntry = $("#ecosystem-entry");
const ecosystemLink = ecosystemEntry?.querySelector(".ecosystem-entry-link");
const retryButton = ecosystemEntry?.querySelector(".ecosystem-retry");
const signOut = $("#sign-out");
let starting = false;

function configuredCorrectly() {
  return Boolean(C.supabaseUrl && C.supabaseAnonKey && C.contentFunction && C.courseSlug === EXPECTED_COURSE);
}

function headers(token) {
  const result = {
    apikey: C.supabaseAnonKey,
    "Content-Type": "application/json",
  };
  if (token) result.Authorization = `Bearer ${token}`;
  return result;
}

async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, cache: "no-store", signal: controller.signal });
  } catch (error) {
    const network = new Error(error?.name === "AbortError"
      ? "La conexión tardó demasiado. Intenta nuevamente."
      : "No pudimos conectar con KineCheck. Intenta nuevamente.");
    network.code = "NETWORK_ERROR";
    throw network;
  } finally {
    window.clearTimeout(timer);
  }
}

async function api(path, options = {}) {
  const response = await fetchWithTimeout(`${C.supabaseUrl}${path}`, {
    ...options,
    headers: { ...headers(options.token), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error_description || data.msg || data.error || "Solicitud rechazada");
    error.status = response.status;
    throw error;
  }
  return data;
}

function normalizeSession(value) {
  if (!value?.access_token) return null;
  const expiresAt = Number(value.expires_at || 0);
  if (expiresAt && expiresAt <= Math.floor(Date.now() / 1000) + 15) return null;
  if (value.product && value.product !== EXPECTED_COURSE) return null;
  return {
    access_token: String(value.access_token),
    expires_at: expiresAt || null,
    expires_in: Number(value.expires_in || 0) || null,
    token_type: value.token_type || "bearer",
    handoff_access_only: true,
    product: EXPECTED_COURSE,
  };
}

function readJson(storage, key) {
  try { return normalizeSession(JSON.parse(storage.getItem(key) || "null")); }
  catch { return null; }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch { /* limpieza de mejor esfuerzo */ }
}

function readSession() {
  return readJson(sessionStorage, SESSION_KEY) || readJson(localStorage, LEGACY_SESSION_KEY);
}

async function waitForSession(timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const session = readSession();
    if (session) return session;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}

async function validateIdentity(session) {
  const user = await api("/auth/v1/user", { method: "GET", token: session.access_token });
  return { ...session, user };
}

function show(text, error = false) {
  if (!msg) return;
  msg.textContent = text;
  msg.className = error ? "notice notice-error" : "notice";
  msg.hidden = false;
}

function setBusy(value, text = "Validando tu licencia de Evidencia Aplicada…") {
  if (!busy) return;
  busy.hidden = !value;
  const paragraph = busy.querySelector("p");
  if (paragraph) paragraph.textContent = text;
}

function configureEntry({ copy, showLibrary = true, showRetry = false, retryText = "Reintentar acceso" } = {}) {
  if (!ecosystemEntry) return;
  const paragraph = ecosystemEntry.querySelector("p");
  if (paragraph && copy) paragraph.textContent = copy;
  ecosystemEntry.hidden = false;
  if (ecosystemLink) {
    ecosystemLink.hidden = !showLibrary;
    ecosystemLink.textContent = "Volver a mi biblioteca";
    ecosystemLink.href = "https://kinecheck.cl/academy/#biblioteca";
  }
  if (retryButton) {
    retryButton.hidden = !showRetry;
    retryButton.textContent = retryText;
  }
}

function showEntry(text = "Abre este curso desde tu biblioteca KineCheck.") {
  setBusy(false);
  configureEntry({ copy: text, showLibrary: true, showRetry: false });
  if (shell) shell.hidden = false;
  if (profileShell) profileShell.hidden = true;
  if (root) root.hidden = true;
}

async function invokeFunction(name, session, body = {}) {
  const response = await fetchWithTimeout(`${C.supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: headers(session.access_token),
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "No fue posible completar la solicitud.");
    error.status = response.status;
    throw error;
  }
  return data;
}

async function loadProtectedContent(session) {
  setBusy(true);
  const data = await invokeFunction(C.contentFunction, session, { courseSlug: EXPECTED_COURSE });
  if (!data?.course?.modules?.length) throw new Error("El contenido protegido aún no fue publicado en Supabase.");
  if (data?.access?.courseSlug && data.access.courseSlug !== EXPECTED_COURSE) {
    const error = new Error("La autorización recibida no corresponde a Evidencia Aplicada.");
    error.status = 403;
    throw error;
  }
  return data;
}

function openCourse(session, state, content) {
  shell.hidden = true;
  profileShell.hidden = true;
  root.hidden = false;
  window.KineCheckCourse.start(session, state, content);
}

async function launch(session) {
  const content = await loadProtectedContent(session);
  if (!window.KineCheckWatermark) throw new Error("No fue posible activar la protección de uso personal.");
  await window.KineCheckWatermark.showVerifiedBuyer({ user: session.user, licenseScopes: [EXPECTED_COURSE] });
  setBusy(true, "Cargando tu progreso y perfil…");
  window.KineCheckProgress.setSession(session);
  let state = window.KineCheckProgress.readLocal
    ? window.KineCheckProgress.readLocal()
    : window.KineCheckProgress.defaultState();
  try { state = await window.KineCheckProgress.load(); } catch { /* progreso local disponible */ }
  shell.hidden = true;
  if (!state.profile) {
    profileShell.hidden = false;
    document.querySelectorAll(".profile-option").forEach((button) => {
      button.onclick = () => {
        state.profile = button.dataset.profile;
        window.KineCheckProgress.push(state);
        openCourse(session, state, content);
      };
    });
  } else {
    openCourse(session, state, content);
  }
}

async function start() {
  if (starting) return;
  starting = true;
  if (msg) msg.hidden = true;
  if (ecosystemEntry) ecosystemEntry.hidden = true;
  setBusy(true, "Recibiendo tu acceso desde KineCheck…");

  try {
    if (!configuredCorrectly()) throw new Error("La configuración de acceso no coincide con Evidencia Aplicada.");
    const raw = readSession() || await waitForSession();
    if (!raw) {
      showEntry("No recibimos una sesión desde la biblioteca. Vuelve a Biblioteca y abre nuevamente este curso.");
      return;
    }
    const session = await validateIdentity(raw);
    await launch(session);
  } catch (error) {
    window.KineCheckWatermark?.hide();
    setBusy(false);

    if (error.code === "NETWORK_ERROR") {
      show(error.message, true);
      configureEntry({
        copy: "Tu sesión sigue guardada. Reintenta aquí sin volver a ingresar ni salir de esta pantalla.",
        showLibrary: true,
        showRetry: true,
        retryText: "Reintentar acceso",
      });
      return;
    }

    if (error.status === 403) {
      show(`${error.message} Esta cuenta no tiene acceso a este producto.`, true);
      configureEntry({ copy: "Vuelve a tu biblioteca para abrir únicamente tus productos activos.", showLibrary: true, showRetry: false });
      return;
    }

    if (error.status === 401) clearSession();
    show(error.message || "No fue posible abrir el curso.", true);
    configureEntry({
      copy: error.status === 401
        ? "La sesión terminó. Vuelve a KineCheck e inicia sesión nuevamente una sola vez."
        : "Reintenta aquí o vuelve a tu biblioteca.",
      showLibrary: true,
      showRetry: error.status !== 401,
    });
  } finally {
    starting = false;
  }
}

retryButton?.addEventListener("click", (event) => {
  event.preventDefault();
  start();
});

signOut?.addEventListener("click", () => {
  window.KineCheckWatermark?.hide();
  clearSession();
  location.replace("https://kinecheck.cl/academy/#biblioteca");
});

window.addEventListener("kinecheck:sso-received", () => start());
start();
