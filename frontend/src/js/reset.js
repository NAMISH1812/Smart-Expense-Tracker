document.getElementById("resetForm").addEventListener("submit", async (e) => {

  e.preventDefault();

  const email = localStorage.getItem("resetEmail");
  const otp = localStorage.getItem("resetOtp");

  const password = document.getElementById("password").value;
  const confirm = document.getElementById("confirmPassword").value;

  if (password !== confirm) {
    alert("Passwords do not match");
    return;
  }

  const res = await fetch("/api/auth/reset-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: email,
      code: otp,
      newPassword: password
    })
  });

  const data = await res.json();

  if (data.ok) {
    alert("Password reset successful");
    window.location.href = "login.html";
  } else {
    alert(data.error || "Reset failed");
  }

});