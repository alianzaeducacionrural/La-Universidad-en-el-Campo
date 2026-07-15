// =============================================
// PÁGINA: GESTIÓN DE GRUPOS (CON BUSCADOR GLOBAL)
// =============================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { useReportesNuevos } from '../../hooks/useReportesNuevos';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import FiltrosGrupos from '../../components/admin/FiltrosGrupos';
import GrupoAdminCard from '../../components/admin/GrupoAdminCard';
import ModalCrearGrupo from '../../components/grupos/ModalCrearGrupo';
import { useNotificacion } from '../../context/NotificacionContext';
import { getMunicipiosPermitidos, esAliado } from '../../utils/helpers';

export default function GestionGrupos({ onVerPerfil }) {
  const { perfil: usuario } = useAuth();
  const notificacion = useNotificacion();
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const { count: totalReportesNuevos } = useReportesNuevos();
  const [vistaActiva, setVistaActiva] = useState('grupos-admin');
  const [filtros, setFiltros] = useState({
    universidad: '',
    cohorte: '',
    estado: 'activo'
  });
  const [busqueda, setBusqueda] = useState('');
  const [modalCrearGrupo, setModalCrearGrupo] = useState(false);
  const [recargar, setRecargar] = useState(0);

  const municipiosPermitidos = getMunicipiosPermitidos(usuario);
  const soloLectura = esAliado(usuario?.rol);

  useEffect(() => {
    cargarGrupos();
  }, [filtros, recargar]);

  async function cargarGrupos() {
    setCargando(true);

    // Alcance por municipio: solo grupos con estudiantes en los municipios permitidos
    let gruposPermitidosIds = null;
    if (municipiosPermitidos) {
      const { data: ests } = await supabase
        .from('estudiantes')
        .select('grupo_id')
        .in('municipio', municipiosPermitidos)
        .not('grupo_id', 'is', null);
      gruposPermitidosIds = [...new Set((ests || []).map(e => e.grupo_id))];

      if (gruposPermitidosIds.length === 0) {
        setGrupos([]);
        setCargando(false);
        return;
      }
    }

    let query = supabase
      .from('grupos')
      .select(`
        *,
        grupo_padrino (
          padrino_id,
          padrinos:padrino_id (nombre_completo)
        ),
        estudiantes (count)
      `);

    if (gruposPermitidosIds) query = query.in('id', gruposPermitidosIds);
    if (filtros.universidad) query = query.eq('universidad', filtros.universidad);
    if (filtros.cohorte) query = query.eq('cohorte', filtros.cohorte);
    if (filtros.estado === 'activo') query = query.eq('activo', true);
    else if (filtros.estado === 'inactivo') query = query.eq('activo', false);

    const { data } = await query.order('nombre');

    if (data) {
      const gruposFormateados = data.map(g => ({
        ...g,
        total_estudiantes: g.estudiantes?.[0]?.count || 0,
        padrinos: g.grupo_padrino?.map(gp => gp.padrinos).filter(p => p) || []
      }));
      setGrupos(gruposFormateados);
    }

    setCargando(false);
  }

  // Buscador automático: filtra por nombre, universidad o programa a medida que se escribe
  const gruposFiltrados = busqueda.trim()
    ? grupos.filter(g => {
        const t = busqueda.toLowerCase();
        return (
          g.nombre?.toLowerCase().includes(t) ||
          g.universidad?.toLowerCase().includes(t) ||
          g.programa?.toLowerCase().includes(t) ||
          g.cohorte?.toLowerCase().includes(t)
        );
      })
    : grupos;

  async function handleCrearGrupo(datosGrupo, padrinosSeleccionados) {
    const { data: grupoData, error: grupoError } = await supabase
      .from('grupos')
      .insert([datosGrupo])
      .select()
      .single();
    
    if (grupoError) {
      notificacion.error(grupoError.message, 'Error al crear grupo');
      return { success: false, error: grupoError.message };
    }
    
    if (padrinosSeleccionados.length > 0) {
      const asignaciones = padrinosSeleccionados.map(padrinoId => ({
        grupo_id: grupoData.id,
        padrino_id: padrinoId
      }));
      await supabase.from('grupo_padrino').insert(asignaciones);
    }
    
    notificacion.success(`Grupo "${datosGrupo.nombre}" creado exitosamente`);
    setRecargar(prev => prev + 1);
    return { success: true, data: grupoData };
  }

  if (!usuario) {
    return <LoadingSpinner mensaje="Cargando..." />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        vistaActiva={vistaActiva}
        setVistaActiva={setVistaActiva}
        rol={usuario.rol}
        totalReportesNuevos={totalReportesNuevos}
      />

      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        <Header onVerPerfil={onVerPerfil} />

        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                📚 Gestión de Grupos
              </h1>
              <p className="text-gray-600">
                Administra todos los grupos del programa
              </p>
            </div>
            {!soloLectura && (
              <button
                onClick={() => setModalCrearGrupo(true)}
                className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition shadow-sm flex items-center space-x-2"
              >
                <span>➕</span>
                <span>Crear Grupo</span>
              </button>
            )}
          </div>

          {/* Buscador automático */}
          <div className="mb-4">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="🔍 Buscar grupo por nombre, universidad, programa o cohorte..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
            />
          </div>

          <FiltrosGrupos filtros={filtros} setFiltros={setFiltros} />

          {cargando ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12">
              <LoadingSpinner mensaje="Cargando grupos..." />
            </div>
          ) : gruposFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No hay grupos que coincidan con los filtros</p>
            </div>
          ) : (
            <div className="space-y-4">
              {gruposFiltrados.map(grupo => (
                <GrupoAdminCard
                  key={grupo.id}
                  grupo={grupo}
                  onRecargar={() => setRecargar(prev => prev + 1)}
                  municipiosPermitidos={municipiosPermitidos}
                  soloLectura={soloLectura}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ModalCrearGrupo
        isOpen={modalCrearGrupo}
        onClose={() => setModalCrearGrupo(false)}
        onCrear={handleCrearGrupo}
        padrinoActual={usuario}
      />
    </div>
  );
}