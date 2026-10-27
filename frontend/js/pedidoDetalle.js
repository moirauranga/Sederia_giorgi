/* pedidoDetalle.js — detalle de un pedido (pedidoDetalle.html?id=1) */
const id = +new URLSearchParams(location.search).get("id");
if (!id) location.replace("pedidos.html");

$("#printBtn").addEventListener("click", () => window.print());
$("#editBtn").addEventListener("click", () => { location.href = "crearPedido.html?id=" + id; }); //abre el formulario con este pedido cargado
$("#delBtn").addEventListener("click", async () => { //elimina el pedido y vuelve al listado
  if (!confirm("¿Eliminar este pedido?")) return;
  const r = await api.deleteOrder(id);
  if (!r.ok) { $("#dMsg").textContent = r.error; return; }
  toast("Pedido eliminado");
  setTimeout(() => location.href = "pedidos.html", 700);
});

(async function () {
  if (!id) return;

  const r = await api.getOrder(id);
  if (!r.ok) { $("#dMsg").textContent = r.error; return; }
  const p = r.pedido, items = p.productos || [];

  $("#crumb").textContent = nroPedido(p);
  $("#pageTitle").textContent = "Pedido " + nroPedido(p);
  $("#dCliente").textContent = `${p.nombre || ""} ${p.apellido || ""}`;
  $("#dTel").textContent = p.telefono || "";
  $("#dEmail").textContent = p.email || "";
  $("#dFecha").textContent = fecha(p.fecha_entrega);
  $("#dTotal").textContent = $("#dTotal2").textContent = money(p.total);

  const st = $("#dEstado");
  st.textContent = p.estado || "";
  st.className = "pill " + (p.estado === "En preparación" ? "prep" : p.estado || "");

  $("#dBody").innerHTML = items.length
    ? items.map(i => `<tr><td>${esc(i.nombre)}</td><td>${esc(i.color)}</td><td>${+i.cantidad}</td>
        <td>${money(i.precio)}</td><td>${money(i.cantidad * i.precio)}</td></tr>`).join("")
    : `<tr><td colspan="5" class="empty">Este pedido no tiene productos.</td></tr>`;
})();
