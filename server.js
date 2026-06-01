const express = require("express");
const crypto  = require("crypto");
const fs      = require("fs");
const path    = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "wwaasseemm";
const DATA_FILE      = path.join(__dirname, "keys.json");

app.use(express.json());

/* ─── Keys Store ─────────────────────────────────────────────── */
const keys = new Map();

function loadKeys() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      for (const entry of data) keys.set(entry.key, entry);
    }
  } catch {}
}

function saveKeys() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify([...keys.values()], null, 2));
  } catch {}
}

function genKey() {
  const p = crypto.randomBytes(4).toString("hex").toUpperCase();
  return "I7RB-" + p.slice(0, 4) + "-" + p.slice(4);
}

function getLua() {
  try {
    return fs.readFileSync(path.join(__dirname, "script.lua"), "utf-8");
  } catch {
    return "-- script.lua not found";
  }
}

loadKeys();

/* ─── Auth helper ─────────────────────────────────────────────── */
function isAdmin(req, res) {
  const pwd = req.headers["x-admin-password"];
  if (pwd !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/* ─── Public Routes ───────────────────────────────────────────── */
app.get("/",        (req, res) => res.redirect("/get"));
app.get("/get",     (req, res) => res.type("html").send(getPage()));
app.get("/i7rb-ctrl-8z2q", (req, res) => res.type("html").send(adminPage()));

app.get("/api/script", (req, res) => res.json({ script: getLua() }));

app.get("/api/validate", (req, res) => {
  const k = String(req.query.key || "").trim();
  if (!k) return res.json({ valid: false, reason: "no_key" });
  const e = keys.get(k);
  if (!e)        return res.json({ valid: false, reason: "invalid" });
  if (!e.active) return res.json({ valid: false, reason: "inactive" });
  if (e.expiresAt && new Date(e.expiresAt) < new Date())
                 return res.json({ valid: false, reason: "expired" });
  return res.json({ valid: true });
});

app.post("/api/keys/generate", (req, res) => {
  const k  = genKey();
  const ex = new Date(Date.now() + 4 * 3600000).toISOString();
  const e  = { key: k, label: "auto", active: true, createdAt: new Date().toISOString(), expiresAt: ex };
  keys.set(k, e);
  saveKeys();
  res.json({ key: e.key, expiresAt: e.expiresAt });
});

/* ─── Login endpoint ──────────────────────────────────────────── */
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "كلمة المرور خاطئة" });
  }
  res.json({ ok: true });
});

/* ─── Admin Routes ────────────────────────────────────────────── */
app.get("/api/admin/keys", (req, res) => {
  if (!isAdmin(req, res)) return;
  res.json([...keys.values()]);
});

app.post("/api/admin/keys", (req, res) => {
  if (!isAdmin(req, res)) return;
  const k = req.body.key;
  if (!k) return res.status(400).json({ error: "key required" });
  const e = {
    key: k,
    label: req.body.label || "",
    active: true,
    createdAt: new Date().toISOString(),
    expiresAt: req.body.expiresAt || null
  };
  keys.set(k, e);
  saveKeys();
  res.json(e);
});

app.patch("/api/admin/keys/:key", (req, res) => {
  if (!isAdmin(req, res)) return;
  const e = keys.get(req.params.key);
  if (!e) return res.status(404).json({ error: "not found" });
  if (typeof req.body.active === "boolean") e.active = req.body.active;
  saveKeys();
  res.json(e);
});

app.delete("/api/admin/keys/:key", (req, res) => {
  if (!isAdmin(req, res)) return;
  if (!keys.has(req.params.key)) return res.status(404).json({ error: "not found" });
  keys.delete(req.params.key);
  saveKeys();
  res.json({ ok: true });
});

