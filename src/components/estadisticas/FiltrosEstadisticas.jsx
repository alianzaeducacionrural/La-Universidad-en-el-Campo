// =============================================
// COMPONENTE: FILTROS ESTADÍSTICAS (DISEÑO PROFESIONAL)
// =============================================

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function FiltrosEstadisticas({ onAplicarFiltros, onLimpiarFiltros }) {
  const [filtrosActivos, setFiltrosActivos] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState('municipios');
  const [opciones, setOpciones] = useState([]);
  const [opcionesFiltradas, setOpcionesFiltradas] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const modalRef = useRef(null);

  const tiposFiltro = [
    { id: 'municipios', label: 'Municipio', icon: '📍', color: 'blue' },
    { id: 'cohortes', label: 'Cohorte', icon: '📅', color: 'green' },
    { id: 'universidades', label: 'Universidad', icon: '🎓', color: 'purple' },
    { id: 'estados', label: 'Estado', icon: '📊', color: 'amber' }
  ];

  useEffect(() => {
    if (modalAbierto) {
      cargarOpciones();
    }
  }, [modalAbierto, tipoSeleccionado, filtrosActivos]);

  useEffect(() => {
    if (opciones.length > 0) {
      filtrarOpciones();
    }
  }, [busqueda, opciones]);

  // ==========================================
  // FUNCIÓN PARA TRAER TODOS LOS REGISTROS DE ESTUDIANTES CON PAGINACIÓN
  // ==========================================
  async function fetchAllEstudiantesConFiltros(campo, otrosFiltros) {
    let allData = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('estudiantes')
        .select(campo);

      // Aplicar otros filtros existentes
      if (otrosFiltros.municipios && otrosFiltros.municipios.length > 0) {
        query = query.in('municipio', otrosFiltros.municipios);
      }
      if (otrosFiltros.cohortes && otrosFiltros.cohortes.length > 0) {
        query = query.in('cohorte', otrosFiltros.cohortes);
      }
      if (otrosFiltros.universidades && otrosFiltros.universidades.length > 0) {
        query = query.in('universidad', otrosFiltros.universidades);
      }
      if (otrosFiltros.estados && otrosFiltros.estados.length > 0) {
        query = query.in('estado', otrosFiltros.estados);
      }

      const { data, error } = await query.range(from, from + limit - 1);

      if (error) {
        console.error('Error en fetchAllEstudiantes:', error);
        break;
      }
      
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += limit;
      }
      
      if (!data || data.length < limit) {
        hasMore = false;
      }
    }
    
    return allData;
  }

  async function cargarOpciones() {
    setCargando(true);
    
    try {
      // Obtener los filtros actuales (excluyendo el tipo que estamos seleccionando)
      const filtrosActuales = agruparFiltros(filtrosActivos);
      const tipoActual = tipoSeleccionado;
      
      // Construir otros filtros (excluyendo el tipo actual)
      const otrosFiltros = {};
      Object.keys(filtrosActuales).forEach(key => {
        if (key !== tipoActual) {
          otrosFiltros[key] = filtrosActuales[key];
        }
      });

      let opcionesConConteo = [];

      switch (tipoActual) {
        case 'municipios': {
          // Traer TODOS los estudiantes con paginación
          const datos = await fetchAllEstudiantesConFiltros('municipio', otrosFiltros);
          
          // Contar frecuencia por municipio
          const conteo = {};
          datos.forEach(item => {
            const valor = item.municipio;
            if (valor && valor.trim() !== '') {
              conteo[valor] = (conteo[valor] || 0) + 1;
            }
          });
          
          opcionesConConteo = Object.entries(conteo)
            .map(([valor, count]) => ({ valor, count }))
            .sort((a, b) => b.count - a.count);
          break;
        }
        
        case 'cohortes': {
          // Traer TODOS los estudiantes con paginación
          const datos = await fetchAllEstudiantesConFiltros('cohorte', otrosFiltros);
          
          // Contar frecuencia por cohorte
          const conteo = {};
          datos.forEach(item => {
            const valor = item.cohorte;
            if (valor && valor.trim() !== '') {
              conteo[valor] = (conteo[valor] || 0) + 1;
            }
          });
          
          opcionesConConteo = Object.entries(conteo)
            .map(([valor, count]) => ({ valor, count }))
            .sort((a, b) => b.count - a.count);
          break;
        }
        
        case 'universidades': {
          // Para universidades, obtener de la tabla universidades y contar estudiantes
          const { data: universidades, error } = await supabase
            .from('universidades')
            .select('nombre')
            .order('nombre');
          
          if (error) throw error;
          
          // Para cada universidad, contar estudiantes con otros filtros aplicados
          for (const uni of universidades) {
            let query = supabase
              .from('estudiantes')
              .select('id', { count: 'exact', head: true })
              .eq('universidad', uni.nombre);
            
            // Aplicar otros filtros
            if (otrosFiltros.municipios && otrosFiltros.municipios.length > 0) {
              query = query.in('municipio', otrosFiltros.municipios);
            }
            if (otrosFiltros.cohortes && otrosFiltros.cohortes.length > 0) {
              query = query.in('cohorte', otrosFiltros.cohortes);
            }
            if (otrosFiltros.estados && otrosFiltros.estados.length > 0) {
              query = query.in('estado', otrosFiltros.estados);
            }
            
            const { count, error: countError } = await query;
            if (!countError && count > 0) {
              opcionesConConteo.push({ valor: uni.nombre, count });
            }
          }
          opcionesConConteo.sort((a, b) => b.count - a.count);
          break;
        }
        
        case 'estados': {
          // Traer TODOS los estudiantes con paginación
          const datos = await fetchAllEstudiantesConFiltros('estado', otrosFiltros);
          
          // Estados predefinidos
          const estadosBase = ['Activo', 'Desertor', 'Graduado', 'En Riesgo'];
          const conteo = {};
          
          // Inicializar conteo en 0
          estadosBase.forEach(e => conteo[e] = 0);
          
          // Contar frecuencias
          datos.forEach(item => {
            const valor = item.estado;
            if (valor && conteo[valor] !== undefined) {
              conteo[valor]++;
            }
          });
          
          opcionesConConteo = estadosBase
            .map(estado => ({ valor: estado, count: conteo[estado] || 0 }))
            .filter(op => op.count > 0)
            .sort((a, b) => b.count - a.count);
          break;
        }
      }
      
      setOpciones(opcionesConConteo);
      setOpcionesFiltradas(opcionesConConteo);
      
    } catch (error) {
      console.error('Error al cargar opciones:', error);
    }
    
    setCargando(false);
  }

  function filtrarOpciones() {
    if (!busqueda.trim()) {
      setOpcionesFiltradas(opciones);
    } else {
      const filtradas = opciones.filter(o => 
        o.valor.toLowerCase().includes(busqueda.toLowerCase())
      );
      setOpcionesFiltradas(filtradas);
    }
  }

  function toggleSeleccion(valor) {
    setSeleccionados(prev => 
      prev.includes(valor) 
        ? prev.filter(v => v !== valor)
        : [...prev, valor]
    );
  }

  function agregarFiltros() {
    if (seleccionados.length === 0) return;
    
    const nuevosFiltros = seleccionados.map(valor => ({
      tipo: tipoSeleccionado,
      valor,
      label: tiposFiltro.find(t => t.id === tipoSeleccionado)?.label || tipoSeleccionado,
      icon: tiposFiltro.find(t => t.id === tipoSeleccionado)?.icon || '🔹'
    }));
    
    const filtrosSinDuplicados = [...filtrosActivos, ...nuevosFiltros].filter(
      (f, i, self) => self.findIndex(s => s.tipo === f.tipo && s.valor === f.valor) === i
    );
    
    setFiltrosActivos(filtrosSinDuplicados);
    setModalAbierto(false);
    setSeleccionados([]);
    setBusqueda('');
    
    // Notificar cambio
    const filtrosAgrupados = agruparFiltros(filtrosSinDuplicados);
    onAplicarFiltros(filtrosAgrupados);
  }

  function removerFiltro(tipo, valor) {
    const nuevosFiltros = filtrosActivos.filter(f => !(f.tipo === tipo && f.valor === valor));
    setFiltrosActivos(nuevosFiltros);
    const filtrosAgrupados = agruparFiltros(nuevosFiltros);
    onAplicarFiltros(filtrosAgrupados);
  }

  function limpiarTodos() {
    setFiltrosActivos([]);
    onLimpiarFiltros();
  }

  function agruparFiltros(filtros) {
    return {
      municipios: filtros.filter(f => f.tipo === 'municipios').map(f => f.valor),
      cohortes: filtros.filter(f => f.tipo === 'cohortes').map(f => f.valor),
      universidades: filtros.filter(f => f.tipo === 'universidades').map(f => f.valor),
      estados: filtros.filter(f => f.tipo === 'estados').map(f => f.valor)
    };
  }

  const getColorClasses = (tipo) => {
    const tipoInfo = tiposFiltro.find(t => t.id === tipo);
    switch (tipoInfo?.color) {
      case 'blue': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'green': return 'bg-green-100 text-green-700 border-green-200';
      case 'purple': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'amber': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
      {/* Filtros Activos (Chips) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm font-medium text-gray-700 mr-2">🔍 Filtros activos:</span>
        {filtrosActivos.length === 0 ? (
          <span className="text-sm text-gray-400 italic">No hay filtros aplicados</span>
        ) : (
          filtrosActivos.map((f, idx) => (
            <span
              key={`${f.tipo}-${f.valor}-${idx}`}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm border ${getColorClasses(f.tipo)}`}
            >
              <span className="mr-1">{f.icon}</span>
              <span>{f.valor}</span>
              <button
                onClick={() => removerFiltro(f.tipo, f.valor)}
                className="ml-2 hover:text-red-500 transition"
              >
                ✕
              </button>
            </span>
          ))
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setModalAbierto(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center space-x-2"
        >
          <span>➕</span>
          <span>Agregar filtro</span>
        </button>
        {filtrosActivos.length > 0 && (
          <button
            onClick={limpiarTodos}
            className="text-gray-500 hover:text-gray-700 text-sm transition"
          >
            🔄 Limpiar todos
          </button>
        )}
      </div>

      {/* Modal para agregar filtros */}
      {modalAbierto && (
        <div 
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={() => setModalAbierto(false)}
        >
          <div 
            ref={modalRef}
            className="bg-white rounded-xl max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera - Tipos de filtro */}
            <div className="p-4 border-b border-gray-200">
              <h4 className="font-medium text-gray-800 mb-3">Seleccionar tipo de filtro:</h4>
              <div className="flex flex-wrap gap-2">
                {tiposFiltro.map(tipo => (
                  <button
                    key={tipo.id}
                    onClick={() => {
                      setTipoSeleccionado(tipo.id);
                      setSeleccionados([]);
                      setBusqueda('');
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center space-x-2 ${
                      tipoSeleccionado === tipo.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{tipo.icon}</span>
                    <span>{tipo.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Buscador */}
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                placeholder={`🔍 Buscar ${tiposFiltro.find(t => t.id === tipoSeleccionado)?.label.toLowerCase()}...`}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Lista de opciones */}
            <div className="p-4 max-h-80 overflow-y-auto">
              {cargando ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="text-gray-500 mt-2">Cargando...</p>
                </div>
              ) : opcionesFiltradas.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No se encontraron opciones</p>
              ) : (
                <div className="space-y-1">
                  {opcionesFiltradas.map((opcion, idx) => (
                    <label
                      key={idx}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={seleccionados.includes(opcion.valor)}
                          onChange={() => toggleSeleccion(opcion.valor)}
                          className="rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-gray-800">{opcion.valor}</span>
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {opcion.count}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Pie - Acciones */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between rounded-b-xl">
              <span className="text-sm text-gray-600">
                {seleccionados.length} seleccionado(s)
              </span>
              <div className="flex space-x-3">
                <button
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={agregarFiltros}
                  disabled={seleccionados.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}