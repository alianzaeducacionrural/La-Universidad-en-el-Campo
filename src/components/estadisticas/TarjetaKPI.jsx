// =============================================
// COMPONENTE: TARJETA KPI (SIN ICONO, COLORES SUAVES)
// =============================================

export default function TarjetaKPI({ titulo, valor, color }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-5 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] text-white`}>
      <p className="text-sm opacity-90 mb-1">{titulo}</p>
      <p className="text-3xl font-bold">{valor}</p>
    </div>
  );
}