// =============================================
// COMPONENTE: SELECT CON OPCIÓN "OTRO"
// =============================================
// Muestra un <select> con las opciones dadas más "Otro..."; al elegir "Otro"
// se reemplaza por un input de texto libre. El valor que maneja el padre es
// siempre el string final (de la lista o escrito a mano) — el componente
// decide solo, según si ese valor está en `options`, en qué modo arrancar.

import { useState, useEffect } from 'react';

export default function SelectConOtro({
  label,
  options,
  value,
  onChange,
  required = false,
  placeholder = 'Seleccionar...',
  otroPlaceholder = 'Escribir...',
  className = ''
}) {
  const [modoOtro, setModoOtro] = useState(value !== '' && !options.includes(value));

  useEffect(() => {
    if (value === '') { setModoOtro(false); return; }
    if (!options.includes(value)) setModoOtro(true);
  }, [value, options]);

  const baseClass = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none';

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      {modoOtro ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            required={required}
            placeholder={otroPlaceholder}
            className={baseClass}
          />
          {options.length > 0 && (
            <button
              type="button"
              onClick={() => { setModoOtro(false); onChange(''); }}
              className="text-xs text-gray-500 hover:text-primary underline whitespace-nowrap"
            >
              volver a lista
            </button>
          )}
        </div>
      ) : (
        <select
          value={options.includes(value) ? value : ''}
          onChange={e => {
            if (e.target.value === '__otro__') { setModoOtro(true); onChange(''); }
            else onChange(e.target.value);
          }}
          required={required}
          className={baseClass}
        >
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
          <option value="__otro__">Otro...</option>
        </select>
      )}
    </div>
  );
}
