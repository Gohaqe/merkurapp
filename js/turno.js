// js/turno.js

// ==========================================
// 1. VARIABLES GLOBALES Y ESTADO (localStorage)
// ==========================================
let reporteIdActual = localStorage.getItem('turno_activo_id');
let turnoInicioLocal = localStorage.getItem('turno_ini');
let turnoFinLocal = localStorage.getItem('turno_fin');
let asignacionIdSeleccionada = null;

// Memoria para los progresivos y juegos del turno actual
let progresivosTurno = JSON.parse(localStorage.getItem('progresivos_turno')) || [];
let juegosUnicosAsignados = new Set();
let progNombreGlobal = "";
let progPozosGlobal = 0;
let denominacionesSeleccionadas = [];
let todasLasSalas = [];

// ==========================================
// 2. INICIALIZACIÓN Y CARGA DE DATOS
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await cargarSelectores();

    // Si la anfitriona ya tenía un turno abierto, restauramos la pantalla
    if (reporteIdActual) {
        document.getElementById('seccionConfiguracion').classList.add('hidden');
        document.getElementById('seccionAsignacion').classList.remove('hidden');
        document.getElementById('seccionMonitoreo').classList.remove('hidden');
        document.getElementById('btnFinalizarTurno').classList.remove('hidden');
        document.getElementById('infoTurnoTexto').textContent = `${turnoInicioLocal} a ${turnoFinLocal}`;

        await cargarAsignacionesPrevias();
    }
});

