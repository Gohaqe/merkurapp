// ==========================================
// VARIABLES PARA EL MODO EDICIÓN
// ==========================================
let modoEdicionAsignacionId = null;
let modoEdicionIndex = null;
window.progresivoSeleccionadoId = null; 

// ==========================================
// ASIGNAR MÁQUINAS Y GENERAR BOTONES
// ==========================================
document.getElementById('btnAsignar').addEventListener('click', async () => {
    const juegoId = document.getElementById('selJuego').value;
    const gabineteId = document.getElementById('selGabinete').value;
    const cantidad = document.getElementById('cantMaquina').value;
    const ubicacion = document.getElementById('ubicacionMaquina').value.trim(); // <--- NUEVO
    const denom = denominacionesSeleccionadas.length > 0 ? denominacionesSeleccionadas.join(' / ') : null;

    if (!juegoId || !gabineteId || !cantidad || denominacionesSeleccionadas.length === 0) {
        alert('Selecciona la plataforma, gabinete, cantidad y denominaciones.');
        return;
    }

    const btn = document.getElementById('btnAsignar');
    btn.disabled = true;

    const datosGuardar = {
        reporte_id: reporteIdActual,
        juego_id: juegoId,
        gabinete_id: gabineteId,
        cantidad: parseInt(cantidad),
        progresivo_id: typeof progresivoSeleccionadoId !== 'undefined' ? progresivoSeleccionadoId : null,
        denominaciones: denom,
        ubicacion: ubicacion || null // <--- NUEVO
    };

    try {
        let dataNuevo;

        if (modoEdicionAsignacionId) {
            btn.innerHTML = 'Actualizando...';
            const { data, error } = await supabaseClient
                .from('reporte_asignaciones')
                .update(datosGuardar)
                .eq('id', modoEdicionAsignacionId)
                .select(`id, cantidad, juego_id, gabinete_id, progresivo_id, denominaciones, ubicacion, juegos(juego), gabinetes(modelo)`)
                .single();

            if (error) throw error;
            dataNuevo = data;
            asignacionesEnMemoria[modoEdicionIndex] = dataNuevo;
            modoEdicionAsignacionId = null;
            modoEdicionIndex = null;

        } else {
            btn.innerHTML = 'Agregando...';
            const { data, error } = await supabaseClient
                .from('reporte_asignaciones')
                .insert([datosGuardar])
                .select(`id, cantidad, juego_id, gabinete_id, progresivo_id, denominaciones, ubicacion, juegos(juego), gabinetes(modelo)`)
                .single();

            if (error) throw error;
            dataNuevo = data;
            dataNuevo.oculto = false; 

            juegosUnicosAsignados.add(dataNuevo.juegos.juego);
            asignacionesEnMemoria.push(dataNuevo);
        }

        // LIMPIEZA
        document.getElementById('cantMaquina').value = '1';
        document.getElementById('selJuego').value = '';
        document.getElementById('selGabinete').value = '';
        document.getElementById('ubicacionMaquina').value = ''; // <--- NUEVO
        
        denominacionesSeleccionadas = [];
        const btnDenom = document.getElementById('btnAbrirModalDenom');
        btnDenom.textContent = 'Tocar para seleccionar...';
        btnDenom.classList.replace('text-blue-700', 'text-slate-400');
        btnDenom.classList.replace('bg-blue-50', 'bg-white');
        btnDenom.classList.remove('border-blue-300', 'font-bold');
        document.querySelectorAll('.denom-btn').forEach(b => b.classList.remove('bg-blue-100', 'border-blue-500', 'text-blue-700'));

        progresivoSeleccionadoId = null;
        const txtProgresivo = document.getElementById('txtProgresivoElegido');
        txtProgresivo.textContent = "Ninguno configurado";
        txtProgresivo.classList.replace('text-blue-700', 'text-slate-400');
        document.getElementById('modalSelProgresivo').value = "";

        renderizarBottonAsignado();

        btn.innerHTML = '+ Agregar al panel';
        btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
        btn.classList.add('bg-blue-600', 'hover:bg-blue-700');

    } catch (error) {
        alert('Error: ' + error.message);
        if(!modoEdicionAsignacionId) btn.innerHTML = '+ Agregar al panel';
    } finally {
        btn.disabled = false;
    }
});

