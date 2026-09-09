// ==========================================
// VARIABLES GLOBALES Y ESTADO
// ==========================================
window.todasLasDenominaciones = []; 
window.progresivosTurno = JSON.parse(localStorage.getItem('progresivos_turno')) || [];
window.juegosRanking = []; // Para compartir con cierre.js
window.valoresCierreProgresivos = {}; // Para compartir con cierre.js

let reporteIdActual = localStorage.getItem('turno_activo_id');
let turnoInicioLocal = localStorage.getItem('turno_ini');
let turnoFinLocal = localStorage.getItem('turno_fin');
let asignacionIdSeleccionada = null;

let juegosUnicosAsignados = new Set();
let progNombreGlobal = "";
let progPozosGlobal = 0;
let denominacionesSeleccionadas = [];
let todasLasSalas = [];
let todosLosProgresivos = [];
let asignacionesEnMemoria = [];

// ==========================================
// INICIALIZACIÓN Y CARGA DE DATOS
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await cargarSelectores();

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
    const { data: salas } = await supabaseClient.from('salas').select('id, nombre, distrito, direccion, provincia, departamento');
    if (salas) {
        todasLasSalas = salas.map(s => {
            return {
                id: s.id, texto: s.nombre ? `${s.nombre} ${s.distrito ? `(${s.distrito})` : ''}` : 'Sala sin nombre',
                direccion: s.direccion || '', distrito: s.distrito || '', provincia: s.provincia || '', departamento: s.departamento || ''
            };
        });
    }

    const { data: progresivos } = await supabaseClient.from('progresivos').select('*');
    if (progresivos) {
        todosLosProgresivos = progresivos;
        const selectProg = document.getElementById('modalSelProgresivo');
        selectProg.innerHTML = '<option value="">Selecciona o escribe...</option>';
        progresivos.forEach(p => { selectProg.innerHTML += `<option value="${p.id}">${p.nombre}</option>`; });
    }

    const { data: plataformas } = await supabaseClient.from('juegos').select('id, juego').eq('grupo', 'Plataforma');
    if (plataformas) {
        document.getElementById('selJuego').innerHTML = '<option value="">Seleccione una plataforma...</option>' + 
            plataformas.map(j => `<option value="${j.id}">${j.juego}</option>`).join('');
    }

    const { data: gabinetes } = await supabaseClient.from('gabinetes').select('id, modelo');
    if (gabinetes) {
        document.getElementById('selGabinete').innerHTML = '<option value="">Seleccione un gabinete...</option>' + 
            gabinetes.map(g => `<option value="${g.id}">${g.modelo}</option>`).join('');
    }

    const { data: dataDenom } = await supabaseClient.from('denominaciones').select('valor');
    if (dataDenom) {
        window.todasLasDenominaciones = dataDenom.map(d => d.valor).sort((a, b) => parseFloat(a) - parseFloat(b));
        if(typeof renderizarBotonesDenominacion === 'function') renderizarBotonesDenominacion();
    }
}

