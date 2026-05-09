import { useState, useEffect } from 'react';
import { useNotificacion } from '../../context/NotificacionContext';
import { supabase } from '../../lib/supabaseClient';

export default function ModalIngresarNotas({ isOpen, onClose, onGuardar, grupoId, estudiantes, notaEditando = null }) {
  const notificacion = useNotificacion();
  const [cargando, setCargando] = useState(false);
  const [modulo, setModulo] = useState('');
  const [fecha, setFecha] = useState('');
  const [docente, setDocente] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [notas, setNotas] = useState({});

  const fechaHoy = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!isOpen) return;
    if (notaEditando) {
      setModulo(notaEditando.modulo);
      setFecha(notaEditando.fecha_evaluacion);
      setDocente(notaEditando.docente_nombre);
      setObservaciones(notaEditando.observaciones || '');
      const init = {};
      (notaEditando.notas_estudiantes || []).forEach(ne => {
        if (ne.nota !== null && ne.nota !== undefined) {
          init[ne.estudiante_id] = String(ne.nota);
        }
      });
      setNotas(init);
    } else {
      setModulo('');
      setFecha(fechaHoy);
      setDocente('');
      setObservaciones('');
      setNotas({});
    }
  }, [isOpen, notaEditando]);

  function setNota(estId, valor) {
    setNotas(prev => ({ ...prev, [estId]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!modulo.trim()) return notificacion.warning('Ingresa el nombre del módulo');
    if (!docente.trim()) return notificacion.warning('Ingresa el nombre del docente');

    for (const [, valor] of Object.entries(notas)) {
      if (valor !== '') {
        const num = parseFloat(valor);
        if (isNaN(num) || num < 0 || num > 5) {
          notificacion.warning('Las notas deben estar entre 0.0 y 5.0');
          return;
        }
      }
    }

    setCargando(true);
    try {
      let notaModuloId;

      if (notaEditando) {
        await supabase
          .from('notas_modulos')
          .update({
            modulo: modulo.trim(),
            fecha_evaluacion: fecha,
            docente_nombre: docente.trim(),
            observaciones: observaciones.trim() || null
          })
          .eq('id', notaEditando.id);
        notaModuloId = notaEditando.id;
        await supabase.from('notas_estudiantes').delete().eq('nota_modulo_id', notaEditando.id);
      } else {
        const { data, error } = await supabase
          .from('notas_modulos')
          .insert([{
            grupo_id: grupoId,
            modulo: modulo.trim(),
            fecha_evaluacion: fecha,
            docente_nombre: docente.trim(),
            observaciones: observaciones.trim() || null
          }])
          .select()
          .single();
        if (error) throw error;
        notaModuloId = data.id;
      }

      const filas = Object.entries(notas)
        .filter(([, v]) => v !== '' && v !== undefined && v !== null)
        .map(([estId, v]) => ({
          nota_modulo_id: notaModuloId,
          estudiante_id: estId,
          nota: parseFloat(v)
        }));

      if (filas.length > 0) {
        const { error } = await supabase.from('notas_estudiantes').insert(filas);
        if (error) throw error;
      }

      notificacion.success(notaEditando ? 'Notas actualizadas correctamente' : 'Notas registradas correctamente');
      onGuardar();
      onClose();
    } catch (err) {
      notificacion.error(err.message, 'Error al guardar');
    } finally {
      setCargando(false);
    }
  }

  if (!isOpen) return null;

  const activos = estudiantes.filter(e => e.estado !== 'Desertor' && e.estado !== 'Graduado');
  const inactivos = estudiantes.filter(e => e.estado === 'Desertor' || e.estado === 'Graduado');
  const ingresadas = Object.values(notas).filter(v => v !== '').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">
            {notaEditando ? '✏️ Editar Notas de Módulo' : '📊 Ingresar Notas Finales'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">Escala colombiana 0.0 – 5.0 · Aprobado ≥ 3.0</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Módulo / Materia *</label>
                <input
                  type="text"
                  value={modulo}
                  onChange={e => setModulo(e.target.value)}
                  required
                  placeholder="Ej: Matemáticas Básicas"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Evaluación *</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  required
                  max={fechaHoy}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Docente *</label>
              <input
                type="text"
                value={docente}
                onChange={e => setDocente(e.target.value)}
                required
                placeholder="Nombre completo del docente"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
              <textarea
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                rows={2}
                placeholder="Observaciones generales del módulo (opcional)..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Notas por Estudiante</p>
                <span className="text-xs text-gray-500">
                  {ingresadas}/{activos.length} ingresadas · Dejar en blanco si no aplica
                </span>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 grid grid-cols-12 gap-2 border-b border-gray-200">
                  <span className="col-span-8 text-xs font-medium text-gray-600">Estudiante</span>
                  <span className="col-span-4 text-xs font-medium text-gray-600 text-center">Nota (0–5)</span>
                </div>

                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {activos.map(est => {
                    const val = notas[est.id] ?? '';
                    const num = parseFloat(val);
                    const tieneNota = val !== '';
                    return (
                      <div key={est.id} className="px-4 py-2.5 grid grid-cols-12 gap-2 items-center hover:bg-gray-50">
                        <div className="col-span-8">
                          <p className="text-sm font-medium text-gray-800">{est.nombre_completo}</p>
                          <p className="text-xs text-gray-500">{est.municipio}</p>
                        </div>
                        <div className="col-span-4 flex justify-center">
                          <input
                            type="number"
                            min="0"
                            max="5"
                            step="0.1"
                            value={val}
                            onChange={e => setNota(est.id, e.target.value)}
                            placeholder="–"
                            className={`w-20 text-center border rounded-lg px-2 py-1.5 text-sm font-medium transition outline-none ${
                              tieneNota && num >= 3
                                ? 'border-green-300 bg-green-50 text-green-700'
                                : tieneNota && num < 3
                                ? 'border-red-300 bg-red-50 text-red-700'
                                : 'border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {inactivos.length > 0 && (
                    <>
                      <div className="px-4 py-1.5 bg-gray-100 border-t border-gray-200">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                          No aplica · {inactivos.length} estudiante{inactivos.length > 1 ? 's' : ''}
                        </p>
                      </div>
                      {inactivos.map(est => (
                        <div key={est.id} className="px-4 py-2.5 grid grid-cols-12 gap-2 items-center bg-gray-50 opacity-60">
                          <div className="col-span-8">
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-gray-500 line-through">{est.nombre_completo}</p>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                                est.estado === 'Desertor' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                              }`}>
                                {est.estado}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">{est.municipio}</p>
                          </div>
                          <div className="col-span-4 flex justify-center">
                            <div className="w-20 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-400 bg-gray-100 cursor-not-allowed select-none">
                              N/A
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 rounded-b-xl">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm transition">
              Cancelar
            </button>
            <button type="submit" disabled={cargando}
              className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
              {cargando ? 'Guardando...' : notaEditando ? 'Actualizar Notas' : 'Guardar Notas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
