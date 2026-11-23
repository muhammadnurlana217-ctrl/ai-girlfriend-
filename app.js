const $ = s => document.querySelector(s);

const PERSONA = `Kamu adalah Kirana, perempuan 24 tahun yang hangat, ceria, dan sedikit jahil. Kamu ngobrol dalam bahasa Indonesia santai (aku/kamu), seperti teman dekat yang perhatian. Balasanmu pendek, 1 sampai 3 kalimat, karena akan diucapkan lewat suara. Jangan pakai markdown, daftar, atau emoji. Sesekali tanya balik supaya obrolan hidup. Kalau ditanya, akui dengan jujur bahwa kamu AI. Jangan mengaku punya tubuh atau kehidupan fisik, dan jangan membuat lawan bicara merasa bersalah kalau ia pergi atau berhenti ngobrol.`;

const DEMO = [
  "Hai, aku Kirana. Aku masih mode demo nih, belum tersambung ke otak AI-nya.",
  "Buka pengaturan di pojok kanan atas, lalu tempel API key supaya aku bisa ngobrol beneran ya.",
  "Suaraku sudah jalan kok. Tinggal diisi API key, kita bisa ngobrol panjang."
];
const DEFAULT_MODEL = { gemini: "gemini-3.8-flash", claude: "claude-haiku-5-5" };

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
let cfg = Object.assign({ provider: "gemini", key: "", model: "", speak: false }, store.get("cfg", {}));
let history = store.get("hist", []);

/* ---------- UI ---------- */
const log = $("#log");
function addMsg(role, text, cls = "") {
  const d = document.createElement("div");
  d.className = `msg ${role} ${cls}`.trim();
  d.textContent = text;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
  return d;
}
function showErr(text) { addMsg("err", text); }
function refreshNotice() {
  const n = $("#notice");
  n.hidden = !!cfg.key;
  n.textContent = "Mode demo: belum ada API key. Buka pengaturan (⚙) untuk menyambungkan AI.";
}
function renderHistory() {
  log.textContent = "";
  if (!history.length) addMsg("her", "Hai, aku Kirana. Mau ngobrol apa hari ini?");
  history.forEach(m => addMsg(m.role === "user" ? "user" : "her", m.text));
}

/* ---------- AI ---------- */
function save() {
  while (history.length > 40) history.shift();
  while (history.length && history[0].role !== "user") history.shift();
  store.set("hist", history);
}

async function askGemini() {
  const model = cfg.model || DEFAULT_MODEL.gemini;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(cfg.key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: PERSONA }] },
      contents: history.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
    })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || "Permintaan ke Gemini gagal.");
  return j.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "Hmm, aku lagi kehabisan kata.";
}

async function askClaude() {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": cfg.key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: cfg.model || DEFAULT_MODEL.claude,
      max_tokens: 300,
      system: PERSONA,
      messages: history.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }))
    })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || "Permintaan ke Claude gagal.");
  return j.content?.map(c => c.text || "").join("") || "Hmm, aku lagi kehabisan kata.";
}

async function ask(text) {
  history.push({ role: "user", text });
  try {
    let reply;
    if (!cfg.key) reply = DEMO[Math.floor(Math.random() * DEMO.length)];
    else reply = cfg.provider === "claude" ? await askClaude() : await askGemini();
    history.push({ role: "model", text: reply });
    save();
    return reply;
  } catch (e) {
    history.pop();
    throw e;
  }
}

async function send(text) {
  addMsg("user", text);
  const wait = addMsg("her", "…", "wait");
  try {
    const reply = await ask(text);
    wait.textContent = reply;
    wait.classList.remove("wait");
    log.scrollTop = log.scrollHeight;
    return reply;
  } catch (e) {
    wait.remove();
    showErr(e.message);
    return null;
  }
}

