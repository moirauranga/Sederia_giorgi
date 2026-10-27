const express = require("express");

// Importamos el middleware que verifica la autenticación
const requireAuth = require("../middleware/auth");

// Importamos el controlador de productos
const productosController = require("../controllers/productosController");

// Creamos el enrutador
const router = express.Router();

// Protegemos las rutas para usuarios autenticados
router.use(requireAuth);

// Ruta para consultar los productos, sus colores y precios
router.get("/", productosController.listar);

// Exportamos las rutas
module.exports = router;
