const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "wwaasseemm";
const DATA_FILE = path.join(__dirname, "keys.json");

app.use(express.json());

let keys = new Map();
function loadKeys() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      for (const e of data) keys.set(e.key, e);
    }
  } catch {}
}
function saveKeys() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify([...keys.values()], null, 2)); } catch {}
}
function genKey() {
  const p = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `I7RB-${p.slice(0,4)}-${p.slice(4)}`;
}
loadKeys();

function isAdmin(req, res) {
  if (req.headers["x-admin-password"] !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" }); return false;
  }
  return true;
}

app.get("/api/validate", (req, res) => {
  const key = String(req.query.key || "").trim();
  if (!key) return res.json({ valid: false, reason: "no_key" });
  const e = keys.get(key);
  if (!e) return res.json({ valid: false, reason: "invalid" });
  if (!e.active) return res.json({ valid: false, reason: "inactive" });
  if (e.expiresAt && new Date(e.expiresAt) < new Date()) return res.json({ valid: false, reason: "expired" });
  res.json({ valid: true });
});

app.post("/api/keys/generate", (req, res) => {
  const key = genKey();
  const expiresAt = new Date(Date.now() + 4 * 3600000).toISOString();
  const e = { key, label: "auto", active: true, createdAt: new Date().toISOString(), expiresAt };
  keys.set(key, e); saveKeys(); res.json(e);
});

app.get("/api/admin/keys", (req, res) => {
  if (!isAdmin(req, res)) return;
  res.json([...keys.values()]);
});

app.post("/api/admin/keys", (req, res) => {
  if (!isAdmin(req, res)) return;
  const { key, label, expiresAt } = req.body;
  if (!key) return res.status(400).json({ error: "key required" });
  const e = { key, label: label||"", active: true, createdAt: new Date().toISOString(), expiresAt: expiresAt||null };
  keys.set(key, e); saveKeys(); res.json(e);
});

app.patch("/api/admin/keys/:key", (req, res) => {
  if (!isAdmin(req, res)) return;
  const e = keys.get(req.params.key);
  if (!e) return res.status(404).json({ error: "not found" });
  Object.assign(e, req.body); saveKeys(); res.json(e);
});

app.delete("/api/admin/keys/:key", (req, res) => {
  if (!isAdmin(req, res)) return;
  if (!keys.delete(req.params.key)) return res.status(404).json({ error: "not found" });
  saveKeys(); res.json({ ok: true });
});

// صفحة الأكواد
app.get(["/", "/get"], (req, res) => {
  res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>I7RB — Get Key</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .box{background:#111;border:1px solid #0d0;border-radius:12px;padding:40px;max-width:500px;width:90%;text-align:center}
  h1{color:#0f0;font-size:2em;margin-bottom:10px}p{color:#aaa;margin-bottom:20px}
  .step{background:#1a1a1a;border-radius:8px;padding:15px;margin:10px 0;text-align:right}
  .step b{color:#0f0}</style></head>
  <body><div class="box">
  <h1>⚡ I7RB</h1>
  <p>اتبع الخطوات للحصول على كودك</p>
  <div class="step"><b>الخطوة 1:</b> اشترك في القناة</div>
  <div class="step"><b>الخطوة 2:</b> تواصل مع الإدارة</div>
  <div class="step"><b>الخطوة 3:</b> استخدم الكود في السكربت</div>
  </div></body></html>`);
});

// لوحة التحكم
app.get("/i7rb-ctrl-8z2q", (req, res) => {
  res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>I7RB — Admin</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0a;color:#fff;font-family:sans-serif;padding:20px}
  h1{color:#0f0;margin-bottom:20px}input,select{background:#1a1a1a;border:1px solid #333;color:#fff;padding:8px;border-radius:6px;margin:5px}
  button{background:#0a0;color:#000
