"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  DoubleSide,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  type Mesh,
  type MeshBasicMaterial,
  type Sprite,
} from "three";
import { openOrder } from "@/actions/orders";
import { orderHref } from "@/lib/paths";
import type { TableStatus } from "@/lib/api/types";

export type SceneTable = {
  id: string;
  label: string;
  seats: number;
  status: TableStatus;
  gridX: number | null;
  gridY: number | null;
  orderId: string | null;
  totalTaka: number | null;
};

/** The same colours as the sample room: empty, ordered, cooking, ready. Bill is its own colour. */
const STATUS_COLOR: Record<TableStatus, string> = {
  free: "#10b981",
  occupied: "#f59e0b",
  needs_approval: "#f97316",
  food_ready: "#3b82f6",
  bill_requested: "#e11d48",
};

type Spot = { table: SceneTable; x: number; z: number; w: number; d: number; vip: boolean };

function tableSize(seats: number) {
  if (seats <= 2) return { w: 1.7, d: 1.5, vip: false };
  if (seats <= 4) return { w: 2.3, d: 1.7, vip: false };
  return { w: 3.1, d: 1.85, vip: true };
}

/** Two rows, like the sample room: small tables on the left, larger ones to the right. */
function placeTables(tables: SceneTable[]): Spot[] {
  const columns: { back: SceneTable; front?: SceneTable; w: number }[] = [];
  for (let i = 0; i < tables.length; i += 2) {
    const back = tables[i];
    const front = tables[i + 1];
    if (!back) break;
    const w = Math.max(tableSize(back.seats).w, front ? tableSize(front.seats).w : 0);
    columns.push({ back, front, w });
  }
  let cursor = 0;
  const placed = columns.map((column, index) => {
    if (index > 0) {
      const previous = columns[index - 1];
      cursor += Math.max(4.4, (previous?.w ?? 0) / 2 + column.w / 2 + 1.2);
    }
    return { ...column, x: cursor };
  });
  const mid = cursor / 2;
  return placed.flatMap((column) => {
    const x = column.x - mid;
    const row = (table: SceneTable, z: number): Spot => {
      const size = tableSize(table.seats);
      return { table, x, z, ...size };
    };
    return column.front
      ? [row(column.back, -2.8), row(column.front, 2.8)]
      : [row(column.back, 0)];
  });
}

function measure(spots: Spot[]) {
  const xs = spots.map((s) => s.x);
  const zs = spots.map((s) => s.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const width = Math.max(20, maxX - minX + 8);
  const depth = Math.max(14.5, maxZ - minZ + 8);
  return {
    width,
    depth,
    cx: (minX + maxX) / 2,
    cz: (minZ + maxZ) / 2,
  };
}

function canvasTexture(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  draw(ctx, w, h);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function woodFloorTexture(width: number, depth: number) {
  const tex = canvasTexture((ctx) => {
    ctx.fillStyle = "#3b2618";
    ctx.fillRect(0, 0, 512, 512);
    const plankH = 512 / 8;
    for (let r = 0; r < 8; r++) {
      const y = r * plankH;
      const offset = (r % 2) * 128;
      for (let c = -1; c < 3; c++) {
        const x = c * 256 + offset;
        const shade = 12 + ((r * 17 + c * 13) % 18);
        ctx.fillStyle = `rgb(${55 + shade}, ${35 + Math.floor(shade * 0.65)}, ${22 + Math.floor(shade * 0.4)})`;
        ctx.fillRect(x + 1, y + 1, 254, plankH - 2);
        ctx.strokeStyle = "rgba(20, 10, 5, 0.22)";
        ctx.lineWidth = 1;
        for (let g = 0; g < 6; g++) {
          const gy = y + 6 + g * 9;
          ctx.beginPath();
          ctx.moveTo(x + 2, gy);
          ctx.bezierCurveTo(x + 80, gy + ((g % 3) - 1), x + 170, gy - ((g % 2) - 0.5), x + 252, gy);
          ctx.stroke();
        }
      }
    }
  }, 512, 512);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(width / 4, depth / 3.6);
  return tex;
}

function tabletopTexture(vip: boolean) {
  return canvasTexture((ctx) => {
    ctx.fillStyle = vip ? "#4a2c1a" : "#784a28";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(255, 220, 180, 0.05)" : "rgba(25, 12, 4, 0.12)";
      ctx.fillRect(0, i * 6, 256, 3);
    }
    if (vip) {
      ctx.strokeStyle = "rgba(245, 158, 11, 0.55)";
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, 236, 236);
    }
  }, 256, 256);
}

