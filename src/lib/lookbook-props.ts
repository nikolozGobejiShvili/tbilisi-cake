import type { LookbookLabels, LookbookWork } from "@/components/Lookbook";
import type { Messages } from "@/messages/en";
import type { PublicWork } from "./content";

/** Only what the browser needs, so the whole message file never reaches the client bundle. */
export function toLookbookWork(work: PublicWork): LookbookWork {
  const { slug, number, src, width, height, title, text, alt } = work;
  return { slug, number, src, width, height, title, text, alt };
}

export function lookbookLabels(t: Messages): LookbookLabels {
  const c = t.cakes;
  return {
    number: c.number,
    wantThis: c.wantThis,
    favourite: c.favourite,
    unfavourite: c.unfavourite,
    previous: c.previous,
    next: c.next,
    close: c.close,
    favouritesFilter: t.categories.favourites,
    emptyFavourites: c.emptyFavourites,
    invite: c.invite,
  };
}