// ==========================================
// RENDERIZAR TARJETAS (CON MODO PAPELERA)
// ==========================================
window.renderizarBottonAsignado = function() {
    const zonaBotones = document.getElementById('zonaBotones');
    zonaBotones.innerHTML = '';

    asignacionesEnMemoria.forEach((asig, index) => {
        const nombreJuego = asig.juegos?.juego || 'Juego Desconocido';
        const modeloGabinete = asig.gabinetes?.modelo || 'Gabinete Desconocido';
        const cantidad = asig.cantidad;
        const ubicacionHTML = asig.ubicacion ? `<p class="text-[10px] text-slate-500 font-medium mt-1">📍 ${asig.ubicacion}</p>` : ''; // <--- NUEVO

        if (asig.oculto) {
            zonaBotones.innerHTML += `
                <div class="bg-slate-100 border border-slate-200 rounded-xl p-3 flex flex-col justify-center items-center text-center opacity-80">
                    <span class="text-[10px] font-bold text-slate-400 uppercase mb-1">🚫 Máquina Oculta</span>
                    <span class="text-xs font-bold text-slate-600 mb-3 leading-tight">${nombreJuego}</span>
                    <div class="flex gap-2 w-full">
                        <button onclick="restaurarAsignacion(${index})" class="flex-1 bg-white text-blue-600 text-[10px] font-bold py-2 rounded shadow-sm border border-slate-200 hover:bg-blue-50 transition-colors">Restaurar</button>
                        <button onclick="eliminarDefinitiva(${index}, '${asig.id}')" class="flex-1 bg-white text-red-600 text-[10px] font-bold py-2 rounded shadow-sm border border-slate-200 hover:bg-red-50 transition-colors">Borrar</button>
                    </div>
                </div>
            `;
            return;
        }

        zonaBotones.innerHTML += `
            <div class="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                <div class="p-3">
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-[9px] text-slate-400 font-bold uppercase truncate pr-2">${modeloGabinete}</span>
                        <span class="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap">${cantidad} un.</span>
                    </div>
                    <h4 class="font-bold text-slate-700 text-sm leading-tight">${nombreJuego}</h4>
                    ${ubicacionHTML}
                </div>
                
                <button onclick="abrirModalOcupacion(${index})" class="w-full bg-slate-800 text-white text-xs font-bold py-2 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Llenar Horas
                </button>

                <div class="flex border-t border-slate-100 bg-slate-50 divide-x divide-slate-200">
                    <button onclick="editarAsignacion(${index})" class="flex-1 py-2 text-xs font-bold text-blue-600 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        Editar
                    </button>
                    <button onclick="eliminarAsignacion(${index})" class="flex-1 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        Ocultar
                    </button>
                </div>
            </div>
        `;
    });
};

// ==========================================
// PAPELERA DE RECICLAJE
// ==========================================
window.eliminarAsignacion = function(index) { asignacionesEnMemoria[index].oculto = true; renderizarBottonAsignado(); };
window.restaurarAsignacion = function(index) { asignacionesEnMemoria[index].oculto = false; renderizarBottonAsignado(); };
window.eliminarDefinitiva = async function(index, idBaseDatos) {
    if (!confirm('¿Seguro que deseas ELIMINAR COMPLETAMENTE esta máquina de la base de datos?')) return;
    if (idBaseDatos) await supabaseClient.from('reporte_asignaciones').delete().eq('id', idBaseDatos);
    asignacionesEnMemoria.splice(index, 1);
    renderizarBottonAsignado();
};

