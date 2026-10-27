const express = require("express");

// Importar el controlador de autenticación
const authController = require("../controllers/authController");

const router = express.Router();

// Ruta para iniciar sesión
router.post("/login", authController.login);

// Exportar las rutas
module.exports = router;
