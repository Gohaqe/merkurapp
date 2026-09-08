// js/dashboard.js

// 1. Verificamos si la sesión de usuario existe
const userId = localStorage.getItem('usuario_id');
if (!userId) {
    window.location.replace('index.html');
}

// 2. Mostramos el nombre de la anfitriona
document.getElementById('userNameDisplay').textContent = localStorage.getItem('usuario_nombre');

// ==========================================
// 3. CERRAR SESIÓN
// ==========================================
document.getElementById('btnLogout').addEventListener('click', () => {
    if(confirm('¿Seguro que deseas cerrar sesión?')) {
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
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        contenedorList.innerHTML = `<div class="text-red-500 text-sm">Error al cargar historial</div>`;
        console.error(error);
        return;
    }

    if (data && data.length > 0) {
        contenedorList.innerHTML = '';

        data.forEach(reporte => {
            const div = document.createElement('div');
            // NUEVO: Agregamos cursor-pointer y el onclick para abrir el modal
            div.className = "bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col space-y-3 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]";
            div.onclick = () => abrirDetalleTurno(reporte.id);
            
            const fechaLimpia = new Date(reporte.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            const horaIni = reporte.turno_ini ? reporte.turno_ini.substring(0, 5) : '--:--';
            const horaFin = reporte.turno_fin ? reporte.turno_fin.substring(0, 5) : '--:--';

            let htmlContenido = `
                <div class="flex justify-between items-start border-b border-slate-100 pb-2">
                    <div>
                        <h4 class="font-bold text-slate-800 text-lg">${reporte.salas?.nombre || 'Sala sin nombre'}</h4>
                        <p class="text-xs text-slate-500 font-medium">${fechaLimpia} • ${horaIni} a ${horaFin}</p>
                    </div>
                    <span class="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold">
                        Ver Detalle
                    </span>
                </div>
            `;

            const asignaciones = reporte.reporte_asignaciones;
            if (asignaciones && asignaciones.length > 0) {
                htmlContenido += `<div class="space-y-2 mt-2">
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Máquinas Monitoreadas:</p>`;
                
                asignaciones.forEach(asig => {
                    const nombreJuego = asig.juegos ? asig.juegos.juego : 'Juego borrado';
                    const modeloGabinete = asig.gabinetes ? asig.gabinetes.modelo : 'Gabinete borrado';
                    
                    htmlContenido += `
                        <div class="flex items-center text-sm">
                            <span class="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded mr-2">${asig.cantidad}x</span>
                            <span class="text-slate-600 truncate">${nombreJuego} <span class="text-xs text-slate-400">(${modeloGabinete})</span></span>
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

// ==========================================
// 7. VISUALIZACIÓN Y EDICIÓN DE DETALLES
// ==========================================
let reporteSeleccionadoParaEdicion = null;

window.abrirDetalleTurno = async function(reporteId) {
    reporteSeleccionadoParaEdicion = reporteId;
    const modalDetalle = document.getElementById('modalDetalleTurno');
    const contentDetalle = document.getElementById('contentDetalleTurno');
    
    modalDetalle.classList.remove('hidden');
    setTimeout(() => {
        modalDetalle.classList.remove('opacity-0');
        contentDetalle.classList.remove('translate-y-full');
    }, 10);

    try {
        // 1. MEGA CONSULTA A SUPABASE (Ahora trae el ID y Nombre del Progresivo por máquina)
        const { data: reporte, error } = await supabaseClient
            .from('reportes')
            .select(`
                id, turno_ini, turno_fin, com_produc, com_sala, fecha, progresivos_finales, 
                salas(nombre),
                reporte_asignaciones(
                    id, cantidad, ap_minima, ap_maxima, denominaciones, progresivo_id,
                    juegos(juego), 
                    gabinetes(modelo),
                    progresivos(nombre),
                    ocupaciones(bloque_horario, ocupacion),
                    incidencias(serie, error, cantidad)
                )
            `)
            .eq('id', reporteId)
            .single();

        if (error) {
            alert("Error en Supabase: " + error.message);
            document.getElementById('detSalaNombre').textContent = "Error de conexión";
            return; 
        }

        if (reporte) {
            // Cabecera
            document.getElementById('detSalaNombre').textContent = reporte.salas?.nombre || 'Sala sin nombre';
            const iniF = reporte.turno_ini ? reporte.turno_ini.substring(0, 5) : '--:--';
            const finF = reporte.turno_fin ? reporte.turno_fin.substring(0, 5) : '--:--';
            const fechaLimpia = reporte.fecha ? new Date(reporte.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '--/--/----';
            document.getElementById('detFechaHora').textContent = `${fechaLimpia} • ${iniF} a ${finF}`;
            
            // Comentarios
            document.getElementById('detComProducto').textContent = reporte.com_produc || 'Sin comentarios registrados.';
            document.getElementById('detComSala').textContent = reporte.com_sala || 'Sin comentarios registrados.';

            // ==========================================
            // DIBUJAR DETALLE OPERATIVO DE MÁQUINAS (CON PROGRESIVOS INTEGARDOS)
            // ==========================================
            const contenedorMaquinas = document.getElementById('detMaquinasContenedor');
            let htmlMaquinas = '';

            if (reporte.reporte_asignaciones && reporte.reporte_asignaciones.length > 0) {
                htmlMaquinas += `<h4 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Detalle Operativo</h4>`;

                reporte.reporte_asignaciones.forEach(asig => {
                    const juego = asig.juegos?.juego || 'Desconocido';
                    const gabinete = asig.gabinetes?.modelo || 'Desconocido';
                    const denom = asig.denominaciones || 'N/A';

                    // 1. Renderizar Horas
                    let htmlHoras = '';
                    if (asig.ocupaciones && Array.isArray(asig.ocupaciones) && asig.ocupaciones.length > 0) {
                        const ocupacionesOrdenadas = [...asig.ocupaciones].sort((a, b) => (a.bloque_horario || '').localeCompare(b.bloque_horario || ''));
                        htmlHoras += `<div class="grid grid-cols-2 gap-1 mt-2">`;
                        ocupacionesOrdenadas.forEach(oc => {
                            htmlHoras += `<div class="bg-blue-50/50 text-[10px] p-1.5 rounded text-blue-900 flex justify-between border border-blue-100/50">
                                            <span class="font-bold opacity-70">${oc.bloque_horario}</span>
                                            <span class="font-black">${oc.ocupacion} jug.</span>
                                          </div>`;
                        });
                        htmlHoras += `</div>`;
                    } else {
                        htmlHoras = `<p class="text-[10px] text-slate-400 italic mt-2 ml-1">No se registraron horas.</p>`;
                    }

                    // 2. Renderizar Fallas
                    let htmlFallas = '';
                    if (asig.incidencias && Array.isArray(asig.incidencias) && asig.incidencias.length > 0) {
                        htmlFallas += `<div class="mt-3 space-y-1">`;
                        asig.incidencias.forEach(inc => {
                            htmlFallas += `<div class="bg-red-50 text-[10px] p-2 rounded-lg text-red-800 border border-red-100 flex flex-col">
                                            <span class="font-bold text-red-600 mb-0.5">⚠️ Serie: ${inc.serie || 'S/N'}</span>
                                            <span class="leading-tight opacity-90">${inc.error}</span>
                                           </div>`;
                        });
                        htmlFallas += `</div>`;
                    }

                    // 3. Renderizar Progresivo DENTRO de la máquina
                    let htmlProgresivo = '';
                    // Si esta máquina tiene un progresivo asignado Y hay datos guardados de ese progresivo
                    if (asig.progresivo_id && reporte.progresivos_finales && reporte.progresivos_finales[asig.progresivo_id]) {
                        const nombreProg = asig.progresivos?.nombre || 'Progresivo Asociado';
                        const pozos = reporte.progresivos_finales[asig.progresivo_id];

                        htmlProgresivo += `<div class="mt-3 pt-3 border-t border-slate-100">
                                            <h6 class="text-[10px] font-black text-indigo-600 uppercase mb-1.5 tracking-wider">${nombreProg}</h6>
                                            <div class="flex flex-wrap gap-1.5">`;
                        
                        for(const [pozo, valor] of Object.entries(pozos)) {
                            htmlProgresivo += `<span class="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-2 py-1 rounded-md border border-indigo-100 shadow-sm">
                                                  <span class="opacity-70">${pozo}:</span> S/ ${valor}
                                               </span>`;
                        }
                        htmlProgresivo += `</div></div>`;
                    }

                    // Ensamblar la tarjeta de la máquina
                    htmlMaquinas += `
                        <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                            <div class="flex justify-between items-start border-b border-slate-100 pb-2">
                                <div>
                                    <h5 class="font-bold text-slate-800 text-sm leading-tight">${juego}</h5>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">${gabinete} • ${asig.cantidad} unidades</p>
                                </div>
                                <span class="bg-slate-100 text-slate-500 font-bold text-[9px] px-2 py-1 rounded-md h-fit">Denom: ${denom}</span>
                            </div>
                            ${htmlHoras}
                            ${htmlFallas}
                            ${htmlProgresivo}
                        </div>
                    `;
                });
            } else {
                htmlMaquinas = `<div class="bg-white p-4 rounded-2xl text-center shadow-sm"><p class="text-xs text-slate-400 italic">Sin máquinas registradas.</p></div>`;
            }
            
            contenedorMaquinas.innerHTML = htmlMaquinas;
            
            // Botón Editar
            document.getElementById('btnReabrirTurno').onclick = () => {
                localStorage.setItem('turno_activo_id', reporte.id);
                localStorage.setItem('turno_ini', iniF);
                localStorage.setItem('turno_fin', finF);
                window.location.href = 'turno.html';
            };
        }
    } catch (err) {
        alert("Error procesando el reporte: " + err.message);
    }
};

window.cerrarModalDetalle = function() {
    const modalDetalle = document.getElementById('modalDetalleTurno');
    const contentDetalle = document.getElementById('contentDetalleTurno');
    modalDetalle.classList.add('opacity-0');
    contentDetalle.classList.add('translate-y-full');
    setTimeout(() => modalDetalle.classList.add('hidden'), 300);
};