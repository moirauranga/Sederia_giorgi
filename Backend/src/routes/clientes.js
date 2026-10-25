// Rutas de clientes (todas protegidas: hay que haber iniciado sesión)
//   GET    /api/clientes      → lista
//   POST   /api/clientes      → crear
//   DELETE /api/clientes/:id  → eliminar
const express = require("express");
const db = require("../db");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);   // todas las rutas de este archivo pasan primero por el control del token

// Valida los datos del formulario (el servidor nunca debe confiar solo en el navegador)
function validar(b) {
  const c = {
    nombre: String(b.nombre || "").trim(),
    apellido: String(b.apellido || "").trim(),
    telefono: String(b.telefono || "").trim(),
    email: String(b.email || "").trim(),
    dni: String(b.dni || "").replace(/\D/g, ""),      // se guardan solo los números
    calle: String(b.calle || "").trim(),
    numero: String(b.numero || "").trim(),
    localidad: String(b.localidad || "").trim(),
    observaciones: String(b.obs || "").trim()
  };
  if (!c.nombre || !c.apellido || !c.telefono || !c.email || !c.dni || !c.calle || !c.localidad)
    return { error: "Completá los campos obligatorios (*)." };
  if (!/^\S+@\S+\.\S+$/.test(c.email)) return { error: "El email no es válido." };
  if (!/^\d{7,11}$/.test(c.dni)) return { error: "DNI/CUIT inválido (7 a 11 dígitos)." };
  return { cliente: c };
}

// LISTAR: devuelve los clientes con la cantidad de pedidos de cada uno
router.get("/", async (req, res, next) => {
  try {
    const [filas] = await db.execute(
      `SELECT c.id, c.nombre, c.apellido, c.telefono, c.calle, c.numero, c.localidad,
              COUNT(p.id) AS pedidos
         FROM clientes c
         LEFT JOIN pedidos p ON p.cliente_id = c.id
        GROUP BY c.id
        ORDER BY c.apellido, c.nombre`
    );
    res.json({ ok: true, clientes: filas });
  } catch (err) {
    next(err);
  }
});

// CREAR
router.post("/", async (req, res, next) => {
  try {
    const { cliente, error } = validar(req.body);
    if (error) return res.status(400).json({ ok: false, error });

    await db.execute(
      `INSERT INTO clientes (nombre, apellido, telefono, email, dni, calle, numero, localidad, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cliente.nombre, cliente.apellido, cliente.telefono, cliente.email, cliente.dni,
       cliente.calle, cliente.numero || null, cliente.localidad, cliente.observaciones || null]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    // El DNI es UNIQUE en la base: si ya existe, MySQL avisa con este código
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, error: "Ya existe un cliente con ese DNI/CUIT." });
    }
    next(err);
  }
});

// ELIMINAR
router.delete("/:id", async (req, res, next) => {
  try {
    const [r] = await db.execute("DELETE FROM clientes WHERE id = ?", [req.params.id]);
    if (r.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "Cliente no encontrado." });
    }
    res.json({ ok: true });
  } catch (err) {
    // La tabla pedidos referencia a clientes: si tiene pedidos, MySQL no deja borrarlo
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({ ok: false, error: "No se puede eliminar: el cliente tiene pedidos." });
    }
    next(err);
  }
});

module.exports = router;
