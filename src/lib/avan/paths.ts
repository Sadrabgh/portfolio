// Keep AVAN's tiny URL helper in its own bundle, avoiding a serial shared-config request.
const url = (path: string = "") =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
import images from "../../data/avan-images.json";
export const avanUrl = (path = "") =>
  url("demo/avan/" + path.replace(/^\//, ""));
export const photoProps = (source: string) => {
  const item = (images as Record<string, { width: number; height: number }>)[
    source
  ];
  if (!item) throw new Error("AVAN image metadata missing: " + source);
  const sizes = [320, 640, 900].filter((w) => w <= item.width);
  return {
    src: url(source),
    width: item.width,
    height: item.height,
    srcset: sizes
      .map(
        (w) =>
          `${url(w === 900 ? source : source.replace(".webp", `-${w}.webp`))} ${w}w`,
      )
      .join(", "),
  };
};
