// Seguridad
const userId = localStorage.getItem('usuario_id');
if (!userId || (localStorage.getItem('usuario_cargo') !== 'Admin' && localStorage.getItem('usuario_cargo') !== 'Administrador')) {
    alert('Acceso denegado. Solo administradores.');
    window.location.replace('dashboard.html');
}

// Variables Globales 
let metricas = { 
    salas: [], anfitrionas: [], juegos: [], gabinetes: [], progresivos: [], pozos: [],
    fechas: {}, horas: {}, turnos: { 'Turno Tarde': 0, 'Turno Noche': 0 }, 
    fallas: {}, chismes: [] 
};
// Estado de ordenamiento ('desc' = mayor a menor, 'asc' = menor a mayor)
let ordenActivo = { salas: 'desc', anfitrionas: 'desc', juegos: 'desc', gabinetes: 'desc', progresivos: 'desc', pozos: 'desc' };
let chartInstancias = { dias: null, horas: null, turnos: null, fallas: null };

document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date();
    const hace15 = new Date();
    hace15.setDate(hoy.getDate() - 15);
    
    document.getElementById('filtroInicio').value = hace15.toISOString().split('T')[0];
    document.getElementById('filtroFin').value = hoy.toISOString().split('T')[0];
    
    procesarEstadisticas();
});

document.getElementById('btnProcesar').addEventListener('click', procesarEstadisticas);

async function procesarEstadisticas() {
    document.getElementById('loaderData').classList.remove('hidden');
    document.getElementById('dashboardStats').classList.add('hidden');

    const fIni = document.getElementById('filtroInicio').value;
    const fFin = document.getElementById('filtroFin').value;

    try {
        // MEGA CONSULTA: Traemos usuarios para saber las anfitrionas
        const { data: reportes, error } = await supabaseClient.from('reportes').select(`
            fecha, aforo, turno_ini, com_competencia,
            salas(nombre), usuarios(nombres, apellidos), progresivos_iniciales, progresivos_finales,
            reporte_asignaciones(
                juegos(juego), gabinetes(modelo), progresivos(nombre),
                ocupaciones(bloque_horario, ocupacion), incidencias(error)
            )
        `).gte('fecha', fIni).lte('fecha', fFin).eq('estado', 'Completado').limit(15000);

        if (error) throw error;

        calcularMetricas(reportes);
        dibujarGraficos();
        renderizarListas();

        document.getElementById('loaderData').classList.add('hidden');
        document.getElementById('dashboardStats').classList.remove('hidden');

    } catch (err) {
        alert('Error analizando datos: ' + err.message);
        document.getElementById('loaderData').classList.add('hidden');
    }
}

