// =============================================
// TABLA: ESTADO DE CARTAS DE COBRO (SOLO LECTURA)
// =============================================
// Pestaña dentro de GestionMultas.jsx — muestra, por estudiante elegible con
// al menos una carta ya enviada, cuántos días han pasado desde esa carta y
// si está a tiempo, próximo a vencer (25-29 días) o vencido (30+) para el
// envío de la siguiente. La generación de la carta delega en el flujo ya
// existente de GestionMultas.jsx (no duplica esa lógica).

import { formatearFecha } from '../../utils/helpers';

const ESTADO_INFO = {
  a_tiempo: { label: 'A tiempo', color: 'bg-green-100 text-green-700 border-green-300' },
  proximo_a_vencer: { label: 'Próximo a vencer', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  vencido: { label: 'Vencido', color: 'bg-red-100 text-red-700 border-red-300' }
};

export default function EstadoCartasCobro({ pendientes, cargando, onGenerarCarta }) {
  if (cargando) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-gray-500 mt-4">Cargando estado de cartas...</p>
      </div>
    );
  }

  if (pendientes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-500">No hay estudiantes con cartas de cobro pendientes de seguimiento.</p>
        <p className="text-xs text-gray-400 mt-1">
          (Solo se listan estudiantes desertores injustificados con al menos una carta ya enviada y que aún no llegan a la carta 3.)
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4">Estudiante</th>
              <th className="text-left py-3 px-4">Última carta enviada</th>
              <th className="text-left py-3 px-4">Días transcurridos</th>
              <th className="text-left py-3 px-4">Estado</th>
              <th className="text-center py-3 px-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pendientes.map(p => {
              const info = ESTADO_INFO[p.estadoAlerta];
              return (
                <tr key={p.multa.id} className="border-b border-gray-100 hover:bg-primary/20 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-medium">{p.estudiante?.nombre_completo}</p>
                    <p className="text-xs text-gray-500">{p.estudiante?.documento} • {p.estudiante?.municipio}</p>
                  </td>
                  <td className="py-3 px-4">
                    #{p.ultimaCarta.numero_carta} · {formatearFecha(p.ultimaCarta.fecha_emision)}
                  </td>
                  <td className="py-3 px-4 font-medium">{p.dias} día{p.dias !== 1 ? 's' : ''}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${info.color}`}>
                      {info.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onGenerarCarta(p)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-sm"
                    >
                      📄 Generar Carta #{p.siguienteNumeroCarta}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
