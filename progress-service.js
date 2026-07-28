(()=>{
  const C=window.KINECHECK_CONFIG;
  let session=null;
  let timer=null;
  const localKey='kce_learning_v2';

  function defaultState(){return {visited:{},notes:{},profile:null}}
  function readLocal(){
    try{return {...defaultState(),...JSON.parse(localStorage.getItem(localKey)||'{}')}}
    catch{return defaultState()}
  }
  function headers(){return {apikey:C.supabaseAnonKey,Authorization:`Bearer ${session?.access_token||''}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'}}
  async function timedFetch(url,options={},timeout=4000){
    const controller=new AbortController();
    const id=setTimeout(()=>controller.abort(),timeout);
    try{return await fetch(url,{...options,signal:controller.signal})}
    finally{clearTimeout(id)}
  }
  async function load(){
    const local=readLocal();
    if(!session?.user?.id)return local;
    try{
      const url=`${C.supabaseUrl}/rest/v1/${C.progressTable}?user_id=eq.${session.user.id}&course_slug=eq.${C.courseSlug}&select=state,profile`;
      const r=await timedFetch(url,{headers:headers()},4000);
      if(!r.ok)return local;
      const rows=await r.json();
      if(rows[0]){
        const remote={...defaultState(),...(rows[0].state||{}),profile:rows[0].profile||rows[0].state?.profile||null};
        localStorage.setItem(localKey,JSON.stringify(remote));
        return remote;
      }
    }catch{}
    return local;
  }
  function push(state){
    localStorage.setItem(localKey,JSON.stringify(state));
    if(!session?.user?.id)return Promise.resolve();
    clearTimeout(timer);
    timer=setTimeout(async()=>{
      const status=document.getElementById('sync-status');
      if(status)status.textContent='Guardando…';
      try{
        const body={user_id:session.user.id,course_slug:C.courseSlug,profile:state.profile||'student',state,updated_at:new Date().toISOString()};
        const url=`${C.supabaseUrl}/rest/v1/${C.progressTable}?on_conflict=user_id,course_slug`;
        const r=await timedFetch(url,{method:'POST',headers:headers(),body:JSON.stringify(body)},5000);
        if(!r.ok)throw new Error('sync');
        if(status)status.textContent='Guardado en la nube';
      }catch{if(status)status.textContent='Guardado localmente'}
    },300);
    return Promise.resolve();
  }
  window.KineCheckProgress={setSession(s){session=s},load,push,readLocal};
})();