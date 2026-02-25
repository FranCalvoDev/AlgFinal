const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));
// ============================================
// WEBSOCKET - NOTIFICACIONES EN TIEMPO REAL
// ============================================

const clientes = new Set();

wss.on('connection', (ws) => {
    console.log('🔌 Nuevo cliente WebSocket conectado');
    clientes.add(ws);

    ws.on('close', () => {
        console.log('🔌 Cliente WebSocket desconectado');
        clientes.delete(ws);
    });

    ws.on('error', (err) => {
        console.error('Error WebSocket:', err);
    });
});

// Función para notificar a todos los clientes conectados
function notificarCambios(evento, datos) {
    clientes.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ evento, datos, timestamp: new Date() }));
        }
    });
    console.log(`📢 Evento: ${evento}`);
}

// ============================================
// UTILIDADES Y FUNCIONES AUXILIARES
// ============================================

function getPeriodoActual() {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    return `${año}-${mes}`;
}

function manejarError(res, err, mensaje, statusCode = 500) {
    console.error(`[ERROR] ${mensaje}:`, err);
    res.status(statusCode).json({ 
        error: mensaje,
        detalles: err.message 
    });
}

function validarDNI(dni) {
    return dni && dni.length > 0 && dni.length <= 15;
}

function registrarAuditoria(usuario_id, accion, detalles) {
    const sql = `INSERT INTO auditoria (usuario_id, accion, detalles) VALUES (?, ?, ?)`;
    db.query(sql, [usuario_id, accion, JSON.stringify(detalles)], (err) => {
        if (err) console.error('Error registrando auditoría:', err);
    });
}
// Configuración MySQL 8
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Fachi_65', 
    database: 'GYM_DB'
});

db.connect(err => {
    if (err) {
        console.error('Error conectando a MySQL:', err.message);
        return;
    }
    console.log('Conectado a MySQL 8.0 en Laragon');
});

// Función para notificar a todos los clientes conectados
function notificarCambios(evento, datos) {
    clientes.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ evento, datos, timestamp: new Date() }));
        }
    });
    console.log(`📢 Evento: ${evento}`);
}

// ============================================
// UTILIDADES Y FUNCIONES AUXILIARES
// ============================================

function getPeriodoActual() {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    return `${año}-${mes}`;
}

function manejarError(res, err, mensaje, statusCode = 500) {
    console.error(`[ERROR] ${mensaje}:`, err);
    res.status(statusCode).json({ 
        error: mensaje,
        detalles: err.message 
    });
}

function validarDNI(dni) {
    return dni && dni.length > 0 && dni.length <= 15;
}

function registrarAuditoria(usuario_id, accion, detalles) {
    const sql = `INSERT INTO auditoria (usuario_id, accion, detalles) VALUES (?, ?, ?)`;
    db.query(sql, [usuario_id, accion, JSON.stringify(detalles)], (err) => {
        if (err) console.error('Error registrando auditoría:', err);
    });
}

// ============================================
// CREAR TABLA DE AUDITORÍA (SI NO EXISTE)
// ============================================

