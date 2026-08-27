// =============================================
// COMPONENTE: GESTIÓN DE PADRINOS
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import PadrinoGestionCard from './PadrinoGestionCard';
import ModalCrearPadrino from './ModalCrearPadrino';
import LoadingSpinner from '../common/LoadingSpinner';

const FILTRO_ESTADO = { TODOS: 'todos', ACTIVOS: 'activos', INACTIVOS: 'inactivos' };

export default function GestionPadrinos() {
  const notificacion = useNotificacion();
  const [padrinos, setPadrinos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState(FILTRO_ESTADO.TODOS);
  const [padrinoExpandido, setPadrinoExpandido] = useState(null);
  const [modalCrear, setModalCrear] = useState(false);
  const [recargar, setRecargar] = useState(0);

  useEffect(() => {
    cargarPadrinos();
  }, [recargar]);

  // Se consulta la tabla base (no la vista) para no depender de si esta
  // incluye `activo` — así el estado habilitado/inhabilitado siempre es
  // el dato real y actualizado inmediatamente después de cada cambio.
  async function cargarPadrinos() {
    setCargando(true);

    // Sin filtro de rol: igual que la vista original, esta pantalla también
    // debe mostrar a coordinadores/admin cuando tienen grupos asignados como
    // padrino (grupo_padrino no está limitado al rol 'padrino'). Se excluyen
    // los aliados explícitamente: no gestionan grupos y no deben aparecer aquí.
    const [padrinosRes, asignacionesRes] = await Promise.all([
      supabase.from('padrinos').select('*').neq('rol', 'aliado').order('nombre_completo'),
      supabase.from('grupo_padrino').select('padrino_id')
    ]);

    const conteoPorPadrino = {};
    (asignacionesRes.data || []).forEach(gp => {
      conteoPorPadrino[gp.padrino_id] = (conteoPorPadrino[gp.padrino_id] || 0) + 1;
    });

    const data = (padrinosRes.data || []).map(p => ({
      ...p,
      padrino_id: p.id,
      total_grupos: conteoPorPadrino[p.id] || 0
    }));

    setPadrinos(data);
    setCargando(false);
  }

  const togglePadrino = (padrinoId) => {
    setPadrinoExpandido(padrinoExpandido === padrinoId ? null : padrinoId);
  };

  const handleGrupoQuitado = () => {
    cargarPadrinos();
  };

  const handleGrupoAsignado = () => {
    cargarPadrinos();
  };

  // Inhabilitar desvincula automáticamente al padrino de todos sus grupos
  // (puede dejar algún grupo sin ningún padrino asignado — visible en
  // Gestión de Grupos). El historial de seguimientos no se toca: sigue
  // referenciando al padrino por su id, solo deja de aparecer en selectores
  // y listados activos.
  async function toggleActivoPadrino(padrino) {
    const activando = padrino.activo === false;

    const mensaje = activando
      ? `¿Habilitar de nuevo a "${padrino.nombre_completo}"?`
      : `¿Inhabilitar a "${padrino.nombre_completo}"?` +
        (padrino.total_grupos > 0
          ? ` Se desvinculará de ${padrino.total_grupos} grupo(s) asignado(s) — podrás reasignarlos luego a otro padrino. El historial de seguimientos se conserva.`
          : ' El historial de seguimientos se conserva.');

    if (!confirm(mensaje)) return;

    if (!activando && padrino.total_grupos > 0) {
      const { error: errorDesvincular } = await supabase
        .from('grupo_padrino')
        .delete()
        .eq('padrino_id', padrino.padrino_id);

      if (errorDesvincular) {
        notificacion.error(errorDesvincular.message, 'Error al desvincular grupos');
        return;
      }
    }

    const { error } = await supabase.from('padrinos').update({ activo: activando }).eq('id', padrino.padrino_id);

    if (error) {
      notificacion.error(error.message, 'Error al cambiar estado');
    } else {
      notificacion.success(activando ? `"${padrino.nombre_completo}" habilitado correctamente` : `"${padrino.nombre_completo}" inhabilitado correctamente`);
      setRecargar(prev => prev + 1);
    }
  }

  const padrinosFiltrados = padrinos.filter(p => {
    const coincideBusqueda =
      p.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.correo.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado =
      filtroEstado === FILTRO_ESTADO.TODOS ||
      (filtroEstado === FILTRO_ESTADO.ACTIVOS && p.activo !== false) ||
      (filtroEstado === FILTRO_ESTADO.INACTIVOS && p.activo === false);
    return coincideBusqueda && coincideEstado;
  });

  if (cargando) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <LoadingSpinner mensaje="Cargando padrinos..." />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800 flex items-center">
              <span className="text-xl mr-2">👥</span>
              Gestión de Padrinos
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Asigna o quita grupos a cada padrino
            </p>
          </div>
          <button
            onClick={() => setModalCrear(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Nuevo Padrino</span>
          </button>
        </div>
        
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre o correo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full md:w-96 border border-gray-300 rounded-lg px-4 py-2 text-sm"
          />
          <div className="flex items-center gap-1.5">
            {[
              { id: FILTRO_ESTADO.TODOS, label: 'Todos' },
              { id: FILTRO_ESTADO.ACTIVOS, label: 'Habilitados' },
              { id: FILTRO_ESTADO.INACTIVOS, label: 'Inhabilitados' }
            ].map(op => (
              <button
                key={op.id}
                onClick={() => setFiltroEstado(op.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  filtroEstado === op.id
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {padrinosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {busqueda ? 'No se encontraron padrinos' : 'No hay padrinos registrados'}
          </div>
        ) : (
          padrinosFiltrados.map(padrino => (
            <PadrinoGestionCard
              key={padrino.padrino_id}
              padrino={padrino}
              expandido={padrinoExpandido === padrino.padrino_id}
              onToggle={() => togglePadrino(padrino.padrino_id)}
              onGrupoQuitado={handleGrupoQuitado}
              onGrupoAsignado={handleGrupoAsignado}
              onToggleActivo={toggleActivoPadrino}
            />
          ))
        )}
      </div>

      <ModalCrearPadrino
        isOpen={modalCrear}
        onClose={() => setModalCrear(false)}
        onCreado={() => {
          setRecargar(prev => prev + 1);
          setModalCrear(false);
        }}
      />
    </div>
  );
}