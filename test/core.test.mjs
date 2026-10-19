import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, SITUATIONS, MODELS } from '../web/data.mjs';
import { rankSituations, recommend, cliCommand, selectNotes, localSkill, validateBackup } from '../web/core.mjs';

test('15 provided work situations survive seed and Slovak multiword matching',()=>{
  assert.equal(SITUATIONS.length,15);assert.equal(new Set(SITUATIONS.map(s=>s.id)).size,15);
  assert.equal(rankSituations(SITUATIONS,'všetky výskyty K12')[0].id,'component-find');
  assert.equal(rankSituations(SITUATIONS,'Python skript PDF')[0].id,'python-pdf');
  assert.equal(rankSituations(SITUATIONS,'zzzzzzzz').length,0);
  assert.ok(rankSituations(SITUATIONS,'','Schémy').every(s=>s.category==='Schémy'));
});
test('speed cannot reduce human review and CLI text cannot contain injection',()=>{
  const safety=SITUATIONS.find(s=>s.humanRequired),r=recommend(safety,MODELS,'fast');
  assert.equal(r.effort,'xhigh');assert.equal(r.model.id,'opus');
  assert.equal(cliCommand({...MODELS[0],id:'$(touch /tmp/unwanted)'},'high'),null);
  assert.equal(cliCommand(MODELS[0],'invalid'),null);
  const codex=cliCommand(MODELS[0],'high');assert.equal(codex.interactive,'/reasoning');assert.ok(!codex.launch.includes('--effort'));
  assert.equal(cliCommand(MODELS.find(m=>m.id==='opus'),'xhigh').launch,"claude --model 'opus' --effort xhigh");
});
test('only opted-in notes enter context and at most 12 are sent',()=>{
  const notes=Array.from({length:20},(_,i)=>({id:String(i),title:i===4?'Relé K12':'Iné',content:'Dôkaz',kind:'Poznámka',tags:'',useInAI:i!==8}));
  const result=selectNotes(notes,'relé K12');assert.equal(result.length,12);assert.equal(result[0].id,'4');assert.ok(!result.some(n=>n.id==='8'));
});
test('backup round-trip preserves edits, rejects malformed records and secrets',()=>{
  const s=initialState();s.notes.push({id:'1',title:'Moje pravidlo',content:'Presný postup',kind:'Pravidlo',tags:'PDF',useInAI:true});
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(s))).notes,s.notes);
  assert.throws(()=>validateBackup({...s,models:[{id:'bad'}]}));
  assert.throws(()=>validateBackup({...s,notes:[{...s.notes[0],content:'sk-'+'x'.repeat(40)}]}),/API kľúč/);
  assert.throws(()=>validateBackup({...s,settings:{apiBase:'javascript:alert(1)'}}));
});
test('local skill has scoped frontmatter and uses selected knowledge',()=>{
  const s=initialState(),md=localSkill({name:'Kontrola relé K12',goal:'Overiť kontakty',notes:[{title:'Pravidlo',content:'Uveď stranu 12'}],situation:SITUATIONS[0],profile:s.profile});
  assert.match(md,/^---\nname: kontrola-rele-k12\ndescription:/);assert.match(md,/Uveď stranu 12/);assert.match(md,/## Overenie/);
});
test('retired default role is removed without changing personal content',()=>{
  const state=initialState();assert.equal(state.profile.role,'');
  state.profile.role='Junior AI technik';
  state.notes.push({id:'note',title:'Vlastný poznatok',content:'Zachovať dôkaz',kind:'Pravidlo',tags:'QA',useInAI:true});
  state.situations[0].why='Môj vlastný postup';
  const migrated=validateBackup(state);
  assert.equal(migrated.profile.role,'');assert.deepEqual(migrated.notes,state.notes);assert.deepEqual(migrated.situations,state.situations);
  state.profile.role='Harness Engineer';assert.equal(validateBackup(state).profile.role,'Harness Engineer');
  const md=localSkill({name:'QA',goal:'Overiť zapojenie',notes:[],situation:state.situations[0],profile:migrated.profile});
  assert.ok(!md.includes('Junior AI technik'));assert.ok(!md.includes('## Pracovný kontext\n:'));
});
