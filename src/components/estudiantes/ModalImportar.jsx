// =============================================
// MODAL: IMPORTAR ESTUDIANTES (CON NOTIFICACIONES)
// =============================================

import { useState } from 'react';
import { useNotificacion } from '../../context/NotificacionContext';
import * as XLSX from 'xlsx';

export default function ModalImportar({ isOpen, onClose, onImportar, grupoSeleccionado }) {
  const notificacion = useNotificacion();
  const [archivoExcel, setArchivoExcel] = useState(null);
  const [cargando, setCargando] = useState(false);

  const descargarPlantilla = () => {
    const datos = [{ nombre_completo: 'María Pérez', documento: '12345678', genero: 'Femenino', telefono: '3115551234', correo: 'maria@email.com', acudiente_nombre: 'Dora Ríos', acudiente_telefono: '3105559876', municipio: 'Aguadas', institucion_educativa: 'I.E. San José' }];
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'plantilla_estudiantes.xlsx');
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!archivoExcel) return notificacion.warning('Selecciona un archivo Excel', 'Atención');
    setCargando(true);
    const resultado = await onImportar(archivoExcel);
    setCargando(false);
    if (resultado.success) {
      notificacion.success(`Importación completada: ${resultado.insertados} insertados, ${resultado.errores} errores`);
      onClose();
      setArchivoExcel(null);
    } else {
      notificacion.error(resultado.error, 'Error al importar');
    }
  }

  if (!isOpen || !grupoSeleccionado) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
        <div className="p-6 border-b"><h3 className="text-lg font-bold">📥 Importar Estudiantes</h3><p className="text-sm text-gray-600">Grupo: <span className="font-medium">{grupoSeleccionado.nombre}</span></p></div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-blue-800 font-medium">📋 Columnas requeridas:</p>
                  <ul className="text-xs text-blue-700"><li>✅ nombre_completo</li><li>✅ municipio</li><li>✅ institucion_educativa</li><li>📌 documento, genero, telefono, correo</li><li>📌 acudiente_nombre, acudiente_telefono</li></ul>
                </div>
                <button type="button" onClick={descargarPlantilla} className="bg-white border border-blue-300 text-blue-700 px-3 py-2 rounded-lg text-xs">📥 Descargar Plantilla</button>
              </div>
            </div>
            <div><label className="block text-sm mb-2">Archivo Excel</label><input type="file" accept=".xlsx,.xls,.csv" onChange={e => setArchivoExcel(e.target.files[0])} className="w-full border rounded-lg px-3 py-2.5" required /></div>
            {archivoExcel && <p className="text-sm text-green-600">✅ {archivoExcel.name}</p>}
            <div className="bg-gray-50 rounded-lg p-4"><p className="text-sm font-medium">Campos automáticos:</p><ul className="text-xs text-gray-500"><li>• Cohorte: {grupoSeleccionado.cohorte}</li><li>• Universidad: {grupoSeleccionado.universidad}</li><li>• Programa: {grupoSeleccionado.programa}</li></ul></div>
          </div>
          <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3"><button type="button" onClick={() => { onClose(); setArchivoExcel(null); }} className="px-4 py-2 text-gray-700">Cancelar</button><button type="submit" disabled={cargando} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg">{cargando ? 'Importando...' : 'Importar'}</button></div>
        </form>
      </div>
    </div>
  );
}