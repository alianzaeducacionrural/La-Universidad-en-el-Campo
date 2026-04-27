// =============================================
// COMPONENTE: Tabla de Estudiantes (SIN ORDENAMIENTO)
// =============================================

import { getEstadoColor } from '../../utils/helpers';
import EmptyState from '../common/EmptyState';

export default function TablaEstudiantes({ 
  estudiantes, 
  cargando,
  grupoSeleccionado,
  puedeGestionar,
  onSeguimiento,
  onVerPerfil,
  onImportar
}) {
  if (!grupoSeleccionado) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <EmptyState icono="📋" titulo="Selecciona un grupo" descripcion="Elige un grupo para ver sus estudiantes" />
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-500">Cargando estudiantes...</p>
      </div>
    );
  }

  if (estudiantes.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <EmptyState icono="👥" titulo="No hay estudiantes" descripcion="Este grupo no tiene estudiantes registrados todavía" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3.5 px-4 text-gray-600 font-semibold text-sm">Estudiante</th>
              <th className="text-left py-3.5 px-4 text-gray-600 font-semibold text-sm">Municipio / IE</th>
              <th className="text-left py-3.5 px-4 text-gray-600 font-semibold text-sm">Contacto</th>
              <th className="text-left py-3.5 px-4 text-gray-600 font-semibold text-sm">Estado</th>
              <th className="text-left py-3.5 px-4 text-gray-600 font-semibold text-sm">Faltas</th>
              <th className="text-left py-3.5 px-4 text-gray-600 font-semibold text-sm">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {estudiantes.map((est) => (
              <tr key={est.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                <td className="py-3.5 px-4">
                  <p className="font-medium text-gray-800">{est.nombre_completo}</p>
                  <p className="text-xs text-gray-500">{est.documento || 'Sin documento'}</p>
                </td>
                <td className="py-3.5 px-4">
                  <p className="text-sm text-gray-700">{est.municipio}</p>
                  <p className="text-xs text-gray-500">{est.institucion_educativa}</p>
                </td>
                <td className="py-3.5 px-4">
                  <p className="text-sm text-gray-700">{est.telefono || 'N/A'}</p>
                  <p className="text-xs text-gray-500">{est.correo || 'Sin correo'}</p>
                  <p className="text-xs text-gray-400">Acud: {est.acudiente_telefono || 'N/A'}</p>
                </td>
                <td className="py-3.5 px-4">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getEstadoColor(est.estado)}`}>
                    {est.estado || 'Activo'}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <span className={`font-semibold text-sm ${est.total_faltas > 3 ? 'text-red-600' : 'text-gray-700'}`}>
                    {est.total_faltas || 0}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex space-x-2">
                    <button onClick={() => onSeguimiento(est)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition" title="Registrar seguimiento">📝</button>
                    <button onClick={() => onVerPerfil(est)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition" title="Ver perfil completo">👤</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}