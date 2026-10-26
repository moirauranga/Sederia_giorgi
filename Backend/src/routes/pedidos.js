// Rutas de pedidos (todas protegidas: hay que haber iniciado sesión)
//   GET    /api/pedidos      → lista
//   GET    /api/pedidos/:id  → detalle (con sus productos)
//   POST   /api/pedidos      → crear
//   DELETE /api/pedidos/:id  → eliminar
const express = require("express");
const db = require("../db");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);   // todas las rutas de este archivo pasan primero por el control del token

// Valida los datos del formulario (el servidor nunca debe confiar solo en el navegador)
function validar(b) {
  const cliente_id = Number(b.cliente_id);
  const fecha = String(b.fecha_entrega || "").trim();
  const items = Array.isArray(b.productos) ? b.productos : [];

  if (!Number.isInteger(cliente_id) || cliente_id < 1 || !fecha)
    return { error: "Completá los campos obligatorios (*)." };

  // la fecha tiene que ser real (ej: no existe el 2026-02-30)
  const d = new Date(fecha + "T00:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || isNaN(d) || d.toISOString().slice(0, 10) !== fecha)
    return { error: "La fecha de entrega no es válida." };

  if (!items.length) return { error: "Agregá al menos un producto." };
  if (items.length > 100) return { error: "Demasiados productos en un mismo pedido." };

  const productos = [];
  for (const i of items) {
    const it = {
      producto_id: Number(i.producto_id),
      color: String(i.color || "").trim(),
      cantidad: Number(i.cantidad),
      precio: Number(i.precio)
    };
    if (!Number.isInteger(it.producto_id) || it.producto_id < 1 || !it.color || it.color.length > 40 ||
        !Number.isInteger(it.cantidad) || it.cantidad < 1 || !(it.precio > 0))
      return { error: "Revisá los productos: producto, color, cantidad y precio son obligatorios." };
    productos.push(it);
  }
  return { pedido: { cliente_id, fecha_entrega: fecha, productos } };
}

// LISTAR: devuelve los pedidos con el nombre del cliente (el más nuevo primero)
router.get("/", async (req, res, next) => {
  try {
    const [filas] = await db.execute(
      `SELECT p.id, p.id AS numero, c.nombre, c.apellido, p.estado, p.total,
              DATE_FORMAT(p.fecha_entrega, '%Y-%m-%d') AS fecha_entrega
         FROM pedidos p
         JOIN clientes c ON c.id = p.cliente_id
        ORDER BY p.id DESC`
    );
    res.json({ ok: true, pedidos: filas.map(f => ({ ...f, total: Number(f.total) })) });
  } catch (err) {
    next(err);
  }
});

// DETALLE: un pedido con los datos del cliente y sus productos
router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(404).json({ ok: false, error: "Pedido no encontrado." });

    const [filas] = await db.execute(
      `SELECT p.id, p.id AS numero, c.nombre, c.apellido, c.telefono, c.email, p.estado, p.total,
              DATE_FORMAT(p.fecha_entrega, '%Y-%m-%d') AS fecha_entrega
         FROM pedidos p
         JOIN clientes c ON c.id = p.cliente_id
        WHERE p.id = ?`,
      [id]
    );
    if (!filas.length) return res.status(404).json({ ok: false, error: "Pedido no encontrado." });

    const [items] = await db.execute(
      "SELECT nombre, color, cantidad, precio FROM pedido_items WHERE pedido_id = ? ORDER BY id",
      [id]
    );
    const pedido = { ...filas[0], total: Number(filas[0].total) };
    pedido.productos = items.map(i => ({ ...i, precio: Number(i.precio) }));
    res.json({ ok: true, pedido });
  } catch (err) {
    next(err);
  }
});

// CREAR: guarda el pedido y sus productos juntos (si algo falla, no se guarda nada)
router.post("/", async (req, res, next) => {
  let conn;
  try {
    const { pedido, error } = validar(req.body);
    if (error) return res.status(400).json({ ok: false, error });

    const [cl] = await db.execute("SELECT id FROM clientes WHERE id = ?", [pedido.cliente_id]);
    if (!cl.length) return res.status(400).json({ ok: false, error: "El cliente no existe." });

    // Nombre de cada producto: lo tomamos de la base, no del navegador
    const ids = [...new Set(pedido.productos.map(p => p.producto_id))];
    const [prods] = await db.execute(
      `SELECT id, nombre FROM productos WHERE id IN (${ids.map(() => "?").join(",")})`, ids
    );
    const nombres = new Map(prods.map(p => [p.id, p.nombre]));
    if (ids.some(i => !nombres.has(i))) return res.status(400).json({ ok: false, error: "Algún producto no existe." });

    // El total lo calcula el servidor (no se confía en el que manda el navegador)
    const total = Math.round(pedido.productos.reduce((s, p) => s + p.cantidad * p.precio, 0) * 100) / 100;

    conn = await db.getConnection();
    await conn.beginTransaction();
    const [r] = await conn.execute(
      "INSERT INTO pedidos (cliente_id, total, fecha_entrega) VALUES (?, ?, ?)",
      [pedido.cliente_id, total, pedido.fecha_entrega]
    );
    for (const p of pedido.productos) {
      await conn.execute(
        `INSERT INTO pedido_items (pedido_id, producto_id, nombre, color, cantidad, precio)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [r.insertId, p.producto_id, nombres.get(p.producto_id), p.color, p.cantidad, p.precio]
      );
    }
    await conn.commit();
    res.status(201).json({ ok: true, id: r.insertId });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    next(err);
  } finally {
    if (conn) conn.release();
  }
});

// ELIMINAR (los productos del pedido se borran solos por ON DELETE CASCADE)
router.delete("/:id", async (req, res, next) => {
  try {
    const [r] = await db.execute("DELETE FROM pedidos WHERE id = ?", [req.params.id]);
    if (r.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "Pedido no encontrado." });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
