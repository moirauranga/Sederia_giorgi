const db = require("../db");

// Consultar el stock de todos los productos, sus colores y proveedores
async function listar(req, res, next) {
    try {
        const [filas] = await db.execute(
            `SELECT
                s.id,
                s.producto_color_id,
                p.productonombre AS nombre,
                pc.color,
                pc.precio,
                s.cantidad,
                pr.nombre AS proveedor

             FROM stock s

             INNER JOIN producto_color pc
                ON s.producto_color_id = pc.id

             INNER JOIN productos p
                ON pc.idproducto = p.idproducto

             LEFT JOIN ingresos_stock i
                ON i.id = (
                    SELECT i2.id
                    FROM ingresos_stock i2
                    WHERE i2.producto_color_id = s.producto_color_id
                    AND i2.proveedor_id IS NOT NULL
                    ORDER BY i2.fecha_ingreso DESC, i2.id DESC
                    LIMIT 1
                )

             LEFT JOIN proveedores pr
                ON i.proveedor_id = pr.id

            WHERE pc.activo = 1

             ORDER BY p.productonombre, pc.color`
        );

        res.json({
            ok: true,
            stock: filas.map(function (fila) {
                return {
                    id: fila.id,
                    producto_color_id: fila.producto_color_id,
                    nombre: fila.nombre,
                    color: fila.color,
                    precio: Number(fila.precio),
                    cantidad: Number(fila.cantidad),
                    proveedor: fila.proveedor || "Sin proveedor registrado"
                };
            })
        });

    } catch (error) {
        next(error);
    }
}

// Modificar directamente la cantidad disponible
async function modificar(req, res, next) {
    try {
        const productoColorId = Number(req.params.productoColorId);
        const cantidad = Number(req.body.cantidad);

        if (!Number.isInteger(productoColorId) || productoColorId < 1) {
            return res.status(400).json({
                ok: false,
                error: "El producto seleccionado no es válido."
            });
        }

        if (
            !Number.isFinite(cantidad) ||
            cantidad < 0 ||
            Math.abs(cantidad * 100 - Math.round(cantidad * 100)) > 0.000001
        ) {
            return res.status(400).json({
                ok: false,
                error: "La cantidad debe ser mayor o igual a cero y tener hasta dos decimales."
            });
        }

        const [productos] = await db.execute(
            "SELECT id FROM producto_color WHERE id = ?",
            [productoColorId]
        );

        if (productos.length === 0) {
            return res.status(404).json({
                ok: false,
                error: "El producto o color no existe."
            });
        }

        const [existente] = await db.execute(
            "SELECT id FROM stock WHERE producto_color_id = ?",
            [productoColorId]
        );

        if (existente.length > 0) {
            await db.execute(
                "UPDATE stock SET cantidad = ? WHERE producto_color_id = ?",
                [cantidad, productoColorId]
            );
        } else {
            await db.execute(
                "INSERT INTO stock (producto_color_id, cantidad) VALUES (?, ?)",
                [productoColorId, cantidad]
            );
        }

        res.json({
            ok: true,
            mensaje: "Stock actualizado correctamente."
        });
    } catch (error) {
        next(error);
    }
}

