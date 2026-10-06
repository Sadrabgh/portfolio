import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { server, origin } from "./v10-common.mjs";
const base = "output/avan/tools/lighthouse/node_modules";
const { default: lighthouse } = await import(
  pathToFileURL(path.resolve(base, "lighthouse/core/index.js"))
);
const { launch } = await import(
  pathToFileURL(path.resolve(base, "chrome-launcher/dist/index.js"))
);
const directory = "output/avan/verification/lighthouse";
await fs.mkdir(directory, { recursive: true });
const runs = [];
let chrome;
try {
  chrome = await launch({
    chromePath: process.env.BROWSER_EXECUTABLE,
    chromeFlags: ["--headless", "--disable-gpu"],
  });
  for (let i = 1; i <= 3; i++) {
    const result = await lighthouse(origin + "/demo/avan/", {
      port: chrome.port,
      logLevel: "error",
      output: "json",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    });
    const lhr = result.lhr;
    await fs.writeFile(
      `${directory}/mobile-${i}.json`,
      JSON.stringify(lhr, null, 2),
    );
    const run = {
      run: i,
      performance: lhr.categories.performance.score * 100,
      accessibility: lhr.categories.accessibility.score * 100,
      bestPractices: lhr.categories["best-practices"].score * 100,
      lcp: lhr.audits["largest-contentful-paint"].numericValue,
      cls: lhr.audits["cumulative-layout-shift"].numericValue,
      version: lhr.lighthouseVersion,
      userAgent: lhr.environment.hostUserAgent,
      settings: lhr.configSettings,
      failures: Object.values(lhr.audits)
        .filter(
          (a) => a.score !== null && a.score < 1 && a.details?.items?.length,
        )
        .map((a) => ({
          id: a.id,
          title: a.title,
          score: a.score,
          displayValue: a.displayValue,
          items: a.details.items,
        })),
    };
    runs.push(run);
    console.log(
      JSON.stringify({
        run: i,
        performance: run.performance,
        accessibility: run.accessibility,
        lcp: run.lcp,
        cls: run.cls,
      }),
    );
  }
} finally {
  await chrome?.kill();
  server.close();
}
const median = (key) => runs.map((r) => r[key]).sort((a, b) => a - b)[1];
const metrics = {
  performance: median("performance"),
  lcp: median("lcp"),
  cls: median("cls"),
};
const report = {
  stage: "motion",
  status:
    metrics.performance >= 90 && metrics.lcp <= 2500 && metrics.cls <= 0.1
      ? "passed"
      : "failed",
  date: new Date().toISOString(),
  environment:
    "Installed Windows Chrome, localhost static build, Lighthouse mobile simulated network/CPU; laboratory metrics, not field INP",
  metrics,
  runs,
};
await fs.writeFile(
  "output/avan/verification/lighthouse-report.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(metrics));
assert.equal(report.status, "passed");
