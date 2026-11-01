
/* proveedores.js - Administrar proveedores */

// Lista de proveedores y configuración de paginación
let proveedores = [];
let pagina = 1;
const POR_PAGINA = 8;

// Cargar los proveedores desde el backend
async function cargarProveedores() {
    proveedores = await api.getProviders();
    pagina = 1;
    mostrarProveedores();
}

// Filtrar proveedores según lo escrito en el buscador
function filtrarProveedores() {
    const busqueda = $("#q").value.trim().toLowerCase();

    return proveedores.filter(function (proveedor) {
        return (
            `${proveedor.nombre} ${proveedor.cuit} ${proveedor.telefono} ${proveedor.email}`
            .toLowerCase()
            .includes(busqueda)
        );
    });
}

// Mostrar los proveedores en la tabla
function mostrarProveedores() {
    const lista = filtrarProveedores();

    const totalPaginas = Math.max(
        1,
        Math.ceil(lista.length / POR_PAGINA)
    );

    pagina = Math.min(pagina, totalPaginas);

    // Obtener los proveedores correspondientes a la página actual
    const inicio = (pagina - 1) * POR_PAGINA;
    const proveedoresPagina = lista.slice(
        inicio,
        inicio + POR_PAGINA
    );

    // Mostrar las filas de la tabla
    $("#providerBody").innerHTML = proveedoresPagina.length
        ? proveedoresPagina.map(function (p) {
            return `
                <tr>
                    <td>${esc(p.nombre)}</td>
                    <td>${esc(p.cuit)}</td>
                    <td>${esc(p.telefono)}</td>
                    <td>${esc(p.email)}</td>
                    <td>${esc(p.localidad)}</td>
                    <td>
                        <button class="act" data-edit="${p.id}">
                            Modificar
                        </button>

                        <button class="act" data-del="${p.id}">
                            Eliminar
                        </button>
                    </td>
                </tr>
            `;
        }).join("")
        : `
            <tr>
                <td colspan="6" class="empty">
                    No se encontraron proveedores.
                </td>
            </tr>
        `;

    // Crear los botones de paginación
    let botones = `
        <button ${pagina === 1 ? "disabled" : ""}
                data-p="${pagina - 1}">
            ‹
        </button>
    `;

    for (let i = 1; i <= totalPaginas; i++) {
        botones += `
            <button
                class="${i === pagina ? "on" : ""}"
                data-p="${i}">
                ${i}
            </button>
        `;
    }

    botones += `
        <button ${pagina === totalPaginas ? "disabled" : ""}
                data-p="${pagina + 1}">
            ›
        </button>
    `;

    $("#pager").innerHTML = botones;
}

// Mostrar el formulario para registrar un proveedor
function nuevoProveedor() {
    $("#providerForm").reset();

    $("#providerId").value = "";
    $("#formTitle").textContent = "Nuevo proveedor";
    $("#btnGuardar").textContent = "Guardar proveedor";

    $("#providerForm").hidden = false;
}

// Ocultar y limpiar el formulario
function cancelarFormulario() {
    $("#providerForm").reset();
    $("#providerId").value = "";
    $("#providerForm").hidden = true;
}

// Cargar los datos de un proveedor en el formulario
function modificarProveedor(id) {
    const proveedor = proveedores.find(function (p) {
        return Number(p.id) === Number(id);
    });

    if (!proveedor) {
        toast("No se encontró el proveedor.");
        return;
    }

    $("#providerId").value = proveedor.id;
    $("#nombre").value = proveedor.nombre;
    $("#cuit").value = proveedor.cuit;
    $("#telefono").value = proveedor.telefono;
    $("#email").value = proveedor.email;
    $("#calle").value = proveedor.calle;
    $("#numero").value = proveedor.numero || "";
    $("#localidad").value = proveedor.localidad;
    $("#obs").value = proveedor.observaciones || "";

    $("#formTitle").textContent = "Modificar proveedor";
    $("#btnGuardar").textContent = "Guardar cambios";

    $("#providerForm").hidden = false;
}

// Guardar un proveedor nuevo o modificar uno existente
$("#providerForm").addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const id = $("#providerId").value;

    // Quitar guiones y espacios del CUIT
    const cuit = $("#cuit").value.replace(/[-\s]/g, "");

    // Preparar los datos que se enviarán al backend
    const datos = {
        nombre: $("#nombre").value.trim(),
        cuit: cuit,
        telefono: $("#telefono").value.trim(),
        email: $("#email").value.trim(),
        calle: $("#calle").value.trim(),
        numero: $("#numero").value.trim(),
        localidad: $("#localidad").value.trim(),
        obs: $("#obs").value.trim()
    };

    // Comprobar que el CUIT tenga 11 números
    if (!/^\d{11}$/.test(cuit)) {
        toast("El CUIT debe tener 11 números.");
        return;
    }

    $("#btnGuardar").disabled = true;

    let respuesta;

    if (id) {
        // Si hay un ID, modificamos el proveedor
        respuesta = await api.updateProvider(id, datos);
    } else {
        // Si no hay ID, registramos uno nuevo
        respuesta = await api.createProvider(datos);
    }

    $("#btnGuardar").disabled = false;

    if (respuesta.ok) {
        toast(id ? "Proveedor modificado." : "Proveedor registrado.");
        cancelarFormulario();
        cargarProveedores();
    } else {
        toast(respuesta.error);
    }
});

// Escuchar el botón Nuevo proveedor
$("#btnNuevo").addEventListener("click", nuevoProveedor);

// Escuchar el botón Cancelar
$("#btnCancelar").addEventListener("click", cancelarFormulario);

// Buscar proveedores mientras se escribe
$("#q").addEventListener("input", function () {
    pagina = 1;
    mostrarProveedores();
});

// Controlar los botones de paginación
$("#pager").addEventListener("click", function (evento) {
    const boton = evento.target.closest("[data-p]");

    if (boton && !boton.disabled) {
        pagina = Number(boton.dataset.p);
        mostrarProveedores();
    }
});

// Controlar los botones Modificar y Eliminar de la tabla
$("#providerBody").addEventListener("click", async function (evento) {

    // Detectar si se presionó Modificar
    const botonModificar = evento.target.closest("[data-edit]");

    if (botonModificar) {
        modificarProveedor(botonModificar.dataset.edit);
        return;
    }

    // Detectar si se presionó Eliminar
    const botonEliminar = evento.target.closest("[data-del]");

    if (botonEliminar) {
        const id = botonEliminar.dataset.del;

        if (confirm("¿Estás segura de que querés eliminar este proveedor?")) {
            const respuesta = await api.deleteProvider(id);

            if (respuesta.ok) {
                toast("Proveedor eliminado.");
                cargarProveedores();
            } else {
                toast(respuesta.error);
            }
        }
    }
});

// Al entrar a la página, cargar los proveedores
cargarProveedores();
