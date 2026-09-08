// ==========================================
// CONTROL DEL MODAL DE PROGRESIVOS
// ==========================================
window.progresivoSeleccionadoId = null;

document.getElementById('btnAbrirModalProgresivo').addEventListener('click', () => {
    document.getElementById('modalProgresivo').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('modalProgresivo').classList.remove('opacity-0');
        document.getElementById('modalProgresivoContent').classList.remove('translate-y-full');
    }, 10);
});

document.getElementById('btnCerrarProgresivo').addEventListener('click', () => {
    document.getElementById('modalProgresivo').classList.add('opacity-0');
    document.getElementById('modalProgresivoContent').classList.add('translate-y-full');
    setTimeout(() => document.getElementById('modalProgresivo').classList.add('hidden'), 300);
});

document.getElementById('modalSelProgresivo').addEventListener('change', function() {
    const contenedor = document.getElementById('modalContenedorPozos');
    contenedor.innerHTML = ''; 
    if(!this.value) return; 

    const progresivoElegido = todosLosProgresivos.find(p => p.id === this.value);
    if(progresivoElegido && progresivoElegido.nombres_pozos) {
        progresivoElegido.nombres_pozos.forEach(nombrePozo => {
            contenedor.innerHTML += `
                <div class="flex justify-between items-center bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <label class="text-xs font-bold text-blue-800 uppercase w-1/3">${nombrePozo}</label>
                    <div class="relative w-2/3">
                        <span class="absolute left-3 top-2.5 text-slate-400 font-bold">S/</span>
                        <input type="number" step="0.01" data-pozo="${nombrePozo}" placeholder="0.00" class="w-full bg-white border border-blue-200 rounded-lg py-2 pl-8 pr-3 text-right font-bold text-slate-700 outline-none focus:border-blue-500">
                    </div>
                </div>
            `;
        });
    }
});

document.getElementById('btnGuardarProgresivo').addEventListener('click', () => {
    const select = document.getElementById('modalSelProgresivo');
    const txtProgresivoElegido = document.getElementById('txtProgresivoElegido');
    
    if (select.value) {
        txtProgresivoElegido.textContent = select.options[select.selectedIndex].text;
        txtProgresivoElegido.classList.replace('text-slate-400', 'text-blue-700');
        progresivoSeleccionadoId = select.value;
    } else {
        txtProgresivoElegido.textContent = "Ninguno configurado";
        txtProgresivoElegido.classList.replace('text-blue-700', 'text-slate-400');
        progresivoSeleccionadoId = null;
    }
    document.getElementById('btnCerrarProgresivo').click();
});

// ==========================================
// CONTROL DE CIERRE DE TURNO
// ==========================================
let progresivoCierreActual = null; 
let valoresCierreProgresivos = {}; 

document.getElementById('btnFinalizarTurno').addEventListener('click', () => {
    const progresivosUnicos = [];
    asignacionesEnMemoria.forEach(a => {
        if (a.progresivo_id && !progresivosUnicos.includes(a.progresivo_id)) progresivosUnicos.push(a.progresivo_id);
    });

    const contenedorBotones = document.getElementById('contenedorBotonesProgresivosCierre');
    contenedorBotones.innerHTML = '';
    
    if (progresivosUnicos.length === 0) {
        document.getElementById('msgSinProgresivos').classList.remove('hidden');
    } else {
        document.getElementById('msgSinProgresivos').classList.add('hidden');
        progresivosUnicos.forEach(progId => {
            const progInfo = todosLosProgresivos.find(p => p.id == progId);
            if (progInfo) {
                const btn = document.createElement('button');
                const yaLlenado = valoresCierreProgresivos[progId] ? 'bg-indigo-600 text-white' : 'bg-white border-2 border-indigo-200 text-indigo-700';
                btn.className = `px-4 py-3 rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all ${yaLlenado}`;
                btn.innerHTML = `${progInfo.nombre} ${valoresCierreProgresivos[progId] ? '✓' : ''}`;
                btn.addEventListener('click', () => abrirModalCierreProgresivo(progInfo));
                contenedorBotones.appendChild(btn);
            }
        });
    }

    document.getElementById('modalCierre').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('modalCierre').classList.remove('opacity-0');
        document.getElementById('modalContentCierre').classList.remove('translate-y-full');
    }, 10);
});

