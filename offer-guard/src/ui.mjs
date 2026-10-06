export const $ = (s) => document.querySelector(s);
export const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function shell({ name, logo, tag, title, subtitle, number, theme }) {
  document.body.className = theme;
  $("#app").innerHTML =
    `<div class="shell"><header><a class="brand" href="./"><span class="logo">${logo}</span>${name}</a><span class="header-note"><i></i> SERVER INFERENCE / OPT-IN HISTORY</span></header><section class="hero"><div class="hero-copy"><span class="eyebrow">${number} / ${tag}</span><h1>${title}</h1><p>${subtitle}</p></div><div class="hero-mark" aria-hidden="true"><i class="orbit-dot a"></i><i class="orbit-dot b"></i><i class="orbit-chip left">{ }</i><i class="orbit-chip right">ML</i><span>${logo}</span><small>APPLIED<br>MACHINE LEARNING</small></div></section><main id="content"></main><footer><span>${name} / built for inspection, not blind trust.</span><span>Express API · PostgreSQL history · Raw texts not stored</span></footer></div>`;
}
export function metric(label, value, caption) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong><small>${caption}</small></div>`;
}
export function download(name, data) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function contributionChart(items) {
  const sorted = [...items].sort(
    (a, b) => Math.abs(b.value) - Math.abs(a.value),
  );
  const max = Math.max(0.01, ...sorted.map((x) => Math.abs(x.value)));
  return `<div class="contributions">${sorted.map((c) => `<div class="contribution"><span>${escape(c.name)}</span><div class="diverge"><i class="${c.value >= 0 ? "positive" : "negative"}" style="${c.value >= 0 ? "left:50%" : "right:50%"};width:${(Math.abs(c.value) / max) * 48}%"></i></div><b>${c.value >= 0 ? "+" : ""}${c.value.toFixed(2)}</b></div>`).join("")}</div>`;
}
export function lineChart(
  values,
  { label = "Congestion index", highlight = 18 } = {},
) {
  const w = 840,
    h = 230,
    p = 30,
    x = (i) => p + (i / (values.length - 1)) * (w - 2 * p),
    y = (v) => h - p - (v / 100) * (h - 2 * p);
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escape(label)}"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="currentColor" stop-opacity=".2"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>${[0, 25, 50, 75, 100].map((v) => `<line class="gridline" x1="${p}" x2="${w - p}" y1="${y(v)}" y2="${y(v)}"/><text x="0" y="${y(v) + 4}">${v}</text>`).join("")}<path fill="url(#fill)" d="M ${x(0)},${y(0)} L ${values.map((v, i) => `${x(i)},${y(v)}`).join(" L ")} L ${x(values.length - 1)},${y(0)} Z"/><path class="line" d="M ${values.map((v, i) => `${x(i)},${y(v)}`).join(" L ")}"/>${[
    0, 6, 12, 18, 23,
  ]
    .filter((i) => i < values.length)
    .map(
      (i) =>
        `<text x="${x(i)}" y="${h - 4}" text-anchor="middle">${String(i).padStart(2, "0")}:00</text>`,
    )
    .join(
      "",
    )}<circle cx="${x(highlight)}" cy="${y(values[highlight])}" r="6" fill="currentColor" stroke="white" stroke-width="3"/></svg>`;
}
