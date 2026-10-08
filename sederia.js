const form = document.getElementById("loginForm");
const errorBox = document.getElementById("errorBox");
const submitBtn = document.getElementById("submitBtn");

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = "block";
}

function hideError() {
  errorBox.style.display = "none";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const usuario = document.getElementById("usuario").value.trim();
  const password = document.getElementById("password").value.trim();
  const recordarme = document.getElementById("recordarme").checked;

  if (!usuario || !password) {
    showError("Completá usuario y contraseña.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Ingresando...";

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, password, recordarme }),
    });

    if (!res.ok) {
      throw new Error("Usuario o contraseña incorrectos.");
    }

    const data = await res.json();

    // Guardamos el token para las próximas peticiones
    if (recordarme) {
      localStorage.setItem("token", data.token);
    } else {
      sessionStorage.setItem("token", data.token);
    }

    window.location.href = "dashboard.html";
  } catch (err) {
    showError(err.message || "No se pudo iniciar sesión.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Ingresar";
  }
});