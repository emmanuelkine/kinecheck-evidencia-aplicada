(()=>{
  const C=window.KINECHECK_CONFIG;
  let session=null;
  let timer=null;
  const localKey='kce_learning_v3';

  function defaultState(){return {schemaVersion:3,profile:null,activities:{},notes:{},bookmarks:[],lastLocation:null,updatedAt:null}}
  function readLocal(){try{return {...defaultState(),...JSON.parse(localStorage.getItem(localKey)||'{}')}}catch{return defaultState()}}
  function headers(){return {apikey:C.supabaseAnonKey,Authorization:`Bearer ${session?.access_token||''}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'}}
  async function timedFetch(url,options={},timeout=4500){const controller=new AbortController();const id=setTimeout(()=>controller.abort(),timeout);try{return await fetch(url,{...options,signal:controller.signal})}finally{clearTimeout(id)}}
  function mergeState(local,remote){if(!remote)return local;return {...defaultState(),...local,...remote,activities:{...(local.activities||{}),...(remote.activities||{})},notes:{...(local.notes||{}),...(remote.notes||{})},bookmarks:Array.from(new Set([...(local.bookmarks||[]),...(remote.bookmarks||[])])),profile:remote.profile||local.profile||null}}
  async function load(){
    const local=readLocal();
    if(!session?.user?.id)return local;
    try{
      const url=`${C.supabaseUrl}/rest/v1/${C.progressTable}?user_id=eq.${session.user.id}&course_slug=eq.${C.courseSlug}&select=state,profile,updated_at`;
      const r=await timedFetch(url,{headers:headers()},4500);
      if(!r.ok)return local;
      const rows=await r.json();
      if(rows[0]){
        const remote={...(rows[0].state||{}),profile:rows[0].profile||rows[0].state?.profile||null,updatedAt:rows[0].updated_at};
        const merged=mergeState(local,remote);
        localStorage.setItem(localKey,JSON.stringify(merged));
        return merged;
      }
    }catch{}
    return local;
  }
  function push(state){
    state.updatedAt=new Date().toISOString();
    localStorage.setItem(localKey,JSON.stringify(state));
    if(!session?.user?.id)return Promise.resolve();
    clearTimeout(timer);
    timer=setTimeout(async()=>{
      const status=document.getElementById('sync-status');
      if(status)status.textContent='Guardando…';
      try{
        const body={user_id:session.user.id,course_slug:C.courseSlug,profile:state.profile||'student',state,updated_at:new Date().toISOString()};
        const url=`${C.supabaseUrl}/rest/v1/${C.progressTable}?on_conflict=user_id,course_slug`;
        const r=await timedFetch(url,{method:'POST',headers:headers(),body:JSON.stringify(body)},6000);
        if(!r.ok)throw new Error('sync');
        if(status)status.textContent='Guardado en la nube';
      }catch{if(status)status.textContent='Guardado localmente'}
    },350);
    return Promise.resolve();
  }
  window.KineCheckProgress={setSession(s){session=s},load,push,readLocal,defaultState};
})();