/* ─── صفحة المستخدم ───────────────────────────────────────────── */
function getPage() {
  const lua = getLua()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>i7rb - Key System</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',sans-serif;background:#080810;color:#e0e0e0;display:flex;flex-direction:column;align-items:center;padding:40px 16px;min-height:100vh}
  h1{font-size:52px;font-weight:900;color:#a78bfa;letter-spacing:-1px}
  .sub{color:#444;margin-bottom:30px;font-size:14px}
  .card{background:#10101a;border:1px solid #1e1e30;border-radius:18px;padding:28px;width:100%;max-width:440px;margin-bottom:18px}
  .card h2{color:#a78bfa;font-size:16px;margin-bottom:16px;font-weight:700}
  .btn{width:100%;padding:13px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;font-size:15px;font-weight:700;border:none;cursor:pointer;transition:.2s}
  .btn:hover{opacity:.88;transform:translateY(-1px)}
  .btn:disabled{opacity:.5;cursor:not-allowed}
  .key-box{background:#0a0a12;border:1px solid #2a1a4a;border-radius:10px;padding:16px;margin-top:14px;display:none;text-align:center}
  .key-text{font-family:monospace;font-size:20px;color:#c4b5fd;letter-spacing:3px;word-break:break-all}
  .exp{font-size:11px;color:#555;margin-top:6px}
  .copy-btn{margin-top:10px;padding:8px 20px;border-radius:8px;background:#2a1a4a;color:#a78bfa;border:1px solid #3a2a5a;cursor:pointer;font-size:13px;transition:.2s;width:auto}
  .copy-btn:hover{background:#3a2a6a}
  .lua{background:#06060c;padding:14px;border-radius:10px;font-family:monospace;font-size:11px;color:#86efac;max-height:180px;overflow-y:auto;white-space:pre;direction:ltr;text-align:left;margin-top:10px;border:1px solid #0d1a0d}
</style>
</head>
<body>
<h1>I7RB</h1>
<p class="sub">Key System v2</p>

<div class="card">
  <h2>احصل على كودك</h2>
  <button class="btn" id="genBtn" onclick="getKey()">احصل على الكود</button>
  <div class="key-box" id="keyBox">
    <div class="key-text" id="keyText"></div>
    <div class="exp" id="expText"></div>
    <button class="copy-btn" onclick="copyKey()">نسخ الكود</button>
  </div>
</div>

<div class="card">
  <h2>السكريبت</h2>
  <div class="lua">${lua}</div>
  <button class="btn" style="margin-top:12px" onclick="copyLua()">نسخ السكريبت</button>
</div>

<script>
async function getKey() {
  const btn = document.getElementById('genBtn');
  btn.disabled = true;
  btn.textContent = 'جاري...';
  try {
    const r = await fetch('/api/keys/generate', { method: 'POST' });
    const d = await r.json();
    if (r.ok) {
      document.getElementById('keyText').textContent = d.key;
      const exp = new Date(d.expiresAt).toLocaleString('ar-SA');
      document.getElementById('expText').textContent = 'ينتهي: ' + exp;
      document.getElementById('keyBox').style.display = 'block';
      btn.textContent = 'احصل على كود آخر';
    } else {
      btn.textContent = 'حدث خطأ، حاول مجدداً';
    }
  } catch {
    btn.textContent = 'حدث خطأ، حاول مجدداً';
  }
  btn.disabled = false;
}
function copyKey() { navigator.clipboard.writeText(document.getElementById('keyText').textContent); }
function copyLua() { navigator.clipboard.writeText(document.querySelector('.lua').textContent); }
</script>
</body>
</html>`;
}

/* ─── لوحة الأدمن ─────────────────────────────────────────────── */
function adminPage() {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>I7RB - لوحة التحكم</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',sans-serif;background:#0a0a0f;color:#e0e0e0;min-height:100vh}
  #loginScreen{display:flex;align-items:center;justify-content:center;min-height:100vh}
  .loginBox{background:#13131e;border:1px solid #2a2a40;border-radius:16px;padding:40px 36px;width:300px;text-align:center}
  .loginBox h1{color:#a78bfa;font-size:32px;font-weight:900;margin-bottom:4px}
  .loginBox p{color:#555;font-size:13px;margin-bottom:22px}
  .loginBox input{width:100%;padding:11px 14px;border-radius:9px;border:1px solid #2a2a40;background:#0d0d18;color:#fff;font-size:15px;margin-bottom:10px;text-align:center;outline:none;transition:.2s}
  .loginBox input:focus{border-color:#7c3aed}
  .loginBox button{width:100%;padding:11px;border-radius:9px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;cursor:pointer;font-size:15px;font-weight:700;transition:.2s}
  .loginBox button:hover{opacity:.88}
  .loginBox button:disabled{opacity:.5;cursor:not-allowed}
  #loginError{color:#f87171;font-size:12px;margin-top:10px;display:none}
  #mainScreen{display:none;padding:24px;max-width:800px;margin:0 auto}
  header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
  header h1{color:#a78bfa;font-size:20px;font-weight:900}
  #logoutBtn{background:#1e1e2e;border:1px solid #2a2a40;color:#888;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:13px;transition:.2s}
  #logoutBtn:hover{color:#fff;border-color:#444}
  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:22px}
  .stat{background:#13131e;border:1px solid #2a2a40;border-radius:12px;padding:16px;text-align:center}
  .stat-num{font-size:28px;font-weight:900;color:#a78bfa}
  .stat-lbl{font-size:11px;color:#555;margin-top:2px}
  .card{background:#13131e;border:1px solid #2a2a40;border-radius:14px;padding:20px;margin-bottom:16px}
  .card h2{color:#a78bfa;font-size:14px;font-weight:700;margin-bottom:14px}
  .row{display:flex;gap:8px;flex-wrap:wrap}
  .row input{padding:9px 12px;border-radius:8px;border:1px solid #2a2a40;background:#0d0d18;color:#fff;font-size:13px;flex:1;min-width:100px;outline:none}
  .row input:focus{border-color:#7c3aed}
  .btn{padding:9px 16px;border-radius:8px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;transition:.2s}
  .btn:hover{opacity:.88}
  .btn-gen{background:linear-gradient(135deg,#059669,#047857)}
  .btn-del{background:#7f1d1d;padding:5px 10px;font-size:12px}
  .btn-tog{background:#1e1e2e;border:1px solid #2a2a40;color:#aaa;padding:5px 10px;font-size:12px}
  #keysList{display:flex;flex-direction:column;gap:8px;margin-top:10px;max-height:420px;overflow-y:auto}
  .key-row{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#0d0d18;border-radius:9px;border:1px solid #1a1a2e;gap:8px;flex-wrap:wrap}
  .key-info{flex:1;min-width:0}
  .key-code{font-family:monospace;font-size:14px;color:#c4b5fd;letter-spacing:1px}
  .key-meta{font-size:11px;color:#444;margin-top:3px}
  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;margin-right:4px}
  .badge-on{background:#064e3b;color:#34d399}
  .badge-off{background:#450a0a;color:#f87171}
  .key-actions{display:flex;gap:6px}
  .empty{text-align:center;color:#333;padding:30px;font-size:14px}
  .loader{text-align:center;color:#555;padding:20px;font-size:13px}
</style>
</head>
<body>

<div id="loginScreen">
  <div class="loginBox">
    <h1>I7RB</h1>
    <p>لوحة التحكم</p>
    <input type="password" id="pwdInput" placeholder="كلمة المرور"
           onkeydown="if(event.key==='Enter')doLogin()">
    <button id="loginBtn" onclick="doLogin()">دخول</button>
    <div id="loginError">كلمة المرور خاطئة</div>
  </div>
</div>

<div id="mainScreen">
  <header>
    <h1>I7RB — لوحة التحكم</h1>
    <button id="logoutBtn" onclick="logout()">تسجيل الخروج</button>
  </header>
  <div class="stats">
    <div class="stat"><div class="stat-num" id="statTotal">—</div><div class="stat-lbl">إجمالي الكودات</div></div>
    <div class="stat"><div class="stat-num" id="statActive">—</div><div class="stat-lbl">فعّالة</div></div>
    <div class="stat"><div class="stat-num" id="statExpired">—</div><div class="stat-lbl">منتهية</div></div>
  </div>
  <div class="card">
    <h2>إنشاء كود جديد</h2>
    <div class="row">
      <input type="text" id="newKey"   placeholder="الكود (فارغ = تلقائي)">
      <input type="text" id="newLabel" placeholder="الاسم / التسمية">
      <input type="datetime-local" id="newExpiry">
      <button class="btn btn-gen" onclick="createKey()">إنشاء</button>
    </div>
  </div>
  <div class="card">
    <h2>كل الكودات</h2>
    <div class="row" style="margin-bottom:12px">
      <input type="text" id="searchInput" placeholder="بحث..." oninput="renderKeys()">
    </div>
    <div id="keysList"><div class="loader">جاري التحميل...</div></div>
  </div>
</div>

<script>
let pwd = '';
let allKeys = [];

async function doLogin() {
  const input = document.getElementById('pwdInput');
  const err   = document.getElementById('loginError');
  const btn   = document.getElementById('loginBtn');
  const p     = input.value.trim();
  if (!p) return;
  btn.disabled = true;
  btn.textContent = 'جاري...';
  err.style.display = 'none';
  try {
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: p })
    });
    if (r.ok) {
      pwd = p;
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('mainScreen').style.display  = 'block';
      loadKeys();
    } else {
      err.style.display = 'block';
      input.value = '';
      input.focus();
    }
  } catch {
    err.textContent = 'خطأ في الاتصال بالسيرفر';
    err.style.display = 'block';
  }
  btn.disabled = false;
  btn.textContent = 'دخول';
}

function logout() {
  pwd = ''; allKeys = [];
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('mainScreen').style.display  = 'none';
  document.getElementById('pwdInput').value = '';
}

async function loadKeys() {
  try {
    const r = await fetch('/api/admin/keys', { headers: { 'x-admin-password': pwd } });
    if (!r.ok) { logout(); return; }
    allKeys = await r.json();
    updateStats();
    renderKeys();
  } catch {
    document.getElementById('keysList').innerHTML = '<div class="empty">فشل تحميل الكودات</div>';
  }
}

function updateStats() {
  const now = new Date();
  document.getElementById('statTotal').textContent   = allKeys.length;
  document.getElementById('statActive').textContent  = allKeys.filter(e => e.active && (!e.expiresAt || new Date(e.expiresAt) > now)).length;
  document.getElementById('statExpired').textContent = allKeys.filter(e => e.expiresAt && new Date(e.expiresAt) <= now).length;
}

function renderKeys() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const list = document.getElementById('keysList');
  const filtered = allKeys.filter(e => e.key.toLowerCase().includes(q) || (e.label||'').toLowerCase().includes(q));
  if (!filtered.length) { list.innerHTML = '<div class="empty">لا توجد كودات</div>'; return; }
  list.innerHTML = filtered.map(e => {
    const expired = e.expiresAt && new Date(e.expiresAt) <= new Date();
    const badge   = e.active && !expired
      ? '<span class="badge badge-on">فعّال</span>'
      : '<span class="badge badge-off">' + (expired ? 'منتهي' : 'معطّل') + '</span>';
    const exp = e.expiresAt ? 'ينتهي: ' + new Date(e.expiresAt).toLocaleString('ar-SA') : 'بدون انتهاء';
    return '<div class="key-row"><div class="key-info"><div class="key-code">'+e.key+'</div><div class="key-meta">'+badge+(e.label?e.label+' · ':'')+exp+'</div></div><div class="key-actions"><button class="btn btn-tog" onclick="toggleKey(\''+e.key+'\','+(!e.active)+')">'+(e.active?'تعطيل':'تفعيل')+'</button><button class="btn btn-del" onclick="deleteKey(\''+e.key+'\')">حذف</button></div></div>';
  }).join('');
}

async function createKey() {
  const keyVal = document.getElementById('newKey').value.trim();
  const label  = document.getElementById('newLabel').value.trim();
  const expiry = document.getElementById('newExpiry').value;
  if (!keyVal) {
    const r = await fetch('/api/keys/generate', { method: 'POST' });
    await r.json();
  } else {
    await fetch('/api/admin/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd },
      body: JSON.stringify({ key: keyVal, label: label||undefined, expiresAt: expiry ? new Date(expiry).toISOString() : undefined })
    });
  }
  document.getElementById('newKey').value = '';
  document.getElementById('newLabel').value = '';
  document.getElementById('newExpiry').value = '';
  await loadKeys();
}

async function toggleKey(key, active) {
  await fetch('/api/admin/keys/' + encodeURIComponent(key), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd },
    body: JSON.stringify({ active })
  });
  await loadKeys();
}

async function deleteKey(key) {
  if (!confirm('تأكيد حذف الكود: ' + key + '؟')) return;
  await fetch('/api/admin/keys/' + encodeURIComponent(key), {
    method: 'DELETE',
    headers: { 'x-admin-password': pwd }
  });
  await loadKeys();
}
</script>
</body>
</html>`;
}

/* ─── Start ───────────────────────────────────────────────────── */
app.listen(PORT, () => console.log("I7RB running on port " + PORT));
