import type { MenuCategory, MenuItem } from "@/lib/api/types";

// Toppings as modifiers, in the POS only: the menu data stays as the owner made it ("ADD SOME TOPPINGS" is an
// ordinary category of ordinary dishes). The POS hides those categories from the menu grid and offers their dishes
// in a sheet when a matching dish is tapped.
//
// Saving (no API change): each topping is sent as its own charged line right after its dish, with the note
// "↳ <dish>". Lines come back in the order sent, so the ticket shows it indented under the dish, and the kitchen
// reads the note.

/**
 * The mapping. `group` matches a category name (its dishes are the toppings); `appliesTo` matches the name of the
 * dish tapped or of its category. Edit here to change which categories are toppings and which dishes ask for them.
 */
export const MODIFIER_RULES: { group: RegExp; appliesTo: RegExp }[] = [
  { group: /topping|add[\s-]?ons?\b|extras?\b/i, appliesTo: /burger|smash/i },
];

/** Marks a topping line's note; the rest of the note is the dish it belongs to. */
export const TOPPING_MARK = "↳ ";

export type ModifierSetup = {
  /** Categories that are topping groups (hidden from the menu grid). */
  groupIds: Set<string>;
  /** The toppings to offer for a dish, or [] when it takes none. */
  toppingsFor: (item: MenuItem, category: MenuCategory) => MenuItem[];
};

export function modifierSetup(menu: MenuCategory[]): ModifierSetup {
  const groups = MODIFIER_RULES.map((rule) => ({
    rule,
    categories: menu.filter((c) => rule.group.test(c.name)),
  })).filter((g) => g.categories.length > 0);
  const groupIds = new Set(groups.flatMap((g) => g.categories.map((c) => c.id)));
  return {
    groupIds,
    toppingsFor: (item, category) => {
      if (groupIds.has(category.id)) return [];
      return groups
        .filter((g) => g.rule.appliesTo.test(item.name) || g.rule.appliesTo.test(category.name))
        .flatMap((g) => g.categories.flatMap((c) => c.items));
    },
  };
}

/** The note sent with a topping line. */
export const toppingNote = (dishName: string) => `${TOPPING_MARK}${dishName}`.slice(0, 200);

export const isToppingNote = (note: string | null | undefined) => !!note?.startsWith(TOPPING_MARK);

/** Sent lines with each topping line (marked note, right after a dish) folded under the dish before it. */
export function nestToppings<T extends { note: string | null }>(items: T[]): { item: T; toppings: T[] }[] {
  const out: { item: T; toppings: T[] }[] = [];
  for (const item of items) {
    const parent = out[out.length - 1];
    if (parent && isToppingNote(item.note)) parent.toppings.push(item);
    else out.push({ item, toppings: [] });
  }
  return out;
}
