"use client";

import { useMemo, useRef, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { ACESFilmicToneMapping } from "three";
import { openOrder } from "@/actions/orders";
import { orderHref } from "@/lib/paths";
import type { TableStatus } from "@/lib/api/types";
import { formatTaka } from "@/lib/format";

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

const STATUS_COLOR: Record<TableStatus, string> = {
  free: "#e7e5e4",
  occupied: "#18181b",
  needs_approval: "#f97316",
  food_ready: "#059669",
  bill_requested: "#2563eb",
};

const GAP = 2.7;

/** Where each table sits. A saved plan keeps its gaps; otherwise tables line up by number. */
function placeTables(tables: SceneTable[]) {
  const onPlan = tables.filter(
    (table) =>
      table.gridX !== null &&
      table.gridY !== null &&
      table.gridX >= 0 &&
      table.gridY >= 0 &&
      table.gridX < 12 &&
      table.gridY < 12,
  );
  if (onPlan.length > 0) {
    const maxX = Math.max(...onPlan.map((table) => table.gridX ?? 0));
    const maxY = Math.max(...onPlan.map((table) => table.gridY ?? 0));
    const placed = onPlan.map((table) => ({
      table,
      x: ((table.gridX ?? 0) - maxX / 2) * GAP,
      z: ((table.gridY ?? 0) - maxY / 2) * GAP,
    }));
    const loose = tables.filter((table) => !onPlan.includes(table));
    loose.forEach((table, i) => {
      placed.push({
        table,
        x: (i - (loose.length - 1) / 2) * GAP,
        z: (maxY / 2 + 1.4) * GAP,
      });
    });
    return placed;
  }
  const cols = tables.length <= 1 ? 1 : tables.length <= 4 ? 2 : tables.length <= 9 ? 3 : tables.length <= 16 ? 4 : 5;
  const rows = Math.ceil(tables.length / cols);
  return tables.map((table, i) => ({
    table,
    x: ((i % cols) - (cols - 1) / 2) * GAP,
    z: (Math.floor(i / cols) - (rows - 1) / 2) * GAP,
  }));
}

function roomSize(spots: { x: number; z: number }[]) {
  const xs = spots.map((s) => s.x);
  const zs = spots.map((s) => s.z);
  const minX = Math.min(...xs) - 2.4;
  const maxX = Math.max(...xs) + 2.4;
  const minZ = Math.min(...zs) - 2.6;
  const maxZ = Math.max(...zs) + 3.2;
  return {
    width: maxX - minX,
    depth: maxZ - minZ,
    cx: (minX + maxX) / 2,
    cz: (minZ + maxZ) / 2,
    span: Math.max(maxX - minX, maxZ - minZ, 8),
  };
}

export function TableScene({ tables }: { tables: SceneTable[] }) {
  const t = useTranslations("floor");
  const spots = useMemo(() => placeTables(tables), [tables]);
  const room = useMemo(() => roomSize(spots), [spots]);
  const router = useRouter();

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

  return (
    <div className="overflow-hidden rounded-xl bg-[#0b1120]">
      <div className="h-[min(70dvh,680px)] min-h-[460px] w-full">
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ fov: 42, position: [room.span * 0.15, room.span * 0.72, room.span * 0.95], near: 0.1, far: 120 }}
          gl={{ antialias: true }}
          onCreated={({ gl }) => {
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.12;
          }}
        >
          <color attach="background" args={["#0b1120"]} />
          <fog attach="fog" args={["#0b1120", 18, 48]} />
          <hemisphereLight args={["#fff4e0", "#1e293b", 0.7]} />
          <directionalLight
            position={[10, 16, 10]}
            intensity={1.15}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-near={2}
            shadow-camera-far={40}
            shadow-camera-left={-16}
            shadow-camera-right={16}
            shadow-camera-top={16}
            shadow-camera-bottom={-16}
          />
          <pointLight position={[-4, 5, 0]} color="#f59e0b" intensity={8} distance={16} />
          <pointLight position={[5, 5, 0]} color="#fbbf24" intensity={8} distance={16} />
          <Room room={room} />
          {spots.map(({ table, x, z }) => (
            <DiningTable key={table.id} table={table} position={[x, 0, z]} onOpen={() => open(table)} />
          ))}
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.08}
            maxPolarAngle={Math.PI / 2.12}
            minDistance={4}
            maxDistance={Math.max(22, room.span * 1.8)}
            target={[room.cx, 0.4, room.cz]}
          />
        </Canvas>
      </div>
      <p className="px-4 py-2 text-center text-[12.5px] text-slate-400">{t("sceneHint")}</p>
    </div>
  );
}