window.editarAsignacion = function(index) {
    const asig = asignacionesEnMemoria[index];
    
    document.getElementById('selJuego').value = asig.juego_id || '';
    document.getElementById('selGabinete').value = asig.gabinete_id || '';
    document.getElementById('cantMaquina').value = asig.cantidad || 1;
    document.getElementById('ubicacionMaquina').value = asig.ubicacion || ''; // <--- NUEVO
    
    const btnDenom = document.getElementById('btnAbrirModalDenom');
    if (asig.denominaciones) {
        denominacionesSeleccionadas = asig.denominaciones.split(' / ');
        btnDenom.textContent = asig.denominaciones;
        btnDenom.classList.add('text-blue-700', 'font-bold', 'bg-blue-50', 'border-blue-300');
        btnDenom.classList.remove('text-slate-400', 'bg-white');
        
        document.querySelectorAll('.denom-btn').forEach(b => {
            if (denominacionesSeleccionadas.includes(b.textContent)) {
                b.classList.add('bg-blue-100', 'border-blue-500', 'text-blue-700');
            } else {
                b.classList.remove('bg-blue-100', 'border-blue-500', 'text-blue-700');
            }
        });
    } else {
        denominacionesSeleccionadas = [];
        btnDenom.textContent = 'Tocar para seleccionar...';
        btnDenom.classList.replace('text-blue-700', 'text-slate-400');
        btnDenom.classList.replace('bg-blue-50', 'bg-white');
        btnDenom.classList.remove('border-blue-300', 'font-bold');
        document.querySelectorAll('.denom-btn').forEach(b => b.classList.remove('bg-blue-100', 'border-blue-500', 'text-blue-700'));
    }

    const txtProgresivo = document.getElementById('txtProgresivoElegido');
    if (asig.progresivo_id) {
        progresivoSeleccionadoId = asig.progresivo_id;
        const prog = todosLosProgresivos.find(p => p.id == asig.progresivo_id);
        txtProgresivo.textContent = prog ? prog.nombre : 'Progresivo Configurado';
        txtProgresivo.classList.replace('text-slate-400', 'text-blue-700');
        document.getElementById('modalSelProgresivo').value = asig.progresivo_id;
        
        const event = new Event('change');
        document.getElementById('modalSelProgresivo').dispatchEvent(event);
    } else {
        progresivoSeleccionadoId = null;
        txtProgresivo.textContent = "Ninguno configurado";
        txtProgresivo.classList.replace('text-blue-700', 'text-slate-400');
        document.getElementById('modalSelProgresivo').value = "";
    }
    
    modoEdicionAsignacionId = asig.id;
    modoEdicionIndex = index;
    
    const btn = document.getElementById('btnAsignar');
    btn.innerHTML = 'Guardar Cambios';
    btn.classList.replace('bg-blue-600', 'bg-emerald-600');
    btn.classList.replace('hover:bg-blue-700', 'hover:bg-emerald-700');
    
    document.getElementById('seccionAsignacion').scrollIntoView({ behavior: 'smooth' });
};

