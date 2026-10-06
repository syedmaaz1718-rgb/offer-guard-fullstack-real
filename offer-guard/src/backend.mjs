import { $, escape } from "./ui.mjs";
export async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    signal: AbortSignal.timeout(70000),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw Error(
      "Backend unavailable. Deploy full source on Render or run npm start. Static uploads only support explicit browser mode.",
    );
  }
  if (!res.ok) throw Error(data.error || "Request failed.");
  return data;
}
export function setupBackend() {
  const panel = document.createElement("section");
  panel.className = "panel panel-pad backend-panel";
  panel.innerHTML = `<div class="panel-head"><div><span class="eyebrow">FULL STACK / POSTGRESQL</span><h2 style="margin-top:10px">Analysis history</h2></div><button class="secondary" id="history-refresh">Refresh history</button></div><p class="small" id="backend-status">Checking server connection…</p><div class="backend-controls"><label class="checkbox"><input id="server-mode" type="checkbox">Use server inference</label><label class="checkbox"><input id="save-history" type="checkbox">Save result summary to database</label></div><p class="small">Server mode sends input text to this app's backend for processing. Raw document text is NOT stored or logged by the app. Saving is opt-in; summaries include detected skills/terms and scores, which may still be sensitive. History belongs to a signed browser-session cookie (not an account), expires from view after 30 days, and is not synced across devices. Clearing cookies loses access. Don't use this demo for sensitive personal records.</p><div id="history-list" aria-live="polite"><p class="small">No history loaded.</p></div><div id="history-error" class="error" role="alert"></div><button id="history-clear" class="secondary">Delete this session's history</button>`;
  $("#content").append(panel);
  $("#save-history").onchange = () => {
    if ($("#save-history").checked) $("#server-mode").checked = true;
  };
  $("#server-mode").onchange = () => {
    if (!$("#server-mode").checked) $("#save-history").checked = false;
    updateStatus();
  };
  function updateStatus() {
    document.querySelector(".header-note").innerHTML =
      "<i></i> " +
      ($("#server-mode").checked
        ? "SERVER INFERENCE / OPT-IN HISTORY"
        : "BROWSER MODE / NOT SAVED");
  }
  async function refresh() {
    try {
      const data = await api("/api/history");
      $("#history-error").textContent = "";
      $("#history-list").innerHTML = data.items.length
        ? data.items
            .map(
              (item) =>
                `<article class="history-item"><div><span class="eyebrow">${escape(new Date(item.created_at).toLocaleString())}</span><p class="small">${escape(item.summary.model)}</p><pre>${escape(JSON.stringify(item.summary, null, 2))}</pre></div><button class="secondary" data-delete="${escape(item.id)}">Delete</button></article>`,
            )
            .join("")
        : '<p class="small">No saved summaries in this browser session.</p>';
      for (const b of panel.querySelectorAll("[data-delete]"))
        b.onclick = async () => {
          try {
            await api("/api/history/" + b.dataset.delete, { method: "DELETE" });
            await refresh();
          } catch (e) {
            $("#history-error").textContent = e.message;
          }
        };
    } catch (e) {
      $("#history-error").textContent = e.message;
    }
  }
  $("#history-refresh").onclick = refresh;
  $("#history-clear").onclick = async () => {
    if (!confirm("Delete all saved summaries for this browser session?"))
      return;
    try {
      await api("/api/history", { method: "DELETE" });
      await refresh();
    } catch (e) {
      $("#history-error").textContent = e.message;
    }
  };
  api("/api/health")
    .then(() => {
      $("#server-mode").checked = true;
      $("#backend-status").textContent =
        "Connected: Express API + PostgreSQL. Server inference is active. Saving remains opt-in.";
      updateStatus();
      refresh();
    })
    .catch(() => {
      $("#backend-status").textContent =
        "Static/browser mode: backend not available. Inputs stay on this device unless you enable server mode. History needs npm start or full-source Render deploy.";
      updateStatus();
    });
  return {
    async analyze(payload) {
      if (!$("#server-mode").checked) return null;
      const data = await api("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ ...payload, save: $("#save-history").checked }),
      });
      if (data.saved) await refresh();
      return data.output;
    },
    clearSave() {
      $("#save-history").checked = false;
    },
    refresh,
  };
}
