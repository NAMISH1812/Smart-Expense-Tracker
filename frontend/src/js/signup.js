document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("signupForm");

  form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm-password").value;

    if (password !== confirm) {
      alert("Passwords do not match");
      return;
    }

    try {

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.token) {

        localStorage.setItem("token", data.token);

        // ⭐ store email for budget separation
        localStorage.setItem("userEmail", email);

        window.location.href = "/html/dashboard.html";

      } else {

        alert(data.error || "Signup failed");

      }

    } catch (err) {

      console.error(err);
      alert("Server connection error");

    }

  });

});