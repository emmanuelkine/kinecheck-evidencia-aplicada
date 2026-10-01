window.KineCheckCourse=(()=>{
  let D={modules:[]},LIB=[],S={},app,nav,session;
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function librarySummary(item){
    const summary=String(item.summary||'').trim();
    return /^Recurso del lote\s*\d/i.test(summary)
      ? (item.clinicalUse||`Ficha temática para estudiar ${item.title}.`)
      : (summary||item.clinicalUse||`Ficha temática para estudiar ${item.title}.`);
  }
  function sourceLinks(item){
    const text=String(item.originalRelation||'')+' '+String(item.summary||'');
    const urls=text.match(/https?:\/\/[^\s<>"']+/g)||[];
    const dois=text.match(/10\.\d{4,9}\/[A-Z0-9._;()/:+-]+/gi)||[];
    dois.forEach(doi=>urls.push('https://doi.org/'+doi.replace(/[.,;]+$/,'')));
    const pmids=[...text.matchAll(/PMID\s*:?\s*(\d{6,9})/gi)].map(match=>match[1]);
    pmids.forEach(id=>urls.push('https://pubmed.ncbi.nlm.nih.gov/'+id+'/'));
    const safe=[...new Set(urls.map(raw=>raw.replace(/[.,;]+$/,'')))].filter(raw=>{
      try{const url=new URL(raw);return /^https?:$/.test(url.protocol)&&!url.username&&!url.password}catch{return false}
    });
    return safe.map((url,i)=>`<p class="source"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${i?'Otra fuente original':'Abrir fuente original'} ↗</a></p>`).join('');
  }
  const journeys=()=>D.modules.flatMap((m,mi)=>m.journeys.map((j,ji)=>({...j,_module:m,_mi:mi,_ji:ji,id:j.id||`${mi}-${ji}`})));
  const activity=id=>S.activities[id]||(S.activities[id]={});
  const academicAssignments=()=>S.academicAssignments||(S.academicAssignments={});
  const hasAcademicActivities=()=>Boolean((D.moduleAssignments||[]).length||D.finalAssessment);
  const academicExpected=()=>((D.moduleAssignments||[]).length+(D.finalAssessment?1:0));
  const academicDone=()=>Object.values(academicAssignments()).filter(x=>x&&x.completedAt).length;
  async function syncCertificateEligibility(){
    const C=window.KINECHECK_CONFIG||{};
    if(!session?.access_token||!C.supabaseUrl||!C.supabaseAnonKey||!C.courseSlug)return;
    const pct=updateProgress();
    if(C.courseSlug==='evidencia-aplicada'&&pct<100)return;
    if(C.courseSlug==='dolor-musculoesqueletico'&&(pct<100||academicDone()<academicExpected()))return;
    try{
      const response=await fetch(String(C.supabaseUrl).replace(/\/$/,'')+'/functions/v1/course-completion-sync',{
        method:'POST',
        cache:'no-store',
        headers:{
          Authorization:'Bearer '+session.access_token,
          apikey:C.supabaseAnonKey,
          'Content-Type':'application/json'
        },
        body:JSON.stringify({courseSlug:C.courseSlug})
      });
      const payload=await response.json().catch(()=>({}));
      if(response.ok&&payload?.eligible){
        const el=document.getElementById('sync-status');
        if(el)el.textContent='Curso completado · certificado habilitado';
      }
    }catch{}
  }
  async function save(){await window.KineCheckProgress.push(S);updateProgress();void syncCertificateEligibility()}
  function activityScore(a={},id){return ['openedAt','labSavedAt','caseSavedAt','reflectionSavedAt','reviewedAt'].filter(k=>a[k]&&(!/^(lab|case|reflection)SavedAt$/.test(k)||String(S.notes[`${id}-${k.replace('SavedAt','')}`]?.text||'').trim())).length}
  function updateProgress(){const all=journeys(),max=Math.max(1,all.length*5),score=all.reduce((n,j)=>n+activityScore(S.activities[j.id],j.id),0),pct=Math.round(score/max*100);const el=document.getElementById('progress');if(el)el.textContent=`Ruta personal ${pct}%`;return pct}
  function setActive(v){document.querySelectorAll('.sidebar button').forEach(b=>b.classList.toggle('active',b.dataset.view===v))}
  function profileText(){return S.profile==='professional'?'Ruta profesional':'Ruta estudiante'}
  function profileBlock(j){
    const p=S.profile==='professional'?(j.professional||{}):(j.student||{});
    if(!Object.keys(p).length)return '';
    const items=(p.prompts||p.focus||[]).map(x=>`<li>${esc(x)}</li>`).join('');
    return `<section class="profile-panel ${S.profile}"><span class="badge">${profileText()}</span><h2>${esc(p.title||'Orientación de la ruta')}</h2>${p.intro?`<p>${esc(p.intro)}</p>`:''}${items?`<ul>${items}</ul>`:''}${p.example?`<div class="worked-example"><strong>Ejemplo:</strong> ${esc(p.example)}</div>`:''}</section>`;
  }
  function closeMobile(){document.getElementById('sidebar')?.classList.remove('mobile-open');const o=document.getElementById('nav-overlay');if(o)o.hidden=true}
  function buildNav(){
    nav.innerHTML='';
    D.modules.forEach((m,mi)=>{
      const group=document.createElement('section');group.className='nav-module';
      const toggle=document.createElement('button');toggle.className='module-toggle';toggle.innerHTML=`<span>${esc(m.title)}</span><b>⌄</b>`;
      const list=document.createElement('div');list.className='module-lessons';
      m.journeys.forEach((j,ji)=>{const id=j.id||`${mi}-${ji}`,b=document.createElement('button');b.dataset.view=id;b.innerHTML=`<span>${esc(j.title)}</span><small>${activityScore(S.activities[id],id)}/5</small>`;b.onclick=()=>{showJourney(mi,ji);closeMobile()};list.appendChild(b)});
      toggle.onclick=()=>group.classList.toggle('open');
      if(mi===0||m.journeys.some((j,ji)=>(j.id||`${mi}-${ji}`)===S.lastLocation))group.classList.add('open');
      group.append(toggle,list);nav.appendChild(group);
    })
  }
  function home(){
    setActive('home');const last=journeys().find(j=>j.id===S.lastLocation)||journeys()[0];
    app.innerHTML=`<div class="hero"><span class="badge">Experiencia profesional de aprendizaje</span><h1>${esc(D.title)}</h1><p>${esc(D.subtitle)}</p><div class="profile-hint"><strong>${profileText()}:</strong> ${S.profile==='professional'?'prioriza aplicabilidad, comunicación y decisiones clínicas.':'incorpora glosarios, andamiaje y reconocimiento de errores frecuentes.'}</div><button class="btn" id="continue-route">${S.lastLocation?'Continuar donde quedé':'Iniciar la ruta'}</button></div><section class="block"><h2>Cómo se aprende aquí</h2><div class="idea-grid"><div class="idea"><h3>Comprender</h3><p>Explicaciones profundas y límites de la evidencia.</p></div><div class="idea"><h3>Contrastar</h3><p>Qué significa y qué no significa cada hallazgo.</p></div><div class="idea"><h3>Aplicar</h3><p>Decisiones clínicas abiertas, no recetas.</p></div><div class="idea"><h3>Revisar</h3><p>El progreso registra trabajo real, no solo páginas abiertas.</p></div></div></section><div class="grid">${D.modules.map((m,i)=>`<article class="card" data-module="${i}"><span class="badge">${esc(m.title)}</span><h3>${esc(m.purpose)}</h3><p>${m.journeys.length} experiencias</p></article>`).join('')}</div>`;
    document.getElementById('continue-route').onclick=()=>showJourney(last._mi,last._ji);
    app.querySelectorAll('[data-module]').forEach(x=>x.onclick=()=>showJourney(Number(x.dataset.module),0));
  }
  function listHtml(title,items){return items?.length?`<section class="block"><h2>${esc(title)}</h2><ul class="clinical-list">${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`:''}
  async function showJourney(mi,ji){
    const m=D.modules[mi],j=m.journeys[ji],id=j.id||`${mi}-${ji}`,a=activity(id);a.openedAt=a.openedAt||new Date().toISOString();S.lastLocation=id;await save();setActive(id);buildNav();
    const concepts=j.keyConcepts||j.ideas||[];
    app.innerHTML=`<div class="lesson-head"><span class="badge">${esc(m.title)}</span><h1>${esc(j.title)}</h1><div class="question">${esc(j.clinicalQuestion||j.question)}</div>${j.learningOutcomes?.length?`<div class="outcomes"><strong>Al finalizar podrás:</strong><ul>${j.learningOutcomes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}</div>
      ${j.explanation?`<section class="block longform"><h2>Comprender la evidencia</h2>${j.explanation.map(p=>`<p>${esc(p)}</p>`).join('')}</section>`:''}
      <section class="block"><h2>Ideas para pensar</h2><div class="idea-grid">${concepts.map(x=>`<div class="idea">${esc(x)}</div>`).join('')}</div>${j.source?`<p class="source"><strong>Base documental:</strong> ${esc(j.source)}</p>${sourceLinks({originalRelation:j.source})}`:''}</section>
      ${listHtml('Qué permite sostener',j.canConclude)}${listHtml('Qué no permite sostener',j.cannotConclude)}${listHtml('Limitaciones y cautelas',j.limitations)}
      ${profileBlock(j)}
      <section class="lab"><h2>Laboratorio de razonamiento</h2><p class="source">Usa casos simulados o completamente anonimizados. No guardes nombres, RUT, contactos ni datos que identifiquen a pacientes.</p><p>${esc(j.lab)}</p><textarea id="labText" placeholder="Desarrolla tu razonamiento...">${esc(S.notes[`${id}-lab`]?.text||'')}</textarea><button class="btn" data-save="lab">Guardar en mi cuaderno</button></section>
      <section class="case"><h2>Caso para decidir</h2><p>${esc(j.case)}</p>${j.decisionQuestions?.length?`<ol>${j.decisionQuestions.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:''}<textarea id="caseText" placeholder="Justifica tu decisión...">${esc(S.notes[`${id}-case`]?.text||'')}</textarea><button class="btn" data-save="case">Guardar decisión</button></section>
      <section class="reflection"><h2>Metarreflexión</h2><p>${esc(j.reflection||'¿Qué cambió en tu forma de interpretar este problema? ¿Qué información seguirías necesitando?')}</p><textarea id="refText">${esc(S.notes[`${id}-reflection`]?.text||'')}</textarea><button class="btn" data-save="reflection">Guardar reflexión</button></section>
      ${j.feedbackCriteria?.length?`<details class="feedback-guide"><summary>Orientaciones para revisar tu razonamiento</summary><ul>${j.feedbackCriteria.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`:''}
      <div class="journey-actions"><button class="btn secondary" id="bookmark">${(S.bookmarks||[]).includes(id)?'Quitar marcador':'Guardar como favorito'}</button><button class="btn" id="reviewed">${a.reviewedAt?'Revisado ✓':'Marcar como revisado'}</button></div>`;
    app.querySelector('[data-save="lab"]').onclick=()=>store(id,'lab','labText',j,m);
    app.querySelector('[data-save="case"]').onclick=()=>store(id,'case','caseText',j,m);
    app.querySelector('[data-save="reflection"]').onclick=()=>store(id,'reflection','refText',j,m);
    document.getElementById('reviewed').onclick=async()=>{activity(id).reviewedAt=new Date().toISOString();await save();showJourney(mi,ji)};
    document.getElementById('bookmark').onclick=async()=>{S.bookmarks=S.bookmarks||[];S.bookmarks.includes(id)?S.bookmarks=S.bookmarks.filter(x=>x!==id):S.bookmarks.push(id);await save();showJourney(mi,ji)};
  }
  async function store(id,type,el,j,m){const text=document.getElementById(el).value.trim();if(!text){document.getElementById('sync-status').textContent='Escribe tu razonamiento antes de guardar.';return;}S.notes[`${id}-${type}`]={text,module:m.title,journey:j.title,type,updatedAt:new Date().toISOString()};activity(id)[`${type}SavedAt`]=new Date().toISOString();await save();buildNav();document.getElementById('sync-status').textContent='Guardado'}
  function library(){
    setActive('library');app.innerHTML=`<div class="lesson-head"><h1>Biblioteca científica</h1><p>${LIB.length} fichas temáticas y bibliográficas organizadas por diseño, función clínica, prioridad y módulo.</p></div><section class="library-tools"><input id="lib-search" type="search" placeholder="Buscar por título, tema o etiqueta"><select id="lib-module"><option value="">Todos los módulos</option>${[...new Set(LIB.map(x=>x.module))].filter(Boolean).map(x=>`<option>${esc(x)}</option>`).join('')}</select><select id="lib-type"><option value="">Todos los tipos</option>${[...new Set(LIB.map(x=>x.sourceType))].filter(Boolean).map(x=>`<option>${esc(x)}</option>`).join('')}</select><select id="lib-tier"><option value="">Todas las prioridades</option>${[...new Set(LIB.map(x=>x.tier))].filter(Boolean).map(x=>`<option>${esc(x)}</option>`).join('')}</select></section><div id="library-results"></div>`;
    const render=()=>{const q=document.getElementById('lib-search').value.toLowerCase(),mo=document.getElementById('lib-module').value,ty=document.getElementById('lib-type').value,ti=document.getElementById('lib-tier').value;const rows=LIB.filter(x=>(!q||JSON.stringify(x).toLowerCase().includes(q))&&(!mo||x.module===mo)&&(!ty||x.sourceType===ty)&&(!ti||x.tier===ti));document.getElementById('library-results').innerHTML=rows.map(x=>`<article class="library-card"><div><span class="badge">${esc(x.tier||'Complementario')}</span><span class="mini-tag">${esc(x.sourceType||'Recurso')}</span></div><h3>${esc(x.title)}</h3><p>${esc(librarySummary(x))}</p>${sourceLinks(x)}<dl><dt>Módulo</dt><dd>${esc(x.module||'Transversal')}</dd><dt>Uso clínico</dt><dd>${esc(x.clinicalUse||'Interpretación crítica')}</dd><dt>Cautela</dt><dd>${esc(x.caution||'Interpretar según diseño y contexto.')}</dd></dl></article>`).join('')||'<div class="block">No hay resultados con esos filtros.</div>'};
    ['lib-search','lib-module','lib-type','lib-tier'].forEach(id=>document.getElementById(id).oninput=render);render();
  }
  function notebook(){
    setActive('notebook');const entries=Object.entries(S.notes||{}).sort((a,b)=>String(b[1].updatedAt).localeCompare(String(a[1].updatedAt)));
    app.innerHTML=`<div class="lesson-head"><h1>Cuaderno clínico</h1><p>Registro formativo personal de razonamientos, decisiones y metarreflexiones. Trabaja con casos simulados o anonimizados; este cuaderno no es una ficha clínica y no debe contener datos identificables de pacientes.</p><button class="btn secondary" id="export-notebook">Exportar cuaderno</button></div>${entries.length?entries.map(([k,n])=>`<article class="notebook-entry"><div><span class="badge">${esc(({lab:'Laboratorio',case:'Decisión clínica',reflection:'Metarreflexión'})[n.type]||n.type)}</span><small>${esc(new Date(n.updatedAt).toLocaleString('es-CL'))}</small></div><h3>${esc(n.journey)}</h3><p class="source">${esc(n.module)}</p><p>${esc(n.text)||'<em>Sin contenido</em>'}</p></article>`).join(''):'<div class="block">Aún no has guardado reflexiones.</div>'}`;
    document.getElementById('export-notebook').onclick=()=>{const blob=new Blob([JSON.stringify({course:D.title,profile:S.profile,notes:S.notes},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='cuaderno-clinico-kinecheck.json';a.click();URL.revokeObjectURL(a.href)};
  }

  function academic(){
    setActive("academic");
    const assignments=D.moduleAssignments||[];
    const final=D.finalAssessment||null;
    const records=academicAssignments();
    const all=assignments.map((x,i)=>Object.assign({},x,{_key:"module-"+(x.moduleNumber||i+1)}));
    if(final) all.push(Object.assign({},final,{_key:"final"}));
    let html='<div class="lesson-head"><span class="badge">Carga académica certificable</span><h1>Actividades obligatorias de aplicación</h1><p>';
    html+=esc((D.academicLoad&&D.academicLoad.methodology)||"Completa las actividades requeridas y guarda cada desarrollo con casos simulados o anonimizados, sin datos identificables de pacientes.");
    html+='</p><p>Usa casos simulados o completamente anonimizados. No incluyas nombres, RUT, contactos ni datos que identifiquen a pacientes.</p><div class="outcomes"><strong>Avance:</strong> '+academicDone()+' de '+academicExpected()+' actividades completadas · '+esc((D.academicLoad&&D.academicLoad.certifiableHours)||"")+' h certificables.</div></div>';
    all.forEach((item,i)=>{
      const rec=records[item._key]||{};
      const criteria=item.criteria||[];
      html+='<section class="lab" data-academic-card="'+esc(item._key)+'"><span class="badge">'+Number(item.durationMinutes||0)+' min</span><h2>'+esc(item.title)+'</h2><p>'+esc(item.prompt)+'</p>';
      html+='<textarea id="academic-'+i+'" placeholder="Desarrolla tu respuesta con razonamiento explícito...">'+esc(rec.text||"")+'</textarea>';
      if(criteria.length){
        html+='<div class="clinical-list"><strong>Criterios de finalización</strong>';
        criteria.forEach((label,j)=>{
          html+='<label style="display:block;margin:8px 0"><input type="checkbox" data-academic-check="'+i+'-'+j+'" '+(rec.completedAt?"checked":"")+'> '+esc(label)+'</label>';
        });
        html+='</div>';
      }
      html+='<button class="btn" data-academic-save="'+i+'">'+(rec.completedAt?"Completada ✓":"Guardar actividad")+'</button>';
      html+='<p class="source" data-academic-message="'+i+'">'+(rec.completedAt?("Completada "+esc(new Date(rec.completedAt).toLocaleString("es-CL"))):("Respuesta mínima: "+Number(item.minimumCharacters||350)+" caracteres y todos los criterios marcados."))+'</p></section>';
    });
    app.innerHTML=html;
    app.querySelectorAll("[data-academic-save]").forEach(button=>button.onclick=async()=>{
      const i=Number(button.dataset.academicSave);
      const item=all[i];
      const key=item._key;
      const textValue=(document.getElementById("academic-"+i)?.value||"").trim();
      const checks=[...app.querySelectorAll('[data-academic-check^="'+i+'-"]')];
      const message=app.querySelector('[data-academic-message="'+i+'"]');
      const minimum=Number(item.minimumCharacters||350);
      if(checks.length!==(item.criteria||[]).length){if(message)message.textContent='No fue posible verificar los criterios. Reabre la actividad.';return;}
      if(textValue.length<minimum){
        if(message) message.textContent="Desarrolla al menos "+minimum+" caracteres antes de guardar.";
        return;
      }
      if(checks.length&&!checks.every(x=>x.checked)){
        if(message) message.textContent="Marca todos los criterios de revisión antes de completar la actividad.";
        return;
      }
      academicAssignments()[key]={
        text:textValue,
        criteria:(item.criteria||[]).map((label,j)=>({label:label,checked:checks[j]?.checked!==false})),
        durationMinutes:Number(item.durationMinutes||0),
        completedAt:new Date().toISOString(),
        updatedAt:new Date().toISOString()
      };
      S.notes["academic-"+key]={text:textValue,module:"Carga académica",journey:item.title,type:"academic",updatedAt:new Date().toISOString()};
      await save();
      buildNav();
      academic();
    });
  }
  function integration(){setActive('integration');app.innerHTML=`<div class="lesson-head"><h1>Laboratorio integrador</h1><p>Construye una formulación revisable, una decisión compartida y un plan de reevaluación usando este caso simulado. No incluyas datos identificables de pacientes.</p></div><section class="case"><h2>Caso complejo</h2><p>Persona de 47 años con dolor lumbar persistente, sueño irregular, temor a flexionarse, cambios degenerativos en resonancia, baja actividad y tratamientos pasivos previos.</p></section>${['¿Qué hipótesis mantienes abiertas?','¿Qué información cambiaría tu decisión?','¿Qué abordarías primero y por qué?','¿Cómo comunicarías la imagen?','¿Qué experimento clínico propondrías?','¿Cómo evaluarías si tu hipótesis mejora?'].map((q,i)=>`<section class="reflection"><h3>${q}</h3><textarea id="int${i}">${esc(S.notes[`integration-${i}`]?.text||'')}</textarea><button class="btn" data-int="${i}">Guardar</button></section>`).join('')}`;app.querySelectorAll('[data-int]').forEach(b=>b.onclick=async()=>{const i=b.dataset.int,text=document.getElementById(`int${i}`).value.trim();if(!text){b.textContent='Escribe tu respuesta antes de guardar';return;}S.notes[`integration-${i}`]={text,module:'Laboratorio integrador',journey:'Caso complejo',type:'integration',updatedAt:new Date().toISOString()};await save();b.textContent='Guardado ✓'})}
  function wireShell(){
    if(hasAcademicActivities()&&!document.querySelector('[data-view="academic"]')){
      const ecosystem=document.querySelector('.sidebar .ecosystem'),button=document.createElement('button');
      button.dataset.view='academic';
      button.textContent='Carga académica · '+((D.academicLoad&&D.academicLoad.certifiableHours)||'')+' h';
      if(ecosystem&&ecosystem.parentNode) ecosystem.parentNode.insertBefore(button,ecosystem);
    }
    document.querySelectorAll('.sidebar>button').forEach(b=>b.onclick=()=>{({home,library,notebook,integration,academic}[b.dataset.view]||home)();closeMobile()});
    document.getElementById('mobile-menu').onclick=()=>{document.getElementById('sidebar').classList.add('mobile-open');document.getElementById('nav-overlay').hidden=false};
    document.getElementById('close-menu').onclick=closeMobile;document.getElementById('nav-overlay').onclick=closeMobile;
    document.getElementById('change-profile').onclick=async()=>{S.profile=S.profile==='professional'?'student':'professional';await save();document.getElementById('profile-label').textContent=profileText();home()};
  }
  function start(s,state,content){session=s;D=content.course;LIB=content.library||[];S={...window.KineCheckProgress.defaultState(),...state,activities:state.activities||{},notes:state.notes||{},bookmarks:state.bookmarks||[],academicAssignments:state.academicAssignments||{}};app=document.getElementById('app');nav=document.getElementById('nav');document.getElementById('profile-label').textContent=profileText();wireShell();buildNav();home();updateProgress();void syncCertificateEligibility()}
  return{start,showJourney,store};
})();
