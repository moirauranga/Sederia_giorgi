
/* Servidor principal */

// Lee las variables de configuración del archivo .env
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// Comprueba que exista la clave secreta para los tokens
if (!process.env.JWT_SECRET) {
    console.error("Falta JWT_SECRET en el archivo .env");
    process.exit(1);
}

// Crea la aplicación Express
const app = express();

// Permite que el frontend se comunique con la API
app.use(cors());

// Permite recibir datos en formato JSON
app.use(express.json());

// ==============================
// API
// ==============================

// Ruta para comprobar que el servidor funciona
app.get("/api/health", (req, res) =>
    res.json({ ok: true })
);

// Rutas de autenticación
app.use("/api/auth", require("./routes/auth"));

// Rutas de clientes
app.use("/api/clientes", require("./routes/clientes"));

// Rutas de pedidos
app.use("/api/pedidos", require("./routes/pedidos"));

// Rutas de productos
app.use("/api/productos", require("./routes/productos"));

// Rutas de proveedores
app.use("/api/proveedores", require("./routes/proveedores"));

// Rutas de stock
app.use("/api/stock", require("./routes/stock"));


// Responde cuando una ruta de la API no existe
app.use("/api", (req, res) =>
    res.status(404).json({
        ok: false,
        error: "Ruta no encontrada."
    })
);

// ==============================
// SITIO WEB
// ==============================

// Busca la carpeta frontend
const frontend = path.join(__dirname, "..", "..", "frontend");

// Si existe, permite acceder a sus archivos
if (fs.existsSync(frontend)) {
    app.use(express.static(frontend));
}

// ==============================
// MANEJO DE ERRORES
// ==============================

// Captura errores del servidor
app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        ok: false,
        error: "Error del servidor."
    });
});

// ==============================
// INICIAR SERVIDOR
// ==============================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Servidor listo en http://localhost:" + PORT);
});
