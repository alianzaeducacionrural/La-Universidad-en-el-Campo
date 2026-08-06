// =============================================
// MODAL: CONFIRMAR ELIMINACIÓN (ACCIONES DESTRUCTIVAS)
// =============================================
// Reutilizable para cualquier borrado irreversible. En vez de pedir que el texto
// coincida con un nombre (frágil: mayúsculas, tildes, espacios), pide escribir
// la palabra "Confirmar".

import { useState, useEffect } from 'react';

const PALABRA_CONFIRMACION = 'Confirmar';

export default function ModalConfirmarEliminacion({ isOpen, onClose, onConfirmar, titulo, mensaje, cargando = false }) {
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (isOpen) setTexto('');
  }, [isOpen]);

  const habilitado = texto.trim() === PALABRA_CONFIRMACION;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
        <div className="p-6 border-b bg-red-50 rounded-t-xl">
          <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
            <span>⚠️</span> {titulo}
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700 whitespace-pre-line">{mensaje}</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Escribe <span className="font-bold text-red-700">{PALABRA_CONFIRMACION}</span> para continuar
            </label>
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={PALABRA_CONFIRMACION}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && habilitado && !cargando) onConfirmar(); }}
            />
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3 rounded-b-xl">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={!habilitado || cargando}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50"
          >
            {cargando ? 'Eliminando...' : '🗑️ Eliminar definitivamente'}
          </button>
        </div>
      </div>
    </div>
  );
}
