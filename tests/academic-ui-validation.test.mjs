import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('empty lab, case and reflection answers never write progress',async()=>{
  let writes=0;
  const status={textContent:''},context=vm.createContext({window:{KineCheckProgress:{async push(){writes++}}},document:{getElementById(id){return id==='sync-status'?status:{value:'   '}}},console,URL});
  vm.runInContext(source,context);
  for(const type of ['lab','case','reflection'])await context.window.KineCheckCourse.store('lesson',type,'field',{title:'Lesson'},{title:'Module'});
  assert.equal(writes,0);assert.equal(status.textContent,'Escribe tu razonamiento antes de guardar.');
});
test('library links expose original references with safe, escaped destinations',()=>{
  const start=source.indexOf('  const esc='),end=source.indexOf('  const journeys=');
  const context=vm.createContext({URL});vm.runInContext(source.slice(start,end),context);
  const links=vm.runInContext(`sourceLinks({originalRelation:'DOI: 10.1097/j.pain.0000000000002324. PMID: 33974577. https://www.iasp-pain.org/resources/terminology/'})`,context);
  assert.match(links,/https:\/\/doi.org\/10.1097\/j.pain.0000000000002324/);assert.match(links,/pubmed.ncbi.nlm.nih.gov\/33974577\//);assert.match(links,/rel="noopener noreferrer"/);
  const unsafe=vm.runInContext(`sourceLinks({originalRelation:'javascript:alert(1) https://user:secret@example.test/'})`,context);
  assert.equal(unsafe,'');
});