function abrirModalCierreProgresivo(progInfo) {
    progresivoCierreActual = progInfo.id;
    document.getElementById('tituloCierreProgresivo').textContent = progInfo.nombre;
    const contenedorInputs = document.getElementById('contenedorInputsCierreProgresivo');
    contenedorInputs.innerHTML = '';

    if (progInfo.nombres_pozos) {
        progInfo.nombres_pozos.forEach(nombrePozo => {
            const valorPrevio = valoresCierreProgresivos[progInfo.id]?.[nombrePozo] || '';
            contenedorInputs.innerHTML += `
                <div class="col-span-2 flex justify-between items-center bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                    <label class="text-xs font-bold text-indigo-800 uppercase w-1/3">${nombrePozo}</label>
                    <div class="relative w-2/3">
                        <span class="absolute left-3 top-2.5 text-slate-400 font-bold">S/</span>
                        <input type="number" step="0.01" data-pozo="${nombrePozo}" value="${valorPrevio}" placeholder="0.00" class="w-full bg-white border border-indigo-200 rounded-lg py-2 pl-8 pr-3 text-right font-bold text-slate-700 outline-none focus:border-indigo-500 input-cierre-pozo">
                    </div>
                </div>
            `;
        });
    }

    document.getElementById('modalCierreProgresivo').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('modalCierreProgresivo').classList.remove('opacity-0');
        document.getElementById('contentCierreProgresivo').classList.remove('translate-y-full');
    }, 10);
}

document.getElementById('btnGuardarCierreProgresivo').addEventListener('click', () => {
    const inputs = document.querySelectorAll('.input-cierre-pozo');
    const valores = {};
    let todoLleno = true;

    inputs.forEach(input => {
        const val = input.value.trim();
        if (val === '') todoLleno = false;
        valores[input.getAttribute('data-pozo')] = val ? parseFloat(val) : 0;
    });

    if (!todoLleno) {
        alert('Ingresa un monto en todos los pozos antes de guardar.');
        return; 
    }

    valoresCierreProgresivos[progresivoCierreActual] = valores;
    document.getElementById('btnCancelarCierreProgresivo').click();
    document.getElementById('btnFinalizarTurno').click(); 
});

document.getElementById('btnCancelarCierreProgresivo').addEventListener('click', () => {
    document.getElementById('modalCierreProgresivo').classList.add('opacity-0');
    document.getElementById('contentCierreProgresivo').classList.add('translate-y-full');
    setTimeout(() => document.getElementById('modalCierreProgresivo').classList.add('hidden'), 300);
});

document.getElementById('btnCancelarCierre').addEventListener('click', () => {
    document.getElementById('modalCierre').classList.add('opacity-0');
    document.getElementById('modalContentCierre').classList.add('translate-y-full');
    setTimeout(() => document.getElementById('modalCierre').classList.add('hidden'), 300);
});

// 5. CONFIRMAR CIERRE DE TURNO (Supabase Save)
document.getElementById('btnConfirmarCierre').addEventListener('click', async () => {
    const btnCierre = document.getElementById('btnConfirmarCierre');
    const textoOriginal = btnCierre.innerText;
    btnCierre.innerText = 'Guardando y Cerrando...';
    btnCierre.disabled = true;

    try {
        // Preparamos los datos EXACTAMENTE con los nombres de tus columnas
        const datosActualizar = {
            com_produc: document.getElementById('comProduc').value.trim(),
            com_sala: document.getElementById('comSala').value.trim(),
            progresivos_finales: valoresCierreProgresivos // <-- ¡Asegúrate de que esta línea exista y NO tenga "//" al inicio!
        };

        // ⚠️ ATENCIÓN: Si quieres guardar los montos de los progresivos que la anfitriona llenó, 
        // NECESITAS crear una columna llamada 'progresivos_finales' de tipo JSONB en tu tabla 'reportes'.
        // Si ya la creaste, quita las dos barras (//) de la siguiente línea:
        // datosActualizar.progresivos_finales = valoresCierreProgresivos;

        const { error } = await supabaseClient
            .from('reportes')
            .update(datosActualizar)
            .eq('id', reporteIdActual);

        if (error) throw error;

        // Limpiamos la memoria del navegador
        localStorage.removeItem('turno_activo_id');
        localStorage.removeItem('turno_ini');
        localStorage.removeItem('turno_fin');
        localStorage.removeItem('progresivos_turno');

        alert('¡Turno cerrado y guardado correctamente! Gran trabajo.');
        window.location.href = 'dashboard.html';

    } catch (error) {
        alert('Hubo un problema al cerrar el turno: ' + error.message);
        btnCierre.innerText = textoOriginal;
        btnCierre.disabled = false;
    }
});