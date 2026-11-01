
const db = require("../db");

// Validar los datos recibidos desde el formulario
function validar(b) {
    const p = {
        nombre: String(b.nombre || "").trim(),
        telefono: String(b.telefono || "").trim(),
        email: String(b.email || "").trim(),
        cuit: String(b.cuit || "").replace(/\D/g, ""),
        calle: String(b.calle || "").trim(),
        numero: String(b.numero || "").trim(),
        localidad: String(b.localidad || "").trim(),
        observaciones: String(b.obs || "").trim()
    };

    // Comprobar los campos obligatorios
    if (
        !p.nombre ||
        !p.telefono ||
        !p.email ||
        !p.cuit ||
        !p.calle ||
        !p.localidad
    ) {
        return {
            error: "Completá los campos obligatorios (*)."
        };
    }

    // Comprobar el formato del email
    if (!/^\S+@\S+\.\S+$/.test(p.email)) {
        return {
            error: "El email no es válido."
        };
    }

    // Comprobar que el CUIT tenga 11 dígitos
    if (!/^\d{11}$/.test(p.cuit)) {
        return {
            error: "El CUIT debe tener 11 dígitos."
        };
    }

    return {
        proveedor: p
    };
}

// LISTAR PROVEEDORES
async function listar(req, res, next) {
    try {
        const [filas] = await db.execute(
            `SELECT
                id,
                nombre,
                telefono,
                email,
                cuit,
                calle,
                numero,
                localidad,
                observaciones
             FROM proveedores
             ORDER BY nombre`
        );

        res.json({
            ok: true,
            proveedores: filas
        });

    } catch (err) {
        next(err);
    }
}

// CREAR PROVEEDOR
async function crear(req, res, next) {
    try {
        const resultado = validar(req.body);

        if (resultado.error) {
            return res.status(400).json({
                ok: false,
                error: resultado.error
            });
        }

        const proveedor = resultado.proveedor;

        await db.execute(
            `INSERT INTO proveedores
                (nombre, telefono, email, cuit,
                 calle, numero, localidad, observaciones)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                proveedor.nombre,
                proveedor.telefono,
                proveedor.email,
                proveedor.cuit,
                proveedor.calle,
                proveedor.numero || null,
                proveedor.localidad,
                proveedor.observaciones || null
            ]
        );

        res.status(201).json({
            ok: true
        });

    } catch (err) {
        // El CUIT no puede estar repetido
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                ok: false,
                error: "Ya existe un proveedor con ese CUIT."
            });
        }

        next(err);
    }
}

// MODIFICAR PROVEEDOR
async function modificar(req, res, next) {
    try {
        const id = Number(req.params.id);

        // Comprobar que el identificador sea válido
        if (!Number.isInteger(id) || id < 1) {
            return res.status(404).json({
                ok: false,
                error: "Proveedor no encontrado."
            });
        }

        const resultado = validar(req.body);

        if (resultado.error) {
            return res.status(400).json({
                ok: false,
                error: resultado.error
            });
        }

        const proveedor = resultado.proveedor;

        const [resultadoSQL] = await db.execute(
            `UPDATE proveedores
             SET nombre = ?,
                 telefono = ?,
                 email = ?,
                 cuit = ?,
                 calle = ?,
                 numero = ?,
                 localidad = ?,
                 observaciones = ?
             WHERE id = ?`,
            [
                proveedor.nombre,
                proveedor.telefono,
                proveedor.email,
                proveedor.cuit,
                proveedor.calle,
                proveedor.numero || null,
                proveedor.localidad,
                proveedor.observaciones || null,
                id
            ]
        );

        if (resultadoSQL.affectedRows === 0) {
            return res.status(404).json({
                ok: false,
                error: "Proveedor no encontrado."
            });
        }

        res.json({
            ok: true
        });

    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                ok: false,
                error: "Ya existe un proveedor con ese CUIT."
            });
        }

        next(err);
    }
}

// ELIMINAR PROVEEDOR
async function eliminar(req, res, next) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(404).json({
                ok: false,
                error: "Proveedor no encontrado."
            });
        }

        const [resultado] = await db.execute(
            "DELETE FROM proveedores WHERE id = ?",
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                ok: false,
                error: "Proveedor no encontrado."
            });
        }

        res.json({
            ok: true
        });

    } catch (err) {
        // No se puede eliminar si tiene movimientos asociados
        if (err.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                ok: false,
                error: "No se puede eliminar: el proveedor tiene movimientos de stock asociados."
            });
        }

        next(err);
    }
}

// Exportar las funciones
module.exports = {
    listar: listar,
    crear: crear,
    modificar: modificar,
    eliminar: eliminar
};
