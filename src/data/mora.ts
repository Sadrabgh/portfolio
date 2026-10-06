import { url } from "../config";
export const link = (path = "") => url("demo/mora/" + path.replace(/^\//, ""));
export const photo = (name: string, width = 800) =>
  url(`images/mora/${name}-${width}.webp`);
export const money = (n: number) =>
  new Intl.NumberFormat("fa-IR").format(n) + " تومان";
export interface Furniture {
  id: string;
  code: string;
  name: string;
  category: string;
  material: string;
  finish: string;
  room: string;
  price: number;
  stock: number;
  image: string;
  dimensions: [number, number, number];
  description: string;
  care: string;
}
export const categories: Record<string, string> = {
  all: "همهٔ محصولات",
  chairs: "صندلی و راحتی",
  sofas: "مبل",
  tables: "میز",
  storage: "قفسه",
  lighting: "روشنایی",
};
export const materials: Record<string, string> = {
  fabric: "پارچه و چوب",
  wood: "چوب",
  metal: "فلز",
};
export const products: Furniture[] = [
  {
    id: "c01",
    code: "MORA C01",
    name: "صندلی راحتی",
    category: "chairs",
    material: "fabric",
    finish: "آجری / گردو",
    room: "living",
    price: 15800000,
    stock: 5,
    image: "chair",
    dimensions: [72, 78, 82],
    description:
      "یک جای آرام برای پایان روز. نشیمن عمیق، پارچهٔ بافت‌دار آجری و پایه‌های گردویی، به اتاق گرما می‌دهند.",
    care: "با برس نرم جارو کنید. لکه را با پارچهٔ کمی مرطوب و بدون مالش پاک کنید.",
  },
  {
    id: "s01",
    code: "MORA S01",
    name: "مبل سه‌نفره",
    category: "sofas",
    material: "fabric",
    finish: "شیری / بوکله",
    room: "calm",
    price: 48500000,
    stock: 3,
    image: "sofa",
    dimensions: [240, 95, 78],
    description:
      "خطوط نرم و بافتی که دعوت به مکث می‌کند. یک مبل جادار برای دورهمی‌های کوچک و عصرهای طولانی.",
    care: "بوکله را با سری نرم جارو کنید. از سفیدکننده و نور مستقیم طولانی پرهیز کنید.",
  },
  {
    id: "t01",
    code: "MORA T01",
    name: "میز جلو مبلی",
    category: "tables",
    material: "wood",
    finish: "گردوی طبیعی",
    room: "living",
    price: 12900000,
    stock: 6,
    image: "table",
    dimensions: [120, 60, 38],
    description:
      "سطح بیضی و پایه‌های حجمی، تعادلی میان سادگی و شخصیت. رگه‌های گردو در هر زاویه داستان دیگری دارند.",
    care: "با دستمال نرم خشک پاک کنید. برای ظروف داغ و مرطوب از زیرلیوانی استفاده کنید.",
  },
  {
    id: "r01",
    code: "MORA R01",
    name: "کتابخانهٔ باز",
    category: "storage",
    material: "wood",
    finish: "گردوی تیره",
    room: "living",
    price: 22400000,
    stock: 4,
    image: "shelf",
    dimensions: [160, 32, 120],
    description:
      "برای کتاب‌ها، اشیای دوست‌داشتنی و فاصله‌های خالی میان آن‌ها. ترکیب قفسه‌های باز با چوب گرم.",
    care: "از رطوبت و گرمای مستقیم دور نگه دارید. برای ایمنی، به دیوار مهار شود.",
  },
  {
    id: "l01",
    code: "MORA L01",
    name: "چراغ آویز",
    category: "lighting",
    material: "metal",
    finish: "مشکی / برنزی",
    room: "dining",
    price: 4850000,
    stock: 12,
    image: "lamp",
    dimensions: [40, 40, 55],
    description:
      "نوری متمرکز با فرمی آرام. سایه‌بان مشکی و سطح داخلی برنزی برای بالای میز یا گوشهٔ مطالعه.",
    care: "پیش از تمیزکردن برق را قطع کنید. نصب توسط برق‌کار انجام شود. لامپ همراه محصول نیست.",
  },
  {
    id: "c02",
    code: "MORA C02",
    name: "صندلی چوبی راحتی",
    category: "chairs",
    material: "fabric",
    finish: "سبز مریم‌گلی / بلوط",
    room: "calm",
    price: 17200000,
    stock: 0,
    image: "sage",
    dimensions: [80, 80, 80],
    description:
      "رنگی ملایم، تکیه‌گاهی نرم و قاب بلوطی. برای گوشه‌ای از خانه که به سکوت اختصاص دارد.",
    care: "چوب با دستمال نرم و پارچه با برس ملایم تمیز شود. از شویندهٔ قوی استفاده نکنید.",
  },
  {
    id: "t02",
    code: "MORA T02",
    name: "میز ناهارخوری",
    category: "tables",
    material: "wood",
    finish: "بلوط روشن",
    room: "dining",
    price: 28400000,
    stock: 2,
    image: "dining",
    dimensions: [180, 90, 75],
    description:
      "یک میز برای گفت‌وگوهای طولانی. سطح بلوطی روشن و پایه‌های معماری، مرکز تازه‌ای برای خانه می‌سازند.",
    care: "از زیرظرفی برای وسایل داغ استفاده کنید. رطوبت را فوراً با دستمال نرم خشک کنید.",
  },
  {
    id: "t03",
    code: "MORA T03",
    name: "میز کنار مبلی",
    category: "tables",
    material: "metal",
    finish: "برنز مات",
    room: "calm",
    price: 6400000,
    stock: 8,
    image: "side",
    dimensions: [30, 30, 50],
    description:
      "حجمی کوچک با حضوری مشخص. یک میز جمع‌وجور برای فنجان، کتاب و جزئیات روزمره.",
    care: "با پارچهٔ نرم مرطوب پاک و سپس خشک شود. از مواد ساینده استفاده نکنید.",
  },
];
export const collections = [
  {
    id: "living",
    name: "گرمای روزمره",
    subtitle: "گردو، پارچهٔ آجری و نور نرم.",
    image: "hero",
    ids: ["c01", "t01", "r01", "l01"],
  },
  {
    id: "calm",
    name: "جایی برای مکث",
    subtitle: "بافت‌های روشن و رنگ‌های آرام.",
    image: "room",
    ids: ["s01", "c02", "t03"],
  },
  {
    id: "dining",
    name: "دور یک میز",
    subtitle: "بلوط طبیعی و یک نور متمرکز.",
    image: "dining",
    ids: ["t02", "l01", "t03"],
  },
];
export const articles = [
  {
    id: "materials",
    title: "از کجا انتخاب متریال را شروع کنیم؟",
    image: "room",
    tag: "متریال",
    summary: "چوب، پارچه و فلز؛ هر کدام چه حسی به خانه می‌دهند؟",
    paragraphs: [
      "قبل از رنگ، به زندگی روزمره فکر کن. مبلمان باید با شیوهٔ نشستن، نور اتاق و وقت مراقبت تو سازگار باشد.",
      "چوب طبیعی با گذر زمان شخصیت پیدا می‌کند. زیرلیوانی و دوری از گرمای مستقیم کمک می‌کند سطحش زیبا بماند. تفاوت رگه‌ها بخشی از متریال است.",
      "پارچه‌های بافت‌دار گرما و نرمی می‌آورند. رنگ روشن به مراقبت بیشتری نیاز دارد؛ نور واقعی خانه را در نظر بگیر.",
      "فلز در کنار چوب یا پارچه تعادل ایجاد می‌کند. پرداخت مات نور را نرم‌تر بازتاب می‌دهد.",
    ],
  },
  {
    id: "measure",
    title: "قبل از خرید، اتاق را اندازه بگیر.",
    image: "hero",
    tag: "راهنمای چیدمان",
    summary: "چند اندازهٔ ساده برای انتخابی که در خانه درست می‌نشیند.",
    paragraphs: [
      "درگاه ورودی، عرض راهرو، آسانسور و مسیر جابه‌جایی تا جای نهایی را اندازه بگیر.",
      "جای هر قطعه را با چسب کاغذی روی زمین مشخص کن. دور آن قدم بزن تا فضای عبور را ببینی.",
      "بین میز جلو مبلی و مبل فاصله‌ای راحت در نظر بگیر. اطراف میز ناهارخوری، فضای عقب‌کشیدن صندلی را فراموش نکن.",
      "ابعاد صفحهٔ محصول به‌ترتیب عرض، عمق و ارتفاع است. یک قطعهٔ درست و فضای خالی کافی، از چند قطعهٔ فشرده بهتر عمل می‌کند.",
    ],
  },
];
