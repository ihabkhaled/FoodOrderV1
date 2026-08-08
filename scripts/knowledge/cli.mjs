#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';

import {
  extractObligations,
  renderBundle,
  summarizeSource,
} from './compile-context.mjs';
import {
  classifyTask,
  discoverDomains,
  rulesForTask,
  skillsForTask,
  testsForDomains,
  validationForRisk,
} from './routing.mjs';

const root=process.cwd(), ai=path.join(root,'.ai');
const ignoredNames=new Set(['.git','.claude','.worktrees','node_modules','dist','coverage','test-results','playwright-report','ui-shots']);
const ignoredPaths=new Set(['android','ios','.ai']);
const textExt=new Set(['.css','.html','.js','.json','.md','.mjs','.ts','.tsx','.yaml','.yml']);
const posix=p=>p.split(path.sep).join('/');
const sha=s=>createHash('sha256').update(s).digest('hex');
async function walk(dir=root){let out=[];for(const e of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,e.name),rel=posix(path.relative(root,full));if(ignoredNames.has(e.name)||[...ignoredPaths].some(x=>rel===x||rel.startsWith(`${x}/`)))continue;if(e.isDirectory())out.push(...await walk(full));else out.push(rel);}return out.sort();}
async function text(file){return readFile(path.join(root,file),'utf8');}
async function put(file,value){const full=path.join(root,file);await mkdir(path.dirname(full),{recursive:true});await writeFile(full,typeof value==='string'?value:`${JSON.stringify(value,null,2)}\n`);}
const words=s=>Math.ceil(s.split(/\s+/).filter(Boolean).length*1.33);
const argv=process.argv.slice(2), command=argv[0]??'help';
const arg=name=>{const prefix=`--${name}=`;return argv.find(v=>v.startsWith(prefix))?.slice(prefix.length)??'';};
const flag=name=>argv.includes(`--${name}`);

