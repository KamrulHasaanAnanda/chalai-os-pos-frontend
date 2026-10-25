import { DemoRedirect } from "@/demo/pages";

// Demo build only (deploy/shared-hosting/prepare.mjs): the demo accounts have no temporary password and every plan
// module, so this page is never needed.
export default function Page() {
  return <DemoRedirect to="/" />;
}
