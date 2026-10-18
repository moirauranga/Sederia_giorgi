/* api.js — datos y utilidades compartidas por todas las pantallas.
   Cada función de `api` es el punto donde se conectará el backend (fetch). */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const delay = v => new Promise(r => setTimeout(() => r(v), 250));

function toast(t) {
  const d = document.createElement("div");
  d.className = "toast"; d.textContent = t;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2600);
}

/* Almacenamiento local (solo para la demo, se reemplaza por el backend) */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k)    { try { localStorage.removeItem(k); } catch (e) {} }
};

/* Sesión: "Recordarme" la guarda en localStorage, si no, solo dura mientras esté abierta la pestaña */
const session = {
  get() { try { return JSON.parse(sessionStorage.getItem("session") || localStorage.getItem("session") || "null"); } catch (e) { return null; } },
  set(user, remember) { try { (remember ? localStorage : sessionStorage).setItem("session", JSON.stringify(user)); } catch (e) {} },
  clear() { try { sessionStorage.removeItem("session"); localStorage.removeItem("session"); } catch (e) {} }
};

/* ---- Datos de prueba (borrar cuando haya base de datos) ---- */
const seed = [
  {id:1,nombre:"María",apellido:"López",telefono:"2364563258",calle:"San Martín",numero:"120",localidad:"Pergamino",pedidos:2},
  {id:2,nombre:"Ana",apellido:"García",telefono:"2364589621",calle:"",numero:"",localidad:"",pedidos:0},
  {id:3,nombre:"Florencia",apellido:"Fernán",telefono:"2364594083",calle:"",numero:"",localidad:"",pedidos:1},
  {id:4,nombre:"Martina",apellido:"Vische",telefono:"2364785412",calle:"",numero:"",localidad:"",pedidos:0}
];
const orders = [
  ["#0001","Moira Uranga","15/10/2026","Listo","$45.000"],
  ["#0016","Francisco Araus","17/10/2026","Pendiente","$17.000"],
  ["#0008","Joaquín Gonzales","21/10/2026","Pendiente","$4.000"],
  ["#0015","Celeste Belloso","21/11/2026","En preparación","$150.000"]
];

/* ---- API (mock) ---- */
const api = {
  async login(user, pass) { /* TODO: POST /auth/login */
    if (user === "admin" && pass === "1234")
      return delay({ ok: true, user: { name: "Marita Had", role: "Administradora" }, token: "demo" });
    return delay({ ok: false, error: "Usuario o contraseña incorrectos." });
  },
  async getClients() { /* TODO: GET /clientes */
    return delay(store.get("clientes", seed));
  },
  async createClient(c) { /* TODO: POST /clientes */
    const list = store.get("clientes", seed);
    if (list.some(x => x.dni && x.dni === c.dni)) return delay({ ok: false, error: "Ya existe un cliente con ese DNI/CUIT." });
    c.id = Date.now(); c.pedidos = 0; list.push(c); store.set("clientes", list);
    return delay({ ok: true, client: c });
  },
  async deleteClient(id) { /* TODO: DELETE /clientes/:id */
    store.set("clientes", store.get("clientes", seed).filter(c => c.id !== id));
    return delay({ ok: true });
  }
};
