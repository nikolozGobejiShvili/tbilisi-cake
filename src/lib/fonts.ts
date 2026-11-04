import { Golos_Text, Noto_Sans_Georgian, Noto_Serif_Georgian, Prata } from "next/font/google";

/**
 * Display: Prata, a fashion-magazine didone with real Cyrillic, and Noto Serif Georgian for
 * Georgian, since Prata has no Georgian letters. Text: Golos and Noto Sans Georgian.
 *
 * Declare each font exactly once. Two instances of one font share a family name, and then the
 * preloaded file goes unused and the browser downloads the font twice (measured: 479 KB of fonts
 * on the home page, against 183 KB without the duplicates). Only the display faces are preloaded.
 */
const serifGeorgian = Noto_Serif_Georgian({ subsets: ["georgian"], weight: "300", variable: "--font-georgian-display", display: "swap", preload: true });
const prata = Prata({ subsets: ["latin", "cyrillic"], weight: "400", variable: "--font-latin-display", display: "swap", preload: true });
const sansGeorgian = Noto_Sans_Georgian({ subsets: ["georgian"], variable: "--font-georgian-text", display: "swap", preload: false });
const golos = Golos_Text({ subsets: ["latin", "cyrillic"], variable: "--font-latin-text", display: "swap", preload: false });

export const fontVariables = [serifGeorgian, prata, sansGeorgian, golos].map((f) => f.variable).join(" ");
