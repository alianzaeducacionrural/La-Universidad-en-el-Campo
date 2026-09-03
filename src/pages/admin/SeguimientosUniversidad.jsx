// =============================================
// PÁGINA: SEGUIMIENTOS DE UNIVERSIDAD (SOLO LECTURA + GESTIÓN, ADMINISTRATIVOS)
// =============================================
// Cuántos y cuáles seguimientos han registrado los coordinadores de
// universidad sobre los estudiantes. El contenido vive en
// ConsolidadoSeguimientosUniversidad.jsx, compartido con la pestaña
// homónima dentro de PanelCoordinador.jsx.

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConsolidadoSeguimientosUniversidad from '../../components/coordinador/ConsolidadoSeguimientosUniversidad';

export default function SeguimientosUniversidad({ onVerPerfil }) {
  const { perfil: usuario } = useAuth();
  const [vistaActiva, setVistaActiva] = useState('seguimientos-universidad');

  if (!usuario) return <LoadingSpinner mensaje="Cargando..." />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar vistaActiva={vistaActiva} setVistaActiva={setVistaActiva} rol={usuario.rol} />
      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        <Header onVerPerfil={onVerPerfil} />
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">🎓 Seguimientos de Universidad</h1>
          <ConsolidadoSeguimientosUniversidad onVerPerfil={onVerPerfil} />
        </div>
      </div>
    </div>
  );
}
