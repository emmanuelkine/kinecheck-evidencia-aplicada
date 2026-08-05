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
const signOut = $("#sign-out");

function configuredCorrectly() {
  return Boolean(
    C.supabaseUrl
    && C.supabaseAnonKey
    && C.contentFunction
    && C.courseSlug === EXPECTED_COURSE,
  );
}

function headers(token) {
  const result = {
    apikey: C.supabaseAnonKey,
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
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
    if (error?.name === "AbortError") {
      throw new Error("La conexión tardó demasiado. Intenta nuevamente.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function api(path, options = {}) {
  const response = await fetchWithTimeout(`${C.supabaseUrl}${path}`, {
    ...options,
    headers: {
      ...headers(options.token),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.message || data.error_description || data.msg || data.error || "Solicitud rechazada",
    );
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
  try {
    return normalizeSession(JSON.parse(storage.getItem(key) || "null"));
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // Limpieza de mejor esfuerzo.
  }
}

function readSession() {
  const current = readJson(sessionStorage, SESSION_KEY);
  if (current) return current;

  const legacy = readJson(localStorage, LEGACY_SESSION_KEY);
  if (!legacy) return null;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(legacy));
    localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // La sesión sigue disponible durante esta carga.
  }
  return legacy;
}

async function validateIdentity(session) {
  const user = await api("/auth/v1/user", {
    method: "GET",
    token: session.access_token,
  });
  return { ...session, user };
}

function show(text, error = false) {
  if (!msg) return;
  msg.textContent = text;
  msg.className = error ? "notice notice-error" : "notice";
  msg.hidden = false;
}

function setBusy(value, text = "Validando tu licencia de Evidencia Aplicada…") {
  if (busy) {
    busy.hidden = !value;
    const paragraph = busy.querySelector("p");
    if (paragraph) paragraph.textContent = text;
  }
}

function showEcosystemEntry(text = "Inicia sesión una sola vez en KineCheck y abre este curso desde tu biblioteca.") {
  setBusy(false);
  if (ecosystemEntry) {
    const copy = ecosystemEntry.querySelector("p");
    if (copy) copy.textContent = text;
    ecosystemEntry.hidden = false;
  }
  if (shell) shell.hidden = false;
  if (profileShell) profileShell.hidden = true;
  if (root) root.hidden = true;
}

async function invokeFunction(name, session, body = {}) {
  const response = await fetchWithTimeout(
    `${C.supabaseUrl}/functions/v1/${name}`,
    {
      method: "POST",
      headers: headers(session.access_token),
      body: JSON.stringify(body),
    },
    15000,
  );
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
  const data = await invokeFunction(C.contentFunction, session, {
    courseSlug: EXPECTED_COURSE,
  });
  if (!data?.course?.modules?.length) {
    throw new Error("El contenido protegido aún no fue publicado en Supabase.");
  }
  if (data?.access?.courseSlug && data.access.courseSlug !== EXPECTED_COURSE) {
    throw new Error("La autorización recibida no corresponde a Evidencia Aplicada.");
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
  try {
    const content = await loadProtectedContent(session);
    if (!window.KineCheckWatermark) {
      throw new Error("No fue posible activar la protección de uso personal.");
    }
    await window.KineCheckWatermark.showVerifiedBuyer({
      user: session.user,
      licenseScopes: [EXPECTED_COURSE],
    });

    setBusy(true, "Cargando tu progreso y perfil…");
    window.KineCheckProgress.setSession(session);
    let state = window.KineCheckProgress.readLocal
      ? window.KineCheckProgress.readLocal()
      : window.KineCheckProgress.defaultState();

    try {
      state = await window.KineCheckProgress.load();
    } catch {
      // El progreso local sigue disponible si la sincronización falla.
    }

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
  } catch (error) {
    window.KineCheckWatermark?.hide();
    clearSession();
    setBusy(false);
    const denied = error.status === 403;
    show(
      denied
        ? `${error.message} Solo se habilita el producto comprado por esta cuenta.`
        : `${error.message} Vuelve a KineCheck y abre el curso nuevamente.`,
      true,
    );
    showEcosystemEntry(
      denied
        ? "Esta cuenta no tiene una licencia activa de Evidencia Aplicada. Regresa a tu biblioteca para abrir únicamente tus productos disponibles."
        : "La sesión terminó. Regresa a KineCheck, inicia sesión una vez y vuelve a abrir el curso.",
    );
  }
}

signOut?.addEventListener("click", () => {
  window.KineCheckWatermark?.hide();
  clearSession();
  location.replace("https://kinecheck.cl/academy/#biblioteca");
});

(async () => {
  if (!configuredCorrectly()) {
    show("La configuración de acceso no coincide con Evidencia Aplicada.", true);
    showEcosystemEntry();
    return;
  }

  const rawSession = readSession();
  if (!rawSession) {
    showEcosystemEntry();
    return;
  }

  try {
    const session = await validateIdentity(rawSession);
    await launch(session);
  } catch (error) {
    clearSession();
    show(`${error.message} Regresa a KineCheck e inicia sesión nuevamente.`, true);
    showEcosystemEntry();
  }
})();
