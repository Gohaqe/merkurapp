// Seguridad de Admin
const userId = localStorage.getItem('usuario_id');
if (!userId || (localStorage.getItem('usuario_cargo') !== 'Admin' && localStorage.getItem('usuario_cargo') !== 'Administrador')) {
    alert('Acceso denegado. Solo administradores.');
    window.location.replace('dashboard.html');
}

const criterios = [
    { id: 'peinado', nombre: '💇‍♀️ Peinado y Cabello' },
    { id: 'maquillaje', nombre: '💄 Maquillaje y Rostro' },
    { id: 'uniforme', nombre: '👗 Uniforme / Planchado' },
    { id: 'manos', nombre: '💅 Cuidado de Manos' },
    { id: 'calzado', nombre: '👠 Calzado Limpio' },
    { id: 'actitud', nombre: '😊 Actitud' },
    { id: 'puntualidad', nombre: '⏱️ Puntualidad' },
    { id: 'perifoneo', nombre: '📢 Perifoneo' }
];

let anfitrionasActivas = []; // Almacenamos las anfitrionas globalmente

document.addEventListener('DOMContentLoaded', async () => {
    // Truco de Zona Horaria Perú (-5)
    const fechaLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    document.getElementById('evalFecha').value = fechaLocal;
    
    dibujarCriterios();
    await cargarAnfitrionas();
});

function dibujarCriterios() {
    const caja = document.getElementById('cajaCriterios');
    caja.innerHTML = '';
    
    criterios.forEach(c => {
        caja.innerHTML += `
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                <div class="flex justify-between items-center">
                    <label class="block text-[11px] font-black text-slate-600 uppercase">${c.nombre}</label>
                    <span id="num_${c.id}" class="text-xs text-slate-400 font-bold">5.0</span>
                </div>
                <div class="flex gap-1" id="estrellas_${c.id}">
                    ${[1, 2, 3, 4, 5].map(i => `
                        <button type="button" class="text-2xl cursor-pointer hover:scale-110 transition-transform select-none" data-valor="${i}" onclick="seleccionarEstrella('${c.id}',${i})">
                            ⭐
                        </button>
                    `).join('')}
                </div>
                <input type="hidden" id="val_${c.id}" value="5">
            </div>
        `;
    });
    
    criterios.forEach(c => seleccionarEstrella(c.id, 5));
}

window.seleccionarEstrella = function(criterioId, valor) {
    document.getElementById(`val_${criterioId}`).value = valor;
    document.getElementById(`num_${criterioId}`).textContent = parseFloat(valor).toFixed(1);
    
    const contenedor = document.getElementById(`estrellas_${criterioId}`);
    const botones = contenedor.querySelectorAll('button');
    
    botones.forEach((btn, index) => {
        if (index < valor) {
            btn.textContent = '⭐';
            btn.classList.remove('opacity-40', 'grayscale');
        } else {
            btn.textContent = '🌑';
            btn.classList.add('opacity-40', 'grayscale');
        }
    });
};

window.generarTextoEstrellasVisuales = function(val) {
    let estrellas = '';
    for(let i=1; i<=5; i++) {
        if (val >= i) estrellas += '⭐';
        else estrellas += '🌑';
    }
    return estrellas;
};

async function cargarAnfitrionas() {
    const { data } = await supabaseClient.from('usuarios').select('id, nombres, apellidos').eq('cargo', 'Anfitriona');
    const sel1 = document.getElementById('selAnfitriona');
    
    if (data) {
        anfitrionasActivas = data;
        data.forEach(u => {
            const nombreCompleto = `${u.nombres} ${u.apellidos}`;
            sel1.innerHTML += `<option value="${u.id}">${nombreCompleto}</option>`;
        });
        if(data.length > 0) generarDiagnosticoGeneral();
    }
}

// ==========================================
// VISUALIZADOR DE FOTO EN TIEMPO REAL
// ==========================================
const inputFoto = document.getElementById('evalFoto');
const previewContainer = document.getElementById('previewContainer');
const previewImg = document.getElementById('previewImg');