app.get('/init-audit', (req, res) => {
    const sql = `
        CREATE TABLE IF NOT EXISTS auditoria (
            id_auditoria INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT,
            accion VARCHAR(100),
            detalles JSON,
            fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    db.query(sql, (err) => {
        if (err) return manejarError(res, err, 'Error creando tabla de auditoría');
        res.json({ mensaje: 'Tabla de auditoría creada/verificada' });
    });
});

// ============================================
// AUTENTICACIÓN
// ============================================

app.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
        }

        db.query(
            'SELECT id_usuario, username, tipo_usuario, id_cliente FROM usuarios WHERE username = ? AND password = ?', 
            [username, password], 
            (err, result) => {
                if (err) return manejarError(res, err, 'Error en consulta de login', 500);
                
                if (result.length === 0) {
                    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
                }
                
                const usuario = result[0];
                notificarCambios('usuario_login', { usuario: usuario.username, timestamp: new Date() });
                res.json({
                    id_usuario: usuario.id_usuario,
                    username: usuario.username,
                    tipo_usuario: usuario.tipo_usuario,
                    id_cliente: usuario.id_cliente
                });
            }
        );
    } catch (err) {
        manejarError(res, err, 'Error inesperado en login');
    }
});

// ============================================
// ADMIN - GESTIÓN DE CLIENTES (MEJORADO)
// ============================================

// ADMIN: Crear nuevo cliente con más campos
app.post('/admin/clientes', (req, res) => {
    try {
        const { dni, nombre, apellido, categoria, telefono, email } = req.body;
        
        if (!validarDNI(dni)) {
            return res.status(400).json({ error: 'DNI inválido' });
        }
        if (!nombre || nombre.trim().length === 0) {
            return res.status(400).json({ error: 'Nombre requerido' });
        }
        if (!apellido || apellido.trim().length === 0) {
            return res.status(400).json({ error: 'Apellido requerido' });
        }
        if (!['A', 'B', 'C'].includes(categoria)) {
            return res.status(400).json({ error: 'Categoría debe ser A, B o C' });
        }

        db.query(
            'INSERT INTO clientes (dni, nombre, apellido, categoria, telefono, email) VALUES (?, ?, ?, ?, ?, ?)',
            [dni, nombre, apellido, categoria, telefono || null, email || null],
            (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({ error: 'DNI ya existe' });
                    }
                    return manejarError(res, err, 'Error al crear cliente');
                }
                
                registrarAuditoria(req.body.usuario_id || 1, 'CREAR_CLIENTE', { dni, nombre, apellido });
                notificarCambios('cliente_creado', { id: result.insertId, nombre, apellido });
                
                res.status(201).json({ 
                    id_cliente: result.insertId,
                    mensaje: 'Cliente creado exitosamente'
                });
            }
        );
    } catch (err) {
        manejarError(res, err, 'Error inesperado al crear cliente');
    }
});

// ADMIN: Ver todos los clientes activos
app.get('/admin/clientes', (req, res) => {
    try {
        db.query(
            'SELECT * FROM clientes WHERE activo = 1 ORDER BY apellido, nombre',
            (err, results) => {
                if (err) return manejarError(res, err, 'Error al obtener clientes');
                res.json(results);
            }
        );
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// ADMIN: Ver clientes por categoría
app.get('/admin/clientes/:cat', (req, res) => {
    try {
        if (!['A', 'B', 'C'].includes(req.params.cat)) {
            return res.status(400).json({ error: 'Categoría inválida' });
        }

        db.query(
            'SELECT * FROM clientes WHERE categoria = ? AND activo = 1 ORDER BY apellido',
            [req.params.cat],
            (err, results) => {
                if (err) return manejarError(res, err, 'Error al filtrar clientes');
                res.json(results);
            }
        );
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// ADMIN: Buscar cliente por término (nombre, DNI, email)
app.get('/admin/clientes-buscar/:termino', (req, res) => {
    try {
        const termino = `%${req.params.termino}%`;
        
        db.query(
            `SELECT * FROM clientes 
             WHERE activo = 1 AND (dni LIKE ? OR nombre LIKE ? OR apellido LIKE ? OR email LIKE ?)
             ORDER BY apellido, nombre
             LIMIT 20`,
            [termino, termino, termino, termino],
            (err, results) => {
                if (err) return manejarError(res, err, 'Error en búsqueda');
                res.json(results);
            }
        );
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// ADMIN: Actualizar cliente
app.put('/admin/clientes/:id', (req, res) => {
    try {
        const { nombre, apellido, categoria, telefono, email } = req.body;
        const clienteId = req.params.id;

        if (!clienteId || isNaN(clienteId)) {
            return res.status(400).json({ error: 'ID de cliente inválido' });
        }

        let campos = [];
        let valores = [];
        if (nombre) { campos.push('nombre = ?'); valores.push(nombre); }
        if (apellido) { campos.push('apellido = ?'); valores.push(apellido); }
        if (categoria) { campos.push('categoria = ?'); valores.push(categoria); }
        if (telefono !== undefined) { campos.push('telefono = ?'); valores.push(telefono); }
        if (email !== undefined) { campos.push('email = ?'); valores.push(email); }

        if (campos.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        valores.push(clienteId);

        db.query(
            `UPDATE clientes SET ${campos.join(', ')} WHERE id_cliente = ?`,
            valores,
            (err, result) => {
                if (err) return manejarError(res, err, 'Error al actualizar cliente');
                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Cliente no encontrado' });
                }
                
                registrarAuditoria(req.body.usuario_id || 1, 'ACTUALIZAR_CLIENTE', { id: clienteId });
                notificarCambios('cliente_actualizado', { id: clienteId });
                
                res.json({ mensaje: 'Cliente actualizado exitosamente' });
            }
        );
    } catch (err) {
        manejarError(res, err, 'Error inesperado al actualizar cliente');
    }
});

// ADMIN: Baja lógica de cliente
app.delete('/admin/clientes/:id', (req, res) => {
    try {
        const clienteId = req.params.id;

        if (!clienteId || isNaN(clienteId)) {
            return res.status(400).json({ error: 'ID de cliente inválido' });
        }

        db.query(
            'UPDATE clientes SET activo = 0 WHERE id_cliente = ?',
            [clienteId],
            (err, result) => {
                if (err) return manejarError(res, err, 'Error al desactivar cliente');
                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Cliente no encontrado' });
                }

                db.query(
                    'UPDATE inscripciones SET estado = "CANCELADO" WHERE id_cliente = ? AND estado = "ACTIVO"',
                    [clienteId]
                );

                registrarAuditoria(req.body.usuario_id || 1, 'DESACTIVAR_CLIENTE', { id: clienteId });
                notificarCambios('cliente_desactivado', { id: clienteId });

                res.json({ mensaje: 'Cliente desactivado exitosamente' });
            }
        );
    } catch (err) {
        manejarError(res, err, 'Error inesperado al desactivar cliente');
    }
});

// ADMIN: Buscar cliente por DNI
app.get('/admin/cliente-dni/:dni', (req, res) => {
    try {
        if (!validarDNI(req.params.dni)) {
            return res.status(400).json({ error: 'DNI inválido' });
        }

        const sql = `
            SELECT c.*, 
                   COUNT(CASE WHEN p.id_pago THEN 1 END) as pagos_realizados,
                   SUM(CASE WHEN p.id_pago THEN p.monto ELSE 0 END) as total_pagado,
                   GROUP_CONCAT(CONCAT(p.periodo, ':', p.monto) SEPARATOR '|') as historial_pagos
            FROM clientes c 
            LEFT JOIN pagos p ON c.id_cliente = p.id_cliente 
            WHERE c.dni = ? AND c.activo = 1
            GROUP BY c.id_cliente`;
        
        db.query(sql, [req.params.dni], (err, results) => {
            if (err) return manejarError(res, err, 'Error al buscar cliente');
            if (results.length === 0) {
                return res.status(404).json({ error: 'Cliente no encontrado' });
            }
            res.json(results[0]);
        });
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// ============================================
// ADMIN - GESTIÓN DE TURNOS (MEJORADO)
// ============================================

// ADMIN: Crear nuevo turno
app.post('/admin/turnos', (req, res) => {
    try {
        const { fecha, hora, actividad, cupo_maximo, descripcion } = req.body;

        if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return res.status(400).json({ error: 'Fecha inválida (formato: YYYY-MM-DD)' });
        }
        if (!hora || !/^\d{2}:\d{2}:\d{2}$/.test(hora)) {
            return res.status(400).json({ error: 'Hora inválida (formato: HH:MM:SS)' });
        }
        if (!actividad || actividad.trim().length === 0) {
            return res.status(400).json({ error: 'Actividad requerida' });
        }
        if (!cupo_maximo || cupo_maximo <= 0) {
            return res.status(400).json({ error: 'Cupo máximo debe ser mayor a 0' });
        }

        const fechaTurno = new Date(fecha);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        if (fechaTurno < hoy) {
            return res.status(400).json({ error: 'No se pueden crear turnos en fechas pasadas' });
        }

        db.query(
            'INSERT INTO turnos (fecha, hora, actividad, cupo_maximo, cupo_disponible, descripcion) VALUES (?, ?, ?, ?, ?, ?)',
            [fecha, hora, actividad, cupo_maximo, cupo_maximo, descripcion || null],
            (err, result) => {
                if (err) return manejarError(res, err, 'Error al crear turno');
                
                registrarAuditoria(req.body.usuario_id || 1, 'CREAR_TURNO', { actividad, fecha, hora });
                notificarCambios('turno_creado', { id: result.insertId, actividad, fecha, hora });
                
                res.status(201).json({ 
                    id_turno: result.insertId,
                    mensaje: 'Turno creado exitosamente'
                });
            }
        );
    } catch (err) {
        manejarError(res, err, 'Error inesperado al crear turno');
    }
});

// ADMIN: Ver todos los turnos
app.get('/admin/turnos', (req, res) => {
    try {
        db.query(
            `SELECT t.*, 
                    (t.cupo_maximo - t.cupo_disponible) as inscriptos,
                    t.cupo_disponible
             FROM turnos t 
             ORDER BY t.fecha DESC, t.hora DESC`,
            (err, results) => {
                if (err) return manejarError(res, err, 'Error al obtener turnos');
                res.json(results);
            }
        );
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// ADMIN: Cancelar turno
app.put('/admin/turnos/:id/cancelar', (req, res) => {
    try {
        const turnoId = req.params.id;

        if (!turnoId || isNaN(turnoId)) {
            return res.status(400).json({ error: 'ID de turno inválido' });
        }

        db.query(
            'SELECT * FROM turnos WHERE id_turno = ?',
            [turnoId],
            (err, results) => {
                if (err) return manejarError(res, err, 'Error al consultar turno');
                if (results.length === 0) {
                    return res.status(404).json({ error: 'Turno no encontrado' });
                }
                if (results[0].estado === 'CANCELADO') {
                    return res.status(400).json({ error: 'El turno ya está cancelado' });
                }

                db.query(
                    'UPDATE turnos SET estado = "CANCELADO" WHERE id_turno = ?',
                    [turnoId],
                    (err) => {
                        if (err) return manejarError(res, err, 'Error al cancelar turno');
                        
                        db.query(
                            'UPDATE inscripciones SET estado = "CANCELADO" WHERE id_turno = ? AND estado = "ACTIVO"',
                            [turnoId]
                        );

                        registrarAuditoria(req.body.usuario_id || 1, 'CANCELAR_TURNO', { id: turnoId });
                        notificarCambios('turno_cancelado', { id: turnoId });

                        res.json({ mensaje: 'Turno cancelado exitosamente' });
                    }
                );
            }
        );
    } catch (err) {
        manejarError(res, err, 'Error inesperado al cancelar turno');
    }
});

// ADMIN: Ver inscriptos por turno
app.get('/admin/turnos/:id/inscriptos', (req, res) => {
    try {
        const turnoId = req.params.id;

        if (!turnoId || isNaN(turnoId)) {
            return res.status(400).json({ error: 'ID de turno inválido' });
        }

        const sql = `
            SELECT c.id_cliente, c.dni, c.nombre, c.apellido, c.categoria,
                   i.id_inscripcion, i.estado, i.id_turno,
                   t.fecha, t.hora, t.actividad
            FROM inscripciones i
            JOIN clientes c ON i.id_cliente = c.id_cliente
            JOIN turnos t ON i.id_turno = t.id_turno
            WHERE i.id_turno = ? AND i.estado = "ACTIVO"
            ORDER BY c.apellido, c.nombre`;

        db.query(sql, [turnoId], (err, results) => {
            if (err) return manejarError(res, err, 'Error al obtener inscriptos');
            res.json(results);
        });
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// ADMIN: Reporte de ocupación
app.get('/admin/reporte-ocupacion', (req, res) => {
    try {
        const sql = `
            SELECT t.id_turno, t.actividad, t.fecha, t.hora,
                   t.cupo_maximo,
                   (t.cupo_maximo - t.cupo_disponible) as inscriptos,
                   t.cupo_disponible,
                   ROUND(((t.cupo_maximo - t.cupo_disponible) / t.cupo_maximo * 100), 2) as porcentaje_ocupacion,
                   t.estado
            FROM turnos t
            WHERE t.fecha >= CURDATE()
            ORDER BY t.fecha DESC, t.hora DESC`;

        db.query(sql, (err, results) => {
            if (err) return manejarError(res, err, 'Error al generar reporte');
            res.json(results);
        });
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// ============================================
// ADMIN - REPORTES FINANCIEROS (MEJORADO)
// ============================================

// ADMIN: Ver ingresos por periodo
app.get('/admin/ingresos/:periodo', (req, res) => {
    try {
        const periodo = req.params.periodo;
        
        if (!/^\d{4}-\d{2}$/.test(periodo)) {
            return res.status(400).json({ error: 'Formato de periodo inválido (YYYY-MM)' });
        }

        const sql = `
            SELECT p.periodo, 
                   SUM(p.monto) as total,
                   COUNT(*) as cantidad_pagos,
                   MIN(p.fecha_pago) as primera_fecha,
                   MAX(p.fecha_pago) as ultima_fecha
            FROM pagos p
            WHERE p.periodo = ?
            GROUP BY p.periodo`;

        db.query(sql, [periodo], (err, result) => {
            if (err) return manejarError(res, err, 'Error al obtener ingresos');
            res.json(result[0] || { periodo, total: 0, cantidad_pagos: 0 });
        });
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// ADMIN: Ver ingresos del mes actual
app.get('/admin/ingresos-actuales', (req, res) => {
    try {
        const periodoActual = getPeriodoActual();

        const sql = `
            SELECT p.periodo, 
                   SUM(p.monto) as total, 
                   COUNT(*) as cantidad_pagos,
                   COUNT(DISTINCT p.id_cliente) as clientes_pagaron
            FROM pagos p
            WHERE p.periodo = ?
            GROUP BY p.periodo`;

        db.query(sql, [periodoActual], (err, result) => {
            if (err) return manejarError(res, err, 'Error al obtener ingresos');
            res.json(result[0] || { 
                periodo: periodoActual, 
                total: 0, 
                cantidad_pagos: 0,
                clientes_pagaron: 0 
            });
        });
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// ADMIN: Reporte avanzado de finanzas
app.get('/admin/reporte-finanzas', (req, res) => {
    try {
        const sql = `
            SELECT 
                COUNT(DISTINCT c.id_cliente) as total_clientes,
                SUM(CASE WHEN p.id_pago IS NOT NULL THEN 1 ELSE 0 END) as clientes_pagaron,
                SUM(p.monto) as ingresos_totales,
                AVG(p.monto) as promedio_pago,
                COUNT(DISTINCT p.periodo) as periodos_registrados
            FROM clientes c
            LEFT JOIN pagos p ON c.id_cliente = p.id_cliente
            WHERE c.activo = 1`;

        db.query(sql, (err, result) => {
            if (err) return manejarError(res, err, 'Error al generar reporte');
            res.json(result[0] || {});
        });
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// ADMIN: Registrar pago
app.post('/admin/pagos', (req, res) => {
    try {
        const { id_cliente, monto, periodo } = req.body;

        if (!id_cliente || isNaN(id_cliente)) {
            return res.status(400).json({ error: 'ID de cliente inválido' });
        }
        if (!monto || monto <= 0) {
            return res.status(400).json({ error: 'Monto debe ser mayor a 0' });
        }
        if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
            return res.status(400).json({ error: 'Formato de periodo inválido (YYYY-MM)' });
        }

        db.query('SELECT id_cliente FROM clientes WHERE id_cliente = ? AND activo = 1', [id_cliente], (err, results) => {
            if (err) return manejarError(res, err, 'Error al verificar cliente');
            if (results.length === 0) {
                return res.status(404).json({ error: 'Cliente no encontrado' });
            }

            db.query(
                'INSERT INTO pagos (id_cliente, fecha_pago, monto, periodo) VALUES (?, CURDATE(), ?, ?)',
                [id_cliente, monto, periodo],
                (err, result) => {
                    if (err) return manejarError(res, err, 'Error al registrar pago');
                    
                    registrarAuditoria(req.body.usuario_id || 1, 'REGISTRAR_PAGO', { id_cliente, monto, periodo });
                    notificarCambios('pago_registrado', { id_cliente, monto, periodo });
                    
                    res.status(201).json({ 
                        id_pago: result.insertId,
                        mensaje: 'Pago registrado exitosamente'
                    });
                }
            );
        });
    } catch (err) {
        manejarError(res, err, 'Error inesperado al registrar pago');
    }
});

// ============================================
// CLIENTE - VER TURNOS E INSCRIBIRSE
// ============================================

// CLIENTE: Ver turnos disponibles con descripción
app.get('/turnos', (req, res) => {
    try {
        const sql = `
            SELECT t.id_turno, t.actividad, t.fecha, t.hora,
                   t.cupo_maximo, t.cupo_disponible,
                   (t.cupo_maximo - t.cupo_disponible) as inscriptos,
                   CASE 
                       WHEN t.actividad = 'Funcional' THEN 'Entrenamiento versátil con peso corporal y elementos'
                       WHEN t.actividad = 'Musculación' THEN 'Trabajo de fuerza con máquinas y pesas libres'
                       WHEN t.actividad = 'Cardio' THEN 'Ejercicios aeróbicos en máquinas'
                       WHEN t.actividad = 'Yoga' THEN 'Flexibilidad y bienestar'
                       WHEN t.actividad = 'Pilates' THEN 'Fortalecimiento de core'
                       WHEN t.actividad = 'Zumba' THEN 'Danza y ritmo'
                       ELSE 'Gimnasio general'
                   END as descripcion,
                   CASE 
                       WHEN t.cupo_disponible = 0 THEN 'COMPLETO'
                       WHEN t.cupo_disponible <= 2 THEN 'CASI LLENO'
                       ELSE 'DISPONIBLE'
                   END as estado_cupo
            FROM turnos t
            WHERE t.estado = "ACTIVO" AND t.fecha >= CURDATE()
            ORDER BY t.fecha ASC, t.hora ASC`;

        db.query(sql, (err, results) => {
            if (err) return manejarError(res, err, 'Error al obtener turnos');
            res.json(results);
        });
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// CLIENTE: Inscribirse a un turno
app.post('/inscribirse', (req, res) => {
    try {
        const { id_cliente, id_turno } = req.body;
        const periodoActual = getPeriodoActual();

        if (!id_cliente || isNaN(id_cliente)) {
            return res.status(400).json({ error: 'ID de cliente inválido' });
        }
        if (!id_turno || isNaN(id_turno)) {
            return res.status(400).json({ error: 'ID de turno inválido' });
        }

        db.query('SELECT * FROM clientes WHERE id_cliente = ? AND activo = 1', [id_cliente], (err, clientes) => {
            if (err) return manejarError(res, err, 'Error al verificar cliente');
            if (clientes.length === 0) {
                return res.status(404).json({ error: 'Cliente no encontrado o inactivo' });
            }

            db.query(
                'SELECT * FROM pagos WHERE id_cliente = ? AND periodo = ?',
                [id_cliente, periodoActual],
                (err, pagos) => {
                    if (err) return manejarError(res, err, 'Error al verificar pagos');
                    if (pagos.length === 0) {
                        return res.status(403).json({ 
                            error: 'Debes pagar tu cuota antes de inscribirte',
                            periodo_adeudado: periodoActual
                        });
                    }

                    db.query('SELECT * FROM turnos WHERE id_turno = ? AND estado = "ACTIVO"', [id_turno], (err, turnos) => {
                        if (err) return manejarError(res, err, 'Error al verificar turno');
                        if (turnos.length === 0) {
                            return res.status(404).json({ error: 'Turno no encontrado o cancelado' });
                        }
                        
                        if (turnos[0].cupo_disponible <= 0) {
                            return res.status(403).json({ error: 'No hay cupos disponibles en este turno' });
                        }

                        db.query(
                            'SELECT * FROM inscripciones WHERE id_cliente = ? AND id_turno = ? AND estado = "ACTIVO"',
                            [id_cliente, id_turno],
                            (err, inscripciones) => {
                                if (err) return manejarError(res, err, 'Error al verificar inscripción');
                                if (inscripciones.length > 0) {
                                    return res.status(409).json({ error: 'Ya estás inscripto en este turno' });
                                }

                                db.query(
                                    'INSERT INTO inscripciones (id_cliente, id_turno) VALUES (?, ?)',
                                    [id_cliente, id_turno],
                                    (err, resultado) => {
                                        if (err) return manejarError(res, err, 'Error al crear inscripción');

                                        db.query(
                                            'UPDATE turnos SET cupo_disponible = cupo_disponible - 1 WHERE id_turno = ?',
                                            [id_turno],
                                            (err) => {
                                                if (err) return manejarError(res, err, 'Error al actualizar cupo');
                                                
                                                registrarAuditoria(id_cliente, 'INSCRIBIRSE_TURNO', { id_turno });
                                                notificarCambios('cliente_inscripto', { id_cliente, id_turno });
                                                
                                                res.status(201).json({
                                                    id_inscripcion: resultado.insertId,
                                                    mensaje: 'Inscripción confirmada correctamente'
                                                });
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    });
                }
            );
        });
    } catch (err) {
        manejarError(res, err, 'Error inesperado al inscribirse');
    }
});
// ============================================
// ADMIN - GESTIÓN DE CUOTAS Y ESTADOS
// ============================================

// ADMIN: Ver clientes con estado de cuota actual
app.get('/admin/clientes-estado-cuota', (req, res) => {
    try {
        const periodoActual = getPeriodoActual();
        
        const sql = `
            SELECT c.id_cliente, c.dni, c.nombre, c.apellido, c.categoria,
                   CASE 
                       WHEN p.id_pago IS NOT NULL THEN 'PAGADO'
                       ELSE 'ADEUDADO'
                   END as estado_cuota,
                   p.monto as monto_pagado,
                   p.fecha_pago,
                   COUNT(DISTINCT i.id_inscripcion) as turnos_inscriptos
            FROM clientes c
            LEFT JOIN pagos p ON c.id_cliente = p.id_cliente AND p.periodo = ?
            LEFT JOIN inscripciones i ON c.id_cliente = i.id_cliente AND i.estado = 'ACTIVO'
            WHERE c.activo = 1
            GROUP BY c.id_cliente, p.id_pago
            ORDER BY c.apellido, c.nombre`;

        db.query(sql, [periodoActual], (err, results) => {
            if (err) return manejarError(res, err, 'Error al obtener estado de cuotas');
            res.json(results);
        });
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// ADMIN: Procesar pago pendiente y habilitar cliente
app.post('/admin/procesar-cuota/:id_cliente', (req, res) => {
    try {
        const id_cliente = req.params.id_cliente;
        const { monto, periodo } = req.body;

        if (!id_cliente || isNaN(id_cliente)) {
            return res.status(400).json({ error: 'ID de cliente inválido' });
        }
        if (!monto || monto <= 0) {
            return res.status(400).json({ error: 'Monto inválido' });
        }
        if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
            return res.status(400).json({ error: 'Formato de periodo inválido (YYYY-MM)' });
        }

        // Verificar que el cliente existe
        db.query('SELECT * FROM clientes WHERE id_cliente = ? AND activo = 1', [id_cliente], (err, clientes) => {
            if (err) return manejarError(res, err, 'Error al verificar cliente');
            if (clientes.length === 0) {
                return res.status(404).json({ error: 'Cliente no encontrado o inactivo' });
            }

            // Registrar el pago
            db.query(
                'INSERT INTO pagos (id_cliente, fecha_pago, monto, periodo) VALUES (?, CURDATE(), ?, ?) ON DUPLICATE KEY UPDATE monto = ?, fecha_pago = CURDATE()',
                [id_cliente, monto, periodo, monto],
                (err, result) => {
                    if (err) return manejarError(res, err, 'Error al registrar pago');
                    
                    registrarAuditoria(req.body.usuario_id || 1, 'PROCESAR_CUOTA', { id_cliente, monto, periodo });
                    notificarCambios('cuota_procesada', { id_cliente, monto, periodo });
                    
                    res.json({ 
                        mensaje: 'Cuota procesada correctamente',
                        cliente_id: id_cliente,
                        monto: monto,
                        periodo: periodo
                    });
                }
            );
        });
    } catch (err) {
        manejarError(res, err, 'Error inesperado al procesar cuota');
    }
});

// ADMIN: Dar de baja cliente por cuota adeudada
app.post('/admin/baja-por-cuota/:id_cliente', (req, res) => {
    try {
        const id_cliente = req.params.id_cliente;
        const { motivo } = req.body;

        if (!id_cliente || isNaN(id_cliente)) {
            return res.status(400).json({ error: 'ID de cliente inválido' });
        }

        // Desactivar cliente
        db.query(
            'UPDATE clientes SET activo = 0 WHERE id_cliente = ?',
            [id_cliente],
            (err, result) => {
                if (err) return manejarError(res, err, 'Error al desactivar cliente');
                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Cliente no encontrado' });
                }

                // Cancelar inscripciones activas
                db.query(
                    'UPDATE inscripciones SET estado = "CANCELADO" WHERE id_cliente = ? AND estado = "ACTIVO"',
                    [id_cliente]
                );

                registrarAuditoria(req.body.usuario_id || 1, 'BAJA_POR_CUOTA', { id_cliente, motivo });
                notificarCambios('cliente_dado_baja_por_cuota', { id_cliente, motivo });

                res.json({ 
                    mensaje: 'Cliente dado de baja por cuota adeudada',
                    cliente_id: id_cliente
                });
            }
        );
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// ADMIN: Reactivar cliente
app.post('/admin/reactivar-cliente/:id_cliente', (req, res) => {
    try {
        const id_cliente = req.params.id_cliente;

        if (!id_cliente || isNaN(id_cliente)) {
            return res.status(400).json({ error: 'ID de cliente inválido' });
        }

        db.query(
            'UPDATE clientes SET activo = 1 WHERE id_cliente = ?',
            [id_cliente],
            (err, result) => {
                if (err) return manejarError(res, err, 'Error al reactivar cliente');
                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Cliente no encontrado' });
                }

                registrarAuditoria(req.body.usuario_id || 1, 'REACTIVAR_CLIENTE', { id_cliente });
                notificarCambios('cliente_reactivado', { id_cliente });

                res.json({ 
                    mensaje: 'Cliente reactivado correctamente',
                    cliente_id: id_cliente
                });
            }
        );
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// ADMIN: Ver clientes adeudados (sin pago actual)
app.get('/admin/clientes-adeudados', (req, res) => {
    try {
        const periodoActual = getPeriodoActual();
        
        const sql = `
            SELECT c.id_cliente, c.dni, c.nombre, c.apellido, c.categoria, c.activo,
                   COUNT(DISTINCT i.id_inscripcion) as turnos_inscriptos,
                   DATEDIFF(CURDATE(), LAST_DAY(CONCAT(?, '-01'))) as dias_adeudado
            FROM clientes c
            LEFT JOIN inscripciones i ON c.id_cliente = i.id_cliente AND i.estado = 'ACTIVO'
            WHERE c.activo = 1 
                AND c.id_cliente NOT IN (
                    SELECT DISTINCT id_cliente FROM pagos WHERE periodo = ?
                )
            GROUP BY c.id_cliente
            ORDER BY c.apellido, c.nombre`;

        db.query(sql, [periodoActual, periodoActual], (err, results) => {
            if (err) return manejarError(res, err, 'Error al obtener clientes adeudados');
            res.json(results);
        });
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});
// ============================================
// CLIENTE - GESTIONAR SUS INSCRIPCIONES
// ============================================

// CLIENTE: Ver sus turnos inscritos
app.get('/cliente/:id/mis-turnos', (req, res) => {
    try {
        const clienteId = req.params.id;

        if (!clienteId || isNaN(clienteId)) {
            return res.status(400).json({ error: 'ID de cliente inválido' });
        }

        const sql = `
            SELECT i.id_inscripcion, i.estado,
                   t.id_turno, t.fecha, t.hora, t.actividad,
                   CASE 
                       WHEN t.actividad = 'Funcional' THEN 'Entrenamiento versátil con peso corporal y elementos'
                       WHEN t.actividad = 'Musculación' THEN 'Trabajo de fuerza con máquinas y pesas libres'
                       WHEN t.actividad = 'Cardio' THEN 'Ejercicios aeróbicos en máquinas'
                       WHEN t.actividad = 'Yoga' THEN 'Flexibilidad y bienestar'
                       WHEN t.actividad = 'Pilates' THEN 'Fortalecimiento de core'
                       WHEN t.actividad = 'Zumba' THEN 'Danza y ritmo'
                       ELSE 'Gimnasio general'
                   END as descripcion
            FROM inscripciones i
            JOIN turnos t ON i.id_turno = t.id_turno
            WHERE i.id_cliente = ? AND i.estado = "ACTIVO" AND t.fecha >= CURDATE()
            ORDER BY t.fecha ASC, t.hora ASC`;

        db.query(sql, [clienteId], (err, results) => {
            if (err) return manejarError(res, err, 'Error al obtener tus turnos');
            res.json(results);
        });
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// CLIENTE: Cancelar su propia inscripción
app.delete('/cliente/:id/inscripciones/:id_inscripcion', (req, res) => {
    try {
        const clienteId = req.params.id;
        const inscripcionId = req.params.id_inscripcion;

        if (!clienteId || isNaN(clienteId) || !inscripcionId || isNaN(inscripcionId)) {
            return res.status(400).json({ error: 'Parámetros inválidos' });
        }

        db.query(
            'SELECT * FROM inscripciones WHERE id_inscripcion = ? AND id_cliente = ? AND estado = "ACTIVO"',
            [inscripcionId, clienteId],
            (err, inscripciones) => {
                if (err) return manejarError(res, err, 'Error al verificar inscripción');
                if (inscripciones.length === 0) {
                    return res.status(404).json({ error: 'Inscripción no encontrada' });
                }

                const turnoId = inscripciones[0].id_turno;

                db.query(
                    'UPDATE inscripciones SET estado = "CANCELADO" WHERE id_inscripcion = ?',
                    [inscripcionId],
                    (err) => {
                        if (err) return manejarError(res, err, 'Error al cancelar inscripción');

                        db.query(
                            'UPDATE turnos SET cupo_disponible = cupo_disponible + 1 WHERE id_turno = ?',
                            [turnoId],
                            (err) => {
                                if (err) return manejarError(res, err, 'Error al liberar cupo');
                                
                                notificarCambios('cliente_desinscripto', { id_cliente: clienteId, id_turno: turnoId });
                                
                                res.json({ mensaje: 'Inscripción cancelada exitosamente' });
                            }
                        );
                    }
                );
            }
        );
    } catch (err) {
        manejarError(res, err, 'Error inesperado al cancelar inscripción');
    }
});

// CLIENTE: Ver estado de deuda de cuota
app.get('/cliente/:id/estado-cuota', (req, res) => {
    try {
        const clienteId = req.params.id;
        const periodoActual = getPeriodoActual();

        if (!clienteId || isNaN(clienteId)) {
            return res.status(400).json({ error: 'ID de cliente inválido' });
        }

        db.query(
            'SELECT * FROM clientes WHERE id_cliente = ? AND activo = 1',
            [clienteId],
            (err, clientes) => {
                if (err) return manejarError(res, err, 'Error al verificar cliente');
                if (clientes.length === 0) {
                    return res.status(404).json({ error: 'Cliente no encontrado' });
                }

                db.query(
                    `SELECT p.*, 
                            CASE 
                                WHEN p.id_pago IS NOT NULL THEN 'PAGADO'
                                ELSE 'ADEUDADO'
                            END as estado
                     FROM (
                        SELECT ? as periodo
                     ) periodos
                     LEFT JOIN pagos p ON p.id_cliente = ? AND p.periodo = periodos.periodo`,
                    [periodoActual, clienteId],
                    (err, result) => {
                        if (err) return manejarError(res, err, 'Error al obtener estado de cuota');
                        
                        const pagado = result && result[0] && result[0].id_pago;
                        
                        res.json({
                            id_cliente: clienteId,
                            periodo_actual: periodoActual,
                            estado: pagado ? 'PAGADO' : 'ADEUDADO',
                            monto_pagado: pagado ? result[0].monto : null,
                            fecha_pago: pagado ? result[0].fecha_pago : null,
                            mensaje: pagado ? 'Tu cuota está al día' : 'Tienes una cuota adeudada'
                        });
                    }
                );
            }
        );
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// ============================================
// REPORTES Y EXPORTACIÓN
// ============================================

// Exportar clientes a CSV
app.get('/admin/clientes-csv', (req, res) => {
    try {
        db.query('SELECT * FROM clientes WHERE activo = 1', (err, results) => {
            if (err) return manejarError(res, err, 'Error al generar CSV');
            
            let csv = 'DNI,Nombre,Apellido,Categoría,Teléfono,Email\n';
            results.forEach(c => {
                csv += `"${c.dni}","${c.nombre}","${c.apellido}","${c.categoria}","${c.telefono || ''}","${c.email || ''}"\n`;
            });
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=clientes.csv');
            res.send(csv);
        });
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// Exportar turnos a CSV
app.get('/admin/turnos-csv', (req, res) => {
    try {
        db.query(
            `SELECT id_turno, actividad, fecha, hora, cupo_maximo, cupo_disponible, estado 
             FROM turnos ORDER BY fecha DESC`,
            (err, results) => {
                if (err) return manejarError(res, err, 'Error al generar CSV');
                
                let csv = 'ID,Actividad,Fecha,Hora,Cupo Máximo,Cupo Disponible,Estado\n';
                results.forEach(t => {
                    csv += `${t.id_turno},"${t.actividad}","${t.fecha}","${t.hora}",${t.cupo_maximo},${t.cupo_disponible},"${t.estado}"\n`;
                });
                
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=turnos.csv');
                res.send(csv);
            }
        );
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// ============================================
// INFO DEL SISTEMA
// ============================================

app.get('/info', (req, res) => {
    try {
        res.json({
            nombre: 'Sistema de Gestión de Gym - VERSIÓN COMPLETA',
            version: '2.0',
            periodo_actual: getPeriodoActual(),
            websocket: 'Activado - Actualizaciones en tiempo real',
            endpoints: {
                autenticacion: ['/login'],
                admin_clientes: [
                    'POST /admin/clientes',
                    'GET /admin/clientes',
                    'GET /admin/clientes/:cat',
                    'GET /admin/clientes-buscar/:termino',
                    'PUT /admin/clientes/:id',
                    'DELETE /admin/clientes/:id',
                    'GET /admin/cliente-dni/:dni'
                ],
                admin_turnos: [
                    'POST /admin/turnos',
                    'GET /admin/turnos',
                    'PUT /admin/turnos/:id/cancelar',
                    'GET /admin/turnos/:id/inscriptos',
                    'GET /admin/reporte-ocupacion'
                ],
                admin_finanzas: [
                    'GET /admin/ingresos/:periodo',
                    'GET /admin/ingresos-actuales',
                    'GET /admin/reporte-finanzas',
                    'POST /admin/pagos'
                ],
                cliente_turnos: [
                    'GET /turnos',
                    'POST /inscribirse',
                    'GET /cliente/:id/mis-turnos',
                    'DELETE /cliente/:id/inscripciones/:id_inscripcion',
                    'GET /cliente/:id/estado-cuota'
                ],
                exportacion: [
                    'GET /admin/clientes-csv',
                    'GET /admin/turnos-csv'
                ]
            }
        });
    } catch (err) {
        manejarError(res, err, 'Error inesperado');
    }
});

// ============================================
// MANEJO DE ERRORES GLOBAL
// ============================================

app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
    console.error('[ERROR GLOBAL]:', err);
    res.status(500).json({ error: 'Error del servidor' });
});

server.listen(3000, () => {
    console.log('🚀 Servidor en http://localhost:3000');
    console.log('🔌 WebSocket activado para actualizaciones en tiempo real');
});