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
        ├── clientes.js   → listar, crear, eliminar
        ├── pedidos.js    → listar, detalle, crear, eliminar
        └── productos.js  → listar (para el formulario de Crear pedido)
```

## Puesta en marcha

1. Instalar **Node.js (LTS)** y **MySQL** (con MySQL Workbench).
2. Abrir la carpeta `backend` en VS Code y, en la terminal: `npm install`
3. Crear la base: en MySQL Workbench, *File → Open SQL Script* → `sql/schema.sql` → ejecutar (⚡).
   **Si ya tenías la base creada, volvé a ejecutar el mismo script:** solo agrega las tablas nuevas (`productos`, `producto_colores`, `pedido_items`) y los productos de ejemplo; no borra ni duplica nada.
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

| Acción          | Método y ruta              | Body (JSON)                                                                              | Respuesta correcta |
|-----------------|----------------------------|------------------------------------------------------------------------------------------|--------------------|
| Login           | `POST /api/auth/login`     | `usuario`, `password`                                                                    | `{ ok, token, user: { name, role } }` |
| Listar clientes | `GET /api/clientes`        | —                                                                                        | `{ ok, clientes: [ { id, nombre, apellido, telefono, calle, numero, localidad, pedidos } ] }` |
| Crear cliente   | `POST /api/clientes`       | `nombre`, `apellido`, `telefono`, `email`, `dni`, `calle`, `numero`, `localidad`, `obs`  | `{ ok }` (status 201) |
| Eliminar cliente| `DELETE /api/clientes/:id` | —                                                                                        | `{ ok }` |
| Listar pedidos  | `GET /api/pedidos`         | —                                                                                        | `{ ok, pedidos: [ { id, numero, nombre, apellido, estado, total, fecha_entrega } ] }` |
| Detalle pedido  | `GET /api/pedidos/:id`     | —                                                                                        | `{ ok, pedido: { id, numero, nombre, apellido, telefono, email, estado, total, fecha_entrega, productos: [ { nombre, color, cantidad, precio } ] } }` |
| Crear pedido    | `POST /api/pedidos`        | `cliente_id`, `fecha_entrega` (`AAAA-MM-DD`), `productos: [ { producto_id, color, cantidad, precio } ]` | `{ ok, id }` (status 201) |
| Eliminar pedido | `DELETE /api/pedidos/:id`  | —                                                                                        | `{ ok }` |
| Listar productos| `GET /api/productos`       | —                                                                                        | `{ ok, productos: [ { id, nombre, precio, colores: [ "Beige", … ] } ] }` |

- `pedidos` (en clientes) es la cantidad de pedidos del cliente (número).
- `fecha_entrega` siempre viaja como `AAAA-MM-DD`; el frontend la muestra como `DD/MM/AAAA`.
- Al crear un pedido, el servidor **recalcula el total** a partir de los productos (ignora el `total` que mande el navegador) y toma el nombre del producto de la base.
- El pedido y sus productos se guardan en una transacción: si falla algo, no se guarda nada.

### Códigos de estado

| Código | Cuándo                                                                 |
|--------|------------------------------------------------------------------------|
| 200 / 201 | Todo bien                                                           |
| 400    | Faltan datos o son inválidos (email, DNI/CUIT, fecha, cliente o producto inexistente, cantidad o precio inválidos) |
| 401    | Usuario o contraseña incorrectos, sin token, token inválido o vencido |
| 404    | Cliente o pedido inexistente                                           |
| 409    | DNI/CUIT repetido al crear, o cliente con pedidos al eliminar          |
| 500    | Error inesperado del servidor                                          |

Ante un 401 en una ruta protegida, el frontend borra la sesión y manda al login.

## Notas

- Las contraseñas se guardan encriptadas (bcrypt), nunca en texto plano.
- Las consultas usan `?` (consultas preparadas) para evitar inyección SQL.
- El DNI/CUIT se guarda solo con números y es único.
- El token dura 8 horas (se cambia en `src/routes/auth.js`).
- Los renglones de un pedido (`pedido_items`) guardan nombre y precio al momento de la venta; si después cambia el producto, el pedido no se modifica.
- Al eliminar un pedido se eliminan sus renglones (ON DELETE CASCADE). Un cliente con pedidos no se puede eliminar.
- Los productos de `/api/productos` son de ejemplo (Gabardina, Algodón, Lino) hasta que armemos Stock.

## Pendiente

- Recuperar contraseña.
- Editar cliente (`PUT /api/clientes/:id`) y ver detalle.
- Editar pedido y cambiar su estado (`PUT /api/pedidos/:id`).
- Rutas de Proveedores y Stock (con sus tablas); Stock pasa a ser el dueño de `productos`.
- Datos reales del dashboard (hoy los pedidos próximos son de ejemplo en el frontend).
