// =============================================
// COMPONENTE: ERROR AL CARGAR UN GRÁFICO
// =============================================

export default function ErrorGrafico({ titulo }) {
  return (
    <div className="bg-white rounded-xl border border-red-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-4">{titulo}</h3>
      <p className="text-red-600 text-center py-8 text-sm">
        No se pudieron cargar los datos completos. Recarga la página para intentar de nuevo.
      </p>
    </div>
  );
}
