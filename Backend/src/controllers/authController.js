
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

// INICIAR SESIÓN
async function login(req, res, next) {
    try {
        const { usuario, password } = req.body;

        // Comprobar que se hayan completado los datos
        if (!usuario || !password) {
            return res.status(400).json({
                ok: false,
                error: "Completá usuario y contraseña."
            });
        }

        // Buscar al usuario en la base de datos
        const [filas] = await db.execute(
            `SELECT id, nombre, rol, password_hash
             FROM usuarios
             WHERE usuario = ? AND activo = 1`,
            [usuario.trim()]
        );

        const u = filas[0];

        // Comparar la contraseña con el hash almacenado
        const coincide = u && await bcrypt.compare(
            password,
            u.password_hash
        );

        if (!coincide) {
            return res.status(401).json({
                ok: false,
                error: "Usuario o contraseña incorrectos."
            });
        }

        // Comprobar que exista la clave para firmar el token
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                ok: false,
                error: "La configuración de autenticación está incompleta."
            });
        }

        // Crear el token que identifica al usuario durante 8 horas
        const token = jwt.sign(
            {
                id: u.id,
                nombre: u.nombre,
                rol: u.rol
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        // Devolver el token y los datos del usuario
        res.json({
            ok: true,
            token: token,
            user: {
                name: u.nombre,
                role: u.rol
            }
        });

    } catch (err) {
        next(err);
    }
}

// Exportar la función para usarla desde las rutas
module.exports = {
    login: login
};