async function cargarSelectores() {
    // 1. Cargar Salas en la memoria (Para el buscador)
    const { data: salas } = await supabaseClient.from('salas').select('id, nombre, distrito, direccion, distrito, provincia, departamento');
    if (salas) {
        todasLasSalas = salas.map(s => {
            const nombreCompleto = s.nombre ? `${s.nombre} ${s.distrito ? `(${s.distrito})` : ''}` : (s.establecimiento || 'Sala sin nombre');
            return {
                id: s.id,
                texto: nombreCompleto,
                direccion: s.direccion || 'Dirección no registrada',
                distrito: s.distrito || '',
                provincia: s.provincia || '',
                departamento: s.departamento || ''
            };
        });
    }
// ==========================================
// BUSCADOR INTELIGENTE DE SALAS (Sin tildes/mayúsculas + Dirección)
// ==========================================
const inputBuscarSala = document.getElementById('inputBuscarSala');
const listaSalasResultados = document.getElementById('listaSalasResultados');
const hiddenSelSala = document.getElementById('selSala');

// Nuevas referencias para la dirección
const infoSalaDetalle = document.getElementById('infoSalaDetalle');
const txtSalaDireccion = document.getElementById('txtSalaDireccion');
const txtSalaUbicacion = document.getElementById('txtSalaUbicacion');

function normalizarTexto(texto) {
    if(!texto) return "";
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

inputBuscarSala.addEventListener('input', function() {
    const termino = normalizarTexto(this.value);
    listaSalasResultados.innerHTML = ''; 
    hiddenSelSala.value = ''; 
    
    // Si la anfitriona vuelve a escribir, ocultamos el detalle de la dirección
    infoSalaDetalle.classList.add('hidden');

    if (termino.length === 0) {
        listaSalasResultados.classList.add('hidden');
        return;
    }

    const resultados = todasLasSalas.filter(sala => 
        normalizarTexto(sala.texto).includes(termino)
    );

    if (resultados.length > 0) {
        listaSalasResultados.classList.remove('hidden');
        resultados.forEach(sala => {
            const li = document.createElement('li');
            li.className = "p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 text-sm text-slate-700 font-medium";
            li.textContent = sala.texto;
            
            // Cuando selecciona una sala:
            li.addEventListener('click', () => {
                inputBuscarSala.value = sala.texto; 
                hiddenSelSala.value = sala.id; 
                listaSalasResultados.classList.add('hidden'); 
                
                // MÁGIA: Mostramos la dirección
                txtSalaDireccion.textContent = sala.direccion;
                
                // Armamos el texto de "Distrito - Provincia - Departamento" ignorando los que estén vacíos
                let ubicacion = [];
                if (sala.distrito) ubicacion.push(sala.distrito);
                if (sala.provincia) ubicacion.push(sala.provincia);
                if (sala.departamento) ubicacion.push(sala.departamento);
                
                txtSalaUbicacion.textContent = ubicacion.length > 0 ? ubicacion.join(' - ') : 'Ubicación no especificada';
                
                // Hacemos visible el cuadrito
                infoSalaDetalle.classList.remove('hidden');
            });
            listaSalasResultados.appendChild(li);
        });
    } else {
        listaSalasResultados.classList.remove('hidden');
        listaSalasResultados.innerHTML = '<li class="p-3 text-slate-400 text-sm italic">No se encontraron salas...</li>';
    }
});

document.addEventListener('click', (e) => {
    if (!inputBuscarSala.contains(e.target) && !listaSalasResultados.contains(e.target)) {
        listaSalasResultados.classList.add('hidden');
    }
});

// Ocultar la lista si toca en cualquier otra parte de la pantalla
document.addEventListener('click', (e) => {
    if (!inputBuscarSala.contains(e.target) && !listaSalasResultados.contains(e.target)) {
        listaSalasResultados.classList.add('hidden');
    }
});

    // Cargar Juegos
    const { data: juegos } = await supabaseClient.from('juegos').select('id, juego');
    const selJuego = document.getElementById('selJuego');
    if (juegos) {
        selJuego.innerHTML = '<option value="">Seleccione un juego...</option>' + 
            juegos.map(j => `<option value="${j.id}">${j.juego}</option>`).join('');
    }

    // Cargar Gabinetes
    const { data: gabinetes } = await supabaseClient.from('gabinetes').select('id, modelo');
    const selGabinete = document.getElementById('selGabinete');
    if (gabinetes) {
        selGabinete.innerHTML = '<option value="">Seleccione un gabinete...</option>' + 
            gabinetes.map(g => `<option value="${g.id}">${g.modelo}</option>`).join('');
    }
}

async function cargarAsignacionesPrevias() {
    const { data } = await supabaseClient
        .from('reporte_asignaciones')
        .select(`id, cantidad, juegos(juego), gabinetes(modelo)`)
        .eq('reporte_id', reporteIdActual);

    if (data) {
        data.forEach(asignacion => {
            juegosUnicosAsignados.add(asignacion.juegos.juego);
            renderizarBottonAsignado(asignacion);
        });
    }
}

// ==========================================
// 3. CREAR UN NUEVO TURNO
// ==========================================
document.getElementById('btnIniciarTurno').addEventListener('click', async () => {
    const salaId = document.getElementById('selSala').value;
    const ini = document.getElementById('turnoIni').value;
    const fin = document.getElementById('turnoFin').value;
    const usuarioId = localStorage.getItem('usuario_id');

    if (!salaId || !ini || !fin) {
        alert('Por favor selecciona la sala y el horario del turno.');
        return;
    }

    const btn = document.getElementById('btnIniciarTurno');
    btn.textContent = 'Iniciando...';
    btn.disabled = true;

    const horaIniDB = ini + ':00';
    const horaFinDB = fin + ':00';

    const { data, error } = await supabaseClient
        .from('reportes')
        .insert([{
            usuario_id: usuarioId,
            sala_id: salaId,
            turno_ini: horaIniDB,
            turno_fin: horaFinDB
        }])
        .select()
        .single();

    if (error) {
        alert('Error al iniciar el turno: ' + error.message);
        btn.textContent = 'Iniciar mi Turno';
        btn.disabled = false;
    } else {
        reporteIdActual = data.id;
        turnoInicioLocal = ini;
        turnoFinLocal = fin;
        
        localStorage.setItem('turno_activo_id', data.id);
        localStorage.setItem('turno_ini', ini);
        localStorage.setItem('turno_fin', fin);
        
        document.getElementById('seccionConfiguracion').classList.add('hidden');
        document.getElementById('seccionAsignacion').classList.remove('hidden');
        document.getElementById('seccionMonitoreo').classList.remove('hidden');
        document.getElementById('btnFinalizarTurno').classList.remove('hidden');
        document.getElementById('infoTurnoTexto').textContent = `${ini} a ${fin}`;
    }
});

// ==========================================
// 4. ASIGNAR MÁQUINAS Y GENERAR BOTONES
// ==========================================
document.getElementById('btnAsignar').addEventListener('click', async () => {
    const juegoId = document.getElementById('selJuego').value;
    const gabineteId = document.getElementById('selGabinete').value;
    const cantidad = document.getElementById('cantMaquina').value;

    if (!juegoId || !gabineteId || !cantidad) {
        alert('Selecciona el juego, gabinete y la cantidad.');
        return;
    }

    const { data, error } = await supabaseClient
        .from('reporte_asignaciones')
        .insert([{
            reporte_id: reporteIdActual,
            juego_id: juegoId,
            gabinete_id: gabineteId,
            cantidad: parseInt(cantidad)
        }])
        .select(`id, cantidad, juegos(juego), gabinetes(modelo)`)
        .single();

    if (error) {
        alert('Error al asignar máquina: ' + error.message);
    } else {
        // Guardar progresivo en memoria si se configuró
        if (progNombreGlobal && progPozosGlobal > 0) {
            const existe = progresivosTurno.find(p => p.nombre === progNombreGlobal);
            if (!existe) {
                progresivosTurno.push({
                    nombre: progNombreGlobal,
                    pozos: progPozosGlobal,
                    montosFinales: []
                });
                localStorage.setItem('progresivos_turno', JSON.stringify(progresivosTurno));
            }
            progNombreGlobal = "";
            progPozosGlobal = 0;
            document.getElementById('txtProgresivoResumen').textContent = 'Ninguno configurado';
            document.getElementById('txtProgresivoResumen').classList.remove('text-blue-600', 'font-bold');
            document.getElementById('contenedorPozosMontos').innerHTML = '';
        }

        document.getElementById('cantMaquina').value = '1';
        juegosUnicosAsignados.add(data.juegos.juego);
        renderizarBottonAsignado(data);
    }
});

function renderizarBottonAsignado(asignacion) {
    const zonaBotones = document.getElementById('zonaBotones');
    const nombreJuego = asignacion.juegos.juego;
    const modeloGabinete = asignacion.gabinetes.modelo;
    const cantidad = asignacion.cantidad;

    const btn = document.createElement('button');
    btn.className = "bg-white rounded-2xl shadow-sm p-4 border-2 border-slate-200 hover:border-blue-500 text-left transition-all active:scale-95 space-y-1 relative group";
    btn.innerHTML = `
        <span class="absolute top-3 right-3 bg-blue-50 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-md">${cantidad} un.</span>
        <span class="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">${modeloGabinete}</span>
        <span class="block text-sm font-bold text-slate-800 leading-tight">${nombreJuego}</span>
    `;

    btn.addEventListener('click', () => {
        abrirModalOcupacion(asignacion.id, nombreJuego, modeloGabinete);
    });

    zonaBotones.appendChild(btn);
}

// ==========================================
// 5. MODAL DE OCUPACIÓN Y FALLAS
// ==========================================
const modalOcupacion = document.getElementById('modalOcupacion');
const contentOcupacion = document.getElementById('modalContent');

function abrirModalOcupacion(asignId, juego, gabinete) {
    asignacionIdSeleccionada = asignId;
    const bloqueActual = calcularBloqueHorarioActual(turnoInicioLocal, turnoFinLocal);
    
    document.getElementById('modalTituloHora').textContent = bloqueActual;
    document.getElementById('modalSubtituloMaquina').textContent = `${juego} (${gabinete})`;
    document.getElementById('inputOcupacion').value = '';
    document.getElementById('incidenciaSerie').value = '';
    document.getElementById('incidenciaCant').value = '';
    document.getElementById('incidenciaError').value = '';

    modalOcupacion.classList.remove('hidden');
    setTimeout(() => {
        modalOcupacion.classList.remove('opacity-0');
        contentOcupacion.classList.remove('translate-y-full');
    }, 10);
}

function cerrarModalOcupacion() {
    modalOcupacion.classList.add('opacity-0');
    contentOcupacion.classList.add('translate-y-full');
    setTimeout(() => modalOcupacion.classList.add('hidden'), 300);
}

document.getElementById('btnCerrarModal').addEventListener('click', cerrarModalOcupacion);

// Guardar Ocupación e Incidencia
document.getElementById('btnGuardarOcupacion').addEventListener('click', async () => {
    const ocupacionVal = document.getElementById('inputOcupacion').value.trim();
    const bloqueHorario = document.getElementById('modalTituloHora').textContent;
    const serie = document.getElementById('incidenciaSerie').value.trim();
    const cantInc = document.getElementById('incidenciaCant').value.trim();
    const errorDesc = document.getElementById('incidenciaError').value.trim();

    if (!ocupacionVal) {
        alert('Por favor ingresa la cantidad de personas jugando.');
        return;
    }

    // 1. Guardar Ocupación
    const { error: errOcup } = await supabaseClient
        .from('ocupaciones')
        .insert([{
            asignacion_id: asignacionIdSeleccionada,
            bloque_horario: bloqueHorario,
            ocupacion: parseInt(ocupacionVal)
        }]);

    if (errOcup) {
        alert('Error al guardar ocupación: ' + errOcup.message);
        return;
    }

    // 2. Guardar Incidencia (si llenó los datos)
    if (serie || errorDesc) {
        await supabaseClient
            .from('incidencias')
            .insert([{
                asignacion_id: asignacionIdSeleccionada,
                serie: serie || 'S/N',
                error: errorDesc || 'Falla reportada',
                cantidad: cantInc ? parseInt(cantInc) : 1
            }]);
    }

    alert('¡Datos registrados correctamente para el bloque ' + bloqueHorario + '!');
    cerrarModalOcupacion();
});

// ==========================================
// 6. VENTANA FLOTANTE: DENOMINACIONES
// ==========================================
const modalDenom = document.getElementById('modalDenominaciones');
const contentDenom = document.getElementById('contentDenominaciones');
const btnAbrirDenom = document.getElementById('btnAbrirModalDenom');

btnAbrirDenom.addEventListener('click', () => {
    modalDenom.classList.remove('hidden');
    setTimeout(() => {
        modalDenom.classList.remove('opacity-0');
        contentDenom.classList.remove('translate-y-full');
    }, 10);
});

document.querySelectorAll('.denom-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const val = this.textContent;
        this.classList.toggle('bg-blue-100');
        this.classList.toggle('border-blue-500');
        this.classList.toggle('text-blue-700');
        
        if(denominacionesSeleccionadas.includes(val)) {
            denominacionesSeleccionadas = denominacionesSeleccionadas.filter(d => d !== val);
        } else {
            denominacionesSeleccionadas.push(val);
        }
    });
});

