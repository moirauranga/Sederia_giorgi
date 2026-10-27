/* pedidos.js — listado de pedidos con búsqueda, filtro por estado y paginación */
let all = [], page = 1;
const PER = 8;

async function loadOrders() { all = await api.getOrders(); page = 1; renderOrders(); }

function filtered() { //busco y filtro pedidos según el input de búsqueda y el filtro de estado
  const q = $("#q").value.trim().toLowerCase(), f = $("#fSel").value;
  return all.filter(p =>
    (`${nroPedido(p)} ${p.numero || p.id} ${p.nombre} ${p.apellido}`).toLowerCase().includes(q) &&
    (!f || p.estado === f));
}

function renderOrders() { //muestra los pedidos en la tabla
  const list = filtered(), pages = Math.max(1, Math.ceil(list.length / PER));
  page = Math.min(page, pages);
  const rows = list.slice((page - 1) * PER, page * PER);

  $("#pBody").innerHTML = rows.length //crea las filas de la tabla según los pedidos filtrados y paginados
    ? rows.map(p => `<tr><td>${esc(nroPedido(p))}</td><td>${esc(p.nombre)} ${esc(p.apellido)}</td>
        <td>${esc(fecha(p.fecha_entrega))}</td>
        <td><span class="pill ${p.estado === "En preparación" ? "prep" : esc(p.estado)}">${esc(p.estado)}</span></td>
        <td>${money(p.total)}</td>
        <td><a class="act" href="pedidoDetalle.html?id=${+p.id}">Ver</a><a class="act" href="crearPedido.html?id=${+p.id}">Editar</a><button class="act" data-del="${+p.id}">Eliminar</button></td></tr>`).join("")
    : `<tr><td colspan="6" class="empty">No se encontraron pedidos.</td></tr>`;

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
  if (b && !b.disabled) { page = +b.dataset.p; renderOrders(); }
});
$("#q").addEventListener("input", () => { page = 1; renderOrders(); });
$("#fSel").addEventListener("change", () => { page = 1; renderOrders(); });
$("#fBtn").addEventListener("click", () => { $("#filters").hidden = !$("#filters").hidden; });
$("#pBody").addEventListener("click", async e => { //elimina un pedido al hacer click en el botón "Eliminar" de la tabla
  const b = e.target.closest("[data-del]"); if (!b) return;
  if (confirm("¿Eliminar este pedido?")) {
    const r = await api.deleteOrder(+b.dataset.del);
    toast(r.ok ? "Pedido eliminado" : r.error);
    if (r.ok) loadOrders();
  }
});

loadOrders();
