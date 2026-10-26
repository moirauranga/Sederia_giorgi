/* login.js — pantalla de inicio de sesión */
if (session.get()) location.replace("dashboard.html");

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const u = $("#user").value.trim(), p = $("#pass").value, m = $("#loginMsg");
  $("#user").classList.toggle("err", !u);
  $("#pass").classList.toggle("err", !p);
  if (!u || !p) { m.textContent = "Completá usuario y contraseña."; return; }

  $("#loginBtn").disabled = true; m.textContent = "";
  const res = await api.login(u, p);
  $("#loginBtn").disabled = false;
  if (!res.ok) { m.textContent = res.error; return; }

  // Guardamos el token junto con el nombre y el rol
  session.set({ ...res.user, token: res.token }, $("#remember").checked);
  location.href = "dashboard.html";
});

$("#forgot").addEventListener("click", e => {
  e.preventDefault();
  toast("La recuperación de contraseña se conectará con el backend.");
});