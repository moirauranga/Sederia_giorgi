-- =====================================================
-- Sedería Georgi — estructura de la base de datos
-- Ejecutar una sola vez:  mysql -u root -p < sql/schema.sql
-- Se puede volver a ejecutar sin problema: no borra ni duplica nada
-- (así se agregan las tablas nuevas a una base que ya existe).
-- =====================================================

CREATE DATABASE IF NOT EXISTS sederia_georgi
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sederia_georgi;

-- Usuarios que pueden entrar al sistema
CREATE TABLE IF NOT EXISTS usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario       VARCHAR(50)  NOT NULL UNIQUE,
  nombre        VARCHAR(100) NOT NULL,
  rol           VARCHAR(30)  NOT NULL DEFAULT 'Administradora',
  password_hash VARCHAR(255) NOT NULL,
  activo        TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(80)  NOT NULL,
  apellido      VARCHAR(80)  NOT NULL,
  telefono      VARCHAR(30)  NOT NULL,
  email         VARCHAR(120) NOT NULL,
  dni           VARCHAR(15)  NOT NULL UNIQUE,
  calle         VARCHAR(120) NOT NULL,
  numero        VARCHAR(10)  NULL,
  localidad     VARCHAR(80)  NOT NULL,
  observaciones TEXT         NULL,
  creado_en     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_nombre (apellido, nombre)
) ENGINE=InnoDB;

-- Pedidos (cabecera: cliente, estado, total y fecha de entrega)
CREATE TABLE IF NOT EXISTS pedidos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id    INT NOT NULL,
  estado        ENUM('Pendiente','En preparación','Listo','Entregado') NOT NULL DEFAULT 'Pendiente',
  total         DECIMAL(12,2) NOT NULL DEFAULT 0,
  fecha_entrega DATE NULL,
  creado_en     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pedido_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Productos (telas) que se pueden elegir al crear un pedido.
-- Cuando armemos la pantalla de Stock, esta tabla se completa desde ahí.
CREATE TABLE IF NOT EXISTS productos (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80)   NOT NULL UNIQUE,
  precio DECIMAL(12,2) NOT NULL DEFAULT 0,      -- precio sugerido (en el pedido se puede cambiar)
  activo TINYINT(1)    NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- Colores disponibles de cada producto
CREATE TABLE IF NOT EXISTS producto_colores (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT         NOT NULL,
  color       VARCHAR(40) NOT NULL,
  UNIQUE KEY uq_producto_color (producto_id, color),
  CONSTRAINT fk_color_producto FOREIGN KEY (producto_id)
    REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Renglones de cada pedido. Guardan nombre y precio "congelados" al momento de la venta,
-- así el pedido no cambia si después se modifica el producto.
CREATE TABLE IF NOT EXISTS pedido_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id   INT           NOT NULL,
  producto_id INT           NULL,
  nombre      VARCHAR(80)   NOT NULL,
  color       VARCHAR(40)   NOT NULL,
  cantidad    INT           NOT NULL,
  precio      DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_item_pedido   FOREIGN KEY (pedido_id)   REFERENCES pedidos(id)   ON DELETE CASCADE,
  CONSTRAINT fk_item_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Productos de ejemplo (INSERT IGNORE: si ya existen, no se vuelven a cargar)
INSERT IGNORE INTO productos (nombre, precio) VALUES
  ('Gabardina', 5500),
  ('Algodón',   3500),
  ('Lino',      7000);

INSERT IGNORE INTO producto_colores (producto_id, color)
  SELECT id, c.color FROM productos
  JOIN (SELECT 'Gabardina' AS n, 'Beige' AS color UNION ALL SELECT 'Gabardina', 'Negro'  UNION ALL SELECT 'Gabardina', 'Azul'
        UNION ALL SELECT 'Algodón',   'Blanca' UNION ALL SELECT 'Algodón',   'Crema'  UNION ALL SELECT 'Algodón',   'Gris'
        UNION ALL SELECT 'Lino',      'Natural' UNION ALL SELECT 'Lino',     'Blanco' UNION ALL SELECT 'Lino',      'Verde') c
    ON c.n = productos.nombre;
