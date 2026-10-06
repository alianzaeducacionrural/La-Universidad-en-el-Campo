// =============================================
// MODAL: PRUEBAS SABER TYT DEL GRUPO
// =============================================

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import { emitirEstudianteActualizado } from '../../hooks/useEstudianteActualizado';
import { MOTIVO_TYT_REPITENTE, SABER_TYT, estadoSaberTyt, interpretarError } from '../../utils/helpers';

const OTRA = 'otra';

const OPCIONES_PRESENTO = [
  { valor: true, etiqueta: SABER_TYT.PRESENTO, activo: 'bg-green-600 border-green-600' },
  { valor: false, etiqueta: SABER_TYT.NO_PRESENTO, activo: 'bg-red-600 border-red-600' },
  { valor: null, etiqueta: SABER_TYT.SIN_REGISTRO, activo: 'bg-gray-500 border-gray-500' }
];

const COLOR_ESTADO = {
  [SABER_TYT.PRESENTO]: 'bg-green-100 text-green-700',
  [SABER_TYT.NO_PRESENTO]: 'bg-red-100 text-red-700',
  [SABER_TYT.SIN_REGISTRO]: 'bg-gray-100 text-gray-600'
};

function aFormulario(estudiante) {
  const motivo = estudiante.saber_tyt_motivo || '';
  return {
    presento: estudiante.saber_tyt_presento ?? null,
    tipoMotivo: motivo === MOTIVO_TYT_REPITENTE ? MOTIVO_TYT_REPITENTE : (motivo ? OTRA : ''),
    motivoLibre: motivo === MOTIVO_TYT_REPITENTE ? '' : motivo
  };
}

function aDatos(formulario) {
  if (formulario.presento !== false) return { saber_tyt_presento: formulario.presento, saber_tyt_motivo: null };
  const motivo = formulario.tipoMotivo === MOTIVO_TYT_REPITENTE ? MOTIVO_TYT_REPITENTE : formulario.motivoLibre.trim();
  return { saber_tyt_presento: false, saber_tyt_motivo: motivo || null };
}

const faltaMotivo = (f) => f.presento === false && (!f.tipoMotivo || (f.tipoMotivo === OTRA && !f.motivoLibre.trim()));

