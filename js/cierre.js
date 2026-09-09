// ==========================================
// VARIABLES DE CIERRE
// ==========================================
window.juegosRanking = window.juegosRanking || [];
window.valoresCierreProgresivos = window.valoresCierreProgresivos || {};
let idProgresivoEditando = null;
let nombresPozosEditando = [];
let catalogoJuegosGlobal = []; 

// ==========================================
// 1. INICIAR CIERRE DE TURNO
// ==========================================
document.getElementById('btnFinalizarTurno').addEventListener('click', async () => {
    const modal = document.getElementById('modalCierre');
    const content = document.getElementById('modalContentCierre'); 
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('translate-y-full');
    }, 10);

    if (catalogoJuegosGlobal.length === 0) {
        const { data: listaJuegos } = await supabaseClient.from('juegos').select('juego').eq('grupo', 'Juego');
        if (listaJuegos) {
            catalogoJuegosGlobal = listaJuegos.map(j => j.juego);
        }
    }
    
    // Pintamos lo que haya cargado estado.js en la memoria
    renderizarRankingSeleccionado();
    refrescarProgresivosCierre();
});

function refrescarProgresivosCierre() {
    const progsEnUso = asignacionesEnMemoria.filter(a => a.progresivo_id != null && !a.oculto);
    const mapProgresivos = new Map();
    
    progsEnUso.forEach(a => {
        const progDB = todosLosProgresivos.find(p => p.id == a.progresivo_id);
        if (progDB && !mapProgresivos.has(a.progresivo_id)) {
            let pozosFormateados = Array.isArray(progDB.nombres_pozos) ? progDB.nombres_pozos : (typeof progDB.nombres_pozos === 'string' ? progDB.nombres_pozos.split(',').map(s => s.trim()) : []);
            mapProgresivos.set(a.progresivo_id, { id: progDB.id, nombre: progDB.nombre, pozos: pozosFormateados });
        }
    });

    const arrProgresivosUnicos = Array.from(mapProgresivos.values());
    const contenedorProgresivos = document.getElementById('contenedorBotonesProgresivosCierre');
    const bloqueProgresivos = document.getElementById('bloqueProgresivosCierre');

    if (arrProgresivosUnicos.length > 0) {
        bloqueProgresivos.classList.remove('hidden');
        contenedorProgresivos.innerHTML = '';
        arrProgresivosUnicos.forEach(p => {
            const btn = document.createElement('button');
            if (window.valoresCierreProgresivos[p.id]) {
                btn.className = "bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold py-3 px-3 rounded-xl shadow-sm hover:bg-emerald-200 transition-colors w-full flex justify-between items-center text-xs";
                btn.innerHTML = `<span class="truncate pr-1">${p.nombre}</span> <span class="bg-emerald-500 text-white rounded-full p-0.5"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></span>`;
            } else {
                btn.className = "bg-white border border-indigo-200 text-indigo-700 font-bold py-3 px-3 rounded-xl shadow-sm hover:bg-indigo-50 transition-colors w-full text-center text-xs truncate";
                btn.innerHTML = `<span>${p.nombre}</span>`;
            }
            btn.onclick = () => abrirModalLlenadoPozo(p.id, p.nombre, p.pozos);
            contenedorProgresivos.appendChild(btn);
        });
    } else {
        bloqueProgresivos.classList.add('hidden');
        contenedorProgresivos.innerHTML = '';
    }
}

// ==========================================
// 2. BUSCADOR INTELIGENTE DE TOP JUEGOS
// ==========================================
const inputBuscarJuego = document.getElementById('buscadorTopJuegos');
const listaResultadosJuegos = document.getElementById('listaResultadosJuegos');

