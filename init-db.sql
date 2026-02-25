-- =============================================
-- SISTEMA DE GESTIÓN DE GYMNASIUM
-- Base de Datos: GYM_DB
-- MySQL 8.0 para Laragon
-- =============================================

-- Seleccionar o crear base de datos
DROP DATABASE IF EXISTS GYM_DB;
CREATE DATABASE GYM_DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE GYM_DB;

-- =============================================
-- TABLA: CLIENTES
-- =============================================
CREATE TABLE clientes (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    dni VARCHAR(15) UNIQUE NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    categoria ENUM('A', 'B', 'C') DEFAULT 'C',
    telefono VARCHAR(20),
    email VARCHAR(100),
    activo TINYINT(1) DEFAULT 1,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dni (dni),
    INDEX idx_activo (activo),
    INDEX idx_categoria (categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: USUARIOS
-- =============================================
CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    tipo_usuario ENUM('ADMIN', 'CLIENTE') NOT NULL,
    id_cliente INT NULL,
    activo TINYINT(1) DEFAULT 1,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL,
    INDEX idx_username (username),
    INDEX idx_tipo (tipo_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TURNOS
-- =============================================
CREATE TABLE turnos (
    id_turno INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    actividad VARCHAR(50) NOT NULL,
    descripcion TEXT,
    cupo_maximo INT NOT NULL,
    cupo_disponible INT NOT NULL,
    estado ENUM('ACTIVO', 'CANCELADO') DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fecha (fecha),
    INDEX idx_estado (estado),
    INDEX idx_actividad (actividad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: PAGOS
-- =============================================
CREATE TABLE pagos (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    fecha_pago DATE NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    periodo VARCHAR(7) NOT NULL,
    estado ENUM('PAGADO', 'PENDIENTE') DEFAULT 'PAGADO',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    UNIQUE KEY unique_cliente_periodo (id_cliente, periodo),
    INDEX idx_cliente (id_cliente),
    INDEX idx_periodo (periodo),
    INDEX idx_fecha (fecha_pago)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: INSCRIPCIONES
-- =============================================
CREATE TABLE inscripciones (
    id_inscripcion INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_turno INT NOT NULL,
    estado ENUM('ACTIVO', 'CANCELADO') DEFAULT 'ACTIVO',
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    FOREIGN KEY (id_turno) REFERENCES turnos(id_turno) ON DELETE CASCADE,
    UNIQUE KEY unique_cliente_turno (id_cliente, id_turno),
    INDEX idx_cliente (id_cliente),
    INDEX idx_turno (id_turno),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: AUDITORIA
-- =============================================
CREATE TABLE auditoria (
    id_auditoria INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    accion VARCHAR(100) NOT NULL,
    detalles JSON,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_usuario (usuario_id),
    INDEX idx_accion (accion),
    INDEX idx_fecha (fecha_hora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- DATOS DE PRUEBA
-- =============================================

-- Insertar clientes de prueba
INSERT INTO clientes (dni, nombre, apellido, categoria, telefono, email) VALUES
('12345678', 'Juan', 'Pérez', 'A', '1234567890', 'juan@example.com'),
('87654321', 'María', 'García', 'B', '0987654321', 'maria@example.com'),
('11111111', 'Carlos', 'López', 'C', '1111111111', 'carlos@example.com'),
('22222222', 'Ana', 'Rodríguez', 'A', '2222222222', 'ana@example.com'),
('33333333', 'Pedro', 'Martínez', 'B', '3333333333', 'pedro@example.com');

-- Insertar usuarios (admin y cliente)
INSERT INTO usuarios (username, password, tipo_usuario, id_cliente) VALUES
('admin', 'admin123', 'ADMIN', NULL),
('cliente', '123', 'CLIENTE', 1),
('maria', '456', 'CLIENTE', 2),
('carlos', '789', 'CLIENTE', 3),
('ana', '101112', 'CLIENTE', 4),
('pedro', '131415', 'CLIENTE', 5);

-- Insertar turnos de prueba (próximas 2 semanas)
INSERT INTO turnos (fecha, hora, actividad, descripcion, cupo_maximo, cupo_disponible) VALUES
(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '07:00:00', 'Funcional', 'Entrenamiento versátil con peso corporal y elementos', 15, 15),
(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00', 'Musculación', 'Trabajo de fuerza con máquinas y pesas libres', 12, 12),
(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '17:00:00', 'Yoga', 'Flexibilidad y bienestar', 20, 20),
(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '07:30:00', 'Cardio', 'Ejercicios aeróbicos en máquinas', 10, 10),
(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '18:00:00', 'Pilates', 'Fortalecimiento de core', 15, 15),
(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '08:00:00', 'Zumba', 'Danza y ritmo', 18, 18),
(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '07:00:00', 'Funcional', 'Entrenamiento versátil con peso corporal y elementos', 15, 15),
(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '19:00:00', 'Musculación', 'Trabajo de fuerza con máquinas y pesas libres', 12, 12);

-- Insertar pagos (mes actual)
INSERT INTO pagos (id_cliente, fecha_pago, monto, periodo) VALUES
(1, CURDATE(), 5000, DATE_FORMAT(CURDATE(), '%Y-%m')),
(2, CURDATE(), 5000, DATE_FORMAT(CURDATE(), '%Y-%m')),
(3, CURDATE(), 5000, DATE_FORMAT(CURDATE(), '%Y-%m')),
(4, CURDATE(), 5000, DATE_FORMAT(CURDATE(), '%Y-%m'));
-- Nota: id_cliente 5 (Pedro) NO tiene pago, está adeudado

-- Insertar inscripciones de ejemplo
INSERT INTO inscripciones (id_cliente, id_turno) VALUES
(1, 1),
(1, 2),
(2, 1),
(3, 3),
(4, 4);

-- =============================================
-- VERIFICACIÓN Y CONSULTAS ÚTILES
-- =============================================

-- Ver estructura de tablas
-- SHOW TABLES;
-- DESC clientes;
-- DESC usuarios;
-- DESC turnos;
-- DESC pagos;
-- DESC inscripciones;
-- DESC auditoria;

-- Ver datos insertados
-- SELECT * FROM clientes;
-- SELECT * FROM usuarios;
-- SELECT * FROM turnos;
-- SELECT * FROM pagos;
-- SELECT * FROM inscripciones;

-- Ver clientes con estado de pago actual
-- SELECT c.id_cliente, c.nombre, c.apellido, 
--        CASE WHEN p.id_pago IS NOT NULL THEN 'PAGADO' ELSE 'ADEUDADO' END as estado_pago,
--        p.monto
-- FROM clientes c
-- LEFT JOIN pagos p ON c.id_cliente = p.id_cliente AND p.periodo = DATE_FORMAT(CURDATE(), '%Y-%m')
-- WHERE c.activo = 1
-- ORDER BY c.apellido;