import { redirect } from "next/navigation";

/** Old link target: adding items now lives in the order screen (right panel on tablets, "Add items" tab on phones). */
export default async function AddItemsRedirect({ params }: PageProps<"/orders/[id]/add">) {
  redirect(`/orders/${encodeURIComponent((await params).id)}?tab=add`);
}
