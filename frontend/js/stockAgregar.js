/* stockAgregar.js — registrar ingresos de stock */

// Obtener los elementos del formulario
const formStock = document.querySelector("#formStock");
const modoTela = document.querySelector("#modoTela");
const productoExistente = document.querySelector("#productoExistente");
const proveedor = document.querySelector("#proveedor");

// Contenedores de los campos
const contenedorExistente = document.querySelector("#contenedorExistente");
const contenedorNombre = document.querySelector("#contenedorNombre");
const contenedorColor = document.querySelector("#contenedorColor");
const contenedorPrecio = document.querySelector("#contenedorPrecio");
const contenedorStockInicial = document.querySelector("#contenedorStockInicial");

// Campos del formulario
const nombreTela = document.querySelector("#nombreTela");
const colorTela = document.querySelector("#colorTela");
const precioUnitario = document.querySelector("#precioUnitario");
const stockInicial = document.querySelector("#stockInicial");
const cantidad = document.querySelector("#cantidad");

// Mensajes y botón
const stockMensaje = document.querySelector("#stockMensaje");
const btnGuardarStock = document.querySelector("#btnGuardarStock");

// Listas de productos y proveedores
let productosStock = [];
let proveedores = [];


// Mostrar mensajes en pantalla
function mostrarMensaje(mensaje, error) {

    stockMensaje.textContent = mensaje;

    stockMensaje.style.color = error ? "#b42318" : "#267342";
}


// Cambiar los campos según el modo seleccionado
function cambiarModo() {

    const esNueva = modoTela.value === "nueva";

    // Mostrar u ocultar los campos
    contenedorExistente.hidden = esNueva;
    contenedorNombre.hidden = !esNueva;
    contenedorColor.hidden = !esNueva;
    contenedorPrecio.hidden = !esNueva;
    contenedorStockInicial.hidden = !esNueva;

    // Configurar los campos obligatorios
    productoExistente.required = !esNueva;
    nombreTela.required = esNueva;
    colorTela.required = esNueva;
    precioUnitario.required = esNueva;
    stockInicial.required = esNueva;

    // El stock inicial solo se modifica para una tela nueva
    stockInicial.readOnly = !esNueva;

    if (esNueva) {

        stockInicial.value = "0";
        precioUnitario.value = "";

    } else {

        actualizarStockInicial();

    }

    mostrarMensaje("", false);
}


// Cargar los proveedores desde el backend
async function cargarProveedores() {

    proveedor.innerHTML =
        '<option value="">Cargando proveedores...</option>';

    try {

        const respuesta = await request("GET", "/proveedores");

        if (!respuesta.ok) {

            proveedor.innerHTML =
                '<option value="">Error al cargar proveedores</option>';

            mostrarMensaje(
                respuesta.error || "No se pudieron cargar los proveedores.",
                true
            );

            console.error("Error al cargar proveedores:", respuesta);

            return;
        }

        // Guardar los proveedores recibidos
        proveedores = respuesta.proveedores || [];

        // Preparar la opción inicial
        proveedor.innerHTML =
            '<option value="">Seleccioná un proveedor</option>';

        // Agregar cada proveedor al desplegable
        proveedores.forEach(function (item) {

            const opcion = document.createElement("option");

            opcion.value = item.id;
            opcion.textContent = item.nombre;

            proveedor.appendChild(opcion);

        });

    } catch (error) {

        console.error("Error al cargar proveedores:", error);

        proveedor.innerHTML =
            '<option value="">No se pudieron cargar los proveedores</option>';

        mostrarMensaje(
            "No se pudieron cargar los proveedores.",
            true
        );
    }
}


// Cargar las telas y sus colores desde el backend
async function cargarProductosStock() {

    productoExistente.innerHTML =
        '<option value="">Cargando telas...</option>';

    try {

        const respuesta = await request("GET", "/stock");

        if (!respuesta.ok) {

            productoExistente.innerHTML =
                '<option value="">Error al cargar las telas</option>';

            mostrarMensaje(
                respuesta.error || "No se pudieron cargar las telas.",
                true
            );

            console.error("Error al cargar el stock:", respuesta);

            return;
        }

        // Guardar los productos recibidos
        productosStock = respuesta.stock || [];

        productoExistente.innerHTML =
            '<option value="">Seleccioná una tela y un color</option>';

        // Agregar cada tela al desplegable
        productosStock.forEach(function (producto) {

            const opcion = document.createElement("option");

            opcion.value = producto.producto_color_id;

            opcion.textContent =
                producto.nombre + " - " + producto.color +
                " | Stock: " +
                Number(producto.cantidad).toFixed(2) + " m";

            productoExistente.appendChild(opcion);

        });

        actualizarStockInicial();

    } catch (error) {

        console.error("Error al cargar las telas:", error);

        mostrarMensaje(
            "No se pudieron cargar las telas.",
            true
        );
    }
}


// Mostrar el stock y el precio de la tela seleccionada
function actualizarStockInicial() {

    const idSeleccionado = Number(productoExistente.value);

    const producto = productosStock.find(function (item) {

        return Number(item.producto_color_id) === idSeleccionado;

    });

    if (producto) {

        stockInicial.value = Number(producto.cantidad).toFixed(2);

        precioUnitario.value = Number(producto.precio).toFixed(2);

    } else {

        stockInicial.value = "0";

        precioUnitario.value = "";

    }
}


