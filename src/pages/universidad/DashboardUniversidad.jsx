// =============================================
// DASHBOARD PARA UNIVERSIDADES (CON HISTORIAL COMPLETO)
// =============================================

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNotificacion } from '../../context/NotificacionContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/common/Header';
import BotonWhatsApp from '../../components/common/BotonWhatsApp';
import ModalIngresarNotas from '../../components/notas/ModalIngresarNotas';
import SelectConOtro from '../../components/common/SelectConOtro';
import { formatearFecha, interpretarError, derivarModulosYDocentes, cruzarCronogramaConAsistencia } from '../../utils/helpers';
import { exportarNotasGrupoExcel, exportarEstudiantesExcel } from '../../utils/exportUtils';
import TarjetaKPI from '../../components/estadisticas/TarjetaKPI';
import GraficoEstadosDoughnut from '../../components/estadisticas/GraficoEstadosDoughnut';
import GraficoGeneroDoughnut from '../../components/estadisticas/GraficoGeneroDoughnut';
import GraficoBarrasHorizontal from '../../components/estadisticas/GraficoBarrasHorizontal';
import ComparativoCohortes from '../../components/estadisticas/ComparativoCohortes';
import RankingDeserciones from '../../components/estadisticas/RankingDeserciones';
import GraficoCausasInasistencia from '../../components/estadisticas/GraficoCausasInasistencia';
import GraficoInasistenciasMensual from '../../components/estadisticas/GraficoInasistenciasMensual';
import FiltrosEstadisticas from '../../components/estadisticas/FiltrosEstadisticas';
import ModalCronogramaGrupo from '../../components/coordinador/ModalCronogramaGrupo';

