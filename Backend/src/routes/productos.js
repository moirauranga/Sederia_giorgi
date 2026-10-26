// Rutas de productos (protegidas). Por ahora solo se usan para armar el formulario de "Crear pedido".
//   GET /api/productos  → productos activos con sus colores y precio sugerido
const express = require("express");
const db = require("../db");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const [prods] = await db.execute("SELECT id, nombre, precio FROM productos WHERE activo = 1 ORDER BY nombre");
    const [cols] = await db.execute("SELECT producto_id, color FROM producto_colores ORDER BY color");
    const productos = prods.map(p => ({
      id: p.id,
      nombre: p.nombre,
      precio: Number(p.precio),
      colores: cols.filter(c => c.producto_id === p.id).map(c => c.color)
    }));
    res.json({ ok: true, productos });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
