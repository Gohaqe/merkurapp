// Configuración dinámica por cada sección
const configBotones = {
    plataformas: {
        tabla: 'juegos', 
        titulo: 'Plataformas (Mix)',
        columnas: [{ id: 'juego', label: 'Nombre de la Plataforma', tipo: 'text', placeholder: 'Ej: Selection Mix' }]
    },
    gabinetes: {
        tabla: 'gabinetes', 
        titulo: 'Gabinetes',
        columnas: [{ id: 'modelo', label: 'Modelo del Gabinete', tipo: 'text', placeholder: 'Ej: AVANTGARDE MAX TRIO 27"' }]
    },
    progresivos: {
        tabla: 'progresivos', 
        titulo: 'Progresivos',
        columnas: [
            { id: 'nombre', label: 'Nombre del Progresivo', tipo: 'text', placeholder: 'Ej: Link King' },
            { id: 'nombres_pozos', label: 'Nombres de Pozos (Separados por coma)', tipo: 'text', placeholder: 'Ej: MINI, MINOR, MAJOR, GRAND' }
        ]
    },
    denominaciones: {
        tabla: 'denominaciones', 
        titulo: 'Denominaciones',
        columnas: [{ id: 'valor', label: 'Valor de la Denominación', tipo: 'text', placeholder: 'Ej: 0.01' }]
    }
};

let tabActivo = 'plataformas';
let idEditando = null;

// ==========================================
// INICIALIZACIÓN Y NAVEGACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si es Admin (Asegúrate de que al iniciar sesión guardes el cargo)
    // const cargo = localStorage.getItem('usuario_cargo');
    // if(cargo !== 'Admin') window.location.href = 'dashboard.html';
    
    cargarDatosTabla();
});

window.cambiarTab = function(nuevoTab) {
    // Cambiar estilos de las pestañas
    document.getElementById(`tab_${tabActivo}`).classList.replace('text-blue-600', 'text-slate-400');
    document.getElementById(`tab_${tabActivo}`).classList.replace('border-blue-600', 'border-transparent');
    
    tabActivo = nuevoTab;
    
    document.getElementById(`tab_${tabActivo}`).classList.replace('text-slate-400', 'text-blue-600');
    document.getElementById(`tab_${tabActivo}`).classList.replace('border-transparent', 'border-blue-600');
    
    document.getElementById('tituloSeccion').textContent = `Gestionar ${configBotones[tabActivo].titulo}`;
    
    cargarDatosTabla();
};

// ==========================================
// LEER DATOS (READ)
// ==========================================
async function cargarDatosTabla() {
    const lista = document.getElementById('listaDatos');
    lista.innerHTML = '<li class="p-4 text-center text-slate-400 text-sm">Cargando...</li>';
    
    const config = configBotones[tabActivo];
    const columnasSelect = config.columnas.map(c => c.id).join(', ');
    
    const { data, error } = await supabaseClient
        .from(config.tabla)
        .select(`id, ${columnasSelect}`)
        .order('created_at', { ascending: false });

    if (error) {
        lista.innerHTML = `<li class="p-4 text-center text-red-500 text-sm">Error: ${error.message}</li>`;
        return;
    }

    lista.innerHTML = '';
    if (data.length === 0) {
        lista.innerHTML = `<li class="p-4 text-center text-slate-400 text-sm">No hay registros aún.</li>`;
        return;
    }

    data.forEach(item => {
        let textoPrincipal = item[config.columnas[0].id];
        let textoSecundario = '';

        // Tratamiento especial para mostrar los pozos en la vista de Progresivos
        if (tabActivo === 'progresivos' && item.nombres_pozos) {
            textoSecundario = `<p class="text-[10px] text-slate-400 uppercase font-bold mt-1">Pozos: ${item.nombres_pozos.join(', ')}</p>`;
        }

        const li = document.createElement('li');
        li.className = "p-4 flex justify-between items-center hover:bg-slate-50 transition-colors";
        
        // Guardamos la data completa en un string para poder editarla luego
        const itemJson = encodeURIComponent(JSON.stringify(item));

        li.innerHTML = `
            <div class="flex-1">
                <span class="font-bold text-slate-700 block">${textoPrincipal}</span>
                ${textoSecundario}
            </div>
            <div class="flex gap-2">
                <button onclick="editarRegistro('${itemJson}')" class="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
                <button onclick="eliminarRegistro('${item.id}')" class="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        `;
        lista.appendChild(li);
    });
}

