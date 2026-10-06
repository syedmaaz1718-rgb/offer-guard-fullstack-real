import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { classify, vectorize, sigmoid } from "../src/ml.mjs";
const model = JSON.parse(
  fs.readFileSync(new URL("../models/model.json", import.meta.url)),
);
const fixtures = JSON.parse(
  fs.readFileSync(new URL("./parity.json", import.meta.url)),
);
test("JS classifier matches sklearn probabilities to 1e-10", () => {
  for (const f of fixtures)
    assert.ok(Math.abs(classify(f.text, model).score - f.expected) < 1e-10);
});
test("empty and unknown text has no recognized evidence", () => {
  assert.equal(vectorize("", model).size, 0);
  assert.equal(vectorize("xyzabc xyzxyz", model).size, 0);
});
test("suspicious sample scores above standard process", () =>
  assert.ok(
    classify(fixtures[0].text, model).score >
      classify(fixtures[1].text, model).score,
  ));
test("sigmoid extreme values stay finite", () => {
  assert.ok(Number.isFinite(sigmoid(1e9)));
  assert.ok(Number.isFinite(sigmoid(-1e9)));
});