// Escuchar los cambios del formulario
modoTela.addEventListener("change", cambiarModo);

productoExistente.addEventListener(
    "change",
    actualizarStockInicial
);


// Limpiar el formulario
formStock.addEventListener("reset", function () {

    setTimeout(function () {

        modoTela.value = "existente";

        cambiarModo();

        mostrarMensaje("", false);

    }, 0);

});


// Guardar el ingreso de stock
formStock.addEventListener("submit", async function (evento) {

    evento.preventDefault();

    const esNueva = modoTela.value === "nueva";

    const metros = Number(cantidad.value);

    // Validar que se haya seleccionado un proveedor
    if (!proveedor.value) {

        mostrarMensaje(
            "Seleccioná un proveedor para registrar el ingreso.",
            true
        );

        proveedor.focus();

        return;
    }


    // Validar la cantidad que ingresa al stock
    const cantidadValida =
        cantidad.value.trim() !== "" &&
        Number.isFinite(metros) &&
        metros > 0 &&
        Math.abs(metros * 100 - Math.round(metros * 100)) < 0.000001;

    if (!cantidadValida) {

        mostrarMensaje(
            "Ingresá una cantidad mayor que cero, con hasta dos decimales.",
            true
        );

        cantidad.focus();

        return;
    }


    let datosIngreso;


    // Preparar los datos según el tipo de tela
    if (esNueva) {

        const nombre = nombreTela.value.trim();

        const color = colorTela.value.trim();

        const precio = Number(precioUnitario.value);

        const inicial = Number(stockInicial.value);


        // Validar el nombre de la tela
        if (!nombre || nombre.length > 45) {

            mostrarMensaje(
                "Ingresá un nombre de tela de hasta 45 caracteres.",
                true
            );

            nombreTela.focus();

            return;
        }


        // Validar el color
        if (!color || color.length > 50) {

            mostrarMensaje(
                "Ingresá un color de hasta 50 caracteres.",
                true
            );

            colorTela.focus();

            return;
        }


        // Validar el precio unitario
        const precioValido =
            precioUnitario.value.trim() !== "" &&
            Number.isFinite(precio) &&
            precio >= 0 &&
            Math.abs(precio * 100 - Math.round(precio * 100)) < 0.000001;

        if (!precioValido) {

            mostrarMensaje(
                "Ingresá un precio válido, con hasta dos decimales.",
                true
            );

            precioUnitario.focus();

            return;
        }


        // Validar el stock inicial
        const stockInicialValido =
            stockInicial.value.trim() !== "" &&
            Number.isFinite(inicial) &&
            inicial >= 0 &&
            Math.abs(inicial * 100 - Math.round(inicial * 100)) < 0.000001;

        if (!stockInicialValido) {

            mostrarMensaje(
                "El stock inicial debe ser igual o mayor que cero y tener hasta dos decimales.",
                true
            );

            stockInicial.focus();

            return;
        }


        // Datos para registrar una tela nueva
        datosIngreso = {

            modo: "nueva",

            nombre: nombre,

            color: color,

            precio_unitario: precio,

            stock_inicial: inicial,

            cantidad: metros,

            proveedor_id: Number(proveedor.value)

        };

    } else {

        // Buscar la tela seleccionada
        const productoColorId = Number(productoExistente.value);

        const producto = productosStock.find(function (item) {

            return Number(item.producto_color_id) === productoColorId;

        });


        if (!producto) {

            mostrarMensaje(
                "Seleccioná una tela y un color.",
                true
            );

            productoExistente.focus();

            return;
        }


        // Datos para sumar metros a una tela existente
        datosIngreso = {

            modo: "existente",

            producto_color_id: productoColorId,

            cantidad: metros,

            precio_unitario: Number(producto.precio),

            proveedor_id: Number(proveedor.value)

        };

    }


    // Desactivar el botón mientras se guarda
    btnGuardarStock.disabled = true;

    btnGuardarStock.textContent = "Guardando...";

    mostrarMensaje("", false);


    try {

        console.log("Datos enviados:", datosIngreso);

        const respuesta = await request(
            "POST",
            "/stock/ingresos",
            datosIngreso
        );

        console.log("Respuesta del servidor:", respuesta);


        if (!respuesta.ok) {

            mostrarMensaje(
                respuesta.error || "No se pudo registrar el ingreso.",
                true
            );

            return;
        }


        // Preparar el mensaje antes de limpiar el formulario
        const stockFinal = esNueva
            ? Number(stockInicial.value) + metros
            : null;

        const mensajeExito = esNueva
            ? "Tela nueva registrada correctamente. Stock final: " +
              stockFinal.toFixed(2) + " metros."
            : "Ingreso registrado correctamente.";


        // Limpiar el formulario
        formStock.reset();


        // Actualizar la lista con el stock nuevo
        await cargarProductosStock();


        // Mostrar el mensaje de confirmación
        mostrarMensaje(mensajeExito, false);


    } catch (error) {

        console.error("Error al guardar el ingreso:", error);

        mostrarMensaje(
            "No se pudo conectar con el servidor.",
            true
        );

    } finally {

        // Volver a habilitar el botón
        btnGuardarStock.disabled = false;

        btnGuardarStock.textContent = "Guardar ingreso";

    }

});


// Preparar el formulario al abrir la pantalla
cambiarModo();

cargarProductosStock();

cargarProveedores();