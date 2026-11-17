import { OfflineTill } from "@/components/offline/offline-till";

// The offline till. It renders nothing from the server, so the service worker can keep a copy and open it with
// no internet; everything comes from the snapshot in IndexedDB.
export const dynamic = "force-static";

export default function OfflinePage() {
  return <OfflineTill />;
}