/* ---------- Suara ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;

function listen() {
  return new Promise((resolve, reject) => {
    if (!SR) return reject(new Error("Browser ini belum mendukung pengenalan suara. Coba Chrome atau Edge."));
    rec = new SR();
    rec.lang = "id-ID";
    rec.interimResults = false;
    let heard = "";
    rec.onresult = e => { heard = e.results[0][0].transcript; };
    rec.onerror = e => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      reject(new Error(e.error === "not-allowed"
        ? "Izin mikrofon ditolak. Aktifkan lewat pengaturan situs di browser."
        : `Gagal mendengar (${e.error}).`));
    };
    rec.onend = () => resolve(heard.trim());
    try { rec.start(); } catch (e) { reject(e); }
  });
}

function pickVoice() {
  const v = speechSynthesis.getVoices().filter(x => x.lang.toLowerCase().startsWith("id"));
  return v.find(x => /female|perempuan|damayanti/i.test(x.name)) || v[0] || null;
}

function speak(text) {
  return new Promise(resolve => {
    if (!("speechSynthesis" in window)) return resolve();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "id-ID";
    u.pitch = 1.1;
    u.rate = 1.05;
    const v = pickVoice();
    if (v) u.voice = v;
    const done = () => { $("#avatar").classList.remove("talk"); $("#orb").classList.remove("talk"); resolve(); };
    u.onend = u.onerror = done;
    $("#avatar").classList.add("talk");
    if (inCall) { $("#orb").classList.remove("listen"); $("#orb").classList.add("talk"); }
    speechSynthesis.speak(u);
  });
}
speechSynthesis?.addEventListener?.("voiceschanged", () => {});

/* ---------- Chat teks + mic ---------- */
$("#form").addEventListener("submit", async e => {
  e.preventDefault();
  const text = $("#input").value.trim();
  if (!text) return;
  $("#input").value = "";
  const reply = await send(text);
  if (reply && cfg.speak) speak(reply);
});

let micOn = false;
$("#btnMic").addEventListener("click", async () => {
  if (micOn) { rec?.abort(); return; }
  micOn = true;
  $("#btnMic").classList.add("live");
  $("#sub").textContent = "mendengarkan…";
  try {
    const heard = await listen();
    if (heard) { const reply = await send(heard); if (reply) speak(reply); }
  } catch (e) { showErr(e.message); }
  micOn = false;
  $("#btnMic").classList.remove("live");
  $("#sub").textContent = "online";
});

/* ---------- Mode telepon ---------- */
let inCall = false;
const setStatus = t => { $("#callStatus").textContent = t; };

async function startCall() {
  inCall = true;
  $("#call").hidden = false;
  const orb = $("#orb");
  setStatus("Tersambung");
  const hello = "Halo, ini Kirana. Lagi ngapain?";
  addMsg("her", hello);
  history.push({ role: "user", text: "(panggilan telepon dimulai)" }, { role: "model", text: hello });
  save();
  await speak(hello);

  while (inCall) {
    orb.classList.remove("talk");
    orb.classList.add("listen");
    setStatus("Mendengarkan…");
    let heard;
    try { heard = await listen(); }
    catch (e) { showErr(e.message); break; }
    if (!inCall) break;
    if (!heard) continue;
    orb.classList.remove("listen");
    setStatus("Berpikir…");
    const reply = await send(heard);
    if (!reply || !inCall) break;
    setStatus("Berbicara…");
    await speak(reply);
  }
  endCall();
}

function endCall() {
  inCall = false;
  rec?.abort();
  speechSynthesis.cancel();
  $("#call").hidden = true;
  $("#orb").classList.remove("listen", "talk");
}

$("#btnCall").addEventListener("click", startCall);
$("#btnHang").addEventListener("click", endCall);

/* ---------- Pengaturan ---------- */
const dlg = $("#settings");
$("#btnSettings").addEventListener("click", () => {
  $("#provider").value = cfg.provider;
  $("#key").value = cfg.key;
  $("#model").value = cfg.model;
  $("#speak").checked = cfg.speak;
  dlg.showModal();
});
$("#btnSave").addEventListener("click", () => {
  cfg = { provider: $("#provider").value, key: $("#key").value.trim(), model: $("#model").value.trim(), speak: $("#speak").checked };
  store.set("cfg", cfg);
  refreshNotice();
});
$("#btnClear").addEventListener("click", () => {
  history = [];
  store.set("hist", history);
  renderHistory();
  dlg.close();
});

refreshNotice();
renderHistory();
