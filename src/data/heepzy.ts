import { url } from "../config";
export const shoeSizes = [37, 38, 39, 40, 41, 42, 43, 44, 45];
export const moods = [
  { id: "all", label: "همه" },
  { id: "fresh", label: "تازه و ساده" },
  { id: "heavy", label: "حجم و جسارت" },
  { id: "flow", label: "سبک و روان" },
  { id: "slide", label: "آرام و راحت" },
  { id: "core", label: "انتخاب کلاسیک" },
];
export const colourFamilies = [
  ["white", "سفید و کرم"],
  ["grey", "خاکستری"],
  ["black", "مشکی"],
  ["brown", "قهوه‌ای"],
  ["green", "سبز"],
  ["blue", "آبی"],
  ["orange", "نارنجی"],
  ["pink", "صورتی و یاسی"],
];
export interface ShoeColour {
  id: string;
  label: string;
  hex: string;
  family: string;
  angles: number;
}
export interface ShoeVariant {
  sku: string;
  colour: string;
  size: number;
  stock: number;
}
export interface Shoe {
  id: string;
  slug: string;
  name: string;
  en: string;
  tagline: string;
  description: string;
  material: string;
  sole: string;
  price: number;
  sale: number;
  rating: number;
  moods: string[];
  collections: string[];
  release: number;
  colours: ShoeColour[];
  variants: ShoeVariant[];
  angles: number;
}
type Seed = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  string[],
  [string, string, string, string],
  [string, string, string, string],
];
const seeds: Seed[] = [
  [
    "h01",
    "route",
    "RAVA 01",
    "RAVA 01",
    "روی زمین، با اعتماد.",
    "جیر قهوه‌ای با دوخت‌های قوسی و زیرهٔ کاراملی؛ برای روزهایی که استایلت حرف خودش را می‌زند.",
    "جیر و چرم، آستر نرم",
    4800000,
    ["core", "heavy"],
    ["brown", "شکلاتی", "#593c2d", "brown"],
    ["sand", "شنی", "#bdac8e", "brown"],
  ],
  [
    "h02",
    "breeze",
    "RAVA 02",
    "RAVA 02",
    "سبک‌تر قدم بردار.",
    "رویهٔ بافت‌دار و زیرهٔ نرم و تراش‌خورده، همراه آرام مسیرهای روزمرهٔ تو.",
    "بافت تنفس‌پذیر، تقویت پارچه‌ای",
    3600000,
    ["fresh", "flow"],
    ["cream", "کرم", "#ece1ce", "white"],
    ["slate", "دودی", "#727b80", "grey"],
  ],
  [
    "h03",
    "rhythm",
    "RAVA 03",
    "RAVA 03",
    "حجم، جسارت، حال خوب.",
    "لایه‌های مش و قاب منحنی با پنجره‌های بیضی، فرم چشمگیر را با نرمی ترکیب می‌کنند.",
    "مش و قاب انعطاف‌پذیر",
    5400000,
    ["heavy", "fresh"],
    ["grey", "خاکستری", "#929392", "grey"],
    ["ivory", "استخوانی", "#e6dbc8", "white"],
  ],
  [
    "h04",
    "circuit",
    "RAVA 04",
    "RAVA 04",
    "ریتم خودت را پیدا کن.",
    "جزئیات نقره‌ای روی مش تیره و زیرهٔ منعطف برای حرکت‌های کوچک و مسیرهای تازه.",
    "مش فنی و پوشش نقره‌ای",
    6200000,
    ["flow", "heavy"],
    ["silver", "نقره‌ای", "#bcc0c1", "grey"],
    ["graphite", "گرافیتی", "#3d4247", "black"],
  ],
  [
    "h05",
    "flux",
    "RAVA 05",
    "RAVA 05",
    "انرژی در هر قدم.",
    "چرم سفید، مش لطیف و یک قوس رنگی؛ برای استایلی که ساده نمی‌ماند.",
    "چرم و مش، آستر پارچه‌ای",
    5200000,
    ["fresh", "core"],
    ["orange", "سفید و نارنجی", "#f27823", "orange"],
    ["blue", "سفید و آبی", "#43698c", "blue"],
  ],
  [
    "h06",
    "base",
    "RAVA 06",
    "RAVA 06",
    "همیشه انتخاب تو.",
    "فرم کلاسیک با چرم سفید و زیرهٔ صمغی؛ جفتی که به‌سادگی با روزت هماهنگ می‌شود.",
    "چرم صاف، بند تخت",
    2800000,
    ["core", "fresh"],
    ["white", "سفید", "#f8f4eb", "white"],
    ["black", "مشکی", "#292b2d", "black"],
  ],
  [
    "h07",
    "nightrun",
    "RAVA 07",
    "RAVA 07",
    "وقتی شهر روشن می‌شود.",
    "کتانی تیرهٔ مینیمال با پنل جیر و جزئیات ظریف؛ برای ادامهٔ روز تا شب.",
    "جیر و چرم نرم",
    4200000,
    ["core", "heavy"],
    ["black", "مشکی", "#262629", "black"],
    ["burgundy", "زرشکی", "#6a303c", "brown"],
  ],
  [
    "h08",
    "traverse",
    "RAVA 08",
    "RAVA 08",
    "مسیر تازه، قدم محکم.",
    "ترکیب مش و پنل‌های بادوام با بندهای طنابی و زیرهٔ آج‌دار برای یک استایل آزاد.",
    "مش مقاوم و پنل تقویت‌شده",
    6800000,
    ["flow", "heavy"],
    ["sage", "سبز مریم‌گلی", "#899480", "green"],
    ["sand", "شنی", "#c7b99c", "brown"],
  ],
  [
    "h09",
    "calm",
    "RAVA 09",
    "RAVA 09",
    "راحتی بی‌تکلف.",
    "صندل یکپارچه با فرم نرم و حجم آرام، برای استراحت میان مسیرهای پرجنب‌وجوش.",
    "فوم یکپارچهٔ نرم",
    2400000,
    ["slide", "flow"],
    ["bone", "استخوانی", "#e9dfc9", "white"],
    ["charcoal", "زغالی", "#3d3e3e", "black"],
  ],
  [
    "h10",
    "axis",
    "RAVA 10",
    "RAVA 10",
    "یک کلاسیک تازه.",
    "رویهٔ کتان، بندهای ساده و زیرهٔ روشن؛ یک انتخاب روزمره با حال‌وهوای شهری.",
    "کتان با آستر پارچه‌ای",
    3200000,
    ["core", "fresh"],
    ["navy", "سرمه‌ای", "#263b51", "blue"],
    ["ecru", "کرم روشن", "#e5dbc7", "white"],
  ],
  [
    "h11",
    "range",
    "RAVA 11",
    "RAVA 11",
    "دورتر را ببین.",
    "نیم‌بوت سبک با پنل جیر، بند طنابی و زیرهٔ عمیق؛ برای استایل‌های ماجراجو.",
    "جیر و مش، حلقهٔ بند فلزی",
    7200000,
    ["heavy", "flow"],
    ["sand", "شنی", "#bba281", "brown"],
    ["olive", "زیتونی", "#74765c", "green"],
  ],
  [
    "h12",
    "dawn",
    "RAVA 12",
    "RAVA 12",
    "رنگ تازهٔ روز تو.",
    "رنگ‌های ملایم روی فرم رترو و زیرهٔ حجیم، برای روزهایی که به کمی رنگ نیاز دارند.",
    "جیر لطیف و مش",
    5600000,
    ["fresh", "slide"],
    ["pink", "صورتی", "#d4a2a5", "pink"],
    ["lilac", "یاسی", "#aaa2c7", "pink"],
  ],
];
export const shoes: Shoe[] = seeds.map((s, i) => {
  const [
    id,
    slug,
    name,
    en,
    tagline,
    description,
    material,
    price,
    tags,
    c1,
    c2,
  ] = s;
  const colours = [c1, c2].map(([colourId, label, hex, family]) => ({
    id: colourId,
    label,
    hex,
    family,
    angles:
      id === "h05"
        ? 4
        : Number(id.slice(1)) <= 8
          ? 2
          : id === "h09" && colourId === "bone"
            ? 2
            : 1,
  }));
  const variants = colours.flatMap((c, ci) =>
    shoeSizes.map((size) => {
      let stock = 3 + ((i + size + ci) % 5);
      if (
        (i === 0 && ci === 0 && size === 37) ||
        (i === 0 && ci === 1 && size === 41) ||
        (i === 4 && ci === 1 && size === 39) ||
        (i + ci + size) % 13 === 0
      )
        stock = 0;
      if (i === 0 && ci === 0 && size === 42) stock = 3;
      if (i === 4 && ci === 0 && size === 39) stock = 2;
      return { sku: `${id}-${c.id}-${size}`, colour: c.id, size, stock };
    }),
  );
  return {
    id,
    slug,
    name,
    en,
    tagline,
    description,
    material,
    sole:
      id === "h09"
        ? "فوم سبک و منعطف"
        : i === 0 || i === 10
          ? "لاستیک آج‌دار"
          : "لاستیک منعطف با لایهٔ نرم",
    price,
    sale: [0, 4, 11].includes(i) ? 25 : 0,
    rating: 4.6 + (i % 3) / 10,
    moods: tags,
    collections: [
      ...([0, 4, 11].includes(i) ? ["drops"] : []),
      ...([2, 4, 7, 11].includes(i) ? ["fresh"] : []),
    ],
    release: 20261001 + i,
    colours,
    variants,
    angles: Math.max(...colours.map((c) => c.angles)),
  };
});
export const shoeById = (id: string) => shoes.find((p) => p.id === id);
export const shoeBySlug = (slug: string) => shoes.find((p) => p.slug === slug);
export const variantBySku = (sku: string) => {
  for (const product of shoes) {
    const variant = product.variants.find((v) => v.sku === sku);
    if (variant) return { product, variant };
  }
  return undefined;
};
export const shoePrice = (p: Shoe) =>
  Math.floor((p.price * (100 - p.sale)) / 100);