// Registrar un ingreso de una tela existente o de una tela nueva
async function agregarIngreso(req, res, next) {
    let conexion;

    try {
        const modo = req.body.modo || "existente";
        const cantidad = Number(req.body.cantidad);
        const precioUnitario = Number(req.body.precio_unitario);

        const proveedorId =
            req.body.proveedor_id === "" ||
            req.body.proveedor_id === undefined ||
            req.body.proveedor_id === null
                ? null
                : Number(req.body.proveedor_id);

        // Validar la cantidad recibida
        if (
            !Number.isFinite(cantidad) ||
            cantidad <= 0 ||
            Math.abs(cantidad * 100 - Math.round(cantidad * 100)) > 0.000001
        ) {
            return res.status(400).json({
                ok: false,
                error: "Los metros recibidos deben ser mayores que cero y tener hasta dos decimales."
            });
        }

        // Validar el precio
        if (
            !Number.isFinite(precioUnitario) ||
            precioUnitario < 0 ||
            Math.abs(precioUnitario * 100 - Math.round(precioUnitario * 100)) > 0.000001
        ) {
            return res.status(400).json({
                ok: false,
                error: "El precio debe ser igual o mayor que cero y tener hasta dos decimales."
            });
        }

        if (
            proveedorId !== null &&
            (!Number.isInteger(proveedorId) || proveedorId < 1)
        ) {
            return res.status(400).json({
                ok: false,
                error: "El proveedor seleccionado no es válido."
            });
        }

        // Para una tela nueva también necesitamos el nombre, color y stock previo
        let nombreTela = "";
        let colorTela = "";
        let stockInicial = 0;
        let productoColorId = Number(req.body.producto_color_id);

        if (modo === "nueva") {
            nombreTela = String(req.body.nombre || "").trim();
            colorTela = String(req.body.color || "").trim();
            stockInicial = Number(req.body.stock_inicial);

            if (!nombreTela || nombreTela.length > 45) {
                return res.status(400).json({
                    ok: false,
                    error: "Ingresá un nombre de tela de hasta 45 caracteres."
                });
            }

            if (!colorTela || colorTela.length > 50) {
                return res.status(400).json({
                    ok: false,
                    error: "Ingresá un color de hasta 50 caracteres."
                });
            }

            if (
                !Number.isFinite(stockInicial) ||
                stockInicial < 0 ||
                Math.abs(stockInicial * 100 - Math.round(stockInicial * 100)) > 0.000001
            ) {
                return res.status(400).json({
                    ok: false,
                    error: "El stock inicial debe ser igual o mayor que cero y tener hasta dos decimales."
                });
            }
        } else if (modo === "existente") {
            if (!Number.isInteger(productoColorId) || productoColorId < 1) {
                return res.status(400).json({
                    ok: false,
                    error: "Seleccioná una tela y un color válidos."
                });
            }
        } else {
            return res.status(400).json({
                ok: false,
                error: "El modo de ingreso no es válido."
            });
        }

        // Iniciar la transacción para guardar todos los cambios juntos
        conexion = await db.getConnection();
        await conexion.beginTransaction();

        if (modo === "nueva") {
            // Buscar si el producto ya existe por su nombre
            const [productos] = await conexion.execute(
                `SELECT idproducto
                 FROM productos
                 WHERE productonombre = ?
                 LIMIT 1
                 FOR UPDATE`,
                [nombreTela]
            );

            let productoId;

            if (productos.length > 0) {
                // Si existe el nombre, agregamos una variante de color al producto
                productoId = productos[0].idproducto;
            } else {
                // Si no existe, creamos el producto
                const [nuevoProducto] = await conexion.execute(
                    "INSERT INTO productos (productonombre) VALUES (?)",
                    [nombreTela]
                );

                productoId = nuevoProducto.insertId;
            }

            // Evitar registrar dos veces el mismo color para el mismo producto
            const [colores] = await conexion.execute(
                `SELECT id
                 FROM producto_color
                 WHERE idproducto = ? AND color = ?
                 LIMIT 1`,
                [productoId, colorTela]
            );

            if (colores.length > 0) {
                const error = new Error(
                    "Esa tela ya tiene registrado ese color. Elegila como tela existente."
                );
                error.status = 409;
                throw error;
            }

            // Crear la variante con su precio
            const [nuevoColor] = await conexion.execute(
                `INSERT INTO producto_color (idproducto, color, precio)
                 VALUES (?, ?, ?)`,
                [productoId, colorTela, precioUnitario]
            );

            productoColorId = nuevoColor.insertId;

            // El stock final suma los metros previos y los recién recibidos
            const stockFinal = stockInicial + cantidad;

            await conexion.execute(
                `INSERT INTO stock (producto_color_id, cantidad)
                 VALUES (?, ?)`,
                [productoColorId, stockFinal]
            );

        } else {
            // Verificar que la tela y el color seleccionados existan
            const [productos] = await conexion.execute(
                "SELECT id FROM producto_color WHERE id = ? AND activo = 1",
                 [productoColorId]
);

            if (productos.length === 0) {
                const error = new Error(
                    "La tela y el color seleccionados no existen."
                );
                error.status = 404;
                throw error;
            }

            // Bloquear el registro para actualizar el stock de forma segura
            const [stocks] = await conexion.execute(
                `SELECT id
                 FROM stock
                 WHERE producto_color_id = ?
                 FOR UPDATE`,
                [productoColorId]
            );

            if (stocks.length > 0) {
                await conexion.execute(
                    `UPDATE stock
                     SET cantidad = cantidad + ?
                     WHERE producto_color_id = ?`,
                    [cantidad, productoColorId]
                );
            } else {
                await conexion.execute(
                    `INSERT INTO stock (producto_color_id, cantidad)
                     VALUES (?, ?)`,
                    [productoColorId, cantidad]
                );
            }
        }

        // Registrar solamente los metros recibidos en este ingreso
        await conexion.execute(
            `INSERT INTO ingresos_stock
                (producto_color_id, cantidad, precio_unitario, proveedor_id)
             VALUES (?, ?, ?, ?)`,
            [productoColorId, cantidad, precioUnitario, proveedorId]
        );

        await conexion.commit();

        res.json({
            ok: true,
            mensaje: modo === "nueva"
                ? "Tela nueva registrada e ingreso guardado correctamente."
                : "Ingreso registrado y stock actualizado correctamente.",
            producto_color_id: productoColorId,
            stock_final: modo === "nueva"
                ? Number((stockInicial + cantidad).toFixed(2))
                : undefined
        });

    } catch (error) {
        if (conexion) {
            await conexion.rollback();
        }

        if (error.status) {
            return res.status(error.status).json({
                ok: false,
                error: error.message
            });
        }

        next(error);

    } finally {
        if (conexion) {
            conexion.release();
        }
    }
}

// Dar de baja una variante sin eliminar sus registros históricos
async function eliminarVariante(req, res, next) {
    try {
        // Obtenemos el ID de la variante seleccionada
        const productoColorId = Number(req.params.productoColorId);

        // Validamos que el ID sea correcto
        if (!Number.isInteger(productoColorId) || productoColorId < 1) {
            return res.status(400).json({
                ok: false,
                error: "La variante seleccionada no es válida."
            });
        }

        // Comprobamos que la variante exista y esté activa
        const [variantes] = await db.execute(
            "SELECT id FROM producto_color WHERE id = ? AND activo = 1",
            [productoColorId]
        );

        if (variantes.length === 0) {
            return res.status(404).json({
                ok: false,
                error: "La variante no existe o ya fue dada de baja."
            });
        }

        // La desactivamos, pero no eliminamos sus datos
        await db.execute(
            "UPDATE producto_color SET activo = 0 WHERE id = ?",
            [productoColorId]
        );

        res.json({
            ok: true,
            mensaje: "La variante fue dada de baja correctamente."
        });

    } catch (error) {
        next(error);
    }
}

module.exports = {
    listar: listar,
    modificar: modificar,
    agregarIngreso: agregarIngreso,
    eliminarVariante: eliminarVariante
};