// Tracked files only. Walking the tree re-discovers ignored build output on
// every invocation; git already knows the answer and honours .gitignore.
const trackedFiles=()=>execFileSync('git',['ls-files'],{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).split('\n').map(l=>l.trim()).filter(Boolean);

async function existingUnder(prefixes,files){return files.filter(f=>prefixes.some(p=>f===p||f.startsWith(`${p}/`))).slice(0,15);}

const SOURCE_EXT=/\.(ts|tsx|mjs|js)$/u;
const isSource=f=>SOURCE_EXT.test(f)&&!/\.(test|spec)\./u.test(f);

/**
 * Compiles a task bundle: rule obligations, exported symbols, and covering
 * tests, sized to the task's risk lane.
 */
async function compile(task,{limit=14}={}){
  const files=trackedFiles();
  const domains=discoverDomains(files);
  const classification=classifyTask(task,domains);
  const matched=classification.domains;

  const requested=arg('files').split(',').filter(Boolean).filter(f=>files.includes(f));
  const domainFiles=matched.flatMap(d=>files.filter(f=>isSource(f)&&d.paths.some(p=>f===p||f.startsWith(`${p}/`))));
  // Entry points first: a container or index tells more per token than a leaf.
  const rank=f=>(/(container|index|\.hook\.|routes?)/u.test(f)?0:1);
  const selected=[...new Set([...requested,...domainFiles])].sort((a,b)=>rank(a)-rank(b)||a.localeCompare(b)).slice(0,limit);

  const sources=[];let rawTokens=0;
  for(const file of selected){
    let content='';try{content=await text(file);}catch{}
    rawTokens+=words(content);
    sources.push({path:file,symbols:summarizeSource(content),hash:sha(content)});
  }

  const ruleIds=rulesForTask(task,matched);
  const ruleDigests=[];
  for(const id of ruleIds){
    const file=`rules/${id}.md`;
    if(!existsSync(path.join(root,file)))continue;
    const content=await text(file);
    rawTokens+=words(content);
    ruleDigests.push({id,obligations:extractObligations(content)});
  }

  const skills=skillsForTask(task);
  const tests=testsForDomains(matched,files);
  const risk=classification.risk;
  const mode=risk==='critical'?'DEEP':risk==='standard'?'NORMAL':'FAST';
  const rulesTotal=files.filter(f=>f.startsWith('rules/')&&f.endsWith('.md')).length;
  const skillsTotal=files.filter(f=>f.startsWith('skills/')&&f.endsWith('.md')).length;

  const bundle=renderBundle({
    task,mode,risk,confidence:classification.confidence,
    domains:matched.map(d=>d.id),ruleDigests,skills,sources,tests,
    validation:validationForRisk(risk),unmatched:classification.unmatched,
    cost:{rulesLoaded:ruleDigests.length,rulesTotal,skillsLoaded:skills.length,skillsTotal,
      sourceCount:sources.length,bundleTokens:0,rawTokens,reductionPercent:0},
  });

  // Measure the rendered bundle, then restamp so the printed cost is the real
  // one rather than a prediction of itself.
  const bundleTokens=words(bundle);
  const reductionPercent=rawTokens>0?Math.max(0,Math.round((1-bundleTokens/rawTokens)*100)):0;
  const final=renderBundle({
    task,mode,risk,confidence:classification.confidence,
    domains:matched.map(d=>d.id),ruleDigests,skills,sources,tests,
    validation:validationForRisk(risk),unmatched:classification.unmatched,
    cost:{rulesLoaded:ruleDigests.length,rulesTotal,skillsLoaded:skills.length,skillsTotal,
      sourceCount:sources.length,bundleTokens,rawTokens,reductionPercent},
  });

  return {task,mode,risk,confidence:classification.confidence,
    domains:matched.map(d=>d.id),unmatched:classification.unmatched,
    sources,tests,rules:ruleIds,skills,bundle:final,bundleTokens,rawTokens,reductionPercent};
}
async function build(){const files=await walk(),source=await text('knowledge/bootstrap-source.md');await put('.ai/BOOTSTRAP.md',`<!-- GENERATED: scripts/knowledge/cli.mjs; DO NOT EDIT -->\n${source.replace(/^---[\s\S]*?---\s*/,'')}`);const records=[];for(const file of files){if(!textExt.has(path.extname(file))&&!['package.json','.env.example','.gitignore','.editorconfig'].includes(file))continue;const content=(await text(file)).replace(/\r\n/g,'\n');records.push({path:file,bytes:Buffer.byteLength(content),hash:sha(content)});}const sourceFiles=records.filter(x=>x.path.startsWith('src/')),tests=records.filter(x=>x.path.startsWith('tests/')),docs=records.filter(x=>x.path.endsWith('.md'));await put('.ai/profiles/project.json',{name:'FoodOrderV1',stack:['React','TypeScript','Vite','Capacitor','Firebase'],architecture:'pure domain plus adapters and route presentation',generatedFrom:['knowledge/project-profile.yaml','package.json']});await put('.ai/manifests/repository.json',{generatedFrom:['repository'],files:records});const derived=discoverDomains(files);await put('.ai/manifests/modules.json',{generatedFrom:['scripts/knowledge/routing.mjs'],modules:derived.map(d=>({id:d.id,paths:d.paths,risk:d.risk,tests:testsForDomains([d],files)}))});await put('.ai/manifests/tests.json',{tests});await put('.ai/indexes/task-types.json',{generatedFrom:['scripts/knowledge/routing.mjs'],taskTypes:derived.map(d=>({id:d.id,risk:d.risk,keys:d.keys,paths:d.paths}))});await put('.ai/graphs/source-test-graph.json',{edges:sourceFiles.map(s=>({source:s.path,tests:tests.filter(t=>t.path.includes(path.basename(s.path,'.ts'))).map(t=>t.path),relationship:'inferred'}))});await put('.ai/hashes/source.json',Object.fromEntries(sourceFiles.map(x=>[x.path,x.hash])));await put('.ai/hashes/documents.json',Object.fromEntries(docs.map(x=>[x.path,x.hash])));await put('.ai/reports/token-usage.json',{bootstrapTokens:words(source),generatedAt:new Date().toISOString()});console.log(`Knowledge build complete: ${records.length} files indexed.`);}
async function validate(){const files=await walk(),errors=[];for(const required of ['.ai/BOOTSTRAP.md','knowledge/project-profile.yaml','knowledge/authority-map.yaml','package.json','src/main.tsx','tests/domain/order.test.ts'])if(!existsSync(path.join(root,required)))errors.push(`Missing ${required}`);const pkg=JSON.parse(await text('package.json'));for(const cmd of ['knowledge:build','knowledge:context','knowledge:validate','typecheck','test','build'])if(!pkg.scripts?.[cmd])errors.push(`Missing script ${cmd}`);const docs=files.filter(f=>f.endsWith('.md')&&!f.startsWith('.ai/'));const ids=new Map();for(const file of docs){const c=await text(file),m=c.match(/^---[\s\S]*?\nid:\s*([^\n]+)[\s\S]*?---/);if(m){if(ids.has(m[1]))errors.push(`Duplicate id ${m[1]}: ${ids.get(m[1])}, ${file}`);ids.set(m[1],file);}}await put('.ai/reports/validation.json',{ok:!errors.length,errors,checkedAt:new Date().toISOString()});if(errors.length){console.error(errors.join('\n'));process.exit(1);}console.log(`Knowledge validation passed for ${docs.length} documents.`);}
// Cache key: the task plus the exact tree state. Any edit, staged or not,
// changes the key, so a stale bundle can never be served.
function repoFingerprint(){
  try{
    const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
    // Generated context is an output, not an input. Without this filter the
    // bundle written by the previous run dirties the tree and every lookup
    // misses its own cache.
    const dirty=execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'})
      .split('\n').filter(line=>line.trim()&&!/\s\.ai\//u.test(line)).join('\n');
    return sha(`${head}\n${dirty}`);
  }catch{return 'nogit';}
}

async function context(){
  const task=arg('task')||argv.slice(1).filter(v=>!v.startsWith('--')).join(' ');
  if(!task)throw new Error('Provide --task="..."');

  const cacheFile='.ai/local/context-cache.json';
  const key=sha(`${task}\n${repoFingerprint()}`);
  if(!flag('no-cache')&&existsSync(path.join(root,cacheFile))){
    try{
      const cached=JSON.parse(await text(cacheFile));
      if(cached.key===key){
        await put('.ai/context/current.md',cached.result.bundle);
        if(flag('json')){console.log(JSON.stringify(cached.result,null,2));return;}
        if(flag('print')){process.stdout.write(cached.result.bundle);return;}
        const r=cached.result;
        console.log([
          'Context compiled: .ai/context/current.md (CACHE HIT)',
          `mode=${r.mode} risk=${r.risk} domain=${r.domains.join(',')||'unresolved'} confidence=${r.confidence}`,
          `sources=${r.sources.length} rules=${r.rules.length} tests=${r.tests.length}`,
          `~${r.bundleTokens} tokens (vs ~${r.rawTokens} reading the sources; -${r.reductionPercent}%)`,
        ].join('\n'));
        return;
      }
    }catch{/* a damaged cache is simply a miss */}
  }

  const result=await compile(task);
  await put(cacheFile,{key,result});
  await put('.ai/context/current.md',result.bundle);
  if(flag('json')){console.log(JSON.stringify(result,null,2));return;}
  if(flag('print')){process.stdout.write(result.bundle);return;}
  // Default output is a receipt, not the bundle: printing both would charge the
  // caller twice for the same content.
  console.log([
    `Context compiled: .ai/context/current.md`,
    `mode=${result.mode} risk=${result.risk} domain=${result.domains.join(',')||'unresolved'} confidence=${result.confidence}`,
    `sources=${result.sources.length} rules=${result.rules.length} tests=${result.tests.length}`,
    `~${result.bundleTokens} tokens (vs ~${result.rawTokens} reading the sources; -${result.reductionPercent}%)`,
    result.unmatched?'WARNING: no domain matched; scope is not authoritative.':'',
  ].filter(Boolean).join('\n'));
}
async function benchmark(){const tasks=['fix bucket title validation','add order status filter','change Firestore ownership rules','add Capacitor haptic feedback','add a new locale to the public site'];const times=[],results=[];for(const task of tasks){const start=performance.now(),r=await compile(task),ms=performance.now()-start;times.push(ms);results.push({task,ms:Number(ms.toFixed(2)),domains:r.domains,sources:r.sources.length,bundleTokens:r.bundleTokens,rawTokens:r.rawTokens,reductionPercent:r.reductionPercent,unmatched:r.unmatched});}times.sort((a,b)=>a-b);const unresolved=results.filter(r=>r.unmatched).length;if(unresolved>0)throw new Error(`${unresolved} benchmark task(s) failed to resolve a domain.`);const report={p50Ms:Number(times[Math.floor(times.length*.5)].toFixed(2)),p95Ms:Number(times[Math.min(times.length-1,Math.floor(times.length*.95))].toFixed(2)),medianReductionPercent:results.map(r=>r.reductionPercent).sort((a,b)=>a-b)[Math.floor(results.length/2)],results};await put('.ai/reports/context-performance.json',report);console.log(`Context benchmark: p50=${report.p50Ms}ms p95=${report.p95Ms}ms medianReduction=${report.medianReductionPercent}%`);}
async function simpleReport(name,data){await put(`.ai/reports/${name}.json`,data);console.log(JSON.stringify(data,null,2));}
try{if(command==='build')await build();else if(command==='validate')await validate();else if(command==='context')await context();else if(command==='classify'){const t=arg('task')||argv.slice(1).filter(v=>!v.startsWith('--')).join(' ');console.log(JSON.stringify(classifyTask(t,discoverDomains(trackedFiles())),null,2));}else if(command==='benchmark')await benchmark();else if(command==='stale')await simpleReport('stale-items',{items:[],note:'Source-triggered review is defined in knowledge/freshness-policy.yaml'});else if(command==='contradictions')await simpleReport('contradictions',{items:[]});else if(command==='duplicates')await simpleReport('duplicate-topics',{items:[]});else if(command==='orphans')await simpleReport('orphans',{items:[]});else if(command==='report'){await validate();await benchmark();}else console.log('Commands: build, validate, context, classify, benchmark, stale, contradictions, duplicates, orphans, report');}catch(error){console.error(error instanceof Error?error.stack:error);process.exit(1);}
