/* clientes.js — listado de clientes con búsqueda, filtros y paginación */
let all = [], page = 1;
const PER = 8;

async function loadClients() { all = await api.getClients(); page = 1; renderClients(); }

function filtered() { //busco y filtro clientes según lo que escriba en el input de búsqueda y el filtro de pedidos
  const q = $("#q").value.trim().toLowerCase(), f = $("#fSel").value;
  return all.filter(c =>
    (`${c.nombre} ${c.apellido} ${c.telefono}`).toLowerCase().includes(q) &&
    (!f || (f === "con") === (c.pedidos > 0)));
}

function renderClients() { //muestra los clientes en la tabla
  const list = filtered(), pages = Math.max(1, Math.ceil(list.length / PER));
  page = Math.min(page, pages);
  const rows = list.slice((page - 1) * PER, page * PER);

  $("#cBody").innerHTML = rows.length //crea las filas de la tabla según los clientes filtrados y paginados
    ? rows.map(c => `<tr><td>${esc(c.nombre)} ${esc(c.apellido)}</td><td>${esc(c.telefono)}</td>
        <td>${esc([c.calle, c.numero, c.localidad].filter(Boolean).join(" "))}</td><td>${c.pedidos || 0}</td>
        <td><button class="act" data-del="${c.id}">Eliminar</button></td></tr>`).join("")
    : `<tr><td colspan="5" class="empty">No se encontraron clientes.</td></tr>`;

  //crea botones de paginacion  
  let h = `<button ${page === 1 ? "disabled" : ""} data-p="${page - 1}" aria-label="Anterior">‹</button>`;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) h += `<button class="${i === page ? "on" : ""}" data-p="${i}">${i}</button>`;
    else if (Math.abs(i - page) === 2) h += "<button disabled>…</button>";
  }
  h += `<button ${page === pages ? "disabled" : ""} data-p="${page + 1}" aria-label="Siguiente">›</button>`;
  $("#pager").innerHTML = h;
}

$("#pager").addEventListener("click", e => {
  const b = e.target.closest("[data-p]");
  if (b && !b.disabled) { page = +b.dataset.p; renderClients(); }
});
$("#q").addEventListener("input", () => { page = 1; renderClients(); });
$("#fSel").addEventListener("change", () => { page = 1; renderClients(); });
$("#fBtn").addEventListener("click", () => { $("#filters").hidden = !$("#filters").hidden; });
$("#cBody").addEventListener("click", async e => { //elimina un cliente al hacer click en el botón "Eliminar" de la tabla
  const b = e.target.closest("[data-del]"); if (!b) return;
  if (confirm("¿Eliminar este cliente?")) {
    const r = await api.deleteClient(+b.dataset.del);
    toast(r.ok ? "Cliente eliminado" : r.error);
    if (r.ok) loadClients();
  }
});

loadClients();