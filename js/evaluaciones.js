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
    { id: 'calzado', nombre: '👠 Calzado Limpio' }
];

document.addEventListener('DOMContentLoaded', async () => {
    // Truco de Zona Horaria Perú (-5)
    const fechaLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    document.getElementById('evalFecha').value = fechaLocal;
    
    dibujarCriterios();
    await cargarAnfitrionas();
    
    document.getElementById('selAnfitrionaDiag').addEventListener('change', generarDiagnostico);
    document.getElementById('btnVerHistorial').addEventListener('click', abrirHistorial);
});

function dibujarCriterios() {
    const caja = document.getElementById('cajaCriterios');
    caja.innerHTML = '';
    
    criterios.forEach(c => {
        caja.innerHTML += `
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
                <div class="w-1/2">
                    <label class="block text-[11px] font-black text-slate-600 uppercase">${c.nombre}</label>
                    <span id="txt_${c.id}" class="text-pink-500 font-bold text-lg tracking-widest">⭐⭐⭐⭐⭐</span>
                    <span id="num_${c.id}" class="text-xs text-slate-400 font-bold ml-1">5.0</span>
                </div>
                <input type="range" id="val_${c.id}" min="1" max="5" step="0.5" value="5" class="w-1/2 accent-pink-500" oninput="actualizarEstrellas('${c.id}')">
            </div>
        `;
    });
}

// Dibujador de estrellas universal
window.generarTextoEstrellas = function(val) {
    let estrellas = '';
    for(let i=1; i<=5; i++) {
        if (val >= i) estrellas += '⭐';
        else if (val >= i - 0.5) estrellas += '✨'; 
        else estrellas += '🌑';
    }
    return estrellas;
};

window.actualizarEstrellas = function(id) {
    const val = parseFloat(document.getElementById(`val_${id}`).value);
    document.getElementById(`num_${id}`).textContent = val.toFixed(1);
    document.getElementById(`txt_${id}`).textContent = generarTextoEstrellas(val);
};

async function cargarAnfitrionas() {
    const { data } = await supabaseClient.from('usuarios').select('id, nombres, apellidos').eq('cargo', 'Anfitriona');
    const sel1 = document.getElementById('selAnfitriona');
    const sel2 = document.getElementById('selAnfitrionaDiag');
    
    if (data) {
        data.forEach(u => {
            const nombreCompleto = `${u.nombres} ${u.apellidos}`;
            sel1.innerHTML += `<option value="${u.id}">${nombreCompleto}</option>`;
            sel2.innerHTML += `<option value="${u.id}">${nombreCompleto}</option>`;
        });
        if(data.length > 0) generarDiagnostico();
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
            calzado: parseFloat(document.getElementById('val_calzado').value)
        };

        const { error } = await supabaseClient.from('evaluaciones').insert([payload]);
        if (error) throw error;

        alert('✅ Evaluación guardada con éxito (Inmutable)');
        
        document.getElementById('evalComentario').value = '';
        limpiarVistaPrevia(); 
        dibujarCriterios(); 
        generarDiagnostico(); 

    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        btn.textContent = 'Guardar Evaluación';
        btn.disabled = false;
    }
});

