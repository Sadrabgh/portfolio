import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {server,origin,launch} from './v10-common.mjs';
let browser;const errors=[],samples=[];let checks=0;
const ok=(v,label)=>{assert(v,label);checks++;};
try{
 browser=await launch();const p=await browser.newPage({viewport:{width:1440,height:1058},recordVideo:{dir:'output/heepzy/motion/video',size:{width:1440,height:1058}}});p.on('pageerror',e=>errors.push(e.message));
 await fs.mkdir('output/heepzy/motion',{recursive:true});
 await p.goto(origin+'/demo/rava/product/flux/',{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
 const cdp=await p.context().newCDPSession(p);await cdp.send('Animation.enable');await cdp.send('Animation.setPlaybackRate',{playbackRate:.1});
 const gallery=p.locator('main .hp-gallery');await gallery.screenshot({path:'output/heepzy/motion/gallery-before.png'});
 await p.locator('main .hp-thumbs [data-angle="2"]').click();await p.waitForTimeout(350);await gallery.screenshot({path:'output/heepzy/motion/gallery-during.png'});
 samples.push({phase:'gallery at 10% speed',...(await p.locator('main [data-product-image]').evaluate(i=>({opacity:getComputedStyle(i).opacity,source:i.getAttribute('src'),layers:i.parentElement.querySelectorAll('[data-photo-layer]').length})))});
 ok(await p.locator('main [data-product-image]').evaluate(i=>i.parentElement.querySelectorAll('[data-photo-layer]').length>0),'outgoing photo remains during slowed crossfade');
 await p.waitForTimeout(1900);ok(await p.locator('main [data-product-image]').evaluate(i=>i.complete&&i.naturalWidth>0&&getComputedStyle(i).opacity==='1'),'gallery reaches visible final state');await gallery.screenshot({path:'output/heepzy/motion/gallery-after.png'});
 await p.locator('main [data-size]').selectOption('42');await p.locator('main [data-add]').click();await p.waitForTimeout(180);await p.screenshot({path:'output/heepzy/motion/drawer-during.png'});
 samples.push({phase:'drawer at 10% speed',...(await p.locator('[data-cart-dialog]').evaluate(d=>({open:d.open,transform:getComputedStyle(d).transform,opacity:getComputedStyle(d).opacity})))});
 await p.waitForTimeout(2800);ok(await p.locator('[data-cart-dialog]').evaluate(d=>d.open&&getComputedStyle(d).opacity==='1'),'drawer enters completely');await p.screenshot({path:'output/heepzy/motion/drawer-open.png'});await cdp.send('Animation.setPlaybackRate',{playbackRate:1});await p.keyboard.press('Escape');await p.locator('dialog[open]').waitFor({state:'hidden'});ok(await p.locator('main [data-add]').evaluate(b=>b===document.activeElement),'drawer normal-speed exit restores focus');
 await p.goto(origin+'/demo/rava/catalog/',{waitUntil:'networkidle'});await cdp.send('Animation.setPlaybackRate',{playbackRate:.1});await p.locator('[name=sort]').selectOption('price-desc');await p.waitForTimeout(180);await p.locator('[data-catalog-grid]').screenshot({path:'output/heepzy/motion/filter-during.png'});
 samples.push({phase:'filter at 10% speed',animations:await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running'&&a.effect instanceof KeyframeEffect).map(a=>({duration:a.effect.getTiming().duration,properties:Object.keys(a.effect.getKeyframes()[0]),transform:getComputedStyle(a.effect.target).transform})))});
 await p.waitForTimeout(2500);ok(await p.locator('[data-catalog-grid] [data-card]:visible').first().getAttribute('data-card')==='h11','price-desc keeps final order');await cdp.send('Animation.setPlaybackRate',{playbackRate:1});
 await p.locator('[name=sort]').selectOption('newest');await p.waitForTimeout(300);ok(await p.locator('[data-catalog-grid] [data-card]:visible').first().getAttribute('data-card')==='h12','filter retargets to newest');
 await p.locator('[name=sort]').selectOption('price-asc');
 const frames=await p.evaluate(()=>new Promise(resolve=>{const frames=[];let previous=performance.now();function tick(now){const active=document.getAnimations().some(a=>a.playState==='running');frames.push({interval:now-previous,active});previous=now;if(frames.length<60)requestAnimationFrame(tick);else resolve(frames);}requestAnimationFrame(tick);}));
 const intervals=frames.map(f=>f.interval),active=frames.filter(f=>f.active).map(f=>f.interval).sort((a,b)=>a-b);
 ok(active.length>0,'normal-speed frame sample includes active filter animation');
 const sorted=intervals.slice().sort((a,b)=>a-b),timing={frames:60,medianMs:sorted[30],p95Ms:sorted[57],maxMs:Math.max(...intervals),activeFrames:active.length,activeP95Ms:active[Math.floor((active.length-1)*.95)],scope:'Local desktop Chrome: 60 normal-speed frames including active filter motion; no physical phone or universal performance claim'};
 ok(errors.length===0,'no runtime errors');const video=await p.video().path();await p.close();await fs.writeFile('output/heepzy/motion/report.json',JSON.stringify({status:'passed',checks,samples,timing,video,observed:'10% playback for gallery crossfade, drawer entry and filter FLIP. Drawer exit tested at native timing. Full interruption and reduced-motion tasks are in the storefront suite.'},null,2));console.log(JSON.stringify({status:'passed',checks,timing,video}));
}finally{await browser?.close();server.close();}