function Room({ room }: { room: ReturnType<typeof roomSize> }) {
  return (
    <group>
      <mesh position={[room.cx, -0.22, room.cz]} receiveShadow>
        <boxGeometry args={[room.width + 0.6, 0.4, room.depth + 0.6]} />
        <meshStandardMaterial color="#8a5a32" roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[room.cx, -0.46, room.cz]}>
        <boxGeometry args={[room.width + 1, 0.2, room.depth + 1]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[room.cx, 1.7, room.cz - room.depth / 2]} receiveShadow>
        <boxGeometry args={[room.width + 0.6, 3.6, 0.28]} />
        <meshStandardMaterial color="#1e2536" roughness={0.9} />
      </mesh>
      <mesh position={[room.cx - room.width / 2, 1.7, room.cz]} receiveShadow>
        <boxGeometry args={[0.28, 3.6, room.depth + 0.6]} />
        <meshStandardMaterial color="#1e2536" roughness={0.9} />
      </mesh>
      <mesh position={[room.cx, 0.55, room.cz - room.depth / 2 + 1.3]} castShadow receiveShadow>
        <boxGeometry args={[Math.min(room.width * 0.55, 8), 1.05, 1.15]} />
        <meshStandardMaterial color="#262f42" roughness={0.6} />
      </mesh>
      <mesh position={[room.cx, 1.12, room.cz - room.depth / 2 + 1.3]}>
        <boxGeometry args={[Math.min(room.width * 0.58, 8.4), 0.1, 1.4]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.25} metalness={0.08} />
      </mesh>
    </group>
  );
}

function DiningTable({
  table,
  position,
  onOpen,
}: {
  table: SceneTable;
  position: [number, number, number];
  onOpen: () => void;
}) {
  const t = useTranslations("floor");
  const tStatus = useTranslations("tableStatus");
  const wide = table.seats > 4;
  const w = wide ? 1.7 : 1.2;
  const d = wide ? 1.05 : 1.2;
  const color = STATUS_COLOR[table.status];
  const start = useRef<{ x: number; y: number } | null>(null);
  const ring = Math.max(w, d) * 0.78;

  function press(event: ThreeEvent<PointerEvent>) {
    start.current = { x: event.clientX, y: event.clientY };
  }
  function release(event: ThreeEvent<MouseEvent>) {
    const from = start.current;
    if (from && Math.hypot(event.clientX - from.x, event.clientY - from.y) > 8) return;
    event.stopPropagation();
    onOpen();
  }

  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[ring - 0.1, ring, 40]} />
        <meshBasicMaterial color={color} side={2} />
      </mesh>
      {chairSpots(table.seats, w, d).map((spot, i) => (
        <Chair key={i} position={[spot.x, 0, spot.z]} rotation={spot.rotY} color={color} />
      ))}
      <mesh
        position={[0, 0.78, 0]}
        castShadow
        receiveShadow
        onPointerDown={press}
        onClick={release}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={[w, 0.09, d]} />
        <meshStandardMaterial color={table.status === "free" ? "#d7b48a" : "#c49a6c"} roughness={0.42} metalness={0.06} />
      </mesh>
      <Leg position={[-w / 2 + 0.16, 0.36, -d / 2 + 0.16]} />
      <Leg position={[w / 2 - 0.16, 0.36, -d / 2 + 0.16]} />
      <Leg position={[-w / 2 + 0.16, 0.36, d / 2 - 0.16]} />
      <Leg position={[w / 2 - 0.16, 0.36, d / 2 - 0.16]} />
      <mesh
        position={[0, 0.9, 0]}
        onPointerDown={press}
        onClick={release}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={[w + 0.7, 1.5, d + 0.7]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html position={[0, 1.7, 0]} center distanceFactor={9} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
        <div
          className="rounded-lg px-2.5 py-1.5 text-center shadow-lg"
          style={{ background: color, color: table.status === "free" ? "#18181b" : "#fff" } satisfies CSSProperties}
        >
          <div className="text-[13px] leading-none font-bold">{table.label}</div>
          <div className="mt-0.5 text-[10px] font-semibold opacity-80">
            {table.totalTaka !== null ? formatTaka(table.totalTaka) : t("seats", { n: table.seats })}
            {" · "}
            {tStatus(table.status)}
          </div>
        </div>
      </Html>
    </group>
  );
}

function Leg({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow>
      <cylinderGeometry args={[0.045, 0.035, 0.7, 8]} />
      <meshStandardMaterial color="#1e293b" metalness={0.65} roughness={0.35} />
    </mesh>
  );
}

function Chair({
  position,
  rotation,
  color,
}: {
  position: [number, number, number];
  rotation: number;
  color: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.46, 0.07, 0.44]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.66, -0.18]} castShadow>
        <boxGeometry args={[0.44, 0.38, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  );
}

function chairSpots(seats: number, w: number, d: number) {
  const n = Math.min(8, Math.max(2, seats));
  const z = d / 2 + 0.42;
  const x = w / 2 + 0.42;
  if (n <= 2) {
    return [
      { x: 0, z: -z, rotY: 0 },
      { x: 0, z, rotY: Math.PI },
    ];
  }
  const side = n > 4 ? 2 : 0;
  const along = Math.ceil((n - side) / 2);
  const spots: { x: number; z: number; rotY: number }[] = [];
  for (let i = 0; i < along; i++) {
    const px = along === 1 ? 0 : ((i + 0.5) / along - 0.5) * w * 0.7;
    spots.push({ x: px, z: -z, rotY: 0 });
    if (spots.length < n) spots.push({ x: px, z, rotY: Math.PI });
  }
  if (side > 0 && spots.length < n) spots.push({ x: -x, z: 0, rotY: Math.PI / 2 });
  if (side > 1 && spots.length < n) spots.push({ x, z: 0, rotY: -Math.PI / 2 });
  return spots;
}
