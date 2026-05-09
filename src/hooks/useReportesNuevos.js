import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const LS_KEY = 'historial_reportes_last_seen';

export function useReportesNuevos() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const lastSeen = localStorage.getItem(LS_KEY);
    if (!lastSeen) {
      localStorage.setItem(LS_KEY, new Date().toISOString());
      return;
    }
    supabase
      .from('registros_asistencia')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', lastSeen)
      .then(({ count: c }) => setCount(c || 0));
  }, []);

  function marcarComoVisto() {
    localStorage.setItem(LS_KEY, new Date().toISOString());
    setCount(0);
  }

  function getLastSeen() {
    return localStorage.getItem(LS_KEY) || new Date().toISOString();
  }

  return { count, marcarComoVisto, getLastSeen };
}
