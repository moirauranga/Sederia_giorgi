/* crearPedido.js — formulario de pedido (cliente + productos)
   Sin parámetros: crearPedido.html → crea un pedido nuevo
   Con ?id=16: crearPedido.html?id=16 → modifica el pedido 16

   products viene de GET /productos:
   [
     {
       nombre: "Gabardina",
       colores: [
         { id, color, precio }
       ]
     }
   ]

   El ID de cada color corresponde a producto_color.id.
*/

let products = [];

const editId = +new URLSearchParams(location.search).get("id") || 0;

// Fecha que tenía el pedido al abrirlo, al modificar
let fechaOriginal = "";

// Fecha de hoy en formato yyyy-mm-dd
const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

// Agregar una fila vacía a la tabla de productos
function newRow() {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>
      <select class="input p-prod" aria-label="Producto">
        <option value="">Seleccionar</option>
        ${products.map((p, i) =>
          `<option value="${i}">${esc(p.nombre)}</option>`
        ).join("")}
      </select>
    </td>

    <td>
      <select class="input p-color" aria-label="Color" disabled>
        <option value="">Color</option>
      </select>
    </td>

    <td>
      <input
        class="input p-qty"
        type="number"
        min="0.01"
        step="0.01"
        value="1"
        aria-label="Cantidad en metros"
      >
    </td>

    <td>
      <input
        class="input p-price"
        type="number"
        min="0"
        step="any"
        value="0"
        aria-label="Precio unitario"
      >
    </td>

    <td class="p-sub">$0</td>

    <td>
      <button
        class="act"
        type="button"
        data-rm
        aria-label="Quitar producto"
      >✕</button>
    </td>
  `;

  $("#itemsBody").appendChild(tr);

  return tr;
}

// Cargar los colores de la tela seleccionada
function fillColors(tr, varianteId) {
  const col = tr.querySelector(".p-color");
  const sel = tr.querySelector(".p-prod").value;

  const p = sel === "" ? null : products[+sel];

  col.innerHTML =
    `<option value="">${
      p && !p.colores.length ? "Sin colores" : "Color"
    }</option>` +
    (
      p
        ? p.colores.map(c =>
            `<option value="${+c.id}">${esc(c.color || "Sin color")}</option>`
          ).join("")
        : ""
    );

  col.disabled = !p;

  if (varianteId) {
    col.value = varianteId;
  }
}

// Calcular el subtotal de una fila
function calcRow(tr) {
  const cantidad = Number(tr.querySelector(".p-qty").value) || 0;
  const precio = Number(tr.querySelector(".p-price").value) || 0;

  return cantidad * precio;
}

// Actualizar los subtotales y el total del pedido
function calcTotal() {
  let total = 0;

  $$("#itemsBody tr").forEach(tr => {
    const subtotal = calcRow(tr);

    total += subtotal;

    tr.querySelector(".p-sub").textContent = money(subtotal);
  });

  $("#total").textContent = money(total);

  return total;
}

// Cuando cambia el producto o el color
$("#itemsBody").addEventListener("change", e => {
  const tr = e.target.closest("tr");

  if (!tr) return;

  if (e.target.classList.contains("p-prod")) {
    // Al elegir una tela, cargar sus colores
    fillColors(tr);

    // Reiniciar el precio
    tr.querySelector(".p-price").value = 0;

    calcTotal();

  } else if (e.target.classList.contains("p-color")) {
    // Al elegir un color, cargar su precio
    const p = products[+tr.querySelector(".p-prod").value];

    const c = p && p.colores.find(
      x => x.id === +e.target.value
    );

    tr.querySelector(".p-price").value = c ? c.precio : 0;

    calcTotal();
  }
});

// Recalcular los importes al escribir cantidades o precios
$("#itemsBody").addEventListener("input", calcTotal);

// Quitar una fila, dejando al menos una
$("#itemsBody").addEventListener("click", e => {
  const b = e.target.closest("[data-rm]");

  if (!b) return;

  if ($$("#itemsBody tr").length > 1) {
    b.closest("tr").remove();

    calcTotal();
  }
});

// Agregar una fila de producto
$("#addItem").addEventListener("click", () => {
  newRow();

  calcTotal();
});

// Guardar o modificar un pedido
$("#pForm").addEventListener("submit", async e => {
  e.preventDefault();

  const f = e.target;
  const m = $("#pMsg");

  // Si estamos editando un pedido, solamente modificamos el estado
  if (editId) {

    const estado = f.estado.value;

    if (!estado) {
      m.textContent = "Seleccioná un estado.";
      return;
    }

    $("#save").disabled = true;
    m.textContent = "";

    try {
      // Enviar únicamente el nuevo estado al backend
      const res = await request(
        "PATCH",
        "/pedidos/" + editId + "/estado",
        { estado: estado }
      );

      if (!res.ok) {
        m.textContent = res.error || "No se pudo modificar el estado.";
        return;
      }

      toast("Estado actualizado ✓");

      setTimeout(() => {
        location.href = "pedidoDetalle.html?id=" + editId;
      }, 700);

    } catch (error) {
      console.error(error);

      m.textContent = "No se pudo conectar con el servidor.";

    } finally {
      $("#save").disabled = false;
    }

    return;
  }

  // Desde acá continúa el código original para crear pedidos nuevos
  let bad = false;

  // Comprobar los campos obligatorios
  $$("#pForm [required]").forEach(i => {
    const ko = !i.value;

    i.classList.toggle("err", ko);

    if (ko) bad = true;
  });

  if (bad) {
    m.textContent = "Completá los campos obligatorios (*).";
    return;
  }

  // La fecha no puede ser pasada, salvo que sea la original
  // del pedido que estamos modificando
  if (
    f.fecha_entrega.value < today() &&
    f.fecha_entrega.value !== fechaOriginal
  ) {
    f.fecha_entrega.classList.add("err");

    m.textContent = "La fecha de entrega no puede ser anterior a hoy.";

    return;
  }

  // Recorrer las filas y validar cada producto
  const items = [];

  for (const tr of $$("#itemsBody tr")) {
    const prod = tr.querySelector(".p-prod");
    const color = tr.querySelector(".p-color");
    const qty = tr.querySelector(".p-qty");
    const price = tr.querySelector(".p-price");

    const cantidad = Number(qty.value);
    const precio = Number(price.value);

    // Cantidad positiva con un máximo de dos decimales
    const cantidadValida =
      qty.value !== "" &&
      Number.isFinite(cantidad) &&
      cantidad > 0 &&
      Math.abs(
        cantidad * 100 - Math.round(cantidad * 100)
      ) < 0.000001;

    const precioValido =
      price.value !== "" &&
      Number.isFinite(precio) &&
      precio > 0;

    const oks = [
      !!prod.value,
      !!color.value,
      cantidadValida,
      precioValido
    ];

    // Marcar los campos que tengan errores
    [prod, color, qty, price].forEach((i, k) => {
      i.classList.toggle("err", !oks[k]);
    });

    if (oks.includes(false)) {
      m.textContent =
        "Completá producto, color, cantidad y precio correctamente en todas las filas.";

      return;
    }

    // producto_id corresponde a producto_color.id
    items.push({
      producto_id: Number(color.value),
      cantidad: cantidad,
      precio: precio
    });
  }

  // Preparar los datos que se envían al backend
  const data = {
    cliente_id: Number(f.cliente.value),
    fecha_entrega: f.fecha_entrega.value,
    productos: items,
    total: calcTotal()
  };

  if (editId) {
    data.estado = f.estado.value;
  }

  // Evitar envíos repetidos
  $("#save").disabled = true;
  m.textContent = "";

  try {
    const res = editId
      ? await api.updateOrder(editId, data)
      : await api.createOrder(data);

    if (!res.ok) {
      m.textContent = res.error || "No se pudo guardar el pedido.";
      return;
    }

    toast(editId ? "Cambios guardados ✓" : "Pedido guardado ✓");

    setTimeout(() => {
      location.href = editId
        ? "pedidoDetalle.html?id=" + editId
        : "pedidos.html";
    }, 700);

  } catch (error) {
    console.error(error);

    m.textContent = "No se pudo conectar con el servidor.";

  } finally {
    $("#save").disabled = false;
  }
});

// Cargar los datos de un pedido existente
async function loadOrder() {
  const r = await api.getOrder(editId);

  if (!r.ok) {
    $("#pMsg").textContent = r.error;
    $("#save").disabled = true;
    return;
  }

  const p = r.pedido;
  const items = p.productos || [];

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

  // En la edición no se modifican los datos del cliente ni la fecha
$("#cliente").disabled = true;
$("#fecha_entrega").disabled = true;

// Ocultar la sección de productos: no se deben volver a cargar
$("#itemsBody").closest(".form").style.display = "none";

// Mostrar que solamente se puede cambiar el estado
$("#pageSub").textContent = "Modificá únicamente el estado del pedido";

  $("#itemsBody").innerHTML = "";

  (items.length ? items : [{}]).forEach(i => {
    const tr = newRow();

    // Buscar la tela a la que pertenece el color guardado
    let idx = products.findIndex(x =>
      x.colores.some(c => c.id === i.producto_id)
    );

    // Si no existe el color, intentar encontrar la tela por nombre
    const sinColor = idx < 0;

    if (sinColor) {
      idx = products.findIndex(x => x.nombre === i.nombre);
    }

    if (idx >= 0) {
      tr.querySelector(".p-prod").value = idx;
    }

    fillColors(tr, sinColor ? 0 : i.producto_id);

    if (i.cantidad != null) {
      tr.querySelector(".p-qty").value = i.cantidad;
    }

    // Mantener el precio original del pedido
    if (i.precio != null) {
      tr.querySelector(".p-price").value = i.precio;
    }
  });

  calcTotal();
}

// Cargar clientes y productos al abrir el formulario
(async function () {
  if (!editId) {
    $("#fecha_entrega").min = today();
  }

  try {
    const [clients, prods] = await Promise.all([
      api.getClients(),
      api.getProducts()
    ]);

    products = prods;

    $("#cliente").innerHTML =
      `<option value="">Seleccione cliente</option>` +
      clients.map(c =>
        `<option value="${+c.id}">${esc(c.nombre)} ${esc(c.apellido)}</option>`
      ).join("");

    if (editId) {
      await loadOrder();
    } else {
      newRow();
      calcTotal();
    }

  } catch (error) {
    console.error(error);

    $("#pMsg").textContent =
      "No se pudieron cargar los clientes y productos.";
  }
})();
