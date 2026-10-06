import fs from "node:fs";
import { classify } from "../src/ml.mjs";
const model = JSON.parse(
  fs.readFileSync(new URL("../models/model.json", import.meta.url)),
);
export function infer(body) {
  if (
    typeof body?.text !== "string" ||
    body.text.trim().length < 40 ||
    body.text.length > 16000
  )
    throw Object.assign(Error("Job post must contain40–16,000 characters."), {
      status: 400,
    });
  const out = classify(body.text.trim(), model);
  if (out.recognized < 4)
    throw Object.assign(Error("Too little supported vocabulary."), {
      status: 400,
    });
  const reverse = Object.fromEntries(
    Object.entries(model.vocabulary).map(([k, v]) => [v, k]),
  );
  return {
    score: out.score,
    recognized: out.recognized,
    contributions: out.contributions
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 6)
      .map((x) => ({ name: reverse[x.index], value: x.value })),
    model: "EMSCAD TF-IDF logistic regression",
    disclaimer:
      "Historical, uncalibrated screening signal. Not a fraud determination.",
  };
}
