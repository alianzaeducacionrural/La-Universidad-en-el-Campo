// =============================================
// COMPONENTE: BOTÓN DE WHATSAPP REUTILIZABLE
// =============================================

export default function BotonWhatsApp({ 
  telefono, 
  prefijo = '+57', 
  mensaje = '', 
  label = 'WhatsApp',
  size = 'md',
  className = ''
}) {
  if (!telefono) return null;
  
  // Limpiar el número
  const numeroLimpio = telefono.replace(/\D/g, '');
  const prefijoLimpio = prefijo.replace(/\D/g, '');
  
  let enlace = `https://wa.me/${prefijoLimpio}${numeroLimpio}`;
  
  if (mensaje) {
    enlace += `?text=${encodeURIComponent(mensaje)}`;
  }
  
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };
  
  return (
    <a
      href={enlace}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center space-x-1 bg-green-500 hover:bg-green-600 text-white rounded-lg transition ${sizes[size]} ${className}`}
    >
      <span>💬</span>
      <span>{label}</span>
    </a>
  );
}