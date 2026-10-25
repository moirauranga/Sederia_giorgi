// Servidor principal
require("dotenv").config();            // lee el archivo .env
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

if (!process.env.JWT_SECRET) {
  console.error("Falta JWT_SECRET en el archivo .env");
  process.exit(1);
}

const app = express();
app.use(cors());                       // permite que el frontend (otro puerto, ej. Live Server) llame a la API
app.use(express.json());               // permite leer el JSON que manda el navegador

// API
app.get("/api/health", (req, res) => res.json({ ok: true }));   // para comprobar que el servidor está andando
app.use("/api/auth", require("./routes/auth"));
app.use("/api/clientes", require("./routes/clientes"));
app.use("/api", (req, res) => res.status(404).json({ ok: false, error: "Ruta no encontrada." }));

// Sitio: si existe la carpeta ../frontend (estructura del repositorio), la sirve desde acá
const frontend = path.join(__dirname, "..", "..", "frontend");
if (fs.existsSync(frontend)) {
  app.use(express.static(frontend));
}

// Si algo falla sin que lo hayamos previsto, se muestra en la consola y se responde error 500
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, error: "Error del servidor." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor listo en http://localhost:" + PORT));
