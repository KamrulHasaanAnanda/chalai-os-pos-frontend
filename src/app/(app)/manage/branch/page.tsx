import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ManageBranchView } from "@/components/views/manage-branch-view";
import { load, requireManage } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("branch") };
}

export default async function ManageBranchPage() {
  await requireManage("branchInfo");
  const branch = await load((api) => api.manageBranch());
  return <ManageBranchView branch={branch} />;
}