export default function DashboardUniversidad({ onVerPerfil, usuarioForzado = null }) {
  const notificacion = useNotificacion();
  const { perfil: usuarioAuth } = useAuth();
  // usuarioForzado permite que el admin "vea como" una universidad/rol específico
  // desde VerComoUniversidad.jsx, sin necesidad de iniciar sesión con esa cuenta.
  const usuario = usuarioForzado || usuarioAuth;
  const esCoordinadorUniversidad = usuario?.rol === 'coordinador_universidad';
  
  const [grupos, setGrupos] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  const [cohorteFiltro, setCohorteFiltro] = useState(null);
  const [estudiantes, setEstudiantes] = useState([]);
  const [modulo, setModulo] = useState('');
  const [docenteNombre, setDocenteNombre] = useState('');
  const [docenteTelefono, setDocenteTelefono] = useState('');
  const [docenteCorreo, setDocenteCorreo] = useState('');
  const [fechaAsistencia, setFechaAsistencia] = useState(new Date().toISOString().split('T')[0]);
  const [inasistencias, setInasistencias] = useState([]);
  const [observaciones, setObservaciones] = useState('');
  const [cargando, setCargando] = useState(false);
  const [vistaActiva, setVistaActiva] = useState('asistencia');
  const [busqueda, setBusqueda] = useState('');

  const grupoIdCargadoRef = useRef(null);

  const [enlacesGrupo, setEnlacesGrupo] = useState({ estudiantes: null, acudientes: null });
  const [padrinosGrupo, setPadrinosGrupo] = useState([]);
  const [cronogramaGrupo, setCronogramaGrupo] = useState([]);
  const [modalCronograma, setModalCronograma] = useState(false);
  const { modulos: modulosDisponibles, docentes: docentesDisponibles, docentePorModulo } = useMemo(
    () => derivarModulosYDocentes(cronogramaGrupo),
    [cronogramaGrupo]
  );

  // 🔥 ESTADOS PARA HISTORIAL
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [reporteEditando, setReporteEditando] = useState(null);
  const [inasistenciasEditando, setInasistenciasEditando] = useState([]);

  // ESTADOS PARA NOTAS
  const [notasModulos, setNotasModulos] = useState([]);
  const [cargandoNotas, setCargandoNotas] = useState(false);
  const [modalNotas, setModalNotas] = useState(false);
  const [notaEditando, setNotaEditando] = useState(null);
  const [notasExpandidas, setNotasExpandidas] = useState(new Set());

  // ESTADOS PARA OBSERVACIONES INDIVIDUALES Y MODAL RESUMEN
  const [observacionesInd, setObservacionesInd] = useState({});
  const [modalResumen, setModalResumen] = useState(false);
  const [resumenSesion, setResumenSesion] = useState(null);

  // ESTADOS PARA LA PESTAÑA DE ESTADÍSTICAS (SOLO COORDINADOR_UNIVERSIDAD)
  const [estudiantesUniversidad, setEstudiantesUniversidad] = useState([]);
  const [cargandoKpis, setCargandoKpis] = useState(true);
  const [filtrosEstadisticas, setFiltrosEstadisticas] = useState({ municipios: [], cohortes: [], universidades: [], estados: [] });
  const filtrosUniversidad = useMemo(
    () => ({ ...filtrosEstadisticas, universidades: usuario ? [usuario.universidad] : [] }),
    [filtrosEstadisticas, usuario?.universidad]
  );

  useEffect(() => { if (usuario) cargarGrupos(); }, [usuario]);

  useEffect(() => {
    if (usuario && esCoordinadorUniversidad) cargarEstudiantesUniversidad();
  }, [usuario, esCoordinadorUniversidad, filtrosUniversidad]);

  // Trae, paginado, TODOS los estudiantes de la universidad que cumplen los
  // filtros activos — alimenta tanto los KPI/gráficos como la descarga de
  // Excel, igual que Estadisticas.jsx para un aliado.
  async function cargarEstudiantesUniversidad() {
    setCargandoKpis(true);
    let todosLosDatos = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase.from('estudiantes').select('*').eq('universidad', usuario.universidad);
      if (filtrosUniversidad.municipios?.length > 0) query = query.in('municipio', filtrosUniversidad.municipios);
      if (filtrosUniversidad.cohortes?.length > 0) query = query.in('cohorte', filtrosUniversidad.cohortes);
      if (filtrosUniversidad.estados?.length > 0) query = query.in('estado', filtrosUniversidad.estados);

      const { data, error } = await query.range(from, from + limit - 1);
      if (error) { console.error('Error:', error); break; }
      if (data && data.length > 0) { todosLosDatos = [...todosLosDatos, ...data]; from += limit; }
      if (!data || data.length < limit) hasMore = false;
    }

    setEstudiantesUniversidad(todosLosDatos);
    setCargandoKpis(false);
  }

  const kpisUniversidad = useMemo(() => {
    const total = estudiantesUniversidad.length;
    const contar = (estado) => estudiantesUniversidad.filter(e => e.estado === estado).length;
    return {
      total,
      activos: contar('Activo'),
      enRiesgo: contar('En Riesgo'),
      desertores: contar('Desertor'),
      graduados: contar('Graduado')
    };
  }, [estudiantesUniversidad]);

  const gruposTotalesUniversidad = useMemo(
    () => new Set(estudiantesUniversidad.map(e => e.grupo_id).filter(Boolean)).size,
    [estudiantesUniversidad]
  );

  useEffect(() => {
    if (grupoSeleccionado) {
      cargarEstudiantes(grupoSeleccionado.id);
      cargarEnlacesGrupo(grupoSeleccionado.id);
      cargarPadrinosGrupo(grupoSeleccionado.id);
      cargarHistorial(grupoSeleccionado.id);
      cargarNotasGrupo(grupoSeleccionado.id);
      cargarCronogramaGrupo(grupoSeleccionado.id);
    }
  }, [grupoSeleccionado]);

  async function cargarGrupos() {
    const { data } = await supabase.from('grupos').select('*').eq('universidad', usuario.universidad).eq('activo', true).order('nombre');
    if (data) {
      setGrupos(data);
      if (data.length > 0) {
        setGrupoSeleccionado(data[0]);
        setCohorteFiltro(data[0].cohorte);
      }
    }
  }

  async function cargarEstudiantes(grupoId) {
    setCargando(true);
    const { data } = await supabase.from('estudiantes').select('*').eq('grupo_id', grupoId).order('nombre_completo');
    if (data) {
      setEstudiantes(data);
      // Solo resetear selecciones cuando el grupo cambia, no cuando recarga el mismo grupo
      if (grupoId !== grupoIdCargadoRef.current) {
        setInasistencias([]);
        setObservacionesInd({});
        grupoIdCargadoRef.current = grupoId;
      }
    }
    setCargando(false);
  }

  async function cargarEnlacesGrupo(grupoId) {
    const { data } = await supabase.from('whatsapp_grupos').select('*').eq('grupo_id', grupoId);
    if (data) {
      setEnlacesGrupo({
        estudiantes: data.find(e => e.tipo_grupo === 'estudiantes')?.enlace || null,
        acudientes: data.find(e => e.tipo_grupo === 'acudientes')?.enlace || null
      });
    }
  }

  async function cargarPadrinosGrupo(grupoId) {
    const { data } = await supabase
      .from('grupo_padrino')
      .select(`padrinos:padrino_id (id, nombre_completo, telefono, correo)`)
      .eq('grupo_id', grupoId);
    if (data) setPadrinosGrupo(data.map(d => d.padrinos).filter(p => p));
  }

  async function cargarCronogramaGrupo(grupoId) {
    const { data } = await supabase
      .from('cronograma_clases')
      .select('id, fecha, modulo, docente_universitario, telefono_contacto, modulo_original, docente_original, telefono_original')
      .eq('grupo_id', grupoId)
      .order('fecha', { ascending: true });
    setCronogramaGrupo(data || []);
  }

  async function cargarNotasGrupo(grupoId) {
    setCargandoNotas(true);
    const { data } = await supabase
      .from('notas_modulos')
      .select(`
        *,
        notas_estudiantes (
          id, estudiante_id, nota, observaciones,
          estudiante:estudiante_id ( id, nombre_completo, estado, grupo_id )
        )
      `)
      .eq('grupo_id', grupoId)
      .order('fecha_evaluacion', { ascending: false });
    if (data) {
      // Igual que en NotasGrupoResumen: si el estudiante fue trasladado, su nota
      // no debe seguir contando en el resumen/descarga de este grupo.
      const filtrado = data.map(nm => ({
        ...nm,
        notas_estudiantes: (nm.notas_estudiantes || []).filter(ne => ne.estudiante?.grupo_id === grupoId)
      }));
      setNotasModulos(filtrado);
    }
    setCargandoNotas(false);
  }

  async function eliminarNotaModulo(id) {
    if (!confirm('¿Eliminar este registro de notas? Esta acción no se puede deshacer.')) return;
    try {
      await supabase.from('notas_estudiantes').delete().eq('nota_modulo_id', id);
      await supabase.from('notas_modulos').delete().eq('id', id);
      notificacion.success('Registro de notas eliminado');
      cargarNotasGrupo(grupoSeleccionado.id);
    } catch (error) {
      notificacion.error(interpretarError(error), 'Error al eliminar');
    }
  }

  function toggleNotaExpandida(id) {
    setNotasExpandidas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // 🔥 CARGAR HISTORIAL
  async function cargarHistorial(grupoId) {
    setCargandoHistorial(true);
    const { data } = await supabase
      .from('registros_asistencia')
      .select(`*, inasistencias (*, estudiante:estudiante_id (grupo_id))`)
      .eq('grupo_id', grupoId)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) {
      // Un estudiante trasladado a otro grupo conserva su inasistencia histórica,
      // pero ya no debe contarse en "Mi Historial" de este grupo (ver su perfil).
      const conSoloGrupoActual = data.map(reporte => ({
        ...reporte,
        inasistencias: (reporte.inasistencias || []).filter(i => i.estudiante?.grupo_id === grupoId)
      }));
      setHistorial(conSoloGrupoActual);
    }
    setCargandoHistorial(false);
  }

  // 🔥 ABRIR MODAL PARA EDITAR
  function abrirEditar(reporte) {
    setReporteEditando(reporte);
    setModulo(reporte.modulo);
    setDocenteNombre(reporte.docente_nombre);
    setDocenteTelefono(reporte.docente_telefono || '');
    setDocenteCorreo(reporte.docente_correo || '');
    setFechaAsistencia(reporte.fecha);
    setObservaciones(reporte.observaciones || '');
    setInasistenciasEditando((reporte.inasistencias || []).map(i => i.estudiante_id));
    setModalEditar(true);
  }

  // 🔥 GUARDAR EDICIÓN
  async function guardarEdicion(e) {
    e.preventDefault();
    setCargando(true);
    try {
      // Actualizar registro
      await supabase
        .from('registros_asistencia')
        .update({
          modulo: modulo.trim(),
          docente_nombre: docenteNombre.trim(),
          docente_telefono: docenteTelefono.trim() || null,
          docente_correo: docenteCorreo.trim() || null,
          fecha: fechaAsistencia,
          observaciones: observaciones || null
        })
        .eq('id', reporteEditando.id);

      // Diff de inasistencias: preservar las existentes para no romper seguimientos ya registrados
      const inasistenciasActuales = reporteEditando.inasistencias || [];
      const idsActuales = inasistenciasActuales.map(i => i.estudiante_id);
      const idsNuevos = inasistenciasEditando;

      // Eliminar solo las que ya no están en la nueva lista
      const aEliminar = inasistenciasActuales
        .filter(i => !idsNuevos.includes(i.estudiante_id))
        .map(i => i.id);
      if (aEliminar.length > 0) {
        await supabase.from('inasistencias').delete().in('id', aEliminar);
      }

      // Insertar solo las nuevas (que no existían antes)
      const aInsertar = idsNuevos.filter(id => !idsActuales.includes(id));
      if (aInsertar.length > 0) {
        await supabase.from('inasistencias').insert(
          aInsertar.map(estudianteId => ({
            registro_id: reporteEditando.id,
            estudiante_id: estudianteId,
            estado_seguimiento: 'pendiente'
          }))
        );
      }

      notificacion.success('Reporte actualizado correctamente');
      setModalEditar(false);
      cargarHistorial(grupoSeleccionado.id);
    } catch (error) {
      notificacion.error(interpretarError(error), 'Error al actualizar');
    } finally {
      setCargando(false);
    }
  }

  // 🔥 ELIMINAR REPORTE
  async function eliminarReporte(id) {
    if (!confirm('¿Estás seguro de eliminar este reporte? Esta acción no se puede deshacer.')) return;
    
    try {
      await supabase.from('inasistencias').delete().eq('registro_id', id);
      await supabase.from('registros_asistencia').delete().eq('id', id);
      notificacion.success('Reporte eliminado correctamente');
      cargarHistorial(grupoSeleccionado.id);
    } catch (error) {
      notificacion.error(interpretarError(error), 'Error al eliminar');
    }
  }

  function toggleInasistencia(id) {
    const estudiante = estudiantes.find(e => e.id === id);
    if (estudiante && (estudiante.estado === 'Desertor' || estudiante.estado === 'Graduado')) return;
    setInasistencias(prev => {
      const estaAusente = prev.includes(id);
      if (estaAusente) {
        setObservacionesInd(obs => { const next = { ...obs }; delete next[id]; return next; });
        return prev.filter(i => i !== id);
      }
      return [...prev, id];
    });
  }
  function marcarTodosAusentes() { setInasistencias(estudiantes.map(e => e.id)); }
  function marcarTodosPresentes() { setInasistencias([]); setObservacionesInd({}); }

  async function guardarAsistencia() {
    if (!grupoSeleccionado) return notificacion.warning('Selecciona un grupo', 'Atención');
    if (!modulo.trim()) return notificacion.warning('Ingresa el nombre del módulo', 'Campo requerido');
    if (!docenteNombre.trim()) return notificacion.warning('Ingresa el nombre del docente', 'Campo requerido');
    
    setCargando(true);
    try {
      const { data: existente } = await supabase
        .from('registros_asistencia')
        .select('id')
        .eq('grupo_id', grupoSeleccionado.id)
        .eq('modulo', modulo.trim())
        .eq('fecha', fechaAsistencia)
        .maybeSingle();

      if (existente) {
        notificacion.warning(`Ya existe un registro para "${modulo.trim()}" en esta fecha`, 'Registro duplicado');
        setCargando(false);
        return;
      }

      const datosRegistro = {
        grupo_id: grupoSeleccionado.id,
        modulo: modulo.trim(),
        docente_nombre: docenteNombre.trim(),
        docente_telefono: docenteTelefono.trim() || null,
        docente_correo: docenteCorreo.trim() || null,
        fecha: fechaAsistencia,
        observaciones: observaciones || (inasistencias.length === 0 ? 'Asistencia Completa' : null)
      };

      const { data: registro, error: errorRegistro } = await supabase
        .from('registros_asistencia')
        .insert([datosRegistro])
        .select()
        .single();
      
      if (errorRegistro) throw errorRegistro;
      
      if (inasistencias.length > 0 && registro) {
        const { error: errorInasistencias } = await supabase.from('inasistencias').insert(
          inasistencias.map(estudianteId => ({
            registro_id: registro.id,
            estudiante_id: estudianteId,
            estado_seguimiento: 'pendiente',
            observacion_docente: observacionesInd[estudianteId] || null
          }))
        );
        if (errorInasistencias) {
          // Revertir el registro si no se pudieron guardar las inasistencias
          await supabase.from('registros_asistencia').delete().eq('id', registro.id);
          throw errorInasistencias;
        }
      }

      // Armar resumen para el modal
      const ausentesResumen = inasistencias.map(id => ({
        estudiante: estudiantes.find(e => e.id === id),
        observacion: observacionesInd[id] || null
      }));
      setResumenSesion({
        modulo: modulo.trim(),
        fecha: fechaAsistencia,
        docente: docenteNombre.trim(),
        totalPresentes: estudiantes.length - inasistencias.length,
        totalAusentes: inasistencias.length,
        ausentes: ausentesResumen
      });
      setModalResumen(true);

      setModulo(''); setObservaciones(''); setInasistencias([]); setObservacionesInd({});
      setDocenteTelefono(''); setDocenteCorreo('');
      setFechaAsistencia(new Date().toISOString().split('T')[0]);
      cargarHistorial(grupoSeleccionado.id);
    } catch (error) {
      notificacion.error(interpretarError(error), 'Error al guardar');
    } finally {
      setCargando(false);
    }
  }

  function copiarResumen(resumen) {
    const lineasAusentes = resumen.ausentes
      .map(({ estudiante, observacion }) =>
        `• ${estudiante.nombre_completo}${observacion ? ` – ${observacion}` : ''}`)
      .join('\n');
    const texto = `📋 Reporte de asistencia\n📚 Módulo: ${resumen.modulo}\n📅 Fecha: ${formatearFecha(resumen.fecha)}\n👨‍🏫 Docente: ${resumen.docente}\n\n✅ Presentes: ${resumen.totalPresentes}\n❌ Ausentes: ${resumen.totalAusentes}${resumen.ausentes.length > 0 ? `\n\nAusentes:\n${lineasAusentes}` : ''}`;
    navigator.clipboard.writeText(texto)
      .then(() => notificacion.success('Resumen copiado al portapapeles'))
      .catch(() => notificacion.error('No se pudo copiar'));
  }

  const estudiantesFiltrados = estudiantes.filter(e =>
    e.nombre_completo.toLowerCase().includes(busqueda.toLowerCase())
  );

  const cohortesDisponibles = useMemo(() => {
    const set = new Set(grupos.map(g => g.cohorte).filter(Boolean));
    return Array.from(set).sort();
  }, [grupos]);

  const gruposDeCohorte = useMemo(() => {
    if (!cohorteFiltro) return grupos;
    return grupos.filter(g => g.cohorte === cohorteFiltro);
  }, [grupos, cohorteFiltro]);

  const fechasCronogramaConEstado = useMemo(
    () => cruzarCronogramaConAsistencia(cronogramaGrupo, historial),
    [cronogramaGrupo, historial]
  );
  const resumenCronograma = useMemo(() => ({
    confirmadas: fechasCronogramaConEstado.filter(f => f.estado === 'confirmada').length,
    pendientes: fechasCronogramaConEstado.filter(f => f.estado === 'pendiente').length,
    programadas: fechasCronogramaConEstado.filter(f => f.estado === 'programada').length
  }), [fechasCronogramaConEstado]);

  if (!usuario) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">📋 Registro de Asistencia</h1>
        <p className="text-gray-600 mb-5 text-sm">{usuario.universidad}</p>

        {/* SELECTOR DE GRUPO */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-sm font-medium text-gray-700">Selecciona un grupo</p>
            <div className="flex items-center gap-2 flex-wrap">
              {enlacesGrupo.estudiantes && (
                <a href={enlacesGrupo.estudiantes} target="_blank" rel="noopener noreferrer"
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-full text-xs font-medium transition">
                  💬 Grupo Est.
                </a>
              )}
              {enlacesGrupo.acudientes && (
                <a href={enlacesGrupo.acudientes} target="_blank" rel="noopener noreferrer"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-medium transition">
                  👨‍👩‍👧 Grupo Acu.
                </a>
              )}
            </div>
          </div>

          {cohortesDisponibles.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              <span className="text-xs font-medium text-gray-500 mr-1">📅 Cohorte:</span>
              {cohortesDisponibles.map(c => (
                <button
                  key={c}
                  onClick={() => setCohorteFiltro(c)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                    cohorteFiltro === c
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {gruposDeCohorte.map(g => {
              const activo = grupoSeleccionado?.id === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setGrupoSeleccionado(g)}
                  className={`w-full text-left px-3.5 py-2.5 transition flex items-center justify-between gap-3 ${
                    activo ? 'bg-primary/10 text-primary-dark' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{g.nombre}</p>
                    <p className="text-xs text-gray-500 mt-0.5">📚 {g.programa}</p>
                  </div>
                  {activo && <span className="text-primary flex-shrink-0">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* INFORMACIÓN DE PADRINOS */}
        {padrinosGrupo.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
            <p className="text-sm font-medium text-gray-700 mb-3">👤 Padrinos responsables del grupo:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {padrinosGrupo.map(padrino => (
                <div key={padrino.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{padrino.nombre_completo}</p>
                    {padrino.telefono && <span className="text-xs text-gray-500">📞 {padrino.telefono}</span>}
                  </div>
                  {padrino.telefono && <BotonWhatsApp telefono={padrino.telefono} prefijo="+57" size="sm" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PESTAÑAS */}
        <div className="border-b border-gray-200 mb-6 -mx-4 md:mx-0 px-4 md:px-0">
          <nav className="flex space-x-6 md:space-x-8 overflow-x-auto scrollbar-hide pb-px">
            <button onClick={() => setVistaActiva('asistencia')} className={`pb-3 font-medium text-sm border-b-2 whitespace-nowrap flex-shrink-0 ${vistaActiva === 'asistencia' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}>
              📝 Tomar Asistencia
            </button>
            <button onClick={() => setVistaActiva('historial')} className={`pb-3 font-medium text-sm border-b-2 whitespace-nowrap flex-shrink-0 ${vistaActiva === 'historial' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}>
              📊 Mi Historial
            </button>
            <button onClick={() => setVistaActiva('notas')} className={`pb-3 font-medium text-sm border-b-2 whitespace-nowrap flex-shrink-0 ${vistaActiva === 'notas' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}>
              🎓 Notas Finales
            </button>
            <button onClick={() => setVistaActiva('estudiantes')} className={`pb-3 font-medium text-sm border-b-2 whitespace-nowrap flex-shrink-0 ${vistaActiva === 'estudiantes' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}>
              👥 Estudiantes
            </button>
            <button onClick={() => setVistaActiva('cronograma')} className={`pb-3 font-medium text-sm border-b-2 whitespace-nowrap flex-shrink-0 ${vistaActiva === 'cronograma' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}>
              🗓️ Cronograma
            </button>
            {esCoordinadorUniversidad && (
              <button onClick={() => setVistaActiva('estadisticas')} className={`pb-3 font-medium text-sm border-b-2 whitespace-nowrap flex-shrink-0 ${vistaActiva === 'estadisticas' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}>
                📈 Estadísticas
              </button>
            )}
          </nav>
        </div>

        {/* VISTA: TOMAR ASISTENCIA */}
        {vistaActiva === 'asistencia' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4">
                <SelectConOtro
                  label="Módulo/Clase *"
                  options={modulosDisponibles}
                  value={modulo}
                  onChange={val => {
                    setModulo(val);
                    if (docentePorModulo[val]) setDocenteNombre(docentePorModulo[val]);
                  }}
                  required
                  placeholder="Seleccionar módulo..."
                  otroPlaceholder="Ej: Matemáticas"
                />
                <div><label className="block text-xs text-gray-500 mb-1">Fecha *</label><input type="date" value={fechaAsistencia} onChange={e => setFechaAsistencia(e.target.value)} max={new Date().toISOString().split('T')[0]} className="w-full border rounded-lg px-3 py-2.5 text-sm" /></div>
                <SelectConOtro
                  label="Nombre del Docente *"
                  options={docentesDisponibles}
                  value={docenteNombre}
                  onChange={setDocenteNombre}
                  required
                  placeholder="Seleccionar docente..."
                  otroPlaceholder="Nombre completo"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div><label className="block text-xs text-gray-500 mb-1">Teléfono</label><input type="text" value={docenteTelefono} onChange={e => setDocenteTelefono(e.target.value)} placeholder="3115551234" className="w-full border rounded-lg px-3 py-2.5 text-sm" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Correo</label><input type="email" value={docenteCorreo} onChange={e => setDocenteCorreo(e.target.value)} placeholder="docente@universidad.edu.co" className="w-full border rounded-lg px-3 py-2.5 text-sm" /></div>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Observaciones</label><textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" /></div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 md:p-5 border-b bg-gradient-to-r from-primary/10 to-primary/5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-semibold">Estudiantes ({estudiantes.length})</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs"><span className="text-green-600 font-bold">{estudiantes.length - inasistencias.length}</span> <span className="text-gray-500">Presentes</span></span>
                      <span className="text-xs"><span className="text-red-600 font-bold">{inasistencias.length}</span> <span className="text-gray-500">Ausentes</span></span>
                    </div>
                    <div className="w-24 md:w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${estudiantes.length > 0 ? ((estudiantes.length - inasistencias.length) / estudiantes.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="text" placeholder="🔍 Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full sm:w-44 md:w-56" />
                    <button onClick={marcarTodosPresentes} className="text-xs bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-200 whitespace-nowrap">✅ Presentes</button>
                    <button onClick={marcarTodosAusentes} className="text-xs bg-red-50 text-red-700 px-3 py-2 rounded-lg border border-red-200 whitespace-nowrap">❌ Ausentes</button>
                  </div>
                </div>
              </div>
              
              <div className="p-5 max-h-96 overflow-y-auto">
                {estudiantesFiltrados.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No se encontraron estudiantes</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {estudiantesFiltrados.map(est => {
                      const ausente = inasistencias.includes(est.id);
                      const noSeleccionable = est.estado === 'Desertor' || est.estado === 'Graduado';
                      const tieneNota = !!observacionesInd[est.id];

                      return (
                        <div key={est.id} className="flex flex-col">
                          <div
                            onClick={() => toggleInasistencia(est.id)}
                            className={`flex items-center p-3 rounded-xl border-2 transition-all ${
                              noSeleccionable
                                ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                                : ausente
                                  ? `bg-red-50 shadow-sm cursor-pointer ${ausente ? 'border-red-300 rounded-b-none' : 'border-red-300'}`
                                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                              noSeleccionable ? 'bg-gray-200 text-gray-500' :
                              ausente ? 'bg-red-200 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {noSeleccionable ? '🚫' : ausente ? '❌' : '✅'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm truncate">{est.nombre_completo}</p>
                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                                  est.estado === 'Activo' ? 'bg-green-100 text-green-700' :
                                  est.estado === 'En Riesgo' ? 'bg-yellow-100 text-yellow-700' :
                                  est.estado === 'Desertor' ? 'bg-red-100 text-red-700' :
                                  est.estado === 'Graduado' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {est.estado || 'Activo'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 truncate">{est.municipio} • {est.institucion_educativa}</p>
                            </div>
                            {ausente && !noSeleccionable && (
                              <span className={`text-xs px-2 py-1 rounded-full ml-2 flex-shrink-0 ${tieneNota ? 'text-amber-700 bg-amber-100' : 'text-red-600 bg-red-100'}`}>
                                {tieneNota ? '📝' : 'Ausente'}
                              </span>
                            )}
                            {noSeleccionable && (
                              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full ml-2 flex-shrink-0">No aplica</span>
                            )}
                          </div>

                          {ausente && !noSeleccionable && (
                            <div className="bg-red-50 border-2 border-red-300 border-t-0 rounded-b-xl px-3 pb-2.5 pt-2">
                              <textarea
                                value={observacionesInd[est.id] || ''}
                                onChange={e => setObservacionesInd(prev => ({ ...prev, [est.id]: e.target.value }))}
                                onClick={e => e.stopPropagation()}
                                placeholder="Motivo de ausencia (opcional)..."
                                rows={2}
                                maxLength={120}
                                className="w-full text-xs border border-red-200 rounded-lg px-2.5 py-1.5 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-red-300 placeholder-gray-400"
                              />
                              <p className="text-right text-[10px] text-gray-400 mt-0.5">
                                {(observacionesInd[est.id] || '').length}/120
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="p-5 border-t bg-gray-50 flex justify-end">
                <button onClick={guardarAsistencia} disabled={cargando} className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg font-medium transition disabled:opacity-50 shadow-sm">
                  {cargando ? 'Guardando...' : '💾 Guardar Asistencia'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🔥 VISTA: HISTORIAL */}
        {vistaActiva === 'historial' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-gradient-to-r from-primary/10 to-primary/5">
              <h3 className="font-semibold text-gray-800">📊 Mi Historial de Asistencias</h3>
              <p className="text-sm text-gray-600 mt-1">Reportes registrados para {grupoSeleccionado?.nombre}</p>
            </div>
            
            <div className="p-5">
              {cargandoHistorial ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-gray-500 mt-2">Cargando historial...</p>
                </div>
              ) : historial.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay reportes de asistencia registrados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historial.map(reporte => {
                    const totalInasistencias = reporte.inasistencias?.length || 0;
                    const esCompleta = totalInasistencias === 0;
                    
                    return (
                      <div key={reporte.id} className={`border rounded-xl p-4 ${esCompleta ? 'border-green-200 bg-green-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className={`text-xl ${esCompleta ? 'text-green-600' : 'text-amber-600'}`}>
                                {esCompleta ? '✅' : '⚠️'}
                              </span>
                              <span className="font-semibold text-gray-800">{reporte.modulo}</span>
                            </div>
                            <div className="flex items-center space-x-3 mt-1 ml-7 text-sm text-gray-600">
                              <span>📅 {formatearFecha(reporte.fecha)}</span>
                              <span>👨‍🏫 {reporte.docente_nombre}</span>
                              <span className={esCompleta ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                                {esCompleta ? 'Asistencia Completa' : `${totalInasistencias} ausente(s)`}
                              </span>
                            </div>
                            {reporte.observaciones && reporte.observaciones !== 'Asistencia Completa' && (
                              <p className="text-xs text-gray-500 ml-7 mt-1">📝 {reporte.observaciones}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => abrirEditar(reporte)}
                              className="bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => eliminarReporte(reporte.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA: NOTAS FINALES */}
      {vistaActiva === 'notas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">🎓 Notas Finales por Módulo</h2>
              <p className="text-sm text-gray-500 mt-1">
                {notasModulos.length} módulo{notasModulos.length !== 1 ? 's' : ''} evaluado{notasModulos.length !== 1 ? 's' : ''} · {grupoSeleccionado?.nombre}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {notasModulos.length > 0 && (
                <button
                  onClick={() => exportarNotasGrupoExcel(notasModulos, grupoSeleccionado?.nombre)}
                  className="bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium border border-green-200 transition flex items-center space-x-2"
                >
                  <span>📥</span>
                  <span>Descargar Historial</span>
                </button>
              )}
              <button
                onClick={() => { setNotaEditando(null); setModalNotas(true); }}
                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                + Ingresar Notas
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {cargandoNotas ? (
              <div className="p-10 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-500 mt-2">Cargando notas...</p>
              </div>
            ) : notasModulos.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-400 text-lg mb-2">📋 Sin notas registradas</p>
                <p className="text-gray-400 text-sm">Haz clic en "Ingresar Notas" para comenzar</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notasModulos.map(nm => {
                  const notasArr = nm.notas_estudiantes || [];
                  const conNota = notasArr.filter(n => n.nota !== null && n.nota !== undefined);
                  const promedio = conNota.length > 0
                    ? (conNota.reduce((s, n) => s + n.nota, 0) / conNota.length).toFixed(1)
                    : null;
                  const aprobados = conNota.filter(n => n.nota >= 3.0).length;
                  const estaExpandida = notasExpandidas.has(nm.id);

                  return (
                    <div key={nm.id}>
                      <div className="p-4 flex items-center justify-between">
                        <div
                          className="flex items-start space-x-3 flex-1 cursor-pointer"
                          onClick={() => toggleNotaExpandida(nm.id)}
                        >
                          <span className="text-xl mt-0.5">📚</span>
                          <div>
                            <p className="font-semibold text-gray-800">{nm.modulo}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                              <span>📅 {formatearFecha(nm.fecha_evaluacion)}</span>
                              <span>👨‍🏫 {nm.docente_nombre}</span>
                              {promedio && (
                                <span className={`font-medium ${parseFloat(promedio) >= 3 ? 'text-green-600' : 'text-red-500'}`}>
                                  Promedio: {promedio}
                                </span>
                              )}
                              {conNota.length > 0 && (
                                <span className="text-gray-400">{aprobados}/{conNota.length} aprobados</span>
                              )}
                            </div>
                            {nm.observaciones && (
                              <p className="text-xs text-gray-400 mt-1">📝 {nm.observaciones}</p>
                            )}
                          </div>
                          <span className="text-gray-400 text-sm ml-2">{estaExpandida ? '▲' : '▼'}</span>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => { setNotaEditando(nm); setModalNotas(true); }}
                            className="bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => eliminarNotaModulo(nm.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>

                      {estaExpandida && (
                        <div className="border-t border-gray-100 bg-gray-50">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="px-6 py-2 text-left font-medium text-gray-600">Estudiante</th>
                                <th className="px-4 py-2 text-center font-medium text-gray-600">Nota</th>
                                <th className="px-4 py-2 text-center font-medium text-gray-600">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {notasArr
                                .filter(ne => ne.estudiante)
                                .sort((a, b) => a.estudiante.nombre_completo.localeCompare(b.estudiante.nombre_completo))
                                .map(ne => (
                                  <tr key={ne.id} className="hover:bg-white">
                                    <td className="px-6 py-2 text-gray-800">{ne.estudiante.nombre_completo}</td>
                                    <td className="px-4 py-2 text-center">
                                      {ne.nota !== null && ne.nota !== undefined ? (
                                        <span className={`font-semibold ${ne.nota >= 3 ? 'text-green-600' : 'text-red-500'}`}>
                                          {Number(ne.nota).toFixed(1)}
                                        </span>
                                      ) : <span className="text-gray-400">–</span>}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {ne.nota !== null && ne.nota !== undefined ? (
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                          ne.nota >= 3 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                          {ne.nota >= 3 ? 'Aprobado' : 'Reprobado'}
                                        </span>
                                      ) : <span className="text-gray-400 text-xs">Sin nota</span>}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
        {/* VISTA: ESTUDIANTES */}
        {vistaActiva === 'estudiantes' && (() => {
          const inasistenciasPorEst = {};
          historial.forEach(r => (r.inasistencias || []).forEach(i => {
            inasistenciasPorEst[i.estudiante_id] = (inasistenciasPorEst[i.estudiante_id] || 0) + 1;
          }));

          const estadoClase = (estado) => {
            if (estado === 'Activo')    return 'bg-green-100 text-green-700';
            if (estado === 'En Riesgo') return 'bg-yellow-100 text-yellow-700';
            if (estado === 'Desertor')  return 'bg-red-100 text-red-600';
            if (estado === 'Graduado')  return 'bg-blue-100 text-blue-700';
            return 'bg-gray-100 text-gray-600';
          };

          return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 md:p-5 border-b border-gray-200 bg-gradient-to-r from-primary/10 to-primary/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-800">👥 Listado de Estudiantes</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{estudiantes.length} estudiantes · {grupoSeleccionado?.nombre}</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span> Activo: {estudiantes.filter(e => e.estado === 'Activo' || !e.estado).length}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span> En Riesgo: {estudiantes.filter(e => e.estado === 'En Riesgo').length}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span> Desertor: {estudiantes.filter(e => e.estado === 'Desertor').length}</span>
                </div>
              </div>

              {/* Desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estudiante</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Municipio / IE</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Teléfono</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Inasistencias</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                      {onVerPerfil && <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {estudiantes.map(est => {
                      const faltas = inasistenciasPorEst[est.id] || 0;
                      return (
                        <tr key={est.id} className={`hover:bg-gray-50 transition ${est.estado === 'Desertor' ? 'opacity-60' : ''}`}>
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-800 text-sm">{est.nombre_completo}</p>
                            <p className="text-xs text-gray-400">{est.documento || 'Sin documento'}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-gray-700">{est.municipio || '—'}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{est.institucion_educativa || '—'}</p>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{est.telefono || '—'}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block min-w-[28px] px-2 py-0.5 rounded-full text-sm font-semibold ${
                              faltas === 0 ? 'text-gray-400' : faltas <= 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'
                            }`}>
                              {faltas}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${estadoClase(est.estado)}`}>
                              {est.estado || 'Activo'}
                            </span>
                          </td>
                          {onVerPerfil && (
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => onVerPerfil(est)}
                                className="bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
                              >
                                👁️ Ver Perfil
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Móvil */}
              <div className="lg:hidden divide-y divide-gray-100">
                {estudiantes.map(est => {
                  const faltas = inasistenciasPorEst[est.id] || 0;
                  return (
                    <div key={est.id} className={`p-4 ${est.estado === 'Desertor' ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-800 text-sm truncate">{est.nombre_completo}</p>
                          <p className="text-xs text-gray-400">{est.documento || 'Sin documento'}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${estadoClase(est.estado)}`}>
                          {est.estado || 'Activo'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-500">
                        <span>📍 {est.municipio || '—'}</span>
                        <span>📞 {est.telefono || '—'}</span>
                        <span className="truncate">🏫 {est.institucion_educativa || '—'}</span>
                        <span className={faltas > 2 ? 'text-red-600 font-semibold' : faltas > 0 ? 'text-yellow-600 font-medium' : ''}>
                          ❌ {faltas} inasistencia{faltas !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {onVerPerfil && (
                        <button
                          onClick={() => onVerPerfil(est)}
                          className="mt-3 w-full bg-primary hover:bg-primary-dark text-white px-3 py-2 rounded-lg text-xs font-medium transition"
                        >
                          👁️ Ver Perfil
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* VISTA: CRONOGRAMA */}
        {vistaActiva === 'cronograma' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 border-b border-gray-200 bg-gradient-to-r from-primary/10 to-primary/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-800">🗓️ Cronograma de Clases</h3>
                <p className="text-sm text-gray-500 mt-0.5">{grupoSeleccionado?.nombre}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {fechasCronogramaConEstado.length > 0 && (
                  <>
                    <span className="text-xs font-medium bg-primary/10 text-primary-dark px-2.5 py-1 rounded-full whitespace-nowrap">
                      {resumenCronograma.confirmadas} confirmada{resumenCronograma.confirmadas !== 1 ? 's' : ''}
                    </span>
                    {resumenCronograma.pendientes > 0 && (
                      <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full whitespace-nowrap">
                        {resumenCronograma.pendientes} pendiente{resumenCronograma.pendientes !== 1 ? 's' : ''}
                      </span>
                    )}
                    {resumenCronograma.programadas > 0 && (
                      <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full whitespace-nowrap">
                        {resumenCronograma.programadas} próxima{resumenCronograma.programadas !== 1 ? 's' : ''}
                      </span>
                    )}
                  </>
                )}
                <button
                  onClick={() => setModalCronograma(true)}
                  disabled={!grupoSeleccionado}
                  className="bg-primary hover:bg-primary-dark text-white px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition shadow-sm disabled:opacity-50 whitespace-nowrap"
                >
                  ✏️ Editar / Agregar fechas
                </button>
              </div>
            </div>

            {fechasCronogramaConEstado.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-gray-400 text-sm mb-2">Este grupo aún no tiene fechas programadas</p>
                <p className="text-gray-400 text-xs">Usa "Editar / Agregar fechas" para subir el cronograma</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Módulo</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Docente</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Teléfono</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Clase Vista</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fechasCronogramaConEstado.map(f => (
                      <tr key={f.id} className="hover:bg-gray-50 transition">
                        <td className="py-3 px-4 text-gray-700 whitespace-nowrap">{formatearFecha(f.fecha)}</td>
                        <td className="py-3 px-4">
                          <p className="text-gray-800">{f.moduloEfectivo || '—'}</p>
                          {f.huboAjuste && f.moduloOriginal && (
                            <p className="text-xs text-blue-500 mt-0.5">Programado: {f.moduloOriginal}</p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-gray-700">{f.docenteEfectivo || '—'}</p>
                          {f.huboAjuste && f.docenteOriginal && (
                            <p className="text-xs text-blue-500 mt-0.5">Programado: {f.docenteOriginal}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{f.telefonoEfectivo || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            f.estado === 'confirmada' ? 'bg-primary/10 text-primary-dark'
                              : f.estado === 'pendiente' ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {f.estado === 'confirmada' ? '✅ Vista' : f.estado === 'pendiente' ? '⏳ Pendiente' : '📅 Próxima'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VISTA: ESTADÍSTICAS (SOLO COORDINADOR_UNIVERSIDAD) */}
        {vistaActiva === 'estadisticas' && esCoordinadorUniversidad && (
          <div className="space-y-6">
            <FiltrosEstadisticas
              onAplicarFiltros={setFiltrosEstadisticas}
              onLimpiarFiltros={() => setFiltrosEstadisticas({ municipios: [], cohortes: [], universidades: [], estados: [] })}
              universidadFija={usuario.universidad}
            />

            <div className="flex justify-end">
              <button
                onClick={() => exportarEstudiantesExcel(estudiantesUniversidad, usuario.universidad)}
                disabled={estudiantesUniversidad.length === 0}
                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 whitespace-nowrap"
              >
                📥 Descargar Excel
              </button>
            </div>

            {cargandoKpis ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-gray-500 mt-2">Cargando estadísticas...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <TarjetaKPI titulo="Total Estudiantes" valor={kpisUniversidad.total} color="from-blue-400 to-blue-500" />
                <TarjetaKPI titulo="Activos" valor={kpisUniversidad.activos} color="from-emerald-400 to-emerald-500" />
                <TarjetaKPI titulo="En Riesgo" valor={kpisUniversidad.enRiesgo} color="from-amber-300 to-amber-400" />
                <TarjetaKPI titulo="Desertores" valor={kpisUniversidad.desertores} color="from-rose-400 to-rose-500" />
                <TarjetaKPI titulo="Graduados" valor={kpisUniversidad.graduados} color="from-sky-400 to-sky-500" />
                <TarjetaKPI titulo="Grupos Totales" valor={gruposTotalesUniversidad} color="from-purple-400 to-purple-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GraficoEstadosDoughnut filtros={filtrosUniversidad} />
                <GraficoGeneroDoughnut filtros={filtrosUniversidad} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GraficoBarrasHorizontal titulo="Estudiantes por Municipio" campo="municipio" icono="📍" filtros={filtrosUniversidad} limite={10} />
                <GraficoBarrasHorizontal titulo="Estudiantes por Institución" campo="institucion_educativa" icono="🏫" filtros={filtrosUniversidad} limite={10} />
              </div>

              <GraficoBarrasHorizontal titulo="Estudiantes por Programa" campo="programa" icono="📚" filtros={filtrosUniversidad} limite={10} />

              <ComparativoCohortes filtros={filtrosUniversidad} />

              <RankingDeserciones filtros={filtrosUniversidad} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GraficoCausasInasistencia filtros={filtrosUniversidad} />
                <GraficoInasistenciasMensual filtros={filtrosUniversidad} />
              </div>
            </div>
          )}
          </div>
        )}

      </div>

      <ModalIngresarNotas
        isOpen={modalNotas}
        onClose={() => { setModalNotas(false); setNotaEditando(null); }}
        onGuardar={() => cargarNotasGrupo(grupoSeleccionado.id)}
        grupoId={grupoSeleccionado?.id}
        estudiantes={estudiantes}
        notaEditando={notaEditando}
      />

      <ModalCronogramaGrupo
        isOpen={modalCronograma}
        onClose={() => setModalCronograma(false)}
        grupo={grupoSeleccionado}
        onActualizado={() => cargarCronogramaGrupo(grupoSeleccionado.id)}
        puedeGestionar
      />

      {/* MODAL RESUMEN DE SESIÓN */}
      {modalResumen && resumenSesion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden">
            <div className="bg-green-50 px-6 py-5 text-center border-b border-green-100">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800">Asistencia guardada</h3>
            </div>

            <div className="p-5">
              <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">📚</span>
                  <span className="font-medium text-gray-800 flex-1 truncate">{resumenSesion.modulo}</span>
                  <span className="text-gray-500 flex-shrink-0 text-xs">{formatearFecha(resumenSesion.fecha)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-gray-400">👨‍🏫</span>
                  <span>{resumenSesion.docente}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{resumenSesion.totalPresentes}</p>
                  <p className="text-xs text-gray-500 mt-0.5">✅ Presentes</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-red-500">{resumenSesion.totalAusentes}</p>
                  <p className="text-xs text-gray-500 mt-0.5">❌ Ausentes</p>
                </div>
              </div>

              {resumenSesion.ausentes.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estudiantes ausentes</p>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-44 overflow-y-auto">
                    {resumenSesion.ausentes.map(({ estudiante, observacion }) => (
                      <div key={estudiante.id} className="px-3 py-2.5">
                        <p className="text-sm font-medium text-gray-800">{estudiante.nombre_completo}</p>
                        <p className={`text-xs mt-0.5 ${observacion ? 'text-gray-600' : 'text-gray-400 italic'}`}>
                          {observacion || 'Sin motivo registrado'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => copiarResumen(resumenSesion)}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition mb-3"
              >
                📋 Copiar resumen
              </button>

              <button
                onClick={() => setModalResumen(false)}
                className="w-full bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 MODAL PARA EDITAR REPORTE */}
      {modalEditar && reporteEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold text-gray-800">✏️ Editar Reporte de Asistencia</h3>
              <p className="text-sm text-gray-600 mt-1">{reporteEditando.modulo} - {formatearFecha(reporteEditando.fecha)}</p>
            </div>
            
            <form onSubmit={guardarEdicion}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <SelectConOtro
                    label="Módulo/Clase *"
                    options={modulosDisponibles}
                    value={modulo}
                    onChange={val => {
                      setModulo(val);
                      if (docentePorModulo[val]) setDocenteNombre(docentePorModulo[val]);
                    }}
                    required
                    placeholder="Seleccionar módulo..."
                    otroPlaceholder="Ej: Matemáticas"
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha *</label>
                    <input type="date" value={fechaAsistencia} onChange={e => setFechaAsistencia(e.target.value)} max={new Date().toISOString().split('T')[0]} required className="w-full border rounded-lg px-3 py-2.5 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <SelectConOtro
                    label="Nombre del Docente *"
                    options={docentesDisponibles}
                    value={docenteNombre}
                    onChange={setDocenteNombre}
                    required
                    placeholder="Seleccionar docente..."
                    otroPlaceholder="Nombre completo"
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1">Observaciones</label>
                    <input type="text" value={observaciones} onChange={e => setObservaciones(e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm" />
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">📋 Marcar estudiantes ausentes:</p>
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {estudiantes.map(est => {
                      const noSeleccionable = est.estado === 'Desertor' || est.estado === 'Graduado';
                      
                      return (
                        <label 
                          key={est.id} 
                          className={`flex items-center space-x-2 p-1 rounded ${
                            noSeleccionable 
                              ? 'bg-gray-100 opacity-60 cursor-not-allowed' 
                              : 'hover:bg-gray-50 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={inasistenciasEditando.includes(est.id)}
                            onChange={() => {
                              if (noSeleccionable) return;
                              setInasistenciasEditando(prev => 
                                prev.includes(est.id) ? prev.filter(i => i !== est.id) : [...prev, est.id]
                              );
                            }}
                            disabled={noSeleccionable}
                            className="rounded"
                          />
                          <span className="text-sm">{est.nombre_completo}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                            est.estado === 'Activo' ? 'bg-green-100 text-green-700' :
                            est.estado === 'En Riesgo' ? 'bg-yellow-100 text-yellow-700' :
                            est.estado === 'Desertor' ? 'bg-red-100 text-red-700' :
                            est.estado === 'Graduado' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {est.estado || 'Activo'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3">
                <button type="button" onClick={() => setModalEditar(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={cargando} className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}