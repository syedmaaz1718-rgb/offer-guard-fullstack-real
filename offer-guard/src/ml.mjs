export const sigmoid = (z) =>
  1 / (1 + Math.exp(-Math.max(-700, Math.min(700, z))));
export function vectorize(text, model) {
  const stop = new Set(model.stopWords || []);
  const words = (text.toLowerCase().match(/[\p{L}\p{N}_]{2,}/gu) || []).filter(
    (w) => !stop.has(w),
  );
  const counts = new Map();
  const tokens = [
    ...words,
    ...words.slice(0, -1).map((w, i) => w + " " + words[i + 1]),
  ];
  for (const word of tokens) {
    const i = model.vocabulary[word];
    if (i !== undefined) counts.set(i, (counts.get(i) || 0) + 1);
  }
  let norm = 0;
  const vector = new Map();
  for (const [i, n] of counts) {
    const value = (1 + Math.log(n)) * model.idf[i];
    vector.set(i, value);
    norm += value * value;
  }
  norm = Math.sqrt(norm);
  if (norm) for (const [i, v] of vector) vector.set(i, v / norm);
  return vector;
}
export function classify(text, model) {
  const v = vectorize(text, model);
  const contributions = [...v].map(([i, val]) => ({
    index: i,
    value: val * model.coefficients[i],
  }));
  return {
    score: sigmoid(
      model.intercept + contributions.reduce((sum, c) => sum + c.value, 0),
    ),
    contributions,
    recognized: v.size,
  };
}
