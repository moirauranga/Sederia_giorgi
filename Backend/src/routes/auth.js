// Ruta de login:  POST /api/auth/login
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

router.post("/login", async (req, res, next) => {
  try {
    const { usuario, password } = req.body;

    // 1. Validar que lleguen los datos
    if (!usuario || !password) {
      return res.status(400).json({ ok: false, error: "Completá usuario y contraseña." });
    }

    // 2. Buscar el usuario en la base.
    //    Los "?" evitan la inyección SQL: MySQL trata el valor siempre como dato, nunca como código.
    const [filas] = await db.execute(
      "SELECT id, nombre, rol, password_hash FROM usuarios WHERE usuario = ? AND activo = 1",
      [usuario.trim()]
    );
    const u = filas[0];

    // 3. Comparar la contraseña escrita con el hash guardado (bcrypt)
    const coincide = u && await bcrypt.compare(password, u.password_hash);
    if (!coincide) {
      return res.status(401).json({ ok: false, error: "Usuario o contraseña incorrectos." });
    }

    // 4. Crear el token JWT: guarda quién es el usuario, está firmado con JWT_SECRET y dura 8 horas
    const token = jwt.sign(
      { id: u.id, nombre: u.nombre, rol: u.rol },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    // 5. Responder con el token y los datos para mostrar en pantalla
    res.json({ ok: true, token, user: { name: u.nombre, role: u.rol } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
