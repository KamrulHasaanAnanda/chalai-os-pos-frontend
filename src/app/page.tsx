import { redirect } from "next/navigation";
import { homeFor, requireStaff } from "@/lib/session";

/** Kitchen staff go to the ticket board, everyone else to the floor. */
export default async function Home({ searchParams }: PageProps<"/">) {
  const { user } = await requireStaff();
  const { welcome } = await searchParams;
  redirect(`${homeFor(user.role)}${welcome === "1" ? "?welcome=1" : ""}`);
}
