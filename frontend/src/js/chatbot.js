const token = localStorage.getItem("token");

let awaitingTips = false;

async function askBot() {

const inputField = document.getElementById("userInput");
const chatBox = document.getElementById("chatMessages");

const question = inputField.value.toLowerCase();

let response = "Sorry, I couldn't understand your question.";

try {

if(awaitingTips && ["yes","y","yeah","sure","ok","okay"].includes(question)) {

awaitingTips = false;

response = `Here are some tips to improve your financial management:

1️⃣ Track your expenses regularly.

2️⃣ Try the 50-30-20 rule:
50% needs
30% wants
20% savings.

3️⃣ Reduce spending on non-essential categories like entertainment or shopping.

4️⃣ Set a monthly savings goal.

5️⃣ Review your highest spending category and reduce it by 10–20%.

Small improvements can significantly increase your savings! 💰`;

}


else if(question.includes("budget")){

const res = await fetch("/api/budget",{
headers:{Authorization:"Bearer "+token}
});

const data = await res.json();

response = `Your monthly budget is ₹${data.budget}.`;

}


else if(question.includes("weekly")){

const res = await fetch("/api/expenses",{
headers:{Authorization:"Bearer "+token}
});

const expenses = await res.json();

const today = new Date();
const weekAgo = new Date();
weekAgo.setDate(today.getDate()-7);

let weeklyTotal = 0;

expenses.forEach(e=>{
const d = new Date(e.date);
if(d >= weekAgo){
weeklyTotal += Number(e.amount);
}
});

response = `Your spending in the last 7 days is ₹${weeklyTotal}.`;

}


else if(question.includes("monthly spending") || question.includes("spend this month")){

const res = await fetch("/api/expenses",{
headers:{Authorization:"Bearer "+token}
});

const expenses = await res.json();

const currentMonth = new Date().getMonth();

let total = 0;

expenses.forEach(e=>{
if(new Date(e.date).getMonth() === currentMonth){
total += Number(e.amount);
}
});

response = `Your total spending this month is ₹${total}.`;

}


else if(question.includes("savings")){

const res = await fetch("/api/savings",{
headers:{Authorization:"Bearer "+token}
});

const data = await res.json();

if(data.length === 0){
response = "No savings data available yet.";
}else{

const latest = data[data.length-1];

const [year, month] = latest.month.split("-");
const monthName = new Date(year, month - 1).toLocaleString("default", { month: "long" });

response = `Your savings for ${monthName} ${year} are ₹${latest.savings}.`;

}

}


else if(question.includes("spending the most") || question.includes("most money") || question.includes("highest spending")){

const res = await fetch("/api/analysis",{
headers:{Authorization:"Bearer "+token}
});

const data = await res.json();

let max = 0;
let topCategory = "";

data.byCategory.forEach(c=>{
if(c.total > max){
max = c.total;
topCategory = c.category;
}
});

response = `You spend the most money on ${topCategory} (₹${max}).`;

}


else if(question.includes("financial management") || question.includes("financial health")){

const budgetRes = await fetch("/api/budget",{
headers:{Authorization:"Bearer "+token}
});

const budgetData = await budgetRes.json();
const budget = Number(budgetData.budget) || 0;


const expensesRes = await fetch("/api/expenses",{
headers:{Authorization:"Bearer "+token}
});

const expenses = await expensesRes.json();

const currentMonth = new Date().getMonth();

let monthlySpent = 0;

expenses.forEach(e=>{
if(new Date(e.date).getMonth() === currentMonth){
monthlySpent += Number(e.amount);
}
});

const savings = budget - monthlySpent;

let status = "";

if(savings > budget*0.3){
status = "Excellent financial management! 🎉";
}
else if(savings > budget*0.1){
status = "Good financial management 👍";
}
else if(savings > 0){
status = "Your spending is high. You should try saving more.";
}
else{
status = "Your spending exceeded your budget ⚠️";
}

awaitingTips = true;

response = `Your monthly budget is ₹${budget}.
You spent ₹${monthlySpent}.
Your savings are ₹${savings}.

${status}

Would you like tips to improve your financial management? (yes/no)`;

}

}catch(err){

response = "There was an error retrieving your financial data.";

}


const userMsg = document.createElement("div");
userMsg.className = "message user";
userMsg.textContent = question;

const botMsg = document.createElement("div");
botMsg.className = "message bot";
botMsg.textContent = response;

chatBox.appendChild(userMsg);
chatBox.appendChild(botMsg);

inputField.value = "";

chatBox.scrollTop = chatBox.scrollHeight;

}