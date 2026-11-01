
const express = require("express");
const requireAuth = require("../middleware/auth");
const stockController = require("../controllers/stockController");

const router = express.Router();

// Todas las rutas de stock requieren iniciar sesión
router.use(requireAuth);

// Consultar el stock de todos los productos
router.get("/", stockController.listar);

// Modificar directamente la cantidad disponible
router.put("/:productoColorId", stockController.modificar);

// Registrar un ingreso y sumar los metros al stock
router.post("/ingresos", stockController.agregarIngreso);

// Eliminar una variante de producto (color)
router.delete("/variantes/:productoColorId", stockController.eliminarVariante);

module.exports = router;