function calcularMetricas(reportes) {
    let tmpSalas = {}; let tmpAnfitrionas = {}; let tmpJuegos = {}; 
    let tmpGabinetes = {}; let tmpProg = {}; let tmpPozos = {};
    metricas.fechas = {}; metricas.horas = {}; metricas.turnos = { 'Turno Tarde': 0, 'Turno Noche': 0 }; metricas.fallas = {}; metricas.chismes = [];

    reportes.forEach(r => {
        const sala = r.salas?.nombre || 'Desconocida';
        const anfitriona = r.usuarios ? `${r.usuarios.nombres.split(' ')[0]} ${r.usuarios.apellidos.split(' ')[0]}` : 'Desconocida'; // Nombre corto
        let sumaOcupacionTurno = 0; // Para medir cuánto trabajó la anfitriona
        
        // 1. Aforo y Turnos
        if (!tmpSalas[sala]) tmpSalas[sala] = { suma: 0, count: 0 };
        if (r.aforo) { 
            tmpSalas[sala].suma += r.aforo; 
            tmpSalas[sala].count++; 
            
            if (r.turno_ini && parseInt(r.turno_ini.substring(0,2)) < 18) {
                metricas.turnos['Turno Tarde'] += r.aforo;
            } else {
                metricas.turnos['Turno Noche'] += r.aforo;
            }
        }

        // 2. Chismes de la Competencia
        if (r.com_competencia && r.com_competencia.trim() !== '' && !r.com_competencia.toLowerCase().includes('sin novedad')) {
            metricas.chismes.push({ fecha: r.fecha, sala: sala, texto: r.com_competencia });
        }

        if (!metricas.fechas[r.fecha]) metricas.fechas[r.fecha] = 0;

        // 3. Progresivos y Pozos Individuales
        if (r.progresivos_iniciales && r.progresivos_finales) {
            r.progresivos_iniciales.forEach(pIni => {
                const pFin = r.progresivos_finales[pIni.id];
                if (pFin) {
                    let totalCrecimientoGlobal = 0;
                    let nombreProg = 'Prog ' + pIni.id;
                    
                    if(r.reporte_asignaciones) {
                        const asigP = r.reporte_asignaciones.find(a => a.progresivos && a.progresivos.nombre && r.progresivos_finales[pIni.id]);
                        if (asigP) nombreProg = asigP.progresivos.nombre;
                    }

                    Object.keys(pIni.valores).forEach(pozo => {
                        if (pFin[pozo]) {
                            let subida = pFin[pozo] - pIni.valores[pozo];
                            totalCrecimientoGlobal += subida;
                            
                            // POZO ESPECÍFICO (+ Sala)
                            let nombrePozoExacto = `${pozo} (${nombreProg}) - ${sala}`;
                            if(!tmpPozos[nombrePozoExacto]) tmpPozos[nombrePozoExacto] = 0;
                            tmpPozos[nombrePozoExacto] += subida;
                        }
                    });
                    
                    if (!tmpProg[nombreProg]) tmpProg[nombreProg] = 0;
                    tmpProg[nombreProg] += totalCrecimientoGlobal;
                }
            });
        }

        // 4. Máquinas, Ocupaciones y Fallas Técnicas
        if (r.reporte_asignaciones) {
            r.reporte_asignaciones.forEach(a => {
                const juego = a.juegos?.juego || 'S/N';
                const gabinete = a.gabinetes?.modelo || 'S/N';
                let sumaOcupacionMaquina = 0;

                if (a.ocupaciones) {
                    a.ocupaciones.forEach(oc => {
                        sumaOcupacionMaquina += oc.ocupacion;
                        let horaLimpia = oc.bloque_horario.split(' - ')[0];
                        if (!metricas.horas[horaLimpia]) metricas.horas[horaLimpia] = 0;
                        metricas.horas[horaLimpia] += oc.ocupacion;
                    });
                }

                if (a.incidencias) {
                    a.incidencias.forEach(inc => {
                        let err = inc.error || 'Desconocido';
                        if (!metricas.fallas[err]) metricas.fallas[err] = 0;
                        metricas.fallas[err]++;
                    });
                }

                sumaOcupacionTurno += sumaOcupacionMaquina;
                metricas.fechas[r.fecha] += sumaOcupacionMaquina;
                
                if (!tmpJuegos[juego]) tmpJuegos[juego] = 0; 
                tmpJuegos[juego] += sumaOcupacionMaquina;
                
                if (!tmpGabinetes[gabinete]) tmpGabinetes[gabinete] = 0; 
                tmpGabinetes[gabinete] += sumaOcupacionMaquina;
            });
        }

        // Registrar cuánto trabajó la anfitriona (Total de jugadores atendidos en sus máquinas)
        if (!tmpAnfitrionas[anfitriona]) tmpAnfitrionas[anfitriona] = 0;
        tmpAnfitrionas[anfitriona] += sumaOcupacionTurno;
    });

    metricas.salas = Object.keys(tmpSalas).map(k => ({ nombre: k, valor: tmpSalas[k].count > 0 ? Math.round(tmpSalas[k].suma / tmpSalas[k].count) : 0, sufijo: '%' }));
    metricas.anfitrionas = Object.keys(tmpAnfitrionas).map(k => ({ nombre: k, valor: tmpAnfitrionas[k], sufijo: ' jug.' }));
    metricas.juegos = Object.keys(tmpJuegos).map(k => ({ nombre: k, valor: tmpJuegos[k], sufijo: ' jug.' }));
    metricas.gabinetes = Object.keys(tmpGabinetes).map(k => ({ nombre: k, valor: tmpGabinetes[k], sufijo: ' jug.' }));
    metricas.progresivos = Object.keys(tmpProg).map(k => ({ nombre: k, valor: tmpProg[k], prefijo: 'S/ ' }));
    metricas.pozos = Object.keys(tmpPozos).map(k => ({ nombre: k, valor: tmpPozos[k], prefijo: 'S/ ' }));
}

