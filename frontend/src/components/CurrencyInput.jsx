import { useState, useEffect, useRef } from 'react';

/**
 * Currency input with automatic thousand separator formatting.
 * Displays "1.500.000" while storing raw number value.
 * 
 * Props same as <input> plus:
 * - value: raw numeric value (number or string)
 * - onChange: receives event-like object with e.target.value as raw number string
 * - prefix: optional prefix shown inside the input (default: "Rp")
 */
export default function CurrencyInput({ value, onChange, prefix = 'Rp', className = '', ...props }) {
  const [display, setDisplay] = useState('');
  const inputRef = useRef(null);

  // Format number with dots as thousand separator (Indonesian style)
  const formatNumber = (num) => {
    if (!num && num !== 0) return '';
    const str = String(num).replace(/[^\d]/g, '');
    if (!str) return '';
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Parse formatted string back to raw number
  const parseNumber = (formatted) => {
    return formatted.replace(/\./g, '');
  };

  // Sync display when value prop changes externally
  useEffect(() => {
    // Handle PostgreSQL NUMERIC values like "39580000.00" — strip decimal portion
    const num = parseFloat(value);
    const raw = (!isNaN(num) ? Math.round(num).toString() : String(value || '')).replace(/[^\d]/g, '');
    setDisplay(formatNumber(raw));
  }, [value]);

  const handleChange = (e) => {
    const input = e.target.value;
    // Strip prefix if user pastes it
    const cleaned = input.replace(/^Rp\s*/, '');
    const raw = parseNumber(cleaned);
    
    // Only allow digits
    if (raw && !/^\d+$/.test(raw)) return;

    setDisplay(formatNumber(raw));

    // Call onChange with raw numeric value
    if (onChange) {
      onChange({
        target: {
          value: raw,
          name: e.target.name,
        },
      });
    }
  };

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none select-none">
          {prefix}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        className={`${className} ${prefix ? 'pl-11' : ''}`}
        {...props}
      />
    </div>
  );
}
