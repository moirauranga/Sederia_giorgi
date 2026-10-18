/* layout.js — se usa en todas las páginas menos el login.
   El menú lateral y la barra superior están escritos directamente en cada HTML.
   Acá solo se protege la página y se completan nombre, saludo y botones. */

const user = session.get();
if (!user) {
  location.replace("login.html");          // sin sesión → al login
} else {
  const set = (sel, txt) => { const el = $(sel); if (el) el.textContent = txt; };
  const on  = (sel, fn)  => { const el = $(sel); if (el) el.addEventListener("click", fn); };

  set("#uName", user.name || "");
  set("#uRole", user.role || "");

  const t = $("#pageTitle");
  if (t && !t.textContent.trim()) {        // el dashboard muestra el saludo
    const h = new Date().getHours();
    const s = h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
    t.textContent = `¡${s}, ${(user.name || "").split(" ")[0]}!`;
  }

  on("#logout", () => { session.clear(); location.href = "login.html"; });
  on("#cfgBtn", () => toast("Configuración: próximamente"));
}
