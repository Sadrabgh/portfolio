import { url } from "../config";
export const link = (path = "") => url("demo/aurum/" + path.replace(/^\//, ""));
export const money = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
export type Category = "rings" | "earrings" | "necklaces";
export interface Jewel {
  id: string;
  name: string;
  category: Category;
  price: number;
  stock: number;
  description: string;
  detail: string;
  material: string;
  options: string[];
  optionLabel: string;
}
export const categories = [
  { id: "rings", name: "Rings", icon: "ring" },
  { id: "earrings", name: "Earrings", icon: "earring" },
  { id: "necklaces", name: "Necklaces", icon: "necklace" },
];
export const products: Jewel[] = [
  {
    id: "lume-ring",
    name: "Lume Ring",
    category: "rings",
    price: 980,
    stock: 6,
    description:
      "A little light, shaped around you. A flowing gold band with a softly sculpted edge.",
    detail:
      "A wide, curved profile with a smooth interior. Wear it alone, let the shape do the talking.",
    material: "Polished yellow gold · concept design",
    options: ["US 5", "US 6", "US 7", "US 8"],
    optionLabel: "Ring size",
  },
  {
    id: "cove-earrings",
    name: "Cove Earrings",
    category: "earrings",
    price: 1180,
    stock: 8,
    description:
      "Your everyday pair, with a little more presence. Rounded oval hoops in warm gold.",
    detail:
      "A matching pair of oval hoops with a clean hinged closure. Designed to frame the everyday.",
    material: "Polished yellow gold · concept design",
    options: ["One size"],
    optionLabel: "Size",
  },
  {
    id: "sol-necklace",
    name: "Sol Necklace",
    category: "necklaces",
    price: 950,
    stock: 7,
    description:
      "A small circle of sunshine. A simple gold disc on a fine, considered chain.",
    detail:
      "An unengraved round pendant and a fine chain. Choose a length to find your own balance.",
    material: "Polished yellow gold · concept design",
    options: ["16 inch", "18 inch"],
    optionLabel: "Chain length",
  },
  {
    id: "halo-band",
    name: "Halo Band",
    category: "rings",
    price: 1240,
    stock: 4,
    description:
      "A quiet line of light. A delicate band set with a continuous row of clear stones.",
    detail:
      "A slim profile to wear on its own or alongside a simple band. Small stones, a clear silhouette.",
    material: "Yellow gold and clear stones · concept design",
    options: ["US 5", "US 6", "US 7", "US 8"],
    optionLabel: "Ring size",
  },
  {
    id: "line-earrings",
    name: "Line Earrings",
    category: "earrings",
    price: 760,
    stock: 5,
    description:
      "A clean line, a soft movement. Open geometric drops with gently rounded corners.",
    detail:
      "A pair of slender open rectangles suspended from simple studs. Light in appearance, distinct in shape.",
    material: "Polished yellow gold · concept design",
    options: ["One size"],
    optionLabel: "Size",
  },
  {
    id: "arc-necklace",
    name: "Arc Necklace",
    category: "necklaces",
    price: 860,
    stock: 3,
    description:
      "An open shape for an open day. A sculptural arch suspended on a fine gold chain.",
    detail:
      "A simple open arch with rounded ends, connected at both sides for a balanced profile.",
    material: "Polished yellow gold · concept design",
    options: ["16 inch", "18 inch"],
    optionLabel: "Chain length",
  },
];
export const collections = [
  {
    id: "everyday",
    name: "The everyday edit",
    subtitle: "Your first on. Your last off.",
    image: "hand",
    ids: ["lume-ring", "cove-earrings", "sol-necklace"],
  },
  {
    id: "form",
    name: "A study in form",
    subtitle: "Soft curves. Clear character.",
    image: "hero",
    ids: ["lume-ring", "line-earrings", "arc-necklace"],
  },
  {
    id: "light",
    name: "A little light",
    subtitle: "Small details, brighter days.",
    image: "campaign",
    ids: ["halo-band", "cove-earrings", "sol-necklace"],
  },
];
export const articles = [
  {
    id: "finding-your-form",
    title: "Finding your everyday form.",
    tag: "Style notes",
    image: "hand",
    intro: "The best starting point is the piece you keep reaching for.",
    paragraphs: [
      "Start with one shape you enjoy wearing. A smooth band, an oval hoop or a simple pendant can set the tone without asking for attention.",
      "Leave a little space between statement pieces. A wide ring and a quiet necklace work together because each has room to be noticed.",
      "Try a chain length against the collars you wear most. The same piece can feel different over cotton, knitwear or a clean neckline.",
      "There is no single right combination. Keep the pieces that feel comfortable, then let your collection grow around you.",
    ],
  },
  {
    id: "a-little-care",
    title: "A little care goes a long way.",
    tag: "Care notes",
    image: "campaign",
    intro: "Make a small ritual of looking after the pieces you wear.",
    paragraphs: [
      "Keep each piece in a separate soft pouch so polished surfaces do not rub against one another.",
      "Take jewelry off before swimming, exercise and household cleaning. Put it on after lotions or fragrance have dried.",
      "Use a soft, dry cloth after wear. Check the specific material and stone-care instructions before using any cleaning solution.",
      "If a clasp feels loose or a setting changes, stop wearing the piece and ask a qualified jeweler to inspect it.",
    ],
  },
];
export const help: Record<
  string,
  { title: string; intro: string; sections: [string, string][] }
> = {
  shipping: {
    title: "A considered arrival.",
    intro:
      "Every part of the journey should feel as simple as the piece itself.",
    sections: [
      [
        "Packaging",
        "Each concept order includes a soft pouch and a simple gift box. Gift packaging can be selected at checkout.",
      ],
      [
        "Delivery options",
        "The demo calculates standard shipping at $20, or free for an order of $1,500 or more after discounts. Express shipping is $35.",
      ],
      [
        "This concept store",
        "Orders on this website are demonstrations. No payment is collected, no parcel is dispatched and delivery estimates do not describe a real service.",
      ],
    ],
  },
  returns: {
    title: "Room to reconsider.",
    intro: "Clear answers make choosing easier.",
    sections: [
      [
        "Before an order",
        "Read the size, material and product details before adding a piece to your bag. The size guide explains the illustrative options used in this collection.",
      ],
      [
        "Demo orders",
        "There is no real purchase to return on this concept store. The receipt exists only to show how an order can be reviewed.",
      ],
      [
        "Need a hand?",
        "The contact form lets you preview a support request. It does not send your message to an external service.",
      ],
    ],
  },
  care: {
    title: "Keep a little brilliance.",
    intro: "Simple care for the pieces in your everyday.",
    sections: [
      [
        "After wear",
        "Wipe gently with a soft, dry cloth and store each piece separately.",
      ],
      [
        "Before water or cleaning",
        "Remove jewelry before swimming, exercise or working with household cleaners. Avoid direct contact with fragrance.",
      ],
      [
        "Know the material",
        "Materials and prices here are illustrative. For a real piece, follow the maker’s material-specific instructions and have loose clasps or settings checked by a qualified jeweler.",
      ],
    ],
  },
  "size-guide": {
    title: "Find your fit.",
    intro: "A few small details before choosing a size.",
    sections: [
      [
        "Rings",
        "The concept collection offers US sizes 5, 6, 7 and 8. Measure a comfortable existing ring or ask a jeweler for a fitting. The selected size is retained in your bag and receipt.",
      ],
      [
        "Necklaces",
        "Choose 16 or 18 inches. A piece of string at the stated length helps you picture where a necklace will sit with your favorite collar.",
      ],
      [
        "Earrings",
        "Earrings are sold as one matching pair in one size. Each product image shows the shape; the image scale is not a measurement.",
      ],
    ],
  },
  privacy: {
    title: "Your choices, kept simple.",
    intro: "A small amount of storage for a smoother demo.",
    sections: [
      [
        "Saved choices",
        "Your bag and saved products use this browser’s local storage. They are not sent to a server.",
      ],
      [
        "Checkout details",
        "Contact and address fields are used only on screen to preview checkout. They are not saved in the receipt or sent anywhere. Please use example details.",
      ],
      [
        "Demo receipt",
        "An anonymous receipt with product choices, prices and a reference is kept in session storage. Closing the browser session clears it. Contact and newsletter forms do not send or store the information entered.",
      ],
    ],
  },
};
