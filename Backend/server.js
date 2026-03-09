const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

const app = express();

const dbFile = path.join(__dirname, 'data.db');
const db = new Database(dbFile);

const JWT_SECRET = process.env.JWT_SECRET || "expense_tracker_secure_key_2026";
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "..", "frontend", "src")));


// ==========================
// DATABASE TABLES
// ==========================

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE,
  password TEXT
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  amount REAL,
  category TEXT,
  date TEXT,
  description TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS otps (
  email TEXT PRIMARY KEY,
  code TEXT,
  expires_at INTEGER
);

CREATE TABLE IF NOT EXISTS budgets (
  user_id INTEGER,
  month TEXT,
  budget REAL,
  PRIMARY KEY(user_id, month)
);
CREATE TABLE IF NOT EXISTS monthly_reports (
  user_id INTEGER,
  month TEXT,
  budget REAL,
  spent REAL,
  savings REAL,
  PRIMARY KEY(user_id, month)
);
`);


// ==========================
// AUTH MIDDLEWARE
// ==========================

function authMiddleware(req,res,next){

const auth = req.headers.authorization;

if(!auth || !auth.startsWith("Bearer "))
return res.status(401).json({error:"Unauthorized"});

const token = auth.split(" ")[1];

try{

const payload = jwt.verify(token,JWT_SECRET);

req.user = payload;

next();

}catch{

return res.status(401).json({error:"Invalid token"});

}

}
function closePreviousMonth() {

const lastMonth = new Date();
lastMonth.setMonth(lastMonth.getMonth() - 1);

const month = lastMonth.toISOString().slice(0,7);

const users = db.prepare("SELECT id FROM users").all();

users.forEach(user => {

const budgetRow = db.prepare(`
SELECT budget FROM budgets
WHERE user_id=? AND month=?
`).get(user.id, month);

if(!budgetRow) return;

const spentRow = db.prepare(`
SELECT SUM(amount) as spent
FROM expenses
WHERE user_id=? AND substr(date,1,7)=?
`).get(user.id, month);

const spent = spentRow?.spent || 0;

const savings = budgetRow.budget - spent;

const exists = db.prepare(`
SELECT 1 FROM monthly_reports
WHERE user_id=? AND month=?
`).get(user.id, month);

if(!exists){

db.prepare(`
INSERT INTO monthly_reports
(user_id,month,budget,spent,savings)
VALUES (?,?,?,?,?)
`).run(user.id,month,budgetRow.budget,spent,savings);

}

});

}

// ==========================
// AUTH ROUTES
// ==========================

app.post("/api/auth/signup", async (req,res)=>{

try{

const {name,email,password} = req.body;

if(!email || !password)
return res.status(400).json({error:"Missing fields"});

const hashed = await bcrypt.hash(password,10);

const stmt = db.prepare(`
INSERT INTO users (name,email,password)
VALUES (?,?,?)
`);

const info = stmt.run(name || null,email,hashed);

const token = jwt.sign(
{ id: info.lastInsertRowid, email },
JWT_SECRET,
{ expiresIn:"7d"}
);

res.json({token});

}catch(err){

if(err.message.includes("UNIQUE"))
return res.status(400).json({error:"Email already exists"});

res.status(500).json({error:"Server error"});

}

});


app.post("/api/auth/login", async (req,res)=>{

try{

const {email,password} = req.body;

const user = db.prepare(`
SELECT * FROM users WHERE email=?
`).get(email);

if(!user)
return res.status(400).json({error:"Invalid credentials"});

const ok = await bcrypt.compare(password,user.password);

if(!ok)
return res.status(400).json({error:"Invalid credentials"});

const token = jwt.sign(
{ id:user.id, email:user.email },
JWT_SECRET,
{ expiresIn:"7d"}
);

res.json({token});

}catch{

res.status(500).json({error:"Server error"});

}

});


// ==========================
// OTP PASSWORD RESET
// ==========================

app.post("/api/auth/forgot",(req,res)=>{

const {email} = req.body;

if(!email)
return res.status(400).json({error:"Email required"});

const code = Math.floor(100000 + Math.random()*900000).toString();

const expires = Date.now() + 10*60*1000;

db.prepare(`
INSERT OR REPLACE INTO otps (email,code,expires_at)
VALUES (?,?,?)
`).run(email,code,expires);

console.log(`OTP for ${email}: ${code} (valid 10 minutes)`);

res.json({ok:true});

});


app.post("/api/auth/reset-otp", async (req,res)=>{

const {email,code,newPassword} = req.body;

if(!email || !code || !newPassword)
return res.status(400).json({error:"Missing fields"});

const row = db.prepare(`
SELECT * FROM otps WHERE email=?
`).get(email);

if(!row || row.code !== code || Date.now() > row.expires_at)
return res.status(400).json({error:"Invalid or expired OTP"});

const hashed = await bcrypt.hash(newPassword,10);

db.prepare(`
UPDATE users SET password=? WHERE email=?
`).run(hashed,email);

db.prepare(`
DELETE FROM otps WHERE email=?
`).run(email);

res.json({ok:true});

});


// ==========================
// EXPENSE ROUTES
// ==========================

app.post("/api/expenses", authMiddleware, (req,res)=>{

const {amount,category,date,description} = req.body;

if(amount == null || !category)
return res.status(400).json({error:"Amount and category required"});

const stmt = db.prepare(`
INSERT INTO expenses (user_id,amount,category,date,description)
VALUES (?,?,?,?,?)
`);

const info = stmt.run(
req.user.id,
amount,
category,
date || new Date().toISOString().split("T")[0],
description || null
);

res.json({id:info.lastInsertRowid});

});


app.get("/api/expenses", authMiddleware, (req,res)=>{

const rows = db.prepare(`
SELECT * FROM expenses
WHERE user_id=?
ORDER BY date DESC
`).all(req.user.id);

res.json(rows);

});


// ==========================
// BUDGET ROUTES
// ==========================

app.post("/api/budget", authMiddleware,(req,res)=>{

const {budget} = req.body;

if(!budget || budget <=0)
return res.status(400).json({error:"Invalid budget"});

const month = new Date().toISOString().slice(0,7);

db.prepare(`
INSERT OR REPLACE INTO budgets (user_id,month,budget)
VALUES (?,?,?)
`).run(req.user.id,month,budget);

res.json({ok:true});

});


app.get("/api/budget", authMiddleware,(req,res)=>{

const month = new Date().toISOString().slice(0,7);

const row = db.prepare(`
SELECT budget FROM budgets
WHERE user_id=? AND month=?
`).get(req.user.id,month);

res.json({budget: row?.budget || 0});

});


// ==========================
// SAVINGS ROUTE
// ==========================

app.get("/api/savings", authMiddleware,(req,res)=>{

const budgets = db.prepare(`
SELECT month,budget FROM budgets
WHERE user_id=?
`).all(req.user.id);

const expenses = db.prepare(`
SELECT substr(date,1,7) as month, SUM(amount) as spent
FROM expenses
WHERE user_id=?
GROUP BY month
`).all(req.user.id);

const months = [...new Set([
...budgets.map(b=>b.month),
...expenses.map(e=>e.month)
])];

const result = months.map(m=>{

const budgetRow = budgets.find(b=>b.month===m);
const expenseRow = expenses.find(e=>e.month===m);

const budget = budgetRow?.budget || 0;
const spent = expenseRow?.spent || 0;

return {
month:m,
savings:budget-spent
};

});

res.json(result);

});
app.get("/api/yearly-report", authMiddleware, (req,res)=>{

const year = new Date().getFullYear();

const rows = db.prepare(`
SELECT month,budget,spent,savings
FROM monthly_reports
WHERE user_id=? AND substr(month,1,4)=?
ORDER BY month
`).all(req.user.id, year);

res.json(rows);

});


// ==========================
// ANALYSIS ROUTE
// ==========================

app.get("/api/analysis", authMiddleware,(req,res)=>{

const byCategory = db.prepare(`
SELECT category, SUM(amount) as total
FROM expenses
WHERE user_id=?
GROUP BY category
`).all(req.user.id);

const byMonth = db.prepare(`
SELECT substr(date,1,7) as month, SUM(amount) as total
FROM expenses
WHERE user_id=?
GROUP BY month
ORDER BY month DESC
`).all(req.user.id);

res.json({byCategory,byMonth});

});
app.get("/api/financial-score", authMiddleware,(req,res)=>{

const month = new Date().toISOString().slice(0,7);

// get budget
const budgetRow = db.prepare(`
SELECT budget FROM budgets
WHERE user_id=? AND month=?
`).get(req.user.id, month);

const budget = budgetRow?.budget || 0;

// get spending
const spentRow = db.prepare(`
SELECT SUM(amount) as spent
FROM expenses
WHERE user_id=? AND substr(date,1,7)=?
`).get(req.user.id, month);

const spent = spentRow?.spent || 0;

const savings = budget - spent;

let score = 0;

// savings score (50 points)
if(budget > 0){
const savingsRate = savings / budget;

if(savingsRate > 0.4) score += 50;
else if(savingsRate > 0.25) score += 40;
else if(savingsRate > 0.1) score += 25;
else if(savingsRate > 0) score += 10;
}

// budget discipline (30 points)
if(spent <= budget) score += 30;

// spending diversity (20 points)
const categories = db.prepare(`
SELECT COUNT(DISTINCT category) as count
FROM expenses
WHERE user_id=? AND substr(date,1,7)=?
`).get(req.user.id, month);

if(categories.count >= 3) score += 20;
else if(categories.count >= 2) score += 10;

res.json({
budget,
spent,
savings,
score
});

});
closePreviousMonth();
setInterval(closePreviousMonth, 24 * 60 * 60 * 1000);
// ==========================
// START SERVER
// ==========================

app.listen(PORT,()=>{

console.log(`Server running on http://localhost:${PORT}`);

});