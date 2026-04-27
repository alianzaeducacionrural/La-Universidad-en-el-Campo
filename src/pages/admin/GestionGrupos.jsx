// =============================================
// PÁGINA: GESTIÓN DE GRUPOS (CON BUSCADOR GLOBAL)
// =============================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import FiltrosGrupos from '../../components/admin/FiltrosGrupos';
import GrupoAdminCard from '../../components/admin/GrupoAdminCard';
import ModalCrearGrupo from '../../components/grupos/ModalCrearGrupo';
import { useNotificacion } from '../../context/NotificacionContext';

export default function GestionGrupos({ onVerPerfil }) {
  const { perfil: usuario } = useAuth();
  const notificacion = useNotificacion();
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [vistaActiva, setVistaActiva] = useState('grupos-admin');
  const [filtros, setFiltros] = useState({
    universidad: '',
    cohorte: '',
    estado: 'activo'
  });
  const [modalCrearGrupo, setModalCrearGrupo] = useState(false);
  const [recargar, setRecargar] = useState(0);

  useEffect(() => {
    cargarGrupos();
  }, [filtros, recargar]);

  async function cargarGrupos() {
    setCargando(true);
    
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
      />

      <div className="flex-1">
        <Header onVerPerfil={onVerPerfil} />

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                📚 Gestión de Grupos
              </h1>
              <p className="text-gray-600">
                Administra todos los grupos del programa
              </p>
            </div>
            <button
              onClick={() => setModalCrearGrupo(true)}
              className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition shadow-sm flex items-center space-x-2"
            >
              <span>➕</span>
              <span>Crear Grupo</span>
            </button>
          </div>

          <FiltrosGrupos filtros={filtros} setFiltros={setFiltros} />

          {cargando ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12">
              <LoadingSpinner mensaje="Cargando grupos..." />
            </div>
          ) : grupos.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No hay grupos que coincidan con los filtros</p>
            </div>
          ) : (
            <div className="space-y-4">
              {grupos.map(grupo => (
                <GrupoAdminCard
                  key={grupo.id}
                  grupo={grupo}
                  onRecargar={() => setRecargar(prev => prev + 1)}
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