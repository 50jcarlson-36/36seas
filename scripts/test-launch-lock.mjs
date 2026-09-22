import {mkdtempSync,mkdirSync,writeFileSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=mkdtempSync(join(tmpdir(),'launch-lock-test-'));
try{
 execFileSync('git',['init','-q',root]);
 for(const p of ['src','scripts','docs/contracts'])mkdirSync(join(root,p),{recursive:true});
 copyFileSync(new URL('./check-launch-lock.mjs',import.meta.url),join(root,'scripts/check-launch-lock.mjs'));
 writeFileSync(join(root,'src/example.ts'),'approved');
 writeFileSync(join(root,'docs/contracts/launch-lock.json'),JSON.stringify({applicationVersion:'fixture',applicationCommit:'test',protectedPaths:['src'],files:{'src/example.ts':createHash('sha256').update('approved').digest('hex')}}));
 const check=()=>spawnSync(process.execPath,[join(root,'scripts/check-launch-lock.mjs')],{encoding:'utf8'});
 assert.equal(check().status,0);
 writeFileSync(join(root,'src/example.ts'),'unapproved edit');assert.equal(check().status,1);
 writeFileSync(join(root,'src/example.ts'),'approved');writeFileSync(join(root,'src/new.ts'),'unapproved addition');assert.equal(check().status,1);
 rmSync(join(root,'src/new.ts'));rmSync(join(root,'src/example.ts'));assert.equal(check().status,1);
 console.log('PASS lock detects modified, added and deleted protected files.');
}finally{rmSync(root,{recursive:true,force:true});}
