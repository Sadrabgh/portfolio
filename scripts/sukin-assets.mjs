import fs from "node:fs/promises";
import sharp from "sharp";
const directory = "public/art/sukin";
await fs.mkdir(directory, { recursive: true });
const sources = [
  [
    "cream-cleanser",
    "https://sukinnaturals.com/cdn/shop/products/Signature_Cream_Cleanser_125ml_01_Product.jpg?v=1599504664&width=900",
  ],
  [
    "cream-botanical",
    "https://sukinnaturals.com/cdn/shop/products/Signature_Cream_Cleanser_125ml_OH_01.jpg?v=1599504664&width=1000",
  ],
  [
    "daily-moisturiser",
    "https://sukinnaturals.com/cdn/shop/products/Signature_Facial_Moisturiser_125ml_01_Product.jpg?v=1599504612&width=900",
  ],
  [
    "cleansing-oil",
    "https://sukinnaturals.com/cdn/shop/files/Signature_Cleansing_Oil_Cap_125mL_01.webp?v=1729792842&width=900",
  ],
  [
    "foaming-cleanser",
    "https://sukinnaturals.com/cdn/shop/products/Signature_Foaming_Facial_Cleanser_125ml_01_Product.jpg?v=1599504600&width=900",
  ],
  [
    "green-moisturiser",
    "https://sukinnaturals.com/cdn/shop/products/Super_Greens_Nutrient_Rich_Facial_Moisturiser_125ml_01_Product_Base.jpg?v=1599504594&width=900",
  ],
  [
    "rosehip-oil",
    "https://sukinnaturals.com/cdn/shop/products/Sukin_Rosehip_Oil-25ml-Product.jpg?v=1599504623&width=900",
  ],
  [
    "recovery-serum",
    "https://sukinnaturals.com/cdn/shop/products/Super_Greens_Facial_Recovery_Serum_30ml_01_Product.jpg?v=1599504591&width=900",
  ],
];
const outcomes = await Promise.allSettled(
  sources.map(async ([id, source]) => {
    const response = await fetch(source);
    if (
      !response.ok ||
      !response.headers.get("content-type")?.startsWith("image/")
    )
      throw new Error(id + ": " + response.status);
    const bytes = Buffer.from(await response.arrayBuffer());
    await sharp(bytes)
      .resize({ width: 900, withoutEnlargement: true })
      .webp({ quality: 88 })
      .toFile(directory + "/" + id + ".webp");
    console.log(id + ": saved");
  }),
);
for (const outcome of outcomes)
  if (outcome.status === "rejected") throw outcome.reason;
await sharp(
  "C:/Users/-User-/.codex/generated_images/01a10133-6a4b-7421-8f25-affe52720af0/exec-666213f9-52dd-45b1-b3c4-cc086d1575de.png",
)
  .resize({ width: 1300, withoutEnlargement: true })
  .webp({ quality: 90 })
  .toFile(directory + "/facial-botanical.webp");
await sharp(
  "C:/Users/-User-/.codex/generated_images/01a10133-6a4b-7421-8f25-affe52720af0/exec-967bb5e5-444f-48a3-8ac6-cfed12ce33d9.png",
)
  .resize({ width: 900, withoutEnlargement: true })
  .webp({ quality: 90 })
  .toFile(directory + "/facial-bottle.webp");
await fs.writeFile(
  directory + "/sources.json",
  JSON.stringify(
    {
      reference: "https://dribbble.com/shots/15487383-Beauty-Product-Shop-App",
      artwork: {
        file: "facial-botanical.webp",
        method: "built-in imagegen",
        reference: "User supplied three skincare UI references",
        description:
          "Recreated dark Sukin pump bottle with eucalyptus foliage on transparent background; concept artwork, not an official packshot.",
      },
      productPhotos: sources.map(([id, source]) => ({
        file: id + ".webp",
        source,
      })),
      artworkVariants: [
        {
          file: "facial-bottle.webp",
          method: "built-in imagegen",
          description:
            "Matching isolated pump bottle recreated from the botanical composition; concept packaging artwork.",
        },
      ],
      scope:
        "Independent concept portfolio. Prices, stock and checkout are demonstration data. No affiliation with Sukin.",
    },
    null,
    2,
  ),
);
