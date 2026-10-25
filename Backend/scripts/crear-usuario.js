// Crea un usuario con la contraseña encriptada.
// Uso:  node scripts/crear-usuario.js <usuario> "<Nombre completo>" "<contraseña>"
require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../src/db");

(async () => {
  const [usuario, nombre, password] = process.argv.slice(2);
  if (!usuario || !nombre || !password) {
    console.log('Uso: node scripts/crear-usuario.js <usuario> "<Nombre completo>" "<contraseña>"');
    process.exit(1);
  }
  try {
    const hash = await bcrypt.hash(password, 10);   // la contraseña se guarda encriptada, nunca en texto plano
    await db.execute(
      "INSERT INTO usuarios (usuario, nombre, rol, password_hash) VALUES (?, ?, 'Administradora', ?)",
      [usuario, nombre, hash]
    );
    console.log('Usuario "' + usuario + '" creado.');
  } catch (e) {
    console.log(e.code === "ER_DUP_ENTRY" ? "Ese usuario ya existe." : "Error: " + e.message);
  }
  process.exit(0);
})();
