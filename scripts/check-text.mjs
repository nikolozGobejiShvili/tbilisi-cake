// Guards the three languages. Generated Georgian can pick up look-alike letters from other
// alphabets, which look almost right on screen but break search and read as typos.
//  - Georgian messages: no Armenian, Greek or Cyrillic letters.
//  - Russian messages: no Georgian or Armenian letters.
//  - English messages: no Georgian or Armenian letters (the highlight name "Отзывы" is real).
//  - All three: same keys, same array lengths, same {placeholders}.
//  - Every source file: no Armenian or Greek letters, and no word mixing two alphabets.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ARMENIAN = /[԰-֏]/;
const GREEK = /[Ͱ-Ͽ]/;
const CYRILLIC = /[Ѐ-ӿ]/;
const GEORGIAN = /[Ⴀ-ჿᲐ-Ჿⴀ-⴯]/;
const LATIN = /[A-Za-z]/;

const problems = [];
const stats = { georgian: 0, russian: 0, english: 0 };

function strings(node, path = "") {
  if (typeof node === "string") return [[path, node]];
  if (Array.isArray(node)) return node.flatMap((v, i) => strings(v, `${path}[${i}]`));
  if (node && typeof node === "object") return Object.entries(node).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k));
  return [];
}

function shape(node) {
  if (Array.isArray(node)) return node.map(shape);
  if (node && typeof node === "object") return Object.fromEntries(Object.entries(node).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, shape(v)]));
  return typeof node;
}

const placeholders = (text) => (text.match(/\{[a-zA-Z]+\}/g) ?? []).sort().join(",");

const { en } = await import("../src/messages/en.ts");
const loaded = { en };
for (const [locale, file] of [["ru", "ru.ts"], ["ka", "ka.ts"]]) {
  try {
    loaded[locale] = (await import(`../src/messages/${file}`))[locale];
  } catch (error) {
    problems.push(`src/messages/${file}: cannot be loaded (${error.message})`);
  }
}

const enStrings = new Map(strings(en));
for (const [locale, messages] of Object.entries(loaded)) {
  if (locale !== "en") {
    if (JSON.stringify(shape(messages)) !== JSON.stringify(shape(en))) {
      const theirs = new Set(strings(messages).map(([p]) => p));
      const missing = [...enStrings.keys()].filter((p) => !theirs.has(p));
      const extra = [...theirs].filter((p) => !enStrings.has(p));
      problems.push(`${locale}: shape differs from en. Missing: ${missing.slice(0, 12).join(", ") || "none"}. Extra: ${extra.slice(0, 12).join(", ") || "none"}.`);
    }
  }
  for (const [path, text] of strings(messages)) {
    if (locale !== "en" && enStrings.has(path) && placeholders(text) !== placeholders(enStrings.get(path))) {
      problems.push(`${locale}.${path}: placeholders differ from English: "${text}"`);
    }
    if (locale === "ka") {
      stats.georgian += (text.match(/[ა-ჿ]/g) ?? []).length;
      if (ARMENIAN.test(text) || GREEK.test(text) || CYRILLIC.test(text)) problems.push(`ka.${path}: foreign letters in "${text}"`);
    }
    if (locale === "ru") {
      stats.russian += (text.match(/[Ѐ-ӿ]/g) ?? []).length;
      if (GEORGIAN.test(text) || ARMENIAN.test(text)) problems.push(`ru.${path}: foreign letters in "${text}"`);
    }
    if (locale === "en") {
      stats.english += (text.match(/[A-Za-z]/g) ?? []).length;
      if (GEORGIAN.test(text) || ARMENIAN.test(text)) problems.push(`en.${path}: foreign letters in "${text}"`);
    }
  }
}

function walk(path) {
  if (statSync(path).isFile()) return /\.(ts|tsx|css|md|mjs)$/.test(path) ? [path] : [];
  return readdirSync(path).flatMap((name) => walk(join(path, name)));
}

function scriptsIn(word) {
  return [["Latin", LATIN], ["Cyrillic", CYRILLIC], ["Georgian", GEORGIAN], ["Armenian", ARMENIAN], ["Greek", GREEK]]
    .filter(([, re]) => re.test(word))
    .map(([name]) => name);
}

const sources = ["src", "scripts", "e2e", "README.md", "DESIGN.md"].flatMap((p) => {
  try {
    return walk(p);
  } catch {
    return [];
  }
});
const THIS_FILE = /check-text\.mjs$/;
for (const file of sources) {
  if (THIS_FILE.test(file)) continue;
  readFileSync(file, "utf8").split("\n").forEach((line, index) => {
    if (ARMENIAN.test(line) || GREEK.test(line)) problems.push(`${file}:${index + 1}: Armenian or Greek letter`);
    for (const word of line.match(/\p{L}+/gu) ?? []) {
      const found = scriptsIn(word);
      if (found.length > 1) problems.push(`${file}:${index + 1}: word mixes ${found.join(" and ")}: "${word}"`);
    }
  });
}

console.log(`Letters checked. Georgian: ${stats.georgian}. Russian: ${stats.russian}. English: ${stats.english}. Source files: ${sources.length}. Problems: ${problems.length}.`);
for (const problem of problems.slice(0, 60)) console.error(problem);
process.exit(problems.length > 0 ? 1 : 0);
