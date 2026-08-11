// =============================================
// PÁGINA: VER COMO UNIVERSIDAD (SOLO ADMIN)
// =============================================
// Permite al admin entrar al panel completo de cualquier universidad, como
// coordinador o como docente, sin iniciar sesión con esa cuenta. Reutiliza
// DashboardUniversidad.jsx tal cual — solo le "inyecta" un usuario sintético
// (universidad + rol) en vez del que vendría de useAuth().

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ModalPerfilEstudiante from '../../components/estudiantes/ModalPerfilEstudiante';
import DashboardUniversidad from '../universidad/DashboardUniversidad';

export default function VerComoUniversidad() {
  const [vistaActiva, setVistaActiva] = useState('ver-universidad');
  const [universidades, setUniversidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [universidadElegida, setUniversidadElegida] = useState('');
  const [rolElegido, setRolElegido] = useState('coordinador_universidad');
  const [vista, setVista] = useState(null); // { universidad, rol } una vez confirmado

  // Modal de perfil de estudiante, manejado localmente en modo solo lectura
  const [modalPerfil, setModalPerfil] = useState(false);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  useEffect(() => {
    supabase.from('universidades').select('nombre').order('nombre').then(({ data }) => {
      setUniversidades((data || []).map(u => u.nombre));
      setCargando(false);
    });
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

  if (vista) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-primary text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm sticky top-0 z-40 shadow-sm">
          <span>
            🔎 Viendo como <strong>{vista.rol === 'docente' ? 'Docente' : 'Coordinador'}</strong> de <strong>{vista.universidad}</strong>
          </span>
          <button
            onClick={() => setVista(null)}
            className="bg-white/15 hover:bg-white/25 px-3 py-1 rounded-lg text-xs font-medium transition"
          >
            ✕ Salir de la vista
          </button>
        </div>

        <DashboardUniversidad
          usuarioForzado={{ universidad: vista.universidad, rol: vista.rol, nombre_completo: 'Vista de administrador' }}
          onVerPerfil={abrirPerfil}
        />

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
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar vistaActiva={vistaActiva} setVistaActiva={setVistaActiva} rol="admin" />
      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        <Header />
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">🎓 Ver como Universidad</h1>
          <p className="text-gray-600 mb-6">
            Entra al panel completo de una universidad — asistencia, notas, cronograma y estudiantes — como si fueras su coordinador o un docente.
          </p>

          {cargando ? (
            <LoadingSpinner mensaje="Cargando universidades..." />
          ) : (
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
                onClick={() => setVista({ universidad: universidadElegida, rol: rolElegido })}
                disabled={!universidadElegida}
                className="w-full bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg font-medium transition disabled:opacity-50"
              >
                Entrar al panel →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
