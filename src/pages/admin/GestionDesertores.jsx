// =============================================
// PÁGINA: DESERTORES (LISTADO GENERAL)
// =============================================

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import FiltrosReportes, { FILTROS_VACIOS, aplicarFiltrosGenerico } from '../../components/reportes/FiltrosReportes';
import { formatearFecha, getMunicipiosPermitidos, calcularPasosDesercion } from '../../utils/helpers';
import PasosDesercion from '../../components/estudiantes/PasosDesercion';
import * as XLSX from 'xlsx';

export default function GestionDesertores({ onVerPerfil }) {
  const { perfil: usuario } = useAuth();
  const [vistaActiva, setVistaActiva] = useState('desertores');
  const [desertores, setDesertores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);

  const municipiosPermitidos = getMunicipiosPermitidos(usuario);

  useEffect(() => {
    cargarDesertores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarDesertores() {
    setCargando(true);

    const { data } = await supabase
      .from('estudiantes')
      .select(`
        *,
        grupos:grupo_id ( nombre ),
        registros_desercion ( id, fecha_reporte, created_at, tipo_desercion, motivo_principal, motivo_otro, observaciones, paso_manual_completado, documentos:documentos_desercion ( tipo_documento ), usuario:usuario_id ( nombre_completo ) )
      `)
      .eq('estado', 'Desertor')
      .order('nombre_completo');

    if (!data) { setDesertores([]); setCargando(false); return; }

    const ids = data.map(e => e.id);
    let idsConMultaPendiente = new Set();
    let idsConMultaPagada = new Set();
    if (ids.length > 0) {
      const { data: multas } = await supabase
        .from('multas_desercion')
        .select('estudiante_id, estado')
        .in('estudiante_id', ids);
      (multas || []).forEach(m => {
        if (m.estado === 'pendiente' || m.estado === 'abonando') idsConMultaPendiente.add(m.estudiante_id);
        if (m.estado === 'pagado') idsConMultaPagada.add(m.estudiante_id);
      });
    }

    const conRegistro = data.map(e => {
      // Si dos registros comparten la misma fecha_reporte (p. ej. una
      // reclasificación el mismo día creando una fila nueva en vez de editar
      // la anterior), created_at desempata: gana el que se guardó al final.
      const registros = [...(e.registros_desercion || [])].sort((a, b) => {
        const porFecha = (b.fecha_reporte || '').localeCompare(a.fecha_reporte || '');
        if (porFecha !== 0) return porFecha;
        return (b.created_at || '').localeCompare(a.created_at || '');
      });
      const registroActual = registros[0] || null;
      return {
        ...e,
        grupo_nombre: e.grupos?.nombre || 'Sin grupo',
        registro: registroActual,
        tieneMultaPendiente: idsConMultaPendiente.has(e.id),
        tieneMultaPagada: idsConMultaPagada.has(e.id),
        casoCerrado: !!registroActual?.documentos?.some(doc => doc.tipo_documento === 'cierre_caso')
      };
    });

    setDesertores(conRegistro);
    setCargando(false);
  }

  // Getters para el filtrado genérico compartido con Reportes.jsx
  const getters = {
    municipio: d => d.municipio,
    universidad: d => d.universidad,
    programa: d => d.programa,
    cohorte: d => d.cohorte,
    grupoId: d => d.grupo_id,
    fecha: d => d.registro?.fecha_reporte
  };

  const desertoresFiltrados = useMemo(() => {
    let resultado = aplicarFiltrosGenerico(desertores, getters, filtros, municipiosPermitidos);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      resultado = resultado.filter(e =>
        e.nombre_completo?.toLowerCase().includes(q) || e.documento?.toLowerCase().includes(q)
      );
    }
    return resultado;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desertores, filtros, busqueda, municipiosPermitidos]);

  // Opciones de filtro derivadas del propio conjunto de desertores (un grupo
  // ya desactivado sigue siendo una opción válida para filtrar su historial).
  const opcionesFiltro = useMemo(() => {
    function opcionesUnicas(campo) {
      const set = new Set(desertores.map(d => d[campo]).filter(Boolean));
      return Array.from(set).sort().map(v => ({ valor: v, label: v }));
    }
    const gruposUnicos = new Map();
    desertores.forEach(d => {
      if (d.grupo_id && !gruposUnicos.has(d.grupo_id)) {
        gruposUnicos.set(d.grupo_id, `${d.grupo_nombre} — ${d.universidad || 'N/A'}`);
      }
    });
    return {
      municipios: opcionesUnicas('municipio').filter(o => !municipiosPermitidos || municipiosPermitidos.includes(o.valor)),
      universidades: opcionesUnicas('universidad'),
      programas: opcionesUnicas('programa'),
      cohortes: opcionesUnicas('cohorte'),
      grupos: Array.from(gruposUnicos.entries()).map(([id, label]) => ({ valor: id, label })),
      estados: []
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desertores, municipiosPermitidos]);

  const kpis = useMemo(() => {
    const total = desertoresFiltrados.length;
    const justificadas = desertoresFiltrados.filter(d => d.registro?.tipo_desercion === 'Justificada').length;
    const sinJustificar = desertoresFiltrados.filter(d => d.registro?.tipo_desercion === 'Sin Justificar').length;
    const pendienteInfo = desertoresFiltrados.filter(d => d.registro && !d.registro.tipo_desercion).length;
    const conMulta = desertoresFiltrados.filter(d => d.tieneMultaPendiente).length;
    return { total, justificadas, sinJustificar, pendienteInfo, conMulta };
  }, [desertoresFiltrados]);

  function descargarExcel() {
    const datos = desertoresFiltrados.map(d => ({
      'Nombre Completo': d.nombre_completo,
      'Documento': d.documento || '',
      'Municipio': d.municipio || '',
      'Institución Educativa': d.institucion_educativa || '',
      'Universidad': d.universidad || '',
      'Programa': d.programa || '',
      'Cohorte': d.cohorte || '',
      'Grupo': d.grupo_nombre || '',
      'Tipo Deserción': d.registro?.tipo_desercion || 'Sin registro',
      'Motivo Principal': d.registro?.motivo_principal || '',
      'Motivo Especificado': d.registro?.motivo_otro || '',
      'Fecha Reporte': d.registro ? formatearFecha(d.registro.fecha_reporte) : '',
      'Reportado por': d.registro?.usuario?.nombre_completo || '',
      'Multa Pendiente': d.tieneMultaPendiente ? 'Sí' : 'No'
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Desertores');
    XLSX.writeFile(wb, 'Reporte_Desertores.xlsx');
  }

  if (!usuario) return <LoadingSpinner mensaje="Cargando..." />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar vistaActiva={vistaActiva} setVistaActiva={setVistaActiva} rol={usuario.rol} />

      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        <Header onVerPerfil={onVerPerfil} />

        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">🚨 Desertores</h1>
              <p className="text-gray-600">Estudiantes que abandonaron el programa, con acceso directo a su perfil</p>
            </div>
            <button
              onClick={descargarExcel}
              disabled={desertoresFiltrados.length === 0}
              className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 whitespace-nowrap"
            >
              📥 Descargar Excel
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
              <p className="text-2xl font-bold text-gray-800">{kpis.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
              <p className="text-2xl font-bold text-red-700">{kpis.sinJustificar}</p>
              <p className="text-xs text-red-600">Sin Justificar</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
              <p className="text-2xl font-bold text-blue-700">{kpis.justificadas}</p>
              <p className="text-xs text-blue-600">Justificadas</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200">
              <p className="text-2xl font-bold text-amber-700">{kpis.pendienteInfo}</p>
              <p className="text-xs text-amber-600">Pendiente de Información</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-200">
              <p className="text-2xl font-bold text-purple-700">{kpis.conMulta}</p>
              <p className="text-xs text-purple-600">Con Multa Pendiente</p>
            </div>
          </div>

          <FiltrosReportes
            filtros={filtros}
            onCambio={setFiltros}
            opciones={opcionesFiltro}
            filas={desertores}
            getters={getters}
            municipiosPermitidos={municipiosPermitidos}
            mostrarEstado={false}
          />

          <div className="mb-4">
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="🔍 Buscar por nombre o documento..."
              className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
            />
          </div>

          {cargando ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-gray-500 mt-4">Cargando desertores...</p>
            </div>
          ) : desertoresFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500">
                {desertores.length === 0 ? 'No hay estudiantes desertores registrados.' : 'Ningún desertor coincide con los filtros actuales.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Estudiante</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Municipio</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Universidad / Grupo</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Tipo</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Progreso</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {desertoresFiltrados.map(d => (
                      <tr
                        key={d.id}
                        onClick={() => onVerPerfil?.(d)}
                        className="hover:bg-gray-50 cursor-pointer transition"
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-800">{d.nombre_completo}</p>
                          <p className="text-xs text-gray-400">{d.documento}</p>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{d.municipio}</td>
                        <td className="px-4 py-2.5 text-gray-600">
                          <p>{d.universidad}</p>
                          <p className="text-xs text-gray-400">{d.grupo_nombre}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          {!d.registro ? (
                            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-700">
                              Sin registro
                            </span>
                          ) : !d.registro.tipo_desercion ? (
                            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-700">
                              ⏳ Pendiente de información
                            </span>
                          ) : d.registro.tipo_desercion === 'Justificada' ? (
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                              d.casoCerrado ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {d.casoCerrado ? 'Justificada · Caso cerrado' : 'Justificada'}
                            </span>
                          ) : (
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                              d.tieneMultaPagada ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {d.tieneMultaPagada ? 'Sin Justificar · Multa pagada' : d.registro.tipo_desercion}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <PasosDesercion pasos={calcularPasosDesercion(d.registro)} compacto />
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{d.registro?.motivo_principal || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-400">{desertoresFiltrados.length} desertor(es) con los filtros actuales</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
