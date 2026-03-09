const token = localStorage.getItem("token");

let yearlyData = [];

async function loadYearlyReport(){

const res = await fetch("/api/yearly-report",{
headers:{Authorization:"Bearer "+token}
});

yearlyData = await res.json();

updateTable();
updateChart();

}

function updateTable(){

const table = document.getElementById("yearTable");

table.innerHTML = "";

yearlyData.forEach(d=>{

const row = document.createElement("tr");

row.innerHTML = `
<td>${d.month}</td>
<td>₹${d.budget}</td>
<td>₹${d.spent}</td>
<td>₹${d.savings}</td>
`;

table.appendChild(row);

});

}

function updateChart(){

const months = yearlyData.map(d=>d.month);
const budgets = yearlyData.map(d=>d.budget);
const spent = yearlyData.map(d=>d.spent);
const savings = yearlyData.map(d=>d.savings);

new Chart(document.getElementById("yearChart"),{

type:"bar",

data:{
labels:months,
datasets:[
{
label:"Budget",
data:budgets,
backgroundColor:"#2563eb"
},
{
label:"Spent",
data:spent,
backgroundColor:"#ef4444"
},
{
label:"Savings",
data:savings,
backgroundColor:"#10b981"
}
]
}

});

}

function downloadCSV(){

let csv = "Month,Budget,Spent,Savings\n";

yearlyData.forEach(d=>{

csv += `${d.month},${d.budget},${d.spent},${d.savings}\n`;

});

const blob = new Blob([csv],{type:"text/csv"});

const url = URL.createObjectURL(blob);

const a = document.createElement("a");

a.href = url;
a.download = "yearly_finance_report.csv";

a.click();

}

loadYearlyReport();