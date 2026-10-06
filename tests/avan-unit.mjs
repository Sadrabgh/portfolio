import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
await fs.mkdir("output/avan/verification", { recursive: true });
const outfile = path.resolve("output/avan/verification/logic-under-test.mjs");
await build({
  stdin: {
    contents: [
      "export * from './src/data/avan';",
      "export * from './src/lib/avan/catalog';",
      "export * from './src/lib/avan/pricing';",
      "export * from './src/lib/avan/storage';",
      "export * from './src/lib/avan/comparison';",
      "export * from './src/lib/avan/checkout';",
    ].join("\n"),
    resolveDir: process.cwd(),
  },
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
});
const m = await import(pathToFileURL(outfile).href + "?" + Date.now());
let checks = 0;
const equal = (actual, expected, label) => {
  assert.deepEqual(actual, expected, label);
  checks++;
};
const ok = (value, label) => {
  assert(value, label);
  checks++;
};
equal(m.products.length, 10, "ten models");
equal(
  new Set(m.products.flatMap((p) => p.variants.map((v) => v.id))).size,
  20,
  "twenty unique SKUs",
);
for (const [subtotal, coupon, total, discount, shipping] of [
  [2000000, "AVAN10", 1900000, 200000, 100000],
  [8000000, "", 8000000, 0, 0],
  [8000000, "AVAN10", 7500000, 600000, 100000],
  [8700000, "AVAN10", 8100000, 600000, 0],
  [8599999, "AVAN10", 8099999, 600000, 100000],
  [8600000, "AVAN10", 8000000, 600000, 0],
  [0, "AVAN10", 0, 0, 0],
]) {
  const v = m.calculatePricing(subtotal, coupon);
  equal(
    [v.total, v.discount, v.shipping],
    [total, discount, shipping],
    "independent money example " + subtotal + coupon,
  );
}
assert.throws(() => m.calculatePricing(1.5));
checks++;
assert.throws(() => m.calculatePricing(-1));
checks++;
equal(
  m.normalizeText("  ايـرباد ك ۱۲٣ "),
  "ایـرباد ک 123",
  "Persian/Arabic digits and letters",
);
equal(m.parseAmount("۸٬۷۰۰٬۰۰۰"), 8700000, "Persian amount");
equal(m.parseAmount("-50"), undefined, "negative amount rejected");
const query = (text) => m.parseQuery(new URLSearchParams(text)),
  ids = (q) => m.catalogResults(q).map((r) => r.product.id);
