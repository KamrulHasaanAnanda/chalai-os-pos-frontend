import { Suspense } from "react";
import { DemoHome } from "@/demo/pages";

// Demo build only: copied over the server page by deploy/shared-hosting/prepare.mjs.
export default function Home() {
  return (
    <Suspense>
      <DemoHome />
    </Suspense>
  );
}
