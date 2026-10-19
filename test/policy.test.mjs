import test from 'node:test';
import assert from 'node:assert/strict';
import { MODELS, SITUATIONS, initialState } from '../web/data.mjs';
import { recommend, cliCommand, validateBackup, localSkill } from '../web/core.mjs';
import { applyModelPolicy, hasExcludedModel, usableModel } from '../web/policy.mjs';

const forbidden = [
  {...MODELS[0], id:'gpt-6-astra', label:'GPT-6 Astra', tier:3},
  {...MODELS.find(m=>m.id==='opus'), id:'fable', label:'Fable 5.1', tier:3}
];
test('all 45 scenario/priority pairs exclude blocked models in both choices and CLI',()=>{
  const models=[...MODELS,...forbidden];
  for(const s of SITUATIONS)for(const priority of ['fast','balanced','quality']){
    const r=recommend(s,models,priority);
    for(const c of [r,r.alternative,r.secondary].filter(Boolean)){
      assert.ok(c.model,`${s.id}/${priority} should have an available model`);
      assert.ok(!hasExcludedModel(c.model));assert.ok(!hasExcludedModel(cliCommand(c.model,c.effort)?.launch||''));
      assert.ok(c.model.efforts.includes(c.effort));
    }
    if(priority==='quality'){
      assert.equal(r.model.id,r.model.tool==='Codex'?'gpt-6.1-sol':'opus');
      assert.equal(r.alternative.model.id,r.alternative.model.tool==='Codex'?'gpt-6.1-sol':'opus');
    }
  }
});
test('PDF alternative follows priority rather than remaining fixed on Sonnet',()=>{
  const s=SITUATIONS[0],speed=recommend(s,MODELS,'fast'),balanced=recommend(s,MODELS,'balanced'),quality=recommend(s,MODELS,'quality');
  assert.equal(speed.model.id,'gpt-6-luna');assert.equal(speed.alternative.model.id,'haiku');
  assert.equal(balanced.model.id,'gpt-5.6-terra');assert.equal(balanced.alternative.model.id,'sonnet');
  assert.equal(balanced.effort,'medium');assert.equal(balanced.alternative.effort,'medium');
  assert.equal(quality.model.id,'gpt-6.1-sol');assert.equal(quality.alternative.model.id,'opus');
  assert.equal(quality.effort,'high');assert.equal(quality.alternative.effort,'high');
  assert.match(cliCommand(quality.alternative.model,quality.alternative.effort).launch,/^claude --model 'opus' --effort high$/);
});
test('disabled/missing alternatives never generate launch commands',()=>{
  const models=MODELS.map(m=>({...m,enabled:m.tool==='Codex'}));
  for(const p of ['fast','balanced','quality']){
    const r=recommend(SITUATIONS[0],models,p);
    assert.equal(r.alternative.unavailable,true);assert.equal(cliCommand(r.alternative.model,r.alternative.effort),null);
  }
  const missing=recommend({...SITUATIONS[0],modelId:'missing'},MODELS,'balanced');
  assert.equal(missing.unavailable,true);
  assert.equal(cliCommand({...MODELS[0],tool:'Claude Code'},'high'),null);
  for(const m of forbidden)assert.equal(cliCommand(m,'high'),null);
});
test('human review preserves effort for main, alternative and all priorities',()=>{
  const safety={...SITUATIONS.find(s=>s.humanRequired),alternativeEffort:'low'};
  for(const p of ['fast','balanced','quality']){
    const r=recommend(safety,MODELS,p);
    assert.equal(r.effort,'xhigh');assert.equal(r.alternative.effort,'xhigh');assert.match(r.workflowTool,/človek/);
  }
  const limited=MODELS.map(m=>({...m,efforts:['low','medium']}));
  const r=recommend(safety,limited,'quality');assert.equal(r.unavailable,true);assert.equal(r.alternative.unavailable,true);
  const max=recommend({...SITUATIONS[0],effort:'max'},MODELS,'quality');assert.equal(max.effort,'max');
});
test('legacy data and imported aliases are repaired without losing personal content',()=>{
  const old=initialState();old.models.push(...forbidden);
  old.situations[0].modelId='gpt-6-astra';old.situations[0].alternative='fable';old.situations[0].secondaryModelId='fable';
  old.settings.apiModel='gpt-6-astra';old.settings.priority='quality';
  old.notes=[{id:'n',title:'Vlastný poznatok',content:'Pôvodný dôkaz',kind:'Pravidlo',tags:'QA',useInAI:true}];
  old.skills=[{id:'k',name:'Moja práca',content:'Nemeniteľný osobný text'}];
  old.situations[0].why='Vlastný overovací postup';
  const before=structuredClone(old),next=validateBackup(old);
  assert.deepEqual(old,before);assert.deepEqual(next.notes,old.notes);assert.deepEqual(next.skills,old.skills);
  assert.equal(next.situations[0].modelId,'gpt-6.1-sol');assert.equal(next.situations[0].alternative,'opus');
  assert.equal(next.situations[0].secondaryModelId,'opus');assert.equal(next.situations[0].why,old.situations[0].why);
  assert.equal(next.settings.apiModel,'gpt-6.1-sol');assert.equal(next.settings.priority,'quality');
  assert.ok(next.models.filter(hasExcludedModel).every(m=>!m.enabled&&!m.api));
  assert.deepEqual(applyModelPolicy(next),next);
  const alias=initialState();alias.models.push({...forbidden[0],id:'custom-expensive'});alias.situations[0].modelId='custom-expensive';
  assert.equal(validateBackup(alias).situations[0].modelId,'gpt-6.1-sol');
  assert.equal(usableModel({...forbidden[0],enabled:true}),false);
});
test('local skill does not echo recommendations for excluded models',()=>{
  const state=initialState(),inputs={name:'Kontrola',goal:'Overiť dôkazy',situation:SITUATIONS[0],profile:state.profile,notes:[{title:'Staré',content:'Spusti GPT-6 Astra'},{title:'Aktuálne',content:'Cituj stranu 12.'}]};
  const md=localSkill(inputs);assert.ok(!hasExcludedModel(md));assert.match(md,/stranu 12/);
  assert.throws(()=>localSkill({...inputs,goal:'Použi Fable 5.1'}),/vyradený/);
});
test('same-tool alternatives never duplicate the main recommendation',()=>{
  for(const priority of ['fast','balanced','quality']){
    const r=recommend({...SITUATIONS[0],alternative:SITUATIONS[0].modelId},MODELS,priority);
    assert.ok(r.model);assert.ok(r.alternative.model);assert.notEqual(r.model.id,r.alternative.model.id);
    assert.equal(r.model.tool,r.alternative.model.tool);
  }
});
