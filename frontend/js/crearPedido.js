/* crearPedido.js — formulario de pedido (cliente + productos)
   Sin parámetros:   crearPedido.html        → crea un pedido nuevo
   Con ?id=16:       crearPedido.html?id=16  → modifica el pedido 16 (mismo formulario, ya cargado)

   products viene de GET /productos: [ { nombre: "Gabardina", colores: [ { id, color, precio }, … ] }, … ]
   Cada color es una fila de la tabla producto: su "id" (idproducto) es lo que se manda al guardar el pedido. */
let products = [];
const editId = +new URLSearchParams(location.search).get("id") || 0;   // 0 = pedido nuevo
let fechaOriginal = "";                                                  // fecha que tenía el pedido al abrirlo (solo al modificar)

//fecha de hoy en formato yyyy-mm-dd (hora local), para no permitir fechas de entrega pasadas
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

function newRow() { //agrega una fila vacía a la tabla de productos
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><select class="input p-prod" aria-label="Producto"><option value="">Seleccionar</option>
      ${products.map((p, i) => `<option value="${i}">${esc(p.nombre)}</option>`).join("")}</select></td>
    <td><select class="input p-color" aria-label="Color" disabled><option value="">Color</option></select></td>
    <td><input class="input p-qty" type="number" min="1" step="1" value="1" aria-label="Cantidad"></td>
    <td><input class="input p-price" type="number" min="0" step="any" value="0" aria-label="Precio unitario"></td>
    <td class="p-sub">$0</td>
    <td><button class="act" type="button" data-rm aria-label="Quitar producto">✕</button></td>`;
  $("#itemsBody").appendChild(tr);
  return tr;
}

function fillColors(tr, varianteId) { //carga en la fila los colores de la tela elegida (y deja elegido el color "varianteId" si se indica)
  const col = tr.querySelector(".p-color"), sel = tr.querySelector(".p-prod").value;
  const p = sel === "" ? null : products[+sel];
  col.innerHTML = `<option value="">${p && !p.colores.length ? "Sin colores" : "Color"}</option>` +
    (p ? p.colores.map(c => `<option value="${+c.id}">${esc(c.color || "Sin color")}</option>`).join("") : "");
  col.disabled = !p;
  if (varianteId) col.value = varianteId;
}

function calcRow(tr) { //calcula el subtotal de una fila
  return (+tr.querySelector(".p-qty").value || 0) * (+tr.querySelector(".p-price").value || 0);
}

function calcTotal() { //actualiza los subtotales de cada fila y el total del pedido
  let total = 0;
  $$("#itemsBody tr").forEach(tr => {
    const s = calcRow(tr); total += s;
    tr.querySelector(".p-sub").textContent = money(s);
  });
  $("#total").textContent = money(total);
  return total;
}

$("#itemsBody").addEventListener("change", e => {
  const tr = e.target.closest("tr");
  if (e.target.classList.contains("p-prod")) {         //al elegir una tela: cargo sus colores y limpio el precio
    fillColors(tr);
    tr.querySelector(".p-price").value = 0;
    calcTotal();
  } else if (e.target.classList.contains("p-color")) { //al elegir un color: cargo el precio de ese color
    const p = products[+tr.querySelector(".p-prod").value];
    const c = p && p.colores.find(x => x.id === +e.target.value);
    tr.querySelector(".p-price").value = c ? c.precio : 0;
    calcTotal();
  }
});
$("#itemsBody").addEventListener("input", calcTotal);
$("#itemsBody").addEventListener("click", e => { //quita una fila (siempre queda al menos una)
  const b = e.target.closest("[data-rm]"); if (!b) return;
  if ($$("#itemsBody tr").length > 1) { b.closest("tr").remove(); calcTotal(); }
});
$("#addItem").addEventListener("click", () => { newRow(); calcTotal(); });

$("#pForm").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, m = $("#pMsg"); let bad = false;

  //marco los campos del cliente que estén vacíos
  $$("#pForm [required]").forEach(i => { const ko = !i.value; i.classList.toggle("err", ko); if (ko) bad = true; });
  if (bad) { m.textContent = "Completá los campos obligatorios (*)."; return; }
  //la fecha no puede ser pasada (al modificar se permite dejar la que el pedido ya tenía)
  if (f.fecha_entrega.value < today() && f.fecha_entrega.value !== fechaOriginal) {
    f.fecha_entrega.classList.add("err"); m.textContent = "La fecha de entrega no puede ser anterior a hoy."; return;
  }

  //recorro las filas de productos y valido cada una
  const items = [];
  for (const tr of $$("#itemsBody tr")) {
    const prod = tr.querySelector(".p-prod"), color = tr.querySelector(".p-color"),
          qty = tr.querySelector(".p-qty"), price = tr.querySelector(".p-price");
    const oks = [!!prod.value, !!color.value, +qty.value >= 1, +price.value > 0];   //producto, color, cantidad, precio
    [prod, color, qty, price].forEach((i, k) => i.classList.toggle("err", !oks[k]));
    if (oks.includes(false)) { m.textContent = "Completá producto, color, cantidad y precio en todas las filas."; return; }
    items.push({ producto_id: +color.value, cantidad: +qty.value, precio: +price.value });   // producto_id = idproducto de ese color
  }

  //compilo los datos y los mando al backend
  const data = { cliente_id: +f.cliente.value, fecha_entrega: f.fecha_entrega.value, productos: items, total: calcTotal() };
  if (editId) data.estado = f.estado.value;

  $("#save").disabled = true; m.textContent = "";
  const res = editId ? await api.updateOrder(editId, data) : await api.createOrder(data);   // ← acá se conecta el backend
  $("#save").disabled = false;
  if (!res.ok) { m.textContent = res.error; return; }

  toast(editId ? "Cambios guardados ✓" : "Pedido guardado ✓");
  setTimeout(() => location.href = editId ? "pedidoDetalle.html?id=" + editId : "pedidos.html", 700);
});

//Carga el pedido en el formulario (solo al modificar)
async function loadOrder() {
  const r = await api.getOrder(editId);
  if (!r.ok) { $("#pMsg").textContent = r.error; $("#save").disabled = true; return; }
  const p = r.pedido, items = p.productos || [];

  $("#pageTitle").textContent = "Editar pedido " + nroPedido(p);
  $("#pageSub").textContent = "Modificá los datos del pedido";
  document.title = "Editar pedido · Sedería Georgi";
  $("#save").textContent = "Guardar cambios";
  $("#cancelBtn").href = "pedidoDetalle.html?id=" + editId;
  $("#estadoField").style.display = "";

  fechaOriginal = p.fecha_entrega || "";
  $("#fecha_entrega").removeAttribute("min");
  $("#cliente").value = p.cliente_id;
  $("#fecha_entrega").value = fechaOriginal;
  $("#estado").value = p.estado;

  $("#itemsBody").innerHTML = "";
  (items.length ? items : [{}]).forEach(i => {
    const tr = newRow();
    //busco la tela cuyo color es el que se guardó en el pedido (por idproducto)
    let idx = products.findIndex(x => x.colores.some(c => c.id === i.producto_id));
    //si ese producto ya no existe, intento al menos elegir la tela por nombre; el color hay que volver a elegirlo
    const sinColor = idx < 0;
    if (sinColor) idx = products.findIndex(x => x.nombre === i.nombre);
    if (idx >= 0) tr.querySelector(".p-prod").value = idx;
    fillColors(tr, sinColor ? 0 : i.producto_id);
    if (i.cantidad) tr.querySelector(".p-qty").value = i.cantidad;
    if (i.precio) tr.querySelector(".p-price").value = i.precio;   // el precio que tenía el pedido, no el actual
  });
  calcTotal();
}

(async function () {
  if (!editId) $("#fecha_entrega").min = today();
  const [clients, prods] = await Promise.all([api.getClients(), api.getProducts()]);
  products = prods;
  $("#cliente").innerHTML = `<option value="">Seleccione cliente</option>` +
    clients.map(c => `<option value="${+c.id}">${esc(c.nombre)} ${esc(c.apellido)}</option>`).join("");

  if (editId) await loadOrder();
  else { newRow(); calcTotal(); }
})();
