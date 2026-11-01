/* stock.js — consultar y eliminar variantes del stock */

// Obtener los elementos de la pantalla
const stockBody = document.querySelector("#stockBody");
const stockMensaje = document.querySelector("#stockMensaje");
const stockBuscar = document.querySelector("#stockBuscar");

// Guardar los productos recibidos del backend
let productosStock = [];

// Mostrar mensajes en pantalla
function mostrarMensajeStock(mensaje, error) {
  stockMensaje.textContent = mensaje;
  stockMensaje.style.color = error ? "#b42318" : "#267342";
}

// Dar formato al precio en pesos argentinos
function formatearPrecio(precio) {
  return Number(precio).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS"
  });
}

// Mostrar los productos en la tabla
function mostrarStock(productos) {

  if (productos.length === 0) {
    stockBody.innerHTML = `
      <tr>
        <td colspan="7">
          No se encontraron telas.
        </td>
      </tr>
    `;
    return;
  }

  stockBody.innerHTML = productos.map(function (producto) {

    // Determinar el estado según los metros disponibles
    const sinStock = Number(producto.cantidad) <= 0;

    const estado = sinStock ? "Sin stock" : "Disponible";

    const claseEstado = sinStock
      ? "stock-sin-stock"
      : "stock-disponible";

    return `
      <tr>
        <td>${esc(producto.nombre)}</td>

        <td>${esc(producto.color)}</td>

        <td>${Number(producto.cantidad).toFixed(2)} m</td>

        <td>${formatearPrecio(producto.precio)} / m</td>

        <td>${esc(producto.proveedor)}</td>

        <td>
          <span class="stock-estado ${claseEstado}">
            ${estado}
          </span>
        </td>

        <td>
          <button
            type="button"
            class="btn-eliminar-stock"
            data-id="${Number(producto.producto_color_id)}"
          >
            Eliminar
          </button>
        </td>
      </tr>
    `;

  }).join("");
}

// Filtrar las telas por nombre o color
function buscarStock() {

  const busqueda = stockBuscar.value.trim().toLowerCase();

  const productosFiltrados = productosStock.filter(
    function (producto) {
      return (
        producto.nombre.toLowerCase().includes(busqueda) ||
        producto.color.toLowerCase().includes(busqueda)
      );
    }
  );

  mostrarStock(productosFiltrados);
}

// Consultar el stock al backend
async function cargarStock() {

  stockBody.innerHTML = `
    <tr>
      <td colspan="7">Cargando stock...</td>
    </tr>
  `;

  mostrarMensajeStock("", false);

  try {

    // Solicitar todos los productos y colores con su stock
    const respuesta = await request("GET", "/stock");

    if (!respuesta.ok) {

      stockBody.innerHTML = `
        <tr>
          <td colspan="7">No se pudo cargar el stock.</td>
        </tr>
      `;

      mostrarMensajeStock(
        respuesta.error || "No se pudo consultar el stock.",
        true
      );

      return;
    }

    // Guardar los datos recibidos
    productosStock = respuesta.stock || [];

    // Mostrar todos los productos
    buscarStock();

  } catch (error) {

    console.error("Error al cargar el stock:", error);

    stockBody.innerHTML = `
      <tr>
        <td colspan="7">Error al cargar el stock.</td>
      </tr>
    `;

    mostrarMensajeStock(
      "No se pudo conectar con el servidor.",
      true
    );
  }
}

// Escuchar los clics en los botones Eliminar
stockBody.addEventListener("click", async function (e) {

  // Comprobar si se hizo clic en un botón Eliminar
  const boton = e.target.closest(".btn-eliminar-stock");

  if (!boton) {
    return;
  }

  // Obtener el ID de la variante seleccionada
  const productoColorId = Number(boton.dataset.id);

  // Buscar los datos de esa variante
  const producto = productosStock.find(function (item) {
    return Number(item.producto_color_id) === productoColorId;
  });

  if (!producto) {
    return;
  }

  // Pedir confirmación antes de dar de baja
  const confirmar = confirm(
    "¿Querés dar de baja " +
    producto.nombre + " - " + producto.color + "?\n\n" +
    "La variante dejará de aparecer en Stock y no podrá utilizarse " +
    "en nuevos pedidos. Los registros anteriores se conservarán."
  );

  if (!confirmar) {
    return;
  }

  boton.disabled = true;
  boton.textContent = "Eliminando...";

  try {

    // Enviar la petición para dar de baja la variante
    const respuesta = await request(
      "DELETE",
      "/stock/variantes/" + productoColorId
    );

    if (!respuesta.ok) {
      mostrarMensajeStock(
        respuesta.error || "No se pudo dar de baja la variante.",
        true
      );

      boton.disabled = false;
      boton.textContent = "Eliminar";
      return;
    }

    // Mostrar el mensaje de confirmación
    mostrarMensajeStock(
      "La variante fue dada de baja correctamente.",
      false
    );

    // Volver a consultar el stock actualizado
    await cargarStock();

  } catch (error) {

    console.error("Error al eliminar la variante:", error);

    mostrarMensajeStock(
      "No se pudo conectar con el servidor.",
      true
    );

    boton.disabled = false;
    boton.textContent = "Eliminar";
  }
});

// Buscar mientras se escribe
stockBuscar.addEventListener("input", buscarStock);

// Consultar el stock al abrir la pantalla
cargarStock();
