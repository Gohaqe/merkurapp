const configBotones = {
    plataformas: {
        tabla: 'juegos', 
        titulo: 'Catálogo (Plataformas y Juegos)',
        columnas: [
            { id: 'juego', label: 'Nombre', tipo: 'text', placeholder: 'Ej: Selection Mix o 88 Fortunes' },
            { id: 'grupo', label: 'Categoría', tipo: 'select', opciones: ['Plataforma', 'Juego'] }
        ]
    },
    gabinetes: {
        tabla: 'gabinetes', 
        titulo: 'Gabinetes',
        columnas: [{ id: 'modelo', label: 'Modelo del Gabinete', tipo: 'text', placeholder: 'Ej: ZONIC DUO 32"' }]
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
    },
    // ---> AQUÍ EMPIEZA LO NUEVO <---
    usuarios: {
        tabla: 'usuarios', 
        titulo: 'Personal y Accesos',
        columnas: [
            { id: 'nombres', label: 'Nombres', tipo: 'text', placeholder: 'Ej: María Fernanda' },
            { id: 'apellidos', label: 'Apellidos', tipo: 'text', placeholder: 'Ej: Gómez Ríos' },
            { id: 'dni', label: 'DNI', tipo: 'number', placeholder: 'Ej: 71234567' },
            { id: 'cargo', label: 'Cargo', tipo: 'select', opciones: ['Anfitriona', 'Administrador'] },
            { id: 'usuario', label: 'Usuario (Login)', tipo: 'text', placeholder: 'Ej: mgomez' },
            { id: 'contrasena', label: 'Contraseña', tipo: 'text', placeholder: 'Escribe la contraseña...' }
        ]
    }
};

let tabActivo = 'plataformas';
let idEditando = null;

document.addEventListener('DOMContentLoaded', () => {
    cargarDatosTabla();
});

window.cambiarTab = function(nuevoTab) {
    // 1. Quitar el color a la pestaña que estaba activa antes
    const tabViejo = document.getElementById(`tab_${tabActivo}`);
    if (tabActivo === 'exportar') {
        tabViejo.classList.remove('text-emerald-600', 'border-emerald-600');
        tabViejo.classList.add('text-slate-400', 'border-transparent');
    } else {
        tabViejo.classList.remove('text-blue-600', 'border-blue-600');
        tabViejo.classList.add('text-slate-400', 'border-transparent');
    }

    // 2. Actualizar cuál es la nueva pestaña activa
    tabActivo = nuevoTab;
    const tabNuevo = document.getElementById(`tab_${tabActivo}`);

    // 3. Pintar la nueva pestaña y mostrar el panel correcto
    if (nuevoTab === 'exportar') {
        tabNuevo.classList.remove('text-slate-400', 'border-transparent');
        tabNuevo.classList.add('text-emerald-600', 'border-emerald-600');
        
        document.getElementById('panel_crud').classList.add('hidden');
        document.getElementById('panel_exportar').classList.remove('hidden');
        cargarUsuariosFiltro(); // Carga las anfitrionas en el selector
    } else {
        tabNuevo.classList.remove('text-slate-400', 'border-transparent');
        tabNuevo.classList.add('text-blue-600', 'border-blue-600');
        
        document.getElementById('panel_exportar').classList.add('hidden');
        document.getElementById('panel_crud').classList.remove('hidden');
        
        document.getElementById('tituloSeccion').textContent = `Gestionar ${configBotones[tabActivo].titulo}`;
        cargarDatosTabla(); // Carga la tabla de la base de datos
    }
};

async function cargarDatosTabla() {
    const lista = document.getElementById('listaDatos');
    lista.innerHTML = '<li class="p-4 text-center text-slate-400 text-sm">Cargando...</li>';
    
    const config = configBotones[tabActivo];
    const columnasSelect = config.columnas.map(c => c.id).join(', ');
    
    const { data, error } = await supabaseClient.from(config.tabla).select(`id, ${columnasSelect}`).order('created_at', { ascending: false });

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

        if (tabActivo === 'progresivos' && item.nombres_pozos) {
            textoSecundario = `<p class="text-[10px] text-slate-400 uppercase font-bold mt-1">Pozos: ${item.nombres_pozos.join(', ')}</p>`;
        }
        if (tabActivo === 'plataformas' && item.grupo) {
            const color = item.grupo === 'Plataforma' ? 'text-blue-600 bg-blue-50' : 'text-emerald-600 bg-emerald-50';
            textoSecundario = `<span class="${color} text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 inline-block">${item.grupo}</span>`;
        }

        if (tabActivo === 'usuarios') {
            textoPrincipal = `${item.nombres || ''} ${item.apellidos || ''}`; // Une nombre y apellido en el título
            textoSecundario = `<p class="text-[10px] text-slate-400 font-bold mt-1">User: ${item.usuario || '-'} | Cargo: <span class="text-blue-600">${item.cargo || '-'}</span></p>`;
        }


        const li = document.createElement('li');
        li.className = "p-4 flex justify-between items-center hover:bg-slate-50 transition-colors";
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
    if(item.nombres_pozos && Array.isArray(item.nombres_pozos)) item.nombres_pozos = item.nombres_pozos.join(', ');
    construirFormulario(item);
    mostrarModal();
};

