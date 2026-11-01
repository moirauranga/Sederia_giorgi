
const db = require("../db");

// Estados permitidos para un pedido
const ESTADOS = ["Pendiente", "En preparación", "Listo", "Entregado"];

// Manejar errores de tablas o columnas
function fallo(err, res, next) {
    if (
        err &&
        (
            err.code === "ER_NO_SUCH_TABLE" ||
            err.code === "ER_BAD_FIELD_ERROR"
        )
    ) {
        console.error(err);

        return res.status(500).json({
            ok: false,
            error: "Error de base de datos: " + err.sqlMessage
        });
    }

    next(err);
}

// Validar los datos recibidos del formulario
function validar(b, conEstado) {
    const cliente_id = Number(b.cliente_id);
    const fecha = String(b.fecha_entrega || "").trim();
    const items = Array.isArray(b.productos) ? b.productos : [];
    const estado = String(b.estado || "").trim();

    if (!Number.isInteger(cliente_id) || cliente_id < 1 || !fecha) {
        return { error: "Completá los campos obligatorios (*)." };
    }

    const d = new Date(fecha + "T00:00:00Z");

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
        isNaN(d) ||
        d.toISOString().slice(0, 10) !== fecha
    ) {
        return { error: "La fecha de entrega no es válida." };
    }

    if (conEstado && !ESTADOS.includes(estado)) {
        return { error: "El estado no es válido." };
    }

    if (!items.length) {
        return { error: "Agregá al menos un producto." };
    }

    if (items.length > 100) {
        return { error: "Demasiados productos en un mismo pedido." };
    }

    const productos = [];

    for (const i of items) {
        const producto_id = Number(i.producto_id);
        const cantidad = Number(i.cantidad);
        const precio = Number(i.precio);

        // Aceptar cantidades con hasta dos decimales
        const cantidadRedondeada = Math.round(cantidad * 100) / 100;

        if (
            !Number.isInteger(producto_id) ||
            producto_id < 1 ||
            !Number.isFinite(cantidad) ||
            cantidad <= 0 ||
            Math.abs(cantidad - cantidadRedondeada) > 0.000001 ||
            !Number.isFinite(precio) ||
            precio <= 0
        ) {
            return {
                error: "Revisá los productos, colores, cantidades y precios."
            };
        }

        productos.push({
            producto_id: producto_id,
            cantidad: cantidadRedondeada,
            precio: precio
        });
    }

    return {
        pedido: {
            cliente_id: cliente_id,
            fecha_entrega: fecha,
            estado: estado,
            productos: productos
        }
    };
}

// Validar el cliente y los colores elegidos
async function preparar(body, conEstado) {
    const resultado = validar(body, conEstado);

    if (resultado.error) {
        return resultado;
    }

    const pedido = resultado.pedido;

    const [clientes] = await db.execute(
        "SELECT id FROM clientes WHERE id = ?",
        [pedido.cliente_id]
    );

    if (!clientes.length) {
        return { error: "El cliente no existe." };
    }

    const ids = [
        ...new Set(pedido.productos.map(p => p.producto_id))
    ];

    const [filas] = await db.execute(
        `SELECT
            pc.id AS idcolor,
            p.productonombre,
            pc.color
         FROM producto_color pc
         INNER JOIN productos p
            ON pc.idproducto = p.idproducto
         WHERE pc.id IN (${ids.map(() => "?").join(",")})`,
        ids
    );

    const variantes = new Map(
        filas.map(f => [
            Number(f.idcolor),
            {
                nombre: f.productonombre,
                color: f.color
            }
        ])
    );

    if (ids.some(id => !variantes.has(id))) {
        return { error: "Algún producto o color no existe." };
    }

    const total = Math.round(
        pedido.productos.reduce(
            (suma, p) => suma + p.cantidad * p.precio,
            0
        ) * 100
    ) / 100;

    return {
        pedido: pedido,
        variantes: variantes,
        total: total
    };
}

// Sumar las cantidades de cada variante
function agruparCantidades(productos) {
    const cantidades = new Map();

    for (const p of productos) {
        const id = Number(p.producto_id);
        const anterior = cantidades.get(id) || 0;

        cantidades.set(
            id,
            Math.round((anterior + Number(p.cantidad)) * 100) / 100
        );
    }

    return cantidades;
}

