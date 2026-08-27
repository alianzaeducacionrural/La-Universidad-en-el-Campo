// =============================================
// MODAL: ALERTA DE CARTAS DE COBRO (SOLO ASISTENTE ADMINISTRATIVO)
// =============================================
// Popup global (montado en App.jsx), gateado por rol asistente_admin y
// limitado a máximo una vez cada 4 horas (ver App.jsx). Agrupa los
// estudiantes vencidos primero, luego los próximos a vencer.

import { useNavigate } from 'react-router-dom';
import { formatearFecha } from '../../utils/helpers';

export default function ModalAlertaCartasCobro({ isOpen, onClose, alertas = [] }) {
  const navigate = useNavigate();

  if (!isOpen || alertas.length === 0) return null;

  const vencidos = alertas.filter(a => a.estadoAlerta === 'vencido');
  const proximos = alertas.filter(a => a.estadoAlerta === 'proximo_a_vencer');

  function irAMultas() {
    onClose();
    navigate('/multas');
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 text-4xl">
            📬
          </div>
          <h2 className="text-xl font-bold">Cartas de cobro pendientes</h2>
          <p className="text-sm text-white/90 mt-1">
            {alertas.length} estudiante{alertas.length !== 1 ? 's' : ''} requiere{alertas.length === 1 ? '' : 'n'} seguimiento
          </p>
        </div>

        <div className="p-5 max-h-[50vh] overflow-y-auto space-y-4">
          {vencidos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">🚨 Vencidos — enviar ya</p>
              <div className="space-y-2">
                {vencidos.map(a => (
                  <div key={a.multa.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="font-medium text-gray-800 text-sm">{a.estudiante?.nombre_completo}</p>
                    <p className="text-xs text-gray-600">
                      Carta #{a.ultimaCarta.numero_carta} enviada el {formatearFecha(a.ultimaCarta.fecha_emision)} · {a.dias} días — falta la carta #{a.siguienteNumeroCarta}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {proximos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">⏰ Próximos a vencer</p>
              <div className="space-y-2">
                {proximos.map(a => (
                  <div key={a.multa.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="font-medium text-gray-800 text-sm">{a.estudiante?.nombre_completo}</p>
                    <p className="text-xs text-gray-600">
                      Carta #{a.ultimaCarta.numero_carta} enviada el {formatearFecha(a.ultimaCarta.fecha_emision)} · {a.dias} días — se acerca el plazo para la carta #{a.siguienteNumeroCarta}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition"
          >
            Cerrar
          </button>
          <button
            onClick={irAMultas}
            className="flex-1 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg font-medium transition"
          >
            Ir a Gestión de Multas
          </button>
        </div>
      </div>
    </div>
  );
}
