import { setupBackend } from "./backend.mjs";
import "./style.css";
import model from "../models/model.json";
import { classify } from "./ml.mjs";
import {
  $,
  escape,
  shell,
  metric,
  download,
  contributionChart,
} from "./ui.mjs";
shell({
  name: "OfferGuard",
  logo: "og",
  tag: "TRUST & SAFETY / NLP",
  title: "An offer is a promise.<br><em>Check the fine print.</em>",
  subtitle:
    "A private screening tool for internship and job posts. Spot suspicious language, inspect model evidence, and know what still needs verification.",
  number: "01",
  theme: "offer-theme",
});
const suspicious = `Data Science Intern - Remote\nWork on a real product with our team. Earn huge daily income with no skills required. Guaranteed job without an interview or experience.\nPay a registration fee before receiving your offer. Transfer money to our personal UPI account today. Immediate hiring, limited seats, pay now to confirm.`;
const normal = `Python Developer Internship - Bengaluru\nA paid internship with a named mentor and defined deliverables. Responsibilities include tests, code review and documentation.\nSelection includes a technical interview and a coding assignment. Apply through our official company careers portal. We never charge candidates any recruitment fees. Candidates must demonstrate SQL and Python skills.`;
const flags = [
  [
    /registration fee|processing charges|security deposit|transfer money|pay now|training kit/gi,
    "Upfront payment language",
    "Verify through the official employer website before paying anything.",
  ],
  [
    /guaranteed job|without an interview|no skills required|huge daily income/gi,
    "Unusually easy or guaranteed hiring",
    "Promises are a reason to investigate, not proof of fraud.",
  ],
  [
    /bank password|\botp\b/gi,
    "Sensitive account information requested",
    "Do not share passwords or one-time banking codes.",
  ],
  [
    /only on whatsapp|personal upi|limited seats/gi,
    "Pressure or informal payment channel",
    "Independently verify company identity and the recruiter.",
  ],
];
$("#content").innerHTML =
  `<div class="notice"><strong>Research prototype.</strong> Trained on real, labeled EMSCAD job ads (2012–2014), with exact-text duplicates removed. The score is uncalibrated model confidence, not the probability that an offer is a scam. No employer identity or website is verified.</div><div class="workspace"><section class="panel panel-pad"><div class="panel-head"><h2>The job post</h2><span class="mono">TEXT IN / SIGNAL OUT</span></div><div class="actions"><button class="secondary" id="sample">Suspicious sample</button><button class="secondary" id="normal">Standard sample</button><button class="secondary" id="clear">Clear</button></div><label for="post" class="visually-hidden">Job or internship post</label><textarea id="post" maxlength="16000" placeholder="Paste the full job post, including pay, process and recruiter instructions…"></textarea><div class="form-bottom"><span class="small" id="chars">0 / 16,000 characters</span><button id="analyze">Inspect offer ↗</button></div><div id="error" class="error" role="alert"></div><div class="model-card"><strong>TF-IDF + logistic regression</strong><p>Interpretable text features. Browser mode runs locally; server mode processes input on the backend. Raw text is never saved; summary history is opt-in.</p></div></section><section class="panel" id="result" aria-live="polite"><div class="empty"><span class="empty-symbol">?</span><h2>Evidence before instinct.</h2><p>Paste a post or choose a sample to reveal model signals and red-flag language.</p></div></section></div><section class="method"><h3>UNDER THE MODEL</h3><p>${model.metrics.train_rows.toLocaleString()} real training posts / ${model.metrics.test_rows.toLocaleString()} held-out posts. Test accuracy ${(model.metrics.accuracy * 100).toFixed(1)}%, AUROC ${model.metrics.roc_auc.toFixed(3)}. Fraud-class precision ${(model.metrics.precision * 100).toFixed(1)}%, recall ${(model.metrics.recall * 100).toFixed(1)}%; majority baseline ${(model.metrics.majority_baseline * 100).toFixed(1)}%. Random stratified split after exact-text deduplication; near-duplicates and employer overlap may remain. The 2012–2014 corpus is not a present-day or India-specific validation. Short, unfamiliar, non-English and adversarial posts may fail. A low score never establishes that an employer is legitimate.</p></section>`;
