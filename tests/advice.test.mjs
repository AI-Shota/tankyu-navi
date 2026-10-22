import test from 'node:test';
import assert from 'node:assert/strict';
import advice from '../netlify/functions/advice.mjs';
const ENDPOINT = 'https://tankyu-navi.netlify.app/api/advice';
const example = {lang:'ja', project:{topic:'公共図書館の利用状況を調べたい', purpose:'公開データを比較する', known:'図書館に統計がある', unknown:'地域ごとの違い'}, done:[true,false,false,false,false],notes:[{title:'図書館の統計',found:'利用者のデータ',question:'経年変化'}]};
function req(method='GET',payload, origin='https://tankyu-navi.netlify.app') {
  return new Request(ENDPOINT,{method,headers:{'content-type':'application/json', ...(origin&&{'origin':origin})},body:method==='GET'?undefined:JSON.stringify(payload)});
}
async function body(r){return await r.json()}
function withEnv(value,task){ const old=process.env.GROQ_API_KEY; if(value===null)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=value; return Promise.resolve().then(task).finally(()=>{if(old===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=old}) }
function withFetch(mock,task){const old=globalThis.fetch;globalThis.fetch=mock;return Promise.resolve().then(task).finally(()=>{globalThis.fetch=old})}
test('GET without key is safe and says unavailable',async()=>withEnv(null,async()=>{const r=await advice(req());assert.equal(r.status,200);assert.deepEqual(await body(r),{available:false});assert.equal(r.headers.get('cache-control'),'no-store')}));
test('GET with key does not leak key',async()=>withEnv('DUMMY_TEST_SECRET',async()=>{const r=await advice(req());const text=await r.text();assert.deepEqual(JSON.parse(text),{available:true});assert.doesNotMatch(text,/DUMMY_TEST_SECRET/)}));
test('POST without key gives not configured',async()=>withEnv(null,async()=>{const r=await advice(req('POST',example));assert.equal(r.status,503);assert.equal((await body(r)).code,'NOT_CONFIGURED')}));
test('POST validates origins and payload',async()=>withEnv('DUMMY',async()=>{let r=await advice(req('POST',example,'https://not-the-site.example'));assert.equal(r.status,403);r=await advice(req('POST',{project:{topic:''}}));assert.equal(r.status,400);r=await advice(req('PUT',{}));assert.equal(r.status,405)}));
test('POST passes bounded multilingual research data and returns advice',async()=>withEnv('DUMMY',async()=>withFetch(async(url,opts)=>{assert.match(url,/groq\.com\/openai\/v1/);assert.equal(opts.headers.authorization,'Bearer DUMMY');const p=JSON.parse(opts.body);assert.equal(p.model,'openai/gpt-oss-120b');assert.ok(p.messages[0].content.includes('Japanese'));assert.equal(JSON.parse(p.messages[1].content).project.topic,example.project.topic);return new Response(JSON.stringify({choices:[{message:{content:'【いまの整理】\n資料を調べよう'}}]}),{status:200,headers:{'content-type':'application/json'}})},async()=>{let r=await advice(req('POST',example));assert.equal(r.status,200);assert.match((await body(r)).advice,/資料を調べよう/)})));
test('Daily Groq 429 is distinguished from short term 429',async()=>withEnv('DUMMY',async()=>{
  await withFetch(async()=>new Response(JSON.stringify({error:{message:'Limit exceeded: RPD daily requests per day'}}),{status:429,headers:{'content-type':'application/json','retry-after':'600','x-ratelimit-remaining-requests':'0'}}),async()=>{const r=await advice(req('POST',example));assert.equal(r.status,429);assert.equal((await body(r)).code,'DAILY_LIMIT')});
  await withFetch(async()=>new Response(JSON.stringify({error:{message:'Limit exceeded: TPM tokens per minute'}}),{status:429,headers:{'content-type':'application/json','retry-after':'12','x-ratelimit-remaining-requests':'500'}}),async()=>{const r=await advice(req('POST',example));assert.equal(r.status,429);assert.equal((await body(r)).code,'RATE_LIMIT')});
}));
test('Upstream 5xx and malformed responses are not shown to users',async()=>withEnv('DUMMY',async()=>withFetch(async()=>new Response('{"error":{"message":"INTERNAL SECRET"}}',{status:500}),async()=>{const r=await advice(req('POST',example));assert.equal(r.status,502);const text=await r.text();assert.equal(JSON.parse(text).code,'UPSTREAM_UNAVAILABLE');assert.doesNotMatch(text,/SECRET/)})));
