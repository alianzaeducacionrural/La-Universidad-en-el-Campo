// =============================================
// COMPONENTE: BADGE DE NOTIFICACIONES
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { filtrarPorAlcancePadrino, agruparInstitucionesPorGrupo } from '../../utils/helpers';

export default function BadgeNotificacion() {
  const { perfil } = useAuth();
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (perfil) {
      cargarPendientes();
      // Refrescar cada 5 minutos
      const interval = setInterval(cargarPendientes, 300000);
      return () => clearInterval(interval);
    }
  }, [perfil]);

  async function cargarPendientes() {
    if (!perfil) return;

    const { data: gruposPadrino } = await supabase
      .from('grupo_padrino')
      .select('grupo_id, institucion_educativa')
      .eq('padrino_id', perfil.id);

    const mapaInstituciones = agruparInstitucionesPorGrupo(gruposPadrino);
    const asignaciones = [...mapaInstituciones.entries()].map(([id, instituciones_asignadas]) => ({ id, instituciones_asignadas }));
    const gruposIds = asignaciones.map(a => a.id);

    if (gruposIds.length === 0) {
      setTotal(0);
      return;
    }

    const { data: pendientes } = await supabase
      .from('vista_inasistencias_pendientes')
      .select('grupo_id, institucion_educativa')
      .in('grupo_id', gruposIds);

    setTotal(filtrarPorAlcancePadrino(pendientes || [], asignaciones).length);
  }

  if (total === 0) return null;

  return (
    <div className="relative">
      <span className="text-white text-xl">🔔</span>
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
        {total > 9 ? '9+' : total}
      </span>
    </div>
  );
}