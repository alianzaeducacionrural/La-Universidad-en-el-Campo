// =============================================
// BADGE: DISCAPACIDAD / TRASTORNO
// =============================================
// Componente único reutilizado en todos los puntos donde se muestra un
// estudiante (tablas, listados, perfil) para no duplicar esta lógica en cada
// uno. 'NO APLICA' y vacío/null no muestran nada — solo un valor real activa
// el badge. El tooltip (title) lleva el tipo exacto para no ocupar espacio
// en tablas angostas.

const ES_ETIQUETA_REAL = (valor) => !!valor && valor !== 'NO APLICA';

export default function BadgeDiscapacidad({ estudiante, className = '' }) {
  const discapacidad = ES_ETIQUETA_REAL(estudiante?.discapacidad_tipo) ? estudiante.discapacidad_tipo : null;
  const trastorno = ES_ETIQUETA_REAL(estudiante?.trastorno_tipo) ? estudiante.trastorno_tipo : null;

  if (!discapacidad && !trastorno) return null;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {discapacidad && (
        <span
          title={`Discapacidad: ${discapacidad}`}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-300"
        >
          ♿ Discapacidad
        </span>
      )}
      {trastorno && (
        <span
          title={`Trastorno: ${trastorno}`}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700 border border-violet-300"
        >
          🧩 Trastorno
        </span>
      )}
    </span>
  );
}