document.getElementById('btnConfirmarDenom').addEventListener('click', () => {
    modalDenom.classList.add('opacity-0');
    contentDenom.classList.add('translate-y-full');
    setTimeout(() => modalDenom.classList.add('hidden'), 300);

    if (denominacionesSeleccionadas.length > 0) {
        denominacionesSeleccionadas.sort((a, b) => parseFloat(a) - parseFloat(b));
        btnAbrirDenom.textContent = denominacionesSeleccionadas.join(' / ');
        btnAbrirDenom.classList.add('text-blue-700', 'font-bold', 'bg-blue-50', 'border-blue-300');
        btnAbrirDenom.classList.remove('text-slate-400', 'bg-white');
    } else {
        btnAbrirDenom.textContent = 'Tocar para seleccionar...';
        btnAbrirDenom.classList.remove('text-blue-700', 'font-bold', 'bg-blue-50', 'border-blue-300');
        btnAbrirDenom.classList.add('text-slate-400', 'bg-white');
    }
});

// ==========================================
// 7. VENTANA FLOTANTE: CONFIGURAR PROGRESIVO
// ==========================================
const modalProg = document.getElementById('modalProgresivo');
const contentProg = document.getElementById('contentProgresivo');

document.getElementById('btnAbrirModalProg').addEventListener('click', () => {
    modalProg.classList.remove('hidden');
    setTimeout(() => {
        modalProg.classList.remove('opacity-0');
        contentProg.classList.remove('translate-y-full');
    }, 10);
});

