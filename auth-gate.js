const C = window.KINECHECK_CONFIG || {};
const SESSION_KEY = "kinecheck_secure_session_v1";
const $ = (selector) => document.querySelector(selector);

const shell = $("#access-shell");
const profileShell = $("#profile-shell");
const root = $("#root");
const form = $("#auth-form");
const email = $("#email");
const password = $("#password");
const msg = $("#auth-message");
const busy = $("#access-progress");
const loginTab = $("#login-tab");
const signupTab = $("#signup-tab");
const submit = $("#auth-submit");

let mode = "login";

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
    return await fetch(url, { ...options, signal: controller.signal });
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

function saveSession(session) {
  session.expires_at = session.expires_at ||
    Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

async function validateIdentity(session) {
  const user = await api("/auth/v1/user", {
    method: "GET",
    token: session.access_token,
  });
  const verified = { ...session, user };
  saveSession(verified);
  return verified;
}

async function validSession() {
  let session = readSession();
  if (!session?.access_token) return null;

  try {
    if (Number(session.expires_at || 0) <= Math.floor(Date.now() / 1000) + 60) {
      session = await api("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      saveSession(session);
    }
    return await validateIdentity(session);
  } catch {
    try {
      session = await api("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      saveSession(session);
      return await validateIdentity(session);
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }
}

function show(text, error = false) {
  msg.textContent = text;
  msg.className = error ? "notice notice-error" : "notice";
  msg.hidden = false;
}

function setBusy(value, text = "Verificando tu acceso…") {
  form.hidden = value;
  busy.hidden = !value;
  const paragraph = busy.querySelector("p");
  if (paragraph) paragraph.textContent = text;
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
  setBusy(true, "Validando tu acceso y cargando el contenido protegido…");
  const data = await invokeFunction(C.contentFunction, session, {
    courseSlug: C.courseSlug,
  });
  if (!data?.course?.modules?.length) {
    throw new Error("El contenido protegido aún no fue publicado en Supabase.");
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
    // Una sola llamada valida la licencia central y entrega el contenido protegido.
    const content = await loadProtectedContent(session);
    if (!window.KineCheckWatermark) {
      throw new Error("No fue posible activar la protección de uso personal.");
    }
    await window.KineCheckWatermark.showVerifiedBuyer({
      user: session.user,
      licenseScopes: [C.courseSlug],
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
    setBusy(false);
    if (error.status === 401) localStorage.removeItem(SESSION_KEY);
    show(`${error.message} Si necesitas ayuda, escribe a ${C.supportEmail}.`, true);
  }
}

function setMode(next) {
  mode = next;
  loginTab.classList.toggle("active", mode === "login");
  signupTab.classList.toggle("active", mode === "signup");
  submit.textContent = mode === "login" ? "Ingresar al curso" : "Crear mi cuenta";
  password.autocomplete = mode === "login" ? "current-password" : "new-password";
  msg.hidden = true;
}

loginTab.onclick = () => setMode("login");
signupTab.onclick = () => setMode("signup");

form.onsubmit = async (event) => {
  event.preventDefault();
  msg.hidden = true;

  const normalizedEmail = email.value.trim().toLowerCase();
  const enteredPassword = password.value;
  if (!normalizedEmail || enteredPassword.length < 8) {
    show("Ingresa un correo válido y una contraseña de al menos 8 caracteres.", true);
    return;
  }

  try {
    setBusy(true, mode === "login" ? "Iniciando sesión…" : "Creando tu cuenta…");
    let session = mode === "login"
      ? await api("/auth/v1/token?grant_type=password", {
          method: "POST",
          body: JSON.stringify({ email: normalizedEmail, password: enteredPassword }),
        })
      : await api("/auth/v1/signup", {
          method: "POST",
          body: JSON.stringify({ email: normalizedEmail, password: enteredPassword }),
        });

    if (!session.access_token) {
      setBusy(false);
      setMode("login");
      show("Cuenta creada. Revisa tu correo y confirma la dirección antes de ingresar.");
      return;
    }

    saveSession(session);
    session = await validateIdentity(session);
    await launch(session);
  } catch (error) {
    setBusy(false);
    show(error.message, true);
  }
};

$("#sign-out").onclick = () => {
  window.KineCheckWatermark?.hide();
  localStorage.removeItem(SESSION_KEY);
  location.reload();
};

(async () => {
  const session = await validSession();
  if (session) await launch(session);
})();
