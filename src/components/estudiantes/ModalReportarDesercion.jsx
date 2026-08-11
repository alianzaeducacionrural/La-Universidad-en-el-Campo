// =============================================
// MODAL: REPORTAR DESERCIÓN (CON VALOR DE MULTA)
// =============================================

import { useState } from 'react';
import { useNotificacion } from '../../context/NotificacionContext';
import { supabase } from '../../lib/supabaseClient';
import { interpretarError } from '../../utils/helpers';

const MOTIVOS_DESERCION = [
  { value: 'Cambio de domicilio', label: 'Cambio de domicilio' },
  { value: 'Situación económica', label: 'Situación económica' },
  { value: 'Problemas de salud', label: 'Problemas de salud' },
  { value: 'Embarazo/Maternidad', label: 'Embarazo/Maternidad' },
  { value: 'Ingreso a otro programa', label: 'Ingreso a otro programa' },
  { value: 'Problemas familiares', label: 'Problemas familiares' },
  { value: 'Rendimiento académico', label: 'Rendimiento académico' },
  { value: 'Falta de conectividad', label: 'Falta de conectividad' },
  { value: 'Desmotivación', label: 'Desmotivación' },
  { value: 'Otro', label: 'Otro' }
];

export default function ModalReportarDesercion({ 
  isOpen, 
  onClose, 
  onConfirmar,
  estudiante,
  usuario 
}) {
  const notificacion = useNotificacion();
  const [cargando, setCargando] = useState(false);
  const [sinDatos, setSinDatos] = useState(false);
  const [tipoDesercion, setTipoDesercion] = useState('Sin Justificar');
  const [motivo, setMotivo] = useState('');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [valorMulta, setValorMulta] = useState('');
  const [cartaRetiro, setCartaRetiro] = useState(null);
  const [soporteAdicional, setSoporteAdicional] = useState(null);

  const subirArchivo = async (archivo, tipo, registroId) => {
    if (!archivo) return null;
    
    const nombreSeguro = archivo.name
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const nombreArchivo = `${Date.now()}_${nombreSeguro}`;
    const ruta = `desercion/${registroId}/${tipo}/${nombreArchivo}`;
    
    const { error } = await supabase.storage.from('evidencias').upload(ruta, archivo);

    if (error) throw error;
    
    const { data: urlData } = supabase.storage.from('evidencias').getPublicUrl(ruta);
    
    return {
      url: urlData.publicUrl,
      nombre: archivo.name,
      tamanio: archivo.size
    };
  };

  async function handleSubmit(e) {
    e.preventDefault();

    if (sinDatos) {
      setCargando(true);
      try {
        const { error } = await supabase.rpc('reportar_desercion', {
          p_estudiante_id: estudiante.id,
          p_usuario_id: usuario.id,
          p_tipo_desercion: null,
          p_motivo_principal: null,
          p_motivo_otro: null,
          p_observaciones: observaciones || null,
          p_valor_multa: null,
          p_carta_nombre: null,
          p_carta_url: null,
          p_carta_tamanio: null,
          p_soporte_nombre: null,
          p_soporte_url: null,
          p_soporte_tamanio: null
        });

        if (error) throw error;

        notificacion.success(`${estudiante.nombre_completo} quedó reportado como Desertor, pendiente de información`);
        onConfirmar();
        onClose();
      } catch (error) {
        console.error('Error:', error);
        notificacion.error(interpretarError(error), 'Error al reportar deserción');
      } finally {
        setCargando(false);
      }
      return;
    }

    if (!cartaRetiro) {
      notificacion.warning('La carta de retiro de la institución educativa es obligatoria', 'Documento requerido');
      return;
    }

    if (tipoDesercion === 'Justificada' && !soporteAdicional) {
      notificacion.warning('Para deserción justificada, debe adjuntar un soporte adicional', 'Documento requerido');
      return;
    }

    // Validar valor de multa para deserción sin justificar
    if (tipoDesercion === 'Sin Justificar') {
      if (!valorMulta || parseFloat(valorMulta) <= 0) {
        notificacion.warning('Ingresa el valor de la multa', 'Campo requerido');
        return;
      }
    }

    setCargando(true);

    try {
      // Subir los archivos ANTES de escribir nada en la base de datos. La carpeta de
      // almacenamiento se identifica con un id generado en el cliente (no el id real del
      // registro, que todavía no existe) para poder subir sin depender de una fila creada.
      // Así, si la subida falla, no queda ningún registro/multa huérfano para reintentar
      // y terminar duplicando (esto era justo lo que generaba multas duplicadas).
      const carpetaSubida = crypto.randomUUID();
      const cartaData = await subirArchivo(cartaRetiro, 'carta_retiro_ie', carpetaSubida);
      const soporteData = soporteAdicional ? await subirArchivo(soporteAdicional, 'soporte', carpetaSubida) : null;

      // El resto (registro, multa, documentos, historial y cambio de estado) se hace en una
      // sola transacción en la base de datos: o se guarda todo, o no se guarda nada.
      const { error } = await supabase.rpc('reportar_desercion', {
        p_estudiante_id: estudiante.id,
        p_usuario_id: usuario.id,
        p_tipo_desercion: tipoDesercion,
        p_motivo_principal: motivo,
        p_motivo_otro: motivo === 'Otro' ? motivoOtro : null,
        p_observaciones: observaciones || null,
        p_valor_multa: tipoDesercion === 'Sin Justificar' ? parseFloat(valorMulta) : null,
        p_carta_nombre: cartaData?.nombre || null,
        p_carta_url: cartaData?.url || null,
        p_carta_tamanio: cartaData?.tamanio || null,
        p_soporte_nombre: soporteData?.nombre || null,
        p_soporte_url: soporteData?.url || null,
        p_soporte_tamanio: soporteData?.tamanio || null
      });

      if (error) throw error;

      notificacion.success(`${estudiante.nombre_completo} ha sido reportado como Desertor`);
      onConfirmar();
      onClose();

    } catch (error) {
      console.error('Error:', error);
      notificacion.error(interpretarError(error), 'Error al reportar deserción');
    } finally {
      setCargando(false);
    }
  }

  if (!isOpen || !estudiante) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b bg-gradient-to-r from-red-50 to-orange-50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            <span className="text-2xl mr-2">🚨</span>
            Reportar Deserción
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Estudiante: <span className="font-medium">{estudiante.nombre_completo}</span>
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            {/* Reportar sin datos (solo admin) */}
            {usuario?.rol === 'admin' && (
              <label className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sinDatos}
                  onChange={(e) => setSinDatos(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-700">
                  📋 Reportar sin información todavía (pendiente) — se podrá completar después con "Editar"
                </span>
              </label>
            )}

            {/* Tipo de Deserción */}
            {!sinDatos && (
            <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Deserción *
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="Justificada"
                    checked={tipoDesercion === 'Justificada'}
                    onChange={(e) => setTipoDesercion(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">Justificada</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="Sin Justificar"
                    checked={tipoDesercion === 'Sin Justificar'}
                    onChange={(e) => setTipoDesercion(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">Sin Justificar</span>
                </label>
              </div>
            </div>
            
            {/* Motivo Principal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo Principal *
              </label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
              >
                <option value="">Seleccionar motivo...</option>
                {MOTIVOS_DESERCION.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            
            {/* Motivo Otro */}
            {motivo === 'Otro' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Especificar motivo *
                </label>
                <input
                  type="text"
                  value={motivoOtro}
                  onChange={(e) => setMotivoOtro(e.target.value)}
                  required
                  placeholder="Describa el motivo..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                />
              </div>
            )}

            {/* VALOR DE MULTA (Solo si es Sin Justificar) */}
            {tipoDesercion === 'Sin Justificar' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💰 Valor de la Multa *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={valorMulta}
                    onChange={(e) => setValorMulta(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2.5 text-sm"
                    required={tipoDesercion === 'Sin Justificar'}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Valor en pesos colombianos</p>
              </div>
            )}
            
            {/* Documentos */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-700 mb-3">📎 Documentos Adjuntos</h4>
              
              {/* Carta de retiro */}
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📄 Carta de Retiro (Institución Educativa) *
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setCartaRetiro(e.target.files[0])}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                  required
                />
                {cartaRetiro && (
                  <p className="text-xs text-green-600 mt-1">✅ {cartaRetiro.name}</p>
                )}
              </div>
              
              {/* Soporte adicional */}
              <div className={`p-4 rounded-lg ${tipoDesercion === 'Justificada' ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-200'}`}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📎 Soporte de Causa Justificada {tipoDesercion === 'Justificada' && '*'}
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setSoporteAdicional(e.target.files[0])}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                  required={tipoDesercion === 'Justificada'}
                />
                {soporteAdicional && (
                  <p className="text-xs text-green-600 mt-1">✅ {soporteAdicional.name}</p>
                )}
              </div>
            </div>
            </>
            )}

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                placeholder="Información adicional sobre la deserción..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none"
              />
            </div>

            {/* Advertencia */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                {sinDatos ? (
                  <>⚠️ Esta acción cambiará el estado del estudiante a <strong>"Desertor"</strong> sin información todavía. Recuerda completarla luego con "Editar".</>
                ) : (
                  <>⚠️ Esta acción cambiará el estado del estudiante a <strong>"Desertor"</strong>. Esta acción quedará registrada y no podrá deshacerse fácilmente.</>
                )}
              </p>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3 rounded-b-xl">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition">
              Cancelar
            </button>
            <button type="submit" disabled={cargando} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 shadow-sm">
              {cargando ? 'Procesando...' : '✅ Confirmar Deserción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}