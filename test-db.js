const mysql = require('mysql2');

console.log('🔍 INICIANDO TEST DE CONEXIÓN A BASE DE DATOS...\n');

const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Fachi_65', 
    database: 'GYM_DB'
});

db.connect(err => {
    if (err) {
        console.error('❌ ERROR CONECTANDO A MYSQL:', err.message);
        process.exit(1);
    }
    console.log('✅ CONEXIÓN A MYSQL EXITOSA\n');
    
    testearTablas();
});

function testearTablas() {
    // Test 1: Clientes
    db.query('SELECT COUNT(*) as total FROM clientes WHERE activo = 1', (err, result) => {
        if (err) {
            console.error('❌ ERROR EN TABLA CLIENTES:', err.message);
        } else {
            console.log(`✅ CLIENTES ACTIVOS: ${result[0].total}`);
        }
    });

    // Test 2: Usuarios
    db.query('SELECT COUNT(*) as total FROM usuarios', (err, result) => {
        if (err) {
            console.error('❌ ERROR EN TABLA USUARIOS:', err.message);
        } else {
            console.log(`✅ USUARIOS TOTALES: ${result[0].total}`);
        }
    });

    // Test 3: Turnos
    db.query('SELECT COUNT(*) as total FROM turnos WHERE estado = "ACTIVO"', (err, result) => {
        if (err) {
            console.error('❌ ERROR EN TABLA TURNOS:', err.message);
        } else {
            console.log(`✅ TURNOS ACTIVOS: ${result[0].total}`);
        }
    });

    // Test 4: Pagos
    db.query('SELECT COUNT(*) as total FROM pagos', (err, result) => {
        if (err) {
            console.error('❌ ERROR EN TABLA PAGOS:', err.message);
        } else {
            console.log(`✅ PAGOS REGISTRADOS: ${result[0].total}`);
        }
    });

    // Test 5: Inscripciones
    db.query('SELECT COUNT(*) as total FROM inscripciones WHERE estado = "ACTIVO"', (err, result) => {
        if (err) {
            console.error('❌ ERROR EN TABLA INSCRIPCIONES:', err.message);
        } else {
            console.log(`✅ INSCRIPCIONES ACTIVAS: ${result[0].total}`);
            console.log('\n🎉 TODOS LOS TESTS COMPLETADOS');
            db.end();
        }
    });
}