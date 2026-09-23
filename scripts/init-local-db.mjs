import { execFileSync } from "node:child_process";
// Runs only inside this Compose project's local MongoDB container. No Atlas URI.
execFileSync(
  "docker",
  [
    "compose",
    "exec",
    "-T",
    "mongodb",
    "mongosh",
    "--quiet",
    "--eval",
    `
try { rs.status(); } catch (e) {
  if (e.code !== 94) throw e;
  rs.initiate({_id:'aproop-rs',members:[{_id:0,host:'localhost:27017'}]});
}
let ready=false;
for(let i=0;i<60;i++) {
  if(db.hello().isWritablePrimary){ready=true;break;}
  sleep(500);
}
if(!ready)throw new Error('Local replica set did not become writable');
print('Local Aproop MongoDB replica set is ready on port 27019.');
`,
  ],
  { stdio: "inherit" },
);