document.getElementById('progRangoPozos').addEventListener('input', function() {
    document.getElementById('valorRangoPozos').textContent = this.value;
});

document.getElementById('btnCerrarProgSinGuardar').addEventListener('click', () => {
    modalProg.classList.add('opacity-0');
    contentProg.classList.add('translate-y-full');
    setTimeout(() => modalProg.classList.add('hidden'), 300);
});

document.getElementById('btnConfirmarProg').addEventListener('click', () => {
    progNombreGlobal = document.getElementById('progNombreInput').value;
    progPozosGlobal = parseInt(document.getElementById('progRangoPozos').value);

    const resumenTexto = document.getElementById('txtProgresivoResumen');
    const contenedorMontos = document.getElementById('contenedorPozosMontos');

    if (!progNombreGlobal) {
        alert('Por favor selecciona el nombre del progresivo.');
        return;
    }

    resumenTexto.textContent = `${progNombreGlobal} (${progPozosGlobal} Pozos configurados)`;
    resumenTexto.classList.add('text-blue-600', 'font-bold');

    contenedorMontos.innerHTML = '';
    for (let i = 1; i <= progPozosGlobal; i++) {
        contenedorMontos.innerHTML += `
            <div class="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Pozo ${i}</label>
                <input type="number" step="0.01" id="montoPozo_${i}" class="w-full border-b-2 border-slate-200 p-1 text-sm outline-none focus:border-blue-500 font-bold text-slate-700" placeholder="0.00">
            </div>
        `;
    }

    modalProg.classList.add('opacity-0');
    contentProg.classList.add('translate-y-full');
    setTimeout(() => modalProg.classList.add('hidden'), 300);
});

