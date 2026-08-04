// =============================================
// MODAL: ENLACES DE INSTITUCIONES DEL GRUPO (SOLO LECTURA)
// =============================================
// Muestra las instituciones educativas presentes en un grupo (según sus
// estudiantes) junto al enlace de solo lectura de cada una, para copiarlo
// rápido sin tener que ir hasta la pestaña de Instituciones del panel.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';

export default function ModalEnlacesInstituciones({ isOpen, onClose, grupo, municipiosPermitidos = null, institucionesPermitidas = null }) {
  const notificacion = useNotificacion();
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (isOpen) cargarDatos();
  }, [isOpen]);

  async function cargarDatos() {
    setCargando(true);

    let query = supabase.from('estudiantes').select('institucion_educativa, municipio').eq('grupo_id', grupo.id);
    if (municipiosPermitidos) query = query.in('municipio', municipiosPermitidos);
    const { data: estudiantesGrupo } = await query;

    const comboMap = new Map();
    (estudiantesGrupo || []).forEach(e => {
      if (!e.institucion_educativa || !e.municipio) return;
      const clave = `${e.institucion_educativa}|${e.municipio}`;
      if (!comboMap.has(clave)) comboMap.set(clave, { nombre: e.institucion_educativa, municipio: e.municipio });
    });
    let combos = [...comboMap.values()];
    if (institucionesPermitidas) combos = combos.filter(c => institucionesPermitidas.includes(c.nombre));
    combos.sort((a, b) => a.nombre.localeCompare(b.nombre));

    const nombresUnicos = [...new Set(combos.map(c => c.nombre))];
    const { data: institucionesData } = nombresUnicos.length > 0
      ? await supabase.from('instituciones').select('id, nombre, token_acceso, token_activo, municipios:municipio_id (nombre)').in('nombre', nombresUnicos)
      : { data: [] };

    const mapaInstituciones = new Map();
    (institucionesData || []).forEach(i => {
      mapaInstituciones.set(`${i.nombre}|${i.municipios?.nombre}`, i);
    });

    setFilas(combos.map(c => ({ ...c, institucion: mapaInstituciones.get(`${c.nombre}|${c.municipio}`) || null })));
    setCargando(false);
  }

  function copiarLink(institucion) {
    const url = `${window.location.origin}/ie/${institucion.token_acceso}`;
    navigator.clipboard.writeText(url)
      .then(() => notificacion.success('Enlace copiado al portapapeles'))
      .catch(() => notificacion.error('No se pudo copiar el enlace'));
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-800">🔗 Enlaces de Instituciones</h3>
          <p className="text-sm text-gray-600 mt-1">Grupo: {grupo.nombre}</p>
        </div>

        <div className="p-6">
          {cargando ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="text-gray-500 mt-2">Cargando...</p>
            </div>
          ) : filas.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Este grupo no tiene instituciones registradas todavía.</p>
          ) : (
            <div className="space-y-2">
              {filas.map(f => (
                <div key={`${f.nombre}|${f.municipio}`} className="flex items-center justify-between bg-gray-50 border border-gray-200 p-3 rounded-lg gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">🏫 {f.nombre}</p>
                    <p className="text-xs text-gray-500">📍 {f.municipio}</p>
                  </div>
                  {f.institucion?.token_activo && f.institucion?.token_acceso ? (
                    <button
                      onClick={() => copiarLink(f.institucion)}
                      className="flex-shrink-0 text-xs bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-lg transition"
                    >
                      📋 Copiar
                    </button>
                  ) : (
                    <span className="flex-shrink-0 text-xs text-amber-600">⚠️ Sin enlace</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
