import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import { formatearFecha } from '../../utils/helpers';

export default function ModalAsistenciaCompleta({ isOpen, onClose, registro, grupo, padrino, onRegistrado }) {
  const notificacion = useNotificacion();
  const [fecha, setFecha] = useState('');
  const [resultado, setResultado] = useState('Asistencia completa');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (registro) {
      setFecha(registro.fecha);
      setResultado('Asistencia completa');
    }
  }, [registro]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!resultado.trim()) {
      notificacion.warning('Escribe un resultado', 'Campo requerido');
      return;
    }
    setCargando(true);

    const { error } = await supabase.from('acciones_grupo').insert([{
      grupo_id: grupo.id,
      padrino_id: padrino?.id,
      tipo_accion: 'asistencia_completa',
      numero_accion: 1,
      fecha,
      actividad: 'Reporte de Asistencia Completa',
      resultado: resultado.trim(),
      observaciones: String(registro.id)
    }]);

    setCargando(false);

    if (error) {
      notificacion.error(error.message, 'Error al guardar');
    } else {
      notificacion.success('Acción registrada correctamente');
      onRegistrado();
      onClose();
    }
  }

  if (!isOpen || !registro || !grupo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
        <div className="p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <h3 className="text-lg font-bold text-gray-800">✅ Registrar Asistencia Completa</h3>
          <p className="text-sm text-gray-600 mt-1">Grupo: {grupo.nombre}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              <p className="font-medium mb-1">📋 Reporte sin ausencias</p>
              <p>{registro.modulo} · {formatearFecha(registro.fecha)}</p>
              {registro.docente_nombre && <p className="text-green-700 mt-0.5">👨‍🏫 {registro.docente_nombre}</p>}
            </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resultado *</label>
              <textarea
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                rows={3}
                placeholder="Ej: Asistencia completa"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none"
                required
              />
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3 rounded-b-xl">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
            >
              {cargando ? 'Guardando...' : '💾 Guardar Acción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
