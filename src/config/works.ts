/**
 * The lookbook. Each work keeps a stable number, so a customer can simply say "number 8".
 *
 * Photos are cropped from Instagram screenshots, so width and height are small. When the owner
 * sends originals, replace the files in public/works and update the sizes here. Categories
 * were assigned by looking at the photos, and the owner should check them.
 */
import type { Category } from "../lib/types.ts";

export type Work = {
  slug: string;
  number: number;
  category: Category;
  src: string;
  width: number;
  height: number;
  post: string;
};

const ig = (kind: "p" | "reel", code: string) => `https://www.instagram.com/${kind}/${code}/`;

export const WORKS: readonly Work[] = [
  { slug: "air-cloud", number: 1, category: "signature", src: "/works/air-cloud.webp", width: 302, height: 273, post: ig("p", "C7XMVLCsLEf") },
  { slug: "frog-wedding", number: 2, category: "wedding", src: "/works/frog-wedding.webp", width: 351, height: 467, post: ig("p", "Dei3RU6sakf") },
  { slug: "raspberries", number: 3, category: "signature", src: "/works/raspberries.webp", width: 240, height: 273, post: ig("p", "DemG2h6DEKn") },
  { slug: "sunflower", number: 4, category: "signature", src: "/works/sunflower.webp", width: 351, height: 467, post: ig("p", "DdZkho0Mcsy") },
  { slug: "ribbons", number: 5, category: "wedding", src: "/works/ribbons.webp", width: 351, height: 427, post: ig("p", "Dc8xKtYMGgW") },
  { slug: "piggy", number: 6, category: "kids", src: "/works/piggy.webp", width: 351, height: 456, post: ig("p", "DcNJ7gisAAp") },
  { slug: "rose", number: 7, category: "signature", src: "/works/rose.webp", width: 243, height: 302, post: ig("p", "DcHTlSjDFs9") },
  { slug: "gothic-sword", number: 8, category: "signature", src: "/works/gothic-sword.webp", width: 351, height: 421, post: ig("reel", "DdWrlEGsBol") },
  { slug: "white-flowers", number: 9, category: "wedding", src: "/works/white-flowers.webp", width: 301, height: 273, post: ig("p", "C-0U1s-s3Ry") },
  { slug: "first-birthday", number: 10, category: "kids", src: "/works/first-birthday.webp", width: 350, height: 456, post: ig("p", "DcWMoI6sfYo") },
  { slug: "birthday-pink", number: 11, category: "signature", src: "/works/birthday-pink.webp", width: 301, height: 273, post: ig("reel", "DIPQm1qocOS") },
];