// ==========================================
// EL MOTOR DE DIAGNÓSTICO (MEJORA)
// ==========================================
async function generarDiagnostico() {
    const anfId = document.getElementById('selAnfitrionaDiag').value;
    if(!anfId) return;

    const hoy = new Date();
    const hace15 = new Date(); hace15.setDate(hoy.getDate() - 15);
    const fechaHace15Str = new Date(hace15.getTime() - hace15.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    const { data: evals } = await supabaseClient.from('evaluaciones')
        .select('*')
        .eq('anfitriona_id', anfId)
        .gte('fecha', fechaHace15Str);

    const cajaPromedios = document.getElementById('diagPromedios');
    const cajaAlertas = document.getElementById('diagAlertas');
    
    if (!evals || evals.length === 0) {
        cajaPromedios.innerHTML = '<p class="text-sm text-slate-400 col-span-2">No hay evaluaciones recientes.</p>';
        cajaAlertas.innerHTML = '<li>Aún no hay datos para diagnosticar.</li>';
        return;
    }

    let sumas = { peinado: 0, maquillaje: 0, uniforme: 0, manos: 0, calzado: 0 };
    evals.forEach(e => {
        sumas.peinado += e.peinado; sumas.maquillaje += e.maquillaje;
        sumas.uniforme += e.uniforme; sumas.manos += e.manos; sumas.calzado += e.calzado;
    });

    const qty = evals.length;
    let promedios = {};
    cajaPromedios.innerHTML = '';
    
    criterios.forEach(c => {
        let prom = sumas[c.id] / qty;
        promedios[c.id] = prom;
        let colorClass = prom >= 4 ? 'text-emerald-600 bg-emerald-50' : (prom >= 3 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50');
        
        cajaPromedios.innerHTML += `
            <div class="${colorClass} p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                <span class="text-[10px] font-bold uppercase truncate pr-2">${c.nombre}</span>
                <span class="font-black text-sm">${prom.toFixed(1)} ⭐</span>
            </div>
        `;
    });

    cajaAlertas.innerHTML = '';
    let tieneAlertas = false;

    if (promedios.maquillaje < 3.5) { cajaAlertas.innerHTML += '<li>❌ <b>Maquillaje:</b> Puntaje constante bajo. Falta arreglo facial estándar.</li>'; tieneAlertas = true; }
    if (promedios.peinado < 3.5) { cajaAlertas.innerHTML += '<li>❌ <b>Cabello:</b> Problemas recurrentes de frizz o cabello suelto.</li>'; tieneAlertas = true; }
    if (promedios.uniforme < 3.5) { cajaAlertas.innerHTML += '<li>❌ <b>Uniforme:</b> Se presenta arrugada o sin el uniforme completo.</li>'; tieneAlertas = true; }
    if (promedios.manos < 3.5) { cajaAlertas.innerHTML += '<li>❌ <b>Manos/Uñas:</b> Esmaltado dañado o falta de higiene en manos.</li>'; tieneAlertas = true; }
    if (promedios.calzado < 3.5) { cajaAlertas.innerHTML += '<li>❌ <b>Zapatos:</b> Calzado sucio o no permitido.</li>'; tieneAlertas = true; }

    if (!tieneAlertas) cajaAlertas.innerHTML = '<li class="text-emerald-600 font-bold">✨ ¡Impecable! No requiere mejoras urgentes.</li>';
}

// ==========================================
// MODAL DE HISTORIAL (EVIDENCIA INMUTABLE)
// ==========================================
async function abrirHistorial() {
    const selector = document.getElementById('selAnfitrionaDiag');
    const anfId = selector.value;
    const nombreAnf = selector.options[selector.selectedIndex]?.text;
    
    if(!anfId) return;

    document.getElementById('historialTitulo').textContent = `Auditorías de: ${nombreAnf}`;
    const contenedor = document.getElementById('contenedorTarjetasHistorial');
    contenedor.innerHTML = '<p class="text-center text-slate-500 py-10 col-span-full">Recuperando archivos de la bóveda...</p>';

    // Mostrar Modal
    const modal = document.getElementById('modalHistorial');
    const content = document.getElementById('contentHistorial');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); content.classList.remove('translate-y-full'); }, 10);

    // Traer TODO el historial ordenado de más nuevo a más viejo
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
        const promDia = (e.peinado + e.maquillaje + e.uniforme + e.manos + e.calzado) / 5;
        
        let colorNota = promDia >= 4 ? 'bg-emerald-500' : (promDia >= 3 ? 'bg-yellow-500' : 'bg-red-500');

        // Si hay foto, la muestra, si no, muestra un texto
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
                        <span class="tracking-widest">${generarTextoEstrellas(e.peinado)}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-b border-slate-200 pb-1.5">
                        <span class="font-bold text-slate-600">Maquillaje</span>
                        <span class="tracking-widest">${generarTextoEstrellas(e.maquillaje)}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-b border-slate-200 pb-1.5">
                        <span class="font-bold text-slate-600">Uniforme</span>
                        <span class="tracking-widest">${generarTextoEstrellas(e.uniforme)}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-b border-slate-200 pb-1.5">
                        <span class="font-bold text-slate-600">Manos/Uñas</span>
                        <span class="tracking-widest">${generarTextoEstrellas(e.manos)}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-b border-slate-200 pb-1.5">
                        <span class="font-bold text-slate-600">Calzado</span>
                        <span class="tracking-widest">${generarTextoEstrellas(e.calzado)}</span>
                    </div>
                    
                    <div class="pt-2">
                        <span class="block text-[10px] font-black text-indigo-400 uppercase mb-1">Comentario del Auditor:</span>
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