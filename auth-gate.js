const C=window.KINECHECK_CONFIG||{};
const SESSION_KEY='kinecheck_secure_session_v1';
const $=s=>document.querySelector(s);
const shell=$('#access-shell'),profileShell=$('#profile-shell'),root=$('#root'),form=$('#auth-form'),email=$('#email'),password=$('#password'),msg=$('#auth-message'),busy=$('#access-progress'),loginTab=$('#login-tab'),signupTab=$('#signup-tab'),submit=$('#auth-submit');
let mode='login';

function headers(token){const h={apikey:C.supabaseAnonKey,'Content-Type':'application/json'};if(token)h.Authorization=`Bearer ${token}`;return h}

async function fetchWithTimeout(url,options={},timeout=12000){
  const controller=new AbortController();
  const id=setTimeout(()=>controller.abort(),timeout);
  try{return await fetch(url,{...options,signal:controller.signal})}
  catch(error){if(error.name==='AbortError')throw new Error('La validación tardó demasiado. Intenta nuevamente.');throw error}
  finally{clearTimeout(id)}
}

async function api(path,opt={}){
  const r=await fetchWithTimeout(`${C.supabaseUrl}${path}`,{...opt,headers:{...headers(opt.token),...(opt.headers||{})}},12000);
  const d=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(d.message||d.error_description||d.msg||d.error||'Solicitud rechazada');e.status=r.status;throw e}
  return d
}
function saveSession(s){s.expires_at=s.expires_at||Math.floor(Date.now()/1000)+Number(s.expires_in||3600);localStorage.setItem(SESSION_KEY,JSON.stringify(s))}
function readSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
async function validSession(){let s=readSession();if(!s)return null;if(Number(s.expires_at||0)<=Math.floor(Date.now()/1000)+60){try{s=await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:s.refresh_token})});saveSession(s)}catch{localStorage.removeItem(SESSION_KEY);return null}}return s}
function show(text,error=false){msg.textContent=text;msg.className=error?'notice notice-error':'notice';msg.hidden=false}
function setBusy(v,text='Verificando tu acceso…'){form.hidden=v;busy.hidden=!v;const p=busy.querySelector('p');if(p)p.textContent=text}

async function validateAccess(s){
  setBusy(true,'Validando tu licencia de KineCheck…');
  const r=await fetchWithTimeout(`${C.supabaseUrl}/functions/v1/${C.courseKeyFunction}`,{method:'POST',headers:headers(s.access_token),body:JSON.stringify({courseSlug:C.courseSlug,validateOnly:true})},12000);
  const d=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(d.message||'No encontramos una compra activa asociada a este correo.');e.status=r.status;throw e}
  return d
}

async function launch(s){
  setBusy(true,'Validando acceso en KineCheck Academy…');
  try{
    await validateAccess(s);
    setBusy(true,'Cargando tu progreso y perfil…');
    window.KineCheckProgress.setSession(s);
    let state;
    try{state=await Promise.race([window.KineCheckProgress.load(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('progress_timeout')),8000))])}
    catch{state=JSON.parse(localStorage.getItem('kce_learning_v2')||'{"visited":{},"notes":{},"profile":null}')}
    shell.hidden=true;
    if(!state.profile){
      profileShell.hidden=false;
      document.querySelectorAll('.profile-option').forEach(b=>b.onclick=async()=>{
        state.profile=b.dataset.profile;
        await window.KineCheckProgress.push(state);
        profileShell.hidden=true;root.hidden=false;window.KineCheckCourse.start(s,state)
      })
    }else{root.hidden=false;window.KineCheckCourse.start(s,state)}
  }catch(e){
    setBusy(false);
    if(e.status===401)localStorage.removeItem(SESSION_KEY);
    show(`${e.message} Si necesitas ayuda, escribe a ${C.supportEmail}.`,true)
  }
}

function setMode(next){mode=next;loginTab.classList.toggle('active',mode==='login');signupTab.classList.toggle('active',mode==='signup');submit.textContent=mode==='login'?'Ingresar al curso':'Crear mi cuenta';password.autocomplete=mode==='login'?'current-password':'new-password';msg.hidden=true}
loginTab.onclick=()=>setMode('login');signupTab.onclick=()=>setMode('signup');
form.onsubmit=async e=>{e.preventDefault();msg.hidden=true;const em=email.value.trim().toLowerCase(),pw=password.value;if(!em||pw.length<8)return show('Ingresa un correo válido y una contraseña de al menos 8 caracteres.',true);try{setBusy(true,mode==='login'?'Iniciando sesión…':'Creando tu cuenta…');const s=mode==='login'?await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:em,password:pw})}):await api('/auth/v1/signup',{method:'POST',body:JSON.stringify({email:em,password:pw})});if(!s.access_token){setBusy(false);setMode('login');return show('Cuenta creada. Revisa tu correo y confirma la dirección antes de ingresar.')}saveSession(s);await launch(s)}catch(e){setBusy(false);show(e.message,true)}};
$('#sign-out').onclick=()=>{localStorage.removeItem(SESSION_KEY);location.reload()};
(async()=>{const s=await validSession();if(s)await launch(s)})();