async function cargarAsignacionesPrevias() {
    // 1. CARGAR DATOS GENERALES DEL REPORTE (Aforo, Comentarios, Progresivos)
    const { data: rep } = await supabaseClient
        .from('reportes')
        .select('aforo, top_juegos, com_produc, com_sala, com_competencia, progresivos_iniciales, progresivos_finales, estado')
        .eq('id', reporteIdActual)
        .single();

    if (rep) {
        // Llenar variables globales para que los otros archivos las lean
        window.progresivosTurno = rep.progresivos_iniciales || [];
        localStorage.setItem('progresivos_turno', JSON.stringify(window.progresivosTurno));

        window.valoresCierreProgresivos = rep.progresivos_finales || {};
        
        if (rep.top_juegos && rep.top_juegos !== 'Ninguno') {
            window.juegosRanking = rep.top_juegos.split(', ');
        } else {
            window.juegosRanking = [];
        }

        // Llenar UI del Cierre
        if (rep.aforo !== null) {
            const sliderAforo = document.getElementById('aforoTurno');
            const txtAforo = document.getElementById('txtAforoPorcentaje');
            if (sliderAforo && txtAforo) {
                sliderAforo.value = rep.aforo;
                txtAforo.textContent = rep.aforo + '%';
                if(rep.aforo < 40) txtAforo.className = 'text-2xl font-black text-emerald-500 leading-none';
                else if(rep.aforo < 80) txtAforo.className = 'text-2xl font-black text-blue-500 leading-none';
                else txtAforo.className = 'text-2xl font-black text-red-500 leading-none';
            }
        }

        if (document.getElementById('comProduc')) document.getElementById('comProduc').value = rep.com_produc || '';
        if (document.getElementById('comSala')) document.getElementById('comSala').value = rep.com_sala || '';
        if (document.getElementById('comCompetencia')) document.getElementById('comCompetencia').value = rep.com_competencia || '';

        // Cambiar botones si estamos Editando
        if (rep.estado === 'Completado') {
            const btnFinalizarTurno = document.getElementById('btnFinalizarTurno');
            if (btnFinalizarTurno) btnFinalizarTurno.innerText = 'Actualizar Turno y Salir';
            
            const btnConfirmarCierre = document.getElementById('btnConfirmarCierre');
            if (btnConfirmarCierre) btnConfirmarCierre.innerText = 'Actualizar Turno';
        }
    }

    // 2. CARGAR MÁQUINAS ASIGNADAS
    const { data } = await supabaseClient
        .from('reporte_asignaciones')
        .select(`id, cantidad, juego_id, gabinete_id, progresivo_id, ap_minima, ap_maxima, denominaciones, juegos(juego), gabinetes(modelo)`)
        .eq('reporte_id', reporteIdActual);

    if (data) {
        asignacionesEnMemoria = data;
        data.forEach(asignacion => {
            juegosUnicosAsignados.add(asignacion.juegos.juego);
        });
        if(typeof renderizarBottonAsignado === 'function') renderizarBottonAsignado();
    }
}

// ==========================================
// BUSCADOR INTELIGENTE DE SALAS
// ==========================================
const inputBuscarSala = document.getElementById('inputBuscarSala');
const listaSalasResultados = document.getElementById('listaSalasResultados');
const hiddenSelSala = document.getElementById('selSala');
const infoSalaDetalle = document.getElementById('infoSalaDetalle');

function normalizarTexto(texto) {
    if(!texto) return "";
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

if(inputBuscarSala){
    inputBuscarSala.addEventListener('input', function() {
        const termino = normalizarTexto(this.value);
        listaSalasResultados.innerHTML = ''; 
        hiddenSelSala.value = ''; 
        infoSalaDetalle.classList.add('hidden');

        if (termino.length === 0) {
            listaSalasResultados.classList.add('hidden');
            return;
        }

        const resultados = todasLasSalas.filter(sala => normalizarTexto(sala.texto).includes(termino));

        if (resultados.length > 0) {
            listaSalasResultados.classList.remove('hidden');
            resultados.forEach(sala => {
                const li = document.createElement('li');
                li.className = "p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 text-sm text-slate-700 font-medium";
                li.textContent = sala.texto;
                
                li.addEventListener('click', () => {
                    inputBuscarSala.value = sala.texto; 
                    hiddenSelSala.value = sala.id; 
                    listaSalasResultados.classList.add('hidden'); 
                    
                    document.getElementById('txtSalaDireccion').textContent = sala.direccion;
                    let ubicacion = [sala.distrito, sala.provincia, sala.departamento].filter(Boolean);
                    document.getElementById('txtSalaUbicacion').textContent = ubicacion.length > 0 ? ubicacion.join(' - ') : 'Ubicación no especificada';
                    infoSalaDetalle.classList.remove('hidden');
                    document.getElementById('bloqueHorasYBtn').classList.remove('hidden');
                });
                listaSalasResultados.appendChild(li);
            });
        } else {
            listaSalasResultados.classList.remove('hidden');
            listaSalasResultados.innerHTML = '<li class="p-3 text-slate-400 text-sm italic">No se encontraron salas...</li>';
        }
    });
}

document.addEventListener('click', (e) => {
    if (inputBuscarSala && listaSalasResultados && !inputBuscarSala.contains(e.target) && !listaSalasResultados.contains(e.target)) {
        listaSalasResultados.classList.add('hidden');
    }
});

// ==========================================
// CREAR UN NUEVO TURNO
// ==========================================
const btnIniciarTurno = document.getElementById('btnIniciarTurno');
if(btnIniciarTurno){
    btnIniciarTurno.addEventListener('click', async () => {
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

        const { data, error } = await supabaseClient
            .from('reportes')
            .insert([{
                usuario_id: usuarioId,
                sala_id: salaId,
                turno_ini: ini + ':00',
                turno_fin: fin + ':00'
            }]).select().single();

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
}