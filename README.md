# Tbilisi Cake: concept website

A site in Georgian, Russian and English for the Tbilisi cake maker [@tbilisi_cake](https://www.instagram.com/tbilisi_cake/). **It is a concept: the owner has not approved it.** While `showConceptLabel` is on, every page says so, search engines are kept out, and orders are saved as demos that reach nobody.

Georgian is at `/`, Russian at `/ru`, English at `/en`. The owner panel is at `/admin`.

## Run it

```
npm install
npm run build
npm run start
```

Then open http://localhost:3000.

The panel needs a password. Copy `.env.example` to `.env.local` and set `ADMIN_PASSWORD`. Without one, `/admin` answers 404. For a production build over plain http on your own computer, also set `ALLOW_HTTP_ADMIN=1`.

`npm run seed:demo` fills the panel with obviously fake orders, so it can be shown.

## Checks

```
npm run check     # letters in all three languages, unit tests, lint, build
npm run e2e       # needs a build first; uses the system Chrome and the data-test folder
```

The end-to-end tests never contact the real business: Instagram and Telegram are blocked at the network level, and nothing is sent.

## What the site does

- A real-time 3D cake on the home page: it assembles on load, then comes apart, is cut and is seen from above as you scroll. Without a graphics chip or with reduced motion, it is a still image with the same words. To regenerate that image, run the site and then `node scripts/make-poster.mjs`.
- Lookbook as an even grid, with categories, lightbox, favourites, a page and share link per cake, and "I want one like this".
- Order builder: occasion, format, guests, filling, design with reference or own photo, inscription, date with lead time and closed days, pickup or delivery, sending to someone else, allergies, contact details. Draft autosaves. The cake is drawn in cross-section at real scale.
- After ordering: a reference number, a private status page, and a ready-made message to paste into Instagram.
- Fillings, prices, delivery and payment, reviews, questions, about and privacy pages.
- Owner panel, in Georgian and Russian: orders and statuses, the customer's photo, a copyable reply, calendar with daily capacity and closed days, upcoming occasions, CSV export, and editing of prices, fillings, questions and cakes.
- Optional Telegram message on each real order.

## What the owner must supply

Most valuable first.

1. **Original photos.** Every photo on the site is cropped from a screenshot, at most about 351 px wide. Bento and dessert categories are empty because no such photo was visible. Originals are the biggest possible quality gain. To use them: replace the files in `public/works`, update the sizes in `src/config/works.ts`.
2. **Prices and fillings.** They are in the Price/Fillings highlight, which needs an Instagram login to read. Until then the site shows no amount, and the fillings in the builder are examples, labelled as such. Enter the real ones in the panel, under Content.
3. **Reviews.** They are in the Отзывы highlight. Fill `reviews` in `src/config/business.ts` and set `confirmed: true`. Use first name and initial only.
4. **Lead time and daily capacity.** The 3 days and 3 orders per day are placeholders so the calendar works. Set the real ones in the panel, under Calendar.
5. **Delivery area and cost, pickup place, phone, WhatsApp.** Each is in `src/config/business.ts` with a `confirmed` flag.
6. **The owner's story** for the About page, and **the original logo**: the monogram in `src/components/Monogram.tsx` is redrawn from a screenshot.
7. **Checks by eye:** the category and mood of each cake in `src/config/works.ts`, and the cake titles, which were written from looking at the photos.

Facts used so far, and their sources, are in `research/instagram-facts.md`.

## Where it runs

Preview, still in concept mode: https://tbilisi-cake-production.up.railway.app

Railway project `tbilisi-cake`, service `tbilisi-cake`. Orders and photos are on a volume mounted at `/data`. This folder is linked and has no git repository, so `railway up` from here redeploys. The panel password is in `.env.railway`, which is never uploaded. To put fake orders in the live panel: `railway ssh --service tbilisi-cake -- node scripts/seed-demo.mjs`.

## Going live

1. Get the owner's approval. The photos are theirs and appear here only for this concept.
2. Set `showConceptLabel: false` in `src/config/business.ts`. That removes the banner, allows indexing, adds the sitemap and JSON-LD, and makes orders real.
3. On the host, set `ADMIN_PASSWORD`, `SITE_URL` and `DATA_DIR`, and point `DATA_DIR` at a persistent volume, or orders and photos are lost on each deploy. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` for notifications.
4. Rewrite `order.result.nextTitle` and `nextText` in the three message files. They tell the customer to send the order on Instagram, which suits the concept. Once orders are real they already reach the panel, so that step becomes optional.

Online card payment is not included: it needs merchant contracts with the banks. Customers pay as the Instagram bio describes.

## Measured

On the development laptop (AMD Radeon integrated graphics), production build, 2 November 2026. Nothing has been measured on real hosting or a real phone. Numbers vary between runs on this laptop.

The home page on a real graphics chip, first visit:

| Conditions | Words visible (LCP) | Cake visible | Longest freeze | Frames per second |
| --- | --- | --- | --- | --- |
| Desktop size | 0.6 s | 3.0 s | 0.3 s | 60 |
| Phone size | 0.2 s | 1.7 s | 0.1 s | 60 |
| Phone size, 4x slower processor, slow 4G | 1.0 s | 5.7 s | 0.2 s | 51 |

Lighthouse 12, mobile:

| Page | Performance | Accessibility | Best Practices | LCP | CLS |
| --- | --- | --- | --- | --- | --- |
| Home, Georgian | 64 | 100 | 100 | 3.1 s | 0 |
| Home, English | 68 | 100 | 100 | 2.6 s | 0 |
| Cakes, Georgian | 88 | 100 | 100 | 3.7 s | 0.02 |

**The home page misses the performance target, and this is the known price of the 3D:** total blocking time is about 2.5 s under Lighthouse's 4x slower processor, from loading Three.js and preparing the cake. The words stay visible and the page does not shift. SEO scores 100 with the concept label off; with it on, the only failing check is the deliberate noindex.

## Technical notes

- Next.js 16, React 19, Tailwind 4, Three.js and GSAP (loaded only on the home page, after the words have appeared), `node:sqlite` (built into Node, so no native build), sharp. The cake is in `src/components/stage`: `cake-model.ts` builds it and `engine.ts` holds the lights, camera and timeline.
- Read `src/config/business.ts` first. An unconfirmed value is read through `fact()` in `src/lib/facts.ts`, which returns null until the owner confirms it.
- The one order validation is `validateOrder` in `src/lib/order.ts`, used by the builder and enforced by the server.
- Customer photos are checked by their bytes, re-encoded to strip location data, stored under `DATA_DIR` and served only to the logged-in panel.
- The text check in `scripts/check-text.mjs` exists because generated Georgian can pick up look-alike Armenian letters. Georgian copy was written and proofread by a separate model for that reason.