export const art = (id: string, small = false) =>
  url(`art/heepzy/${id}${small ? "-400" : ""}.webp`);
export const shoeImage = (
  p: Shoe,
  colour = p.colours[0].id,
  angle = 1,
  small = false,
) =>
  art(
    `${p.id}-${colour}-${Math.min(angle, p.colours.find((c) => c.id === colour)?.angles || 1)}`,
    small,
  );
export const money = (amount: number) =>
  new Intl.NumberFormat("fa-IR").format(amount) + " تومان";
export const shopUrl = (path = "") => url("demo/rava/" + path);
export const normaliseDigits = (value: string) =>
  value.replace(/[۰-۹٠-٩]/g, (c) =>
    String(
      "۰۱۲۳۴۵۶۷۸۹".includes(c)
        ? "۰۱۲۳۴۵۶۷۸۹".indexOf(c)
        : "٠١٢٣٤٥٦٧٨٩".indexOf(c),
    ),
  );
export const normaliseText = (value: string) =>
  normaliseDigits(value)
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .toLowerCase()
    .trim();
export interface Filters {
  q: string;
  mood: string;
  collection: string;
  colour: string;
  size: string;
  available: boolean;
  min: number;
  max: number;
  sort: string;
}
export function readFilters(params: URLSearchParams): Filters {
  const number = (key: string, fallback: number) => {
    const raw = normaliseDigits(params.get(key) || "");
    return /^\d+$/.test(raw)
      ? Math.min(20000000, Math.max(0, Number(raw)))
      : fallback;
  };
  const min = number("min", 0),
    max = number("max", 20000000);
  return {
    q: (params.get("q") || "").slice(0, 120),
    mood: moods.some((m) => m.id === params.get("mood"))
      ? params.get("mood")!
      : "all",
    collection: ["drops", "fresh"].includes(params.get("collection") || "")
      ? params.get("collection")!
      : "all",
    colour: colourFamilies.some((c) => c[0] === params.get("colour"))
      ? params.get("colour")!
      : "all",
    size: shoeSizes.some((s) => String(s) === params.get("size"))
      ? params.get("size")!
      : "all",
    available: params.get("available") === "1",
    min: Math.min(min, max),
    max: Math.max(min, max),
    sort: ["price-asc", "price-desc", "newest"].includes(
      params.get("sort") || "",
    )
      ? params.get("sort")!
      : "featured",
  };
}
export function filterShoes(filters: Filters, products = shoes): Shoe[] {
  const q = normaliseText(filters.q);
  const result = products.filter(
    (p) =>
      (!q ||
        normaliseText(p.name + " " + p.en + " " + p.description).includes(q)) &&
      (filters.mood === "all" || p.moods.includes(filters.mood)) &&
      (filters.collection === "all" ||
        p.collections.includes(filters.collection)) &&
      shoePrice(p) >= filters.min &&
      shoePrice(p) <= filters.max &&
      p.variants.some(
        (v) =>
          (filters.colour === "all" ||
            p.colours.find((c) => c.id === v.colour)?.family ===
              filters.colour) &&
          (filters.size === "all" || v.size === Number(filters.size)) &&
          (!filters.available || v.stock > 0),
      ),
  );
  if (filters.sort === "price-asc")
    result.sort((a, b) => shoePrice(a) - shoePrice(b));
  if (filters.sort === "price-desc")
    result.sort((a, b) => shoePrice(b) - shoePrice(a));
  if (filters.sort === "newest") result.sort((a, b) => b.release - a.release);
  return result;
}
