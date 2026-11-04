import assert from "node:assert/strict";
import { test } from "node:test";
import { csvCell, toCsv } from "./csv.ts";

test("formula starters are neutralised", () => {
  for (const attack of ["=HYPERLINK(1)", "+1+1", "-2", "@SUM(A1)", "\t=1"]) {
    assert.ok(csvCell(attack).replace(/^"/, "").startsWith("'"), attack);
  }
});

test("commas, quotes and line breaks are quoted", () => {
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell("line\nbreak"), '"line\nbreak"');
});

test("plain values and empty values pass through", () => {
  assert.equal(csvCell("ტორტი"), "ტორტი");
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(12), "12");
});

test("the file starts with a byte order mark and uses CRLF", () => {
  assert.equal(toCsv([["a", "b"], [1, 2]]), "﻿a,b\r\n1,2\r\n");
});
