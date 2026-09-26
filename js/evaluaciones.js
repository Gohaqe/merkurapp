// Seguridad de Admin
const userId = localStorage.getItem('usuario_id');
if (!userId || (localStorage.getItem('usuario_cargo') !== 'Admin' && localStorage.getItem('usuario_cargo') !== 'Administrador')) {
    alert('Acceso denegado. Solo administradores.');
    window.location.replace('dashboard.html');
}

const criterios = [
    { id: 'peinado', nombre: '💇‍♀️ Peinado y Cabello' },
    { id: 'maquillaje', nombre: '💄 Maquillaje y Rostro' },
    { id: 'uniforme', nombre: '👗 Uniforme y Planchado' },
    { id: 'manos', nombre: '💅 Cuidado de Manos/Uñas' },
    { id: 'calzado', nombre: '👠 Calzado Limpio' }
];

document.addEventListener('DOMContentLoaded', async () => {
    // Truco para forzar la zona horaria local (Perú)
    const fechaLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    document.getElementById('evalFecha').value = fechaLocal;
    
    dibujarCriterios();
    await cargarAnfitrionas();
    
    document.getElementById('selAnfitrionaDiag').addEventListener('change', generarDiagnostico);
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

// Convertir número a estrellas visuales (ej: 3.5 -> ⭐⭐⭐✨)
window.actualizarEstrellas = function(id) {
    const val = parseFloat(document.getElementById(`val_${id}`).value);
    document.getElementById(`num_${id}`).textContent = val.toFixed(1);
    
    let estrellas = '';
    for(let i=1; i<=5; i++) {
        if (val >= i) estrellas += '⭐';
        else if (val >= i - 0.5) estrellas += '✨'; // Media estrella
        else estrellas += '🌑';
    }
    document.getElementById(`txt_${id}`).textContent = estrellas;
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
// GUARDAR EVALUACIÓN Y FOTO
// ==========================================
document.getElementById('btnGuardarEval').addEventListener('click', async () => {
    const anfitrionaId = document.getElementById('selAnfitriona').value;
    const fecha = document.getElementById('evalFecha').value;
    const archivoFoto = document.getElementById('evalFoto').files[0];
    const comentario = document.getElementById('evalComentario').value.trim();
    
    if(!anfitrionaId) { alert('Selecciona una anfitriona'); return; }

    const btn = document.getElementById('btnGuardarEval');
    btn.textContent = 'Subiendo y Guardando...';
    btn.disabled = true;

    try {
        let fotoUrl = null;

        // 1. Subir Foto a Supabase Storage (Si hay foto)
        if (archivoFoto) {
            const fileExt = archivoFoto.name.split('.').pop();
            const fileName = `${anfitrionaId}_${Date.now()}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabaseClient.storage.from('fotos_evaluacion').upload(fileName, archivoFoto);
            
            if (uploadError) throw uploadError;
            
            // Obtener link público de la foto
            const { data: urlData } = supabaseClient.storage.from('fotos_evaluacion').getPublicUrl(fileName);
            fotoUrl = urlData.publicUrl;
        }

        // 2. Guardar las notas numéricas en la base de datos
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

        alert('✅ Evaluación guardada con éxito');
        
        // Limpiar
        document.getElementById('evalComentario').value = '';
        document.getElementById('evalFoto').value = '';
        limpiarVistaPrevia(); // <--- AGREGAR ESTO AQUÍ
        dibujarCriterios(); // Resetear estrellas a 5
        generarDiagnostico(); // Actualizar el panel de la derecha

    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        btn.textContent = 'Guardar Evaluación';
        btn.disabled = false;
    }
});

// ==========================================
// EL MOTOR DE DIAGNÓSTICO (INTELIGENCIA DE MEJORA)
// ==========================================
async function generarDiagnostico() {
    const anfId = document.getElementById('selAnfitrionaDiag').value;
    if(!anfId) return;

    // Buscar evaluaciones de los últimos 15 días (Respetando hora Perú)
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

    // Calcular matemática de promedios
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
        
        // Colores según la nota (Rojo malo, Amarillo regular, Verde bueno)
        let colorClass = prom >= 4 ? 'text-emerald-600 bg-emerald-50' : (prom >= 3 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50');
        
        cajaPromedios.innerHTML += `
            <div class="${colorClass} p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                <span class="text-[10px] font-bold uppercase truncate pr-2">${c.nombre}</span>
                <span class="font-black text-sm">${prom.toFixed(1)} ⭐</span>
            </div>
        `;
    });

    // GENERAR CONSEJOS DE MEJORA
    cajaAlertas.innerHTML = '';
    let tieneAlertas = false;

    if (promedios.maquillaje < 3.5) {
        cajaAlertas.innerHTML += '<li>❌ <b>Maquillaje:</b> Su puntaje constante es bajo. Indicarle que mejore el delineado, aplique base uniforme y use labial acorde al estándar.</li>';
        tieneAlertas = true;
    }
    if (promedios.peinado < 3.5) {
        cajaAlertas.innerHTML += '<li>❌ <b>Cabello:</b> Hay problemas recurrentes de frizz o peinados sueltos. Exigir uso de gel, laca o red para el cabello.</li>';
        tieneAlertas = true;
    }
    if (promedios.uniforme < 3.5) {
        cajaAlertas.innerHTML += '<li>❌ <b>Uniforme:</b> Está presentándose con ropa arrugada, manchada o desteñida. Requiere revisión de su dotación de uniforme.</li>';
        tieneAlertas = true;
    }
    if (promedios.manos < 3.5) {
        cajaAlertas.innerHTML += '<li>❌ <b>Manos:</b> Su esmaltado está dañado frecuentemente. Recordarle el estándar corporativo de manicura.</li>';
        tieneAlertas = true;
    }
    if (promedios.calzado < 3.5) {
        cajaAlertas.innerHTML += '<li>❌ <b>Zapatos:</b> Calzado sucio o no estándar.</li>';
        tieneAlertas = true;
    }

    if (!tieneAlertas) {
        cajaAlertas.innerHTML = '<li class="text-emerald-600">✨ ¡Impecable! Sus promedios son excelentes. No requiere mejoras urgentes.</li>';
    }
}
// ==========================================
// VISUALIZADOR DE FOTO EN TIEMPO REAL
// ==========================================
const inputFoto = document.getElementById('evalFoto');
const previewContainer = document.getElementById('previewContainer');
const previewImg = document.getElementById('previewImg');
const btnQuitarFoto = document.getElementById('btnQuitarFoto');

// 1. Cuando se elige una foto, mostrarla inmediatamente
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

// 2. Botón de la 'X' para quitar la foto si salió mal
btnQuitarFoto.addEventListener('click', function(e) {
    e.preventDefault();
    limpiarVistaPrevia();
});

// Función para limpiar el marco
window.limpiarVistaPrevia = function() {
    inputFoto.value = ''; // Borra el archivo
    previewContainer.classList.add('hidden');
    previewImg.src = '';
};