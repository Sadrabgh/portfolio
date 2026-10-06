import { gsap } from "gsap";
import type * as T from "three";
type RecordData = {
  id: string;
  title: string;
  label: string;
  image: string;
  mobile: string;
  href: string;
  demo: string;
};
type Engine = {
  select: (id: string) => void;
  view: (mobile: boolean) => void;
  rotate: (amount: number) => void;
  reset: () => void;
  gap: (amount: number) => void;
  theme: () => void;
  motion: () => void;
  active: (value: boolean) => void;
  dispose: () => void;
};
const root = document.documentElement;
const reduced = () => root.dataset.motion === "reduce";
const controllers: Array<() => void> = [];
const scenes = document.querySelectorAll<HTMLElement>("[data-spatial-stage]");
scenes.forEach((stage) => {
  const records: RecordData[] = JSON.parse(stage.dataset.records || "[]");
  const variant = stage.dataset.variant || "projects";
  const canvas = stage.querySelector<HTMLCanvasElement>("canvas")!;
  const viewport = stage.querySelector<HTMLElement>(".stage-viewport")!;
  const fallback = stage.querySelector<HTMLImageElement>(
    ".stage-fallback img",
  )!;
  const status = stage.querySelector<HTMLElement>(".stage-status")!;
  const kind = stage.querySelector<HTMLElement>(".stage-kind")!;
  const staticButton = stage.querySelector<HTMLButtonElement>(
    "[data-stage-static]",
  )!;
  let engine: Engine | undefined,
    loading = false,
    dead = false,
    visible = false,
    staticMode = reduced(),
    mobileView = false,
    failed = false;
  let selected =
    records.find((p) => p.id === stage.dataset.project) || records[0];
  function setDisplay() {
    stage.dataset.state =
      engine && !staticMode ? "ready" : loading ? "loading" : "static";
    kind.textContent = engine && !staticMode ? "نمای سه‌بعدی" : "نمای ثابت";
    staticButton.textContent = "نمای ثابت";
    staticButton.disabled = failed;
    staticButton.setAttribute("aria-pressed", String(staticMode));
    stage
      .querySelectorAll<HTMLButtonElement>(
        "[data-stage-rotate],[data-stage-reset]",
      )
      .forEach((b) => (b.disabled = !engine || staticMode));
    engine?.active(visible && !staticMode);
  }
  function select(id: string) {
    const next = records.find((p) => p.id === id);
    if (!next) return;
    selected = next;
    stage.dataset.project = id;
    fallback.src = mobileView ? next.mobile : next.image;
    const title = stage.querySelector("[data-stage-title]");
    if (title) title.textContent = next.title;
    const label = stage.querySelector("[data-stage-label]");
    if (label) label.textContent = next.label;
    const link = stage.querySelector<HTMLAnchorElement>("[data-stage-link]");
    if (link) {
      link.href = next.href;
      link.setAttribute("aria-label", `بررسی ${next.title}`);
    }
    stage
      .querySelectorAll("[data-stage-project]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String((b as HTMLElement).dataset.stageProject === id),
        ),
      );
    status.textContent = `${next.title} انتخاب شد.`;
    engine?.select(id);
  }
  async function start() {
    if (engine || loading || dead || staticMode || failed) return;
    loading = true;
    setDisplay();
    try {
      const THREE = await import("three");
      if (dead) return;
      engine = await createEngine(
        THREE,
        canvas,
        viewport,
        records,
        variant,
        selected.id,
        () => {
          failed = true;
          staticMode = true;
          stage.dataset.webgl = "unavailable";
          status.textContent = "نمای ثابت پروژه در دسترس است.";
          setDisplay();
        },
      );
      if (dead) {
        engine.dispose();
        return;
      }
      engine.select(selected.id);
      engine.view(mobileView);
      engine.motion();
      engine.active(visible);
      stage.dataset.webgl = "available";
    } catch {
      failed = true;
      staticMode = true;
      stage.dataset.webgl = "unavailable";
      status.textContent = "نمای ثابت پروژه در دسترس است.";
    } finally {
      loading = false;
      setDisplay();
    }
  }
  stage
    .querySelectorAll<HTMLButtonElement>("[data-stage-project]")
    .forEach((b) =>
      b.addEventListener("click", () => select(b.dataset.stageProject!)),
    );
  stage.querySelectorAll<HTMLButtonElement>("[data-stage-view]").forEach((b) =>
    b.addEventListener("click", () => {
      mobileView = b.dataset.stageView === "mobile";
      stage.dataset.view = mobileView ? "mobile" : "desktop";
      fallback.src = mobileView ? selected.mobile : selected.image;
      stage
        .querySelectorAll("[data-stage-view]")
        .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      engine?.view(mobileView);
      status.textContent = `نمای ${mobileView ? "موبایل" : "دسکتاپ"} انتخاب شد.`;
    }),
  );
  stage
    .querySelectorAll<HTMLButtonElement>("[data-stage-rotate]")
    .forEach((b) =>
      b.addEventListener("click", () => {
        engine?.rotate(b.dataset.stageRotate === "left" ? -0.3 : 0.3);
        status.textContent = "زاویهٔ نمایش تغییر کرد.";
      }),
    );
  stage.querySelector("[data-stage-reset]")?.addEventListener("click", () => {
    engine?.reset();
    status.textContent = "زاویهٔ نمایش بازنشانی شد.";
  });
  const gapInput = stage.querySelector<HTMLInputElement>("[data-stage-gap]");
  gapInput?.addEventListener("input", () => {
    const value = Number(gapInput.value);
    stage.querySelector("output")!.textContent =
      `${value.toLocaleString("fa-IR")}٪`;
    engine?.gap(value / 100);
  });
  staticButton.addEventListener("click", () => {
    if (failed) {
      status.textContent =
        "نمای سه‌بعدی در این مرورگر در دسترس نیست؛ نماهای ثابت قابل بررسی‌اند.";
      return;
    }
    staticMode = !staticMode;
    setDisplay();
    if (!staticMode) void start();
    status.textContent = staticMode
      ? "نمای ثابت فعال شد."
      : "نمای سه‌بعدی فعال شد.";
  });
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      setDisplay();
      if (visible) void start();
    },
    { rootMargin: "100px" },
  );
  observer.observe(viewport);
  const preferences = new MutationObserver((entries) => {
    for (const item of entries) {
      if (item.attributeName === "data-theme") engine?.theme();
      if (item.attributeName === "data-motion") {
        staticMode = reduced();
        engine?.motion();
        setDisplay();
        if (visible && !staticMode) void start();
      }
    }
  });
  preferences.observe(root, {
    attributes: true,
    attributeFilter: ["data-theme", "data-motion"],
  });
  setDisplay();
  controllers.push(() => {
    dead = true;
    observer.disconnect();
    preferences.disconnect();
    engine?.dispose();
  });
});
window.addEventListener("pagehide", (event) => {
  if (!event.persisted) controllers.forEach((fn) => fn());
});

