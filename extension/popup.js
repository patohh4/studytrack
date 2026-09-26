// ─── StudyTrack Extension — Popup ────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const statusBadge  = $("statusBadge");
const statusText   = $("statusText");
const statusTime   = $("statusTime");
const tokenInput   = $("tokenInput");
const btnSaveToken = $("btnSaveToken");
const btnSync      = $("btnSync");
const btnOpenMoodle = $("btnOpenMoodle");
const btnDisconnect = $("btnDisconnect");
const errorMsg     = $("errorMsg");

// ── Стан UI ──────────────────────────────────────────────────────────────────

const STATUS_MAP = {
  idle:       { label: "Не підключено",    cls: "idle" },
  capturing:  { label: "Захоплення...",    cls: "capturing" },
  connected:  { label: "Підключено ✓",     cls: "connected" },
  error:      { label: "Помилка",          cls: "error" },
};

function renderStatus(status, syncedAt, errMsg) {
  const { label, cls } = STATUS_MAP[status] ?? STATUS_MAP.idle;

  // Badge
  statusBadge.className = `status-badge ${cls}`;
  statusText.textContent = label;

  // Час останньої синхронізації
  if (syncedAt && status === "connected") {
    const d = new Date(syncedAt);
    statusTime.textContent = `Синхронізовано: ${d.toLocaleString("uk-UA")}`;
  } else {
    statusTime.textContent = "";
  }

  // Помилка
  if (status === "error" && errMsg) {
    errorMsg.textContent = errMsg;
    errorMsg.classList.add("visible");
  } else {
    errorMsg.classList.remove("visible");
  }

  // Кнопка синхронізації активна тільки якщо є токен
  chrome.storage.local.get("accessToken", ({ accessToken }) => {
    btnSync.disabled = !accessToken || status === "capturing";
  });
}

// ── Ініціалізація ─────────────────────────────────────────────────────────────

async function init() {
  const data = await chrome.storage.local.get([
    "status", "syncedAt", "errorMsg", "accessToken",
  ]);

  renderStatus(data.status ?? "idle", data.syncedAt, data.errorMsg);

  // Якщо токен вже збережений — показуємо маску замість пустого поля
  if (data.accessToken) {
    tokenInput.placeholder = "••••••• (збережено)";
  }
}

// Оновлюємо UI кожну секунду поки popup відкритий (для статусу "capturing")
let pollInterval = setInterval(async () => {
  const data = await chrome.storage.local.get(["status", "syncedAt", "errorMsg"]);
  renderStatus(data.status ?? "idle", data.syncedAt, data.errorMsg);
}, 1000);

window.addEventListener("unload", () => clearInterval(pollInterval));

// ── Обробники кнопок ──────────────────────────────────────────────────────────

// Зберегти Supabase access token
btnSaveToken.addEventListener("click", async () => {
  const token = tokenInput.value.trim();
  if (!token) return;

  btnSaveToken.disabled = true;
  btnSaveToken.textContent = "...";

  chrome.runtime.sendMessage({ type: "SAVE_TOKEN", token }, (res) => {
    btnSaveToken.disabled = false;
    btnSaveToken.textContent = "Зберегти";
    tokenInput.value = "";
    tokenInput.placeholder = "••••••• (збережено)";
    btnSync.disabled = false;

    if (res?.ok) {
      renderStatus("idle", null, null);
    }
  });
});

// Ручна синхронізація
btnSync.addEventListener("click", () => {
  btnSync.disabled = true;
  renderStatus("capturing", null, null);

  chrome.runtime.sendMessage({ type: "MANUAL_SYNC" }, async (res) => {
    // Невелика затримка щоб background встиг оновити storage
    await new Promise(r => setTimeout(r, 800));
    const data = await chrome.storage.local.get(["status", "syncedAt", "errorMsg"]);
    renderStatus(data.status ?? "idle", data.syncedAt, data.errorMsg);
    btnSync.disabled = false;
  });
});

// Відкрити Moodle у новій вкладці
btnOpenMoodle.addEventListener("click", () => {
  chrome.tabs.create({ url: "https://moodle.uzhnu.edu.ua" });
  window.close();
});

// Відключитись (очистити дані)
btnDisconnect.addEventListener("click", async () => {
  if (!confirm("Відключити Moodle від StudyTrack?")) return;
  chrome.runtime.sendMessage({ type: "CLEAR" }, () => {
    tokenInput.placeholder = "eyJhbGciOiJIUzI1NiIsInR5cCI6...";
    renderStatus("idle", null, null);
  });
});

// ── Старт ─────────────────────────────────────────────────────────────────────
init();