// ==========================================
// MODAL DE OCUPACIÓN Y FALLAS CON APUESTAS
// ==========================================
window.abrirModalOcupacion = async function(index) {
    const asig = asignacionesEnMemoria[index];
    const asignId = asig.id;
    const juego = asig.juegos?.juego || 'Juego Desconocido';
    const gabinete = asig.gabinetes?.modelo || 'Gabinete Desconocido';

    asignacionIdSeleccionada = asignId;
    document.getElementById('modalSubtituloMaquina').textContent = `${juego} (${gabinete})`;
    
    const contenedor = document.getElementById('contenedorBloquesHorarios');
    const contenedorFallas = document.getElementById('contenedorFallas');
    
    contenedor.innerHTML = '<p class="text-xs text-center text-slate-500 col-span-2 py-4">Cargando registros...</p>'; 
    contenedorFallas.innerHTML = '<p class="text-xs text-center text-red-400 py-2">Cargando fallas...</p>';

    document.getElementById('modalOcupacion').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('modalOcupacion').classList.remove('opacity-0');
        document.getElementById('modalContent').classList.remove('translate-y-full');
    }, 10);

    // 1. CARGAR HORAS Y APUESTAS DE SUPABASE
    const { data: ocupacionesPrevias } = await supabaseClient
        .from('ocupaciones')
        .select('id, bloque_horario, ocupacion, ap_minima, ap_maxima')
        .eq('asignacion_id', asignId);
        
    const mapaOcupaciones = {};
    if (ocupacionesPrevias) ocupacionesPrevias.forEach(o => mapaOcupaciones[o.bloque_horario] = o);

    contenedor.innerHTML = ''; 
    generarTodosLosBloques(turnoInicioLocal, turnoFinLocal).forEach(bloque => {
        const datoPrevio = mapaOcupaciones[bloque];
        let valOcupacion = datoPrevio && datoPrevio.ocupacion !== null ? datoPrevio.ocupacion : '';
        let valMin = datoPrevio && datoPrevio.ap_minima !== null ? datoPrevio.ap_minima : '';
        let valMax = datoPrevio && datoPrevio.ap_maxima !== null ? datoPrevio.ap_maxima : '';
        let idRegistro = datoPrevio ? datoPrevio.id : '';

        // Diseño con las 3 cajas por cada hora
        contenedor.innerHTML += `
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
                <label class="block text-[10px] font-bold uppercase text-slate-500 text-center border-b border-slate-200 pb-1 mb-1">${bloque}</label>
                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <label class="block text-[9px] text-slate-400 font-bold mb-1">Personas</label>
                        <input type="number" data-tipo="ocup" data-bloque="${bloque}" data-idbd="${idRegistro}" value="${valOcupacion}" placeholder="0" class="w-full border border-slate-200 rounded-lg p-2 text-center text-sm font-bold text-blue-700 focus:border-blue-500 outline-none input-ocupacion-multi transition-colors duration-300">
                    </div>
                    <div>
                        <label class="block text-[9px] text-slate-400 font-bold mb-1">Ap. Mín</label>
                        <input type="number" data-tipo="min" data-bloque="${bloque}" data-idbd="${idRegistro}" value="${valMin}" placeholder="S/" class="w-full border border-slate-200 rounded-lg p-2 text-center text-sm font-bold text-slate-700 focus:border-blue-500 outline-none input-ocupacion-multi transition-colors duration-300">
                    </div>
                    <div>
                        <label class="block text-[9px] text-slate-400 font-bold mb-1">Ap. Máx</label>
                        <input type="number" data-tipo="max" data-bloque="${bloque}" data-idbd="${idRegistro}" value="${valMax}" placeholder="S/" class="w-full border border-slate-200 rounded-lg p-2 text-center text-sm font-bold text-slate-700 focus:border-blue-500 outline-none input-ocupacion-multi transition-colors duration-300">
                    </div>
                </div>
            </div>
        `;
    });

    // Guardado manual inteligente que evita fallas en la base de datos
    document.querySelectorAll('.input-ocupacion-multi').forEach(input => {
        input.addEventListener('blur', async function() {
            const bloqueHorario = this.getAttribute('data-bloque');
            const padre = this.closest('.grid');
            const inputOcup = padre.querySelector('input[data-tipo="ocup"]');
            const inputMin = padre.querySelector('input[data-tipo="min"]');
            const inputMax = padre.querySelector('input[data-tipo="max"]');
            let idRegistro = inputOcup.getAttribute('data-idbd');

            const valOcupacion = inputOcup.value.trim();
            const valMin = inputMin.value.trim();
            const valMax = inputMax.value.trim();

            if (valOcupacion === '') return; 

            this.classList.replace('bg-white', 'bg-yellow-50');

            const payload = {
                asignacion_id: asignacionIdSeleccionada,
                bloque_horario: bloqueHorario,
                ocupacion: parseInt(valOcupacion) || 0,
                ap_minima: valMin ? parseFloat(valMin) : null,
                ap_maxima: valMax ? parseFloat(valMax) : null
            };

            if (idRegistro && idRegistro !== 'undefined' && idRegistro !== '') {
                // Actualizamos si ya existe en la base de datos
                await supabaseClient.from('ocupaciones').update(payload).eq('id', idRegistro);
            } else {
                // Insertamos por primera vez
                const { data, error } = await supabaseClient.from('ocupaciones').insert([payload]).select('id').single();
                if (!error && data) {
                    inputOcup.setAttribute('data-idbd', data.id);
                    inputMin.setAttribute('data-idbd', data.id);
                    inputMax.setAttribute('data-idbd', data.id);
                }
            }

            this.classList.replace('bg-yellow-50', 'bg-emerald-100');
            setTimeout(() => this.classList.replace('bg-emerald-100', 'bg-white'), 1500);
        });
    });

    // 2. CARGAR FALLAS
    const { data: fallasPrevias } = await supabaseClient.from('incidencias').select('id, serie, error').eq('asignacion_id', asignId);
    contenedorFallas.innerHTML = '';
    
    if (fallasPrevias && fallasPrevias.length > 0) {
        fallasPrevias.forEach(falla => agregarBloqueFalla(falla.id, falla.serie, falla.error));
    } else {
        agregarBloqueFalla('', '', '');
    }
};