function construirFormulario(datosPreexistentes) {
    const contenedor = document.getElementById('formularioCrud');
    contenedor.innerHTML = '';
    
    configBotones[tabActivo].columnas.forEach(col => {
        const valor = datosPreexistentes[col.id] || '';
        let inputHtml = '';
        
        // Magia para crear Selects si la columna lo pide
        if (col.tipo === 'select') {
            const opciones = col.opciones.map(opt => `<option value="${opt}" ${valor === opt ? 'selected' : ''}>${opt}</option>`).join('');
            inputHtml = `<select id="input_${col.id}" class="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 outline-none">
                            <option value="" disabled ${!valor ? 'selected' : ''}>Seleccione...</option>
                            ${opciones}
                         </select>`;
        } else {
            inputHtml = `<input type="${col.tipo}" id="input_${col.id}" value="${valor}" placeholder="${col.placeholder}" class="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 outline-none">`;
        }

        contenedor.innerHTML += `
            <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">${col.label}</label>
                ${inputHtml}
            </div>
        `;
    });
}

document.getElementById('btnGuardarCrud').addEventListener('click', async () => {
    const config = configBotones[tabActivo];
    const datosGuardar = {};
    let errorValidacion = false;

    config.columnas.forEach(col => {
        let valor = document.getElementById(`input_${col.id}`).value.trim();
        if (!valor) errorValidacion = true;
        if (col.id === 'nombres_pozos') valor = valor.split(',').map(s => s.trim().toUpperCase()).filter(s => s !== '');
        datosGuardar[col.id] = valor;
    });

    if (errorValidacion) { alert('Por favor, llena todos los campos.'); return; }
    document.getElementById('btnGuardarCrud').innerText = 'Guardando...';

    let errorSupabase;
    if (idEditando) {
        const { error } = await supabaseClient.from(config.tabla).update(datosGuardar).eq('id', idEditando);
        errorSupabase = error;
    } else {
        const { error } = await supabaseClient.from(config.tabla).insert([datosGuardar]);
        errorSupabase = error;
    }

    if (errorSupabase) alert("Error al guardar: " + errorSupabase.message);
    else { cerrarModalCrud(); cargarDatosTabla(); }
    
    document.getElementById('btnGuardarCrud').innerText = 'Guardar Datos';
});

window.eliminarRegistro = async function(id) {
    if(!confirm(`¿Estás seguro de eliminar este registro?`)) return;
    const { error } = await supabaseClient.from(configBotones[tabActivo].tabla).delete().eq('id', id);
    if (error) alert("Error al eliminar: " + error.message);
    else cargarDatosTabla();
};

function mostrarModal() {
    const modal = document.getElementById('modalCrud');
    const content = document.getElementById('contentCrud');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); content.classList.remove('scale-95'); }, 10);
}

window.cerrarModalCrud = function() {
    const modal = document.getElementById('modalCrud');
    const content = document.getElementById('contentCrud');
    modal.classList.add('opacity-0');
    content.classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
};



// 2. Llenar el selector de Anfitrionas
async function cargarUsuariosFiltro() {
    const selector = document.getElementById('filtroUsuario');
    if (selector.options.length > 1) return; // Si ya se cargó, no lo volvemos a cargar

    const { data } = await supabaseClient.from('usuarios').select('id, nombres, apellidos');
    if (data) {
        data.forEach(u => {
            selector.innerHTML += `<option value="${u.id}">${u.nombres} ${u.apellidos}</option>`;
        });
    }
    
    // Setear fechas por defecto (Mes actual)
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];
    
    document.getElementById('filtroFechaIni').value = primerDia;
    document.getElementById('filtroFechaFin').value = ultimoDia;
}

