import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";
import hero from "../assets/aurum/hero.png";
import hand from "../assets/aurum/hand.png";
import campaign from "../assets/aurum/campaign.png";
import lume from "../assets/aurum/lume-ring.png";
import halo from "../assets/aurum/halo-band.png";
import cove from "../assets/aurum/cove-earrings.png";
import line from "../assets/aurum/line-earrings.png";
import sol from "../assets/aurum/sol-necklace.png";
import arc from "../assets/aurum/arc-necklace.png";
export const originals: Record<string, ImageMetadata> = {
  hero,
  hand,
  campaign,
  "lume-ring": lume,
  "halo-band": halo,
  "cove-earrings": cove,
  "line-earrings": line,
  "sol-necklace": sol,
  "arc-necklace": arc,
};
const cache = new Map<string, ReturnType<typeof getImage>>();
export function photo(name: string, width: number) {
  const original = originals[name];
  if (!original) throw new Error("Unknown AURUM image: " + name);
  const resolvedWidth = Math.min(width, original.width);
  const key = name + ":" + resolvedWidth;
  if (!cache.has(key))
    cache.set(
      key,
      getImage({
        src: original,
        width: resolvedWidth,
        format: "webp",
        quality: 82,
      }),
    );
  return cache.get(key)!;
}
