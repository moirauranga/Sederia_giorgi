-- =====================================================
-- Sedería Georgi — estructura de la base de datos
-- Ejecutar una sola vez:  mysql -u root -p < sql/schema.sql
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

-- Pedidos (se completará cuando armemos esa pantalla; ya sirve para contar pedidos por cliente)
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
