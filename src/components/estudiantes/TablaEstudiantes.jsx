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

      {/* ── DESKTOP: tabla completa (lg+) ───────────────────────────────── */}
      <div className="hidden lg:block overflow-x-auto">
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

      {/* ── MÓVIL: tarjetas (< lg) ───────────────────────────────────────── */}
      <div className="lg:hidden divide-y divide-gray-100">
        {estudiantes.map((est) => (
          <div key={est.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{est.nombre_completo}</p>
                <p className="text-xs text-gray-400 mb-1">{est.documento || 'Sin documento'}</p>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 mb-2">
                  <span>{est.municipio}</span>
                  {est.institucion_educativa && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="truncate max-w-[150px]">{est.institucion_educativa}</span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(est.estado)}`}>
                    {est.estado || 'Activo'}
                  </span>
                  <span className={`text-xs font-semibold ${est.total_faltas > 3 ? 'text-red-600' : 'text-gray-500'}`}>
                    {est.total_faltas || 0} falta{(est.total_faltas || 0) !== 1 ? 's' : ''}
                  </span>
                  {est.telefono && (
                    <span className="text-xs text-gray-400">📞 {est.telefono}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button
                  onClick={() => onSeguimiento(est)}
                  className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white w-9 h-9 rounded-lg flex items-center justify-center text-lg transition"
                  title="Registrar seguimiento"
                >
                  📝
                </button>
                <button
                  onClick={() => onVerPerfil(est)}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white w-9 h-9 rounded-lg flex items-center justify-center text-lg transition"
                  title="Ver perfil"
                >
                  👤
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
