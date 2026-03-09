const form = document.querySelector("form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch("http://localhost:4000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (data.token) {

    localStorage.setItem("token", data.token);

    // ⭐ IMPORTANT FOR USER-SPECIFIC BUDGET
    localStorage.setItem("userEmail", email);

    window.location.href = "dashboard.html";

  } else {

    alert(data.error || "Login failed");

  }
});