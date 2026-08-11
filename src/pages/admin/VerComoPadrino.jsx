// =============================================
// PÁGINA: VER COMO PADRINO (SOLO ADMIN)
// =============================================
// Permite al admin entrar al panel completo ("Mis Grupos") de cualquier
// padrino, sin iniciar sesión con esa cuenta. Reutiliza Dashboard.jsx tal
// cual — solo le "inyecta" el registro real del padrino elegido en vez del
// que vendría de useAuth(), así que useGrupos/useSeguimientos funcionan
// exactamente igual (dependen del id real del padrino).

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getNombreRol } from '../../utils/helpers';
import Dashboard from '../Dashboard';

export default function VerComoPadrino() {
  const [vistaActiva, setVistaActiva] = useState('ver-padrino');
  const [padrinos, setPadrinos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [padrinoElegido, setPadrinoElegido] = useState(null);

  useEffect(() => {
    supabase
      .from('padrinos')
      .select('*')
      .eq('activo', true)
      .order('nombre_completo')
      .then(({ data }) => {
        setPadrinos(data || []);
        setCargando(false);
      });
  }, []);

  const padrinosFiltrados = busqueda.trim()
    ? padrinos.filter(p =>
        p.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.correo?.toLowerCase().includes(busqueda.toLowerCase()))
    : padrinos;

  if (padrinoElegido) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-primary text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm sticky top-0 z-40 shadow-sm">
          <span>
            🔎 Viendo como <strong>{padrinoElegido.nombre_completo}</strong> ({getNombreRol(padrinoElegido.rol)})
          </span>
          <button
            onClick={() => setPadrinoElegido(null)}
            className="bg-white/15 hover:bg-white/25 px-3 py-1 rounded-lg text-xs font-medium transition"
          >
            ✕ Salir de la vista
          </button>
        </div>

        <Dashboard padrinoForzado={padrinoElegido} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar vistaActiva={vistaActiva} setVistaActiva={setVistaActiva} rol="admin" />
      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        <Header />
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">👤 Ver como Padrino</h1>
          <p className="text-gray-600 mb-6">
            Entra al panel "Mis Grupos" de cualquier padrino — grupos, estudiantes, seguimientos e inasistencias — exactamente como él lo ve.
          </p>

          <input
            type="text"
            placeholder="🔍 Buscar por nombre o correo..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white shadow-sm mb-4"
          />

          {cargando ? (
            <LoadingSpinner mensaje="Cargando padrinos..." />
          ) : padrinosFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              No se encontraron padrinos
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
              {padrinosFiltrados.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPadrinoElegido(p)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.nombre_completo}</p>
                    <p className="text-xs text-gray-500 truncate">{p.correo}</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full flex-shrink-0">
                    {getNombreRol(p.rol)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
