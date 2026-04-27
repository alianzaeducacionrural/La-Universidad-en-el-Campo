// =============================================
// MODAL: REGISTRAR ACCIÓN DEL GRUPO (AJUSTADO)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';

const TIPOS_ACCION = [
  { id: 'visita_semana', label: 'Visita Semana', icono: '🏫', numerable: true, maxNumero: 2 },
  { id: 'visita_sabado', label: 'Visita Sábado', icono: '📅', numerable: true, maxNumero: 3 },
  { id: 'practica_academica', label: 'Práctica Académica', icono: '🎓', numerable: false },
  { id: 'comite_calidad', label: 'Comité de Calidad', icono: '📋', numerable: false },
  { id: 'bienestar_universitario', label: 'Bienestar Universitario', icono: '🎯', numerable: false },
  { id: 'otra', label: 'Otra Actividad', icono: '📝', numerable: false }
];

export default function ModalRegistrarAccion({ isOpen, onClose, grupo, padrino, onAccionRegistrada }) {
  const notificacion = useNotificacion();
  const [tipoAccion, setTipoAccion] = useState('');
  const [numeroAccion, setNumeroAccion] = useState(1);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [actividad, setActividad] = useState('');
  const [resultado, setResultado] = useState('');
  const [cargando, setCargando] = useState(false);
  const [accionesExistentes, setAccionesExistentes] = useState([]);

  useEffect(() => {
    if (isOpen && grupo) {
      cargarAccionesExistentes();
      resetFormulario();
    }
  }, [isOpen, grupo]);

  function resetFormulario() {
    setTipoAccion('');
    setNumeroAccion(1);
    setFecha(new Date().toISOString().split('T')[0]);
    setActividad('');
    setResultado('');
  }

  async function cargarAccionesExistentes() {
    const { data } = await supabase
      .from('acciones_grupo')
      .select('tipo_accion, numero_accion')
      .eq('grupo_id', grupo.id);
    
    if (data) setAccionesExistentes(data);
  }

  function getProximoNumero(tipo) {
    const accionesDelTipo = accionesExistentes.filter(a => a.tipo_accion === tipo);
    if (accionesDelTipo.length === 0) return 1;
    const maxNumero = Math.max(...accionesDelTipo.map(a => a.numero_accion));
    return maxNumero + 1;
  }

  function handleTipoChange(tipo) {
    setTipoAccion(tipo);
    const tipoConfig = TIPOS_ACCION.find(t => t.id === tipo);
    if (tipoConfig?.numerable) {
      setNumeroAccion(getProximoNumero(tipo));
    } else {
      setNumeroAccion(1);
    }
    // Limpiar campos al cambiar de tipo
    setActividad('');
    setResultado('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!tipoAccion) {
      notificacion.warning('Selecciona un tipo de acción', 'Campo requerido');
      return;
    }
    
    // Validar campos según el tipo
    if (tipoAccion === 'otra' && !actividad.trim()) {
      notificacion.warning('Describe la actividad', 'Campo requerido');
      return;
    }

    if (tipoAccion === 'otra' && !resultado.trim()) {
      notificacion.warning('Describe el resultado', 'Campo requerido');
      return;
    }
    
    setCargando(true);
    
    const tipoConfig = TIPOS_ACCION.find(t => t.id === tipoAccion);
    
    const { error } = await supabase
      .from('acciones_grupo')
      .insert([{
        grupo_id: grupo.id,
        padrino_id: padrino?.id,
        tipo_accion: tipoAccion,
        numero_accion: tipoConfig?.numerable ? numeroAccion : 1,
        fecha,
        actividad: tipoAccion === 'otra' ? actividad.trim() : tipoConfig?.label || '',
        resultado: tipoAccion === 'otra' ? resultado.trim() : null,
        observaciones: null
      }]);
    
    setCargando(false);
    
    if (error) {
      notificacion.error(error.message, 'Error al guardar');
    } else {
      notificacion.success('Acción registrada correctamente');
      resetFormulario();
      if (onAccionRegistrada) onAccionRegistrada();
      onClose();
    }
  }

  if (!isOpen || !grupo) return null;

  const tipoSeleccionado = TIPOS_ACCION.find(t => t.id === tipoAccion);
  const labelAccion = tipoSeleccionado 
    ? (tipoSeleccionado.numerable 
        ? `${tipoSeleccionado.label} #${numeroAccion}` 
        : tipoSeleccionado.label)
    : '';
  
  const esOtraActividad = tipoAccion === 'otra';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
        <div className="p-6 border-b bg-gradient-to-r from-primary/10 to-primary/5">
          <h3 className="text-lg font-bold text-gray-800">➕ Registrar Nueva Acción</h3>
          <p className="text-sm text-gray-600 mt-1">Grupo: {grupo.nombre}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Tipo de Acción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Acción *</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {TIPOS_ACCION.map(tipo => (
                  <button
                    key={tipo.id}
                    type="button"
                    onClick={() => handleTipoChange(tipo.id)}
                    className={`p-3 rounded-lg border text-sm font-medium transition flex items-center space-x-2 ${
                      tipoAccion === tipo.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{tipo.icono}</span>
                    <span>{tipo.label}</span>
                  </button>
                ))}
              </div>
              {labelAccion && !esOtraActividad && (
                <p className="text-xs text-primary mt-2 font-medium">
                  Se registrará como: {labelAccion}
                </p>
              )}
            </div>

            {/* Fecha (SIEMPRE VISIBLE) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha *</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                required
              />
            </div>

            {/* Campos SOLO para "Otra Actividad" */}
            {esOtraActividad && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actividad *</label>
                  <textarea
                    value={actividad}
                    onChange={(e) => setActividad(e.target.value)}
                    rows={3}
                    placeholder="Describe la actividad realizada..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resultado *</label>
                  <textarea
                    value={resultado}
                    onChange={(e) => setResultado(e.target.value)}
                    rows={2}
                    placeholder="¿Qué se logró? ¿Conclusiones?"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none"
                    required
                  />
                </div>
              </>
            )}
          </div>

          <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3 rounded-b-xl">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={cargando} className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50">
              {cargando ? 'Guardando...' : '💾 Guardar Acción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}