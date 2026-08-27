// =============================================
// CAMPOS: DISCAPACIDAD Y TRASTORNO
// =============================================
// Par de <select> reutilizado en ModalAgregarEstudiante y ModalEditarEstudiante.
// Ambos campos son independientes entre sí (un estudiante puede tener uno, el
// otro, ambos o ninguno).

import { DISCAPACIDAD_OPCIONES, TRASTORNO_OPCIONES } from '../../utils/constants';

export default function CampoDiscapacidadTrastorno({
  discapacidad,
  onChangeDiscapacidad,
  trastorno,
  onChangeTrastorno
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Discapacidad</label>
        <select
          value={discapacidad || ''}
          onChange={e => onChangeDiscapacidad(e.target.value)}
          className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white"
        >
          <option value="">Sin marcar</option>
          {DISCAPACIDAD_OPCIONES.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Trastorno</label>
        <select
          value={trastorno || ''}
          onChange={e => onChangeTrastorno(e.target.value)}
          className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white"
        >
          <option value="">Sin marcar</option>
          {TRASTORNO_OPCIONES.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
