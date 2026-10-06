import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('.');
const inside = (p) => { const resolved = path.resolve(root, p); if (!resolved.startsWith(root + path.sep)) throw new Error('Outside workspace'); return resolved; };
const move = async (from, to) => { const a=inside(from), b=inside(to); await fs.mkdir(path.dirname(b),{recursive:true}); await fs.rename(a,b); };
await move('src/pages/demo/sukin','src/pages/demo/velia');
await move('src/components/sukin','src/components/velia');
await move('src/layouts/Sukin.astro','src/layouts/Velia.astro');
await move('src/data/sukin.ts','src/data/velia.ts');
await move('src/styles/sukin.css','src/styles/velia.css');
await move('src/scripts/sukin.ts','src/scripts/velia.ts');
await move('src/content/projects/sukin.md','src/content/projects/velia.md');
async function rewrite(dir) {
 for (const entry of await fs.readdir(inside(dir),{withFileTypes:true})) {
  const p=path.join(dir,entry.name);
  if(entry.isDirectory()) { await rewrite(p); continue; }
  if(!/\.(astro|ts|css|md)$/.test(entry.name)) continue;
  const old=await fs.readFile(inside(p),'utf8');
  const updated=old.replaceAll('Sukin','Velia').replaceAll('SUKIN','VELIA').replaceAll('sukin','velia').replaceAll('سوکین','وِلیا');
  if(updated!==old) await fs.writeFile(inside(p),updated);
 }
}
await rewrite('src');
await fs.copyFile(inside('src/pages/demo/velia/index.astro'),inside('src/pages/demo/velia/shop.astro'));
await fs.mkdir(inside('src/pages/demo/sukin'),{recursive:true});
await fs.writeFile(inside('src/pages/demo/sukin/index.astro'),'---\nimport {url} from "../../../config";\nreturn Astro.redirect(url("demo/velia/"));\n---\n');
await fs.writeFile(inside('src/pages/work/sukin.astro'),'---\nimport {url} from "../../config";\nreturn Astro.redirect(url("work/velia/"));\n---\n');
console.log('Moved and rebranded store source. Legacy entry URLs redirect to Velia.');
