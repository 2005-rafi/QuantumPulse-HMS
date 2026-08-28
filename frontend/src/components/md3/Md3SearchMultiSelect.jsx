import React, { useState, useRef, useEffect, useMemo } from 'react';
import './Md3SearchMultiSelect.css';

/**
 * Md3SearchMultiSelect — Reusable Material 3 Searchable Multi-Select Component
 * 
 * Props:
 * @param {string} title - Title of the component (e.g. "Departments", "Roles")
 * @param {string|React.ReactNode} icon - Material Symbols icon name or React element
 * @param {string} placeholder - Search placeholder text
 * @param {Array<string|{value: string, label: string, badge?: string}>} options - Dropdown items
 * @param {Array<string>} selectedValues - Current selected values array
 * @param {Function} onChange - Callback (newSelectedValues) => void
 * @param {string} emptyMessage - Message when search returns no match
 * @param {string} placeholderText - Text shown when no items are selected
 */
export const Md3SearchMultiSelect = ({
  title,
  icon,
  placeholder = 'Search & select...',
  options = [],
  selectedValues = [],
  onChange,
  emptyMessage = 'No matching options found',
  placeholderText = 'Showing all (None selected)',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Normalize options into { value, label, badge }
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt, badge: null };
      }
      return {
        value: opt.value ?? opt._id ?? opt.name,
        label: opt.label ?? opt.name ?? String(opt.value),
        badge: opt.badge ?? opt.code ?? null,
      };
    });
  }, [options]);

  // Lookup map for fast label retrieval in chip rendering
  const optionsMap = useMemo(() => {
    const map = new Map();
    normalizedOptions.forEach((opt) => {
      map.set(opt.value, opt);
    });
    return map;
  }, [normalizedOptions]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(q) || (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Toggle single option selection (multi-select one by one)
  const handleToggleOption = (value) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  // Remove single chip
  const handleRemoveChip = (value, e) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== value));
  };

  // Clear all selections in this component
  const handleClearAll = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  // Select all filtered options
  const handleSelectAll = (e) => {
    e.stopPropagation();
    const allFilteredValues = filteredOptions.map((o) => o.value);
    const combined = Array.from(new Set([...selectedValues, ...allFilteredValues]));
    onChange(combined);
  };

  return (
    <div className="md3-sms" ref={containerRef}>
      {/* ── 1. Component Title & Actions ── */}
      <div className="md3-sms__header">
        <div className="md3-sms__title-group">
          {icon && (
            <span className="material-symbols-rounded md3-sms__icon">
              {typeof icon === 'string' ? icon : icon}
            </span>
          )}
          <h4 className="md3-sms__title">{title}</h4>
        </div>

        <div className="md3-sms__actions">
          {selectedValues.length > 0 && (
            <>
              <span className="md3-sms__badge">{selectedValues.length} selected</span>
              <button
                type="button"
                className="md3-sms__clear-btn"
                onClick={handleClearAll}
                title={`Clear all ${title}`}
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 2. Searchable Input / Dropdown Trigger ── */}
      <div
        className={`md3-sms__trigger-box ${isOpen ? 'is-open' : ''}`}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <span className="material-symbols-rounded md3-sms__search-icon">search</span>
        <input
          ref={inputRef}
          type="text"
          className="md3-sms__input"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />

        <div className="md3-sms__trigger-suffix">
          {searchQuery && (
            <button
              type="button"
              className="md3-sms__reset-search-btn"
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
              }}
              title="Clear search query"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                close
              </span>
            </button>
          )}
          <button
            type="button"
            className={`md3-sms__chevron-btn ${isOpen ? 'is-rotated' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            title={isOpen ? 'Close menu' : 'Open menu'}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
              expand_more
            </span>
          </button>
        </div>
      </div>

      {/* ── 3. Anchored Dropdown Popover ── */}
      {isOpen && (
        <div className="md3-sms__popover">
          <div className="md3-sms__popover-toolbar">
            <span>
              {filteredOptions.length} {filteredOptions.length === 1 ? 'option' : 'options'}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {filteredOptions.length > 0 && (
                <button
                  type="button"
                  className="md3-sms__popover-quick-btn"
                  onClick={handleSelectAll}
                >
                  Select All
                </button>
              )}
              {selectedValues.length > 0 && (
                <button
                  type="button"
                  className="md3-sms__popover-quick-btn"
                  onClick={handleClearAll}
                >
                  Deselect All
                </button>
              )}
            </div>
          </div>

          <div className="md3-sms__options-list">
            {filteredOptions.length === 0 ? (
              <div className="md3-sms__empty">
                <span className="material-symbols-rounded md3-sms__empty-icon">search_off</span>
                <span>{emptyMessage}</span>
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`md3-sms__option-row ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleToggleOption(opt.value)}
                  >
                    <div className="md3-sms__option-left">
                      <div className="md3-sms__checkbox">
                        {isSelected && (
                          <span
                            className="material-symbols-rounded"
                            style={{ fontSize: '13px', fontWeight: 800 }}
                          >
                            check
                          </span>
                        )}
                      </div>
                      <span className="md3-sms__option-label">{opt.label}</span>
                    </div>

                    {opt.badge && <span className="md3-sms__option-badge">{opt.badge}</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── 4. Selected Items Chips Deck (Visible nearby inside component) ── */}
      <div className="md3-sms__chips-deck">
        {selectedValues.length === 0 ? (
          <span className="md3-sms__placeholder-text">{placeholderText}</span>
        ) : (
          selectedValues.map((val) => {
            const opt = optionsMap.get(val);
            const displayLabel = opt ? opt.label : val;
            return (
              <div key={val} className="md3-sms__chip">
                <span>{displayLabel}</span>
                <button
                  type="button"
                  className="md3-sms__chip-remove-btn"
                  onClick={(e) => handleRemoveChip(val, e)}
                  title={`Remove ${displayLabel}`}
                >
                  <span className="material-symbols-rounded md3-sms__chip-remove-icon">
                    close
                  </span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Md3SearchMultiSelect;