// Calcular cuánto hay que descontar o devolver
function calcularDiferencias(nuevos, anteriores) {
    const diferencias = new Map();

    for (const [id, cantidad] of nuevos) {
        diferencias.set(id, cantidad);
    }

    for (const [id, cantidad] of anteriores) {
        const diferencia = (diferencias.get(id) || 0) - cantidad;

        if (Math.abs(diferencia) < 0.000001) {
            diferencias.delete(id);
        } else {
            diferencias.set(
                id,
                Math.round(diferencia * 100) / 100
            );
        }
    }

    return diferencias;
}

// Ajustar el stock dentro de una transacción
// Una diferencia positiva descuenta stock.
// Una diferencia negativa devuelve stock.
async function ajustarStock(conn, diferencias, variantes) {
    const ids = [...diferencias.keys()].sort((a, b) => a - b);

    for (const id of ids) {
        const diferencia = diferencias.get(id);

        if (Math.abs(diferencia) < 0.000001) {
            continue;
        }

        const [filas] = await conn.execute(
            `SELECT cantidad
             FROM stock
             WHERE producto_color_id = ?
             FOR UPDATE`,
            [id]
        );

        // Si falta el registro, no se puede descontar stock.
        if (filas.length === 0) {
            if (diferencia > 0) {
                const variante = variantes.get(id);

                const nombre = variante
                    ? variante.nombre + " - " + variante.color
                    : "Producto " + id;

                const error = new Error(
                    "No hay stock registrado para " + nombre +
                    ". Cargá primero los metros disponibles."
                );

                error.status = 400;
                throw error;
            }

            // Si se deben devolver metros y el registro ya no existe,
            // se vuelve a crear con la cantidad correspondiente.
            await conn.execute(
                `INSERT INTO stock (producto_color_id, cantidad)
                 VALUES (?, ?)`,
                [id, Math.abs(diferencia)]
            );

            continue;
        }

        const disponible = Number(filas[0].cantidad);

        if (diferencia > 0) {
            // Verificar que alcance el stock disponible
            if (disponible + 0.000001 < diferencia) {
                const variante = variantes.get(id);

                const nombre = variante
                    ? variante.nombre + " - " + variante.color
                    : "Producto " + id;

                const error = new Error(
                    "Stock insuficiente para " + nombre +
                    ". Disponible: " + disponible.toFixed(2) +
                    " m; solicitado: " + diferencia.toFixed(2) + " m."
                );

                error.status = 400;
                throw error;
            }

            await conn.execute(
                `UPDATE stock
                 SET cantidad = cantidad - ?
                 WHERE producto_color_id = ?`,
                [diferencia, id]
            );
        } else {
            // Devolver los metros que ya no se necesitan
            await conn.execute(
                `UPDATE stock
                 SET cantidad = cantidad + ?
                 WHERE producto_color_id = ?`,
                [Math.abs(diferencia), id]
            );
        }
    }
}