function normalizarTexto(texto) {
    if(!texto) return "";
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

if(inputBuscarJuego) {
    inputBuscarJuego.addEventListener('input', function() {
        const termino = normalizarTexto(this.value);
        listaResultadosJuegos.innerHTML = ''; 

        if (termino.length === 0) {
            listaResultadosJuegos.classList.add('hidden');
            return;
        }

        const resultados = catalogoJuegosGlobal.filter(juego => 
            normalizarTexto(juego).includes(termino) && !window.juegosRanking.includes(juego)
        );

        if (resultados.length > 0) {
            listaResultadosJuegos.classList.remove('hidden');
            resultados.forEach(juego => {
                const li = document.createElement('li');
                li.className = "p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 text-sm text-slate-700 font-medium";
                li.textContent = juego;
                li.addEventListener('click', () => {
                    if(window.juegosRanking.length >= 5) {
                        alert('Solo puedes agregar hasta 5 juegos al Top.');
                    } else {
                        window.juegosRanking.push(juego);
                        renderizarRankingSeleccionado();
                    }
                    inputBuscarJuego.value = '';
                    listaResultadosJuegos.classList.add('hidden'); 
                });
                listaResultadosJuegos.appendChild(li);
            });
        } else {
            listaResultadosJuegos.classList.remove('hidden');
            listaResultadosJuegos.innerHTML = '<li class="p-3 text-slate-400 text-sm italic">Sin resultados...</li>';
        }
    });
}

document.addEventListener('click', (e) => {
    if (inputBuscarJuego && listaResultadosJuegos && !inputBuscarJuego.contains(e.target) && !listaResultadosJuegos.contains(e.target)) {
        listaResultadosJuegos.classList.add('hidden');
    }
});

function renderizarRankingSeleccionado() {
    const contenedor = document.getElementById('contenedorRankingSeleccionado');
    if(!contenedor) return;
    contenedor.innerHTML = '';
    
    if (window.juegosRanking.length === 0) {
        contenedor.innerHTML = '<p class="text-xs text-slate-400 italic">No hay juegos en el ranking aún.</p>';
        return;
    }

    window.juegosRanking.forEach((juego, index) => {
        const medallas = ['bg-yellow-100 text-yellow-800 border-yellow-300', 'bg-slate-200 text-slate-700 border-slate-300', 'bg-orange-100 text-orange-800 border-orange-300', 'bg-blue-50 text-blue-700 border-blue-200', 'bg-slate-50 text-slate-600 border-slate-200'];
        const claseColor = medallas[index] || medallas[4];

        contenedor.innerHTML += `
            <div class="flex justify-between items-center ${claseColor} border rounded-lg p-2 shadow-sm">
                <span class="text-xs font-bold"><span class="opacity-60 mr-1">${index + 1}º</span> ${juego}</span>
                <button onclick="eliminarDelRanking(${index})" class="bg-white rounded-full p-1 hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        `;
    });
}

window.eliminarDelRanking = function(index) {
    window.juegosRanking.splice(index, 1);
    renderizarRankingSeleccionado();
};

// ==========================================
// 3. ANIMACIÓN DEL AFORO TIPO VOLUMEN
// ==========================================
const sliderAforo = document.getElementById('aforoTurno');
const txtAforo = document.getElementById('txtAforoPorcentaje');
if(sliderAforo && txtAforo) {
    sliderAforo.addEventListener('input', function() {
        txtAforo.textContent = this.value + '%';
        if(this.value < 40) txtAforo.className = 'text-2xl font-black text-emerald-500 leading-none';
        else if(this.value < 80) txtAforo.className = 'text-2xl font-black text-blue-500 leading-none';
        else txtAforo.className = 'text-2xl font-black text-red-500 leading-none';
    });
}

// ==========================================
// 4. MODAL DE LLENADO DE POZOS PROGRESIVOS
// ==========================================
window.abrirModalLlenadoPozo = function(id, nombre, pozos) {
    idProgresivoEditando = id;
    nombresPozosEditando = pozos;

    document.getElementById('tituloCierreProgresivo').textContent = nombre; 
    const contenedorInputs = document.getElementById('contenedorInputsCierreProgresivo'); 
    contenedorInputs.innerHTML = '';

    if (!pozos || pozos.length === 0) {
        contenedorInputs.innerHTML = '<p class="text-sm text-slate-400 col-span-2">No tiene pozos configurados.</p>';
    } else {
        pozos.forEach(pozo => {
            const valorPrevio = (window.valoresCierreProgresivos[id] && window.valoresCierreProgresivos[id][pozo]) ? window.valoresCierreProgresivos[id][pozo] : '';
            contenedorInputs.innerHTML += `
                <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">${pozo}</label>
                    <input type="number" id="pozo_${pozo}" value="${valorPrevio}" placeholder="Ej: 1500.50" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:border-indigo-500 outline-none text-slate-700">
                </div>
            `;
        });
    }

    const modal = document.getElementById('modalCierreProgresivo'); 
    const content = document.getElementById('contentCierreProgresivo'); 
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('translate-y-full');
    }, 10);
};