// 3. GENERAR EL EXCEL MÁGICO CON 4 HOJAS
document.getElementById('btnGenerarExcelGlobal').addEventListener('click', async () => {
    const btn = document.getElementById('btnGenerarExcelGlobal');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = 'Descargando y procesando...';
    btn.disabled = true;

    const fIni = document.getElementById('filtroFechaIni').value;
    const fFin = document.getElementById('filtroFechaFin').value;
    const usrId = document.getElementById('filtroUsuario').value;

    try {
        // 3.1 MEGA CONSULTA A SUPABASE
        let query = supabaseClient.from('reportes').select(`
            *,
            usuarios(nombres, apellidos),
            salas(nombre),
            reporte_asignaciones(
                *,
                juegos(juego), gabinetes(modelo), progresivos(nombre),
                ocupaciones(*), incidencias(*)
            )
        `).gte('fecha', fIni).lte('fecha', fFin).eq('estado', 'Completado');

        if (usrId !== 'TODOS') {
            query = query.eq('usuario_id', usrId);
        }

        const { data: reportes, error } = await query;
        if (error) throw error;
        if (!reportes || reportes.length === 0) {
            alert('No se encontraron reportes completados en ese rango de fechas.');
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
            return;
        }

        // 3.2 PREPARAR LAS 4 HOJAS DE EXCEL
        const dataResumen = [];
        const dataOcupacion = [];
        const dataProgresivos = [];
        const dataFallas = [];

        reportes.forEach(r => {
            const anfitriona = `${r.usuarios?.nombres || ''} ${r.usuarios?.apellidos || ''}`;
            const sala = r.salas?.nombre || 'S/N';
            
            // Llenar Hoja 1: Resumen
            dataResumen.push({
                "Fecha": r.fecha,
                "Sala": sala,
                "Anfitriona": anfitriona,
                "Hora Inicio": r.turno_ini ? r.turno_ini.substring(0, 5) : '',
                "Hora Fin": r.turno_fin ? r.turno_fin.substring(0, 5) : '',
                "Aforo (%)": r.aforo,
                "Top 1": r.top_juegos ? r.top_juegos.split(',')[0] : '',
                "Comentarios Producto": r.com_produc,
                "Comentarios Sala": r.com_sala,
                "Competencia": r.com_competencia
            });

            // Analizar Máquinas del Turno
            if (r.reporte_asignaciones) {
                r.reporte_asignaciones.forEach(a => {
                    const juego = a.juegos?.juego || '';
                    const gabinete = a.gabinetes?.modelo || '';
                    
                    // Llenar Hoja 2: Ocupación (Columnas Dinámicas por Horas)
                    let filaOcupacion = {
                        "Fecha": r.fecha,
                        "Sala": sala,
                        "Anfitriona": anfitriona,
                        "Plataforma": juego,
                        "Gabinete": gabinete,
                        "Cantidad": a.cantidad
                    };
                    // Agregamos cada hora como una columna independiente
                    if (a.ocupaciones) {
                        a.ocupaciones.forEach(oc => {
                            filaOcupacion[oc.bloque_horario] = oc.ocupacion; // Esto crea la columna "17:00 - 18:00" mágicamente
                        });
                    }
                    dataOcupacion.push(filaOcupacion);

                    // Llenar Hoja 3: Progresivos
                    if (a.progresivo_id) {
                        const nombreProg = a.progresivos?.nombre || '';
                        let iniciales = r.progresivos_iniciales ? (r.progresivos_iniciales.find(p => p.id == a.progresivo_id)?.valores || {}) : {};
                        let finales = r.progresivos_finales ? (r.progresivos_finales[a.progresivo_id] || {}) : {};
                        const keys = new Set([...Object.keys(iniciales), ...Object.keys(finales)]);
                        
                        keys.forEach(pozo => {
                            const vIni = iniciales[pozo] || 0;
                            const vFin = finales[pozo] || 0;
                            dataProgresivos.push({
                                "Fecha": r.fecha,
                                "Sala": sala,
                                "Anfitriona": anfitriona,
                                "Plataforma": juego,
                                "Progresivo": nombreProg,
                                "Pozo": pozo,
                                "Monto Apertura (S/)": vIni,
                                "Monto Cierre (S/)": vFin,
                                "Diferencia (S/)": vFin - vIni
                            });
                        });
                    }

                    // Llenar Hoja 4: Fallas
                    if (a.incidencias) {
                        a.incidencias.forEach(inc => {
                            dataFallas.push({
                                "Fecha": r.fecha,
                                "Sala": sala,
                                "Anfitriona": anfitriona,
                                "Plataforma": juego,
                                "Gabinete": gabinete,
                                "N° Serie": inc.serie,
                                "Detalle del Error": inc.error
                            });
                        });
                    }
                });
            }
        });

        // 3.3 CONSTRUIR EL ARCHIVO EXCEL (.XLSX)
        const workbook = XLSX.utils.book_new();
        
        // Convertimos nuestros arreglos a hojas de Excel
        const wsResumen = XLSX.utils.json_to_sheet(dataResumen);
        const wsOcupacion = XLSX.utils.json_to_sheet(dataOcupacion);
        const wsProgresivos = XLSX.utils.json_to_sheet(dataProgresivos.length > 0 ? dataProgresivos : [{"Mensaje": "Sin datos"}]);
        const wsFallas = XLSX.utils.json_to_sheet(dataFallas.length > 0 ? dataFallas : [{"Mensaje": "Sin datos"}]);

        // Añadimos las hojas al libro
        XLSX.utils.book_append_sheet(workbook, wsResumen, "1. Resumen Turnos");
        XLSX.utils.book_append_sheet(workbook, wsOcupacion, "2. Ocupación x Hora");
        XLSX.utils.book_append_sheet(workbook, wsProgresivos, "3. Progresivos");
        XLSX.utils.book_append_sheet(workbook, wsFallas, "4. Fallas Técnicas");

        // 3.4 DESCARGAR EL ARCHIVO
        XLSX.writeFile(workbook, `Auditoria_Data_${fIni}_al_${fFin}.xlsx`);

    } catch (err) {
        alert('Hubo un error al procesar el Excel: ' + err.message);
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
});