
const express = require("express");

// Importar el control de autenticación
const requireAuth = require("../middleware/auth");

// Importar el controlador de clientes
const clientesController = require("../controllers/clientesController");

const router = express.Router();

// Todas las rutas requieren un usuario autenticado
router.use(requireAuth);

// Listar clientes
router.get("/", clientesController.listar);

// Crear cliente
router.post("/", clientesController.crear);

// Eliminar cliente
router.delete("/:id", clientesController.eliminar);

// Exportar las rutas
module.exports = router;
