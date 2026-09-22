// Approved launch baseline: detect unreviewed source/config/contract changes.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const lock=JSON.parse(readFileSync(new URL('../docs/contracts/launch-lock.json',import.meta.url),'utf8'));
const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z','--',...lock.protectedPaths],{cwd:root}).toString().split('\0').filter(Boolean);
const current={};
for(const path of [...new Set(paths)].sort()){
 try{current[path]=createHash('sha256').update(readFileSync(root+path)).digest('hex');}catch{current[path]='MISSING';}
}
const changes=[...new Set([...Object.keys(lock.files),...Object.keys(current)])].filter(path=>lock.files[path]!==current[path]);
if(changes.length){console.error('Launch contract drift: '+changes.join(', '));console.error('Do not refresh this lock just to pass CI. Record the authorized decision, affected contracts, tests and rollout/rollback evidence first.');process.exit(1);}
console.log(`PASS launch lock: ${paths.length} files match ${lock.applicationVersion} baseline (${lock.applicationCommit}).`);
