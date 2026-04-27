// =============================================
// COMPONENTE: BUSCADOR GLOBAL DE ESTUDIANTES (COLORES CORREGIDOS)
// =============================================

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function BuscadorGlobal({ onVerPerfil }) {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef(null);
  const contenedorRef = useRef(null);

  useEffect(() => {
    if (busqueda.length >= 2) {
      buscarEstudiantes();
    } else {
      setResultados([]);
      setMostrarResultados(false);
    }
  }, [busqueda]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target)) {
        setMostrarResultados(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function buscarEstudiantes() {
    setCargando(true);
    
    const { data } = await supabase
      .from('estudiantes')
      .select('*')
      .or(`nombre_completo.ilike.%${busqueda}%,documento.ilike.%${busqueda}%`)
      .limit(8)
      .order('nombre_completo');
    
    if (data) {
      setResultados(data);
      setMostrarResultados(true);
    }
    
    setCargando(false);
  }

  function handleSeleccionarEstudiante(estudiante) {
    setBusqueda('');
    setMostrarResultados(false);
    if (onVerPerfil) {
      onVerPerfil(estudiante);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setBusqueda('');
      setMostrarResultados(false);
    }
  }

  const getEstadoColor = (estado) => {
    switch(estado) {
      case 'Activo': return 'bg-green-100 text-green-700';
      case 'En Riesgo': return 'bg-yellow-100 text-yellow-700';
      case 'Desertor': return 'bg-red-100 text-red-700';
      case 'Graduado': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div ref={contenedorRef} className="relative">
      <div className="relative">
        {/* ICONO DE BÚSQUEDA */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar estudiante..."
          className="w-72 pl-10 pr-4 py-2 bg-white border border-gray-200 text-gray-800 placeholder-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition shadow-sm"
        />
        {cargando && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {/* Resultados */}
      {mostrarResultados && resultados.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-slide-down max-h-96 overflow-y-auto">
          <div className="p-2">
            <p className="text-xs text-gray-500 px-3 py-1 mb-1">
              {resultados.length} resultado(s) - Haz clic para ver perfil
            </p>
            {resultados.map(est => (
              <button
                key={est.id}
                onClick={() => handleSeleccionarEstudiante(est)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 transition border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{est.nombre_completo}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      <span className="text-xs text-gray-500">
                        📋 {est.documento || 'Sin doc'}
                      </span>
                      <span className="text-xs text-gray-500">
                        📍 {est.municipio}
                      </span>
                      <span className="text-xs text-gray-500">
                        🏫 {est.institucion_educativa}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                      <span className="text-xs text-gray-400">
                        📅 Cohorte: {est.cohorte || 'N/A'}
                      </span>
                      <span className="text-xs text-gray-400">
                        📚 {est.programa || 'N/A'}
                      </span>
                      <span className="text-xs text-gray-400">
                        🎓 {est.universidad || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${getEstadoColor(est.estado)}`}>
                    {est.estado || 'Activo'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sin resultados */}
      {mostrarResultados && busqueda.length >= 2 && resultados.length === 0 && !cargando && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 p-4 text-center animate-slide-down">
          <p className="text-gray-500 text-sm">No se encontraron estudiantes</p>
          <p className="text-gray-400 text-xs mt-1">Intenta con otro nombre o documento</p>
        </div>
      )}
    </div>
  );
}