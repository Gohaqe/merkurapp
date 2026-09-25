// ==========================================
// 1. SESIÓN Y PERMISOS
// ==========================================
const userId = localStorage.getItem('usuario_id');
if (!userId) window.location.replace('index.html');

const cargoActual = localStorage.getItem('usuario_cargo');
if (cargoActual === 'Admin' || cargoActual === 'Administrador') {
    document.getElementById('btnIrAdmin').classList.remove('hidden');
    if (document.getElementById('btnExportarExcel')) {
        document.getElementById('btnExportarExcel').classList.remove('hidden');
    }
}

document.getElementById('userNameDisplay').textContent = localStorage.getItem('usuario_nombre');

// ==========================================
// 2. CERRAR SESIÓN
// ==========================================
document.getElementById('btnLogout').addEventListener('click', () => {
    if(confirm('¿Seguro que deseas cerrar sesión?')) {
        localStorage.removeItem('usuario_id');
        localStorage.removeItem('usuario_nombre');
        localStorage.removeItem('usuario_cargo');
        window.location.replace('index.html');
    }
});

// ==========================================
// 3. VERIFICAR TURNO A MEDIAS
// ==========================================
const turnoActivo = localStorage.getItem('turno_activo_id');
const btnMainTurno = document.getElementById('btnMainTurno');
const textoBtnTurno = document.getElementById('textoBtnTurno');

if (turnoActivo) {
    btnMainTurno.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    btnMainTurno.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
    textoBtnTurno.textContent = 'CONTINUAR TURNO ACTUAL';
}

btnMainTurno.addEventListener('click', () => { window.location.href = 'turno.html'; });

// ==========================================
// 4. CARGAR HISTORIAL (CON VISIÓN DE ADMIN)
// ==========================================
document.addEventListener('DOMContentLoaded', async () => { await cargarHistorial(); });

