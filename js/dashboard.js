// js/dashboard.js

// 1. Verificamos si la sesión de usuario existe
const userId = localStorage.getItem('usuario_id');
if (!userId) {
    window.location.replace('index.html');
}

// 2. Mostramos el nombre de la anfitriona
document.getElementById('userNameDisplay').textContent = localStorage.getItem('usuario_nombre');

// ==========================================
// 3. EL CULPABLE ESTABA AQUÍ (Corregido)
// ==========================================
document.getElementById('btnLogout').addEventListener('click', () => {
    if(confirm('¿Seguro que deseas cerrar sesión?')) {
        // SOLUCIÓN: Solo borramos el usuario. 
        // NO usamos localStorage.clear() para no matar el turno.
        localStorage.removeItem('usuario_id');
        localStorage.removeItem('usuario_nombre');
        
        window.location.replace('index.html');
    }
});

// ==========================================
// 4. VERIFICAR SI TIENE UN TURNO A MEDIAS
// ==========================================
const turnoActivo = localStorage.getItem('turno_activo_id');
const btnMainTurno = document.getElementById('btnMainTurno');
const textoBtnTurno = document.getElementById('textoBtnTurno');

if (turnoActivo) {
    // Si detecta un turno activo, el botón se vuelve verde
    btnMainTurno.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    btnMainTurno.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
    textoBtnTurno.textContent = 'CONTINUAR TURNO ACTUAL';
}

// 5. Ir a la pantalla de turno
btnMainTurno.addEventListener('click', () => {
    window.location.href = 'turno.html';
});

// ==========================================
// 6. CARGAR EL HISTORIAL DE REPORTES
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await cargarHistorial();
});
async function cargarHistorial() {
    const userId = localStorage.getItem('usuario_id');
    const contenedorList = document.getElementById('reportesList');

    if (!userId) return;

    // Aquí está la magia de Supabase: Traemos el turno + sala + máquinas (juegos y gabinetes) todo junto.
    const { data, error } = await supabaseClient
        .from('reportes')
        .select(`
            id,
            fecha,
            turno_ini,
            turno_fin,
            salas ( nombre ),
            reporte_asignaciones (
                cantidad,
                juegos ( juego ),
                gabinetes ( modelo )
            )
        `)
        .eq('usuario_id', userId)
        .order('created_at', { ascending: false }) // Los más recientes primero
        .limit(10); // Traemos los últimos 10 turnos

    if (error) {
        contenedorList.innerHTML = `<div class="text-red-500 text-sm">Error al cargar historial</div>`;
        console.error(error);
        return;
    }

    if (data && data.length > 0) {
        contenedorList.innerHTML = '';

        data.forEach(reporte => {
            const div = document.createElement('div');
            div.className = "bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col space-y-3";
            
            const fechaLimpia = new Date(reporte.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            const horaIni = reporte.turno_ini.substring(0, 5);
            const horaFin = reporte.turno_fin.substring(0, 5);

            // 1. Armamos la cabecera del turno
            let htmlContenido = `
                <div class="flex justify-between items-start border-b border-slate-100 pb-2">
                    <div>
                        <h4 class="font-bold text-slate-800 text-lg">${reporte.salas.nombre}</h4>
                        <p class="text-xs text-slate-500 font-medium">${fechaLimpia} • ${horaIni} a ${horaFin}</p>
                    </div>
                    <span class="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
                        Completado
                    </span>
                </div>
            `;

            // 2. Armamos la lista de máquinas (si asignó alguna)
            const asignaciones = reporte.reporte_asignaciones;
            if (asignaciones && asignaciones.length > 0) {
                htmlContenido += `<div class="space-y-2 mt-2">
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Máquinas Monitoreadas:</p>`;
                
                asignaciones.forEach(asig => {
                    htmlContenido += `
                        <div class="flex items-center text-sm">
                            <span class="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded mr-2">${asig.cantidad}x</span>
                            <span class="text-slate-600">${asig.juegos.juego} <span class="text-xs text-slate-400">(${asig.gabinetes.modelo})</span></span>
                        </div>
                    `;
                });
                
                htmlContenido += `</div>`;
            } else {
                htmlContenido += `<p class="text-xs text-slate-400 italic mt-2">Sin máquinas asignadas</p>`;
            }

            div.innerHTML = htmlContenido;
            contenedorList.appendChild(div);
        });
    } else {
        contenedorList.innerHTML = `<div class="text-center text-slate-400 text-sm py-4">No tienes reportes recientes.</div>`;
    }
}