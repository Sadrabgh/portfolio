import { gsap } from "gsap";
document
  .querySelectorAll<HTMLElement>("[data-photo-gallery]")
  .forEach((gallery) => {
    const images: { src: string; label: string }[] = JSON.parse(
      gallery.dataset.images!,
    );
    const dialog = gallery.querySelector<HTMLDialogElement>("dialog")!;
    const picture =
      dialog.querySelector<HTMLImageElement>("[data-photo-image]")!;
    let active = 0;
    let revision = 0;
    let origin: HTMLImageElement | undefined;
    let bridge: HTMLImageElement | undefined;
    let flight: Animation | undefined;
    const stop = () => {flight?.cancel();bridge?.remove();bridge=undefined;picture.style.visibility="";};
    const continuity = (from:DOMRect,to:DOMRect,src:string) => {
      stop();
      if(document.documentElement.dataset.demoMotion==="reduce" || !HTMLElement.prototype.showPopover || !from.width || !to.width) return;
      bridge = document.createElement("img");
      bridge.src=src;bridge.alt="";bridge.className="photo-continuity";bridge.setAttribute("aria-hidden","true");bridge.setAttribute("popover","manual");
      Object.assign(bridge.style,{left:`${to.left}px`,top:`${to.top}px`,width:`${to.width}px`,height:`${to.height}px`});
      document.body.append(bridge);bridge.showPopover();picture.style.visibility="hidden";
      flight=bridge.animate([{transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`},{transform:"none"}],{duration:560,easing:"cubic-bezier(.22,1,.36,1)"});
      flight.finished.then(stop,()=>{});
    };
    const select = (index: number) => {
      revision++;
      stop();
      active = (index + images.length) % images.length;
      picture.src = images[active].src;
      picture.alt = images[active].label;
      dialog.querySelector("[data-photo-caption]")!.textContent =
        images[active].label;
      dialog.querySelector("[data-photo-position]")!.textContent =
        `${(active + 1).toLocaleString("fa-IR")} از ${images.length.toLocaleString("fa-IR")}`;
      if (
        dialog.open &&
        document.documentElement.dataset.demoMotion !== "reduce"
      )
        gsap.fromTo(
          picture,
          { opacity: 0.3 },
          {
            opacity: 1,
            duration: 0.25,
            overwrite: true,
            clearProps: "opacity",
          },
        );
    };
    gallery
      .querySelectorAll<HTMLAnchorElement>("[data-photo-open]")
      .forEach((link) =>
        link.addEventListener("click", (e) => {
          e.preventDefault();
          origin=link.querySelector<HTMLImageElement>("img")!;
          const from=origin.getBoundingClientRect();
          select(Number(link.dataset.photoOpen));
          const token=revision;
          dialog.showModal();
          // Native dialog focus and state are immediate; only the image travels.
          picture.decode().then(()=>{if(dialog.open&&token===revision)continuity(from,picture.getBoundingClientRect(),picture.src);},()=>{});
        }),
      );
    dialog
      .querySelector("[data-photo-close]")
      ?.addEventListener("click", () => {
        const from=picture.getBoundingClientRect();const to=origin?.getBoundingClientRect();const src=picture.src;
        stop();dialog.close();
        if(to&&to.bottom>0&&to.top<innerHeight)continuity(from,to,src);
      });
    dialog.addEventListener("cancel",()=>stop());
    addEventListener("brand-motion",stop);
    addEventListener("pagehide",stop);
    dialog
      .querySelector("[data-photo-prev]")
      ?.addEventListener("click", () => select(active - 1));
    dialog
      .querySelector("[data-photo-next]")
      ?.addEventListener("click", () => select(active + 1));
    dialog.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        select(active + 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        select(active - 1);
      }
    });
  });
