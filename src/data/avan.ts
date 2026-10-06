/** AVAN is a concept store. Specifications, prices and stock are demonstration data. */
export type Category = 'headphones' | 'earbuds' | 'speakers' | 'accessories';
export type Usage = 'focus' | 'daily' | 'home' | 'travel' | 'sport';
export type ColorId = 'graphite' | 'ivory';
export interface Specification { key: string; label: string; value: string | number | boolean | null; unit?: string }
export interface Variant { id: string; color: ColorId; name: string; hex: string; price: number; stock: number; images: string[] }
export interface AudioProduct {
  id: string; code: string; title: string; description: string; category: Category;
  uses: Usage[]; order: number; compareGroup: Category | null; specs: Specification[];
  contents: string[]; compatibleAccessories: string[]; variants: Variant[];
}
export const categories: {id: Category; name: string; description: string}[] = [
  {id:'headphones',name:'هدفون',description:'برای شنیدن، با تمرکز بیشتر'},
  {id:'earbuds',name:'ایرباد',description:'سبک، برای تمام روز'},
  {id:'speakers',name:'اسپیکر',description:'صدا را به فضا بیاور'},
  {id:'accessories',name:'لوازم جانبی',description:'جزئیات یک انتخاب کامل'},
];
export const usages: {id: Usage; name: string}[] = [
  {id:'focus',name:'کار و تمرکز'},{id:'daily',name:'استفادهٔ روزانه'},
  {id:'home',name:'خانه'},{id:'travel',name:'سفر'},{id:'sport',name:'ورزش'},
];
export const colors = {
  graphite: {name:'گرافیتی',hex:'#333C3D'},
  ivory: {name:'استخوانی',hex:'#E6DED0'},
} satisfies Record<ColorId,{name:string;hex:string}>;
const spec = (key:string,label:string,value:Specification['value'],unit?:string):Specification => ({key,label,value,...(unit?{unit}:{})});
const variants = (id:string,price:number,stock:[number,number],extra=100000):Variant[] => (['graphite','ivory'] as ColorId[]).map((color,i)=>({
  id:`${id}-${color}`,color,...colors[color],price:price+(i?extra:0),stock:stock[i],
  images:['front','side',...(id==='h01'?['detail']:[])].map(view=>`/images/avan/products/${id}-${color}-${view}.webp`),
}));
export const products: AudioProduct[] = [
  {id:'h01',code:'AVAN H01',title:'هدفون بی‌سیم با حذف نویز',description:'تمرکز روی چیزی که دوست داری بشنوی. طراحی دور گوش، بدنهٔ مات و کنترل ساده برای کار و مسیرهای طولانی.',category:'headphones',uses:['focus','travel','daily'],order:1,compareGroup:'headphones',
    specs:[spec('connection','اتصال','Bluetooth 5.3'),spec('anc','حذف نویز فعال',true),spec('weight','وزن',268,'g'),spec('fit','نوع پوشش','دور گوش'),spec('battery','شارژدهی با ANC خاموش',38,'h'),spec('batteryAnc','شارژدهی با ANC روشن',28,'h'),spec('microphone','میکروفون',true),spec('charge','درگاه شارژ','USB-C')],
    contents:['هدفون','کابل شارژ USB-C','کیف پارچه‌ای'],compatibleAccessories:['a01','a02'],variants:variants('h01',6200000,[7,4])},
  {id:'h02',code:'AVAN H02',title:'هدفون بی‌سیم سبک',description:'یک همراه سبک برای روزهای شلوغ؛ با بالشتک نرم و کنترل‌های در دسترس.',category:'headphones',uses:['daily','travel'],order:2,compareGroup:'headphones',
    specs:[spec('connection','اتصال','Bluetooth 5.2'),spec('anc','حذف نویز فعال',false),spec('weight','وزن',212,'g'),spec('fit','نوع پوشش','روی گوش'),spec('battery','شارژدهی',30,'h'),spec('batteryAnc','شارژدهی با ANC روشن',null),spec('microphone','میکروفون',true),spec('charge','درگاه شارژ','USB-C')],
    contents:['هدفون','کابل شارژ USB-C'],compatibleAccessories:['a01','a02'],variants:variants('h02',3900000,[5,0])},
  {id:'h03',code:'AVAN H03',title:'هدفون سیمی رومیزی',description:'اتصال ساده برای شنیدن در خانه؛ بدون نیاز به شارژ و با کابل جداشدنی.',category:'headphones',uses:['home','focus'],order:3,compareGroup:'headphones',
    specs:[spec('connection','اتصال','جک ۳٫۵ میلی‌متری'),spec('anc','حذف نویز فعال',false),spec('weight','وزن',245,'g'),spec('fit','نوع پوشش','دور گوش'),spec('battery','شارژدهی',null),spec('batteryAnc','شارژدهی با ANC روشن',null),spec('microphone','میکروفون',false),spec('charge','درگاه شارژ',null)],
    contents:['هدفون','کابل صوتی ۳٫۵ میلی‌متری'],compatibleAccessories:['a01'],variants:variants('h03',4700000,[3,1])},
  {id:'e01',code:'AVAN E01',title:'ایرباد بی‌سیم با حذف نویز',description:'صدای شخصی، در یک قاب کوچک. کیس جمع‌وجور و حذف نویز فعال برای مسیر روزانه.',category:'earbuds',uses:['focus','daily','travel'],order:4,compareGroup:'earbuds',
    specs:[spec('connection','اتصال','Bluetooth 5.3'),spec('anc','حذف نویز فعال',true),spec('weight','وزن هر ایرباد',5.2,'g'),spec('battery','شارژدهی ایرباد، ANC خاموش',7,'h'),spec('batteryAnc','شارژدهی ایرباد، ANC روشن',5,'h'),spec('caseBattery','مجموع با کیس، ANC خاموش',28,'h'),spec('resistance','مقاومت نمونه','IPX4'),spec('microphone','میکروفون',true),spec('charge','درگاه شارژ کیس','USB-C')],
    contents:['دو ایرباد','کیس شارژ','سه اندازه سری سیلیکونی','کابل USB-C'],compatibleAccessories:['a02'],variants:variants('e01',4400000,[8,6])},
  {id:'e02',code:'AVAN E02',title:'ایرباد بی‌سیم روزمره',description:'برای تماس‌ها و موسیقی روزانه؛ سبک، ساده و همراه با کیس کوچک.',category:'earbuds',uses:['daily','travel'],order:5,compareGroup:'earbuds',
    specs:[spec('connection','اتصال','Bluetooth 5.2'),spec('anc','حذف نویز فعال',false),spec('weight','وزن هر ایرباد',4.4,'g'),spec('battery','شارژدهی ایرباد',6,'h'),spec('batteryAnc','شارژدهی با ANC روشن',null),spec('caseBattery','مجموع با کیس',24,'h'),spec('resistance','مقاومت نمونه','IPX4'),spec('microphone','میکروفون',true),spec('charge','درگاه شارژ کیس','USB-C')],
    contents:['دو ایرباد','کیس شارژ','کابل USB-C'],compatibleAccessories:['a02'],variants:variants('e02',2600000,[10,7])},
  {id:'e03',code:'AVAN E03',title:'ایرباد بی‌سیم ورزشی',description:'حلقهٔ نگهدارنده برای فعالیت روزانه؛ کنترل ساده و کیس مقاوم با بافت مات.',category:'earbuds',uses:['sport','daily'],order:6,compareGroup:'earbuds',
    specs:[spec('connection','اتصال','Bluetooth 5.3'),spec('anc','حذف نویز فعال',false),spec('weight','وزن هر ایرباد',6.1,'g'),spec('battery','شارژدهی ایرباد',8,'h'),spec('batteryAnc','شارژدهی با ANC روشن',null),spec('caseBattery','مجموع با کیس',32,'h'),spec('resistance','مقاومت نمونه','IPX5'),spec('microphone','میکروفون',true),spec('charge','درگاه شارژ کیس','USB-C')],
    contents:['دو ایرباد','کیس شارژ','سه اندازه سری سیلیکونی','کابل USB-C'],compatibleAccessories:['a02'],variants:variants('e03',3500000,[6,4])},
  {id:'s01',code:'AVAN S01',title:'اسپیکر قابل حمل',description:'صدا همراه تو می‌آید؛ یک بدنهٔ جمع‌وجور با بند حمل و کنترل‌های ساده.',category:'speakers',uses:['home','travel'],order:7,compareGroup:'speakers',
    specs:[spec('connection','اتصال','Bluetooth 5.3'),spec('weight','وزن',540,'g'),spec('dimensions','ابعاد','۱۸ × ۸ × ۸','cm'),spec('power','توان اسمی نمونه',12,'W'),spec('battery','شارژدهی',12,'h'),spec('resistance','مقاومت نمونه','IPX4'),spec('charge','درگاه شارژ','USB-C')],
    contents:['اسپیکر','بند حمل','کابل USB-C'],compatibleAccessories:['a02'],variants:variants('s01',4800000,[5,3])},
  {id:'s02',code:'AVAN S02',title:'اسپیکر رومیزی',description:'یک نقطهٔ ثابت برای موسیقی در خانه؛ بدنهٔ پارچه‌ای و اتصال سیمی و بی‌سیم.',category:'speakers',uses:['home'],order:8,compareGroup:'speakers',
    specs:[spec('connection','اتصال','Bluetooth 5.3 / AUX'),spec('weight','وزن',1800,'g'),spec('dimensions','ابعاد','۲۴ × ۱۶ × ۱۴','cm'),spec('power','توان اسمی نمونه',30,'W'),spec('battery','شارژدهی',null),spec('resistance','مقاومت نمونه',null),spec('charge','منبع تغذیه','آداپتور DC')],
    contents:['اسپیکر','آداپتور برق','کابل صوتی AUX'],compatibleAccessories:[],variants:variants('s02',8500000,[0,0])},
  {id:'a01',code:'AVAN A01',title:'استند هدفون',description:'جای مشخصی برای هدفونت؛ پایهٔ فلزی با سطح محافظ و فضای کم روی میز.',category:'accessories',uses:['home','focus'],order:9,compareGroup:null,
    specs:[spec('material','جنس','آلومینیوم با سطح سیلیکونی'),spec('dimensions','ابعاد','۲۵ × ۱۲ × ۱۰','cm'),spec('weight','وزن',310,'g'),spec('purpose','کاربرد','نگهداری هدفون روگوشی و دورگوشی')],
    contents:['استند هدفون'],compatibleAccessories:[],variants:variants('a01',950000,[8,5],50000)},
  {id:'a02',code:'AVAN A02',title:'کابل شارژ USB-C',description:'کابل بافته‌شده برای شارژ مدل‌های سازگار آوان؛ انعطاف‌پذیر و با اتصال‌های مشخص.',category:'accessories',uses:['daily','home','travel'],order:10,compareGroup:null,
    specs:[spec('connector','دو سر کابل','USB-A به USB-C'),spec('length','طول',1,'m'),spec('material','روکش','بافت نایلون'),spec('purpose','کاربرد','شارژ؛ فاقد انتقال صدای آنالوگ')],
    contents:['کابل USB-A به USB-C'],compatibleAccessories:[],variants:variants('a02',450000,[15,12],0)},
];
export const productById = (id:string) => products.find(p=>p.id===id);
export const variantById = (id:string) => { for (const product of products) { const variant=product.variants.find(v=>v.id===id); if(variant) return {product,variant}; } return undefined; };
export const minimumPrice = (p:AudioProduct) => Math.min(...p.variants.map(v=>v.price));
export const inStock = (p:AudioProduct) => p.variants.some(v=>v.stock>0);
export const displaySpec = (s:Specification) => s.value===null?'کاربرد ندارد':typeof s.value==='boolean'?(s.value?'دارد':'ندارد'):`${s.value}${s.unit?' '+s.unit:''}`;
export const formatMoney = (value:number) => new Intl.NumberFormat('fa-IR').format(value)+' تومان';
export const storePolicy = {currency:'IRT',coupon:'AVAN10',discountRate:0.1,discountCap:600000,shipping:100000,freeShippingThreshold:8000000} as const;
export const featuredIds = ['h01','e01','s01','a01'];
