const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/html/login.html";
}

const userEmail = localStorage.getItem("userEmail");

const monthSelect = document.getElementById("monthFilter");
const tableBody = document.getElementById("transactionsBody");

let expenses = [];

let categoryChart;
let savingsChart;


/* LOAD EXPENSES */

async function loadExpenses() {

  const res = await fetch("/api/expenses", {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  expenses = await res.json();

  updateAnalysis();

}


/* LOAD SAVINGS GRAPH */

async function loadSavings(){

  const res = await fetch("/api/savings",{
    headers:{
      Authorization:"Bearer "+token
    }
  });

  const data = await res.json();

  const months = data.map(d=>d.month);
  const savings = data.map(d=>d.savings);

  const ctx = document.getElementById("savingsChart");

  if(!ctx) return;

  if(savingsChart) savingsChart.destroy();

  savingsChart = new Chart(ctx,{

    type:"bar",

    data:{
      labels:months,
      datasets:[{
        label:"Monthly Savings",
        data:savings,
        backgroundColor:"#10b981"
      }]
    },

    options:{
      scales:{
        y:{
          beginAtZero:true
        }
      }
    }

  });

}


/* DOWNLOAD CSV */

document.getElementById("downloadCSV").addEventListener("click", () => {

  const month = Number(monthSelect.value);

  const filtered = expenses.filter(exp =>
    new Date(exp.date).getMonth() === month
  );

  let csv = "Category,Description,Date,Amount\n";

  filtered.forEach(exp => {

    csv += `${exp.category},${exp.description || "-"},${exp.date},₹${exp.amount}\n`;

  });

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = "expenses_report.csv";

  a.click();

});


/* DOWNLOAD PDF */

document.getElementById("downloadPDF").addEventListener("click", () => {

  const { jsPDF } = window.jspdf;

  const doc = new jsPDF();

  const month = Number(monthSelect.value);

  const filtered = expenses.filter(exp =>
    new Date(exp.date).getMonth() === month
  );

  doc.setFontSize(16);
  doc.text("Expense Report", 20, 20);

  let y = 40;

  filtered.forEach(exp => {

    doc.text(
      `${exp.date.substring(0,10)} | ${exp.category} | ${exp.description || "-"} | ₹${exp.amount}`,
      20,
      y
    );

    y += 10;

  });

  doc.save("expenses_report.pdf");

});


/* UPDATE ANALYSIS */

function updateAnalysis() {

  const month = Number(monthSelect.value);

  const filtered = expenses.filter(exp => {
    return new Date(exp.date).getMonth() === month;
  });

  updateTransactions(filtered);
  updateCategoryBreakdown(filtered);
  updateMonthlyComparison();
  updateBudgetIndicator(filtered);

}


/* TRANSACTION TABLE */

function updateTransactions(data) {

  tableBody.innerHTML = "";

  data.forEach(exp => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${exp.category}</td>
      <td>${exp.description || "-"}</td>
      <td>${exp.date.substring(0,10)}</td>
      <td>₹${exp.amount}</td>
    `;

    tableBody.appendChild(row);

  });

}


/* CATEGORY PIE CHART */

function updateCategoryBreakdown(data) {

  const totals = {};

  data.forEach(exp => {

    const amount = Number(exp.amount);

    if (!totals[exp.category]) totals[exp.category] = 0;

    totals[exp.category] += amount;

  });

  const labels = Object.keys(totals).map(cat => `${cat} — ₹${totals[cat]}`);

  const values = Object.values(totals);

  const ctx = document.getElementById("categoryChart");

  if(!ctx) return;

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(ctx, {

    type: "pie",

    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: [
          "#2563eb",
          "#06b6d4",
          "#10b981",
          "#f59e0b",
          "#ef4444"
        ]
      }]
    },

    options: {
      plugins: {
        legend: {
          labels: {
            color: "white"
          }
        }
      }
    }

  });

}


/* BUDGET INDICATOR */

function updateBudgetIndicator(data) {

  const budget = Number(localStorage.getItem("budget_" + userEmail)) || 0;

  const spent = data.reduce((sum, exp) => sum + Number(exp.amount), 0);

  const remaining = budget - spent;

  const percent = budget ? (spent / budget) * 100 : 0;

  const text = document.getElementById("budgetText");
  const bar = document.getElementById("budgetBar");

  if (!text || !bar) return;

  text.innerText =
    `Budget: ₹${budget} | Spent: ₹${spent} | Remaining: ₹${remaining}`;

  bar.style.width = percent + "%";

  if (percent > 100) {

    bar.style.background = "#ef4444";

    text.innerText += " ⚠ Budget exceeded!";

  } else {

    bar.style.background = "#2563eb";

  }

}


/* MONTHLY COMPARISON */

function updateMonthlyComparison() {

  const totals = new Array(12).fill(0);

  expenses.forEach(exp => {

    const month = new Date(exp.date).getMonth();

    totals[month] += Number(exp.amount);

  });

  const bars = document.querySelectorAll(".bar");

  bars.forEach((bar, i) => {

    const percent = Math.min(totals[i] / 20, 100);

    bar.style.setProperty("--h", percent + "%");

  });

}
async function loadSavings(){

  const res = await fetch("/api/savings",{
    headers:{
      Authorization:"Bearer "+token
    }
  });

  const data = await res.json();

  const months = data.map(d=>d.month);
  const savings = data.map(d=>d.savings);

  new Chart(document.getElementById("savingsChart"),{

    type:"bar",

    data:{
      labels:months,
      datasets:[{
        label:"Monthly Savings",
        data:savings,
        backgroundColor:"#10b981"
      }]
    },

    options:{
      plugins:{
        legend:{
          labels:{color:"white"}
        }
      },
      scales:{
        x:{ticks:{color:"white"}},
        y:{ticks:{color:"white"}}
      }
    }

  });

}

/* MONTH FILTER */

monthSelect.addEventListener("change", updateAnalysis);


/* INITIAL LOAD */

loadExpenses();
loadSavings();