// ==========================================
// CREAR Y EDITAR (MODAL)
// ==========================================
window.abrirModalCrud = function() {
    idEditando = null;
    document.getElementById('tituloModal').textContent = `Nueva ${configBotones[tabActivo].titulo}`;
    construirFormulario({});
    mostrarModal();
};

window.editarRegistro = function(itemJsonCodificado) {
    const item = JSON.parse(decodeURIComponent(itemJsonCodificado));
    idEditando = item.id;
    document.getElementById('tituloModal').textContent = `Editar ${configBotones[tabActivo].titulo}`;
    
    // Tratamiento para que el arreglo de pozos se vea como texto separado por comas
    if(item.nombres_pozos && Array.isArray(item.nombres_pozos)){
        item.nombres_pozos = item.nombres_pozos.join(', ');
    }
    
    construirFormulario(item);
    mostrarModal();
};

function construirFormulario(datosPreexistentes) {
    const contenedor = document.getElementById('formularioCrud');
    contenedor.innerHTML = '';
    
    configBotones[tabActivo].columnas.forEach(col => {
        const valor = datosPreexistentes[col.id] || '';
        contenedor.innerHTML += `
            <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">${col.label}</label>
                <input type="${col.tipo}" id="input_${col.id}" value="${valor}" placeholder="${col.placeholder}" class="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 outline-none">
            </div>
        `;
    });
}

// GUARDAR DATOS (CREATE / UPDATE)
document.getElementById('btnGuardarCrud').addEventListener('click', async () => {
    const config = configBotones[tabActivo];
    const datosGuardar = {};
    let errorValidacion = false;

    // Recolectar datos de los inputs
    config.columnas.forEach(col => {
        let valor = document.getElementById(`input_${col.id}`).value.trim();
        if (!valor) errorValidacion = true;
        
        // Convertir texto de pozos separados por coma a Arreglo de Textos (Para JSONB o _text en Supabase)
        if (col.id === 'nombres_pozos') {
            valor = valor.split(',').map(s => s.trim().toUpperCase()).filter(s => s !== '');
        }
        datosGuardar[col.id] = valor;
    });

    if (errorValidacion) {
        alert('Por favor, llena todos los campos.');
        return;
    }

    document.getElementById('btnGuardarCrud').innerText = 'Guardando...';

    let errorSupabase;
    if (idEditando) {
        const { error } = await supabaseClient.from(config.tabla).update(datosGuardar).eq('id', idEditando);
        errorSupabase = error;
    } else {
        const { error } = await supabaseClient.from(config.tabla).insert([datosGuardar]);
        errorSupabase = error;
    }

    if (errorSupabase) {
        alert("Error al guardar: " + errorSupabase.message);
    } else {
        cerrarModalCrud();
        cargarDatosTabla();
    }
    
    document.getElementById('btnGuardarCrud').innerText = 'Guardar Datos';
});

// ==========================================
// ELIMINAR (DELETE)
// ==========================================
window.eliminarRegistro = async function(id) {
    if(!confirm(`¿Estás seguro de eliminar este registro? Esto podría afectar turnos pasados si están en uso.`)) return;
    
    const { error } = await supabaseClient.from(configBotones[tabActivo].tabla).delete().eq('id', id);
    if (error) {
        alert("Error al eliminar (Probablemente está siendo usado en un turno): " + error.message);
    } else {
        cargarDatosTabla();
    }
};

// ==========================================
// FUNCIONES VISUALES
// ==========================================
function mostrarModal() {
    const modal = document.getElementById('modalCrud');
    const content = document.getElementById('contentCrud');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
    }, 10);
}

window.cerrarModalCrud = function() {
    const modal = document.getElementById('modalCrud');
    const content = document.getElementById('contentCrud');
    modal.classList.add('opacity-0');
    content.classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
};