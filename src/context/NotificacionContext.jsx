// =============================================
// CONTEXTO DE NOTIFICACIONES
// =============================================

import { createContext, useContext, useState } from 'react';
import NotificacionModal from '../components/common/NotificacionModal';

const NotificacionContext = createContext({});

export const useNotificacion = () => useContext(NotificacionContext);

export function NotificacionProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    tipo: 'success',
    titulo: '',
    mensaje: '',
    duracion: 3000
  });

  const mostrarNotificacion = (tipo, mensaje, titulo = '', duracion = 3000) => {
    setConfig({ tipo, mensaje, titulo, duracion });
    setIsOpen(true);
  };

  const success = (mensaje, titulo = '¡Éxito!', duracion = 3000) => {
    mostrarNotificacion('success', mensaje, titulo, duracion);
  };

  const error = (mensaje, titulo = 'Error', duracion = 4000) => {
    mostrarNotificacion('error', mensaje, titulo, duracion);
  };

  const warning = (mensaje, titulo = 'Advertencia', duracion = 3500) => {
    mostrarNotificacion('warning', mensaje, titulo, duracion);
  };

  const info = (mensaje, titulo = 'Información', duracion = 3000) => {
    mostrarNotificacion('info', mensaje, titulo, duracion);
  };

  const close = () => setIsOpen(false);

  return (
    <NotificacionContext.Provider value={{ success, error, warning, info }}>
      {children}
      <NotificacionModal 
        isOpen={isOpen}
        onClose={close}
        tipo={config.tipo}
        titulo={config.titulo}
        mensaje={config.mensaje}
        duracion={config.duracion}
      />
    </NotificacionContext.Provider>
  );
}