function qrTexture() {
  return canvasTexture((ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 128, 160);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, 128, 28);
    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SCAN QR", 64, 19);
    ctx.fillStyle = "#0f172a";
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const corner = (r < 3 && c < 3) || (r < 3 && c > 6) || (r > 6 && c < 3);
        if (corner || (r * 7 + c * 13) % 3 === 0) ctx.fillRect(24 + c * 8, 38 + r * 8, 7, 7);
      }
    }
  }, 128, 160);
}

function badgeTexture(label: string, status: string, color: string, vip: boolean) {
  return canvasTexture((ctx) => {
    ctx.clearRect(0, 0, 256, 112);
    ctx.beginPath();
    ctx.roundRect(12, 12, 232, 88, 26);
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(46, 44, 10, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${label}${vip ? " ★" : ""}`.slice(0, 12), 68, 52);
    ctx.fillStyle = color;
    ctx.font = "600 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(status.slice(0, 16), 128, 86);
  }, 256, 112);
}

export function TableScene({ tables }: { tables: SceneTable[] }) {
  const t = useTranslations("floor");
  const tStatus = useTranslations("tableStatus");
  const router = useRouter();
  const spots = useMemo(() => placeTables(tables), [tables]);
  const room = useMemo(() => measure(spots), [spots]);
  const [preset, setPreset] = useState<"3d" | "top">("3d");
  const [cameraMove, setCameraMove] = useState(0);
  const maps = useMemo(() => {
    if (typeof document === "undefined") return null;
    return {
      floor: woodFloorTexture(room.width, room.depth),
      top: tabletopTexture(false),
      vip: tabletopTexture(true),
      qr: qrTexture(),
    };
  }, [room.width, room.depth]);

  useEffect(() => {
    if (!maps) return;
    return () => {
      maps.floor.dispose();
      maps.top.dispose();
      maps.vip.dispose();
      maps.qr.dispose();
    };
  }, [maps]);

  function open(table: SceneTable) {
    if (table.orderId) {
      router.push(orderHref(table.orderId));
      return;
    }
    const body = new FormData();
    body.set("tableId", table.id);
    body.set("back", "/tables");
    void openOrder(body);
  }

  if (!maps) {
    return <div className="h-[min(72dvh,760px)] min-h-[520px] animate-pulse rounded-xl bg-[#0b1120]" />;
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0b1120]">
      <div className="h-[min(72dvh,760px)] min-h-[520px] w-full">
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ fov: 44, position: [room.cx, 14.5, room.cz + 16.5], near: 0.1, far: 160 }}
          gl={{ antialias: true }}
          onCreated={({ gl }) => {
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.12;
          }}
        >
          <color attach="background" args={["#0b1120"]} />
          <fogExp2 attach="fog" args={["#0b1120", 0.018 * Math.min(1, 20 / room.width)]} />
          <hemisphereLight args={["#fff4e0", "#1e293b", 0.65]} />
          <directionalLight
            position={[10, 18, 12]}
            intensity={0.9}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-bias={-0.0005}
            shadow-camera-near={2}
            shadow-camera-far={50}
            shadow-camera-left={-18}
            shadow-camera-right={18}
            shadow-camera-top={18}
            shadow-camera-bottom={-18}
          />
          <pointLight position={[room.cx - 4, 5.5, room.cz]} color="#f59e0b" intensity={12} distance={18} />
          <pointLight position={[room.cx + 5.5, 5.5, room.cz]} color="#fbbf24" intensity={12} distance={18} />
          <pointLight position={[room.cx, 4.2, room.cz - room.depth / 2 + 2]} color="#ffedd5" intensity={10} distance={14} />
          <Restaurant room={room} floorMap={maps.floor} vipXs={[...new Set(spots.filter((s) => s.vip).map((s) => s.x))]} />
          {spots.map((spot) => (
            <DiningTable
              key={spot.table.id}
              spot={spot}
              statusLabel={tStatus(spot.table.status)}
              topMap={spot.vip ? maps.vip : maps.top}
              qrMap={maps.qr}
              onOpen={() => open(spot.table)}
            />
          ))}
          <ViewCamera preset={preset} move={cameraMove} room={room} />
        </Canvas>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-900/75 p-1.5 shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              setPreset("3d");
              setCameraMove((n) => n + 1);
            }}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold ${preset === "3d" ? "bg-white/15 text-white" : "text-slate-200 hover:bg-white/10"}`}
          >
            {t("scene3d")}
          </button>
          <button
            type="button"
            onClick={() => {
              setPreset("top");
              setCameraMove((n) => n + 1);
            }}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold ${preset === "top" ? "bg-white/15 text-white" : "text-slate-200 hover:bg-white/10"}`}
          >
            {t("sceneTop")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewCamera({
  preset,
  move,
  room,
}: {
  preset: "3d" | "top";
  move: number;
  room: { cx: number; cz: number; width: number; depth: number };
}) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as { target: Vector3 } | null;
  const goal = useRef(new Vector3());
  const look = useRef(new Vector3());
  const moving = useRef(true);

  useEffect(() => {
    moving.current = true;
  }, [preset, move, room.cx, room.cz, room.width, room.depth]);

  useFrame(() => {
    if (!moving.current || !controls) return;
    const back = Math.max(16.5, room.width * 0.72);
    if (preset === "top") {
      goal.current.set(room.cx, Math.max(22, room.width * 1.15), room.cz + 0.5);
      look.current.set(room.cx, 0, room.cz);
    } else {
      goal.current.set(room.cx, Math.max(14.5, back * 0.88), room.cz + back);
      look.current.set(room.cx, 0.5, room.cz);
    }
    camera.position.lerp(goal.current, 0.065);
    controls.target.lerp(look.current, 0.065);
    if (camera.position.distanceTo(goal.current) < 0.08) moving.current = false;
  });

  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.065}
      maxPolarAngle={Math.PI / 2.12}
      minDistance={5}
      maxDistance={Math.max(30, room.width * 1.6)}
      target={[room.cx, 0.5, room.cz]}
      onStart={() => {
        moving.current = false;
      }}
    />
  );
}

function Restaurant({
  room,
  floorMap,
  vipXs,
}: {
  room: { width: number; depth: number; cx: number; cz: number };
  floorMap: CanvasTexture;
  vipXs: number[];
}) {
  const slats = Math.min(22, Math.max(8, Math.floor(room.depth / 0.7)));
  const sign = useMemo(
    () =>
      canvasTexture((ctx) => {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, 512, 128);
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(0, 108, 512, 8);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("কিচেন", 256, 58);
        ctx.fillStyle = "#f59e0b";
        ctx.font = "600 18px sans-serif";
        ctx.fillText("LIVE OPEN PASS", 256, 92);
      }, 512, 128),
    [],
  );
  const mat = useMemo(
    () =>
      canvasTexture((ctx) => {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, 256, 128);
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 42px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("স্বাগতম", 128, 58);
        ctx.font = "600 16px sans-serif";
        ctx.fillText("ENTRANCE", 128, 88);
      }, 256, 128),
    [],
  );
  useEffect(() => {
    return () => {
      sign.dispose();
      mat.dispose();
    };
  }, [sign, mat]);
  return (
    <group>
      <mesh position={[room.cx, -0.2, room.cz]} receiveShadow>
        <boxGeometry args={[room.width, 0.4, room.depth]} />
        <meshStandardMaterial map={floorMap} roughness={0.32} metalness={0.08} />
      </mesh>
      <mesh position={[room.cx, -0.42, room.cz]}>
        <boxGeometry args={[room.width + 0.4, 0.2, room.depth + 0.4]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[room.cx, 2.3, room.cz - room.depth / 2]} receiveShadow>
        <boxGeometry args={[room.width, 4.6, 0.35]} />
        <meshStandardMaterial color="#1e2536" roughness={0.85} />
      </mesh>
      <mesh position={[room.cx - room.width / 2, 2.3, room.cz]} receiveShadow>
        <boxGeometry args={[0.35, 4.6, room.depth]} />
        <meshStandardMaterial color="#1e2536" roughness={0.85} />
      </mesh>
      {Array.from({ length: slats }, (_, i) => (
        <mesh
          key={i}
          position={[
            room.cx - room.width / 2 + 0.28,
            2.1,
            room.cz - room.depth / 2 + 1.2 + ((room.depth - 2.4) * i) / Math.max(slats - 1, 1),
          ]}
        >
          <boxGeometry args={[0.12, 3.8, 0.18]} />
          <meshStandardMaterial color="#5c3a21" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[room.cx - room.width / 2 + 0.32, 4.15, room.cz]}>
        <boxGeometry args={[0.08, 0.08, room.depth - 2]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      <mesh position={[room.cx, 0.575, room.cz - room.depth / 2 + 1.5]} castShadow receiveShadow>
        <boxGeometry args={[Math.min(8.5, room.width * 0.5), 1.15, 1.4]} />
        <meshStandardMaterial color="#262f42" roughness={0.6} />
      </mesh>
      <mesh position={[room.cx, 1.18, room.cz - room.depth / 2 + 1.5]}>
        <boxGeometry args={[Math.min(8.8, room.width * 0.52), 0.12, 1.65]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.1} />
      </mesh>
      <mesh position={[room.cx, 3.45, room.cz - room.depth / 2 + 0.35]}>
        <boxGeometry args={[4.4, 1.1, 0.12]} />
        <meshBasicMaterial map={sign} />
      </mesh>
      {vipXs.map((x) => (
        <mesh key={x} position={[x, 0.02, room.cz]} receiveShadow>
          <boxGeometry args={[5.1, 0.03, 7.2]} />
          <meshStandardMaterial color="#311824" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[room.cx, 0.03, room.cz + room.depth / 2 - 1.15]} receiveShadow>
        <boxGeometry args={[2.6, 0.04, 1.1]} />
        <meshStandardMaterial map={mat} roughness={0.9} />
      </mesh>
      {[-2.4, 0, 2.4].map((x) => (
        <group key={x} position={[room.cx + x, 0, room.cz - room.depth / 2 + 1.5]}>
          <mesh position={[0, 3.7, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1.6, 8]} />
            <meshStandardMaterial color="#111827" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 2.85, 0]}>
            <coneGeometry args={[0.28, 0.3, 16, 1, true]} />
            <meshStandardMaterial color="#111827" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 2.75, 0]}>
            <sphereGeometry args={[0.11, 12, 12]} />
            <meshBasicMaterial color="#fde68a" />
          </mesh>
        </group>
      ))}
      {(
        [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as const
      ).map(([sx, sz]) => (
        <Plant
          key={`${sx}${sz}`}
          position={[
            room.cx + sx * (room.width / 2 - 1.3),
            0,
            room.cz + sz * (room.depth / 2 - 1.4),
          ]}
        />
      ))}
    </group>
  );
}

function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.325, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.3, 0.65, 16]} />
        <meshStandardMaterial color="#b45309" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.63, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 0.06, 16]} />
        <meshStandardMaterial color="#291a10" />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const angle = (i / 7) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.22, 0.95 + (i % 3) * 0.22, Math.sin(angle) * 0.22]} castShadow>
            <dodecahedronGeometry args={[0.28 + (i % 2) * 0.08, 0]} />
            <meshStandardMaterial color={i % 2 ? "#22c55e" : "#15803d"} roughness={0.65} />
          </mesh>
        );
      })}
      <mesh position={[0, 1.45, 0]} castShadow>
        <dodecahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial color="#22c55e" roughness={0.6} />
      </mesh>
    </group>
  );
}

function DiningTable({
  spot,
  statusLabel,
  topMap,
  qrMap,
  onOpen,
}: {
  spot: Spot;
  statusLabel: string;
  topMap: CanvasTexture;
  qrMap: CanvasTexture;
  onOpen: () => void;
}) {
  const color = STATUS_COLOR[spot.table.status];
  const ring = useRef<Mesh>(null);
  const ringMat = useRef<MeshBasicMaterial>(null);
  const badgeSprite = useRef<Sprite>(null);
  const badge = useMemo(
    () => badgeTexture(spot.table.label, statusLabel, color, spot.vip),
    [spot.table.label, statusLabel, color, spot.vip],
  );
  useEffect(() => () => badge.dispose(), [badge]);
  const start = useRef<{ x: number; y: number } | null>(null);
  const cooking = spot.table.status === "needs_approval";

  useFrame(({ clock }) => {
    if (!ring.current) return;
    const wave = Math.sin(clock.elapsedTime * 4.5);
    if (cooking) {
      ring.current.scale.set(1 + wave * 0.08, 1 + wave * 0.08, 1);
      if (ringMat.current) ringMat.current.opacity = 0.55 + wave * 0.35;
      if (badgeSprite.current) badgeSprite.current.position.y = 2.25 + Math.sin(clock.elapsedTime * 3.5) * 0.08;
    } else {
      ring.current.scale.set(1, 1, 1);
      if (ringMat.current) ringMat.current.opacity = 0.75;
      if (badgeSprite.current) badgeSprite.current.position.y = 2.25;
    }
  });

  function press(event: ThreeEvent<PointerEvent>) {
    start.current = { x: event.clientX, y: event.clientY };
  }
  function release(event: ThreeEvent<MouseEvent>) {
    const from = start.current;
    if (from && Math.hypot(event.clientX - from.x, event.clientY - from.y) > 8) return;
    event.stopPropagation();
    onOpen();
  }

  const { w, d } = spot;
  const ringRadius = Math.max(w, d) * 0.72;
  const chairs = chairSpots(spot.table.seats, w, d);

  return (
    <group position={[spot.x, 0, spot.z]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[ringRadius - 0.14, ringRadius, 40]} />
        <meshBasicMaterial ref={ringMat} color={color} side={DoubleSide} transparent opacity={0.75} />
      </mesh>
      {chairs.map((chair, i) => (
        <Chair key={i} position={[chair.x, 0, chair.z]} rotation={chair.rotY} vip={spot.vip} />
      ))}
      <mesh
        position={[0, 0.82, 0]}
        castShadow
        receiveShadow
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial map={topMap} roughness={0.35} metalness={0.08} />
      </mesh>
      {(
        [
          [-w / 2 + 0.18, -d / 2 + 0.18],
          [w / 2 - 0.18, -d / 2 + 0.18],
          [-w / 2 + 0.18, d / 2 - 0.18],
          [w / 2 - 0.18, d / 2 - 0.18],
        ] as const
      ).map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.39, z]} castShadow>
          <cylinderGeometry args={[0.045, 0.035, 0.78, 10]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      <group position={[0, 0.82, 0]}>
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[0.24, 0.04, 0.14]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.21, 0]}>
          <boxGeometry args={[0.2, 0.26, 0.03]} />
          <meshBasicMaterial map={qrMap} />
        </mesh>
      </group>
      {spot.table.status === "food_ready" && <Food w={w} d={d} seats={spot.table.seats} />}
      <sprite ref={badgeSprite} position={[0, 2.25, 0]} scale={[1.75, 0.78, 1]}>
        <spriteMaterial map={badge} transparent depthTest={false} />
      </sprite>
      <mesh position={[0, 0.9, 0]} onPointerDown={press} onClick={release}>
        <boxGeometry args={[w + 0.9, 1.8, d + 0.9]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Chair({
  position,
  rotation,
  vip,
}: {
  position: [number, number, number];
  rotation: number;
  vip: boolean;
}) {
  const cushion = vip ? "#7c2d12" : "#334155";
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.46, 0]} castShadow>
        <boxGeometry args={[0.5, 0.08, 0.48]} />
        <meshStandardMaterial color={cushion} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.72, -0.21]} castShadow>
        <boxGeometry args={[0.48, 0.44, 0.07]} />
        <meshStandardMaterial color={cushion} roughness={0.75} />
      </mesh>
      {(
        [
          [-0.2, -0.2],
          [0.2, -0.2],
          [-0.2, 0.2],
          [0.2, 0.2],
        ] as const
      ).map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.22, z]}>
          <cylinderGeometry args={[0.022, 0.018, 0.44, 8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function Food({ w, d, seats }: { w: number; d: number; seats: number }) {
  const spots =
    seats <= 2
      ? [
          [-0.4, 0],
          [0.4, 0],
        ]
      : [
          [-w * 0.26, -d * 0.24],
          [w * 0.26, -d * 0.24],
          [-w * 0.26, d * 0.24],
          [w * 0.26, d * 0.24],
        ];
  return (
    <group>
      {spots.map(([x, z], i) => (
        <group key={`${x}${z}`}>
          <mesh position={[x, 0.885, z]} castShadow>
            <cylinderGeometry args={[0.18, 0.13, 0.03, 18]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.18} metalness={0.05} />
          </mesh>
          <mesh position={[x, 0.895, z]} scale={[1, 0.65, 1]}>
            <sphereGeometry args={[0.11, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={i % 2 ? "#991b1b" : "#d97706"} roughness={0.7} />
          </mesh>
          <mesh position={[x + (x >= 0 ? 0.2 : -0.2), 0.935, z * 0.7]}>
            <cylinderGeometry args={[0.042, 0.032, 0.13, 12]} />
            <meshStandardMaterial color="#fef3c7" transparent opacity={0.88} roughness={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function chairSpots(seats: number, w: number, d: number) {
  const z = d / 2 + 0.36;
  const x = w / 2 + 0.36;
  if (seats <= 2) {
    return [
      { x: 0, z: -z, rotY: 0 },
      { x: 0, z, rotY: Math.PI },
    ];
  }
  if (seats <= 4) {
    const dx = w * 0.26;
    return [
      { x: -dx, z: -z, rotY: 0 },
      { x: dx, z: -z, rotY: 0 },
      { x: -dx, z, rotY: Math.PI },
      { x: dx, z, rotY: Math.PI },
    ];
  }
  const dx = w * 0.28;
  return [
    { x: -dx, z: -z, rotY: 0 },
    { x: dx, z: -z, rotY: 0 },
    { x: -dx, z, rotY: Math.PI },
    { x: dx, z, rotY: Math.PI },
    { x: -x, z: 0, rotY: Math.PI / 2 },
    { x, z: 0, rotY: -Math.PI / 2 },
  ];
}