// ==========================================
// LÓGICA DE FALLAS DINÁMICAS
// ==========================================
window.agregarBloqueFalla = function(idBd = '', serie = '', detalle = '') {
    const contenedor = document.getElementById('contenedorFallas');
    const div = document.createElement('div');
    div.className = "flex flex-col gap-2 bg-white p-3 rounded-xl border border-red-200 relative falla-block shadow-sm";
    
    div.innerHTML = `
        <input type="hidden" class="falla-id" value="${idBd}">
        <input type="text" placeholder="N° Serie..." value="${serie}" class="falla-serie w-full border-b border-slate-200 p-1 text-sm outline-none focus:border-red-500 font-bold text-slate-700">
        <textarea rows="1" placeholder="Motivo o detalle de la falla..." class="falla-detalle w-full border-b border-slate-200 p-1 text-sm outline-none focus:border-red-500 text-slate-600 resize-none overflow-hidden" oninput="this.style.height = '';this.style.height = this.scrollHeight + 'px'">${detalle}</textarea>
        
        <button class="btn-eliminar-falla absolute top-2 right-2 text-red-300 hover:text-red-600 bg-white rounded-full p-1 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    `;
    
    div.querySelector('.btn-eliminar-falla').addEventListener('click', async function() {
        if (idBd) await supabaseClient.from('incidencias').delete().eq('id', idBd);
        div.remove();
    });
    
    contenedor.appendChild(div);
};

document.getElementById('btnAgregarFalla').addEventListener('click', () => { agregarBloqueFalla('', '', ''); });

document.getElementById('btnGuardarFallaCerrar').addEventListener('click', async () => {
    const bloques = document.querySelectorAll('.falla-block');
    const btn = document.getElementById('btnGuardarFallaCerrar');
    btn.innerText = "Guardando...";
    btn.disabled = true;

    for (let bloque of bloques) {
        const idBd = bloque.querySelector('.falla-id').value;
        const serie = bloque.querySelector('.falla-serie').value.trim();
        const detalle = bloque.querySelector('.falla-detalle').value.trim();
        
        if (serie || detalle) {
            if (idBd) {
                await supabaseClient.from('incidencias').update({ serie: serie || 'S/N', error: detalle || 'Falla reportada' }).eq('id', idBd);
            } else {
                await supabaseClient.from('incidencias').insert([{ asignacion_id: asignacionIdSeleccionada, serie: serie || 'S/N', error: detalle || 'Falla reportada', cantidad: 1 }]);
            }
        }
    }
    
    btn.innerText = "Cerrar Panel (Guarda Fallas si las hay)";
    btn.disabled = false;
    document.getElementById('btnCerrarModal').click();
});

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================
function generarTodosLosBloques(hIni, hFin) {
    const bloques = [];
    const [iniH, iniM] = hIni.split(':').map(Number);
    const [finH, finM] = hFin.split(':').map(Number);
    let inicioMinutos = iniH * 60 + iniM;
    let finMinutos = finH * 60 + finM;
    if (finMinutos <= inicioMinutos) finMinutos += 24 * 60; 

    for (let m = inicioMinutos; m < finMinutos; m += 60) {
        let finBloqueMin = Math.min(m + 60, finMinutos);
        bloques.push(`${minutosAHora(m)} - ${minutosAHora(finBloqueMin)}`);
    }
    return bloques;
}