window.cargarHistorial = async function() {
    const contenedorList = document.getElementById('reportesList');
    if (!userId) return;

    const tituloSeccion = document.querySelector('h3.uppercase');
    if (cargoActual === 'Admin' || cargoActual === 'Administrador') {
        if(tituloSeccion) tituloSeccion.textContent = 'Últimos Reportes (Visión Global)';
    }

    let query = supabaseClient
        .from('reportes')
        .select(`
            id, fecha, turno_ini, turno_fin,
            salas ( nombre ),
            usuarios ( nombres, apellidos ),
            reporte_asignaciones ( cantidad, juegos ( juego ), gabinetes ( modelo ) )
        `)
        .order('created_at', { ascending: false })
        .limit(15); 

    if (cargoActual !== 'Admin' && cargoActual !== 'Administrador') {
        query = query.eq('usuario_id', userId);
    }

    const { data, error } = await query;

    if (error) {
        contenedorList.innerHTML = `<div class="text-red-500 text-sm">Error al cargar historial</div>`;
        return;
    }

    if (data && data.length > 0) {
        contenedorList.innerHTML = '';
        data.forEach(reporte => {
            const div = document.createElement('div');
            div.className = "bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col space-y-3 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]";
            div.onclick = () => abrirDetalleTurno(reporte.id);
            
            const fechaLimpia = new Date(reporte.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            const horaIni = reporte.turno_ini ? reporte.turno_ini.substring(0, 5) : '--:--';
            const horaFin = reporte.turno_fin ? reporte.turno_fin.substring(0, 5) : '--:--';

            let anfitrionaBadge = '';
            let btnBorrar = ''; 
            
            if (cargoActual === 'Admin' || cargoActual === 'Administrador') {
                const nombreAnf = reporte.usuarios ? `${reporte.usuarios.nombres} ${reporte.usuarios.apellidos}` : 'Usuario Borrado';
                anfitrionaBadge = `<p class="text-[10px] text-indigo-600 font-black uppercase mt-1 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> ${nombreAnf}</p>`;
                
                btnBorrar = `
                    <button onclick="event.stopPropagation(); borrarReporte('${reporte.id}')" class="bg-red-50 text-red-500 hover:text-red-700 hover:bg-red-100 p-1.5 rounded-lg transition-colors ml-2 shadow-sm border border-red-100" title="Eliminar Reporte">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                `;
            }

            let htmlContenido = `
                <div class="flex justify-between items-start border-b border-slate-100 pb-2">
                    <div>
                        <h4 class="font-bold text-slate-800 text-lg">${reporte.salas?.nombre || 'Sala sin nombre'}</h4>
                        <p class="text-xs text-slate-500 font-medium">${fechaLimpia} • ${horaIni} a ${horaFin}</p>
                        ${anfitrionaBadge}
                    </div>
                    <div class="flex items-center">
                        <span class="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold h-fit border border-blue-100 shadow-sm">Ver Detalle</span>
                        ${btnBorrar}
                    </div>
                </div>
            `;

            const asignaciones = reporte.reporte_asignaciones;
            if (asignaciones && asignaciones.length > 0) {
                htmlContenido += `<div class="space-y-2 mt-2"><p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Máquinas Monitoreadas:</p>`;
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
        contenedorList.innerHTML = `<div class="text-center text-slate-400 text-sm py-4">No hay reportes para mostrar.</div>`;
    }
}

// ==========================================
// 5. VISUALIZACIÓN DETALLE (MODAL)
// ==========================================
window.abrirDetalleTurno = async function(reporteId) {
    const modalDetalle = document.getElementById('modalDetalleTurno');
    const contentDetalle = document.getElementById('contentDetalleTurno');
    
    modalDetalle.classList.remove('hidden');
    setTimeout(() => {
        modalDetalle.classList.remove('opacity-0');
        contentDetalle.classList.remove('translate-y-full');
    }, 10);

    try {
        const { data: reporte, error } = await supabaseClient
            .from('reportes')
            .select(`
                id, turno_ini, turno_fin, com_produc, com_sala, com_competencia, fecha, 
                aforo, top_juegos, progresivos_iniciales, progresivos_finales, 
                salas(nombre),
                reporte_asignaciones(
                    id, cantidad, denominaciones, progresivo_id, ubicacion,
                    juegos(juego), gabinetes(modelo), progresivos(nombre),
                    ocupaciones(bloque_horario, ocupacion, ap_minima, ap_maxima),
                    incidencias(serie, error, cantidad)
                )
            `)
            .eq('id', reporteId)
            .single();

        if (error) throw error;

        if (reporte) {
            window.reporteActualData = reporte; // Guardamos para exportar
            
            // Cabecera
            document.getElementById('detSalaNombre').textContent = reporte.salas?.nombre || 'Sala sin nombre';
            const iniF = reporte.turno_ini ? reporte.turno_ini.substring(0, 5) : '--:--';
            const finF = reporte.turno_fin ? reporte.turno_fin.substring(0, 5) : '--:--';
            const fechaLimpia = reporte.fecha ? new Date(reporte.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '--/--/----';
            document.getElementById('detFechaHora').textContent = `${fechaLimpia} • ${iniF} a ${finF}`;
            
            // Aforo
            document.getElementById('detAforo').textContent = reporte.aforo !== null ? `${reporte.aforo}%` : 'N/A';

            // Top Juegos
            const topJuegosArray = reporte.top_juegos && reporte.top_juegos !== 'Ninguno' ? reporte.top_juegos.split(', ') : [];
            const contenedorTopList = document.getElementById('detTopJuegosList');
            if (topJuegosArray.length > 0) {
                document.getElementById('detTop1').textContent = topJuegosArray[0];
                contenedorTopList.innerHTML = topJuegosArray.map((j, i) => `<span class="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200">${i+1}º ${j}</span>`).join('');
                document.getElementById('cajaTopJuegos').classList.remove('hidden');
            } else {
                document.getElementById('detTop1').textContent = 'No registrado';
                document.getElementById('cajaTopJuegos').classList.add('hidden');
            }

            // Comentarios
            document.getElementById('detComProducto').textContent = reporte.com_produc || 'Sin comentarios.';
            document.getElementById('detComSala').textContent = reporte.com_sala || 'Sin comentarios.';
            const cajaCompetencia = document.getElementById('cajaCompetencia');
            if (reporte.com_competencia) {
                document.getElementById('detComCompetencia').textContent = reporte.com_competencia;
                cajaCompetencia.classList.remove('hidden');
            } else {
                cajaCompetencia.classList.add('hidden');
            }

            // Maquinas y Progresivos
            const contenedorMaquinas = document.getElementById('detMaquinasContenedor');
            let htmlMaquinas = '';

            if (reporte.reporte_asignaciones && reporte.reporte_asignaciones.length > 0) {
                htmlMaquinas += `<h4 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Detalle Operativo</h4>`;

                reporte.reporte_asignaciones.forEach(asig => {
                    const juego = asig.juegos?.juego || 'Desconocido';
                    const gabinete = asig.gabinetes?.modelo || 'Desconocido';
                    const denom = asig.denominaciones || 'N/A';
                    // INYECTAMOS LA UBICACIÓN CON SU ÍCONO
                    const ubicacionHTML = asig.ubicacion ? `<p class="text-[10px] text-blue-600 font-bold mt-1 tracking-wide">📍 ${asig.ubicacion}</p>` : '';

                    let htmlHoras = '';
                    if (asig.ocupaciones && Array.isArray(asig.ocupaciones) && asig.ocupaciones.length > 0) {
                        const ocupacionesOrdenadas = [...asig.ocupaciones].sort((a, b) => (a.bloque_horario || '').localeCompare(b.bloque_horario || ''));
                        htmlHoras += `<div class="grid grid-cols-2 md:grid-cols-3 gap-1 mt-2">`;
                        
                        ocupacionesOrdenadas.forEach(oc => {
                            const apMinTXT = oc.ap_minima ? `S/ ${oc.ap_minima}` : '-';
                            const apMaxTXT = oc.ap_maxima ? `S/ ${oc.ap_maxima}` : '-';
                            
                            htmlHoras += `
                            <div class="bg-blue-50/50 text-[9px] p-1.5 rounded text-blue-900 flex flex-col border border-blue-100/50">
                                <div class="flex justify-between border-b border-blue-100/50 pb-0.5 mb-0.5">
                                    <span class="font-bold opacity-70">${oc.bloque_horario}</span>
                                    <span class="font-black">${oc.ocupacion} jug.</span>
                                </div>
                                <div class="flex justify-between opacity-80 font-medium">
                                    <span>Mín: ${apMinTXT}</span>
                                    <span>Máx: ${apMaxTXT}</span>
                                </div>
                            </div>`;
                        });
                        htmlHoras += `</div>`;
                    }

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

                    let htmlProgresivo = '';
                    if (asig.progresivo_id) {
                        const nombreProg = asig.progresivos?.nombre || 'Progresivo';
                        let iniciales = {};
                        if (reporte.progresivos_iniciales && Array.isArray(reporte.progresivos_iniciales)) {
                            const progIni = reporte.progresivos_iniciales.find(p => p.id == asig.progresivo_id);
                            if (progIni) iniciales = progIni.valores || {};
                        }
                        const finales = reporte.progresivos_finales ? (reporte.progresivos_finales[asig.progresivo_id] || {}) : {};
                        
                        const keys = new Set([...Object.keys(iniciales), ...Object.keys(finales)]);
                        if (keys.size > 0) {
                            htmlProgresivo += `<div class="mt-3 pt-3 border-t border-slate-100">
                                <h6 class="text-[10px] font-black text-indigo-600 uppercase mb-2 tracking-wider">${nombreProg}</h6>
                                <div class="grid grid-cols-1 gap-1.5">`;
                            keys.forEach(pozo => {
                                const valIni = iniciales[pozo] ? iniciales[pozo].toLocaleString() : '--';
                                const valFin = finales[pozo] ? finales[pozo].toLocaleString() : '--';
                                htmlProgresivo += `
                                    <div class="bg-indigo-50/50 rounded-lg p-2 border border-indigo-100 flex justify-between items-center text-[11px]">
                                        <span class="font-bold text-indigo-800 uppercase">${pozo}</span>
                                        <div class="flex gap-2 items-center bg-white px-2 py-0.5 rounded shadow-sm border border-indigo-50">
                                            <span class="text-slate-400 font-medium">S/ ${valIni}</span>
                                            <span class="text-indigo-400 text-[9px]">➔</span>
                                            <span class="font-black text-indigo-600">S/ ${valFin}</span>
                                        </div>
                                    </div>
                                `;
                            });
                            htmlProgresivo += `</div></div>`;
                        }
                    }

                    htmlMaquinas += `
                        <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-3">
                            <div class="flex justify-between items-start border-b border-slate-100 pb-2 mb-2">
                                <div>
                                    <h5 class="font-bold text-slate-800 text-sm leading-tight">${juego}</h5>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">${gabinete} • ${asig.cantidad} unidades</p>
                                    ${ubicacionHTML}
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

// ==========================================
// 6. ELIMINAR REPORTE (SOLO ADMIN)
// ==========================================
window.borrarReporte = async function(reporteId) {
    if (!confirm('🚨 ATENCIÓN 🚨\n\n¿Estás completamente seguro de borrar este reporte de la base de datos?\n\nEsta acción NO se puede deshacer.')) return;

    try {
        const { error } = await supabaseClient.from('reportes').delete().eq('id', reporteId);
        
        if (error) {
            if (error.message.includes('foreign key constraint')) {
                alert('⚠️ No se pudo borrar el reporte porque tiene máquinas y horas registradas.\n\nPara solucionar esto:\n1. Ve a Supabase.\n2. Abre la tabla "reporte_asignaciones".\n3. En las llaves foráneas, ponle "Cascade" a la relación con "reportes".');
                return;
            } else {
                throw error;
            }
        }
        
        alert('Reporte eliminado con éxito 🗑️');
        cargarHistorial(); 

    } catch (err) {
        alert('Error al intentar borrar el reporte: ' + err.message);
    }
};

// ==========================================
// 7. EXPORTAR A EXCEL (SOLO ADMIN)
// ==========================================
const btnExcel = document.getElementById('btnExportarExcel');
if(btnExcel) {
    btnExcel.addEventListener('click', () => {
        const r = window.reporteActualData;
        if (!r) return;

        const datosExcel = [];
        const baseRow = {
            "Sala": r.salas?.nombre || '',
            "Fecha": r.fecha || '',
            "Hora Inicio": r.turno_ini ? r.turno_ini.substring(0, 5) : '',
            "Hora Fin": r.turno_fin ? r.turno_fin.substring(0, 5) : '',
            "Aforo (%)": r.aforo !== null ? r.aforo : '',
            "Top Juegos": r.top_juegos || '',
            "Comentarios Producto": r.com_produc || '',
            "Comentarios Sala": r.com_sala || '',
            "Competencia (Chisme)": r.com_competencia || ''
        };

        if (r.reporte_asignaciones && r.reporte_asignaciones.length > 0) {
            r.reporte_asignaciones.forEach(a => {
                let ocupStr = '';
                if (a.ocupaciones) ocupStr = a.ocupaciones.map(o => {
                    let ap = '';
                    if(o.ap_minima || o.ap_maxima) ap = ` [S/${o.ap_minima||'-'}-S/${o.ap_maxima||'-'}]`;
                    return `${o.bloque_horario}: ${o.ocupacion} jug.${ap}`;
                }).join(' | ');
                
                let fallaStr = '';
                if (a.incidencias) fallaStr = a.incidencias.map(i => `Serie ${i.serie}: ${i.error}`).join(' | ');

                let progStr = '';
                if (a.progresivo_id) {
                    const nombreProg = a.progresivos?.nombre || 'Progresivo';
                    let iniciales = r.progresivos_iniciales ? (r.progresivos_iniciales.find(p => p.id == a.progresivo_id)?.valores || {}) : {};
                    let finales = r.progresivos_finales ? (r.progresivos_finales[a.progresivo_id] || {}) : {};
                    
                    const keys = new Set([...Object.keys(iniciales), ...Object.keys(finales)]);
                    if (keys.size > 0) {
                        progStr += `${nombreProg} -> `;
                        keys.forEach(pozo => { progStr += `[${pozo}: S/ ${iniciales[pozo] || 0} ➔ S/ ${finales[pozo] || 0}] `; });
                    }
                }

                datosExcel.push({
                    ...baseRow,
                    "Plataforma (Mix)": a.juegos?.juego || '',
                    "Gabinete": a.gabinetes?.modelo || '',
                    "Cantidad": a.cantidad || '',
                    "Ubicación": a.ubicacion || 'No registrada', // Agregado a Excel
                    "Denominaciones": a.denominaciones || '',
                    "Ocupación (Horas y Apuestas)": ocupStr,
                    "Fallas Reportadas": fallaStr,
                    "Progresivos": progStr
                });
            });
        } else {
            datosExcel.push(baseRow);
        }

        const worksheet = XLSX.utils.json_to_sheet(datosExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Turno");
        XLSX.writeFile(workbook, `Reporte_Turno_${r.salas?.nombre || 'Sala'}_${r.fecha}.xlsx`);
    });
}