const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/html/login.html";
}

const table = document.getElementById("expenseTable");

let monthlyBudget = 0;

const budgetDisplay = document.getElementById("budgetDisplay");
const progressBar = document.getElementById("budgetProgressBar");


/* SHOW CURRENT DATE */

const today = new Date();

document.getElementById("currentDate").textContent =
today.toDateString();


/* AUTO SET TODAY DATE */

const dateInput = document.getElementById("date");

if (dateInput) {
  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;
}


/* LOAD BUDGET */

async function loadBudget() {

  try {

    const res = await fetch("/api/budget", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    const data = await res.json();

    monthlyBudget = Number(data.budget) || 0;

    if (budgetDisplay) {
      budgetDisplay.textContent = "Monthly Budget: ₹" + monthlyBudget;
    }

  } catch (err) {

    console.error("Error loading budget:", err);

  }

}


/* SET BUDGET */

async function setBudget() {

  const budgetInput = document.getElementById("budgetInput").value;

  if (!budgetInput) {
    alert("Please enter a budget");
    return;
  }

  const budget = Number(budgetInput);

  const res = await fetch("/api/budget", {

    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },

    body: JSON.stringify({ budget })

  });

  const data = await res.json();

  if (data.ok) {

    monthlyBudget = budget;

    budgetDisplay.textContent =
      "Monthly Budget: ₹" + monthlyBudget;

    loadExpenses();
    loadFinancialScore();

  }

}


/* UPDATE PROGRESS BAR */

function updateBudgetProgress(totalSpent){

if(!monthlyBudget) return;

const percent = (totalSpent / monthlyBudget) * 100;

progressBar.style.width = Math.min(percent,100) + "%";

if(percent < 60){

progressBar.style.background = "#10b981"; // green

}

else if(percent < 90){

progressBar.style.background = "#f59e0b"; // yellow

}

else{

progressBar.style.background = "#ef4444"; // red

}

}


/* LOAD EXPENSES */

async function loadExpenses() {

  const res = await fetch("/api/expenses", {

    headers: {
      Authorization: "Bearer " + token
    }

  });

  const expenses = await res.json();

  table.innerHTML = "";

  let total = 0;

  let weeklyTotal = 0;

  const today = new Date();

  const weekAgo = new Date();

  weekAgo.setDate(today.getDate() - 7);


  expenses.forEach(exp => {

    const amount = Number(exp.amount);

    total += amount;

    const expenseDate = new Date(exp.date);

    if (expenseDate >= weekAgo) {
      weeklyTotal += amount;
    }

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${exp.date.substring(0,10)}</td>
      <td>${exp.category}</td>
      <td>${exp.description || "-"}</td>
      <td>₹${amount}</td>
    `;

    table.appendChild(row);

  });


  document.getElementById("totalSpent").textContent =
  "Total Spent: ₹" + total.toFixed(2);

  document.getElementById("weeklySpent").textContent =
  "Weekly Spending: ₹" + weeklyTotal.toFixed(2);


  updateBudgetProgress(total);


  if (monthlyBudget && total > monthlyBudget && !window.budgetAlertShown) {

    alert("⚠ Warning: You exceeded your monthly budget!");

    window.budgetAlertShown = true;

  }

}


/* ADD EXPENSE */

async function addExpense() {

  const date = document.getElementById("date").value;

  const amount = Number(document.getElementById("amount").value);

  const category = document.getElementById("category").value;

  const description = document.getElementById("description").value;


  if (!amount || !category) {
    alert("Please enter expense details");
    return;
  }


  const selectedDate = new Date(date);

  const today = new Date();

  if (selectedDate > today) {
    alert("You cannot add future expenses.");
    return;
  }


  const totalText = document.getElementById("totalSpent").innerText;

  const spent = Number(totalText.replace(/[^\d.]/g,"")) || 0;

  const remaining = monthlyBudget - spent;


  if (monthlyBudget && amount > remaining) {

    alert("⚠ Not enough budget remaining!");

  }


  await fetch("/api/expenses", {

    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },

    body: JSON.stringify({
      amount,
      category,
      date,
      description
    })

  });


  await loadExpenses();
  loadFinancialScore();

}


/* FINANCIAL SCORE */

async function loadFinancialScore(){

try{

const res = await fetch("/api/financial-score",{
headers:{
Authorization:"Bearer "+token
}
});

if(!res.ok){
console.error("API error:",res.status);
return;
}

const data = await res.json();

console.log("Financial score:",data);

document.getElementById("financialScore").textContent =
(data.score ?? 0) + "/100";

let status="";

if(data.score >= 80) status="Excellent financial management";
else if(data.score >= 60) status="Good financial management";
else if(data.score >= 40) status="Average financial management";
else status="Poor financial management";

document.getElementById("scoreStatus").textContent=status;

}catch(err){

console.error("Financial score error:",err);

}

}


/* INITIAL LOAD */

async function initDashboard() {

await loadBudget();
await loadExpenses();
loadFinancialScore();

}

initDashboard();


/* LOGOUT */

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

  logoutBtn.addEventListener("click", () => {

    localStorage.removeItem("token");

    window.location.href = "/html/login.html";

  });

}