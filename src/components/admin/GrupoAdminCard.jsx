// =============================================
// COMPONENTE: TARJETA DE GRUPO (ADMIN) - COMPLETO CON EDITAR SEGUIMIENTO
// =============================================

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import { useAuth } from '../../context/AuthContext';
import ModalImportar from '../estudiantes/ModalImportar';
import ModalGestionarPadrinos from './ModalGestionarPadrinos';
import ModalEditarGrupo from './ModalEditarGrupo';
import ModalHistorialAsistencia from '../grupos/ModalHistorialAsistencia';
import ModalPerfilEstudiante from '../estudiantes/ModalPerfilEstudiante';
import ModalSeguimiento from '../estudiantes/ModalSeguimiento';
import ModalEditarEstudiante from '../estudiantes/ModalEditarEstudiante';
import ModalReportarDesercion from '../estudiantes/ModalReportarDesercion';
import ModalEditarSeguimiento from '../seguimientos/ModalEditarSeguimiento';
import ModalHistorialAcciones from '../grupos/ModalHistorialAcciones';

export default function GrupoAdminCard({ grupo, onRecargar }) {
  const notificacion = useNotificacion();
  const { perfil: usuario } = useAuth();

  // Estados de expansión y carga
  const [expandido, setExpandido] = useState(false);
  const [estudiantes, setEstudiantes] = useState([]);
  const [cargandoEstudiantes, setCargandoEstudiantes] = useState(false);
  const [importando, setImportando] = useState(false);

  // Estados de modales del grupo
  const [modalImportar, setModalImportar] = useState(false);
  const [modalPadrinos, setModalPadrinos] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [modalAcciones, setModalAcciones] = useState(false);

  // Estados para perfil del estudiante
  const [modalPerfil, setModalPerfil] = useState(false);
  const [modalSeguimiento, setModalSeguimiento] = useState(false);
  const [modalEditarEstudiante, setModalEditarEstudiante] = useState(false);
  const [modalReportarDesercion, setModalReportarDesercion] = useState(false);
  const [modalEditarSeguimiento, setModalEditarSeguimiento] = useState(false);
  
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [inasistenciaActual, setInasistenciaActual] = useState(null);
  const [seguimientoSeleccionado, setSeguimientoSeleccionado] = useState(null);

  // Estados para datos del perfil
  const [historialEstudiante, setHistorialEstudiante] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  async function cargarEstudiantes() {
    setCargandoEstudiantes(true);
    const { data } = await supabase
      .from('estudiantes')
      .select('*')
      .eq('grupo_id', grupo.id)
      .order('nombre_completo');
    if (data) setEstudiantes(data);
    setCargandoEstudiantes(false);
  }

  async function cargarHistorial(estudianteId) {
    setCargandoHistorial(true);
    const { data } = await supabase
      .from('seguimientos')
      .select(`*, padrino:padrino_id (nombre_completo)`)
      .eq('estudiante_id', estudianteId)
      .order('fecha_contacto', { ascending: false });
    if (data) setHistorialEstudiante(data);
    setCargandoHistorial(false);
  }

  function toggleExpandir() {
    if (!expandido && estudiantes.length === 0) {
      cargarEstudiantes();
    }
    setExpandido(!expandido);
  }

  function handleVerPerfil(estudiante) {
    setEstudianteSeleccionado(estudiante);
    cargarHistorial(estudiante.id);
    setModalPerfil(true);
  }

  function handleSeguimiento(estudiante, inasistencia = null) {
    setEstudianteSeleccionado(estudiante);
    setInasistenciaActual(inasistencia);
    setModalPerfil(false);
    setModalSeguimiento(true);
  }

  function handleEditar(estudiante) {
    setEstudianteSeleccionado(estudiante);
    setModalPerfil(false);
    setModalEditarEstudiante(true);
  }

  function handleEditarSeguimiento(seguimiento) {
    setSeguimientoSeleccionado(seguimiento);
    setModalEditarSeguimiento(true);
  }

  function handleReportarDesercion(estudiante) {
    setEstudianteSeleccionado(estudiante);
    setModalPerfil(false);
    setModalReportarDesercion(true);
  }

  async function handleGuardarSeguimiento(datos) {
    const datosCompletos = {
      ...datos,
      padrino_id: usuario?.id
    };
    
    // 🔥 CORRECCIÓN: Usar .select().single() para obtener el registro creado
    const { data, error } = await supabase
      .from('seguimientos')
      .insert([datosCompletos])
      .select()
      .single();
    
    if (error) return { success: false, error: error.message };
    
    if (inasistenciaActual?.id) {
      await supabase.from('inasistencias').update({ estado_seguimiento: 'realizado' }).eq('id', inasistenciaActual.id);
    }
    
    // 🔥 Devolver el data con el id del seguimiento creado
    return { success: true, data };
  }

  async function handleActualizarEstudiante(id, datos) {
    const { error } = await supabase.from('estudiantes').update(datos).eq('id', id);
    if (error) return { success: false, error: error.message };
    cargarEstudiantes();
    return { success: true };
  }

  async function handleActualizarSeguimiento(id, datos) {
    const { error } = await supabase.from('seguimientos').update(datos).eq('id', id);
    if (error) return { success: false, error: error.message };
    if (estudianteSeleccionado) cargarHistorial(estudianteSeleccionado.id);
    return { success: true };
  }

  async function handleCambiarEstado(id, nuevoEstado) {
    if (nuevoEstado === 'Desertor') {
      setModalPerfil(false);
      setModalReportarDesercion(true);
      return { success: true };
    }
    const { error } = await supabase.from('estudiantes').update({ estado: nuevoEstado }).eq('id', id);
    if (error) return { success: false, error: error.message };
    cargarEstudiantes();
    notificacion.success(`Estado actualizado a: ${nuevoEstado}`);
    return { success: true };
  }

  async function handleImportar(archivoExcel) {
    setImportando(true);
    try {
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onload = async (e) => {
          const XLSX = await import('xlsx');
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          let insertados = 0;
          let errores = 0;

          for (const row of jsonData) {
            const estudiante = {
              nombre_completo: row.nombre_completo || row['Nombre Completo'] || '',
              documento: (row.documento || row['Documento'] || '')?.toString(),
              genero: row.genero || row['Género'] || row['Genero'] || null,
              telefono: (row.telefono || row['Teléfono'] || row['Telefono'] || '')?.toString(),
              correo: row.correo || row['Correo'] || row['Email'] || null,
              acudiente_nombre: row.acudiente_nombre || row['Acudiente'] || row['Nombre Acudiente'] || null,
              acudiente_telefono: (row.acudiente_telefono || row['Tel. Acudiente'] || row['Telefono Acudiente'] || '')?.toString(),
              municipio: row.municipio || row['Municipio'] || '',
              institucion_educativa: row.institucion_educativa || row['Institución Educativa'] || row['Institucion'] || '',
              cohorte: grupo.cohorte,
              programa: grupo.programa,
              universidad: grupo.universidad,
              grupo_id: grupo.id,
              estado: 'Activo',
              total_faltas: 0
            };

            if (!estudiante.nombre_completo || !estudiante.municipio || !estudiante.institucion_educativa) {
              errores++;
              continue;
            }

            const { error } = await supabase.from('estudiantes').upsert([estudiante], { onConflict: 'documento' });
            if (error) { errores++; } else { insertados++; }
          }

          setImportando(false);
          notificacion.success(`Importación: ${insertados} insertados, ${errores} errores`);
          onRecargar();
          cargarEstudiantes();
          resolve({ success: true, insertados, errores });
        };
        reader.readAsArrayBuffer(archivoExcel);
      });
    } catch (error) {
      setImportando(false);
      notificacion.error(error.message, 'Error al importar');
      return { success: false, error: error.message };
    }
  }

  async function handleCambiarEstadoGrupo() {
    const nuevoEstado = !grupo.activo;
    const mensaje = nuevoEstado
      ? '¿Estás seguro de REACTIVAR este grupo?'
      : '¿Estás seguro de FINALIZAR este grupo? Los padrinos ya no podrán verlo.';

    if (!confirm(mensaje)) return;

    setCambiandoEstado(true);
    const { error } = await supabase.from('grupos').update({ activo: nuevoEstado }).eq('id', grupo.id);
    setCambiandoEstado(false);

    if (error) {
      notificacion.error(error.message, 'Error al cambiar estado');
    } else {
      notificacion.success(nuevoEstado ? 'Grupo reactivado correctamente' : 'Grupo finalizado correctamente');
      onRecargar();
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Cabecera */}
      <div onClick={toggleExpandir} className="p-5 cursor-pointer hover:bg-gray-50 transition">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className={`transition-transform duration-300 ${expandido ? 'rotate-90' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </span>
            <div>
              <h3 className="font-semibold text-gray-800">{grupo.nombre}</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">🎓 {grupo.universidad}</span>
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">📚 {grupo.programa}</span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">👥 {grupo.total_estudiantes} estudiantes</span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">📅 Cohorte {grupo.cohorte}</span>
              </div>
              {grupo.padrinos?.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">👤 Padrinos: {grupo.padrinos.map(p => p.nombre_completo).join(', ')}</p>
              )}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${grupo.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
            {grupo.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>

      {/* Contenido expandido */}
      {expandido && (
        <div className="border-t border-gray-200 bg-gray-50 p-5">
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={(e) => { e.stopPropagation(); setModalEditar(true); }} className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition">✏️ Editar</button>
            <button onClick={(e) => { e.stopPropagation(); setModalPadrinos(true); }} className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition">👥 Gestionar Padrinos</button>
            <button onClick={(e) => { e.stopPropagation(); setModalImportar(true); }} disabled={importando} className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50">{importando ? '⏳ Importando...' : '📥 Importar Estudiantes'}</button>
            <button onClick={(e) => { e.stopPropagation(); setModalHistorial(true); }} className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition">📊 Ver Historial</button>
            <button onClick={(e) => { e.stopPropagation(); setModalAcciones(true); }} className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition">📋 Acciones Desarroladas</button>
            <button onClick={(e) => { e.stopPropagation(); handleCambiarEstadoGrupo(); }} disabled={cambiandoEstado} className={`px-3 py-1.5 rounded-lg text-sm text-white transition ${grupo.activo ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}`}>{grupo.activo ? '🔄 Finalizar Grupo' : '✅ Reactivar Grupo'}</button>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-2">📋 Estudiantes ({estudiantes.length})</h4>
            {importando ? (
              <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div><p className="text-gray-500 text-sm">Importando estudiantes...</p></div>
            ) : cargandoEstudiantes ? (
              <div className="text-center py-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600 mx-auto"></div></div>
            ) : estudiantes.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No hay estudiantes registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr><th className="text-left py-2 px-3 rounded-l-lg">Nombre</th><th className="text-left py-2 px-3">Estado</th><th className="text-left py-2 px-3">Faltas</th><th className="text-left py-2 px-3">Municipio</th><th className="text-right py-2 px-3 rounded-r-lg">Acción</th></tr>
                  </thead>
                  <tbody>
                    {estudiantes.map(est => (
                      <tr key={est.id} className="border-b border-gray-100 hover:bg-white transition">
                        <td className="py-2 px-3 font-medium">{est.nombre_completo}</td>
                        <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-xs ${est.estado === 'Activo' ? 'bg-green-100 text-green-700' : est.estado === 'Desertor' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{est.estado || 'Activo'}</span></td>
                        <td className="py-2 px-3">{est.total_faltas || 0}</td>
                        <td className="py-2 px-3 text-gray-500">{est.municipio}</td>
                        <td className="py-2 px-3 text-right"><button onClick={(e) => { e.stopPropagation(); handleVerPerfil(est); }} className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded text-xs font-medium transition">👁️ Ver</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALES */}
      <ModalImportar isOpen={modalImportar} onClose={() => setModalImportar(false)} onImportar={handleImportar} grupoSeleccionado={grupo} />
      <ModalGestionarPadrinos isOpen={modalPadrinos} onClose={() => setModalPadrinos(false)} grupo={grupo} onRecargar={onRecargar} />
      <ModalEditarGrupo isOpen={modalEditar} onClose={() => setModalEditar(false)} grupo={grupo} onRecargar={onRecargar} />
      <ModalHistorialAsistencia isOpen={modalHistorial} onClose={() => setModalHistorial(false)} grupo={grupo} />
      <ModalHistorialAcciones isOpen={modalAcciones} onClose={() => setModalAcciones(false)} grupo={grupo}/>

      <ModalPerfilEstudiante
        isOpen={modalPerfil}
        onClose={() => { setModalPerfil(false); setEstudianteSeleccionado(null); }}
        estudiante={estudianteSeleccionado}
        historial={historialEstudiante}
        cargandoHistorial={cargandoHistorial}
        onCargarHistorial={cargarHistorial}
        onSeguimiento={handleSeguimiento}
        onEditar={handleEditar}
        onEditarSeguimiento={handleEditarSeguimiento}
        onReportarDesercion={handleReportarDesercion}
        puedeGestionar={true}
        onEstadoChange={async (id, estado) => {
        const result = await handleCambiarEstado(id, estado);
        cargarEstudiantes(); // 🔥 Recargar lista de estudiantes
        return result;
      }}
      />

      <ModalSeguimiento
        isOpen={modalSeguimiento}
        onClose={() => { setModalSeguimiento(false); setEstudianteSeleccionado(null); setInasistenciaActual(null); }}
        onGuardar={handleGuardarSeguimiento}
        estudiante={estudianteSeleccionado}
      />

      <ModalEditarEstudiante
        isOpen={modalEditarEstudiante}
        onClose={() => { setModalEditarEstudiante(false); setEstudianteSeleccionado(null); }}
        onGuardar={handleActualizarEstudiante}
        estudiante={estudianteSeleccionado}
        puedeGestionar={true}
      />

      <ModalReportarDesercion
        isOpen={modalReportarDesercion}
        onClose={() => { setModalReportarDesercion(false); setEstudianteSeleccionado(null); }}
        onConfirmar={() => { cargarEstudiantes(); onRecargar(); }}
        estudiante={estudianteSeleccionado}
        usuario={usuario}
      />

      <ModalEditarSeguimiento
        isOpen={modalEditarSeguimiento}
        onClose={() => { setModalEditarSeguimiento(false); setSeguimientoSeleccionado(null); }}
        onGuardar={handleActualizarSeguimiento}
        seguimiento={seguimientoSeleccionado}
      />
    </div>
  );
}