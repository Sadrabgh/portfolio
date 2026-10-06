import fs from 'node:fs/promises';
import sharp from 'sharp';
const source='C:/Users/-User-/.codex/generated_images/01a10133-6a4b-7421-8f25-affe52720af0/';
const assets={hero:'exec-33af3f16-03de-4f5e-a276-4aa80e8fd040.png',cleanser:'exec-43fb92ae-b434-4109-9eed-f49a30dc0742.png',foam:'exec-5a07a1da-10c5-492b-b077-8768f26a3dd0.png',serum:'exec-aa6c1db0-5297-4498-8417-1730df15c8e7.png',cream:'exec-7178877d-488c-44a0-905d-dfa9a66c2535.png',tube:'exec-89930dcf-70e9-4289-a0bd-5ee607d85f38.png',lotion:'exec-ae928579-b663-424a-8019-844e20e9887d.png',editorial:'exec-b43a9200-331c-4342-a95b-521a3a967687.png'};
await fs.mkdir('public/art/velia',{recursive:true});
await fs.mkdir('output/playwright/velia',{recursive:true});
const layers=[];
for(const [i,[name,file]] of Object.entries(assets).entries()){
 const image=sharp(source+file); const meta=await image.metadata();
 await image.resize({width:name==='hero'?1200:name==='editorial'?1600:800,withoutEnlargement:true}).webp({quality:88,alphaQuality:100}).toFile(`public/art/velia/${name}.webp`);
 const preview=await sharp(source+file).resize(320,320,{fit:'contain',background:'#efedf1'}).flatten({background:'#efedf1'}).png().toBuffer();
 layers.push({input:preview,left:(i%4)*320,top:Math.floor(i/4)*320});
 console.log(name,meta.width,meta.height,'alpha:',meta.hasAlpha);
}
await sharp({create:{width:1280,height:640,channels:3,background:'#efedf1'}}).composite(layers).png().toFile('output/playwright/velia/art-contact.png');
await fs.writeFile('public/art/velia/sources.json',JSON.stringify({generator:'Built-in Imagegen',brand:'VELIA — original fictional concept',sources:assets,promptSet:{common:'Photorealistic premium studio product photography. Original VELIA packaging, ivory/sage/lavender, genuinely transparent backgrounds. No existing branding or watermarks.',hero:'Amber pump bottle DAILY CLEANSE, ivory label, olive leaves and white blossom twigs.',cleanser:'Isolated amber pump bottle DAILY CLEANSE.',foam:'Isolated frosted lavender pump bottle SOFT FOAM.',serum:'Isolated green glass ivory dropper bottle DEW SERUM.',cream:'Isolated rounded ivory jar CLOUD CREAM.',tube:'Isolated sage tube DAILY SHIELD.',lotion:'Isolated blush pump bottle BODY MILK.',editorial:'Original VELIA jar and amber pump bottle on pale stone, ivory linen and olive twig; calm daylight editorial photo.'}},null,2));
