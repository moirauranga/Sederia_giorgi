
const express = require("express");

// Importar el control de autenticación
const requireAuth = require("../middleware/auth");

// Importar el controlador de proveedores
const proveedoresController = require("../controllers/proveedoresController");

const router = express.Router();

// Todas las rutas requieren un usuario autenticado
router.use(requireAuth);

// Listar proveedores
router.get("/", proveedoresController.listar);

// Crear proveedor
router.post("/", proveedoresController.crear);

// Modificar proveedor
router.put("/:id", proveedoresController.modificar);

// Eliminar proveedor
router.delete("/:id", proveedoresController.eliminar);

// Exportar las rutas
module.exports = router;
