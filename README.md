# Sedería Georgi — Sistema de gestión

Aplicación web para gestionar clientes y pedidos de **Sedería Georgi**. Funciona desde el navegador, se adapta a computadora, tablet y celular, y respeta el modo oscuro del dispositivo.

> 📖 ¿Buscás cómo usar el sistema? Mirá el [Manual de usuario](MANUAL_DE_USUARIO.md).

## Funcionalidades

| Sección | Estado | Qué permite |
|---|---|---|
| **Inicio** | ✅ Disponible | Resumen con cantidad de clientes y listado de pedidos próximos a entregar |
| **Clientes** | ✅ Disponible | Listado con búsqueda, filtro (con/sin pedidos) y paginación |
| **Nuevo cliente** | ✅ Disponible | Alta de clientes con datos personales y dirección |
| **Pedidos** | ✅ Disponible | Listado con búsqueda por cliente o N° de pedido, filtro por estado y paginación |
| **Crear pedido** | ✅ Disponible | Alta de pedidos con varios productos y cálculo automático del total |
| **Detalle de pedido** | ✅ Disponible | Datos del cliente, productos, total, edición e impresión |
| **Proveedores** | 🚧 Próximamente | — |
| **Stock** | 🚧 Próximamente | — |

Estados de un pedido: `Pendiente`, `En preparación`, `Listo` y `Entregado`.

## Estructura del proyecto

```
/
├── index.html            # Punto de entrada: redirige a login o dashboard según la sesión
├── login.html            # Inicio de sesión
├── dashboard.html        # Inicio / resumen
├── clientes.html         # Listado de clientes
├── nuevo-cliente.html    # Alta de cliente
├── pedidos.html          # Listado de pedidos
├── crearPedido.html      # Alta de pedido
├── pedidoDetalle.html    # Detalle de un pedido
├── proveedores.html      # (próximamente)
├── stock.html            # (próximamente)
├── css/
│   └── styles.css        # Todos los estilos del sistema
├── js/
│   ├── api.js            # Acceso a datos y sesión
│   ├── layout.js         # Menú, usuario y cierre de sesión (compartido)
│   ├── login.js
│   ├── dashboard.js
│   ├── clientes.js
│   ├── nuevo-cliente.js
│   ├── pedidos.js
│   ├── crearPedido.js
│   └── pedidoDetalle.js
└── imagenes/
    └── sederia.jpeg      # Logo
```

## Cómo usarlo

El proyecto es HTML, CSS y JavaScript sin dependencias ni paso de compilación.

1. Cloná el repositorio:
   ```bash
   git clone <URL-DEL-REPOSITORIO>
   cd <carpeta-del-repositorio>
   ```
2. Abrí `index.html` en el navegador, o levantá un servidor local (recomendado):
   ```bash
   # con Python
   python3 -m http.server 8000
   # o con Node
   npx serve
   ```
3. Entrá a `http://localhost:8000`.

`index.html` te lleva a `login.html` si no hay sesión iniciada, o a `dashboard.html` si ya la hay.

## Estilos

Todos los estilos están en un único archivo, `css/styles.css`, ordenado en secciones numeradas (colores, base, logo, login, estructura, tablas, clientes, formulario, pedidos, aviso, tablet, celular, impresión y modo oscuro).

Para cambiar la paleta de colores, modificá solo las variables de la sección **1. Colores** (`:root`). El modo oscuro redefine esas mismas variables, y es opcional: si no lo querés, borrá la sección 14.

### Pantallas

- **Computadora:** menú lateral con íconos y texto.
- **Tablet (hasta 1024 px):** menú lateral angosto, solo íconos.
- **Celular (hasta 640 px):** el menú pasa a una barra inferior.
- **Impresión:** el detalle de un pedido se imprime sin menú ni botones.

## Agregar una página nueva

1. Copiá una página existente (por ejemplo `proveedores.html`) y cambiá el título, el `class="on"` del menú y el contenido.
2. Cargá siempre `css/styles.css`, y los scripts `js/api.js` y `js/layout.js`.
3. Si la página necesita lógica propia, creá su archivo en `js/` y cargalo al final.

## Licencia

Proyecto de uso interno de Sedería Georgi. Agregá acá la licencia que corresponda si lo vas a publicar.
