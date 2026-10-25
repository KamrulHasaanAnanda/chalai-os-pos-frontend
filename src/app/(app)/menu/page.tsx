import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setAvailability } from "@/actions/menu";
import { Notice, PageTitle } from "@/components/form";
import { Icon } from "@/components/icons";
import { readError } from "@/lib/errors";
import { formatTaka } from "@/lib/format";
import { load, managerRoles, requireStaff } from "@/lib/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("menu");
  return { title: t("title") };
}

/** Managers mark dishes sold out (and back) in one tap. Guests' QR menus and waiters' pickers update live. */
export default async function MenuPage({ searchParams }: PageProps<"/menu">) {
  await requireStaff({ roles: managerRoles });
  const menu = await load((api) => api.menu());
  const t = await getTranslations("menu");
  const error = await readError(searchParams);
  const soldOut = menu.flatMap((c) => c.items).filter((item) => !item.isAvailable).length;

  return (
    <div className="mx-auto max-w-[960px] space-y-4">
      <PageTitle title={t("title")} body={t("body", { n: soldOut })} />
      {error.general && <Notice>{error.general}</Notice>}
      {menu.length === 0 && <Notice tone="info">{t("empty")}</Notice>}
      {menu.map((category) => (
        <section key={category.id}>
          <h2 className="text-[19px] font-extrabold">{category.name}</h2>
          <ul className="mt-2 grid gap-2 md:grid-cols-2">
            {category.items.map((item) => {
              const formError = error.forForm(`item-${item.id}`);
              return (
                <li
                  key={item.id}
                  id={`item-${item.id}`}
                  className={cn(
                    "scroll-mt-24 rounded-2xl bg-white p-3 shadow-[inset_0_0_0_2px_var(--line)]",
                    !item.isAvailable && "bg-late/5 shadow-[inset_0_0_0_2px_var(--late)]",
                  )}
                >
                  <form action={setAvailability} className="flex items-center gap-3">
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="isAvailable" value={item.isAvailable ? "false" : "true"} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] font-bold">{item.name}</p>
                      <p className="text-[15px] text-muted-foreground">
                        {formatTaka(item.priceTaka)} ·{" "}
                        <span className={cn("font-bold", item.isAvailable ? "text-ok" : "text-late")}>
                          {item.isAvailable ? t("available") : t("soldOut")}
                        </span>
                      </p>
                    </div>
                    <button
                      type="submit"
                      role="switch"
                      aria-checked={item.isAvailable}
                      aria-label={t("toggle", { name: item.name })}
                      className={cn(
                        "flex min-h-12 min-w-[132px] items-center justify-center gap-1.5 rounded-xl px-3 text-[15px] font-extrabold",
                        item.isAvailable ? "bg-ok-soft text-ok" : "bg-late text-white",
                      )}
                    >
                      <Icon name={item.isAvailable ? "check" : "x"} className="size-4" />
                      {item.isAvailable ? t("markSoldOut") : t("markAvailable")}
                    </button>
                  </form>
                  {formError && <p className="mt-1 text-[14.5px] font-semibold text-late">{formError}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