// ==========================================
// 8. CIERRE DE TURNO Y PROGRESIVOS FINALES
// ==========================================
const modalCierre = document.getElementById('modalCierre');
const contentCierre = document.getElementById('modalContentCierre');
let ordenTopJuegos = [];

document.getElementById('btnFinalizarTurno').addEventListener('click', () => {
    renderizarTopJuegosModal();
    renderizarBotonesProgresivosCierre();
    
    modalCierre.classList.remove('hidden');
    setTimeout(() => {
        modalCierre.classList.remove('opacity-0');
        contentCierre.classList.remove('translate-y-full');
    }, 10);
});

function renderizarTopJuegosModal() {
    const contenedor = document.getElementById('contenedorTopJuegos');
    contenedor.innerHTML = '';
    ordenTopJuegos = [];
    document.getElementById('ordenSeleccionado').textContent = 'Orden actual: Ninguno';
    document.getElementById('inputTopJuegosOculto').value = '';

    if (juegosUnicosAsignados.size === 0) {
        contenedor.innerHTML = '<p class="text-xs text-slate-400 italic">No asignaste juegos en este turno.</p>';
        return;
    }

    juegosUnicosAsignados.forEach(juego => {
        const btn = document.createElement('button');
        btn.className = "bg-slate-100 border-2 border-slate-200 text-slate-600 font-bold py-2 px-4 rounded-xl transition-colors text-sm active:scale-95";
        btn.textContent = juego;
        
        btn.addEventListener('click', function() {
            const nombreBase = this.textContent.replace(/^[0-9]+\.\s/, '');
            if (ordenTopJuegos.includes(nombreBase)) {
                ordenTopJuegos = ordenTopJuegos.filter(j => j !== nombreBase);
                this.classList.replace('bg-blue-600', 'bg-slate-100');
                this.classList.replace('border-blue-700', 'border-slate-200');
                this.classList.replace('text-white', 'text-slate-600');
            } else {
                ordenTopJuegos.push(nombreBase);
                this.classList.replace('bg-slate-100', 'bg-blue-600');
                this.classList.replace('border-slate-200', 'border-blue-700');
                this.classList.replace('text-slate-600', 'text-white');
            }
            actualizarTextosTopJuegos();
        });
        contenedor.appendChild(btn);
    });
}

