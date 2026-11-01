
/* dashboard.js — pantalla de inicio */

// Cantidad máxima para considerar que una variante tiene stock bajo
const LIMITE_STOCK_BAJO = 5;

// Función principal del dashboard
(async function () {

    // Obtener clientes, pedidos y stock del backend
    const [clientes, pedidos, stock] = await Promise.all([
        api.getClients(),
        api.getOrders(),
        api.getStock()
    ]);

    // Mostrar la cantidad de clientes registrados
    $("#sClientes").textContent = clientes.length;

    // Contar los pedidos pendientes
    const pendientes = pedidos.filter(function (pedido) {
        return pedido.estado === "Pendiente";
    });

    $("#sPendientes").textContent = pendientes.length;

    // Obtener el mes y el año actuales
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    // Contar los pedidos cuya fecha de entrega es de este mes
    const pedidosDelMes = pedidos.filter(function (pedido) {

        // Comprobar que el pedido tenga fecha de entrega
        if (!pedido.fecha_entrega) {
            return false;
        }

        // Convertir la fecha de entrega
        const fechaEntrega = new Date(
            pedido.fecha_entrega.slice(0, 10) + "T00:00:00"
        );

        // Comparar el mes y el año
        return fechaEntrega.getMonth() === mesActual &&
               fechaEntrega.getFullYear() === anioActual;
    });

    // Mostrar la cantidad de entregas del mes
    $("#sPedidosMes").textContent = pedidosDelMes.length;

    // Contar las variantes que tienen cinco metros o menos
    const stockBajo = stock.filter(function (producto) {
        return Number(producto.cantidad) <= LIMITE_STOCK_BAJO;
    });

    // Mostrar la cantidad de variantes con stock bajo
    $("#sStockBajo").textContent = stockBajo.length;

    // Filtrar los pedidos que todavía no tienen fecha pasada
    const proximos = pedidos.filter(function (pedido) {

        // Si no tiene fecha de entrega, no se incluye
        if (!pedido.fecha_entrega) {
            return false;
        }

        // Convertir la fecha
        const fechaEntrega = new Date(
            pedido.fecha_entrega.slice(0, 10) + "T00:00:00"
        );

        // Comprobar que la fecha sea hoy o posterior
        return fechaEntrega >= hoy;
    });

    // Ordenar los pedidos por fecha de entrega
    proximos.sort(function (a, b) {
        return a.fecha_entrega.localeCompare(b.fecha_entrega);
    });

    // Mostrar solamente los cinco próximos pedidos
    const pedidosMostrar = proximos.slice(0, 5);

    // Si no hay pedidos próximos, mostrar un mensaje
    if (pedidosMostrar.length === 0) {

        $("#ordersBody").innerHTML = `
            <tr>
                <td colspan="5" class="empty">
                    No hay pedidos próximos a entregar.
                </td>
            </tr>
        `;

        return;
    }

    // Construir las filas de la tabla
    $("#ordersBody").innerHTML = pedidosMostrar.map(function (pedido) {

        // Adaptar el nombre de la clase para el estado
        let claseEstado = pedido.estado;

        if (pedido.estado === "En preparación") {
            claseEstado = "prep";
        }

        return `
            <tr>
                <td>${esc(nroPedido(pedido))}</td>
                <td>${esc(pedido.nombre + " " + pedido.apellido)}</td>
                <td>${esc(fecha(pedido.fecha_entrega))}</td>
                <td>
                    <span class="pill ${esc(claseEstado)}">
                        ${esc(pedido.estado)}
                    </span>
                </td>
                <td>${esc(money(pedido.total))}</td>
            </tr>
        `;

    }).join("");

})();
