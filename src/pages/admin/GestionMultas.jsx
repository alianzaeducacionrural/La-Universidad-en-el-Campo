// =============================================
// PÁGINA: GESTIÓN DE MULTAS (CON COMPROBANTE E HISTORIAL)
// =============================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useNotificacion } from '../../context/NotificacionContext';
import { formatearFecha } from '../../utils/helpers';
import jsPDF from 'jspdf';

export default function GestionMultas({ onVerPerfil }) {
  const { perfil: usuario } = useAuth();
  const notificacion = useNotificacion();
  const [multas, setMultas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [vistaActiva, setVistaActiva] = useState('multas');
  const [modalCarta, setModalCarta] = useState(false);
  const [modalPago, setModalPago] = useState(false);
  const [modalHistorialPagos, setModalHistorialPagos] = useState(false);
  const [multaSeleccionada, setMultaSeleccionada] = useState(null);
  const [numeroCarta, setNumeroCarta] = useState(1);
  const [fechaCarta, setFechaCarta] = useState(new Date().toISOString().split('T')[0]);
  const [valorPago, setValorPago] = useState('');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [comprobantePago, setComprobantePago] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [modalDetalleCarta, setModalDetalleCarta] = useState(false);
  const [cartaSeleccionada, setCartaSeleccionada] = useState(null);

  useEffect(() => { cargarMultas(); }, []);

  async function cargarMultas() {
    setCargando(true);
    const { data } = await supabase
      .from('multas_desercion')
      .select(`*, estudiante:estudiante_id (*), cartas:cartas_cobro(*), pagos:pagos_multa(*)`)
      .order('created_at', { ascending: false });
    if (data) {
      setMultas(data.map(m => ({
        ...m,
        total_pagado: (m.pagos || []).reduce((sum, p) => sum + (p.valor || 0), 0),
        saldo: m.valor_total - (m.pagos || []).reduce((sum, p) => sum + (p.valor || 0), 0)
      })));
    }
    setCargando(false);
  }

  function getEstadoColor(estado) {
    switch(estado) {
      case 'pendiente': return 'bg-red-100 text-red-700';
      case 'abonando': return 'bg-amber-100 text-amber-700';
      case 'pagado': return 'bg-green-100 text-green-700';
      case 'condonado': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  function getEstadoLabel(estado) {
    switch(estado) {
      case 'pendiente': return 'Pendiente';
      case 'abonando': return 'Abonando';
      case 'pagado': return 'Pagado';
      case 'condonado': return 'Condonado';
      default: return estado;
    }
  }

  async function handleGenerarCarta(e) {
    e.preventDefault();
    const cartasExistentes = multaSeleccionada.cartas || [];
    if (cartasExistentes.find(c => c.numero_carta === numeroCarta)) {
      notificacion.warning(`La carta #${numeroCarta} ya fue generada`, 'Carta existente');
      return;
    }
    const { error } = await supabase
      .from('cartas_cobro')
      .insert([{ multa_id: multaSeleccionada.id, numero_carta: numeroCarta, fecha_emision: fechaCarta }]);
    if (error) { notificacion.error(error.message, 'Error al generar carta'); }
    else { notificacion.success(`Carta de Cobro #${numeroCarta} generada correctamente`); setModalCarta(false); cargarMultas(); }
  }

  async function handleRegistrarPago(e) {
    e.preventDefault();
    
    if (!valorPago || parseFloat(valorPago) <= 0) {
      notificacion.warning('Ingresa un valor válido', 'Campo requerido');
      return;
    }
    
    setCargando(true);
    
    try {
      let comprobanteUrl = null;
      
      // Subir comprobante si existe
      if (comprobantePago) {
        const nombreArchivo = `${Date.now()}_${comprobantePago.name.replace(/\s+/g, '_')}`;
        const ruta = `pagos/${multaSeleccionada.id}/${nombreArchivo}`;
        
        const { error: errorUpload } = await supabase.storage
          .from('evidencias')
          .upload(ruta, comprobantePago);
        
        if (!errorUpload) {
          const { data: urlData } = supabase.storage
            .from('evidencias')
            .getPublicUrl(ruta);
          comprobanteUrl = urlData.publicUrl;
        }
      }
      
      // Insertar pago
      const { error: errorPago } = await supabase
        .from('pagos_multa')
        .insert([{
          multa_id: multaSeleccionada.id,
          valor: parseFloat(valorPago),
          fecha_pago: fechaPago,
          comprobante_url: comprobanteUrl,
          observaciones: null
        }]);
      
      if (errorPago) throw errorPago;
      
      // Actualizar estado de la multa
      const totalPagado = (multaSeleccionada.total_pagado || 0) + parseFloat(valorPago);
      const saldoRestante = multaSeleccionada.valor_total - totalPagado;
      const nuevoEstado = saldoRestante <= 0 ? 'pagado' : 'abonando';
      
      await supabase
        .from('multas_desercion')
        .update({ estado: nuevoEstado })
        .eq('id', multaSeleccionada.id);
      
      notificacion.success('Pago registrado correctamente');
      setModalPago(false);
      setValorPago('');
      setComprobantePago(null);
      cargarMultas();
    } catch (error) {
      console.error('Error:', error);
      notificacion.error(error.message, 'Error al registrar pago');
    } finally {
      setCargando(false);
    }
  }

  const totalRecaudado = multas.reduce((sum, m) => sum + (m.total_pagado || 0), 0);
  const totalPendiente = multas.reduce((sum, m) => sum + (m.saldo || 0), 0);

  const multasFiltradas = multas.filter(m => {
    if (busqueda) {
      const nombre = m.estudiante?.nombre_completo?.toLowerCase() || '';
      const documento = m.estudiante?.documento?.toLowerCase() || '';
      const busq = busqueda.toLowerCase();
      if (!nombre.includes(busq) && !documento.includes(busq)) return false;
    }
    if (filtroEstado !== 'todas' && m.estado !== filtroEstado) return false;
    return true;
  });

  if (!usuario) return <LoadingSpinner mensaje="Cargando..." />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar vistaActiva={vistaActiva} setVistaActiva={setVistaActiva} rol={usuario.rol} />
      <div className="flex-1">
        <Header onVerPerfil={onVerPerfil} />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">💰 Gestión de Multas por Deserción</h1>
          <p className="text-gray-600 mb-6">Administra las multas de estudiantes desertores sin justificar</p>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm">
              <p className="text-3xl font-bold text-blue-700">{multas.length}</p>
              <p className="text-sm text-gray-500">Total Multas</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm">
              <p className="text-3xl font-bold text-green-700">${totalRecaudado.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Total Recaudado</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm">
              <p className="text-3xl font-bold text-red-700">${totalPendiente.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Saldo Pendiente</p>
            </div>
          </div>

          {/* BUSCADOR Y FILTROS */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <input
              type="text"
              placeholder="🔍 Buscar estudiante por nombre o documento..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full md:w-96 border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white shadow-sm"
            />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white shadow-sm"
            >
              <option value="todas">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="abonando">Abonando</option>
              <option value="pagado">Pagado</option>
            </select>
            {(busqueda || filtroEstado !== 'todas') && (
              <button
                onClick={() => { setBusqueda(''); setFiltroEstado('todas'); }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                🔄 Limpiar filtros
              </button>
            )}
          </div>

          {/* Tabla de Multas */}
          {cargando ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12">
              <LoadingSpinner mensaje="Cargando multas..." />
            </div>
          ) : multasFiltradas.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500">{busqueda ? 'No se encontraron estudiantes' : 'No hay multas registradas'}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4">Estudiante</th>
                      <th className="text-left py-3 px-4">Valor Multa</th>
                      <th className="text-left py-3 px-4">Pagado</th>
                      <th className="text-left py-3 px-4">Saldo</th>
                      <th className="text-left py-3 px-4">Estado</th>
                      <th className="text-left py-3 px-4">Cartas</th>
                      <th className="text-center py-3 px-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {multasFiltradas.map(multa => (
                      <tr key={multa.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium">{multa.estudiante?.nombre_completo}</p>
                          <p className="text-xs text-gray-500">{multa.estudiante?.documento} • {multa.estudiante?.municipio}</p>
                        </td>
                        <td className="py-3 px-4 font-medium">${multa.valor_total.toLocaleString()}</td>
                        <td className="py-3 px-4 text-green-600 font-medium">${(multa.total_pagado || 0).toLocaleString()}</td>
                        <td className="py-3 px-4 text-red-600 font-medium">${(multa.saldo || 0).toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(multa.estado)}`}>
                            {getEstadoLabel(multa.estado)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {(multa.cartas || []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {(multa.cartas || []).map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => {setMultaSeleccionada(multa); setCartaSeleccionada(c); setModalDetalleCarta(true); }}
                                  className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium hover:bg-blue-200 transition"
                                  title={`Ver Carta #${c.numero_carta}`}
                                >
                                  #{c.numero_carta}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Ninguna</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => onVerPerfil(multa.estudiante)}
                              className="bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-sm"
                            >
                              👁️ Perfil
                            </button>
                            <button
                              onClick={() => { setMultaSeleccionada(multa); setModalPago(false); setModalCarta(true); }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-sm"
                            >
                              📄 Carta
                            </button>
                            <button
                              onClick={() => { setMultaSeleccionada(multa); setModalCarta(false); setModalPago(true); }}
                              disabled={multa.estado === 'pagado'}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-sm disabled:opacity-50"
                            >
                              💰 Pago
                            </button>
                            {(multa.pagos || []).length > 0 && (
                              <button
                                onClick={() => { setMultaSeleccionada(multa); setModalHistorialPagos(true); }}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-sm"
                              >
                                📋 Pagos
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Generar Carta */}
      {modalCarta && multaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold">📄 Generar Carta de Cobro</h3>
              <p className="text-sm text-gray-600">{multaSeleccionada.estudiante?.nombre_completo}</p>
            </div>
            <form onSubmit={handleGenerarCarta}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Número de Carta *</label>
                  <select value={numeroCarta} onChange={e => setNumeroCarta(parseInt(e.target.value))} className="w-full border rounded-lg px-3 py-2.5">
                    <option value={1}>Carta de Cobro #1</option>
                    <option value={2}>Carta de Cobro #2</option>
                    <option value={3}>Carta de Cobro #3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fecha de Emisión *</label>
                  <input type="date" value={fechaCarta} onChange={e => setFechaCarta(e.target.value)} max={new Date().toISOString().split('T')[0]} className="w-full border rounded-lg px-3 py-2.5" required />
                </div>
              </div>
              <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3">
                <button type="button" onClick={() => setModalCarta(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium">📄 Generar Carta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Pago */}
      {modalPago && multaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold">💰 Registrar Pago</h3>
              <p className="text-sm text-gray-600">
                {multaSeleccionada.estudiante?.nombre_completo} | Saldo: ${multaSeleccionada.saldo?.toLocaleString()}
              </p>
            </div>
            <form onSubmit={handleRegistrarPago}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Valor del Pago *</label>
                  <input type="number" value={valorPago} onChange={e => setValorPago(e.target.value)} placeholder="0" min="0" className="w-full border rounded-lg px-3 py-2.5" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fecha de Pago *</label>
                  <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} max={new Date().toISOString().split('T')[0]} className="w-full border rounded-lg px-3 py-2.5" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">📎 Comprobante de Pago (opcional)</label>
                  <input type="file" accept=".pdf,image/*" onChange={(e) => setComprobantePago(e.target.files[0])} className="w-full border rounded-lg px-3 py-2.5 text-sm" />
                  {comprobantePago && <p className="text-xs text-green-600 mt-1">✅ {comprobantePago.name}</p>}
                </div>
              </div>
              <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3">
                <button type="button" onClick={() => { setModalPago(false); setComprobantePago(null); }} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={cargando} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50">
                  {cargando ? 'Procesando...' : '💰 Registrar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historial de Pagos */}
      {modalHistorialPagos && multaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold">📋 Historial de Pagos</h3>
              <p className="text-sm text-gray-600">
                {multaSeleccionada.estudiante?.nombre_completo} | Multa total: ${multaSeleccionada.valor_total?.toLocaleString()}
              </p>
            </div>
            <div className="p-6">
              {(multaSeleccionada.pagos || []).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay pagos registrados</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-600 pb-2 border-b">
                    <span>Fecha</span>
                    <span>Valor</span>
                    <span>Comprobante</span>
                    <span></span>
                  </div>
                  {(multaSeleccionada.pagos || []).map(pago => (
                    <div key={pago.id} className="grid grid-cols-4 gap-4 text-sm items-center py-2 border-b border-gray-100">
                      <span className="text-gray-800">{formatearFecha(pago.fecha_pago)}</span>
                      <span className="font-medium text-green-600">${pago.valor?.toLocaleString()}</span>
                      <span>
                        {pago.comprobante_url ? (
                          <a href={pago.comprobante_url} target="_blank" rel="noopener noreferrer" 
                            className="text-blue-600 hover:text-blue-800 text-xs flex items-center space-x-1">
                            <span>👁️</span><span>Ver comprobante</span>
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">Sin comprobante</span>
                        )}
                      </span>
                      <span className="text-right text-xs text-gray-400">
                        {pago.observaciones || ''}
                      </span>
                    </div>
                  ))}
                  <div className="pt-3 border-t flex justify-between font-medium">
                    <span>Total pagado:</span>
                    <span className="text-green-600">${multaSeleccionada.total_pagado?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Saldo pendiente:</span>
                    <span className="text-red-600">${multaSeleccionada.saldo?.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button onClick={() => setModalHistorialPagos(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cerrar</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Detalle de Carta */}
        {modalDetalleCarta && cartaSeleccionada && multaSeleccionada && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
              <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-blue-100">
                <h3 className="text-lg font-bold text-gray-800">📄 Carta de Cobro #{cartaSeleccionada.numero_carta}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {multaSeleccionada.estudiante?.nombre_completo}
                </p>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Datos del estudiante */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">👤 Datos del Estudiante</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><strong>Nombre:</strong> {multaSeleccionada.estudiante?.nombre_completo}</p>
                    <p><strong>Documento:</strong> {multaSeleccionada.estudiante?.documento || 'N/A'}</p>
                    <p><strong>Municipio:</strong> {multaSeleccionada.estudiante?.municipio || 'N/A'}</p>
                  </div>
                </div>
                
                {/* Datos de la multa */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">💰 Datos de la Multa</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><strong>Valor total:</strong> ${multaSeleccionada.valor_total?.toLocaleString()}</p>
                    <p><strong>Saldo pendiente:</strong> ${multaSeleccionada.saldo?.toLocaleString()}</p>
                    <p><strong>Total pagado:</strong> ${multaSeleccionada.total_pagado?.toLocaleString()}</p>
                    <p><strong>Estado:</strong> {getEstadoLabel(multaSeleccionada.estado)}</p>
                  </div>
                </div>
                
                {/* Datos de la carta */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-gray-700 mb-2">📋 Datos de la Carta</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><strong>Número de carta:</strong> #{cartaSeleccionada.numero_carta} de 3</p>
                    <p><strong>Fecha de emisión:</strong> {formatearFecha(cartaSeleccionada.fecha_emision)}</p>
                    {cartaSeleccionada.fecha_vencimiento && (
                      <p><strong>Fecha de vencimiento:</strong> {formatearFecha(cartaSeleccionada.fecha_vencimiento)}</p>
                    )}
                    <p><strong>Estado:</strong> {cartaSeleccionada.estado === 'enviada' ? '✅ Enviada' : cartaSeleccionada.estado === 'respondida' ? '📩 Respondida' : '⏰ Vencida'}</p>
                  </div>
                </div>
                
                {/* Acciones */}
                <div className="flex justify-center space-x-3 pt-2">
                  <button
                    onClick={() => {
                      // Generar PDF básico de la carta
                      const doc = new jsPDF();
                      doc.setFontSize(16);
                      doc.text('CARTA DE COBRO', 14, 20);
                      doc.setFontSize(12);
                      doc.text(`Carta #${cartaSeleccionada.numero_carta} de 3`, 14, 30);
                      doc.text(`Fecha: ${formatearFecha(cartaSeleccionada.fecha_emision)}`, 14, 38);
                      doc.text(`Estudiante: ${multaSeleccionada.estudiante?.nombre_completo}`, 14, 46);
                      doc.text(`Documento: ${multaSeleccionada.estudiante?.documento || 'N/A'}`, 14, 54);
                      doc.text(`Valor de la multa: $${multaSeleccionada.valor_total?.toLocaleString()}`, 14, 62);
                      doc.text(`Saldo pendiente: $${multaSeleccionada.saldo?.toLocaleString()}`, 14, 70);
                      doc.save(`Carta_Cobro_${cartaSeleccionada.numero_carta}_${multaSeleccionada.estudiante?.nombre_completo?.replace(/\s+/g, '_')}.pdf`);
                    }}
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    📥 Descargar PDF
                  </button>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 border-t flex justify-end">
                <button onClick={() => setModalDetalleCarta(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cerrar</button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}