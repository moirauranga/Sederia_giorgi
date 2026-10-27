
const db = require("../db");

// Validar los datos recibidos desde el formulario
function validar(b) {
    const c = {
        nombre: String(b.nombre || "").trim(),
        apellido: String(b.apellido || "").trim(),
        telefono: String(b.telefono || "").trim(),
        email: String(b.email || "").trim(),
        dni: String(b.dni || "").replace(/\D/g, ""),
        calle: String(b.calle || "").trim(),
        numero: String(b.numero || "").trim(),
        localidad: String(b.localidad || "").trim(),
        observaciones: String(b.obs || "").trim()
    };

    // Comprobar los campos obligatorios
    if (
        !c.nombre ||
        !c.apellido ||
        !c.telefono ||
        !c.email ||
        !c.dni ||
        !c.calle ||
        !c.localidad
    ) {
        return {
            error: "Completá los campos obligatorios (*)."
        };
    }

    // Comprobar que el email tenga un formato válido
    if (!/^\S+@\S+\.\S+$/.test(c.email)) {
        return {
            error: "El email no es válido."
        };
    }

    // Comprobar que el DNI o CUIT tenga entre 7 y 11 dígitos
    if (!/^\d{7,11}$/.test(c.dni)) {
        return {
            error: "DNI/CUIT inválido (7 a 11 dígitos)."
        };
    }

    return {
        cliente: c
    };
}

// LISTAR CLIENTES
async function listar(req, res, next) {
    try {
        const [filas] = await db.execute(
            `SELECT
                c.id,
                c.nombre,
                c.apellido,
                c.telefono,
                c.calle,
                c.numero,
                c.localidad,
                COUNT(p.id) AS pedidos
             FROM clientes c
             LEFT JOIN pedidos p ON p.cliente_id = c.id
             GROUP BY c.id
             ORDER BY c.apellido, c.nombre`
        );

        res.json({
            ok: true,
            clientes: filas
        });
    } catch (err) {
        next(err);
    }
}

// CREAR CLIENTE
async function crear(req, res, next) {
    try {
        const resultado = validar(req.body);

        if (resultado.error) {
            return res.status(400).json({
                ok: false,
                error: resultado.error
            });
        }

        const cliente = resultado.cliente;

        await db.execute(
            `INSERT INTO clientes
                (nombre, apellido, telefono, email, dni,
                 calle, numero, localidad, observaciones)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                cliente.nombre,
                cliente.apellido,
                cliente.telefono,
                cliente.email,
                cliente.dni,
                cliente.calle,
                cliente.numero || null,
                cliente.localidad,
                cliente.observaciones || null
            ]
        );

        res.status(201).json({
            ok: true
        });
    } catch (err) {
        // El DNI/CUIT no puede estar repetido
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                ok: false,
                error: "Ya existe un cliente con ese DNI/CUIT."
            });
        }

        next(err);
    }
}

// ELIMINAR CLIENTE
async function eliminar(req, res, next) {
    try {
        const id = Number(req.params.id);

        // Comprobar que el identificador sea válido
        if (!Number.isInteger(id) || id < 1) {
            return res.status(404).json({
                ok: false,
                error: "Cliente no encontrado."
            });
        }

        const [resultado] = await db.execute(
            "DELETE FROM clientes WHERE id = ?",
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                ok: false,
                error: "Cliente no encontrado."
            });
        }

        res.json({
            ok: true
        });
    } catch (err) {
        // No se puede borrar un cliente que tiene pedidos asociados
        if (err.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                ok: false,
                error: "No se puede eliminar: el cliente tiene pedidos."
            });
        }

        next(err);
    }
}

// Exportar las funciones para utilizarlas desde las rutas
module.exports = {
    listar: listar,
    crear: crear,
    eliminar: eliminar
};