function minutosAHora(minutosTotal) {
    let h = Math.floor(minutosTotal / 60) % 24;
    let m = minutosTotal % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

document.getElementById('btnCerrarModal').addEventListener('click', () => {
    document.getElementById('modalOcupacion').classList.add('opacity-0');
    document.getElementById('modalContent').classList.add('translate-y-full');
    setTimeout(() => document.getElementById('modalOcupacion').classList.add('hidden'), 300);
});

// ==========================================
// DENOMINACIONES Y PROGRESIVOS
// ==========================================
document.getElementById('btnAbrirModalDenom').addEventListener('click', () => {
    document.getElementById('modalDenominaciones').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('modalDenominaciones').classList.remove('opacity-0');
        document.getElementById('contentDenominaciones').classList.remove('translate-y-full');
    }, 10);
});

window.renderizarBotonesDenominacion = function() {
    const contenedor = document.getElementById('contenedorBotonesDenom');
    if(!contenedor) return;
    contenedor.innerHTML = '';
    
    if (window.todasLasDenominaciones.length === 0) {
        contenedor.innerHTML = '<p class="text-sm text-slate-400">No hay denominaciones configuradas.</p>';
        return;
    }

    window.todasLasDenominaciones.forEach(val => {
        const isSelected = denominacionesSeleccionadas.includes(val);
        const btnClases = isSelected 
            ? 'px-4 py-2 rounded-xl font-bold transition-colors border-2 bg-blue-100 border-blue-500 text-blue-700 shadow-sm' 
            : 'px-4 py-2 rounded-xl font-bold transition-colors border-2 bg-white border-slate-200 text-slate-600 hover:bg-slate-50';
        
        contenedor.innerHTML += `<button type="button" class="${btnClases}" onclick="toggleDenominacion('${val}', this)">${val}</button>`;
    });
};

window.toggleDenominacion = function(val, btnElement) {
    btnElement.classList.toggle('bg-blue-100'); btnElement.classList.toggle('border-blue-500'); btnElement.classList.toggle('text-blue-700'); btnElement.classList.toggle('shadow-sm'); btnElement.classList.toggle('bg-white'); btnElement.classList.toggle('border-slate-200'); btnElement.classList.toggle('text-slate-600');
    
    if(denominacionesSeleccionadas.includes(val)) denominacionesSeleccionadas = denominacionesSeleccionadas.filter(d => d !== val);
    else denominacionesSeleccionadas.push(val);
};

document.getElementById('btnConfirmarDenom').addEventListener('click', () => {
    document.getElementById('modalDenominaciones').classList.add('opacity-0');
    document.getElementById('contentDenominaciones').classList.add('translate-y-full');
    setTimeout(() => document.getElementById('modalDenominaciones').classList.add('hidden'), 300);

    const btn = document.getElementById('btnAbrirModalDenom');
    if (denominacionesSeleccionadas.length > 0) {
        denominacionesSeleccionadas.sort((a, b) => parseFloat(a) - parseFloat(b));
        btn.textContent = denominacionesSeleccionadas.join(' / ');
        btn.classList.add('text-blue-700', 'font-bold', 'bg-blue-50', 'border-blue-300');
    } else {
        btn.textContent = 'Tocar para seleccionar...';
        btn.classList.remove('text-blue-700', 'font-bold', 'bg-blue-50', 'border-blue-300');
    }
});

const btnAbrirProg = document.getElementById('btnAbrirModalProgresivo');
if (btnAbrirProg) {
    btnAbrirProg.addEventListener('click', () => {
        const modal = document.getElementById('modalProgresivo');
        const content = document.getElementById('modalProgresivoContent');
        if (modal && content) {
            modal.classList.remove('hidden');
            setTimeout(() => { modal.classList.remove('opacity-0'); content.classList.remove('translate-y-full'); }, 10);
        }
    });
}

