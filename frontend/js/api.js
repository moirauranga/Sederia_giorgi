/* api.js — utilidades compartidas y conexión con el backend (/api/...)
   El token JWT se guarda en el navegador y se envía en cada pedido. */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function toast(t) {
  const d = document.createElement("div");
  d.className = "toast"; d.textContent = t;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2600);
}

/* Formatos compartidos (pedidos) */
const money = n => "$" + Number(n || 0).toLocaleString("es-AR");                 // 45000 → $45.000
const fecha = s => { const p = String(s || "").slice(0, 10).split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ""; }; // 2026-10-15 → 15/10/2026
const nroPedido = p => "#" + String(p.numero || p.id || 0).padStart(4, "0");     // 16 → #0016

/* Sesión: se guarda en el navegador el token y los datos del usuario.
   "Recordarme" marcado → localStorage (queda guardado)
   "Recordarme" sin marcar → sessionStorage (se borra al cerrar la pestaña) */
const session = {
  get() { try { return JSON.parse(sessionStorage.getItem("session") || localStorage.getItem("session") || "null"); } catch (e) { return null; } },
  set(data, remember) { try { (remember ? localStorage : sessionStorage).setItem("session", JSON.stringify(data)); } catch (e) {} },
  clear() { try { sessionStorage.removeItem("session"); localStorage.removeItem("session"); } catch (e) {} }
};

/* Pedidos de ejemplo del dashboard (se conectan cuando armemos Pedidos) */
const orders = [
  ["#0001","Moira Uranga","15/10/2026","Listo","$45.000"],
  ["#0016","Francisco Araus","17/10/2026","Pendiente","$17.000"],
  ["#0008","Joaquín Gonzales","21/10/2026","Pendiente","$4.000"],
  ["#0015","Celeste Belloso","21/11/2026","En preparación","$150.000"]
];

/* Productos de ejemplo para "Crear pedido".
   Se usan SOLO si el backend todavía no tiene /productos (cuando armemos Stock, se reemplazan). */
const productosEjemplo = [
  { id: 1, nombre: "Gabardina", colores: ["Beige", "Negro", "Azul"], precio: 5500 },
  { id: 2, nombre: "Algodón",   colores: ["Blanca", "Crema", "Gris"], precio: 3500 },
  { id: 3, nombre: "Lino",      colores: ["Natural", "Blanco", "Verde"], precio: 7000 }
];

/* Función base: manda el pedido al servidor y devuelve { ok, ...datos } o { ok:false, error } */
async function request(method, url, body) {
  try {
    // Armamos los headers; si hay sesión, mandamos el token en cada pedido
    const headers = {};
    if (body) headers["Content-Type"] = "application/json";
    const ses = session.get();
    if (ses && ses.token) headers["Authorization"] = "Bearer " + ses.token;

    const res = await fetch("http://localhost:3000/api" + url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 401 && url !== "/auth/login") {      // sesión vencida → al login
      session.clear();
      location.replace("login.html");
      return { ok: false, error: "Sesión vencida." };
    }
    return res.ok ? { ok: true, ...data } : { ok: false, error: data.error || "Error del servidor." };
  } catch (e) {
    return { ok: false, error: "No se pudo conectar con el servidor." };
  }
}

const api = {
  login: (usuario, password) => request("POST", "/auth/login", { usuario, password }), //inicio de sesion

  async getClients() { //muestra los clientes en la tabla de clientes
    const r = await request("GET", "/clientes");
    if (!r.ok) { toast(r.error); return []; }
    return r.clientes;
  },
  createClient: data => request("POST", "/clientes", data), // crea un cliente nuevo
  deleteClient: id => request("DELETE", "/clientes/" + id), // elimina un cliente

  async getOrders() { //muestra los pedidos en la tabla de pedidos
    const r = await request("GET", "/pedidos");
    if (!r.ok) { toast(r.error); return []; }
    return r.pedidos;
  },
  getOrder: id => request("GET", "/pedidos/" + id),          // trae un pedido con sus productos (detalle)
  createOrder: data => request("POST", "/pedidos", data),    // crea un pedido nuevo
  deleteOrder: id => request("DELETE", "/pedidos/" + id),    // elimina un pedido

  async getProducts() {
  const r = await request("GET", "/productos");
  if (!r.ok) { toast(r.error); return []; }
  return r.productos;
}
};
