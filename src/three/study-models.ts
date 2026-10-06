import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
const v = (x: number, y: number, z = 0) => new T.Vector3(x, y, z);
export function buildStudy(kind: string, variant: string) {
  const group = new T.Group();
  const moving: T.Object3D[] = [];
  const paint = new T.MeshPhysicalMaterial({
    color: "#15b6c4",
    metalness: 0.68,
    roughness: 0.32,
    clearcoat: 0.65,
    clearcoatRoughness: 0.22,
  });
  const metal = new T.MeshStandardMaterial({
    color: "#b5c1c8",
    metalness: 0.9,
    roughness: 0.24,
  });
  const black = new T.MeshStandardMaterial({
    color: "#20262a",
    roughness: 0.65,
    metalness: 0.25,
  });
  const rubber = new T.MeshStandardMaterial({
    color: "#11191c",
    roughness: 0.94,
  });
  const white = new T.MeshStandardMaterial({
    color: "#e5e2d7",
    roughness: 0.85,
  });
  const wood = new T.MeshStandardMaterial({
    color: "#967953",
    roughness: 0.75,
  });
  const glass = new T.MeshPhysicalMaterial({
    color: "#b8d6d6",
    roughness: 0.12,
    metalness: 0.15,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const brick = new T.MeshStandardMaterial({
    color: "#a84635",
    roughness: 0.94,
  });
  function mesh(
    geo: T.BufferGeometry,
    mat: T.Material,
    pos: T.Vector3,
    parent: T.Object3D = group,
  ) {
    const m = new T.Mesh(geo, mat);
    m.position.copy(pos);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    mat: T.Material,
    parent: T.Object3D = group,
    round = 0,
  ) {
    return mesh(
      round
        ? new RoundedBoxGeometry(sx, sy, sz, 3, round)
        : new T.BoxGeometry(sx, sy, sz),
      mat,
      v(x, y, z),
      parent,
    );
  }
  function tube(
    a: T.Vector3,
    b: T.Vector3,
    r: number,
    mat: T.Material,
    parent: T.Object3D = group,
  ) {
    const d = b.clone().sub(a);
    const m = mesh(
      new T.CylinderGeometry(r, r, d.length(), 20),
      mat,
      a.clone().add(b).multiplyScalar(0.5),
      parent,
    );
    m.quaternion.setFromUnitVectors(v(0, 1), d.normalize());
    return m;
  }
  function torus(
    x: number,
    y: number,
    z: number,
    r: number,
    t: number,
    mat: T.Material,
    parent: T.Object3D = group,
  ) {
    return mesh(new T.TorusGeometry(r, t, 12, 80), mat, v(x, y, z), parent);
  }
  function bolt(x: number, y: number, z: number, parent: T.Object3D = group) {
    const m = mesh(
      new T.CylinderGeometry(0.017, 0.017, 0.014, 6),
      metal,
      v(x, y, z),
      parent,
    );
    m.rotation.x = Math.PI / 2;
    return m;
  }
  function tree(x: number, z: number, scale = 0.3, parent: T.Object3D = group) {
    tube(v(x, 0, z), v(x, scale * 2.3, z), scale * 0.12, wood, parent);
    for (let j = 0; j < 4; j++) {
      const leaf = new T.MeshStandardMaterial({
        color: j % 2 ? "#526453" : "#758568",
        roughness: 1,
      });
      mesh(
        new T.IcosahedronGeometry(scale * (1 - j * 0.1), 1),
        leaf,
        v(x + (j % 2 ? -0.1 : 0.1) * scale, scale * (2 + j * 0.23), z),
        parent,
      );
    }
  }
  const parts: Record<string, T.Object3D> = {};
  let variantParts = new T.Group();
  group.add(variantParts);
  if (kind === "bike") {
    const rear = v(-1.06, 0.47),
      front = v(1.04, 0.47),
      bb = v(-0.28, 0.48),
      seat = v(-0.51, 1.29),
      headLow = v(0.58, 1.13),
      headHigh = v(0.52, 1.39);
    // Main structure: separate welded tubes and integrated down-tube battery.
    tube(bb, seat, 0.053, paint);
    tube(bb, headLow, 0.074, paint);
    tube(headLow, headHigh, 0.058, paint);
    tube(rear, bb, 0.037, paint);
    tube(rear, seat, 0.034, paint);
    tube(v(rear.x, rear.y, -0.08), v(bb.x, bb.y, -0.08), 0.025, paint);
    tube(v(rear.x, rear.y, 0.08), v(seat.x, seat.y, 0.08), 0.026, paint);
    for (const p of [bb, seat, headLow, headHigh])
      mesh(new T.SphereGeometry(0.057, 20, 12), paint, p);
    const battery = new T.Group();
    group.add(battery);
    const midpoint = bb.clone().lerp(headLow, 0.52);
    const batteryCase = box(
      midpoint.x,
      midpoint.y,
      0.052,
      0.45,
      0.105,
      0.09,
      black,
      battery,
      0.018,
    );
    batteryCase.rotation.z = Math.atan2(headLow.y - bb.y, headLow.x - bb.x);
    for (const dx of [-0.14, 0.14])
      bolt(midpoint.x + dx, midpoint.y + dx * 0.8, 0.103, battery);
    parts.battery = battery;
    moving.push(battery);
    box(
      midpoint.x + 0.025,
      midpoint.y + 0.06,
      0.11,
      0.035,
      0.035,
      0.008,
      rubber,
      battery,
      0.004,
    );
    const rearWheel = new T.Group(),
      frontWheel = new T.Group();
    group.add(rearWheel, frontWheel);
    moving.push(rearWheel, frontWheel);
    rearWheel.userData.explode = v(-0.25, 0.05, 0.5);
    frontWheel.userData.explode = v(0.25, 0.05, -0.5);
    for (const [center, wheel] of [
      [rear, rearWheel],
      [front, frontWheel],
    ] as [T.Vector3, T.Group][]) {
      torus(center.x, center.y, 0, 0.415, 0.049, rubber, wheel);
      torus(center.x, center.y, 0, 0.374, 0.018, metal, wheel);
      torus(center.x, center.y, 0.043, 0.403, 0.0025, black, wheel);
      torus(center.x, center.y, -0.043, 0.403, 0.0025, black, wheel);
      tube(
        center.clone().add(v(0, 0, -0.1)),
        center.clone().add(v(0, 0, 0.1)),
        0.038,
        metal,
        wheel,
      );
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        const rim = v(
          center.x + Math.cos(a) * 0.368,
          center.y + Math.sin(a) * 0.368,
          (i % 2 ? 1 : -1) * 0.007,
        );
        tube(
          center.clone().add(v(0, 0, (i % 2 ? 1 : -1) * 0.05)),
          rim,
          0.0025,
          metal,
          wheel,
        );
      }
      // Staggered tire tread ribs produce highlights as the wheel turns.
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const tread = box(
          center.x + Math.cos(a) * 0.461,
          center.y + Math.sin(a) * 0.461,
          0,
          0.019,
          0.009,
          0.04,
          black,
          wheel,
          0.003,
        );
        tread.rotation.z = a + Math.PI / 2;
      }
      torus(center.x, center.y, 0.083, 0.11, 0.011, metal, wheel);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        tube(
          v(
            center.x + Math.cos(a) * 0.035,
            center.y + Math.sin(a) * 0.035,
            0.083,
          ),
          v(center.x + Math.cos(a) * 0.1, center.y + Math.sin(a) * 0.1, 0.083),
          0.006,
          metal,
          wheel,
        );
      }
      bolt(center.x, center.y, 0.12, wheel);
      box(
        center.x + 0.09,
        center.y + 0.09,
        0.085,
        0.085,
        0.075,
        0.038,
        black,
        wheel,
        0.01,
      );
    }
    // Fork, headset and cockpit.
    for (const z of [-0.07, 0.07]) {
      tube(v(headLow.x, headLow.y, z), v(front.x, front.y, z), 0.037, paint);
      tube(v(front.x, front.y, z), v(front.x, front.y, z * 1.8), 0.027, metal);
    }
    tube(headHigh, v(0.49, 1.5), 0.033, metal);
    tube(v(0.49, 1.5), v(0.62, 1.57), 0.035, black);
    const cockpit = new T.Group();
    group.add(cockpit);
    tube(v(0.62, 1.57, -0.34), v(0.62, 1.57, 0.34), 0.023, metal, cockpit);
    for (const z of [-0.32, 0.32]) {
      tube(v(0.62, 1.57, z), v(0.68, 1.57, z * 1.35), 0.031, rubber, cockpit);
      tube(v(0.61, 1.55, z), v(0.73, 1.52, z * 1.32), 0.012, black, cockpit);
      bolt(0.62, 1.6, z, cockpit);
    }
    box(0.64, 1.59, 0.04, 0.075, 0.025, 0.09, black, cockpit, 0.007);
    box(0.64, 1.605, 0.04, 0.05, 0.006, 0.06, glass, cockpit, 0.004);
    parts.cockpit = cockpit;
    const cableCurve = new T.CatmullRomCurve3([
      v(0.64, 1.53, 0.2),
      v(0.78, 1.25, 0.18),
      v(0.48, 1.08, 0.12),
      v(0.93, 0.57, 0.08),
    ]);
    mesh(new T.TubeGeometry(cableCurve, 40, 0.005, 8, false), rubber, v(0, 0));
    tube(seat, v(-0.59, 1.52), 0.031, metal);
    box(-0.62, 1.58, 0, 0.34, 0.065, 0.19, black, group, 0.025);
    tube(v(-0.72, 1.51, -0.035), v(-0.53, 1.54, -0.035), 0.009, metal);
    bolt(-0.55, 1.35, 0.065);
    // Drivetrain: toothed rings, chain and independently built pedals.
    const drive = new T.Group();
    group.add(drive);
    parts.drive = drive;
    torus(bb.x, bb.y, 0.12, 0.13, 0.011, metal, drive);
    torus(bb.x, bb.y, 0.12, 0.06, 0.007, black, drive);
    for (let i = 0; i < 42; i++) {
      const a = (i / 42) * Math.PI * 2;
      const tooth = box(
        bb.x + Math.cos(a) * 0.139,
        bb.y + Math.sin(a) * 0.139,
        0.12,
        0.012,
        0.017,
        0.019,
        metal,
        drive,
      );
      tooth.rotation.z = a;
    }
    torus(rear.x, rear.y, 0.13, 0.065, 0.008, metal, drive);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      tube(
        v(bb.x, bb.y, 0.12),
        v(bb.x + Math.cos(a) * 0.12, bb.y + Math.sin(a) * 0.12, 0.12),
        0.009,
        black,
        drive,
      );
    }
    const chainPoints = [
      v(rear.x, rear.y + 0.069, 0.13),
      v(bb.x, bb.y + 0.145, 0.13),
      v(bb.x + 0.145, bb.y, 0.13),
      v(bb.x, bb.y - 0.145, 0.13),
      v(rear.x, rear.y - 0.069, 0.13),
      v(rear.x - 0.069, rear.y, 0.13),
    ];
    const chain = new T.CatmullRomCurve3(chainPoints, true, "centripetal");
    mesh(new T.TubeGeometry(chain, 100, 0.012, 6, true), black, v(0, 0), drive);
    for (let i = 0; i < 60; i++) {
      const pt = chain.getPoint(i / 60);
      mesh(new T.SphereGeometry(0.012, 6, 4), metal, pt, drive);
    }
    for (const sign of [-1, 1]) {
      tube(
        v(bb.x, bb.y, 0.14 * sign),
        v(bb.x + 0.09 * sign, bb.y - 0.15 * sign, 0.14 * sign),
        0.017,
        metal,
        drive,
      );
      tube(
        v(bb.x + 0.09 * sign, bb.y - 0.15 * sign, 0.14 * sign),
        v(bb.x + 0.09 * sign, bb.y - 0.15 * sign, 0.24 * sign),
        0.012,
        metal,
        drive,
      );
      box(
        bb.x + 0.09 * sign,
        bb.y - 0.15 * sign,
        0.25 * sign,
        0.15,
        0.025,
        0.1,
        black,
        drive,
        0.006,
      );
      for (let i = 0; i < 3; i++)
        box(
          bb.x + 0.09 * sign - 0.04 + i * 0.04,
          bb.y - 0.135 * sign,
          0.25 * sign,
          0.013,
          0.008,
          0.08,
          metal,
          drive,
        );
    }
    box(0.75, 1.17, 0, 0.09, 0.075, 0.08, black, group, 0.012);
    box(
      0.8,
      1.17,
      0,
      0.014,
      0.046,
      0.055,
      new T.MeshStandardMaterial({
        color: "#fff9da",
        emissive: "#e7dcb1",
        emissiveIntensity: 0.5,
      }),
      group,
      0.004,
    );
    box(
      -0.91,
      0.9,
      0,
      0.025,
      0.045,
      0.065,
      new T.MeshStandardMaterial({
        color: "#ad243c",
        emissive: "#6d1824",
        emissiveIntensity: 0.5,
      }),
      group,
      0.006,
    );
    function setVariant(id: string) {
      variantParts.traverse((o) => {
        if (o instanceof T.Mesh) o.geometry.dispose();
      });
      variantParts.clear();
      const topSeat = id === "step" ? v(-0.3, 0.74) : seat;
      const topHead = id === "step" ? v(0.59, 1.1) : headHigh;
      tube(topSeat, topHead, 0.045, paint, variantParts);
      if (id === "tour") {
        for (const c of [rear, front]) {
          const arc = new T.EllipseCurve(
            c.x,
            c.y,
            0.485,
            0.485,
            0.02,
            Math.PI - 0.02,
            false,
            0,
          );
          const pts = arc.getPoints(60).map((p) => v(p.x, p.y));
          const path = new T.CatmullRomCurve3(pts);
          mesh(
            new T.TubeGeometry(path, 60, 0.025, 10, false),
            metal,
            v(0, 0),
            variantParts,
          );
        }
        box(-1.04, 1.05, 0, 0.6, 0.035, 0.28, black, variantParts, 0.012);
        for (const z of [-0.1, 0.1]) {
          tube(
            v(-1.28, 1.04, z),
            v(-1.05, 0.53, z),
            0.014,
            metal,
            variantParts,
          );
          tube(
            v(-0.75, 1.04, z),
            v(-0.51, 1.22, z),
            0.014,
            metal,
            variantParts,
          );
        }
        for (let i = 0; i < 5; i++)
          box(
            -1.29 + i * 0.12,
            1.075,
            0,
            0.035,
            0.01,
            0.23,
            metal,
            variantParts,
          );
      }
    }
    setVariant(variant);
    parts.battery.userData.explode = v(0, 0.2, 0.55);
    parts.cockpit.userData.explode = v(0, 0.18, 0);
    group.userData.setVariant = setVariant;
  } else if (kind === "clinic") {
    box(0, -0.05, 0, 4, 0.1, 2.8, white);
    box(0, 0.65, -1.38, 4, 1.4, 0.08, white);
    box(-1.95, 0.65, 0, 0.08, 1.4, 2.8, white);
    box(
      0,
      0.42,
      -0.55,
      1.7,
      0.84,
      0.48,
      new T.MeshStandardMaterial({ color: "#e7e6df", roughness: 0.55 }),
      group,
      0.12,
    );
    box(0, 0.87, -0.55, 1.8, 0.04, 0.6, white);
    box(
      0,
      0.7,
      -1.3,
      1.3,
      0.07,
      0.02,
      new T.MeshStandardMaterial({ color: "#12676d" }),
    );
    for (let i = 0; i < 9; i++)
      box(0.75 + i * 0.13, 0.73, -1.3, 0.025, 1.2, 0.035, glass);
    for (let i = 0; i < 3; i++) {
      box(
        -1.2,
        0.3,
        -0.45 + i * 0.7,
        0.45,
        0.25,
        0.48,
        new T.MeshStandardMaterial({ color: "#165459" }),
        group,
        0.1,
      );
      box(
        -1.35,
        0.48,
        -0.45 + i * 0.7,
        0.17,
        0.5,
        0.46,
        new T.MeshStandardMaterial({ color: "#165459" }),
        group,
        0.06,
      );
    }
    for (let i = 0; i < 2; i++) {
      box(0.75 + i * 0.65, 0.18, 0.7, 0.5, 0.05, 0.5, wood, group, 0.04);
      for (const dx of [-0.18, 0.18])
        tube(
          v(0.75 + i * 0.65 + dx, 0.16, 0.7),
          v(0.75 + i * 0.65 + dx, 0, 0.7),
          0.015,
          metal,
        );
    }
    tree(1.6, -0.9, 0.24);
    box(1.6, 0.12, -0.9, 0.3, 0.24, 0.3, white, group, 0.05);
    const roof = box(0, 1.4, 0, 4, 0.06, 2.8, white);
    roof.material = new T.MeshStandardMaterial({
      color: "#e7e5dc",
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    roof.userData.explode = v(0, 1.7, 0);
    moving.push(roof);
  } else {
    box(0, -0.08, 0, 5.3, 0.14, 3.2, white);
    const roof = new T.Group();
    group.add(roof);
    roof.userData.explode = v(0, 1.5, 0);
    moving.push(roof);
    if (variant === "pavilion") {
      box(
        0,
        0.03,
        0,
        4.5,
        0.08,
        2.3,
        new T.MeshStandardMaterial({ color: "#aaa49b", roughness: 0.85 }),
      );
      for (let i = 0; i < 11; i++) {
        box(-2.15 + i * 0.43, 0.63, -0.93, 0.15, 1.2, 0.3, brick);
        if (i < 4 || i > 6)
          box(-2.15 + i * 0.43, 0.63, 0.93, 0.15, 1.2, 0.3, brick);
        for (let j = 0; j < 12; j++)
          box(
            -2.15 + i * 0.43,
            j * 0.1 + 0.05,
            -0.93,
            0.153,
            0.006,
            0.303,
            new T.MeshStandardMaterial({ color: "#5a4e46", roughness: 1 }),
          );
      }
      box(0, 1.3, 0, 4.8, 0.14, 2.5, white, roof);
      for (let i = 0; i < 7; i++)
        box(-1.8 + i * 0.55, 0.55, 0, 0.04, 1, 0.75, white);
      for (let i = 0; i < 4; i++)
        box(-1.8 + i * 1.2, 0.65, -0.915, 1, 1.05, 0.01, glass);
      tree(0.0, 0.9, 0.28);
      tree(-2.35, 0.4, 0.32);
      box(0.15, 0.18, 0.5, 0.7, 0.35, 0.65, wood);
    } else if (variant === "coast") {
      for (const [x, y, z, sx, sz] of [
        [-0.35, 0.1, 0, 3.6, 2.3],
        [0.35, 0.95, -0.15, 3.5, 2.1],
      ]) {
        box(x, y, z, sx, 0.17, sz, white);
        box(x, y + 0.65, z - 0.75, sx, 0.05, 0.04, white, roof);
        for (const px of [x - sx / 2 + 0.1, x + sx / 2 - 0.1])
          box(px, y + 0.36, z - 0.25, 0.13, 0.6, sz - 0.45, white);
        box(x, y + 0.4, z - 0.8, sx, 0.65, 0.035, glass);
        for (let i = 0; i < 7; i++)
          box(
            x - sx / 2 + (i * sx) / 6,
            y + 0.4,
            z - 0.81,
            0.025,
            0.65,
            0.025,
            black,
          );
      }
      box(0.35, 1.8, -0.15, 3.5, 0.15, 2.1, white, roof);
      for (let i = 0; i < 9; i++)
        box(-1.15 + i * 0.085, 0.16 + i * 0.08, 0.25, 0.24, 0.08, 0.55, white);
      box(0.4, 0.35, 0.1, 0.85, 0.25, 0.36, white, group, 0.03);
      box(1.1, 0.35, 0.1, 0.25, 0.23, 0.35, wood);
      for (let i = 0; i < 12; i++)
        mesh(
          new T.DodecahedronGeometry(0.16 + Math.random() * 0.14, 0),
          new T.MeshStandardMaterial({ color: "#93938a", roughness: 1 }),
          v(-2.4 + Math.random() * 4.8, -0.12, 0.9 + Math.random() * 0.55),
        );
    } else {
      for (let level = 0; level < 3; level++) {
        const y = 0.1 + level * 0.6;
        for (const x of [-1.35, 1.35]) box(x, y, 0, 1.15, 0.06, 2.4, wood);
        for (const z of [-1.07, 1.07]) box(0, y, z, 3.9, 0.06, 0.3, wood);
        for (const x of [-1.8, -0.8, 0.8, 1.8]) {
          box(x, y + 0.28, -1.1, 0.035, 0.58, 0.035, black);
          box(x, y + 0.28, 1.1, 0.035, 0.58, 0.035, black);
        }
        for (const x of [-1.3, 1.3])
          for (const z of [-0.6, 0.5]) {
            box(x, y + 0.18, z, 0.55, 0.035, 0.3, wood);
            for (const dx of [-0.2, 0.2])
              box(x + dx, y + 0.1, z, 0.025, 0.2, 0.025, black);
            box(x, y + 0.1, z + 0.24, 0.18, 0.04, 0.15, black);
          }
      }
      for (const x of [-1.95, 1.95]) box(x, 0.85, 0, 0.035, 1.8, 2.4, glass);
      box(0, 1.92, 0, 4.1, 0.08, 2.6, glass, roof);
      tree(0, 0, 0.32);
      for (let i = 0; i < 12; i++)
        box(0.2, 0.05 + i * 0.15, -0.95 + i * 0.08, 0.45, 0.055, 0.17, wood);
    }
  }
  for (const o of moving) {
    o.userData.origin = o.position.clone();
    if (!o.userData.explode) o.userData.explode = v(0, 0.2, 0.4);
  }
  return {
    group,
    paint,
    parts,
    moving,
    setVariant: (id: string) => group.userData.setVariant?.(id),
  };
}
