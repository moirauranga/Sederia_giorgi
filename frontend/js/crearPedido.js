/* crearPedido.js — formulario de alta de pedido (cliente + productos) */
let products = [];

//fecha de hoy en formato yyyy-mm-dd (hora local), para no permitir fechas de entrega pasadas
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

function newRow() { //agrega una fila vacía a la tabla de productos
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><select class="input p-prod" aria-label="Producto"><option value="">Seleccionar</option>
      ${products.map(p => `<option value="${+p.id}">${esc(p.nombre)}</option>`).join("")}</select></td>
    <td><select class="input p-color" aria-label="Color" disabled><option value="">Color</option></select></td>
    <td><input class="input p-qty" type="number" min="1" step="1" value="1" aria-label="Cantidad"></td>
    <td><input class="input p-price" type="number" min="0" step="any" value="0" aria-label="Precio unitario"></td>
    <td class="p-sub">$0</td>
    <td><button class="act" type="button" data-rm aria-label="Quitar producto">✕</button></td>`;
  $("#itemsBody").appendChild(tr);
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

//al elegir un producto: cargo sus colores y su precio sugerido
$("#itemsBody").addEventListener("change", e => {
  if (!e.target.classList.contains("p-prod")) return;
  const tr = e.target.closest("tr"), col = tr.querySelector(".p-color");
  const p = products.find(x => x.id === +e.target.value);
  col.innerHTML = `<option value="">Color</option>` + (p ? (p.colores || []).map(c => `<option>${esc(c)}</option>`).join("") : "");
  col.disabled = !p;
  tr.querySelector(".p-price").value = p ? p.precio : 0;
  calcTotal();
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
  if (f.fecha_entrega.value < today()) { f.fecha_entrega.classList.add("err"); m.textContent = "La fecha de entrega no puede ser anterior a hoy."; return; }

  //recorro las filas de productos y valido cada una
  const items = [];
  for (const tr of $$("#itemsBody tr")) {
    const prod = tr.querySelector(".p-prod"), color = tr.querySelector(".p-color"),
          qty = tr.querySelector(".p-qty"), price = tr.querySelector(".p-price");
    const oks = [!!prod.value, !!color.value, +qty.value >= 1, +price.value > 0];   //producto, color, cantidad, precio
    [prod, color, qty, price].forEach((i, k) => i.classList.toggle("err", !oks[k]));
    if (oks.includes(false)) { m.textContent = "Completá producto, color, cantidad y precio en todas las filas."; return; }
    items.push({ producto_id: +prod.value, color: color.value, cantidad: +qty.value, precio: +price.value });
  }

  //compilo los datos y los mando al backend para crear el pedido
  const data = { cliente_id: +f.cliente.value, fecha_entrega: f.fecha_entrega.value, productos: items, total: calcTotal() };

  $("#save").disabled = true; m.textContent = "";
  const res = await api.createOrder(data);   // ← acá se conecta el backend
  $("#save").disabled = false;
  if (!res.ok) { m.textContent = res.error; return; }

  toast("Pedido guardado ✓");
  setTimeout(() => location.href = "pedidos.html", 700);
});

(async function () {
  $("#fecha_entrega").min = today();
  const [clients, prods] = await Promise.all([api.getClients(), api.getProducts()]);
  products = prods;
  $("#cliente").innerHTML = `<option value="">Seleccione cliente</option>` +
    clients.map(c => `<option value="${+c.id}">${esc(c.nombre)} ${esc(c.apellido)}</option>`).join("");
  newRow(); calcTotal();
})();
