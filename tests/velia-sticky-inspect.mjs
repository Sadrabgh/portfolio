import {server,origin,launch} from './v10-common.mjs';
const browser=await launch();
try{
 const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await p.goto(origin+'/demo/velia/products/facial-cleanser/',{waitUntil:'networkidle'});
 await p.locator('.skin-related').scrollIntoViewIfNeeded();
 await p.waitForTimeout(300);
 console.log(await p.evaluate(()=>{const e=document.querySelector('[data-mobile-purchase]'),r=document.querySelector('.skin-product-purchase').getBoundingClientRect();return {hidden:e.hidden,display:getComputedStyle(e).display,purchaseY:r.y,purchaseBottom:r.bottom,scrollY};}));
 await p.screenshot({path:'output/playwright/velia/product-sticky-inspected.png'});
}finally{await browser.close();server.close();}
