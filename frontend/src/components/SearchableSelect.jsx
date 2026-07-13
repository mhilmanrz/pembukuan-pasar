import { useState, useEffect, useRef } from 'react';

/**
 * SearchableSelect — Searchable dropdown with ability to add new items.
 * 
 * Props:
 * - value: current value
 * - onChange: callback when value changes
 * - options: array of strings to search from
 * - placeholder: input placeholder
 * - required: input required
 */
export default function SearchableSelect({ value, onChange, options = [], placeholder = '', required = false }) {
  const [query, setQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Sync internal query when external value changes (e.g. reset form)
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Filter options based on query
  useEffect(() => {
    if (!query.trim()) {
      setFiltered(options);
    } else {
      const q = query.toLowerCase();
      setFiltered(options.filter(opt => opt.toLowerCase().includes(q)));
    }
    setHighlightIdx(-1);
  }, [query, options]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setIsOpen(true);
  };

  const handleSelect = (option) => {
    setQuery(option);
    onChange(option);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(prev => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(prev => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter' && highlightIdx >= 0 && isOpen) {
      e.preventDefault();
      handleSelect(filtered[highlightIdx]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const showNewBadge = query.trim() && !options.some(opt => opt.toLowerCase() === query.toLowerCase());

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary pr-10"
          autoComplete="off"
        />
        {/* Dropdown arrow */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => { setIsOpen(!isOpen); inputRef.current?.focus(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-muted hover:text-text-primary transition-colors"
        >
          <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-surface-elevated border border-border rounded-xl shadow-2xl overflow-hidden animate-slide-down max-h-48 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((opt, idx) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  idx === highlightIdx
                    ? 'bg-melon-500/20 text-melon-400'
                    : 'text-text-primary hover:bg-surface-card'
                }`}
              >
                {opt}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-text-muted text-center">
              Tidak ada hasil
            </div>
          )}

          {/* New item badge */}
          {showNewBadge && (
            <div className="border-t border-border px-4 py-2.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 bg-melon-500/15 text-melon-400 text-xs font-medium px-2 py-1 rounded-full">
                ✨ Baru
              </span>
              <span className="text-sm text-text-secondary truncate">
                Tambah "<span className="text-text-primary font-medium">{query.trim()}</span>"
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
