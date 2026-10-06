import fs from "node:fs/promises";
import sharp from "sharp";
const base = "output/playwright/velia-motion";
const afterFrames = process.argv[2] || `${base}/frames-after`;
const suffix = process.argv[3] || "";
for (const stage of ["before", "after"]) {
  const dir = stage === "after" ? afterFrames : `${base}/frames-before`;
  const files = (await fs.readdir(dir))
    .filter((f) => f.endsWith(".png"))
    .sort();
  const chosen = Array.from({ length: 20 }, (_, i) =>
    Math.round((i * (files.length - 1)) / 19),
  );
  const items = [];
  for (let i = 0; i < chosen.length; i++) {
    const x = (i % 4) * 480,
      y = Math.floor(i / 4) * 354;
    items.push({
      input: await sharp(`${dir}/${files[chosen[i]]}`)
        .resize(480, 333)
        .png()
        .toBuffer(),
      left: x,
      top: y + 21,
    });
    const label = `${stage} ${(chosen[i] / 4).toFixed(2)}s`;
    items.push({
      input: Buffer.from(
        `<svg width="480" height="21"><rect width="480" height="21" fill="#202220"/><text x="10" y="15" font-size="12" fill="#fff">${label}</text></svg>`,
      ),
      left: x,
      top: y,
    });
  }
  await sharp({
    create: { width: 1920, height: 1770, channels: 3, background: "#fff" },
  })
    .composite(items)
    .png()
    .toFile(`${base}/${stage}-timeline${suffix}.png`);
}
const frames = [];
for (const [row, stage] of ["before", "after"].entries()) {
  for (let i = 0; i < 8; i++) {
    const name = `frame-${String(i + 1).padStart(3, "0")}.png`;
    frames.push({
      input: await sharp(
        `${stage === "after" ? afterFrames : `${base}/frames-before`}/${name}`,
      )
        .resize(360, 250)
        .png()
        .toBuffer(),
      left: (i % 4) * 360,
      top: (row * 2 + Math.floor(i / 4)) * 270 + 20,
    });
  }
}
await sharp({
  create: { width: 1440, height: 1080, channels: 3, background: "#e9e7ed" },
})
  .composite(frames)
  .png()
  .toFile(`${base}/intro-comparison${suffix}.png`);
console.log("Motion timeline contact sheets created.");
