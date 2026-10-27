
const db = require("../db");

// Estados permitidos para un pedido
const ESTADOS = ["Pendiente", "En preparación", "Listo", "Entregado"];

// Manejar errores relacionados con tablas o columnas
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

// Validar los datos recibidos desde el formulario
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
        const it = {
            producto_id: Number(i.producto_id),
            cantidad: Number(i.cantidad),
            precio: Number(i.precio)
        };

        if (
            !Number.isInteger(it.producto_id) ||
            it.producto_id < 1 ||
            !Number.isInteger(it.cantidad) ||
            it.cantidad < 1 ||
            !Number.isFinite(it.precio) ||
            it.precio <= 0
        ) {
            return {
                error: "Revisá los productos: producto, color, cantidad y precio son obligatorios."
            };
        }

        productos.push(it);
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

// Verificar el cliente y los colores seleccionados
async function preparar(body, conEstado) {
    const resultado = validar(body, conEstado);

    if (resultado.error) {
        return resultado;
    }

    const pedido = resultado.pedido;

    // Comprobar que exista el cliente
    const [clientes] = await db.execute(
        "SELECT id FROM clientes WHERE id = ?",
        [pedido.cliente_id]
    );

    if (!clientes.length) {
        return { error: "El cliente no existe." };
    }

    // Obtener los identificadores de colores sin repetirlos
    const ids = [
        ...new Set(pedido.productos.map(p => p.producto_id))
    ];

    // Buscar las variantes en producto_color
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

    // Asociar cada variante con el nombre de la tela y su color
    const variantes = new Map(
        filas.map(f => [
            Number(f.idcolor),
            {
                nombre: f.productonombre,
                color: f.color
            }
        ])
    );

    // Comprobar que existan todos los colores seleccionados
    if (ids.some(id => !variantes.has(id))) {
        return { error: "Algún producto o color no existe." };
    }

    // Calcular el total del pedido
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

// Guardar los productos incluidos en un pedido
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

// CREAR PEDIDO
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

        const [r] = await conn.execute(
            `INSERT INTO pedidos
                (cliente_id, total, fecha_entrega)
             VALUES (?, ?, ?)`,
            [pedido.cliente_id, total, pedido.fecha_entrega]
        );

        await guardarItems(conn, r.insertId, pedido, variantes);

        await conn.commit();

        res.status(201).json({
            ok: true,
            id: r.insertId
        });
    } catch (err) {
        if (conn) {
            await conn.rollback().catch(() => {});
        }

        fallo(err, res, next);
    } finally {
        if (conn) {
            conn.release();
        }
    }
}

// MODIFICAR PEDIDO
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

        const [existentes] = await db.execute(
            "SELECT id FROM pedidos WHERE id = ?",
            [id]
        );

        if (!existentes.length) {
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

        await conn.execute(
            `UPDATE pedidos
             SET cliente_id = ?,
                 estado = ?,
                 total = ?,
                 fecha_entrega = ?
             WHERE id = ?`,
            [
                pedido.cliente_id,
                pedido.estado,
                total,
                pedido.fecha_entrega,
                id
            ]
        );

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

        fallo(err, res, next);
    } finally {
        if (conn) {
            conn.release();
        }
    }
}

// ELIMINAR PEDIDO
async function eliminar(req, res, next) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(404).json({
                ok: false,
                error: "Pedido no encontrado."
            });
        }

        const [r] = await db.execute(
            "DELETE FROM pedidos WHERE id = ?",
            [id]
        );

        if (r.affectedRows === 0) {
            return res.status(404).json({
                ok: false,
                error: "Pedido no encontrado."
            });
        }

        res.json({ ok: true });
    } catch (err) {
        fallo(err, res, next);
    }
}

// Exportar las funciones para utilizarlas desde las rutas
module.exports = {
    listar: listar,
    obtener: obtener,
    crear: crear,
    modificar: modificar,
    eliminar: eliminar
};
