// =============================================
// DASHBOARD PARA UNIVERSIDADES (CON HISTORIAL COMPLETO)
// =============================================

import { useState, useEffect } from 'react';
import { useNotificacion } from '../../context/NotificacionContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/common/Header';
import BotonWhatsApp from '../../components/common/BotonWhatsApp';
import { formatearFecha } from '../../utils/helpers';

export default function DashboardUniversidad() {
  const notificacion = useNotificacion();
  const { perfil: usuario } = useAuth();
  
  const [grupos, setGrupos] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
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

  const [enlacesGrupo, setEnlacesGrupo] = useState({ estudiantes: null, acudientes: null });
  const [padrinosGrupo, setPadrinosGrupo] = useState([]);

  // 🔥 ESTADOS PARA HISTORIAL
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [reporteEditando, setReporteEditando] = useState(null);
  const [inasistenciasEditando, setInasistenciasEditando] = useState([]);

  useEffect(() => { if (usuario) cargarGrupos(); }, [usuario]);
  
  useEffect(() => {
    if (grupoSeleccionado) {
      cargarEstudiantes(grupoSeleccionado.id);
      cargarEnlacesGrupo(grupoSeleccionado.id);
      cargarPadrinosGrupo(grupoSeleccionado.id);
      cargarHistorial(grupoSeleccionado.id);
    }
  }, [grupoSeleccionado]);

  async function cargarGrupos() {
    const { data } = await supabase.from('grupos').select('*').eq('universidad', usuario.universidad).order('nombre');
    if (data) { setGrupos(data); if (data.length > 0) setGrupoSeleccionado(data[0]); }
  }

  async function cargarEstudiantes(grupoId) {
    setCargando(true);
    const { data } = await supabase.from('estudiantes').select('*').eq('grupo_id', grupoId).order('nombre_completo');
    if (data) { setEstudiantes(data); setInasistencias([]); }
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

  // 🔥 CARGAR HISTORIAL
  async function cargarHistorial(grupoId) {
    setCargandoHistorial(true);
    const { data } = await supabase
      .from('registros_asistencia')
      .select(`*, inasistencias (*)`)
      .eq('grupo_id', grupoId)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setHistorial(data);
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

      // Eliminar inasistencias anteriores
      await supabase.from('inasistencias').delete().eq('registro_id', reporteEditando.id);

      // Insertar nuevas inasistencias
      if (inasistenciasEditando.length > 0) {
        await supabase.from('inasistencias').insert(
          inasistenciasEditando.map(estudianteId => ({
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
      notificacion.error(error.message, 'Error al actualizar');
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
      notificacion.error(error.message, 'Error al eliminar');
    }
  }

  function toggleInasistencia(id) {
    // 🔥 No permitir seleccionar estudiantes que no están activos
    const estudiante = estudiantes.find(e => e.id === id);
    if (estudiante && (estudiante.estado === 'Desertor' || estudiante.estado === 'Graduado')) {
      return; // No hacer nada
    }
    setInasistencias(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); 
  }
  function marcarTodosAusentes() { setInasistencias(estudiantes.map(e => e.id)); }
  function marcarTodosPresentes() { setInasistencias([]); }

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
        await supabase.from('inasistencias').insert(
          inasistencias.map(estudianteId => ({
            registro_id: registro.id,
            estudiante_id: estudianteId,
            estado_seguimiento: 'pendiente'
          }))
        );
      }
      
      if (inasistencias.length === 0) {
        notificacion.success(`Asistencia completa registrada para ${estudiantes.length} estudiantes`);
      } else {
        notificacion.success(`Asistencia registrada: ${estudiantes.length - inasistencias.length} presentes, ${inasistencias.length} ausentes`);
      }
      
      setModulo(''); setObservaciones(''); setInasistencias([]);
      setDocenteTelefono(''); setDocenteCorreo('');
      setFechaAsistencia(new Date().toISOString().split('T')[0]);
      cargarHistorial(grupoSeleccionado.id);
    } catch (error) {
      notificacion.error(error.message, 'Error al guardar');
    } finally {
      setCargando(false);
    }
  }

  const estudiantesFiltrados = estudiantes.filter(e => 
    e.nombre_completo.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (!usuario) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">📋 Registro de Asistencia</h1>
        <p className="text-gray-600 mb-6">{usuario.universidad}</p>

        {/* SELECTOR DE GRUPO */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Grupo:</label>
              <select 
                value={grupoSeleccionado?.id || ''} 
                onChange={e => setGrupoSeleccionado(grupos.find(g => g.id === e.target.value))} 
                className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white shadow-sm w-96"
              >
                {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
              {grupoSeleccionado && (
                <span className="text-xs bg-gray-100 px-3 py-1.5 rounded-full">
                  📅 {grupoSeleccionado.cohorte} | 📚 {grupoSeleccionado.programa}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
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
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button onClick={() => setVistaActiva('asistencia')} className={`pb-3 font-medium text-sm border-b-2 ${vistaActiva === 'asistencia' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}>
              📝 Tomar Asistencia
            </button>
            <button onClick={() => setVistaActiva('historial')} className={`pb-3 font-medium text-sm border-b-2 ${vistaActiva === 'historial' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}>
              📊 Mi Historial
            </button>
          </nav>
        </div>

        {/* VISTA: TOMAR ASISTENCIA */}
        {vistaActiva === 'asistencia' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div><label className="block text-xs text-gray-500 mb-1">Módulo/Clase *</label><input type="text" value={modulo} onChange={e => setModulo(e.target.value)} placeholder="Ej: Matemáticas" className="w-full border rounded-lg px-3 py-2.5 text-sm" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Fecha *</label><input type="date" value={fechaAsistencia} onChange={e => setFechaAsistencia(e.target.value)} max={new Date().toISOString().split('T')[0]} className="w-full border rounded-lg px-3 py-2.5 text-sm" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Nombre del Docente *</label><input type="text" value={docenteNombre} onChange={e => setDocenteNombre(e.target.value)} placeholder="Nombre completo" className="w-full border rounded-lg px-3 py-2.5 text-sm" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div><label className="block text-xs text-gray-500 mb-1">Teléfono</label><input type="text" value={docenteTelefono} onChange={e => setDocenteTelefono(e.target.value)} placeholder="3115551234" className="w-full border rounded-lg px-3 py-2.5 text-sm" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Correo</label><input type="email" value={docenteCorreo} onChange={e => setDocenteCorreo(e.target.value)} placeholder="docente@universidad.edu.co" className="w-full border rounded-lg px-3 py-2.5 text-sm" /></div>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Observaciones</label><textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" /></div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-5 border-b bg-gradient-to-r from-primary/10 to-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <h3 className="font-semibold">Estudiantes ({estudiantes.length})</h3>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm"><span className="text-green-600 font-bold">{estudiantes.length - inasistencias.length}</span> <span className="text-gray-500">Presentes</span></span>
                      <span className="text-sm"><span className="text-red-600 font-bold">{inasistencias.length}</span> <span className="text-gray-500">Ausentes</span></span>
                    </div>
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${estudiantes.length > 0 ? ((estudiantes.length - inasistencias.length) / estudiantes.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="text" placeholder="🔍 Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-64" />
                    <button onClick={marcarTodosPresentes} className="text-xs bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-200">✅ Todos presentes</button>
                    <button onClick={marcarTodosAusentes} className="text-xs bg-red-50 text-red-700 px-3 py-2 rounded-lg border border-red-200">❌ Todos ausentes</button>
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
                      
                      return (
                        <div 
                          key={est.id} 
                          onClick={() => toggleInasistencia(est.id)} 
                          className={`flex items-center p-3 rounded-xl border-2 transition-all ${
                            noSeleccionable 
                              ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed' 
                              : ausente 
                                ? 'bg-red-50 border-red-300 shadow-sm cursor-pointer' 
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
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-sm truncate">{est.nombre_completo}</p>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
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
                            <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full ml-2 flex-shrink-0">Ausente</span>
                          )}
                          {noSeleccionable && (
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full ml-2 flex-shrink-0">No aplica</span>
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
      </div>

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
                  <div>
                    <label className="block text-sm font-medium mb-1">Módulo/Clase *</label>
                    <input type="text" value={modulo} onChange={e => setModulo(e.target.value)} required className="w-full border rounded-lg px-3 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha *</label>
                    <input type="date" value={fechaAsistencia} onChange={e => setFechaAsistencia(e.target.value)} max={new Date().toISOString().split('T')[0]} required className="w-full border rounded-lg px-3 py-2.5 text-sm" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre del Docente *</label>
                    <input type="text" value={docenteNombre} onChange={e => setDocenteNombre(e.target.value)} required className="w-full border rounded-lg px-3 py-2.5 text-sm" />
                  </div>
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