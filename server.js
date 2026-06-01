const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe123";

const keys = new Map();

function generateKey() {
  return "I7RB-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

function isAdmin(req, res, next) {
  const pass = req.headers["x-admin-password"];
  if (pass !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.get("/", (req, res) => {
  res.send("I7RB Key System Online");
});

// التحقق من الكود
app.get("/api/validate", (req, res) => {
  const key = String(req.query.key || "");

  const data = keys.get(key);

  if (!data) {
    return res.json({ valid: false, reason: "invalid" });
  }

  if (!data.active) {
    return res.json({ valid: false, reason: "inactive" });
  }

  if (data.expiresAt && Date.now() > data.expiresAt) {
    return res.json({ valid: false, reason: "expired" });
  }

  res.json({ valid: true });
});

// توليد كود جديد
app.post("/api/admin/generate", isAdmin, (req, res) => {
  const key = generateKey();

  const expiresAt = Date.now() + (4 * 60 * 60 * 1000);

  keys.set(key, {
    key,
    active: true,
    createdAt: Date.now(),
    expiresAt
  });

  res.json({
    success: true,
    key,
    expiresAt
  });
});

// عرض جميع الأكواد
app.get("/api/admin/keys", isAdmin, (req, res) => {
  res.json([...keys.values()]);
});

// حذف كود
app.delete("/api/admin/keys/:key", isAdmin, (req, res) => {
  keys.delete(req.params.key);
  res.json({ success: true });
});

// تفعيل أو إيقاف كود
app.patch("/api/admin/keys/:key", isAdmin, (req, res) => {
  const item = keys.get(req.params.key);

  if (!item) {
    return res.status(404).json({ error: "Not Found" });
  }

  item.active = !!req.body.active;

  res.json(item);
});

app.listen(PORT, () => {
  console.log(`I7RB running on port ${PORT}`);
});
