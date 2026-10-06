import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildStudy } from "../three/study-models";
const root = document.documentElement;
document.querySelectorAll<HTMLElement>("[data-study]").forEach((stage) => {
  const viewport = stage.querySelector<HTMLElement>("[data-model-viewport]")!,
    fallback = stage.querySelector<HTMLImageElement>(".model-fallback")!,
    status = stage.querySelector<HTMLElement>(".model-status")!;
  const kind = stage.dataset.study!,
    bike = kind === "bike";
  let variant = stage.dataset.variant!,
    color = "cyan";
  let renderer: T.WebGLRenderer;
  try {
    renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
  } catch {
    status.textContent =
      "نمای سه‌بعدی در دسترس نیست؛ تصویر ثابت نمایش داده می‌شود.";
    stage
      .querySelectorAll<HTMLButtonElement>(".model-controls button")
      .forEach((b) => (b.disabled = true));
    if (bike) {
      const updateFallback = (event: Event) => {
        const c = (event as CustomEvent).detail;
        fallback.src = fallback.src.replace(
          /velo-(city|step|tour)-(cyan|ink|chalk)/,
          `velo-${c.model}-${c.color}`,
        );
        fallback.alt = `دوچرخهٔ مفهومی VELO ${c.model} ${c.color}`;
      };
      window.addEventListener("velo-config", updateFallback);
      if ((window as any).__veloConfig)
        updateFallback(
          new CustomEvent("velo-config", {
            detail: (window as any).__veloConfig,
          }),
        );
    }
    stage.dataset.ready = "fallback";
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = bike ? 1.05 : 1.2;
  viewport.append(renderer.domElement);
  stage
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach((b) => (b.disabled = false));
  fallback.hidden = true;
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(36, 1, 0.01, 60);
  const pmrem = new T.PMREMGenerator(renderer);
  const environment = new RoomEnvironment();
  const env = pmrem.fromScene(environment, 0.04);
  scene.environment = env.texture;
  environment.dispose();
  pmrem.dispose();
  const model = buildStudy(kind, variant);
  scene.add(model.group);
  const target = new T.Vector3(0, bike ? 0.86 : 0.6, 0);
  let radius = bike ? 4.6 : 7,
    angle = bike ? 0.4 : 0.5,
    elevation = 0.34;
  let cameraMode = "overview",
    exploded = false,
    night = false,
    staticMode = false,
    visible = true,
    disposed = false,
    dragging = false,
    frame = 0;
  let cameraMove: {from:T.Vector3; look:T.Vector3; start:number} | undefined;
  const light = new T.DirectionalLight("#fff5e7", 4);
  light.position.set(3, 6, 4);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.camera.left = -5;
  light.shadow.camera.right = 5;
  light.shadow.camera.top = 5;
  light.shadow.camera.bottom = -5;
  light.shadow.bias = -0.0005;
  scene.add(light);
  const fill = new T.DirectionalLight("#bce3ff", 2.5);
  fill.position.set(-4, 3, -3);
  scene.add(fill);
  const ambient = new T.HemisphereLight("#f3f8ff", "#373f45", 2);
  scene.add(ambient);
  const floor = new T.Mesh(
    new T.PlaneGeometry(30, 30),
    new T.ShadowMaterial({ color: "#1c3743", opacity: 0.2 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = bike ? 0 : -0.12;
  floor.receiveShadow = true;
  scene.add(floor);
  const context = new T.Group();
  scene.add(context);
  function contextSet(id: string) {
    context.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        (o.material as T.Material).dispose();
      }
    });
    context.clear();
    if (id === "studio") return;
    const mat = new T.MeshStandardMaterial({
      color: id === "city" ? "#829497" : "#92a68a",
      roughness: 0.9,
    });
    for (let i = 0; i < 5; i++) {
      const m = new T.Mesh(
        id === "city"
          ? new T.BoxGeometry(0.65, 1 + (i % 2), 0.45)
          : new T.IcosahedronGeometry(0.4, 1),
        mat.clone(),
      );
      m.position.set(-2.1 + i, id === "city" ? 0.4 : 0.6, -2);
      context.add(m);
    }
    if (id === "park") {
      const ground = new T.Mesh(
        new T.PlaneGeometry(8, 8),
        new T.MeshStandardMaterial({ color: "#859a83", roughness: 1 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.003;
      ground.receiveShadow = true;
      context.add(ground);
    }
  }
  function fallbackUpdate() {
    if (bike) {
      fallback.src = fallback.src.replace(
        /velo-(city|step|tour)-(cyan|ink|chalk)/,
        `velo-${variant}-${color}`,
      );
      fallback.alt = `دوچرخهٔ مفهومی VELO ${variant.toUpperCase()} ${color}`;
    }
  }
  function setCamera(mode: string) {
    cameraMode = mode;
    if (!bike && mode === "inside") {
      exploded = true;
      stage
        .querySelector("[data-explode]")
        ?.setAttribute("aria-pressed", "true");
    }

    const pos: Record<string, number[]> = {
      overview: [0, bike ? 0.86 : 0.6, 0, bike ? 4.6 : 7, 0.4, 0.34],
      top: [0, 0.6, 0, 6, 0.1, 1.45],
      inside: [0, 0.7, 0, 4.3, 0.3, 0.12],
      battery: [0.15, 0.83, 0.03, 1.75, 0.32, 0.25],
      drive: [-0.6, 0.48, 0.05, 1.8, -0.12, 0.18],
      cockpit: [0.56, 1.5, 0, 1.7, 0.28, 0.28],
    };
    const p = pos[mode] || pos.overview;
    cameraMove = root.dataset.demoMotion === "reduce" || staticMode ? undefined : {from:camera.position.clone(),look:smoothLook.clone(),start:performance.now()};
    target.set(p[0], p[1], p[2]);
    radius = p[3];
    angle = p[4];
    elevation = p[5];
    stage
      .querySelectorAll<HTMLElement>("[data-camera]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.camera === mode)),
      );
    if(bike) window.dispatchEvent(new CustomEvent("velo-view",{detail:mode}));
    start();
  }
  const smoothLook = target.clone();
  let explodeProgress = 0;
  let firstDraw = true;
  function draw() {
    if (disposed) return;
    const sway = 0;
    const desiredPosition = new T.Vector3(
      target.x + Math.sin(angle + sway) * radius * Math.cos(elevation),
      target.y + Math.sin(elevation) * radius,
      target.z + Math.cos(angle + sway) * radius * Math.cos(elevation),
    );
    const smooth =
      root.dataset.demoMotion !== "reduce" &&
      !staticMode &&
      !dragging &&
      !firstDraw;
    if(cameraMove && smooth) {
      const progress = Math.min(1,(performance.now()-cameraMove.start)/760);
      const eased=1-Math.pow(1-progress,3);
      camera.position.lerpVectors(cameraMove.from,desiredPosition,eased);
      smoothLook.lerpVectors(cameraMove.look,target,eased);
      if(progress===1) cameraMove=undefined;
    } else {
      cameraMove=undefined;
      camera.position.copy(desiredPosition);
      smoothLook.copy(target);
    }
    camera.lookAt(smoothLook);
    explodeProgress = T.MathUtils.lerp(
      explodeProgress,
      exploded ? 1 : 0,
      smooth ? 0.09 : 1,
    );
    firstDraw = false;
    model.moving.forEach((o) => {
      const origin = o.userData.origin as T.Vector3,
        offset = o.userData.explode as T.Vector3;
      o.position.copy(origin).addScaledVector(offset, explodeProgress);
    });
    renderer.render(scene, camera);
    for (const b of viewport.querySelectorAll<HTMLButtonElement>(
      "[data-hotspot]",
    )) {
      const part = model.parts[b.dataset.hotspot!]!;
      const position = new T.Vector3();
      part.getWorldPosition(position);
      if (b.dataset.hotspot === "drive") position.set(-0.28, 0.48, 0.14);
      if (b.dataset.hotspot === "cockpit") position.set(0.6, 1.57, 0);
      if (b.dataset.hotspot === "battery") position.set(0.13, 0.83, 0.11);
      position.project(camera);
      b.hidden = cameraMode !== "overview" || exploded || position.z > 1;
      b.style.left = (position.x * 0.5 + 0.5) * viewport.clientWidth + "px";
      b.style.top = (-position.y * 0.5 + 0.5) * viewport.clientHeight + "px";
    }
    stage.dataset.ready = "true";
  }
  function resize() {
    const width = viewport.clientWidth,
      height = viewport.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (width < 500 && cameraMode === "overview") radius = bike ? 5.6 : 8;
    draw();
  }
  function loop() {
    frame = 0;
    if (
      disposed ||
      !visible ||
      document.hidden ||
      staticMode ||
      root.dataset.demoMotion === "reduce"
    )
      return;
    draw();
    if(cameraMove || Math.abs(explodeProgress-(exploded?1:0))>.001) frame = requestAnimationFrame(loop);
  }
  function start() {
    cancelAnimationFrame(frame);
    draw();
    if (
      visible &&
      !staticMode &&
      root.dataset.demoMotion !== "reduce" &&
      !document.hidden && (cameraMove || Math.abs(explodeProgress-(exploded?1:0))>.001)
    )
      frame = requestAnimationFrame(loop);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(viewport);
  const io = new IntersectionObserver(
    (e) => {
      visible = e[0].isIntersecting;
      start();
    },
    { rootMargin: "80px" },
  );
  io.observe(viewport);
  function theme() {
    const dark = root.dataset.demoTheme === "dark";
    renderer.setClearColor(
      kind === "architecture"
        ? dark
          ? "#282727"
          : "#eeece5"
        : kind === "clinic"
          ? dark
            ? "#193941"
            : "#eef6f3"
          : dark
            ? "#1b2a32"
            : "#f0f4f4",
      bike ? 0 : 1,
    );
    scene.environmentIntensity = night ? 0.55 : bike ? .95 : 1.1;
    light.intensity = night ? 1.5 : bike ? 3.2 : 4;
    fill.intensity = night ? 3 : bike ? 1.7 : 2.5;
    ambient.intensity = night ? 0.7 : bike ? 1.2 : 2;
    draw();
  }
  stage
    .querySelectorAll<HTMLElement>("[data-camera],[data-hotspot]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        setCamera(b.dataset.camera || b.dataset.hotspot!),
      ),
    );
  stage.querySelector("[data-explode]")?.addEventListener("click", (e) => {
    exploded = !exploded;
    (e.currentTarget as Element).setAttribute("aria-pressed", String(exploded));
    start();
  });
  stage.querySelector("[data-light]")?.addEventListener("click", (e) => {
    night = !night;
    (e.currentTarget as Element).setAttribute("aria-pressed", String(night));
    theme();
  });
  stage.querySelector("[data-static]")?.addEventListener("click", (e) => {
    staticMode = !staticMode;
    (e.currentTarget as Element).setAttribute(
      "aria-pressed",
      String(staticMode),
    );
    status.textContent = staticMode
      ? "نمای ثابت فعال است."
      : "برای چرخش، افقی بکشید.";
    start();
  });
  stage.querySelector("[data-reset]")?.addEventListener("click", () => {
    exploded = false;
    stage
      .querySelector("[data-explode]")
      ?.setAttribute("aria-pressed", "false");
    setCamera("overview");
    resize();
  });
  stage.querySelectorAll<HTMLElement>("[data-zoom]").forEach((b) =>
    b.addEventListener("click", () => {
      radius = T.MathUtils.clamp(
        radius - Number(b.dataset.zoom) * 0.4,
        bike ? 1.2 : 3,
        11,
      );
      draw();
    }),
  );
  let downX = 0,
    lastX = 0,
    lastY = 0;
  viewport.addEventListener("pointerdown", (e) => {
    if ((e.target as Element).closest("button")) return;
    downX = lastX = e.clientX;
    lastY = e.clientY;
    dragging = true;
    cameraMove = undefined;
    if (e.pointerType === "mouse") viewport.setPointerCapture(e.pointerId);
  });
  viewport.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX,
      dy = e.clientY - lastY;
    if (e.pointerType === "mouse" || Math.abs(e.clientX - downX) > 12) {
      angle -= dx * 0.008;
      if (e.pointerType === "mouse")
        elevation = T.MathUtils.clamp(elevation + dy * 0.006, -0.05, 1.45);
      draw();
    }
    lastX = e.clientX;
    lastY = e.clientY;
  });
  for (const ev of ["pointerup", "pointercancel", "pointerleave"])
    viewport.addEventListener(ev, () => (dragging = false));
  viewport.addEventListener("keydown", (e) => {
    if ((e.target as Element).closest("button")) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      cameraMove = undefined;
      if (e.key === "ArrowLeft") angle -= 0.12;
      if (e.key === "ArrowRight") angle += 0.12;
      if (e.key === "ArrowUp") elevation = Math.min(1.45, elevation + 0.1);
      if (e.key === "ArrowDown") elevation = Math.max(0, elevation - 0.1);
      draw();
    }
  });
  function config(e: Event) {
    if (!bike) return;
    const c = (e as CustomEvent).detail;
    variant = c.model;
    color = c.color;
    model.setVariant(variant);
    model.paint.color.set(
      { cyan: "#15b6c4", ink: "#323b40", chalk: "#d6d7ce" }[
        c.color as "cyan" | "ink" | "chalk"
      ],
    );
    model.paint.roughness = c.finish === "gloss" ? 0.13 : 0.38;
    model.paint.clearcoat = c.finish === "gloss" ? 1 : 0.5;
    model.group.scale.setScalar(
      c.size === "S" ? 0.94 : c.size === "L" ? 1.06 : 1,
    );
    contextSet(c.environment);
    fallbackUpdate();
    draw();
  }
  const externalCamera = (e: Event) => {
    if (bike) setCamera((e as CustomEvent).detail);
  };
  window.addEventListener("velo-config", config);
  window.addEventListener("velo-camera", externalCamera);
  window.addEventListener("brand-theme", theme);
  window.addEventListener("brand-motion", start);
  document.addEventListener("visibilitychange", start);
  stage.querySelector("[data-capture]")?.addEventListener("click", () => {
    draw();
    renderer.domElement.toBlob((blob) => {
      if (!blob) {
        status.textContent = "ذخیرهٔ تصویر در دسترس نیست.";
        return;
      }
      const href = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = href;
      a.download = `VELO-${variant}-${color}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 3000);
      status.textContent = "تصویر همین مدل آمادهٔ ذخیره شد.";
    });
  });
  theme();
  resize();
  status.textContent = "برای چرخش، افقی بکشید.";
  start();
  if (bike && (window as any).__veloConfig)
    config(
      new CustomEvent("velo-config", { detail: (window as any).__veloConfig }),
    );
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    ro.disconnect();
    io.disconnect();
    window.removeEventListener("velo-config", config);
    window.removeEventListener("velo-camera", externalCamera);
    window.removeEventListener("brand-theme", theme);
    window.removeEventListener("brand-motion", start);
    document.removeEventListener("visibilitychange", start);
    scene.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
    });
    env.dispose();
    renderer.dispose();
  }
  window.addEventListener("pagehide", (e) => {
    if (e.persisted) {
      visible = false;
      start();
    } else dispose();
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      visible = true;
      start();
    }
  });
  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    fallback.hidden = false;
    status.textContent = "نمای ثابت نمایش داده می‌شود.";
    cancelAnimationFrame(frame);
  });
});
