import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

var outDir = resolve("docs/screenshots");
var baseUrl = process.env.BVR_URL || "http://127.0.0.1:5173/buy-vs-rent/";

var jobs = [
  { lang: "zh", full: "zh-full.png", chart: "zh-net-worth.png", heatmap: "zh-heatmap.png" },
  { lang: "en", full: "en-full.png", chart: "en-net-worth.png", heatmap: "en-heatmap.png" },
];

await mkdir(outDir, { recursive: true });

var browser = await chromium.launch({ headless: true });
for (var i = 0; i < jobs.length; i++) {
  var job = jobs[i];
  var page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(baseUrl + "?lang=" + job.lang, { waitUntil: "networkidle" });
  await delay(2000);

  await page.screenshot({ path: join(outDir, job.full), fullPage: true });
  console.log("full " + job.lang + " -> " + job.full);

  await page.locator("#screenshot-chart").scrollIntoViewIfNeeded();
  await delay(500);
  await page.locator("#screenshot-chart").screenshot({ path: join(outDir, job.chart) });
  console.log("chart " + job.lang + " -> " + job.chart);

  await page.locator("#screenshot-heatmap").scrollIntoViewIfNeeded();
  await delay(500);
  await page.locator("#screenshot-heatmap").screenshot({ path: join(outDir, job.heatmap) });
  console.log("heatmap " + job.lang + " -> " + job.heatmap);

  await page.close();
}
await browser.close();
console.log("README embeds only *-net-worth.png and *-heatmap.png");
