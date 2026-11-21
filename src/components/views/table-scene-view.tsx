"use client";

import dynamic from "next/dynamic";
import type { SceneTable } from "@/components/views/table-scene";

const TableScene = dynamic(
  () => import("@/components/views/table-scene").then((mod) => mod.TableScene),
  {
    ssr: false,
    loading: () => <div className="h-[min(70dvh,680px)] min-h-[460px] animate-pulse rounded-xl bg-[#0b1120]" />,
  },
);

/** The 3D room. Loaded in the browser only; the server never starts WebGL. */
export function TableSceneView({ tables }: { tables: SceneTable[] }) {
  return <TableScene tables={tables} />;
}
