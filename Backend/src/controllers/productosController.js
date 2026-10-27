
const db = require("../db");

// Función para consultar los productos, sus colores y sus precios
async function listar(req, res, next) {
    try {
        // Consultamos los productos junto con sus colores y precios
        const [filas] = await db.execute(
            `SELECT
                p.productonombre AS nombre,
                pc.id AS idcolor,
                pc.color,
                pc.precio
             FROM productos p
             INNER JOIN producto_color pc
                ON p.idproducto = pc.idproducto
             ORDER BY p.productonombre, pc.color`
        );

        // Creamos una lista para agrupar los colores por producto
        const productosPorNombre = new Map();

        // Recorremos los resultados que devuelve MySQL
        for (const fila of filas) {
            const nombre = String(fila.nombre || "").trim();

            // Si el producto no tiene nombre, lo omitimos
            if (!nombre) {
                continue;
            }

            // Si todavía no agregamos este producto, lo creamos
            if (!productosPorNombre.has(nombre)) {
                productosPorNombre.set(nombre, {
                    nombre: nombre,
                    colores: []
                });
            }

            // Agregamos el color y su precio al producto correspondiente
            productosPorNombre.get(nombre).colores.push({
                id: Number(fila.idcolor),
                color: String(fila.color || "").trim(),
                precio: Number(fila.precio) || 0
            });
        }

        // Enviamos los productos al frontend en formato JSON
        res.json({
            ok: true,
            productos: [...productosPorNombre.values()]
        });

    } catch (error) {
        // Si ocurre un error, lo enviamos al manejador de errores
        next(error);
    }
}

// Exportamos la función para poder utilizarla desde las rutas
module.exports = {
    listar: listar
};
