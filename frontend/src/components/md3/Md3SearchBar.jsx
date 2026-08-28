import React, { useRef, useEffect } from 'react';
import './Md3SearchBar.css';

/**
 * Md3SearchBar — Pure Material Design 3 Search Bar Component.
 *
 * Implements M3 Search specifications:
 * - Surface container high elevation with rounded-full geometry
 * - Leading search icon
 * - Trailing clear button & match count badge
 * - Keyboard navigation (Esc to clear, Ctrl/Cmd+K to focus)
 *
 * @param {Object} props
 * @param {string} props.value - Current query string
 * @param {function} props.onChange - Handler called with new string
 * @param {string} [props.placeholder] - Input placeholder
 * @param {number} [props.matchCount] - Number of search matches
 * @param {boolean} [props.loading] - Whether search is in progress
 * @param {string} [props.className] - Additional class names
 * @param {boolean} [props.compact] - Compact size variant
 */
export const Md3SearchBar = ({
  value = '',
  onChange,
  placeholder = 'Search by name, MRN, token, reason...',
  matchCount,
  loading = false,
  className = '',
  compact = false,
  autoFocus = false,
}) => {
  const inputRef = useRef(null);

  // Global hotkey: Ctrl+K or Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = () => {
    onChange?.('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div
      className={`md3-search-bar ${compact ? 'md3-search-bar--compact' : ''} ${value ? 'md3-search-bar--has-value' : ''} ${className}`}
      role="search"
    >
      <span className="material-symbols-rounded md3-search-bar__leading-icon">
        {loading ? 'progress_activity' : 'search'}
      </span>

      <input
        ref={inputRef}
        type="text"
        className="md3-search-bar__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
        aria-label={placeholder}
      />

      <div className="md3-search-bar__trailing">
        {/* Match Count Badge */}
        {value && matchCount !== undefined && (
          <span className="md3-search-bar__count-badge" title={`${matchCount} matches found`}>
            {matchCount} {matchCount === 1 ? 'result' : 'results'}
          </span>
        )}

        {/* Clear Button */}
        {value ? (
          <button
            type="button"
            className="md3-search-bar__clear-btn"
            onClick={handleClear}
            aria-label="Clear search query"
            title="Clear search (Esc)"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        ) : (
          <span className="md3-search-bar__shortcut-hint" title="Press Ctrl+K to search">
            ⌘K
          </span>
        )}
      </div>
    </div>
  );
};

export default Md3SearchBar;