function actualizarTextosTopJuegos() {
    const botones = document.getElementById('contenedorTopJuegos').children;
    Array.from(botones).forEach(btn => {
        const nombreBase = btn.textContent.replace(/^[0-9]+\.\s/, '');
        const index = ordenTopJuegos.indexOf(nombreBase);
        btn.textContent = index !== -1 ? `${index + 1}. ${nombreBase}` : nombreBase;
    });
    const texto = ordenTopJuegos.length > 0 ? ordenTopJuegos.join(' > ') : 'Ninguno';
    document.getElementById('ordenSeleccionado').textContent = `Orden actual: ${texto}`;
    document.getElementById('inputTopJuegosOculto').value = ordenTopJuegos.join(', ');
}

function renderizarBotonesProgresivosCierre() {
    const contenedor = document.getElementById('contenedorBotonesProgresivosCierre');
    const msg = document.getElementById('msgSinProgresivos');
    contenedor.innerHTML = '';
    
    if (progresivosTurno.length === 0) {
        msg.classList.remove('hidden');
    } else {
        msg.classList.add('hidden');
        progresivosTurno.forEach((prog, index) => {
            const btn = document.createElement('button');
            const completado = prog.montosFinales && prog.montosFinales.length === prog.pozos;
            
            btn.className = completado 
                ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-300 font-bold py-2 px-4 rounded-xl text-sm transition-all"
                : "bg-white text-indigo-600 border-2 border-indigo-200 hover:border-indigo-400 font-bold py-2 px-4 rounded-xl text-sm transition-all shadow-sm";
            
            btn.innerHTML = `${prog.nombre} <span class="text-[10px] block font-normal">${prog.pozos} Pozos</span>`;
            btn.addEventListener('click', () => abrirModalCierreProgresivo(index));
            contenedor.appendChild(btn);
        });
    }
}

let indexProgresivoActual = null;
const modalCierreProg = document.getElementById('modalCierreProgresivo');
const contentCierreProg = document.getElementById('contentCierreProgresivo');

function abrirModalCierreProgresivo(index) {
    indexProgresivoActual = index;
    const prog = progresivosTurno[index];
    document.getElementById('tituloCierreProgresivo').textContent = prog.nombre;
    
    const contenedorInputs = document.getElementById('contenedorInputsCierreProgresivo');
    contenedorInputs.innerHTML = '';
    
    for(let i=1; i<=prog.pozos; i++) {
        const valorPrevio = prog.montosFinales && prog.montosFinales[i-1] ? prog.montosFinales[i-1] : '';
        contenedorInputs.innerHTML += `
            <div class="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                <label class="block text-[10px] font-bold uppercase text-indigo-400 mb-1">Pozo ${i}</label>
                <input type="number" step="0.01" id="cierrePozo_${i}" value="${valorPrevio}" class="w-full bg-transparent border-b-2 border-indigo-200 p-1 text-lg outline-none focus:border-indigo-600 font-black text-indigo-900" placeholder="0.00">
            </div>
        `;
    }
    
    modalCierreProg.classList.remove('hidden');
    setTimeout(() => {
        modalCierreProg.classList.remove('opacity-0');
        contentCierreProg.classList.remove('translate-y-full');
    }, 10);
}

document.getElementById('btnCancelarCierreProgresivo').addEventListener('click', () => {
    modalCierreProg.classList.add('opacity-0');
    contentCierreProg.classList.add('translate-y-full');
    setTimeout(() => modalCierreProg.classList.add('hidden'), 300);
});

