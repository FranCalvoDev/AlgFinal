// ============================================
// CONFIG Y VARIABLES GLOBALES
// ============================================
const API_URL = 'http://localhost:3000';
let usuario = null;
let clienteEditando = null;

// ============================================
// FUNCIONES UTILIDAD
// ============================================

function mostrarNotificacion(mensaje, tipo = 'info') {
    const toast = document.getElementById('toast-notificacion');
    const toastMensaje = document.getElementById('toast-mensaje');
    
    toast.classList.remove('text-bg-success', 'text-bg-danger', 'text-bg-warning', 'text-bg-info');
    toast.classList.add(`text-bg-${tipo}`);
    toastMensaje.textContent = mensaje;
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

async function hacerRequest(url, opciones = {}) {
    try {
        const respuesta = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...opciones.headers
            },
            ...opciones
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            mostrarNotificacion(datos.error || 'Error en la solicitud', 'danger');
            return null;
        }

        return datos;
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error de conexión', 'danger');
        return null;
    }
}

function formatearFecha(fecha) {
    const opciones = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    return new Date(fecha).toLocaleDateString('es-ES', opciones);
}

// Si prefieres un JS separado, aquí irían todas las funciones