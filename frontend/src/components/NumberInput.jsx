import { useState, useEffect, useRef } from 'react';

/**
 * Number input with automatic thousand separator formatting.
 * Supports decimals (Indonesian style: comma for decimal, dot for thousands).
 */
export default function NumberInput({ 
  value, 
  onChange, 
  prefix = '', 
  suffix = '', 
  allowDecimals = false, 
  className = '', 
  ...props 
}) {
  const [display, setDisplay] = useState('');
  const inputRef = useRef(null);

  // Format number with dots as thousand separator (Indonesian style)
  const formatNumber = (val) => {
    if (val === null || val === undefined || val === '') return '';
    let str = String(val);
    
    if (allowDecimals) {
      // replace comma with dot for parsing
      str = str.replace(/[^\d.,]/g, '').replace(/,/g, '.');
      const parts = str.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      if (parts.length > 1) {
        return parts[0] + ',' + parts.slice(1).join('');
      }
      return parts[0];
    } else {
      str = str.replace(/[^\d]/g, '');
      return str.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
  };

  // Parse formatted string back to raw number string
  const parseNumber = (formatted) => {
    if (allowDecimals) {
      return formatted.replace(/\./g, '').replace(/,/g, '.');
    }
    return formatted.replace(/\./g, '');
  };

  useEffect(() => {
    if (value === undefined || value === null) {
      setDisplay('');
      return;
    }
    
    // Prevent formatting from removing a trailing comma while the user is typing it
    const strVal = String(value);
    const parsedDisplay = parseNumber(display);
    
    if (strVal !== parsedDisplay) {
      setDisplay(formatNumber(strVal));
    }
  }, [value, allowDecimals]);

  const handleChange = (e) => {
    let input = e.target.value;
    
    // Strip prefix/suffix if present
    if (prefix) input = input.replace(new RegExp('^' + prefix + '\\s*'), '');
    if (suffix) input = input.replace(new RegExp('\\s*' + suffix + '$'), '');
    
    // If user is just typing a comma, allow it in display but don't send to onChange yet 
    // or send as is so it doesn't break.
    if (allowDecimals && (input.endsWith(',') || input.endsWith('.'))) {
      input = input.replace(/\.$/, ','); // auto convert dot to comma for display
      const parsed = parseNumber(input);
      setDisplay(formatNumber(parsed) + ',');
      
      if (onChange) {
         onChange({ target: { value: parsed + '.', name: e.target.name } });
      }
      return;
    }

    const raw = parseNumber(input);

    if (!allowDecimals && raw && !/^\d+$/.test(raw)) return;
    if (allowDecimals && raw && !/^\d*\.?\d*$/.test(raw)) return;

    setDisplay(formatNumber(raw));

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
        inputMode={allowDecimals ? "decimal" : "numeric"}
        value={display}
        onChange={handleChange}
        className={`${className} ${prefix ? 'pl-11' : ''} ${suffix ? 'pr-11' : ''}`}
        {...props}
      />
      {suffix && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none select-none">
          {suffix}
        </span>
      )}
    </div>
  );
}
