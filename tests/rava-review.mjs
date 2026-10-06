import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {server,launch,go} from './v10-common.mjs';
const checks=[],errors=[];const ok=(v,m)=>{assert(v,m);checks.push(m);};
const browser=await launch();
const seed=async(p)=>{await go(p,'/demo/rava/cart/');await p.evaluate(()=>localStorage.setItem('rava-cart-v1',JSON.stringify({version:1,items:[{sku:'h01-brown-42',quantity:1},{sku:'h05-orange-39',quantity:1}],promotionCode:null})));await p.reload({waitUntil:'networkidle'});};
try{
 for(const width of [390,1440]){
  const ctx=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),p=await ctx.newPage();p.on('pageerror',e=>errors.push({url:p.url(),message:e.message}));
  await seed(p);await p.locator('[data-open-cart]').click();
  const d=p.locator('[data-cart-dialog]');
  const plus=d.locator('[data-row-sku="h01-brown-42"] [data-quantity-action=plus]');
  await plus.focus();await p.keyboard.press('Enter');
  ok(await plus.evaluate(b=>b===document.activeElement),'drawer quantity retains own focus '+width);
  await d.locator('[data-row-sku="h01-brown-42"] .hp-row-remove').focus();await p.keyboard.press('Enter');
  ok(await d.locator('[data-row-sku="h05-orange-39"] .hp-row-remove').evaluate(b=>b===document.activeElement),'removed row focuses next drawer row '+width);
  ok(await d.locator('[data-toast] [data-undo]').isVisible(),'undo belongs to active drawer '+width);
  await d.locator('[data-toast] [data-undo]').click();
  ok((await d.locator('[data-row-sku]').count())===2,'mouse undo without closing drawer '+width);
  await d.locator('[data-row-sku="h01-brown-42"] .hp-row-remove').focus();await p.keyboard.press('Enter');
  await d.locator('[data-undo]').focus();await p.keyboard.press('Enter');
  ok((await d.locator('[data-row-sku]').count())===2&&await d.evaluate(e=>e.contains(document.activeElement)&&document.activeElement!==document.body),'keyboard undo restores reachable drawer focus '+width);
  for(const sku of ['h05-orange-39','h01-brown-42']){await d.locator('[data-row-sku="'+sku+'"] .hp-row-remove').focus();await p.keyboard.press('Enter');}
  ok(await d.locator('[data-cart-empty] a').evaluate(e=>e===document.activeElement),'drawer empty action receives focus '+width);
  await p.keyboard.press('Escape');
  await seed(p);await p.locator('main [data-row-sku="h01-brown-42"] .hp-row-remove').focus();await p.keyboard.press('Enter');
  ok(await p.locator('main [data-row-sku="h05-orange-39"] .hp-row-remove').evaluate(e=>e===document.activeElement),'page delete focuses remaining row '+width);
  await p.locator('main .hp-row-remove').focus();await p.keyboard.press('Enter');
  ok(await p.locator('main [data-cart-empty] a').evaluate(e=>e===document.activeElement),'page empty action receives focus '+width);
  await go(p,'/demo/rava/product/route/');await p.locator('main [data-product] [data-favourite]').click();await go(p,'/demo/rava/favourites/');await p.locator('main [data-favourite=h01]').focus();await p.keyboard.press('Enter');
  ok(await p.locator('[data-favourites-empty] a').evaluate(e=>e===document.activeElement),'last favourite removal keeps focus reachable '+width);
  await ctx.close();
 }
 for(const destination of ['local','session']){
  const ctx=await browser.newContext({reducedMotion:'reduce'});
  await ctx.addInitScript(()=>{
   const local=window.localStorage,session=window.sessionStorage;
   Object.defineProperty(window,'localStorage',{configurable:true,get(){if(!document.cookie.includes('ravaAllowLocal=1'))throw new DOMException('blocked','SecurityError');return local;}});
   Object.defineProperty(window,'sessionStorage',{configurable:true,get(){if(!document.cookie.includes('ravaAllowSession=1'))throw new DOMException('blocked','SecurityError');return session;}});
  });
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push({url:p.url(),message:e.message}));
  await go(p,'/demo/rava/product/route/');
  await p.locator('main [data-product] [data-favourite]').click();await p.locator('main [data-size]').selectOption('42');await p.locator('main [data-add]').click();
  const d=p.locator('[data-cart-dialog]');await d.locator('[data-coupon-input]').fill('RAVA10');await d.locator('[data-coupon-apply]').click();
  ok((await d.locator('[data-checkout-link]').getAttribute('aria-disabled'))==='true','memory checkout blocked before restoration '+destination);
  await p.keyboard.press('Escape');
  await p.evaluate(k=>{document.cookie='ravaAllow'+(k==='local'?'Local':'Session')+'=1; path=/';},destination);
  await p.locator('[data-storage-retry]').click();
  const saved=await p.evaluate(k=>({cart:JSON.parse(window[k+'Storage'].getItem('rava-cart-v1')),favourites:JSON.parse(window[k+'Storage'].getItem('rava-favourites-v1'))}),destination);
  ok(saved.cart.items[0].sku==='h01-brown-42'&&saved.cart.promotionCode==='RAVA10'&&saved.favourites.includes('h01'),'retry migrates existing memory cart coupon favourites '+destination);
  await p.locator('[data-open-cart]').click();
  ok((await d.locator('[data-checkout-link]').getAttribute('aria-disabled'))==='false','retry enables checkout '+destination);
  await d.locator('[data-checkout-link]').click();await p.waitForURL('**/demo/rava/checkout/');
  ok(await p.locator('main [data-coupon-input]').inputValue()==='RAVA10','restored cart survives navigation '+destination);
  await ctx.close();
 }
 ok(errors.length===0,'no runtime errors in B regression scenarios '+JSON.stringify(errors));
 const report={status:'passed',date:new Date().toISOString(),checks:checks.length,labels:checks,widths:[390,1440],errors};
 await fs.writeFile('output/heepzy/b-fixes-test-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();server.close();}