function renderizarListas() {
    ['salas', 'anfitrionas', 'juegos', 'gabinetes', 'progresivos', 'pozos'].forEach(categoria => {
        metricas[categoria].sort((a, b) => ordenActivo[categoria] === 'desc' ? b.valor - a.valor : a.valor - b.valor);
        const contenedor = document.getElementById(`rank${categoria.charAt(0).toUpperCase() + categoria.slice(1)}`);
        contenedor.innerHTML = '';

        if (metricas[categoria].length === 0) {
            contenedor.innerHTML = '<p class="text-xs text-slate-400 italic">No hay datos</p>';
            return;
        }

        metricas[categoria].slice(0, 10).forEach((item, index) => {
            let color = ordenActivo[categoria] === 'desc' ? (index === 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-50 text-slate-600') : (index === 0 ? 'bg-red-100 text-red-800' : 'bg-slate-50 text-slate-600');
            contenedor.innerHTML += `
                <div class="flex justify-between items-center p-2 rounded-lg border border-slate-100 ${color}">
                    <span class="text-[11px] font-bold truncate pr-2" title="${item.nombre}"><span class="opacity-50 mr-1">${index + 1}.</span> ${item.nombre}</span>
                    <span class="text-[11px] font-black whitespace-nowrap">${item.prefijo || ''}${item.valor.toLocaleString()}${item.sufijo || ''}</span>
                </div>
            `;
        });
    });

    const radar = document.getElementById('radarCompetencia');
    radar.innerHTML = '';
    if (metricas.chismes.length === 0) {
        radar.innerHTML = '<p class="text-xs text-orange-400 italic">Sin alertas recientes.</p>';
    } else {
        metricas.chismes.slice().reverse().slice(0, 15).forEach(ch => {
            const fechaF = new Date(ch.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            radar.innerHTML += `
                <div class="bg-orange-50 p-2 rounded-lg border border-orange-100">
                    <p class="text-[9px] font-bold text-orange-400 uppercase tracking-wider">${fechaF} • ${ch.sala}</p>
                    <p class="text-[11px] text-slate-700 font-medium leading-tight mt-0.5">${ch.texto}</p>
                </div>
            `;
        });
    }
}

window.invertirLista = function(categoria) {
    ordenActivo[categoria] = ordenActivo[categoria] === 'desc' ? 'asc' : 'desc';
    renderizarListas();
};

function dibujarGraficos() {
    ['dias', 'horas', 'turnos', 'fallas'].forEach(c => { if (chartInstancias[c]) chartInstancias[c].destroy(); });

    const lblFechas = Object.keys(metricas.fechas).sort(); 
    chartInstancias.dias = new Chart(document.getElementById('chartDias').getContext('2d'), {
        type: 'line',
        data: { labels: lblFechas, datasets: [{ label: 'Jugadores', data: lblFechas.map(f => metricas.fechas[f]), borderColor: '#9333ea', backgroundColor: '#e9d5ff', fill: true, tension: 0.4 }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    const lblHoras = Object.keys(metricas.horas).sort();
    chartInstancias.horas = new Chart(document.getElementById('chartHoras').getContext('2d'), {
        type: 'bar',
        data: { labels: lblHoras, datasets: [{ label: 'Ocupación', data: lblHoras.map(h => metricas.horas[h]), backgroundColor: '#3b82f6', borderRadius: 4 }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    chartInstancias.turnos = new Chart(document.getElementById('chartTurnos').getContext('2d'), {
        type: 'pie',
        data: { labels: ['Turno Tarde', 'Turno Noche'], datasets: [{ data: [metricas.turnos['Turno Tarde'], metricas.turnos['Turno Noche']], backgroundColor: ['#f59e0b', '#1e1b4b'] }] },
        options: { plugins: { legend: { position: 'bottom' } } }
    });

    const fallasSorted = Object.entries(metricas.fallas).sort((a,b)=>b[1]-a[1]).slice(0,5);
    chartInstancias.fallas = new Chart(document.getElementById('chartFallas').getContext('2d'), {
        type: 'doughnut',
        data: { labels: fallasSorted.map(f => f[0]), datasets: [{ data: fallasSorted.map(f => f[1]), backgroundColor: ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4'] }] },
        options: { plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: {size: 9} } } } }
    });
}