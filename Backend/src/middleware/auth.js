// Middleware: se ejecuta ANTES de las rutas protegidas.
// Revisa que el pedido traiga un token válido; si no, responde 401.
const jwt = require("jsonwebtoken");

module.exports = function requireAuth(req, res, next) {
  // El navegador manda el token en el header:  Authorization: Bearer <token>
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ ok: false, error: "No autenticado." });
  }

  try {
    // verify() comprueba la firma y que el token no haya vencido
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();   // token válido: sigue hacia la ruta
  } catch (e) {
    res.status(401).json({ ok: false, error: "Sesión vencida." });
  }
};