async function createEngine(
  THREE: typeof T,
  canvas: HTMLCanvasElement,
  viewport: HTMLElement,
  records: RecordData[],
  variant: string,
  initial: string,
  onLost: () => void,
): Promise<Engine> {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
  camera.position.set(0, 0.25, 11);
  const ambient = new THREE.HemisphereLight(0xffffff, 0x78639a, 2.3);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 4);
  key.position.set(-3, 6, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xae82ff, 3.5);
  rim.position.set(7, 1, -3);
  scene.add(rim);
  const world = new THREE.Group();
  scene.add(world);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 12),
    new THREE.ShadowMaterial({ opacity: 0.16 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -2.75;
  shadow.receiveShadow = true;
  scene.add(shadow);
  const loader = new THREE.TextureLoader();
  const textures: T.Texture[] = [];
  const materials: T.Material[] = [];
  const geometries: T.BufferGeometry[] = [];
  const textureFor = async (src: string) => {
    const map = await loader.loadAsync(src);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    textures.push(map);
    return map;
  };
  const imageTextures = await Promise.all(
    records.map((p) => textureFor(p.image)),
  );
  let mobileTexture: T.Texture | undefined;
  if (variant === "case") {
    mobileTexture = await textureFor(records[0].mobile);
    mobileTexture.repeat.set(1, 0.5);
    mobileTexture.offset.set(0, 0.5);
  }
  const cards: T.Group[] = [];
  const bodies: T.MeshPhysicalMaterial[] = [];
  const faces: T.Mesh[] = [];
  function geometry<G extends T.BufferGeometry>(g: G): G {
    geometries.push(g);
    return g;
  }
  function material<M extends T.Material>(m: M): M {
    materials.push(m);
    return m;
  }
  function roundShape(width: number, height: number, r: number) {
    const x = -width / 2,
      y = -height / 2;
    const shape = new THREE.Shape();
    shape.moveTo(x + r, y);
    shape.lineTo(x + width - r, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + r);
    shape.lineTo(x + width, y + height - r);
    shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    shape.lineTo(x + r, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    return shape;
  }
  function makeCard(
    map: T.Texture,
    index: number,
    width = 5.4,
    height = 3.968,
  ) {
    const card = new THREE.Group();
    const bodyMaterial = material(
      new THREE.MeshPhysicalMaterial({
        color: 0xe8e0ff,
        metalness: 0.28,
        roughness: 0.28,
        clearcoat: 1,
        clearcoatRoughness: 0.18,
      }),
    );
    bodies.push(bodyMaterial);
    const body = new THREE.Mesh(
      geometry(
        new THREE.ExtrudeGeometry(roundShape(width + 0.2, height + 0.2, 0.1), {
          depth: 0.11,
          bevelEnabled: true,
          bevelSize: 0.035,
          bevelThickness: 0.035,
          bevelSegments: 3,
          steps: 1,
        }),
      ),
      bodyMaterial,
    );
    body.position.z = -0.15;
    body.castShadow = true;
    card.add(body);
    const face = new THREE.Mesh(
      geometry(new THREE.PlaneGeometry(width, height)),
      material(new THREE.MeshBasicMaterial({ map, toneMapped: false })),
    );
    face.position.z = 0.035;
    card.add(face);
    faces.push(face);
    const line = new THREE.LineSegments(
      geometry(
        new THREE.EdgesGeometry(
          new THREE.BoxGeometry(width + 0.28, height + 0.28, 0.17),
        ),
      ),
      material(
        new THREE.LineBasicMaterial({
          color: 0x966bdf,
          transparent: true,
          opacity: 0.45,
        }),
      ),
    );
    line.position.z = -0.06;
    card.add(line);
    world.add(card);
    cards[index] = card;
    return card;
  }
  function diagram(type: "wire" | "interaction") {
    const c = document.createElement("canvas");
    c.width = 1080;
    c.height = 794;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.lineWidth = 4;
    ctx.strokeStyle = type === "wire" ? "#8c6eb1" : "#693ad0";
    ctx.fillStyle = type === "wire" ? "#f8f5ff" : "rgba(233,222,255,.08)";
    ctx.fillRect(0, 0, 1080, 794);
    const rect = (x: number, y: number, w: number, h: number) =>
      ctx.strokeRect(x, y, w, h);
    if (type === "wire") {
      rect(36, 30, 1008, 80);
      rect(570, 180, 438, 150);
      rect(570, 375, 438, 50);
      rect(48, 230, 410, 200);
      rect(48, 500, 960, 245);
      for (let x = 64; x < 1000; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 760);
        ctx.lineTo(x, 778);
        ctx.stroke();
      }
    } else {
      ctx.setLineDash([12, 10]);
      rect(830, 30, 175, 55);
      rect(568, 330, 425, 96);
      rect(45, 498, 965, 243);
      ctx.setLineDash([]);
      for (const [x, y] of [
        [830, 30],
        [570, 330],
        [48, 500],
      ]) {
        ctx.fillStyle = "#d4f465";
        ctx.fillRect(x - 10, y - 10, 20, 20);
      }
      ctx.fillStyle = "#693ad0";
      ctx.fillRect(566, 431, 160, 7);
    }
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    textures.push(map);
    return map;
  }
  if (variant === "layers") {
    makeCard(diagram("wire"), 0);
    makeCard(imageTextures[0], 1);
    makeCard(diagram("interaction"), 2);
    (faces[2].material as T.MeshBasicMaterial).transparent = true;
    (faces[2].material as T.MeshBasicMaterial).depthWrite = false;
    bodies[2].transparent = true;
    bodies[2].opacity = 0.12;
    bodies[2].depthWrite = false;
  } else records.forEach((_, i) => makeCard(imageTextures[i], i));
  let currentId = initial,
    isMobile = false,
    active = false,
    frame = 0,
    disposed = false,
    dragging = false,
    userY = 0,
    userX = 0,
    hoverX = 0,
    hoverY = 0,
    scrollPose = 0,
    gapAmount = 0.7;
  const timelines: gsap.core.Tween[] = [];
  function tween(target: object, values: gsap.TweenVars) {
    const t = gsap.to(target, {
      ...values,
      duration: reduced() ? 0 : 1.1,
      ease: "power3.inOut",
      overwrite: "auto",
      onUpdate: requestRender,
    });
    timelines.push(t);
  }
  function arrange(animate = true) {
    const chosen = Math.max(
      0,
      records.findIndex((p) => p.id === currentId),
    );
    cards.forEach((card, i) => {
      let x = 0,
        y = 0,
        z = 0,
        ry = 0,
        rx = -0.05,
        rz = 0,
        scale = 1;
      if (variant === "layers") {
        x = (i - 1) * (gapAmount * 0.9);
        y = (i - 1) * gapAmount * 0.26;
        z = (i - 1) * (gapAmount * 2 + 0.15);
        ry = -0.42;
        rz = -0.025;
      } else if (variant === "case") {
        ry = -0.14;
        rx = -0.07;
        scale = isMobile ? 0.89 : 1;
      } else {
        const order = (i - chosen + records.length) % records.length;
        card.visible =
          order === 0 || order === 1 || order === records.length - 1;
        const side = order === 1 ? -1 : 1;
        x = i === chosen ? 0 : side * 2.9;
        y = i === chosen ? 0.1 : 0.32;
        z = i === chosen ? 1.15 : -0.6;
        ry = i === chosen ? -0.25 : -side * 0.4;
        rz = i === chosen ? 0.015 : side * 0.07;
        scale = i === chosen ? 1.06 : 0.87;
      }
      if (animate) {
        tween(card.position, { x, y, z });
        tween(card.rotation, { x: rx, y: ry, z: rz });
        tween(card.scale, { x: scale, y: scale, z: scale });
      } else {
        card.position.set(x, y, z);
        card.rotation.set(rx, ry, rz);
        card.scale.setScalar(scale);
      }
    });
    requestRender();
  }
  function render(time = performance.now()) {
    frame = 0;
    if (disposed) return;
    const breathing =
      active && !reduced() && !dragging ? Math.sin(time * 0.0006) * 0.035 : 0;
    const targetY = userY + hoverX * 0.12 + scrollPose * 0.09 + breathing;
    const targetX = userX - hoverY * 0.055 + scrollPose * 0.12;
    world.rotation.y = THREE.MathUtils.lerp(
      world.rotation.y,
      targetY,
      reduced() ? 1 : 0.09,
    );
    world.rotation.x = THREE.MathUtils.lerp(
      world.rotation.x,
      targetX,
      reduced() ? 1 : 0.09,
    );
    renderer.render(scene, camera);
    if (active && !document.hidden && !reduced())
      frame = requestAnimationFrame(render);
  }
  function requestRender() {
    if (!frame && !disposed) frame = requestAnimationFrame(render);
  }
  function resize() {
    const w = viewport.clientWidth,
      h = viewport.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const worldWidth =
      variant === "case"
        ? isMobile
          ? 4.2
          : 6.7
        : variant === "layers"
          ? 8.1
          : w < 480
            ? 8.2
            : 9.3;
    const worldHeight =
      variant === "case"
        ? isMobile
          ? 5.7
          : 5.2
        : variant === "layers"
          ? 5.8
          : 6.4;
    camera.position.z =
      Math.max(worldHeight, worldWidth / camera.aspect) /
      (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.updateProjectionMatrix();
    requestRender();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(viewport);
  function syncTheme() {
    const dark = root.dataset.theme === "dark";
    bodies.forEach((m) => m.color.set(dark ? 0x4d405f : 0xe8e0ff));
    ambient.groundColor.set(dark ? 0x2c183e : 0x917daa);
    shadow.material.opacity = dark ? 0.25 : 0.14;
    requestRender();
  }
  let startX = 0,
    startY = 0,
    lastX = 0,
    lastY = 0;
  const down = (e: PointerEvent) => {
    if (!active) return;
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
    dragging = false;
  };
  const move = (e: PointerEvent) => {
    if (!active) return;
    if (e.buttons === 1) {
      const dx = e.clientX - startX,
        dy = e.clientY - startY;
      if (
        !dragging &&
        (e.pointerType === "mouse" ||
          (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2))
      ) {
        dragging = true;
        canvas.setPointerCapture(e.pointerId);
      }
      if (dragging) {
        userY = THREE.MathUtils.clamp(
          userY + (e.clientX - lastX) * 0.005,
          -0.7,
          0.7,
        );
        if (e.pointerType === "mouse")
          userX = THREE.MathUtils.clamp(
            userX + (e.clientY - lastY) * 0.003,
            -0.2,
            0.2,
          );
      }
      lastX = e.clientX;
      lastY = e.clientY;
    } else if (e.pointerType === "mouse") {
      const r = canvas.getBoundingClientRect();
      hoverX = (e.clientX - r.left) / r.width - 0.5;
      hoverY = (e.clientY - r.top) / r.height - 0.5;
    }
    requestRender();
  };
  const up = () => {
    dragging = false;
  };
  const leave = () => {
    hoverX = hoverY = 0;
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("pointerleave", leave);
  const scroll = () => {
    const r = viewport.getBoundingClientRect();
    scrollPose = THREE.MathUtils.clamp(
      (innerHeight * 0.45 - r.top - r.height * 0.5) / innerHeight,
      -0.5,
      0.5,
    );
    if (active) requestRender();
  };
  window.addEventListener("scroll", scroll, { passive: true });
  const visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else if (active) requestRender();
  };
  document.addEventListener("visibilitychange", visibility);
  const lost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(frame);
    frame = 0;
    active = false;
    onLost();
  };
  canvas.addEventListener("webglcontextlost", lost);
  arrange(false);
  syncTheme();
  resize();
  renderer.render(scene, camera);
  if (!reduced()) {
    cards.forEach((card, i) => {
      const z = card.rotation.z;
      const y = card.position.y;
      gsap.fromTo(
        card.rotation,
        { z: z + (i % 2 ? -0.22 : 0.22) },
        {
          z,
          duration: 1.5,
          delay: i * 0.1,
          ease: "power3.out",
          onUpdate: requestRender,
        },
      );
      gsap.fromTo(
        card.position,
        { y: y - 0.9 },
        {
          y,
          duration: 1.5,
          delay: i * 0.1,
          ease: "power3.out",
          onUpdate: requestRender,
        },
      );
    });
  }
  return {
    select(id) {
      currentId = id;
      arrange();
    },
    view(value) {
      if (variant !== "case") return;
      isMobile = value;
      const face = faces[0];
      face.geometry.dispose();
      face.geometry = geometry(
        new THREE.PlaneGeometry(isMobile ? 2.34 : 5.4, isMobile ? 4.5 : 3.968),
      );
      (face.material as T.MeshBasicMaterial).map = isMobile
        ? mobileTexture!
        : imageTextures[0];
      (face.material as T.MeshBasicMaterial).needsUpdate = true;
      const card = cards[0];
      card.children
        .filter((c) => c !== face)
        .forEach((c) => {
          c.scale.x = isMobile ? 0.46 : 1;
          c.scale.y = isMobile ? 1.11 : 1;
        });
      arrange();
      resize();
    },
    rotate(amount) {
      userY = THREE.MathUtils.clamp(userY + amount, -0.7, 0.7);
      requestRender();
    },
    reset() {
      userX = userY = hoverX = hoverY = 0;
      requestRender();
    },
    gap(value) {
      gapAmount = value;
      arrange();
    },
    theme: syncTheme,
    motion() {
      timelines.forEach((t) => {
        if (reduced()) t.progress(1);
      });
      arrange(false);
      requestRender();
    },
    active(value) {
      active = value;
      if (value) requestRender();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
        renderer.render(scene, camera);
      }
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      timelines.forEach((t) => t.kill());
      gsap.killTweensOf(cards.map((c) => c.position));
      gsap.killTweensOf(cards.map((c) => c.rotation));
      gsap.killTweensOf(cards.map((c) => c.scale));
      resizeObserver.disconnect();
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("webglcontextlost", lost);
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
      geometries.forEach((g) => g.dispose());
      (shadow.material as T.Material).dispose();
      shadow.geometry.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
