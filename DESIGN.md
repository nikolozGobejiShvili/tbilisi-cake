# Design notes

## The idea

A candle-lit patisserie at night, with a cake you can take apart. The first version, a blush and frog-green site led by type, was rejected by the operator, who asked for a cake animation on the first page, as maximally refined as possible.

## The one loud thing

The home page opens on a real-time 3D cake on a dark stage. It is built in code, so it needs no 3D files and stays sharp at any size.

1. **On load:** sponge, cream and berry layers come down one by one, cream runs down over them, pearls are piped around the foot, glaze is poured at the centre and spreads to the rim, the drips run, the raspberries land, and the candles rise and light.
2. **Scroll, apart:** the coat lifts off and the layers separate, with labels that follow them on screen.
3. **Scroll, cut:** the cake closes, turns, and a wedge slides out to show the inside.
4. **Scroll, above:** the studio lights fall away and the camera rises over the candles and raspberries, ending on the call to build a cake.

Scrolling stays native: the page never takes over the scrollbar. Everything around this moment stays quiet.

The cake quotes the real feed: a wooden stand with a white board, raspberries, wavy gold candles, a piped pearl border. It is labelled an illustration, because it is not a specific cake and the real fillings are unconfirmed.

## What makes the cake look real

The operator liked the first 3D version and asked for it to be more realistic. These made the difference.

- **Light:** a food photographer's studio, built in code: a dark room with large soft panels, so the glaze carries long window-shaped highlights. Tone mapping keeps true colour, so raspberries stay red and cream stays cream. Shadows are soft.
- **Dark where things touch:** soft contact shadows under the cake, under the stand and under every berry, and shade stored per vertex at the foot of the coat and between drupelets.
- **Nothing is perfect:** the coat is hand-spread with faint knife marks, cream and filling undulate, pearls differ in size and sag slightly, and the glaze surface swells so its reflections waver.
- **Drips:** straight sides, a flare where they leave the band, a rounded end. Each is half a tube lying on the cake, so it catches a highlight along its length.
- **Raspberries:** drupelets of varying size over a dark core, with a little glow in the red, as light passes through real fruit.
- **The cut:** a painted cross-section with air pockets of many sizes, browner edges on the sponge, wavy cream with no straight lines, and berry filling with seeds that soaks slightly into the crumb.

## The photographs

An orderly grid of equal square tiles that crop evenly, so cakes can be compared at a glance. The first version scattered photos at different sizes, which the operator read as messy. The last tile leads to the builder, which completes the final row. On its own page or in the lightbox, a photo keeps its whole shape.

## Fallbacks

- **Reduced motion, no WebGL, or a software renderer:** a still image rendered from the same cake, then the same words in reading order. An inline script decides before the first paint, so the layout does not jump.
- **Weaker devices and phones:** fewer raspberries, simpler materials, no shadows.
- **Struggling frame rate:** resolution steps down, then shadows go.
- **Off screen or hidden tab:** drawing stops.

## Tokens

Every colour comes from the logo or the real photographs.

| Name | Hex | Where it comes from | Role |
| --- | --- | --- | --- |
| Noir | `#170B08` | The logo's chestnut lettering, taken down almost to black, like dark chocolate | Ground |
| Cocoa | `#25120D` | One step up from noir | Sheets, forms |
| Blush | `#EAC0BA` | Measured from the logo field | Headings, actions |
| Cream | `#F7EAE3` | A pale tint of blush | Body text |
| Gold | `#C9A25E` | The wavy candles in the real photographs | Hairlines |

`src/lib/tokens.test.ts` fails if a text or action pair drops below 4.5:1.

## Type

- Latin and Cyrillic display: Prata, a fashion-magazine didone.
- Georgian display: Noto Serif Georgian, static weight 300, which reads as elegant on dark. Only Noto has Georgian in the UI/UX Pro Max font catalogue, so there was no other serif to choose.
- Text: Golos, and Noto Sans Georgian.
- `font-synthesis: none`, and no `text-transform: uppercase` anywhere, since it would turn Georgian into Mtavruli.
- Each font is declared once. See the note in `src/lib/fonts.ts`.

## UI/UX Pro Max

The operator asked for this skill, so it was read and its local search was run. Taken from it: scroll-triggered storytelling with a call to action at the end, a scrubbed camera on a fixed path, keeping the story readable without the effects, pausing when off screen, reduced-motion handling, and its warning against poor food photos, which is why the 3D carries the opening rather than the small crops.

Not taken: its generated palette and fonts (brown and cream, Inter and Playfair Display). They are the generic default for this category, and neither font has Georgian letters.

## Critique log

| Found | Fix |
| --- | --- |
| Candles ran up behind the navigation | Shorter candles, camera pulled back |
| The coat swallowed the top sponge in the exploded view, so its label pointed at the coat | The coat now clears the whole stack |
| Raspberries looked pink and scattered, like polka dots from above | Denser crown in three rings, deeper colour, less sheen |
| A white hot spot on the glaze in the top view, and a blown-out blob where the flames overlapped | Glaze less mirror-like, lower candle light, gentler camera angle |
| Glaze and berry layer looked chalky at grazing angles | Far less reflection of the environment |
| The wedge came straight at the camera and covered the headline | Shorter travel, new direction, cake moved aside |
| The wooden stand was orange and loud | Dark walnut with quieter grain |
| On phones a label ran off the screen | Labels wrap, and the cake moves aside for that chapter |
| Lighthouse found 3D starting up froze the page for 2.6 s on a slow phone | Start-up split into short steps, background shader preparation, fewer kinds of material |
| After the realism pass the whole cake turned tan | Whiter lights and environment, neutral contact shade, cleaner cream |
| Drips looked like pins with balls on the end | Wider, with a modest bead |
| Knife marks looked like wood grain | Much fainter |
| Leaves were pale shards drawing the eye | Smaller, darker, tucked between the berries |

Earlier fixes that still apply: component CSS sits in `@layer components` so utilities can override it, and the focus ring has its own token.

## Rejected on purpose

Script fonts, sprinkles and cupcake icons, the cream, terracotta and serif default, pastel rainbows, glass, gradient text, emoji as interface, grids of rounded shadow cards, tracked capitals above headings, and keel arches or Eastern tile, which the operator rejected on Babi's Grooming. The photographs in the lookbook are all real work, never stock or AI-generated.

## Audits

Every colour in the interface is a token. The hard-coded hex values in the 3D model and the builder drawing are illustration, not interface. Errors are tied to their fields with `aria-invalid` and `aria-describedby`, language links are 44 px tall, and the skip link appears on the first Tab.

## Measured

See `README.md` for the latest numbers.