document.getElementById('btnGuardarCierreProgresivo').addEventListener('click', () => { 
    if (!idProgresivoEditando) return;
    const valoresGuardados = {};
    let todoLleno = true;
    nombresPozosEditando.forEach(pozo => {
        const val = document.getElementById(`pozo_${pozo}`).value.trim();
        if (val === '') todoLleno = false;
        else valoresGuardados[pozo] = parseFloat(val);
    });

    if (!todoLleno) {
        if(!confirm('Faltan pozos por llenar. ¿Guardar de todos modos?')) return;
    }

    window.valoresCierreProgresivos[idProgresivoEditando] = valoresGuardados;
    document.getElementById('btnCancelarCierreProgresivo').click(); 
    refrescarProgresivosCierre(); 
});

// ==========================================
// 5. CERRAR MODALES
// ==========================================
document.getElementById('btnCancelarCierre').addEventListener('click', () => { 
    const modal = document.getElementById('modalCierre');
    const content = document.getElementById('modalContentCierre');
    modal.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
});

document.getElementById('btnCancelarCierreProgresivo').addEventListener('click', () => { 
    const modal = document.getElementById('modalCierreProgresivo');
    const content = document.getElementById('contentCierreProgresivo');
    modal.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
});

// ==========================================
// 6. CONFIRMAR CIERRE FINAL A SUPABASE
// ==========================================
document.getElementById('btnConfirmarCierre').addEventListener('click', async () => {
    const btnCierre = document.getElementById('btnConfirmarCierre');
    const textoOriginal = btnCierre.innerText;
    btnCierre.innerText = 'Guardando...';
    btnCierre.disabled = true;

    try {
        const aforoValor = parseInt(document.getElementById('aforoTurno').value);

        const datosActualizar = {
            com_produc: document.getElementById('comProduc').value.trim(),
            com_sala: document.getElementById('comSala').value.trim(),
            com_competencia: document.getElementById('comCompetencia').value.trim(),
            aforo: isNaN(aforoValor) ? null : aforoValor,
            top_juegos: window.juegosRanking.length > 0 ? window.juegosRanking.join(', ') : 'Ninguno',
            progresivos_iniciales: window.progresivosTurno.length > 0 ? window.progresivosTurno : null,
            progresivos_finales: Object.keys(window.valoresCierreProgresivos).length > 0 ? window.valoresCierreProgresivos : null,
            estado: 'Completado'
        };

        const { error } = await supabaseClient.from('reportes').update(datosActualizar).eq('id', reporteIdActual);
        if (error) throw error;

        localStorage.removeItem('turno_activo_id');
        localStorage.removeItem('turno_ini');
        localStorage.removeItem('turno_fin');
        localStorage.removeItem('progresivos_turno'); 

        alert('¡Turno cerrado y guardado correctamente! Eres la mejor espía 🕵️‍♀️');
        window.location.href = 'dashboard.html';

    } catch (error) {
        alert('Error: ' + error.message);
        btnCierre.innerText = textoOriginal;
        btnCierre.disabled = false;
    }
});