// Guardar los productos del pedido
async function guardarItems(conn, pedidoId, pedido, variantes) {
    for (const p of pedido.productos) {
        const variante = variantes.get(p.producto_id);

        await conn.execute(
            `INSERT INTO pedido_items
                (pedido_id, producto_id, nombre, color, cantidad, precio)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                pedidoId,
                p.producto_id,
                variante.nombre,
                variante.color,
                p.cantidad,
                p.precio
            ]
        );
    }
}

// LISTAR PEDIDOS
async function listar(req, res, next) {
    try {
        const [filas] = await db.execute(
            `SELECT
                p.id,
                p.id AS numero,
                c.nombre,
                c.apellido,
                p.estado,
                p.total,
                DATE_FORMAT(p.fecha_entrega, '%Y-%m-%d') AS fecha_entrega
             FROM pedidos p
             JOIN clientes c ON c.id = p.cliente_id
             ORDER BY p.id DESC`
        );

        res.json({
            ok: true,
            pedidos: filas.map(f => ({
                ...f,
                total: Number(f.total)
            }))
        });
    } catch (err) {
        fallo(err, res, next);
    }
}

// CONSULTAR EL DETALLE DE UN PEDIDO
async function obtener(req, res, next) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(404).json({
                ok: false,
                error: "Pedido no encontrado."
            });
        }

        const [filas] = await db.execute(
            `SELECT
                p.id,
                p.id AS numero,
                p.cliente_id,
                c.nombre,
                c.apellido,
                c.telefono,
                c.email,
                p.estado,
                p.total,
                DATE_FORMAT(p.fecha_entrega, '%Y-%m-%d') AS fecha_entrega
             FROM pedidos p
             JOIN clientes c ON c.id = p.cliente_id
             WHERE p.id = ?`,
            [id]
        );

        if (!filas.length) {
            return res.status(404).json({
                ok: false,
                error: "Pedido no encontrado."
            });
        }

        const [items] = await db.execute(
            `SELECT
                producto_id,
                nombre,
                color,
                cantidad,
                precio
             FROM pedido_items
             WHERE pedido_id = ?
             ORDER BY id`,
            [id]
        );

        const pedido = {
            ...filas[0],
            total: Number(filas[0].total)
        };

        pedido.productos = items.map(i => ({
            ...i,
            cantidad: Number(i.cantidad),
            precio: Number(i.precio)
        }));

        res.json({
            ok: true,
            pedido: pedido
        });
    } catch (err) {
        fallo(err, res, next);
    }
}

// CREAR PEDIDO Y DESCONTAR STOCK
async function crear(req, res, next) {
    let conn;

    try {
        const resultado = await preparar(req.body, false);

        if (resultado.error) {
            return res.status(400).json({
                ok: false,
                error: resultado.error
            });
        }

        const pedido = resultado.pedido;
        const variantes = resultado.variantes;
        const total = resultado.total;

        conn = await db.getConnection();
        await conn.beginTransaction();

        // Insertar el pedido
        const [r] = await conn.execute(
            `INSERT INTO pedidos
                (cliente_id, total, fecha_entrega)
             VALUES (?, ?, ?)`,
            [pedido.cliente_id, total, pedido.fecha_entrega]
        );

        // Descontar las cantidades solicitadas
        const nuevasCantidades = agruparCantidades(pedido.productos);
        await ajustarStock(
            conn,
            nuevasCantidades,
            variantes
        );

        // Guardar los productos del pedido
        await guardarItems(conn, r.insertId, pedido, variantes);

        // Marcar que el pedido ya descontó stock
        await conn.execute(
            "UPDATE pedidos SET stock_actualizado = 1 WHERE id = ?",
            [r.insertId]
        );

        await conn.commit();

        res.status(201).json({
            ok: true,
            id: r.insertId
        });
    } catch (err) {
        if (conn) {
            await conn.rollback().catch(() => {});
        }

        if (err.status) {
            return res.status(err.status).json({
                ok: false,
                error: err.message
            });
        }

        fallo(err, res, next);
    } finally {
        if (conn) {
            conn.release();
        }
    }
}

// MODIFICAR PEDIDO Y AJUSTAR STOCK
async function modificar(req, res, next) {
    let conn;

    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(404).json({
                ok: false,
                error: "Pedido no encontrado."
            });
        }

        const resultado = await preparar(req.body, true);

        if (resultado.error) {
            return res.status(400).json({
                ok: false,
                error: resultado.error
            });
        }

        const pedido = resultado.pedido;
        const variantes = resultado.variantes;
        const total = resultado.total;

        conn = await db.getConnection();
        await conn.beginTransaction();

        // Bloquear el pedido mientras se modifica
        const [existentes] = await conn.execute(
            `SELECT id, stock_actualizado
             FROM pedidos
             WHERE id = ?
             FOR UPDATE`,
            [id]
        );

        if (!existentes.length) {
            await conn.rollback();

            return res.status(404).json({
                ok: false,
                error: "Pedido no encontrado."
            });
        }

        // Obtener los productos que tenía el pedido
        const [itemsAnteriores] = await conn.execute(
            `SELECT producto_id, cantidad
             FROM pedido_items
             WHERE pedido_id = ?`,
            [id]
        );

        let cantidadesAnteriores = new Map();

        // Solo contar las cantidades anteriores si habían descontado stock
        if (Number(existentes[0].stock_actualizado) === 1) {
            cantidadesAnteriores = agruparCantidades(
                itemsAnteriores.map(i => ({
                    producto_id: Number(i.producto_id),
                    cantidad: Number(i.cantidad)
                }))
            );
        }

        const cantidadesNuevas = agruparCantidades(pedido.productos);

        const diferencias = calcularDiferencias(
            cantidadesNuevas,
            cantidadesAnteriores
        );

        // Descontar o devolver la diferencia
        await ajustarStock(conn, diferencias, variantes);

        // Actualizar los datos del pedido
        await conn.execute(
            `UPDATE pedidos
             SET cliente_id = ?,
                 estado = ?,
                 total = ?,
                 fecha_entrega = ?,
                 stock_actualizado = 1
             WHERE id = ?`,
            [
                pedido.cliente_id,
                pedido.estado,
                total,
                pedido.fecha_entrega,
                id
            ]
        );

        // Reemplazar los productos del pedido
        await conn.execute(
            "DELETE FROM pedido_items WHERE pedido_id = ?",
            [id]
        );

        await guardarItems(conn, id, pedido, variantes);

        await conn.commit();

        res.json({ ok: true });
    } catch (err) {
        if (conn) {
            await conn.rollback().catch(() => {});
        }

        if (err.status) {
            return res.status(err.status).json({
                ok: false,
                error: err.message
            });
        }

        fallo(err, res, next);
    } finally {
        if (conn) {
            conn.release();
        }
    }
}

// MODIFICAR SOLAMENTE EL ESTADO DE UN PEDIDO
async function actualizarEstado(req, res, next) {
    try {
        const id = Number(req.params.id);
        const estado = String(req.body.estado || "").trim();

        // Comprobar que el ID sea válido
        if (!Number.isInteger(id) || id < 1) {
            return res.status(404).json({
                ok: false,
                error: "Pedido no encontrado."
            });
        }

        // Comprobar que el estado esté permitido
        if (!ESTADOS.includes(estado)) {
            return res.status(400).json({
                ok: false,
                error: "El estado no es válido."
            });
        }

        // Verificar que exista el pedido
        const [pedidos] = await db.execute(
            "SELECT id FROM pedidos WHERE id = ?",
            [id]
        );

        if (!pedidos.length) {
            return res.status(404).json({
                ok: false,
                error: "Pedido no encontrado."
            });
        }

        // Actualizar únicamente el estado
        await db.execute(
            "UPDATE pedidos SET estado = ? WHERE id = ?",
            [estado, id]
        );

        res.json({ ok: true });

    } catch (err) {
        fallo(err, res, next);
    }
}

// ELIMINAR PEDIDO Y DEVOLVER STOCK
async function eliminar(req, res, next) {
    let conn;

    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(404).json({
                ok: false,
                error: "Pedido no encontrado."
            });
        }

        conn = await db.getConnection();
        await conn.beginTransaction();

        // Bloquear el pedido
        const [pedidos] = await conn.execute(
            `SELECT id, stock_actualizado
             FROM pedidos
             WHERE id = ?
             FOR UPDATE`,
            [id]
        );

        if (!pedidos.length) {
            await conn.rollback();

            return res.status(404).json({
                ok: false,
                error: "Pedido no encontrado."
            });
        }

        // Obtener los productos del pedido
        const [items] = await conn.execute(
            `SELECT producto_id, cantidad
             FROM pedido_items
             WHERE pedido_id = ?`,
            [id]
        );

        // Devolver las cantidades únicamente si se habían descontado
        if (Number(pedidos[0].stock_actualizado) === 1) {
            const cantidades = agruparCantidades(
                items.map(i => ({
                    producto_id: Number(i.producto_id),
                    cantidad: Number(i.cantidad)
                }))
            );

            const devoluciones = new Map();

            for (const [productoId, cantidad] of cantidades) {
                devoluciones.set(productoId, -cantidad);
            }

            await ajustarStock(conn, devoluciones, new Map());
        }

        // Eliminar primero los productos del pedido
        await conn.execute(
            "DELETE FROM pedido_items WHERE pedido_id = ?",
            [id]
        );

        // Eliminar el pedido
        await conn.execute(
            "DELETE FROM pedidos WHERE id = ?",
            [id]
        );

        await conn.commit();

        res.json({ ok: true });
    } catch (err) {
        if (conn) {
            await conn.rollback().catch(() => {});
        }

        if (err.status) {
            return res.status(err.status).json({
                ok: false,
                error: err.message
            });
        }

        fallo(err, res, next);
    } finally {
        if (conn) {
            conn.release();
        }
    }
}

// Exportar las funciones del controlador
module.exports = {
    listar: listar,
    obtener: obtener,
    crear: crear,
    modificar: modificar,
    eliminar: eliminar,
    actualizarEstado: actualizarEstado
};
