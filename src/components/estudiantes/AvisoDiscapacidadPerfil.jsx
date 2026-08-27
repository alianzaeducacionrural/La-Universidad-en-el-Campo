// =============================================
// TARJETA: AVISO DE DISCAPACIDAD/TRASTORNO EN EL PERFIL
// =============================================
// A diferencia de BadgeDiscapacidad (un pill compacto con tooltip, pensado
// para tablas/listados angostos), esta tarjeta va dentro de
// ModalPerfilEstudiante.jsx: debe verse "a primera vista", sin necesidad de
// pasar el mouse por encima, así que muestra el tipo exacto de cada
// condición como texto siempre visible, con un tratamiento visual llamativo.

const ES_ETIQUETA_REAL = (valor) => !!valor && valor !== 'NO APLICA';

export default function AvisoDiscapacidadPerfil({ estudiante }) {
  const discapacidad = ES_ETIQUETA_REAL(estudiante?.discapacidad_tipo) ? estudiante.discapacidad_tipo : null;
  const trastorno = ES_ETIQUETA_REAL(estudiante?.trastorno_tipo) ? estudiante.trastorno_tipo : null;

  if (!discapacidad && !trastorno) return null;

  return (
    <div className="mb-6 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">⚠️</span>
        <div className="min-w-0">
          <p className="font-bold text-amber-800 text-sm mb-2">Estudiante con necesidades especiales — tenerlo en cuenta</p>
          <div className="flex flex-wrap gap-2">
            {discapacidad && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                ♿ Discapacidad: {discapacidad}
              </span>
            )}
            {trastorno && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-violet-100 text-violet-800 border border-violet-300">
                🧩 Trastorno: {trastorno}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
