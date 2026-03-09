const form = document.querySelector("form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;

  const res = await fetch("http://localhost:4000/api/auth/forgot", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ email })
  });

  const data = await res.json();

  if (data.ok) {
    alert("OTP sent. Check server console.");
    window.location.href = "reset-otp.html";
  } else {
    alert("Failed to send OTP");
  }

});