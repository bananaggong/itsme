// Fallback for this cloud environment: the Sites source workflow helper is not
// installed. Uses the native tool's short-lived credential through hidden stdin.
// No credential is written to source, Git config, disk, command args or output.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const terminal=process.stdin.isTTY;
if(terminal) spawnSync('stty',['-echo'],{stdio:'inherit'});
process.stdout.write('Ready for Sites source credential JSON on stdin (input is hidden).\n');
let input='';
for await(const chunk of process.stdin) {input+=chunk;if(input.includes('\n'))break;}
if(terminal) spawnSync('stty',['echo'],{stdio:'inherit'});
const {credential,action='probe'}=JSON.parse(input);
input='';
const project=JSON.parse(readFileSync('.openai/hosting.json','utf8')).project_id;
const remote=new URL(credential.remote_url);
if(credential.auth_mode!=='http_extra_header' || remote.protocol!=='https:' || remote.username || remote.password || !remote.pathname.includes(project)) throw new Error('Unexpected Site source target or authentication mode');
if(!['probe','push'].includes(action)) throw new Error('Expected probe or push');
const taskEnv={...process.env,GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:`http.${remote.origin}/.extraHeader`,GIT_CONFIG_VALUE_0:`Authorization: Bearer ${credential.token}`};
const args=action==='probe'?['ls-remote',credential.remote_url]:['push',credential.remote_url,`HEAD:refs/heads/${credential.branch}`];
const result=spawnSync('git',['-c','credential.helper=',...args],{env:taskEnv,encoding:'utf8'});
if(result.status!==0) {process.stderr.write((result.stderr || 'Source operation failed').replaceAll(credential.token,'[redacted]'));process.exit(result.status || 1);}
if(action==='probe') console.log('Site source authentication succeeded.');
else console.log(JSON.stringify({project_id:project,commit_sha:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),source_pushed:true}));
