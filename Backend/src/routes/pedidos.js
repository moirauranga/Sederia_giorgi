
const express = require("express");
const requireAuth = require("../middleware/auth");
const pedidosController = require("../controllers/pedidosController");

const router = express.Router();

// Todas las rutas requieren un usuario autenticado
router.use(requireAuth);

// Listar todos los pedidos
router.get("/", pedidosController.listar);

// Consultar el detalle de un pedido
router.get("/:id", pedidosController.obtener);

// Crear un pedido
router.post("/", pedidosController.crear);

// Modificar un pedido
router.put("/:id", pedidosController.modificar);

// Eliminar un pedido
router.delete("/:id", pedidosController.eliminar);

// Exportar las rutas
module.exports = router;
