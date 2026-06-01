const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

// ===== DB =====
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS keys (
      id SERIAL PRIMARY KEY,
      key_value TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP,
      hwid TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      note TEXT
    )
  `);
  console.log("✅ DB ready");
}

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== HELPERS =====
function generateKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `I7RB-${seg()}-${seg()}-${seg()}`;
}

function requireAdmin(req, res) {
  const token = req.query.admin || req.headers["x-admin-secret"] || "";
  if (!ADMIN_SECRET || token !== ADMIN_SECRET) {
    res.status(403).json({ error: "غير مصرح" });
    return false;
  }
  return true;
}

// ===== GET PAGE =====
app.get("/get", async (req, res) => {
  try {
    const keyValue = generateKey();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query("INSERT INTO keys (key_value, expires_at) VALUES ($1, $2)", [keyValue, expiresAt]);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>⚡ I7RB — احصل على كودك</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--green:#00e676;--green-dim:#00c853;--bg:#0a0a0a;--card:#111;--border:#1e1e1e;--text:#f0f0f0;--sub:#666}
    body{background:var(--bg);font-family:'Cairo',sans-serif;color:var(--text);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;background-image:radial-gradient(ellipse at 20% 20%,rgba(0,230,118,.06) 0%,transparent 50%)}
    .logo{font-size:2.2rem;font-weight:900;color:var(--green);letter-spacing:2px;margin-bottom:6px;text-shadow:0 0 30px rgba(0,230,118,.4)}
    .subtitle{color:var(--sub);font-size:.9rem;margin-bottom:36px}
    .card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:36px;width:100%;max-width:480px;box-shadow:0 0 40px rgba(0,0,0,.6)}
    .card-title{font-size:1rem;color:var(--sub);margin-bottom:14px;font-weight:600}
    .key-box{background:#0d0d0d;border:1px solid rgba(0,230,118,.25);border-radius:10px;padding:16px 20px;font-family:monospace;font-size:1.3rem;font-weight:700;color:var(--green);letter-spacing:3px;text-align:center;margin-bottom:14px;cursor:pointer;transition:all .2s;user-select:all}
    .key-box:hover{border-color:rgba(0,230,118,.5);box-shadow:0 0 16px rgba(0,230,118,.12)}
    .copy-btn{width:100%;padding:14px;background:linear-gradient(135deg,var(--green),var(--green-dim));border:none;border-radius:10px;color:#000;font-family:'Cairo',sans-serif;font-size:1rem;font-weight:700;cursor:pointer;transition:all .2s;margin-bottom:14px}
    .copy-btn:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,230,118,.35)}
    .expires{text-align:center;color:var(--sub);font-size:.82rem;margin-bottom:6px}
    .expires span{color:#ff7043}
    .divider{border:none;border-top:1px solid var(--border);margin:22px 0}
    .steps{display:flex;flex-direction:column;gap:10px}
    .step{display:flex;align-items:flex-start;gap:12px;font-size:.88rem;color:#aaa;line-height:1.5}
    .step-num{background:rgba(0,230,118,.1);color:var(--green);border:1px solid rgba(0,230,118,.2);border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.75rem;flex-shrink:0;margin-top:1px}
    .toast{position:fixed;bottom:24px;right:50%;transform:translateX(50%);background:var(--green);color:#000;padding:10px 24px;border-radius:8px;font-weight:700;font-size:.9rem;opacity:0;transition:opacity .3s;pointer-events:none}
    .toast.show{opacity:1}
  </style>
</head>
<body>
  <div class="logo">⚡ I7RB</div>
  <div class="subtitle">سكربت الـ ESP & Aimlock الأقوى</div>
  <div class="card">
    <div class="card-title">🔑 الكود الخاص بك</div>
    <div class="key-box" onclick="copyKey()">${keyValue}</div>
    <button class="copy-btn" id="copyBtn" onclick="copyKey()">📋 نسخ الكود</button>
    <div class="expires">ينتهي في: <span>${expiresAt.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>
    <hr class="divider"/>
    <div class="steps">
      <div class="step"><div class="step-num">1</div><div>انسخ الكود أعلاه بالضغط على زر النسخ</div></div>
      <div class="step"><div class="step-num">2</div><div>افتح إكسبلويتك وشغّل السكربت I7RB</div></div>
      <div class="step"><div class="step-num">3</div><div>الصق الكود في المربع واضغط "تشغيل ✓"</div></div>
    </div>
  </div>
  <div class="toast" id="toast">✅ تم النسخ!</div>
  <script>
    function copyKey() {
      navigator.clipboard.writeText("${keyValue}").then(() => {
        document.getElementById("copyBtn").textContent = "✅ تم النسخ!";
        const t = document.getElementById("toast");
        t.classList.add("show");
        setTimeout(() => { document.getElementById("copyBtn").textContent = "📋 نسخ الكود"; t.classList.remove("show"); }, 2500);
      });
    }
  </script>
</body>
</html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send("<h1>حدث خطأ — حاول مجددًا</h1>");
  }
});

// ===== VALIDATE =====
app.get("/api/validate", async (req, res) => {
  const key = (req.query.key || "").trim();
  if (!key) return res.json({ valid: false, reason: "no_key" });

  try {
    const { rows } = await pool.query("SELECT * FROM keys WHERE key_value=$1 LIMIT 1", [key]);
    if (!rows.length) return res.json({ valid: false, reason: "invalid" });

    const row = rows[0];
    if (!row.is_active) return res.json({ valid: false, reason: "banned" });
    if (row.expires_at && new Date(row.expires_at) < new Date()) return res.json({ valid: false, reason: "expired" });

    if (row.hwid && req.query.hwid && row.hwid !== req.query.hwid)
      return res.json({ valid: false, reason: "hwid_mismatch" });

    if (!row.hwid && req.query.hwid)
      await pool.query("UPDATE keys SET hwid=$1 WHERE id=$2", [req.query.hwid, row.id]);

    res.json({ valid: true, key: row.key_value, expires: row.expires_at || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ valid: false, reason: "server_error" });
  }
});

// ===== GENERATE =====
app.post("/api/generate", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { expires_hours = 24, note = "" } = req.body;
  const keyValue = generateKey();
  const expiresAt = expires_hours > 0 ? new Date(Date.now() + expires_hours * 3600000) : null;
  try {
    const { rows } = await pool.query(
      "INSERT INTO keys (key_value, expires_at, note) VALUES ($1,$2,$3) RETURNING *",
      [keyValue, expiresAt, note || null]
    );
    res.json({ success: true, key: rows[0].key_value, expires: rows[0].expires_at });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "فشل إنشاء المفتاح" });
  }
});

// ===== GENERATE BULK =====
app.post("/api/generate-bulk", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { count = 1, expires_hours = 24, note = "" } = req.body;
  const safeCount = Math.min(Math.max(1, Number(count)), 100);
  const expiresAt = expires_hours > 0 ? new Date(Date.now() + expires_hours * 3600000) : null;
  try {
    const keys = [];
    for (let i = 0; i < safeCount; i++) {
      const kv = generateKey();
      await pool.query("INSERT INTO keys (key_value, expires_at, note) VALUES ($1,$2,$3)", [kv, expiresAt, note || null]);
      keys.push(kv);
    }
    res.json({ success: true, keys, count: keys.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "فشل إنشاء المفاتيح" });
  }
});

// ===== LIST KEYS =====
app.get("/api/keys", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { rows } = await pool.query("SELECT * FROM keys ORDER BY id DESC");
    res.json({ success: true, keys: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "فشل جلب المفاتيح" });
  }
});

// ===== REVOKE =====
app.post("/api/revoke", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { key } = req.body;
  if (!key) return res.status(400).json({ success: false, error: "المفتاح مطلوب" });
  try {
    const { rows } = await pool.query("UPDATE keys SET is_active=FALSE WHERE key_value=$1 RETURNING *", [key]);
    if (!rows.length) return res.status(404).json({ success: false, error: "المفتاح غير موجود" });
    res.json({ success: true, message: "تم إلغاء المفتاح" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "فشل إلغاء المفتاح" });
  }
});

// ===== DELETE =====
app.delete("/api/delete", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { key } = req.body;
  if (!key) return res.status(400).json({ success: false, error: "المفتاح مطلوب" });
  try {
    const { rows } = await pool.query("DELETE FROM keys WHERE key_value=$1 RETURNING *", [key]);
    if (!rows.length) return res.status(404).json({ success: false, error: "المفتاح غير موجود" });
    res.json({ success: true, message: "تم حذف المفتاح" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "فشل حذف المفتاح" });
  }
});

// ===== ADMIN DASHBOARD =====
app.get("/admin", (req, res) => {
  const token = req.query.admin || req.headers["x-admin-secret"] || "";
  if (!ADMIN_SECRET || token !== ADMIN_SECRET) {
    return res.status(403).send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/><title>غير مصرح</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700&display=swap" rel="stylesheet"/>
    <style>body{background:#0a0a0a;color:#ff4444;font-family:'Cairo',sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-size:1.5rem;}</style>
    </head><body>⛔ غير مصرح</body></html>`);
  }
  const secret = token;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>⚡ I7RB — لوحة التحكم</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--green:#00e676;--green-dim:#00c853;--red:#ff5252;--orange:#ff9800;--blue:#40c4ff;--bg:#080808;--surface:#0f0f0f;--card:#141414;--border:#1e1e1e;--border2:#252525;--text:#f0f0f0;--sub:#777;--sub2:#555}
    html,body{height:100%;overflow:hidden}
    body{background:var(--bg);font-family:'Cairo',sans-serif;color:var(--text);display:flex;flex-direction:column}
    .topbar{display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:var(--surface);border-bottom:1px solid var(--border);flex-shrink:0}
    .topbar-logo{font-size:1.3rem;font-weight:900;color:var(--green);letter-spacing:2px;text-shadow:0 0 20px rgba(0,230,118,.4)}
    .topbar-tag{font-size:.75rem;color:var(--sub);background:#111;border:1px solid var(--border2);padding:3px 10px;border-radius:20px}
    .topbar-status{display:flex;align-items:center;gap:7px;font-size:.8rem;color:var(--green)}
    .dot{width:7px;height:7px;background:var(--green);border-radius:50%;box-shadow:0 0 8px var(--green)}
    .layout{display:flex;flex:1;overflow:hidden}
    .sidebar{width:200px;flex-shrink:0;background:var(--surface);border-left:1px solid var(--border);display:flex;flex-direction:column;padding:16px 0}
    .sidebar-item{display:flex;align-items:center;gap:10px;padding:10px 20px;cursor:pointer;font-size:.88rem;color:var(--sub);transition:.15s;border-right:3px solid transparent}
    .sidebar-item:hover{color:var(--text);background:rgba(255,255,255,.03)}
    .sidebar-item.active{color:var(--green);border-right-color:var(--green);background:rgba(0,230,118,.05)}
    .sidebar-icon{font-size:1rem;width:18px;text-align:center}
    .main{flex:1;overflow-y:auto;padding:24px}
    .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
    .stat-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px 20px;position:relative;overflow:hidden}
    .stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:12px 12px 0 0}
    .stat-card.green::before{background:var(--green)}.stat-card.red::before{background:var(--red)}.stat-card.orange::before{background:var(--orange)}.stat-card.blue::before{background:var(--blue)}
    .stat-label{font-size:.75rem;color:var(--sub);margin-bottom:6px}
    .stat-val{font-size:2rem;font-weight:900;line-height:1}
    .stat-card.green .stat-val{color:var(--green)}.stat-card.red .stat-val{color:var(--red)}.stat-card.orange .stat-val{color:var(--orange)}.stat-card.blue .stat-val{color:var(--blue)}
    .stat-sub{font-size:.72rem;color:var(--sub2);margin-top:4px}
    .section{display:none}.section.visible{display:block}
    .section-title{font-size:1rem;font-weight:700;margin-bottom:16px;color:var(--text)}
    .form-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
    .form-group{display:flex;flex-direction:column;gap:6px}
    label{font-size:.78rem;color:var(--sub)}
    input,select{background:#0d0d0d;border:1px solid var(--border2);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'Cairo',sans-serif;font-size:.88rem;outline:none;transition:.15s}
    input:focus,select:focus{border-color:rgba(0,230,118,.4)}
    select option{background:#0d0d0d}
    .btn{padding:9px 20px;border:none;border-radius:8px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:.88rem;font-weight:700;transition:.15s}
    .btn-green{background:linear-gradient(135deg,var(--green),var(--green-dim));color:#000}
    .btn-green:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,230,118,.3)}
    .btn-red{background:rgba(255,82,82,.12);color:var(--red);border:1px solid rgba(255,82,82,.2)}.btn-red:hover{background:rgba(255,82,82,.2)}
    .btn-orange{background:rgba(255,152,0,.12);color:var(--orange);border:1px solid rgba(255,152,0,.2)}.btn-orange:hover{background:rgba(255,152,0,.2)}
    .btn-sm{padding:5px 12px;font-size:.78rem}
    .btn:disabled{opacity:.4;cursor:not-allowed;transform:none!important}
    .table-wrap{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden}
    .table-toolbar{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border)}
    .search-box{background:#0d0d0d;border:1px solid var(--border2);border-radius:8px;padding:7px 12px;color:var(--text);font-family:'Cairo',sans-serif;font-size:.85rem;outline:none;width:220px}
    .search-box:focus{border-color:rgba(0,230,118,.4)}
    table{width:100%;border-collapse:collapse;font-size:.83rem}
    thead{background:#111}
    th{padding:10px 14px;text-align:right;font-weight:600;color:var(--sub);border-bottom:1px solid var(--border)}
    td{padding:9px 14px;border-bottom:1px solid #181818;vertical-align:middle}
    tr:last-child td{border:none}
    tr:hover td{background:rgba(255,255,255,.015)}
    .key-val{font-family:monospace;color:var(--green);font-size:.88rem;letter-spacing:.5px}
    .badge{display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:20px;font-size:.72rem;font-weight:700}
    .badge-active{background:rgba(0,230,118,.1);color:var(--green);border:1px solid rgba(0,230,118,.2)}
    .badge-banned{background:rgba(255,82,82,.1);color:var(--red);border:1px solid rgba(255,82,82,.2)}
    .badge-expired{background:rgba(255,152,0,.1);color:var(--orange);border:1px solid rgba(255,152,0,.2)}
    .action-btns{display:flex;gap:6px}
    .empty-state{text-align:center;padding:40px;color:var(--sub);font-size:.9rem}
    .toast-wrap{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none}
    .toast{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:10px 20px;font-size:.85rem;opacity:0;transform:translateY(10px);transition:all .3s;display:flex;align-items:center;gap:8px}
    .toast.show{opacity:1;transform:translateY(0)}
    .toast.success{border-color:rgba(0,230,118,.3);color:var(--green)}.toast.error{border-color:rgba(255,82,82,.3);color:var(--red)}
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:100;display:none;align-items:center;justify-content:center}
    .modal-overlay.open{display:flex}
    .modal{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:24px;width:420px;max-width:90vw}
    .modal-title{font-weight:700;margin-bottom:14px;font-size:1rem}
    .modal-btns{display:flex;gap:10px;justify-content:flex-end;margin-top:18px}
    .modal-key{font-family:monospace;font-size:1.1rem;color:var(--green);background:#0d0d0d;padding:10px;border-radius:6px;text-align:center;margin:10px 0;letter-spacing:2px}
    .result-keys{background:#0d0d0d;border:1px solid var(--border2);border-radius:8px;padding:12px;max-height:200px;overflow-y:auto;font-family:monospace;font-size:.85rem;color:var(--green);line-height:2}
    ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0d0d0d}::-webkit-scrollbar-thumb{background:#222;border-radius:4px}
  </style>
</head>
<body>
<div class="topbar">
  <div style="display:flex;align-items:center;gap:14px">
    <div class="topbar-logo">⚡ I7RB</div>
    <div class="topbar-tag">لوحة التحكم</div>
  </div>
  <div class="topbar-status"><div class="dot"></div> السيرفر شغّال</div>
</div>
<div class="layout">
  <div class="sidebar">
    <div class="sidebar-item active" onclick="showSection('dashboard',this)"><span class="sidebar-icon">📊</span> لوحة الرئيسية</div>
    <div class="sidebar-item" onclick="showSection('generate',this)"><span class="sidebar-icon">✨</span> توليد مفتاح</div>
    <div class="sidebar-item" onclick="showSection('bulk',this)"><span class="sidebar-icon">📦</span> توليد بالجملة</div>
    <div class="sidebar-item" onclick="showSection('keys',this)"><span class="sidebar-icon">🔑</span> إدارة المفاتيح</div>
  </div>
  <div class="main">
    <div class="section visible" id="section-dashboard">
      <div class="stats-grid">
        <div class="stat-card green"><div class="stat-label">المفاتيح النشطة</div><div class="stat-val" id="stat-active">—</div><div class="stat-sub">صالحة وغير منتهية</div></div>
        <div class="stat-card blue"><div class="stat-label">إجمالي المفاتيح</div><div class="stat-val" id="stat-total">—</div><div class="stat-sub">كل المفاتيح</div></div>
        <div class="stat-card orange"><div class="stat-label">منتهية الصلاحية</div><div class="stat-val" id="stat-expired">—</div><div class="stat-sub">تجاوزت تاريخ الانتهاء</div></div>
        <div class="stat-card red"><div class="stat-label">ملغاة / محظورة</div><div class="stat-val" id="stat-banned">—</div><div class="stat-sub">تم إلغاؤها يدوياً</div></div>
      </div>
      <div class="form-card">
        <div class="section-title">🚀 توليد سريع</div>
        <div style="display:flex;gap:10px;align-items:flex-end">
          <div class="form-group" style="flex:1"><label>مدة الصلاحية</label><select id="quick-hours"><option value="24">24 ساعة</option><option value="48">48 ساعة</option><option value="168">أسبوع</option><option value="720">شهر</option><option value="0">لا تنتهي</option></select></div>
          <div class="form-group" style="flex:2"><label>ملاحظة (اختياري)</label><input id="quick-note" placeholder="مثال: user123"/></div>
          <button class="btn btn-green" onclick="quickGenerate(this)">✨ توليد</button>
        </div>
      </div>
    </div>
    <div class="section" id="section-generate">
      <div class="section-title">✨ توليد مفتاح جديد</div>
      <div class="form-card">
        <div class="form-grid">
          <div class="form-group"><label>مدة الصلاحية (بالساعات)</label><select id="gen-hours"><option value="24">24 ساعة</option><option value="48">48 ساعة</option><option value="168">أسبوع</option><option value="720">شهر</option><option value="0">لا تنتهي ♾️</option></select></div>
          <div class="form-group"><label>ملاحظة (اختياري)</label><input id="gen-note" placeholder="مثال: VIP user"/></div>
        </div>
        <button class="btn btn-green" onclick="generateKey(this)">✨ توليد المفتاح</button>
      </div>
    </div>
    <div class="section" id="section-bulk">
      <div class="section-title">📦 توليد مفاتيح بالجملة</div>
      <div class="form-card">
        <div class="form-grid">
          <div class="form-group"><label>عدد المفاتيح (1–100)</label><input id="bulk-count" type="number" min="1" max="100" value="5"/></div>
          <div class="form-group"><label>مدة الصلاحية</label><select id="bulk-hours"><option value="24">24 ساعة</option><option value="48">48 ساعة</option><option value="168">أسبوع</option><option value="720">شهر</option><option value="0">لا تنتهي ♾️</option></select></div>
        </div>
        <div class="form-group" style="margin-bottom:14px"><label>ملاحظة (اختياري)</label><input id="bulk-note" placeholder="مثال: batch-june-2026"/></div>
        <button class="btn btn-green" onclick="generateBulk(this)">📦 توليد</button>
        <div id="bulk-result" style="margin-top:16px;display:none">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:.82rem;color:var(--sub)" id="bulk-result-label"></span>
            <button class="btn btn-sm" style="background:#111;border:1px solid var(--border2);color:var(--text)" onclick="copyBulk()">📋 نسخ الكل</button>
          </div>
          <div class="result-keys" id="bulk-keys-display"></div>
        </div>
      </div>
    </div>
    <div class="section" id="section-keys">
      <div class="table-wrap">
        <div class="table-toolbar">
          <div style="font-size:.88rem;font-weight:700">🔑 إدارة المفاتيح</div>
          <div style="display:flex;align-items:center;gap:10px">
            <input class="search-box" id="key-search" placeholder="ابحث..." oninput="filterTable()"/>
            <button class="btn btn-green btn-sm" onclick="loadKeys()">🔄 تحديث</button>
          </div>
        </div>
        <div id="keys-table-container"><div class="empty-state">اضغط تحديث لتحميل المفاتيح</div></div>
      </div>
    </div>
  </div>
</div>
<div class="toast-wrap" id="toastWrap"></div>
<div class="modal-overlay" id="keyModal">
  <div class="modal">
    <div class="modal-title">✅ تم توليد المفتاح</div>
    <div class="modal-key" id="modalKey"></div>
    <div style="font-size:.8rem;color:var(--sub);text-align:center" id="modalExpiry"></div>
    <div class="modal-btns">
      <button class="btn btn-green" onclick="copyModalKey()">📋 نسخ</button>
      <button class="btn" style="background:#111;border:1px solid var(--border2);color:var(--text)" onclick="closeModal()">إغلاق</button>
    </div>
  </div>
</div>
<div class="modal-overlay" id="confirmModal">
  <div class="modal">
    <div class="modal-title" id="confirmTitle">تأكيد</div>
    <div style="font-size:.88rem;color:var(--sub);margin-bottom:8px" id="confirmBody"></div>
    <div class="modal-btns">
      <button class="btn btn-red" id="confirmOkBtn">تأكيد</button>
      <button class="btn" style="background:#111;border:1px solid var(--border2);color:var(--text)" onclick="closeConfirm()">إلغاء</button>
    </div>
  </div>
</div>
<script>
const ADMIN = "${secret}";
const BASE = window.location.origin;
let allKeys = [];
let pendingAction = null;

function showSection(name, el) {
  document.querySelectorAll('.section').forEach(function(s){s.classList.remove('visible')});
  document.querySelectorAll('.sidebar-item').forEach(function(s){s.classList.remove('active')});
  document.getElementById('section-' + name).classList.add('visible');
  el.classList.add('active');
  if (name === 'keys') loadKeys();
  if (name === 'dashboard') loadStats();
}

function toast(msg, type) {
  type = type || 'success';
  var wrap = document.getElementById('toastWrap');
  var el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = (type === 'success' ? '✅ ' : '❌ ') + msg;
  wrap.appendChild(el);
  requestAnimationFrame(function(){ el.classList.add('show'); });
  setTimeout(function(){ el.classList.remove('show'); setTimeout(function(){ el.remove(); }, 300); }, 3000);
}

var lastGeneratedKey = '';
function showKeyModal(key, expires) {
  lastGeneratedKey = key;
  document.getElementById('modalKey').textContent = key;
  document.getElementById('modalExpiry').textContent = expires ? 'ينتهي: ' + new Date(expires).toLocaleString('ar-SA') : 'لا ينتهي ♾️';
  document.getElementById('keyModal').classList.add('open');
}
function closeModal(){ document.getElementById('keyModal').classList.remove('open'); }
function copyModalKey(){ navigator.clipboard.writeText(lastGeneratedKey); toast('تم نسخ المفتاح'); closeModal(); }

function showConfirm(title, body, onOk) {
  pendingAction = onOk;
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmBody').textContent = body;
  document.getElementById('confirmModal').classList.add('open');
}
function closeConfirm(){ document.getElementById('confirmModal').classList.remove('open'); pendingAction = null; }
document.getElementById('confirmOkBtn').onclick = function(){ if (pendingAction) pendingAction(); closeConfirm(); };

async function api(method, path, body) {
  var sep = path.includes('?') ? '&' : '?';
  var url = BASE + '/' + path + sep + 'admin=' + encodeURIComponent(ADMIN);
  var opts = { method: method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  var r = await fetch(url, opts);
  return r.json();
}

async function loadStats() {
  try {
    var data = await api('GET', 'api/keys');
    if (!data.success) return;
    var now = new Date();
    var all = data.keys;
    var total = all.length;
    var banned = all.filter(function(k){ return !k.is_active; }).length;
    var expired = all.filter(function(k){ return k.is_active && k.expires_at && new Date(k.expires_at) < now; }).length;
    var active = total - banned - expired;
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-active').textContent = active;
    document.getElementById('stat-expired').textContent = expired;
    document.getElementById('stat-banned').textContent = banned;
  } catch(e) { toast('فشل تحميل الإحصائيات', 'error'); }
}
loadStats();

async function generateKey(btn) {
  var hours = parseInt(document.getElementById('gen-hours').value);
  var note = document.getElementById('gen-note').value.trim();
  btn.disabled = true; btn.textContent = 'جاري التوليد...';
  try {
    var data = await api('POST', 'api/generate', { expires_hours: hours, note: note });
    if (data.success) { showKeyModal(data.key, data.expires); toast('تم توليد المفتاح'); }
    else toast('فشل: ' + (data.error || ''), 'error');
  } catch(e) { toast('خطأ في الاتصال', 'error'); }
  btn.disabled = false; btn.textContent = '✨ توليد المفتاح';
}

async function quickGenerate(btn) {
  var hours = parseInt(document.getElementById('quick-hours').value);
  var note = document.getElementById('quick-note').value.trim();
  btn.disabled = true; btn.textContent = 'جاري...';
  try {
    var data = await api('POST', 'api/generate', { expires_hours: hours, note: note });
    if (data.success) { showKeyModal(data.key, data.expires); toast('تم توليد المفتاح'); loadStats(); }
    else toast('فشل: ' + (data.error || ''), 'error');
  } catch(e) { toast('خطأ في الاتصال', 'error'); }
  btn.disabled = false; btn.textContent = '✨ توليد';
}

var bulkKeysList = [];
async function generateBulk(btn) {
  var count = parseInt(document.getElementById('bulk-count').value);
  var hours = parseInt(document.getElementById('bulk-hours').value);
  var note = document.getElementById('bulk-note').value.trim();
  if (!count || count < 1) { toast('أدخل عدد صحيح', 'error'); return; }
  btn.disabled = true; btn.textContent = 'جاري التوليد...';
  try {
    var data = await api('POST', 'api/generate-bulk', { count: count, expires_hours: hours, note: note });
    if (data.success) {
      bulkKeysList = data.keys;
      document.getElementById('bulk-result-label').textContent = data.count + ' مفتاح تم توليده';
      document.getElementById('bulk-keys-display').textContent = data.keys.join('\\n');
      document.getElementById('bulk-result').style.display = 'block';
      toast('تم توليد ' + data.count + ' مفتاح');
    } else toast('فشل: ' + (data.error || ''), 'error');
  } catch(e) { toast('خطأ في الاتصال', 'error'); }
  btn.disabled = false; btn.textContent = '📦 توليد';
}

function copyBulk(){ navigator.clipboard.writeText(bulkKeysList.join('\\n')); toast('تم نسخ ' + bulkKeysList.length + ' مفتاح'); }

async function loadKeys() {
  document.getElementById('keys-table-container').innerHTML = '<div class="empty-state">جاري التحميل...</div>';
  try {
    var data = await api('GET', 'api/keys');
    if (!data.success) { toast('فشل تحميل المفاتيح', 'error'); return; }
    allKeys = data.keys;
    renderTable(allKeys);
  } catch(e) { toast('خطأ في الاتصال', 'error'); }
}

function filterTable(){
  var q = document.getElementById('key-search').value.toLowerCase();
  renderTable(allKeys.filter(function(k){ return k.key_value.toLowerCase().includes(q) || (k.note||'').toLowerCase().includes(q); }));
}

function renderTable(keys) {
  if (!keys.length) { document.getElementById('keys-table-container').innerHTML = '<div class="empty-state">لا توجد مفاتيح</div>'; return; }
  var now = new Date();
  var rows = keys.map(function(k) {
    var expired = k.expires_at && new Date(k.expires_at) < now;
    var badge = !k.is_active ? '<span class="badge badge-banned">محظور</span>' : expired ? '<span class="badge badge-expired">منتهي</span>' : '<span class="badge badge-active">نشط</span>';
    var exp = k.expires_at ? new Date(k.expires_at).toLocaleDateString('ar-SA') : '♾️';
    var note = k.note ? '<span style="color:var(--sub);font-size:.78rem">' + esc(k.note) + '</span>' : '—';
    var actions = k.is_active
      ? '<div class="action-btns"><button class="btn btn-sm btn-orange" onclick="revokeKey(\\'' + esc(k.key_value) + '\\')">🚫 إلغاء</button><button class="btn btn-sm btn-red" onclick="deleteKey(\\'' + esc(k.key_value) + '\\')">🗑️ حذف</button></div>'
      : '<div class="action-btns"><button class="btn btn-sm btn-red" onclick="deleteKey(\\'' + esc(k.key_value) + '\\')">🗑️ حذف</button></div>';
    return '<tr><td class="key-val">' + k.key_value + '</td><td>' + badge + '</td><td>' + exp + '</td><td>' + note + '</td><td>' + actions + '</td></tr>';
  }).join('');
  document.getElementById('keys-table-container').innerHTML = '<table><thead><tr><th>المفتاح</th><th>الحالة</th><th>الانتهاء</th><th>الملاحظة</th><th>إجراءات</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

async function revokeKey(key) {
  showConfirm('إلغاء مفتاح', 'سيتم إيقاف المفتاح: ' + key, async function() {
    var data = await api('POST', 'api/revoke', { key: key });
    if (data.success) { toast('تم إلغاء المفتاح'); loadKeys(); }
    else toast('فشل: ' + (data.error||''), 'error');
  });
}

async function deleteKey(key) {
  showConfirm('حذف مفتاح نهائياً ⚠️', 'سيتم حذف: ' + key + ' — لا يمكن التراجع', async function() {
    var data = await api('DELETE', 'api/delete', { key: key });
    if (data.success) { toast('تم الحذف'); loadKeys(); }
    else toast('فشل: ' + (data.error||''), 'error');
  });
}
</script>
</body>
</html>`);
});

// ===== START =====
initDB().then(() => {
  app.listen(PORT, () => console.log("⚡ I7RB Key Server running on port " + PORT));
}).catch(err => { console.error("DB init failed:", err); process.exit(1); });