if (inputFoto) {
    inputFoto.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                previewContainer.classList.remove('hidden');
            }
            reader.readAsDataURL(file);
        } else {
            limpiarVistaPrevia();
        }
    });
}

if (document.getElementById('btnQuitarFoto')) {
    document.getElementById('btnQuitarFoto').addEventListener('click', function(e) {
        e.preventDefault();
        limpiarVistaPrevia();
    });
}

window.limpiarVistaPrevia = function() {
    if(inputFoto) inputFoto.value = ''; 
    if(previewContainer) previewContainer.classList.add('hidden');
    if(previewImg) previewImg.src = '';
};

// ==========================================
// GUARDAR EVALUACIÓN
// ==========================================
document.getElementById('btnGuardarEval').addEventListener('click', async () => {
    const anfitrionaId = document.getElementById('selAnfitriona').value;
    const fecha = document.getElementById('evalFecha').value;
    const archivoFoto = inputFoto ? inputFoto.files[0] : null;
    const comentario = document.getElementById('evalComentario').value.trim();
    
    if(!anfitrionaId) { alert('Selecciona una anfitriona'); return; }

    const btn = document.getElementById('btnGuardarEval');
    btn.textContent = 'Subiendo y Guardando...';
    btn.disabled = true;

    try {
        let fotoUrl = null;

        if (archivoFoto) {
            const fileExt = archivoFoto.name.split('.').pop();
            const fileName = `${anfitrionaId}_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabaseClient.storage.from('fotos_evaluacion').upload(fileName, archivoFoto);
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabaseClient.storage.from('fotos_evaluacion').getPublicUrl(fileName);
            fotoUrl = urlData.publicUrl;
        }

        const payload = {
            admin_id: userId,
            anfitriona_id: anfitrionaId,
            fecha: fecha,
            foto_url: fotoUrl,
            comentario: comentario,
            peinado: parseFloat(document.getElementById('val_peinado').value),
            maquillaje: parseFloat(document.getElementById('val_maquillaje').value),
            uniforme: parseFloat(document.getElementById('val_uniforme').value),
            manos: parseFloat(document.getElementById('val_manos').value),
            calzado: parseFloat(document.getElementById('val_calzado').value),
            actitud: parseFloat(document.getElementById('val_actitud').value),
            puntualidad: parseFloat(document.getElementById('val_puntualidad').value),
            perifoneo: parseFloat(document.getElementById('val_perifoneo').value)
        };

        const { error } = await supabaseClient.from('evaluaciones').insert([payload]);
        if (error) throw error;

        alert('✅ Evaluación guardada con éxito');
        
        document.getElementById('evalComentario').value = '';
        limpiarVistaPrevia(); 
        dibujarCriterios(); 
        generarDiagnosticoGeneral(); // Refresca la lista de la derecha

    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        btn.textContent = 'Guardar Evaluación';
        btn.disabled = false;
    }
});

// ==========================================
// RESUMEN MENSUAL (SE REINICIA EL DÍA 1)
// ==========================================
async function generarDiagnosticoGeneral() {
    // Calcular el día 1 del mes actual respetando la zona horaria
    const hoyLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000);
    const primerDiaMes = new Date(hoyLocal.getFullYear(), hoyLocal.getMonth(), 1);
    const fechaInicioStr = primerDiaMes.toISOString().split('T')[0];
    
    // Traer TODAS las evaluaciones del mes actual
    const { data: evals } = await supabaseClient.from('evaluaciones')
        .select('*')
        .gte('fecha', fechaInicioStr);

    const contenedor = document.getElementById('listaDiagnosticos');
    contenedor.innerHTML = '';
    
    if (!evals || evals.length === 0) {
        contenedor.innerHTML = '<p class="text-sm text-slate-500 border border-dashed border-slate-300 p-4 rounded-xl text-center">No hay evaluaciones registradas en este mes.</p>';
        return;
    }

    // Agrupar evaluaciones por Anfitriona
    let stats = {};
    evals.forEach(e => {
        if (!stats[e.anfitriona_id]) {
            stats[e.anfitriona_id] = { 
                count: 0, 
                sumas: { peinado: 0, maquillaje: 0, uniforme: 0, manos: 0, calzado: 0, actitud: 0, puntualidad: 0, perifoneo: 0 }
            };
        }
        stats[e.anfitriona_id].count++;
        stats[e.anfitriona_id].sumas.peinado += e.peinado;
        stats[e.anfitriona_id].sumas.maquillaje += e.maquillaje;
        stats[e.anfitriona_id].sumas.uniforme += e.uniforme;
        stats[e.anfitriona_id].sumas.manos += e.manos;
        stats[e.anfitriona_id].sumas.calzado += e.calzado;
        stats[e.anfitriona_id].sumas.actitud += (e.actitud || 0);
        stats[e.anfitriona_id].sumas.puntualidad += (e.puntualidad || 0);
        stats[e.anfitriona_id].sumas.perifoneo += (e.perifoneo || 0);
    });

    // Dibujar la lista de anfitrionas que tienen evaluaciones este mes
    anfitrionasActivas.forEach(anf => {
        const s = stats[anf.id];
        if (!s) return; // Si no tiene evaluaciones este mes, no aparece en el resumen

        let promedios = {};
        let sumaTotal = 0;
        criterios.forEach(c => {
            promedios[c.id] = s.sumas[c.id] / s.count;
            sumaTotal += promedios[c.id];
        });
        
        let promGeneral = sumaTotal / 8; // Promedio de los 8 criterios

        // Buscar áreas de mejora (Criterios con promedio menor a 3.5)
        let alertas = [];
        criterios.forEach(c => {
            if (promedios[c.id] < 3.5) {
                // Quitamos emojis del nombre para el texto de alerta
                alertas.push(c.nombre.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '').trim());
            }
        });

        let alertasHtml = alertas.length > 0 
            ? `<p class="text-[11px] text-red-600 font-medium mt-1 leading-tight">⚠️ <b>Mejorar:</b> ${alertas.join(', ')}</p>` 
            : `<p class="text-[11px] text-emerald-600 font-medium mt-1">✨ Sin alertas, excelente desempeño.</p>`;
        
        let colorGeneral = promGeneral >= 4 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : (promGeneral >= 3 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-red-100 text-red-700 border-red-200');
        let nombreCompleto = `${anf.nombres} ${anf.apellidos}`;

        contenedor.innerHTML += `
            <div class="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                <div class="flex-1">
                    <h4 class="font-black text-slate-800 text-sm truncate uppercase">${nombreCompleto}</h4>
                    <p class="text-[10px] text-slate-500 font-bold tracking-wider mb-1">${s.count} evaluación(es) en el mes</p>
                    ${alertasHtml}
                </div>
                <div class="flex flex-col items-end gap-2 pl-4 border-l border-slate-200 ml-4">
                    <span class="${colorGeneral} border px-3 py-1 rounded-full text-sm font-black shadow-inner">
                        ${promGeneral.toFixed(1)} ⭐
                    </span>
                    <button onclick="abrirHistorial('${anf.id}', '${nombreCompleto}')" class="text-[10px] bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-pink-600 transition-colors font-bold whitespace-nowrap uppercase tracking-wide">
                        Ver Detalle
                    </button>
                </div>
            </div>
        `;
    });
}

// ==========================================
// MODAL DE HISTORIAL AL HACER CLIC
// ==========================================
async function abrirHistorial(anfId, nombreAnf) {
    document.getElementById('historialTitulo').textContent = `Auditorías de: ${nombreAnf}`;
    const contenedor = document.getElementById('contenedorTarjetasHistorial');
    contenedor.innerHTML = '<p class="text-center text-slate-500 py-10 col-span-full">Recuperando historial...</p>';

    const modal = document.getElementById('modalHistorial');
    const content = document.getElementById('contentHistorial');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); content.classList.remove('translate-y-full'); }, 10);

    // Trae todas las evaluaciones históricas de esa anfitriona (no solo las del mes)
    const { data: historial } = await supabaseClient.from('evaluaciones')
        .select('*')
        .eq('anfitriona_id', anfId)
        .order('fecha', { ascending: false });

    contenedor.innerHTML = '';

    if (!historial || historial.length === 0) {
        contenedor.innerHTML = '<p class="text-center text-slate-500 py-10 col-span-full font-bold">No hay ninguna evaluación registrada.</p>';
        return;
    }

    historial.forEach(e => {
        const fechaF = new Date(e.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        const promDia = (e.peinado + e.maquillaje + e.uniforme + e.manos + e.calzado + (e.actitud || 0) + (e.puntualidad || 0) + (e.perifoneo || 0)) / 8;
        
        let colorNota = promDia >= 4 ? 'bg-emerald-500' : (promDia >= 3 ? 'bg-yellow-500' : 'bg-red-500');

        let fotoHtml = e.foto_url 
            ? `<a href="${e.foto_url}" target="_blank"><img src="${e.foto_url}" class="w-full h-56 object-cover hover:opacity-90 transition-opacity"></a>` 
            : `<div class="w-full h-24 bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold">📷 Sin Fotografía</div>`;

        contenedor.innerHTML += `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div class="px-4 py-3 bg-slate-800 text-white flex justify-between items-center">
                    <span class="font-bold text-xs uppercase tracking-wide">${fechaF}</span>
                    <span class="${colorNota} text-white text-[10px] font-black px-2 py-1 rounded-full shadow-inner">Nota: ${promDia.toFixed(1)}</span>
                </div>
                ${fotoHtml}
                <div class="p-5 space-y-3 flex-1 bg-slate-50">
                    <div class="flex justify-between items-center text-xs border-b border-slate-200 pb-1.5">
                        <span class="font-bold text-slate-600">Peinado</span>
                        <span class="tracking-widest">${generarTextoEstrellasVisuales(e.peinado)}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-b border-slate-200 pb-1.5">
                        <span class="font-bold text-slate-600">Maquillaje</span>
                        <span class="tracking-widest">${generarTextoEstrellasVisuales(e.maquillaje)}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-b border-slate-200 pb-1.5">
                        <span class="font-bold text-slate-600">Uniforme</span>
                        <span class="tracking-widest">${generarTextoEstrellasVisuales(e.uniforme)}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-b border-slate-200 pb-1.5">
                        <span class="font-bold text-slate-600">Manos/Uñas</span>
                        <span class="tracking-widest">${generarTextoEstrellasVisuales(e.manos)}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-b border-slate-200 pb-1.5">
                        <span class="font-bold text-slate-600">Calzado</span>
                        <span class="tracking-widest">${generarTextoEstrellasVisuales(e.calzado)}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-b border-slate-200 pb-1.5">
                        <span class="font-bold text-slate-600">Actitud</span>
                        <span class="tracking-widest">${generarTextoEstrellasVisuales(e.actitud || 0)}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-b border-slate-200 pb-1.5">
                        <span class="font-bold text-slate-600">Puntualidad</span>
                        <span class="tracking-widest">${generarTextoEstrellasVisuales(e.puntualidad || 0)}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-b border-slate-200 pb-1.5">
                        <span class="font-bold text-slate-600">Perifoneo</span>
                        <span class="tracking-widest">${generarTextoEstrellasVisuales(e.perifoneo || 0)}</span>
                    </div>
                    
                    <div class="pt-2">
                        <span class="block text-[10px] font-black text-indigo-400 uppercase mb-1">Comentario:</span>
                        <p class="text-xs text-slate-700 font-medium italic bg-white p-2 rounded border border-slate-200">${e.comentario || 'Sin comentarios adicionales.'}</p>
                    </div>
                </div>
            </div>
        `;
    });
}

window.cerrarHistorial = function() {
    const modal = document.getElementById('modalHistorial');
    const content = document.getElementById('contentHistorial');
    modal.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
};