export default function ModalSaberTyT({ isOpen, onClose, grupo, institucionesPermitidas = null }) {
  const notificacion = useNotificacion();
  const [estudiantes, setEstudiantes] = useState([]);
  const [formularios, setFormularios] = useState({});
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen && grupo) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, grupo]);

  async function cargar() {
    setCargando(true);
    let query = supabase
      .from('estudiantes')
      .select('id, nombre_completo, documento, estado, institucion_educativa, saber_tyt_presento, saber_tyt_motivo')
      .eq('grupo_id', grupo.id)
      .order('nombre_completo');
    if (institucionesPermitidas) query = query.in('institucion_educativa', institucionesPermitidas);
    const { data, error } = await query;
    setCargando(false);
    if (error) {
      notificacion.error(interpretarError(error), 'Error al cargar estudiantes');
      return;
    }
    setEstudiantes(data);
    setFormularios(Object.fromEntries(data.map(e => [e.id, aFormulario(e)])));
  }

  function cambiar(id, cambios) {
    setFormularios(prev => ({ ...prev, [id]: { ...prev[id], ...cambios } }));
  }

  const modificados = useMemo(() => estudiantes.filter(e => {
    const f = formularios[e.id];
    if (!f) return false;
    const nuevo = aDatos(f);
    return nuevo.saber_tyt_presento !== (e.saber_tyt_presento ?? null) || nuevo.saber_tyt_motivo !== (e.saber_tyt_motivo ?? null);
  }), [estudiantes, formularios]);

  const resumen = useMemo(() => {
    const conteo = { [SABER_TYT.PRESENTO]: 0, [SABER_TYT.NO_PRESENTO]: 0, [SABER_TYT.SIN_REGISTRO]: 0 };
    estudiantes.forEach(e => { conteo[estadoSaberTyt({ saber_tyt_presento: formularios[e.id]?.presento })]++; });
    return conteo;
  }, [estudiantes, formularios]);

  async function guardar() {
    const sinMotivo = modificados.filter(e => faltaMotivo(formularios[e.id]));
    if (sinMotivo.length > 0) {
      notificacion.warning(`Indica por qué no presentó la prueba: ${sinMotivo.map(e => e.nombre_completo).join(', ')}`, 'Falta el motivo');
      return;
    }

    setGuardando(true);
    const resultados = await Promise.all(modificados.map(async e => {
      const datos = aDatos(formularios[e.id]);
      const { error } = await supabase.from('estudiantes').update(datos).eq('id', e.id);
      if (!error) emitirEstudianteActualizado(e.id, datos);
      return { id: e.id, datos, error };
    }));
    setGuardando(false);

    const guardados = new Map(resultados.filter(r => !r.error).map(r => [r.id, r.datos]));
    setEstudiantes(prev => prev.map(e => (guardados.has(e.id) ? { ...e, ...guardados.get(e.id) } : e)));

    const fallidos = resultados.length - guardados.size;
    if (fallidos > 0) {
      notificacion.error(`No se guardaron ${fallidos} de ${resultados.length} cambios. Intenta de nuevo.`, 'Error al guardar');
      return;
    }
    notificacion.success(`Saber TyT actualizado para ${guardados.size} estudiante(s)`);
    onClose();
  }

  if (!isOpen || !grupo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl">
        <div className="p-6 border-b border-gray-200 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-800">📝 Pruebas Saber TyT</h3>
            <p className="text-sm text-gray-600 mt-1">{grupo.nombre}</p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              {Object.entries(resumen).map(([estado, n]) => (
                <span key={estado} className={`px-2.5 py-1 rounded-full font-medium ${COLOR_ESTADO[estado]}`}>{estado}: {n}</span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition flex-shrink-0">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {cargando ? (
            <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : estudiantes.length === 0 ? (
            <p className="text-center text-gray-500 py-12">
              Este grupo no tiene estudiantes{institucionesPermitidas ? ' en tus instituciones asignadas' : ''}.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {estudiantes.map(e => {
                const f = formularios[e.id] || aFormulario(e);
                return (
                  <div key={e.id} className={`p-3 md:p-4 ${faltaMotivo(f) ? 'bg-red-50/50' : ''}`}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800">{e.nombre_completo}</p>
                        <p className="text-xs text-gray-500">
                          {e.documento || 'Sin documento'} · {e.institucion_educativa}
                          {e.estado && e.estado !== 'Activo' && <span className="ml-1 text-amber-700">· {e.estado}</span>}
                        </p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        {OPCIONES_PRESENTO.map(op => (
                          <button
                            key={op.etiqueta}
                            type="button"
                            onClick={() => cambiar(e.id, { presento: op.valor })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                              f.presento === op.valor ? `${op.activo} text-white` : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {op.etiqueta}
                          </button>
                        ))}
                      </div>
                    </div>

                    {f.presento === false && (
                      <div className="mt-3 flex flex-col sm:flex-row gap-2 md:pl-4">
                        <select
                          value={f.tipoMotivo}
                          onChange={ev => cambiar(e.id, { tipoMotivo: ev.target.value })}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm sm:w-60"
                        >
                          <option value="">¿Por qué no la presentó?</option>
                          <option value={MOTIVO_TYT_REPITENTE}>Repitente</option>
                          <option value={OTRA}>Otra situación…</option>
                        </select>
                        {f.tipoMotivo === OTRA && (
                          <input
                            type="text"
                            value={f.motivoLibre}
                            onChange={ev => cambiar(e.id, { motivoLibre: ev.target.value })}
                            placeholder="Describe la situación"
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 bg-gray-50 border-t flex items-center justify-between gap-3 rounded-b-xl">
          <p className="text-xs text-gray-500">{modificados.length > 0 ? `${modificados.length} cambio(s) sin guardar` : 'Sin cambios'}</p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cerrar</button>
            <button
              type="button"
              onClick={guardar}
              disabled={guardando || modificados.length === 0}
              className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
