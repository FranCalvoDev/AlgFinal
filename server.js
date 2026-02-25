const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Configuración MySQL 8
const db = mysql.createConnection({
    host: '127.0.0.1', // Usar IP directa es más estable en MySQL 8
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

// LOGIN
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM usuarios WHERE username = ? AND password = ?', [username, password], (err, result) => {
        if (result.length > 0) res.json(result[0]);
        else res.status(401).send('Usuario o contraseña incorrectos');
    });
});

// ADMIN: Ver clientes por categoría (Filtro 1)
app.get('/admin/clientes/:cat', (req, res) => {
    db.query('SELECT * FROM clientes WHERE categoria = ? AND activo = 1', [req.params.cat], (err, results) => {
        res.json(results);
    });
});

// ADMIN: Ver ingresos por periodo (Listado 1)
app.get('/admin/ingresos/:periodo', (req, res) => {
    db.query('SELECT SUM(monto) as total FROM pagos WHERE periodo = ?', [req.params.periodo], (err, result) => {
        res.json(result[0]);
    });
});

// CLIENTE: Ver turnos y cupos (Listado 2)
app.get('/turnos', (req, res) => {
    db.query('SELECT * FROM turnos WHERE estado = "ACTIVO"', (err, results) => {
        res.json(results);
    });
});
// ... (mismo código de conexión anterior) ...

// --- NUEVOS ENDPOINTS PARA CUMPLIR LA CONSIGNA ---

// BUSCAR CLIENTE POR DNI (Muestra datos y sus cuotas pagas)
app.get('/admin/cliente-dni/:dni', (req, res) => {
    const sql = `
        SELECT c.*, p.monto, p.periodo, p.fecha_pago 
        FROM clientes c 
        LEFT JOIN pagos p ON c.id_cliente = p.id_cliente 
        WHERE c.dni = ?`;
    db.query(sql, [req.params.dni], (err, results) => {
        if (results.length === 0) return res.status(404).send('Cliente no encontrado');
        res.json(results);
    });
});

// CANTIDAD DE PERSONAS POR TURNO (Reporte de ocupación)
app.get('/admin/reporte-ocupacion', (req, res) => {
    const sql = `
        SELECT t.actividad, t.fecha, t.hora, 
        (t.cupo_maximo - t.cupo_disponible) as inscriptos 
        FROM turnos t`;
    db.query(sql, (err, results) => {
        res.json(results);
    });
});

// CANCELAR UN TURNO (Baja lógica / Cambio de estado)
app.put('/admin/cancelar-turno/:id', (req, res) => {
    db.query('UPDATE turnos SET estado = "CANCELADO" WHERE id_turno = ?', [req.params.id], () => {
        res.send('Turno cancelado');
    });
});
// CLIENTE: Inscribirse (Reglas de negocio)
app.post('/inscribirse', (req, res) => {
    const { id_cliente, id_turno, periodo_actual } = req.body;

    // 1. Validar si pagó la cuota
    db.query('SELECT * FROM pagos WHERE id_cliente = ? AND periodo = ?', [id_cliente, periodo_actual], (err, pagos) => {
        if (pagos.length === 0) return res.status(403).send('Error: Debes la cuota de este mes.');

        // 2. Validar cupo
        db.query('SELECT cupo_disponible FROM turnos WHERE id_turno = ?', [id_turno], (err, turnos) => {
            if (turnos[0].cupo_disponible <= 0) return res.status(403).send('Error: No hay cupos disponibles.');

            // 3. Registrar
            db.query('INSERT INTO inscripciones (id_cliente, id_turno) VALUES (?, ?)', [id_cliente, id_turno], () => {
                db.query('UPDATE turnos SET cupo_disponible = cupo_disponible - 1 WHERE id_turno = ?', [id_turno]);
                res.send('Inscripción confirmada correctamente.');
            });
        });
    });
});

app.listen(3000, () => console.log('Servidor en http://localhost:3000'));