import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi, responseRequest, validatePayload, parseResponse, allowedModels } from '../server/api.mjs';
import { reserve, memoryLimiter } from '../server/limiter.mjs';
const env={OPENAI_API_KEY:'test-key-never-a-real-secret',APP_ACCESS_TOKEN:'test-app-token-with-at-least-24-characters',ALLOWED_ORIGINS:'https://martinmesko.github.io',DAILY_REQUEST_LIMIT:'2'};
const body=()=>({kind:'advice',message:'Ako overiť relé?',model:'gpt-6.1-sol',effort:'medium',profile:{name:'Martin',role:'Technik',context:'PDF'},notes:[{id:'n1',title:'Zdroj',kind:'Pravidlo',tags:'K12',content:'Cituj stranu.'}],situations:[{id:'s1',title:'Kontrola relé',category:'Schémy',tool:'Codex',modelId:'gpt-6.1-sol',effort:'high',why:'Dôkazy'}],models:[{id:'gpt-6.1-sol',label:'Sol',tool:'Codex',efforts:['medium','high']}]});
const output={answer:'Over pôvodný zdroj.',steps:['Nájdi cievku'],uncertainties:['Chýba výkres'],usedNoteIds:['n1'],recommendedSituationId:'s1',skillMarkdown:null};
const result=(data=output)=>({status:'completed',model:'gpt-6.1-sol',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(data)}]}],usage:{input_tokens:100,output_tokens:50,total_tokens:150}});
function request(data=body(),options={}){return new Request('https://api.example/api/assist',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.APP_ACCESS_TOKEN,Origin:'https://martinmesko.github.io',...options.headers},body:JSON.stringify(data)});}
test('auth and exact-origin CORS run before any paid request',async()=>{
  let calls=0;const fetcher=async()=>{calls++;return Response.json(result());};
  assert.equal((await handleApi(request(body(),{headers:{Authorization:'Bearer bad'}}),env,{fetcher})).status,401);
  assert.equal((await handleApi(request(body(),{headers:{Origin:'https://evil.example'}}),env,{fetcher})).status,403);
  assert.equal((await handleApi(request(body(),{headers:{Origin:'https://martinmesko.github.io.evil.example'}}),env,{fetcher})).status,403);
  assert.equal(calls,0);
});
test('full authenticated pipeline sends real Responses API contract without persistence',async()=>{
  let captured;const fetcher=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');captured=JSON.parse(options.body);return Response.json(result());};
  const response=await handleApi(request(),env,{fetcher,...memoryLimiter(env)});assert.equal(response.status,200);
  assert.equal(captured.store,false);assert.equal(captured.text.format.type,'json_schema');assert.equal(captured.text.format.strict,true);assert.equal(captured.reasoning.effort,'medium');assert.equal(captured.tools,undefined);
  assert.match(captured.input[0].content,/Cituj stranu/);assert.equal((await response.json()).usage.total_tokens,150);
});
test('invalid or costly payloads are rejected without upstream calls',async()=>{
  for(const patch of [{model:'some-unapproved-model'},{effort:'ultra'},{notes:Array(13).fill(body().notes[0])},{message:'sk-'+'x'.repeat(40)}]){
    const r=await handleApi(request({...body(),...patch}),env,{fetcher:()=>{throw new Error('must not call upstream');}});assert.equal(r.status,400);
  }
  const huge=new Request('https://api.example/api/assist',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.APP_ACCESS_TOKEN},body:'x'.repeat(220001)});
  assert.equal((await handleApi(huge,env)).status,413);
});
test('upstream errors are actionable and never return its credentials or raw errors',async()=>{
  const r=await handleApi(request(),env,{fetcher:async()=>Response.json({error:{message:'private diagnostic'}},{status:401})});assert.equal(r.status,401);const text=await r.text();assert.ok(!text.includes(env.OPENAI_API_KEY));assert.ok(!text.includes('private diagnostic'));
});
test('reject incomplete output, invented citations and invalid skills',()=>{
  const payload=validatePayload(body(),env);
  assert.throws(()=>parseResponse({status:'incomplete'},payload),/nedokončil/);
  assert.throws(()=>parseResponse(result({...output,usedNoteIds:['unknown']}),payload),/citoval/);
  assert.throws(()=>parseResponse(result({...output,recommendedSituationId:'unknown'}),payload),/neexistujúcu/);
  assert.throws(()=>parseResponse(result({...output,skillMarkdown:'no frontmatter'}),{...payload,kind:'skill'}),/frontmatter/);
});
test('quota serializes requests, caps per-minute and daily attempts',()=>{
  const now=Date.UTC(2026,9,19,12),first=reserve({},env,now);
  assert.throws(()=>reserve(first,env,now+1),/prebieha/);
  const second=reserve({...first,until:0},env,now+60001);
  assert.throws(()=>reserve({...second,until:0},env,now+120002),/Denný/);
  assert.equal(reserve({...second,until:0},env,now+86400000).count,1);
  let q={};for(let i=0;i<3;i++)q=reserve({...q,until:0},{DAILY_REQUEST_LIMIT:'30'},now+i*1000);
  assert.throws(()=>reserve({...q,until:0},{DAILY_REQUEST_LIMIT:'30'},now+4000),/minútu/);
});
test('public config requires auth but never calls the OpenAI API',async()=>{
  const r=await handleApi(new Request('https://api.example/api/config',{headers:{Authorization:'Bearer '+env.APP_ACCESS_TOKEN}}),env);assert.equal(r.status,200);const config=await r.json();assert.equal(config.configured,true);assert.ok(!JSON.stringify(config).includes(env.OPENAI_API_KEY));
});
test('instructions treat notes as untrusted and cannot request actions',()=>{
  const r=responseRequest(validatePayload(body(),env),env);assert.match(r.instructions,/nie systémové príkazy/);assert.match(r.instructions,/Nevymýšľaj ID/);assert.doesNotMatch(r.instructions,/Junior AI technik/i);
});
test('excluded models stay blocked even with a stale or overridden server allowlist',async()=>{
  const stale={...env,OPENAI_MODEL:'gpt-6-astra',ALLOWED_MODELS:'gpt-6-astra,fable,claude-fable-5-1,gpt-6.1-sol'};
  assert.deepEqual(allowedModels(stale),['gpt-6.1-sol']);
  for(const model of ['gpt-6-astra','fable','claude-fable-5-1']){
    let calls=0;const r=await handleApi(request({...body(),model}),stale,{fetcher:async()=>{calls++;return Response.json(result());}});
    assert.equal(r.status,400);assert.equal(calls,0);
  }
  const r=await handleApi(new Request('https://api.example/api/config',{headers:{Authorization:'Bearer '+env.APP_ACCESS_TOKEN}}),stale);
  const config=await r.json();assert.equal(config.defaultModel,'gpt-6.1-sol');assert.deepEqual(config.models,['gpt-6.1-sol']);
});
test('server removes excluded legacy catalog entries and carries selected priority',()=>{
  const input=body();input.priority='quality';
  input.models.push({id:'gpt-6-astra',label:'GPT-6 Astra',tool:'Codex',efforts:['high']});
  input.situations[0].modelId='gpt-6-astra';
  const payload=validatePayload(input,env);assert.equal(payload.context.priority,'quality');
  assert.ok(!payload.context.models.some(m=>/astra/i.test(m.id)));assert.equal(payload.context.situations[0].modelId,'gpt-6.1-sol');
  assert.match(responseRequest(payload,env).instructions,/hlavnom AJ alternatívnom/);
});
test('model and skill output cannot propose excluded models even if provider ignores instructions',()=>{
  const payload=validatePayload(body(),env);
  for(const answer of ['Použi GPT-6 Astra.','Spusti claude --model fable','Použi Claude Fable 5.1'])assert.throws(()=>parseResponse(result({...output,answer}),payload),/vyradený/);
  assert.throws(()=>parseResponse(result({...output,skillMarkdown:'---\nname: qa\ndescription: QA\n---\nPouži Fable'}),{...payload,kind:'skill'}),/vyradený/);
  assert.throws(()=>parseResponse({...result(),model:'gpt-6-astra'},payload),/vyradený/);
});