document.getElementById('btnGuardarCierreProgresivo').addEventListener('click', () => {
    const prog = progresivosTurno[indexProgresivoActual];
    prog.montosFinales = [];
    
    for(let i=1; i<=prog.pozos; i++) {
        const val = document.getElementById(`cierrePozo_${i}`).value || '0.00';
        prog.montosFinales.push(val);
    }
    
    localStorage.setItem('progresivos_turno', JSON.stringify(progresivosTurno));
    
    modalCierreProg.classList.add('opacity-0');
    contentCierreProg.classList.add('translate-y-full');
    setTimeout(() => modalCierreProg.classList.add('hidden'), 300);
    renderizarBotonesProgresivosCierre();
});

document.getElementById('btnCancelarCierre').addEventListener('click', () => {
    modalCierre.classList.add('opacity-0');
    contentCierre.classList.add('translate-y-full');
    setTimeout(() => modalCierre.classList.add('hidden'), 300);
});

// Guardar todo en Supabase y salir
document.getElementById('btnConfirmarCierre').addEventListener('click', async () => {
    const topJuegosStr = document.getElementById('inputTopJuegosOculto').value;
    let comProduc = document.getElementById('comProduc').value.trim();
    const comSala = document.getElementById('comSala').value.trim();

    let montosFinalesTexto = [];
    progresivosTurno.forEach(prog => {
        if(prog.montosFinales && prog.montosFinales.length > 0) {
            let pozosStr = prog.montosFinales.map((m, i) => `P${i+1}: ${m}`).join(' | ');
            montosFinalesTexto.push(`[${prog.nombre} -> ${pozosStr}]`);
        }
    });

    if(montosFinalesTexto.length > 0) {
        comProduc += `\n\nPROGRESIVOS AL CIERRE:\n` + montosFinalesTexto.join('\n');
    }

    const btnConfirmar = document.getElementById('btnConfirmarCierre');
    btnConfirmar.textContent = 'Cerrando Turno...';
    btnConfirmar.disabled = true;

    const { error } = await supabaseClient
        .from('reportes')
        .update({
            com_produc: comProduc.trim(),
            com_sala: comSala,
            top_juegos: topJuegosStr
        })
        .eq('id', reporteIdActual);

    if (error) {
        alert('Error al cerrar el turno: ' + error.message);
        btnConfirmar.textContent = 'Cerrar Turno';
        btnConfirmar.disabled = false;
    } else {
        localStorage.removeItem('turno_activo_id');
        localStorage.removeItem('turno_ini');
        localStorage.removeItem('turno_fin');
        localStorage.removeItem('progresivos_turno');
        
        window.location.replace('dashboard.html');
    }
});

// ==========================================
// 9. CÁLCULO INTELIGENTE DE HORAS Y TOLERANCIA
// ==========================================
function calcularBloqueHorarioActual(hIni, hFin) {
    const ahora = new Date();
    const horaActualMinutos = ahora.getHours() * 60 + ahora.getMinutes();

    const [iniH, iniM] = hIni.split(':').map(Number);
    const [finH, finM] = hFin.split(':').map(Number);

    let inicioMinutos = iniH * 60 + iniM;
    let finMinutos = finH * 60 + finM;
    
    if (finMinutos < inicioMinutos) { finMinutos += 24 * 60; }

    let bloqueEncontrado = `${hIni} - ${incrementarHora(hIni)}`;

    for (let m = inicioMinutos; m < finMinutos; m += 60) {
        let bloqueInicio = minutosAHora(m);
        let bloqueFin = minutosAHora(m + 60);
        
        let esUltimoBloque = (m + 60 >= finMinutos);
        let limiteMaximo = esUltimoBloque ? (m + 60 + 30) : (m + 60);

        if (horaActualMinutos >= m && horaActualMinutos < limiteMaximo) {
            bloqueEncontrado = `${bloqueInicio} - ${bloqueFin}`;
            break;
        }
    }

    return bloqueEncontrado;
}

function incrementarHora(horaStr) {
    let [h, m] = horaStr.split(':').map(Number);
    h = (h + 1) % 24;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function minutosAHora(minutosTotal) {
    let h = Math.floor(minutosTotal / 60) % 24;
    let m = minutosTotal % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
