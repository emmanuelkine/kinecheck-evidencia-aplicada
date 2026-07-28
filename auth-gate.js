const C=window.KINECHECK_CONFIG||{};
const SESSION_KEY='kinecheck_secure_session_v1';
const $=s=>document.querySelector(s);
const shell=$('#access-shell'),profileShell=$('#profile-shell'),root=$('#root'),form=$('#auth-form'),email=$('#email'),password=$('#password'),msg=$('#auth-message'),busy=$('#access-progress'),loginTab=$('#login-tab'),signupTab=$('#signup-tab'),submit=$('#auth-submit');
let mode='login';
function headers(token){const h={apikey:C.supabaseAnonKey,'Content-Type':'application/json'};if(token)h.Authorization=`Bearer ${token}`;return h}
async function fetchWithTimeout(url,options={},timeout=15000){const controller=new AbortController();const id=setTimeout(()=>controller.abort(),timeout);try{return await fetch(url,{...options,signal:controller.signal})}catch(error){if(error.name==='AbortError')throw new Error('La conexión tardó demasiado. Intenta nuevamente.');throw error}finally{clearTimeout(id)}}
async function api(path,opt={}){const r=await fetchWithTimeout(`${C.supabaseUrl}${path}`,{...opt,headers:{...headers(opt.token),...(opt.headers||{})}},15000);const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.message||d.error_description||d.msg||d.error||'Solicitud rechazada');e.status=r.status;throw e}return d}
function saveSession(s){s.expires_at=s.expires_at||Math.floor(Date.now()/1000)+Number(s.expires_in||3600);localStorage.setItem(SESSION_KEY,JSON.stringify(s))}
function readSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
async function validSession(){let s=readSession();if(!s)return null;if(Number(s.expires_at||0)<=Math.floor(Date.now()/1000)+60){try{s=await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:s.refresh_token})});saveSession(s)}catch{localStorage.removeItem(SESSION_KEY);return null}}return s}
function show(text,error=false){msg.textContent=text;msg.className=error?'notice notice-error':'notice';msg.hidden=false}
function setBusy(v,text='Verificando tu acceso…'){form.hidden=v;busy.hidden=!v;const p=busy.querySelector('p');if(p)p.textContent=text}
async function invokeFunction(name,s,body={}){const r=await fetchWithTimeout(`${C.supabaseUrl}/functions/v1/${name}`,{method:'POST',headers:headers(s.access_token),body:JSON.stringify(body)},15000);const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.message||'No fue posible completar la solicitud.');e.status=r.status;throw e}return d}
async function validateAccess(s){setBusy(true,'Validando tu licencia de KineCheck…');return invokeFunction(C.accessFunction,s,{courseSlug:C.courseSlug,validateOnly:true})}
async function loadProtectedContent(s){setBusy(true,'Descargando el contenido protegido…');const data=await invokeFunction(C.contentFunction,s,{courseSlug:C.courseSlug});if(!data?.course?.modules?.length)throw new Error('El contenido protegido aún no fue publicado en Supabase.');return data}
function openCourse(s,state,content){shell.hidden=true;profileShell.hidden=true;root.hidden=false;window.KineCheckCourse.start(s,state,content)}
async function launch(s){
  setBusy(true,'Validando acceso en KineCheck Academy…');
  try{
    await validateAccess(s);
    const content=await loadProtectedContent(s);
    setBusy(true,'Cargando tu progreso y perfil…');
    window.KineCheckProgress.setSession(s);
    let state=window.KineCheckProgress.readLocal?window.KineCheckProgress.readLocal():window.KineCheckProgress.defaultState();
    try{state=await window.KineCheckProgress.load()}catch{}
    shell.hidden=true;
    if(!state.profile){
      profileShell.hidden=false;
      document.querySelectorAll('.profile-option').forEach(b=>b.onclick=()=>{state.profile=b.dataset.profile;window.KineCheckProgress.push(state);openCourse(s,state,content)})
    }else openCourse(s,state,content);
  }catch(e){setBusy(false);if(e.status===401)localStorage.removeItem(SESSION_KEY);show(`${e.message} Si necesitas ayuda, escribe a ${C.supportEmail}.`,true)}
}
function setMode(next){mode=next;loginTab.classList.toggle('active',mode==='login');signupTab.classList.toggle('active',mode==='signup');submit.textContent=mode==='login'?'Ingresar al curso':'Crear mi cuenta';password.autocomplete=mode==='login'?'current-password':'new-password';msg.hidden=true}
loginTab.onclick=()=>setMode('login');signupTab.onclick=()=>setMode('signup');
form.onsubmit=async e=>{e.preventDefault();msg.hidden=true;const em=email.value.trim().toLowerCase(),pw=password.value;if(!em||pw.length<8)return show('Ingresa un correo válido y una contraseña de al menos 8 caracteres.',true);try{setBusy(true,mode==='login'?'Iniciando sesión…':'Creando tu cuenta…');const s=mode==='login'?await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:em,password:pw})}):await api('/auth/v1/signup',{method:'POST',body:JSON.stringify({email:em,password:pw})});if(!s.access_token){setBusy(false);setMode('login');return show('Cuenta creada. Revisa tu correo y confirma la dirección antes de ingresar.')}saveSession(s);await launch(s)}catch(e){setBusy(false);show(e.message,true)}};
$('#sign-out').onclick=()=>{localStorage.removeItem(SESSION_KEY);location.reload()};
(async()=>{const s=await validSession();if(s)await launch(s)})();