equal(
  ids(query("category=headphones&color=ivory&stock=1&priceMax=4000000")),
  [],
  "same SKU color price stock intersection",
);
equal(
  ids(query("category=headphones&color=ivory&priceMax=4000000")),
  ["h02"],
  "unavailable variant discoverable",
);
equal(
  ids(query("category=headphones,earbuds&anc=1")),
  ["h01", "e01"],
  "OR within category and AND ANC",
);
equal(ids(query("use=sport&category=headphones")), [], "AND across groups");
equal(ids(query("q=H۰۱")), ["h01"], "Persian code search");
equal(ids(query("q=ایرباد")), ["e01", "e02", "e03"], "title search");
equal(query("category=speakers&anc=1").anc, false, "inapplicable ANC cleared");
equal(query("q=first&q=second").q, "first", "scalar repeated first wins");
equal(
  query("color=ivory&color=graphite,ivory&color=x").color,
  ["graphite", "ivory"],
  "list repeats dedup allowlist",
);
equal(
  query("priceMin=۷۰۰۰۰۰۰&priceMax=۴۰۰۰۰۰۰").priceMin,
  4000000,
  "reversed range canonical",
);
equal(
  query("priceMin=NaN&sort=evil&stock=true&category=evil").sort,
  "recommended",
  "unknown inputs sanitized",
);
equal(
  query(
    m.queryParams(query("q=<script>&category=earbuds&color=ivory")).toString(),
  ).q,
  "<script>",
  "safe URL encoding round trip",
);
equal(m.comparisonDecision([], "a01"), "invalid", "accessory excluded");
equal(m.comparisonDecision(["h01"], "h01"), "duplicate", "duplicate compare");
equal(
  m.comparisonDecision(["h01"], "e01"),
  "different-group",
  "different group confirmation",
);
equal(
  m.sanitizeComparison(["h01", "evil", "h01", "h02", "e01", "h03"]),
  ["h01", "h02", "h03"],
  "persisted comparison cleaned",
);
const fourth = structuredClone(m.products[0]);
fourth.id = "h04";
m.products.push(fourth);
equal(
  m.comparisonDecision(["h01", "h02", "h03"], "h04"),
  "limit",
  "fourth model fixture limit",
);
m.products.pop();
const cleaned = m.sanitizeState({
  version: 1,
  cart: [
    { sku: "h01-graphite", quantity: 2, priceAtAdd: 1 },
    { sku: "h01-graphite", quantity: 99 },
    { sku: "h02-ivory", quantity: 1 },
    { sku: "unknown", quantity: 1 },
    { sku: "e01-ivory", quantity: 1.5 },
    { sku: "e02-graphite", quantity: -1 },
  ],
  wishlist: ["h01", "unknown", "h01"],
  compare: ["a01", "h01", "e01"],
  coupon: "avan10",
  name: "must drop",
});
equal(
  cleaned.state.cart,
  [{ sku: "h01-graphite", quantity: 7, priceAtAdd: 6200000 }],
  "invalid stock/quantity/prices cleaned",
);
equal(cleaned.state.wishlist, ["h01"], "wishlist normalized");
equal(cleaned.state.compare, ["h01"], "same group normalized");
equal(cleaned.state.coupon, "AVAN10", "coupon canonical");
ok(
  !JSON.stringify(cleaned.state).includes("must drop"),
  "unknown private payload discarded",
);
ok(cleaned.notices.length > 0, "repair notices");
equal(
  m.sanitizeState({ version: 0, items: [{ sku: "e02-ivory", qty: 2 }] }).state
    .cart,
  [{ sku: "e02-ivory", quantity: 2, priceAtAdd: 2700000 }],
  "version zero migration",
);
equal(
  m.sanitizeState({ version: 900 }).state,
  m.emptyState(),
  "unknown version reset",
);
class Storage {
  map = new Map();
  blocked = false;
  getItem(k) {
    if (this.blocked) throw Error("blocked");
    return this.map.get(k) ?? null;
  }
  setItem(k, v) {
    if (this.blocked) throw Error("blocked");
    this.map.set(k, v);
  }
  removeItem(k) {
    if (this.blocked) throw Error("blocked");
    this.map.delete(k);
  }
}
const localStorage = new Storage(),
  sessionStorage = new Storage(),
  host = { localStorage, sessionStorage };
localStorage.setItem(m.STATE_KEY, "{broken");
let store = new m.AvanStore(host);
equal(store.mode, "local", "local storage");
ok(store.notices.length > 0, "corrupt JSON announces reset");
store.add("h03-ivory", 99);
equal(store.state.cart[0].quantity, 1, "stock one add clamped");
store.add("h03-graphite", 1);
equal(store.state.cart.length, 2, "colors separate");
store.add("h03-graphite", 1);
equal(store.state.cart[1].quantity, 2, "same SKU merged");
store.update("h03-graphite", 999);
equal(store.state.cart[1].quantity, 3, "update max stock");
localStorage.blocked = true;
store.save();
equal(store.mode, "session", "local quota fallback session");
sessionStorage.blocked = true;
store.save();
equal(store.mode, "memory", "both blocked fallback memory");
equal(store.state.cart.length, 2, "memory cart preserved");
const receipt = {
  version: 1,
  id: "AV-unit-1234",
  createdAt: new Date().toISOString(),
  items: store.state.cart,
  coupon: "AVAN10",
  amounts: { total: 1 },
  phone: "never save",
};
equal(store.saveReceipt(receipt), false, "receipt session unavailable");
ok(store.receipt, "memory receipt exists");
ok(
  !JSON.stringify(store.receipt).includes("never save"),
  "PII stripped from receipt",
);
equal(
  store.receipt.amounts.total,
  18300000,
  "receipt recomputes authoritative prices",
);
equal(m.sanitizeReceipt({}), null, "missing receipt empty");
equal(
  m.recipientErrors({
    name: "نام نمونه",
    phone: "۰۹۱۲۳۴۵۶۷۸۹",
    city: "تهران",
    postal: "۱۲۳۴۵۶۷۸۹۰",
    address: "نشانی کاملاً نمونه",
  }),
  {},
  "Persian recipient digits",
);
equal(
  Object.keys(
    m.recipientErrors({
      name: "",
      phone: "1",
      city: "",
      postal: "x",
      address: "",
    }),
  ).length,
  5,
  "all invalid fields reported",
);
await fs.writeFile(
  "output/avan/verification/commerce-unit-report.json",
  JSON.stringify(
    {
      status: "passed",
      checks,
      scope:
        "Actual bundled pure logic with independent pricing values, query/SKU intersection, comparison, storage migration and blocked fallback, receipt privacy, recipient validation",
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ status: "passed", checks }));