const btnCerrarProg = document.getElementById('btnCerrarProgresivo');
if (btnCerrarProg) {
    btnCerrarProg.addEventListener('click', () => {
        const modal = document.getElementById('modalProgresivo');
        const content = document.getElementById('modalProgresivoContent');
        if (modal && content) {
            modal.classList.add('opacity-0');
            content.classList.add('translate-y-full');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }
    });
}

const selProgresivo = document.getElementById('modalSelProgresivo');
if (selProgresivo) {
    selProgresivo.addEventListener('change', (e) => {
        const idProg = e.target.value;
        const contenedorPozos = document.getElementById('modalContenedorPozos');
        contenedorPozos.className = 'grid grid-cols-2 gap-3 mt-4'; 
        contenedorPozos.innerHTML = ''; 

        if (!idProg) return;

        const prog = todosLosProgresivos.find(p => p.id == idProg);
        if (prog && prog.nombres_pozos) {
            let pozosArray = Array.isArray(prog.nombres_pozos) ? prog.nombres_pozos : (typeof prog.nombres_pozos === 'string' ? prog.nombres_pozos.split(',').map(s => s.trim()) : []);
            
            if (pozosArray.length > 0) {
                pozosArray.forEach(pozo => {
                    let valorPrevio = '';
                    const guardado = window.progresivosTurno.find(pt => pt.id === idProg);
                    if (guardado && guardado.valores && guardado.valores[pozo]) valorPrevio = guardado.valores[pozo];

                    contenedorPozos.innerHTML += `
                        <div>
                            <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">${pozo}</label>
                            <input type="number" id="pozo_ini_${pozo}" value="${valorPrevio}" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-base font-bold text-slate-700 focus:border-indigo-500 outline-none transition-colors">
                        </div>
                    `;
                });
            } else {
                contenedorPozos.className = 'mt-4';
                contenedorPozos.innerHTML = '<p class="text-sm text-slate-400">Este progresivo no tiene pozos configurados.</p>';
            }
        }
    });
}

const btnGuardarProg = document.getElementById('btnGuardarProgresivo');
if (btnGuardarProg) {
    btnGuardarProg.addEventListener('click', () => {
        const selector = document.getElementById('modalSelProgresivo');
        const idElegido = selector.value;
        const textoElegido = selector.options[selector.selectedIndex]?.text;
        const txtUI = document.getElementById('txtProgresivoElegido');

        if (idElegido) {
            window.progresivoSeleccionadoId = idElegido;
            txtUI.textContent = textoElegido;
            txtUI.classList.remove('text-slate-400');
            txtUI.classList.add('text-blue-700', 'font-bold');

            const prog = todosLosProgresivos.find(p => p.id == idElegido);
            if (prog) {
                let pozosArray = Array.isArray(prog.nombres_pozos) ? prog.nombres_pozos : (typeof prog.nombres_pozos === 'string' ? prog.nombres_pozos.split(',').map(s => s.trim()) : []);
                let valores = {};
                pozosArray.forEach(pozo => {
                    const inputPozo = document.getElementById(`pozo_ini_${pozo}`);
                    if (inputPozo && inputPozo.value !== '') valores[pozo] = parseFloat(inputPozo.value);
                });

                const index = window.progresivosTurno.findIndex(pt => pt.id === idElegido);
                if (index >= 0) window.progresivosTurno[index].valores = valores;
                else window.progresivosTurno.push({ id: idElegido, valores: valores });
                
                localStorage.setItem('progresivos_turno', JSON.stringify(window.progresivosTurno));
            }
        } else {
            window.progresivoSeleccionadoId = null;
            txtUI.textContent = "Ninguno configurado";
            txtUI.classList.add('text-slate-400');
            txtUI.classList.remove('text-blue-700', 'font-bold');
        }

        if (btnCerrarProg) btnCerrarProg.click();
    });
}