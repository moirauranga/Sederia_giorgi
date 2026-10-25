# Backend — Sedería Georgi

Node.js + Express + MySQL. Autenticación con JWT.

## Estructura

```
backend/
├── package.json
├── .env.example          → copiar como .env y completar
├── pruebas.http          → pruebas de la API (extensión REST Client de VS Code)
├── sql/schema.sql        → crea la base de datos y las tablas
├── scripts/crear-usuario.js
└── src/
    ├── server.js         → arranque y configuración
    ├── db.js             → conexión a MySQL
    ├── middleware/auth.js → verifica el token en las rutas protegidas
    └── routes/
        ├── auth.js       → login
        └── clientes.js   → listar, crear, eliminar
```

## Puesta en marcha

1. Instalar **Node.js (LTS)** y **MySQL** (con MySQL Workbench).
2. Abrir la carpeta `backend` en VS Code y, en la terminal: `npm install`
3. Crear la base: en MySQL Workbench, *File → Open SQL Script* → `sql/schema.sql` → ejecutar (⚡).
4. Copiar `.env.example` como `.env` y completar `DB_PASSWORD` (clave de root de MySQL) y `JWT_SECRET` (cualquier frase larga).
5. Crear un usuario: `node scripts/crear-usuario.js marita "Marita Had" "MiClave123"`
6. Iniciar: `npm start` → "Servidor listo en http://localhost:3000"
7. Probar: abrir `pruebas.http` y apretar *Send Request*, o abrir http://localhost:3000/api/health

Si existe la carpeta `../frontend` (así queda el repositorio), el servidor también muestra el sitio en http://localhost:3000.
Después de cambiar archivos de `src/` hay que reiniciar el servidor (o usar `npm run dev`, que se reinicia solo).

## Contrato de la API (lo que espera el frontend)

Todas las respuestas son JSON. Las correctas traen `"ok": true`; los errores traen `"ok": false` y un `"error"` con el mensaje para mostrar en pantalla.

El token se envía en cada pedido protegido con el header:
`Authorization: Bearer <token>`

| Acción   | Método y ruta            | Body (JSON)                                                                                              | Respuesta correcta |
|----------|--------------------------|----------------------------------------------------------------------------------------------------------|--------------------|
| Login    | `POST /api/auth/login`   | `usuario`, `password`                                                                                    | `{ ok, token, user: { name, role } }` |
| Listar   | `GET /api/clientes`      | —                                                                                                        | `{ ok, clientes: [ { id, nombre, apellido, telefono, calle, numero, localidad, pedidos } ] }` |
| Crear    | `POST /api/clientes`     | `nombre`, `apellido`, `telefono`, `email`, `dni`, `calle`, `numero`, `localidad`, `obs`                  | `{ ok }` (status 201) |
| Eliminar | `DELETE /api/clientes/:id` | —                                                                                                      | `{ ok }` |

`pedidos` es la cantidad de pedidos del cliente (número).

### Códigos de estado

| Código | Cuándo                                                                 |
|--------|------------------------------------------------------------------------|
| 200 / 201 | Todo bien                                                           |
| 400    | Faltan datos o son inválidos (email, DNI/CUIT de 7 a 11 dígitos)       |
| 401    | Usuario o contraseña incorrectos, sin token, token inválido o vencido |
| 404    | Cliente inexistente al eliminar                                        |
| 409    | DNI/CUIT repetido al crear, o cliente con pedidos al eliminar          |
| 500    | Error inesperado del servidor                                          |

Ante un 401 en una ruta protegida, el frontend borra la sesión y manda al login.

## Notas

- Las contraseñas se guardan encriptadas (bcrypt), nunca en texto plano.
- Las consultas usan `?` (consultas preparadas) para evitar inyección SQL.
- El DNI/CUIT se guarda solo con números y es único.
- El token dura 8 horas (se cambia en `src/routes/auth.js`).
- La tabla `pedidos` ya existe en el esquema, pero todavía no tiene rutas.

## Pendiente

- Recuperar contraseña.
- Editar cliente (`PUT /api/clientes/:id`) y ver detalle.
- Rutas de Pedidos, Proveedores y Stock (con sus tablas).
- Datos reales del dashboard (hoy los pedidos próximos son de ejemplo en el frontend).