const backend = setupBackend();
$("#post").oninput = () => {
  $("#chars").textContent =
    `${$("#post").value.length.toLocaleString()} / 16,000 characters`;
  $("#result").innerHTML =
    '<div class="empty"><h2>Ready to inspect.</h2><p>Text changed. Inspect this offer to compute a fresh result.</p></div>';
};
function sample(text) {
  $("#post").value = text;
  $("#post").dispatchEvent(new Event("input"));
}
$("#sample").onclick = () => sample(suspicious);
$("#normal").onclick = () => sample(normal);
$("#clear").onclick = () => {
  sample("");
  backend.clearSave();
  $("#error").textContent = "";
  $("#result").innerHTML =
    '<div class="empty"><h2>Ready for a fresh inspection.</h2><p>Your previous input and results have been cleared.</p></div>';
};
$("#analyze").onclick = async () => {
  const text = $("#post").value.trim();
  if (text.length < 40) {
    $("#error").textContent =
      "Add at least 40 characters so the model has enough context.";
    return;
  }
  $("#error").textContent = "";
  let out;
  $("#analyze").disabled = true;
  try {
    out = (await backend.analyze({ text })) || classify(text, model);
  } catch (e) {
    $("#error").textContent = e.message;
    return;
  } finally {
    $("#analyze").disabled = false;
  }
  if (out.recognized < 4) {
    $("#error").textContent =
      "Too little English vocabulary was recognized. This model cannot reliably inspect this text.";
    return;
  }
  const score = (out.score * 100).toFixed(1),
    level =
      out.score > 0.65
        ? "Elevated scam-language signal"
        : out.score < 0.35
          ? "Lower scam-language signal"
          : "Mixed / uncertain signal";
  const found = flags
    .map(([re, title, note]) => ({
      title,
      note,
      matches: [...text.matchAll(re)].map((m) => ({
        start: m.index,
        end: m.index + m[0].length,
      })),
    }))
    .filter((f) => f.matches.length);
  const ranges = found
    .flatMap((f) => f.matches)
    .sort((a, b) => a.start - b.start);
  let marked = "",
    cursor = 0;
  for (const r of ranges) {
    if (r.start < cursor) continue;
    marked +=
      escape(text.slice(cursor, r.start)) +
      "<mark>" +
      escape(text.slice(r.start, r.end)) +
      "</mark>";
    cursor = r.end;
  }
  marked += escape(text.slice(cursor));
  const reverse = Object.fromEntries(
    Object.entries(model.vocabulary).map(([k, v]) => [v, k]),
  );
  const terms = out.contributions[0]?.name
    ? out.contributions
    : out.contributions
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        .slice(0, 6)
        .map((c) => ({ name: reverse[c.index], value: c.value }));
  $("#result").innerHTML =
    `<div class="results-head"><div><span class="eyebrow">MODEL SIGNAL</span><h2>${level}</h2></div><div class="score">${score}%<small>uncalibrated score</small></div></div><div class="result-body"><div class="metric-grid">${metric("Red-flag groups", found.length, "Rule-based, separate from model")}${metric("Known features", out.recognized, "Words + phrases recognized")}${metric("Action", "Verify", "Do not rely on this score alone")}</div><h3>Language to investigate</h3><div class="analysis-text">${marked}</div>${found.map((f, i) => `<div class="flag"><b>0${i + 1}</b><div><strong>${escape(f.title)}</strong><p>${escape(f.note)}</p></div></div>`).join("") || '<p class="small">No listed rules fired. That is not a legitimacy check.</p>'}<div class="rule"></div><h3>Why the model leaned this way</h3>${contributionChart(terms)}<p class="small">Signed feature contributions in log-odds. Orange raises the scam-language score; green lowers it. Highlights are independent rules, not a faithful model explanation.</p><div class="result-foot"><span class="small">Next: verify the employer's official careers page.</span><button class="secondary" id="export">Export report ↓</button></div></div>`;
  $("#export").onclick = () =>
    download("offer-guard-report.json", {
      score: out.score,
      label: level,
      redFlags: found.map((f) => f.title),
      topFeatures: terms,
      disclaimer:
        "EMSCAD-trained uncalibrated screening signal. Not a fraud determination.",
    });
};

document.body.classList.add("forensic-layout");
