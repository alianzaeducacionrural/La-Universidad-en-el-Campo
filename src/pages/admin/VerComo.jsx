// =============================================
// PÁGINA: VER COMO... (SOLO ADMIN)
// =============================================
// Un solo lugar para que el admin entre al panel completo de cualquier
// universidad (como coordinador o docente), de cualquier padrino, o de
// cualquier aliado — sin iniciar sesión con esa cuenta. Reutiliza los
// paneles reales tal cual, solo "inyectándoles" un usuario sustituto en
// vez del que vendría de useAuth().

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ModalPerfilEstudiante from '../../components/estudiantes/ModalPerfilEstudiante';
import DashboardUniversidad from '../universidad/DashboardUniversidad';
import Dashboard from '../Dashboard';
import Estadisticas from '../Estadisticas';
import { getNombreRol } from '../../utils/helpers';

const TABS = [
  { id: 'universidad', label: 'Universidad', icon: '🎓' },
  { id: 'padrino', label: 'Padrino', icon: '👤' },
  { id: 'aliado', label: 'Aliado', icon: '🤝' },
];

export default function VerComo() {
  const [vistaActiva, setVistaActiva] = useState('ver-como');
  const [tab, setTab] = useState('universidad');

  // Pestaña Universidad
  const [universidades, setUniversidades] = useState([]);
  const [universidadElegida, setUniversidadElegida] = useState('');
  const [rolElegido, setRolElegido] = useState('coordinador_universidad');
  const [vistaUniversidad, setVistaUniversidad] = useState(null); // { universidad, rol }

  // Pestaña Padrino
  const [padrinos, setPadrinos] = useState([]);
  const [busquedaPadrino, setBusquedaPadrino] = useState('');
  const [padrinoElegido, setPadrinoElegido] = useState(null);

  // Pestaña Aliado
  const [aliados, setAliados] = useState([]);
  const [busquedaAliado, setBusquedaAliado] = useState('');
  const [aliadoElegido, setAliadoElegido] = useState(null);

  const [cargando, setCargando] = useState(true);

  // Modal de perfil de estudiante, manejado localmente en modo solo lectura
  // — compartido por las tres pestañas, evita tocar el sistema global de modales.
  const [modalPerfil, setModalPerfil] = useState(false);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      const [uniRes, padrinosRes, aliadosRes] = await Promise.all([
        supabase.from('universidades').select('nombre').order('nombre'),
        supabase.from('padrinos').select('*').eq('activo', true).eq('rol', 'padrino').order('nombre_completo'),
        supabase.from('padrinos').select('*').eq('activo', true).eq('rol', 'aliado').order('nombre_completo'),
      ]);
      setUniversidades((uniRes.data || []).map(u => u.nombre));
      setPadrinos(padrinosRes.data || []);
      setAliados(aliadosRes.data || []);
      setCargando(false);
    }
    cargar();
  }, []);

  async function cargarHistorial(estudianteId) {
    setCargandoHistorial(true);
    const { data } = await supabase
      .from('seguimientos')
      .select(`*, padrino:padrino_id (nombre_completo)`)
      .eq('estudiante_id', estudianteId)
      .order('fecha_contacto', { ascending: false });
    if (data) setHistorial(data);
    setCargandoHistorial(false);
  }

  function abrirPerfil(estudiante) {
    setEstudianteSeleccionado(estudiante);
    cargarHistorial(estudiante.id);
    setModalPerfil(true);
  }

  const modalPerfilCompartido = (
    <ModalPerfilEstudiante
      isOpen={modalPerfil}
      onClose={() => { setModalPerfil(false); setEstudianteSeleccionado(null); }}
      estudiante={estudianteSeleccionado}
      historial={historial}
      cargandoHistorial={cargandoHistorial}
      onCargarHistorial={cargarHistorial}
      onSeguimiento={() => {}}
      onEditar={() => {}}
      onEditarSeguimiento={() => {}}
      onReportarDesercion={() => {}}
      puedeGestionar={false}
      onEstadoChange={async () => ({ success: false })}
      esAdmin={false}
    />
  );

  function Banner({ texto, onSalir }) {
    return (
      <div className="bg-primary text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm sticky top-0 z-40 shadow-sm">
        <span>🔎 {texto}</span>
        <button onClick={onSalir} className="bg-white/15 hover:bg-white/25 px-3 py-1 rounded-lg text-xs font-medium transition">
          ✕ Salir de la vista
        </button>
      </div>
    );
  }

  // ─── Vista activa: Universidad ─────────────────────────────────────────
  if (vistaUniversidad) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Banner
          texto={<>Viendo como <strong>{vistaUniversidad.rol === 'docente' ? 'Docente' : 'Coordinador'}</strong> de <strong>{vistaUniversidad.universidad}</strong></>}
          onSalir={() => setVistaUniversidad(null)}
        />
        <DashboardUniversidad
          usuarioForzado={{ universidad: vistaUniversidad.universidad, rol: vistaUniversidad.rol, nombre_completo: 'Vista de administrador' }}
          onVerPerfil={abrirPerfil}
        />
        {modalPerfilCompartido}
      </div>
    );
  }

  // ─── Vista activa: Padrino ──────────────────────────────────────────────
  if (padrinoElegido) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Banner
          texto={<>Viendo como <strong>{padrinoElegido.nombre_completo}</strong> (Padrino)</>}
          onSalir={() => setPadrinoElegido(null)}
        />
        <Dashboard padrinoForzado={padrinoElegido} />
      </div>
    );
  }

  // ─── Vista activa: Aliado ───────────────────────────────────────────────
  if (aliadoElegido) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Banner
          texto={<>Viendo como <strong>{aliadoElegido.nombre_completo}</strong> (Aliado)</>}
          onSalir={() => setAliadoElegido(null)}
        />
        <Estadisticas usuarioForzado={aliadoElegido} simulando onVerPerfil={abrirPerfil} />
        {modalPerfilCompartido}
      </div>
    );
  }

  // ─── Selector ───────────────────────────────────────────────────────────
  const padrinosFiltrados = busquedaPadrino.trim()
    ? padrinos.filter(p =>
        p.nombre_completo?.toLowerCase().includes(busquedaPadrino.toLowerCase()) ||
        p.correo?.toLowerCase().includes(busquedaPadrino.toLowerCase()))
    : padrinos;

  const aliadosFiltrados = busquedaAliado.trim()
    ? aliados.filter(a =>
        a.nombre_completo?.toLowerCase().includes(busquedaAliado.toLowerCase()) ||
        a.correo?.toLowerCase().includes(busquedaAliado.toLowerCase()))
    : aliados;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar vistaActiva={vistaActiva} setVistaActiva={setVistaActiva} rol="admin" />
      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        <Header />
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">🔎 Ver como...</h1>
          <p className="text-gray-600 mb-6">
            Entra al panel completo de una universidad, un padrino o un aliado, sin iniciar sesión con esa cuenta.
          </p>

          {/* Pestañas */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-6">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`pb-3 font-medium text-sm border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                    tab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-500'
                  }`}
                >
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </nav>
          </div>

          {cargando ? (
            <LoadingSpinner mensaje="Cargando..." />
          ) : tab === 'universidad' ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Universidad</label>
                <select
                  value={universidadElegida}
                  onChange={e => setUniversidadElegida(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white"
                >
                  <option value="">Seleccionar universidad...</option>
                  {universidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entrar como</label>
                <div className="flex gap-3">
                  <label className={`flex-1 flex items-center gap-2 border rounded-lg px-3 py-2.5 text-sm cursor-pointer transition ${rolElegido === 'coordinador_universidad' ? 'border-primary bg-primary/5 text-primary-dark font-medium' : 'border-gray-300 text-gray-600'}`}>
                    <input type="radio" name="rol" checked={rolElegido === 'coordinador_universidad'} onChange={() => setRolElegido('coordinador_universidad')} className="accent-primary" />
                    Coordinador de Universidad
                  </label>
                  <label className={`flex-1 flex items-center gap-2 border rounded-lg px-3 py-2.5 text-sm cursor-pointer transition ${rolElegido === 'docente' ? 'border-primary bg-primary/5 text-primary-dark font-medium' : 'border-gray-300 text-gray-600'}`}>
                    <input type="radio" name="rol" checked={rolElegido === 'docente'} onChange={() => setRolElegido('docente')} className="accent-primary" />
                    Docente
                  </label>
                </div>
              </div>

              <button
                onClick={() => setVistaUniversidad({ universidad: universidadElegida, rol: rolElegido })}
                disabled={!universidadElegida}
                className="w-full bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg font-medium transition disabled:opacity-50"
              >
                Entrar al panel →
              </button>
            </div>
          ) : tab === 'padrino' ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Entra al panel "Mis Grupos" de cualquier padrino — grupos, estudiantes, seguimientos e inasistencias — exactamente como él lo ve.
              </p>
              <input
                type="text"
                placeholder="🔍 Buscar por nombre o correo..."
                value={busquedaPadrino}
                onChange={e => setBusquedaPadrino(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white shadow-sm mb-4"
              />
              {padrinosFiltrados.length === 0 ? (
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
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Entra al panel de Estadísticas de cualquier aliado, con el alcance de municipios que ya tiene asignado.
              </p>
              <input
                type="text"
                placeholder="🔍 Buscar por nombre o correo..."
                value={busquedaAliado}
                onChange={e => setBusquedaAliado(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white shadow-sm mb-4"
              />
              {aliadosFiltrados.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                  No se encontraron aliados
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
                  {aliadosFiltrados.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setAliadoElegido(a)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{a.nombre_completo}</p>
                        <p className="text-xs text-gray-500 truncate">{a.correo}</p>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full flex-shrink-0">
                        {(a.municipios_asignados || []).length} municipio{(a.municipios_asignados || []).length !== 1 ? 's' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
