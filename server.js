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
  } catch(e) {}
}
function saveKeys() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify([...keys.values()], null, 2)); } catch(e) {}
}
function genKey() {
  const p = crypto.randomBytes(4).toString("hex").toUpperCase();
  return "I7RB-" + p.slice(0,4) + "-" + p.slice(4);
}
loadKeys();

function isAdmin(req, res) {
  if (req.headers["x-admin-password"] !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" }); return false;
  }
  return true;
}

app.get("/api/validate", function(req, res) {
  var key = String(req.query.key || "").trim();
  if (!key) return res.json({ valid: false, reason: "no_key" });
  var e = keys.get(key);
  if (!e) return res.json({ valid: false, reason: "invalid" });
  if (!e.active) return res.json({ valid: false, reason: "inactive" });
  if (e.expiresAt && new Date(e.expiresAt) < new Date()) return res.json({ valid: false, reason: "expired" });
  res.json({ valid: true });
});

app.post("/api/keys/generate", function(req, res) {
  var key = genKey();
  var expiresAt = new Date(Date.now() + 4 * 3600000).toISOString();
  var e = { key: key, label: "auto", active: true, createdAt: new Date().toISOString(), expiresAt: expiresAt };
  keys.set(key, e); saveKeys(); res.json(e);
});

app.get("/api/admin/keys", function(req, res) {
  if (!isAdmin(req, res)) return;
  res.json([...keys.values()]);
});

app.post("/api/admin/keys", function(req, res) {
  if (!isAdmin(req, res)) return;
  var key = req.body.key;
  var label = req.body.label || "";
  var expiresAt = req.body.expiresAt || null;
  if (!key) return res.status(400).json({ error: "key required" });
  var e = { key: key, label: label, active: true, createdAt: new Date().toISOString(), expiresAt: expiresAt };
  keys.set(key, e); saveKeys(); res.json(e);
});

app.patch("/api/admin/keys/:key", function(req, res) {
  if (!isAdmin(req, res)) return;
  var e = keys.get(req.params.key);
  if (!e) return res.status(404).json({ error: "not found" });
  if (typeof req.body.active !== "undefined") e.active = req.body.active;
  saveKeys(); res.json(e);
});

app.delete("/api/admin/keys/:key", function(req, res) {
  if (!isAdmin(req, res)) return;
  if (!keys.delete(req.params.key)) return res.status(404).json({ error: "not found" });
  saveKeys(); res.json({ ok: true });
});

app.get(["/", "/get"], function(req, res) {
  res.send('<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>I7RB</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}.box{background:#111;border:1px solid #0d0;border-radius:12px;padding:40px;max-width:500px;width:90%;text-align:center}h1{color:#0f0;font-size:2em;margin-bottom:10px}p{color:#aaa;margin-bottom:20px}.step{background:#1a1a1a;border-radius:8px;padding:15px;margin:10px 0;text-align:right}.step b{color:#0f0}</style></head><body><div class="box"><h1>I7RB</h1><p>احصل على كودك</p><div class="step"><b>الخطوة 1:</b> اشترك في القناة</div><div class="step"><b>الخطوة 2:</b> تواصل مع الادارة</div><div class="step"><b>الخطوة 3:</b> استخدم الكود في السكربت</div></div></body></html>');
});

app.get("/i7rb-ctrl-8z2q", function(req, res) {
  res.send('<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>I7RB Admin</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0a;color:#fff;font-family:sans-serif;padding:20px}h1{color:#0f0;margin-bottom:20px}input,select{background:#1a1a1a;border:1px solid #333;color:#fff;padding:8px;border-radius:6px;margin:5px}button{background:#0a0;color:#000;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;margin:5px}.key-row{background:#111;border:1px solid #222;border-radius:8px;padding:12px;margin:8px 0}.login-box{max-width:300px;margin:100px auto;background:#111;padding:30px;border-radius:12px;border:1px solid #0d0;text-align:center}</style></head><body><div id="login-box" class="login-box"><h2 style="color:#0f0;margin-bottom:15px">دخول الادارة</h2><input type="password" id="pwd" placeholder="كلمة المرور" style="width:100%;margin-bottom:10px"><br><button onclick="doLogin()" style="width:100%">دخول</button></div><div id="panel" style="display:none"><h1>لوحة التحكم I7RB</h1><div style="margin:15px 0"><input type="text" id="new-key" placeholder="الكود"><input type="text" id="new-label" placeholder="الاسم"><select id="new-dur"><option value="4h">4 ساعات</option><option value="1d">يوم</option><option value="1w">اسبوع</option><option value="1m">شهر</option><option value="perm">دائم</option></select><button onclick="addKey()">اضافة</button><button onclick="genKey()">توليد</button></div><div id="keys-list"></div></div><script>var PWD="";function doLogin(){PWD=document.getElementById("pwd").value;loadKeys();}async function loadKeys(){var r=await fetch("/api/admin/keys",{headers:{"x-admin-password":PWD}});if(r.status===401){alert("كلمة المرور خاطئة");return;}document.getElementById("login-box").style.display="none";document.getElementById("panel").style.display="block";var keys=await r.json();var list=document.getElementById("keys-list");if(!keys.length){list.innerHTML="<p>لا يوجد اكواد</p>";return;}list.innerHTML=keys.map(function(k){var exp=k.expiresAt?new Date(k.expiresAt).toLocaleString("ar"):"دائم";return"<div class=\'key-row\'>"+k.key+" | "+(k.label||"")+" | "+(k.active?"فعّال":"موقوف")+" | "+exp+" <button onclick=\'toggle(\""+k.key+"\","+(!k.active)+")\'>"+(k.active?"ايقاف":"تفعيل")+"</button> <button onclick=\'del(\""+k.key+"\")\'style=\'background:#500;color:#f88\'>حذف</button></div>";}).join("");}var DUR={"4h":4*3600000,"1d":86400000,"1w":7*86400000,"1m":30*86400000,"perm":null};async function addKey(){var key=document.getElementById("new-key").value.trim();var label=document.getElementById("new-label").value.trim();var dur=document.getElementById("new-dur").value;var ms=DUR[dur];var expiresAt=ms?new Date(Date.now()+ms).toISOString():null;await fetch("/api/admin/keys",{method:"POST",headers:{"Content-Type":"application/json","x-admin-password":PWD},body:JSON.stringify({key:key,label:label,expiresAt:expiresAt})});document.getElementById("new-key").value="";loadKeys();}async function genKey(){var r=await fetch("/api/keys/generate",{method:"POST"});var d=await r.json();alert("الكود: "+d.key);loadKeys();}async function toggle(key,active){await fetch("/api/admin/keys/"+encodeURIComponent(key),{method:"PATCH",headers:{"Content-Type":"application/json","x-admin-password":PWD},body:JSON.stringify({active:active})});loadKeys();}async function del(key){if(!confirm("حذف؟"))return;await fetch("/api/admin/keys/"+encodeURIComponent(key),{method:"DELETE",headers:{"x-admin-password":PWD}});loadKeys();}</script></body></html>');
});

app.listen(PORT, function() { console.log("I7RB running on port " + PORT); });
