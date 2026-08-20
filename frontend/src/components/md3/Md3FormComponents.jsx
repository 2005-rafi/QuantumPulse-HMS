import React from 'react';
import { createPortal } from 'react-dom';
import './Md3FormComponents.css';

export const Md3TextField = (props) => {
  const {
    id, name, type = 'text', label, value, onChange, placeholder,
    error, disabled, leadingIcon, trailingIcon, onTrailingIconClick,
    trailingIconAriaLabel, autoComplete, autoFocus
  } = props;

  const isDate = type === 'date';

  if (isDate) {
    return <Md3DatePicker {...props} />;
  }

  return (
    <div className={`md3-text-field-container ${error ? 'md3-error' : ''} ${disabled ? 'md3-disabled' : ''}`}>
      <div className="md3-field-wrapper">
        <input
          id={id}
          name={name}
          type={type}
          className={`md3-field-input ${leadingIcon ? 'has-leading' : ''} ${trailingIcon ? 'has-trailing' : ''} ${value ? 'is-filled' : ''}`}
          value={value}
          onChange={onChange}
          placeholder=" "
          disabled={disabled}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {label && <label htmlFor={id} className="md3-field-label">{label}</label>}
        
        {leadingIcon && <span className="md3-field-leading-icon">{leadingIcon}</span>}
        {trailingIcon && (
          <button
            type="button"
            className="md3-field-trailing-icon"
            onClick={onTrailingIconClick}
            tabIndex="-1"
            aria-label={trailingIconAriaLabel}
            disabled={disabled}
          >
            {trailingIcon}
          </button>
        )}
      </div>
      {error && (
        <span id={`${id}-error`} className="md3-field-error-text">{error}</span>
      )}
    </div>
  );
};

export const Md3Button = ({
  children,
  type = 'button',
  onClick,
  disabled,
  loading,
  loadingText = 'Loading...',
  variant = 'primary',
  className = '',
  style = {},
  ...props
}) => {
  return (
    <button
      type={type}
      className={`md3-btn md3-btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      style={style}
      {...props}
    >
      {loading ? (
        <>
          <span className="md3-spinner" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export const Md3Checkbox = ({
  checked,
  onChange,
  label
}) => {
  return (
    <div className="md3-checkbox-row" onClick={() => onChange(!checked)}>
      <div className={`md3-custom-checkbox ${checked ? 'checked' : ''}`}>
        {checked && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      {label && <span>{label}</span>}
    </div>
  );
};

export const Md3Select = ({
  id,
  name,
  label,
  value,
  onChange,
  options,
  children,
  error,
  disabled,
  leadingIcon,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [menuStyle, setMenuStyle] = React.useState({});
  const containerRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const searchInputRef = React.useRef(null);
  
  const isFilled = value !== '' && value !== null && value !== undefined;
  
  // Calculate top-layer floating viewport coordinates
  const updatePosition = React.useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const expectedMenuHeight = 280;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    const placeAbove = spaceBelow < expectedMenuHeight && spaceAbove > spaceBelow;
    const width = Math.max(rect.width, 220);
    let left = rect.left;
    if (left + width > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - width - 12);
    }

    const top = placeAbove
      ? Math.max(12, rect.top - 4)
      : rect.bottom + 4;

    setMenuStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      zIndex: 999999,
      transformOrigin: placeAbove ? 'bottom' : 'top',
      transform: placeAbove ? 'translateY(-100%)' : 'none',
    });
  }, []);

  // Sync position on open, scroll, or window resize
  React.useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  // Reset search term when dropdown closes & focus input on open
  React.useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    } else {
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 50);
    }
  }, [isOpen]);
  
  // Flatten options for easy indexing and keyboard navigation
  const flatOptions = React.useMemo(() => {
    if (children) {
      const childrenArray = React.Children.toArray(children);
      return childrenArray.map(child => ({
        value: child.props?.value,
        label: child.props?.children,
        disabled: child.props?.disabled || false
      }));
    }
    return options || [];
  }, [children, options]);

  // Filter options based on user search term
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm.trim()) return flatOptions;
    return flatOptions.filter(opt => 
      String(opt.label || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [flatOptions, searchTerm]);

  let selectedLabel = '';
  const selectedOption = flatOptions.find(opt => opt.value === value);
  if (selectedOption) {
    selectedLabel = selectedOption.label;
  }

  const handleClose = React.useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setFocusedIndex(-1);
    }, 180);
  }, []);

  const toggleOpen = () => {
    if (disabled) return;
    if (isOpen) {
      handleClose();
    } else {
      updatePosition();
      setIsOpen(true);
      const currentIndex = filteredOptions.findIndex(o => o.value === value);
      setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  };

  const handleSelect = (val) => {
    onChange({ target: { name, value: val } });
    handleClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (!isOpen) {
        toggleOpen();
      } else {
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          const opt = filteredOptions[focusedIndex];
          if (!opt.disabled) handleSelect(opt.value);
        }
      }
    } else if (e.key === ' ' && e.target.className !== 'md3-select-search-input') {
      e.preventDefault();
      e.stopPropagation();
      toggleOpen();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (!isOpen) {
        toggleOpen();
      } else {
        setFocusedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (!isOpen) {
        toggleOpen();
      } else {
        setFocusedIndex(prev => Math.max(prev - 1, 0));
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      const isInsideContainer = containerRef.current && containerRef.current.contains(event.target);
      const isInsideMenu = menuRef.current && menuRef.current.contains(event.target);
      if (!isInsideContainer && !isInsideMenu) {
        if (isOpen && !isClosing) handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, isClosing, handleClose]);

  return (
    <div 
      className={`md3-text-field-container md3-custom-select-container ${error ? 'md3-error' : ''} ${disabled ? 'md3-disabled' : ''}`}
      ref={containerRef}
    >
      <div className="md3-field-wrapper" onClick={toggleOpen}>
        <div
          id={id}
          className={`md3-field-input md3-custom-select-input ${leadingIcon ? 'has-leading' : ''} ${isFilled ? 'is-filled' : ''} ${isOpen ? 'is-focused' : ''}`}
          tabIndex={disabled ? -1 : 0}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={!!error}
          onKeyDown={handleKeyDown}
        >
          <span className="md3-select-display-text">{selectedLabel}</span>
        </div>
        {label && <label htmlFor={id} className={`md3-field-label md3-select-label ${isOpen || isFilled ? 'is-floating' : ''}`}>{label}</label>}
        {leadingIcon && <span className="md3-field-leading-icon">{leadingIcon}</span>}
        <span className={`md3-select-caret ${isOpen && !isClosing ? 'is-open' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>

      {(isOpen || isClosing) && createPortal(
        <div
          ref={menuRef}
          style={menuStyle}
          className={`md3-select-dropdown-menu ${isClosing ? 'is-closing' : ''}`}
          role="listbox"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="md3-select-search-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              className="md3-select-search-input"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setFocusedIndex(0);
              }}
              onKeyDown={handleKeyDown}
            />
          </div>
          <ul className="md3-select-dropdown-list">
            {filteredOptions.length === 0 ? (
              <li className="md3-select-dropdown-item is-disabled">No results found</li>
            ) : (
              filteredOptions.map((opt, index) => (
                <li 
                  key={opt.value}
                  className={`md3-select-dropdown-item ${opt.value === value ? 'is-selected' : ''} ${opt.disabled ? 'is-disabled' : ''} ${focusedIndex === index ? 'is-focused' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!opt.disabled) handleSelect(opt.value);
                  }}
                  onMouseEnter={() => !opt.disabled && setFocusedIndex(index)}
                  role="option"
                  aria-selected={opt.value === value}
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        </div>,
        document.body
      )}
      {error && <span id={`${id}-error`} className="md3-field-error-text">{error}</span>}
    </div>
  );
};

export const Md3BottomSheet = ({
  isOpen,
  onClose,
  title,
  subtitle,
  className = '',
  children
}) => {
  const [shouldRender, setShouldRender] = React.useState(isOpen);
  const [isClosing, setIsClosing] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 240); // 240ms exit animation
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = React.useCallback(() => {
    if (!isClosing && onClose) {
      onClose();
    }
  }, [isClosing, onClose]);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`md3-bottom-sheet-overlay ${isClosing ? 'is-closing' : ''}`} 
      onClick={handleClose} 
      role="dialog" 
      aria-modal="true"
    >
      <div 
        className={`md3-bottom-sheet-container ${isClosing ? 'is-closing' : ''} ${className}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md3-bottom-sheet-handle-bar">
          <div className="md3-bottom-sheet-handle" />
        </div>
        <div className="md3-bottom-sheet-header">
          <div className="md3-bottom-sheet-title-group">
            {title && <h3 className="md3-bottom-sheet-title">{title}</h3>}
            {subtitle && <p className="md3-bottom-sheet-subtitle">{subtitle}</p>}
          </div>
          <button 
            type="button" 
            className="md3-bottom-sheet-close-btn" 
            onClick={handleClose} 
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="md3-bottom-sheet-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export const Md3Fab = ({
  icon,
  label,
  onClick,
  ariaLabel = 'Action',
  className = ''
}) => {
  return (
    <button
      type="button"
      className={`md3-fab ${label ? 'md3-fab-extended' : ''} ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span className="md3-fab-icon">{icon}</span>
      {label && <span className="md3-fab-label">{label}</span>}
    </button>
  );
};

export const Md3DatePicker = ({
  id, name, label, value, onChange, placeholder,
  error, disabled, leadingIcon, trailingIcon, trailingIconAriaLabel
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(value ? new Date(value) : new Date());
  
  React.useEffect(() => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setViewDate(parsed);
      }
    }
  }, [value]);

  const containerRef = React.useRef(null);
  const dropdownRef = React.useRef(null);
  const [dropdownStyle, setDropdownStyle] = React.useState({});

  const handleClose = React.useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 200);
  }, []);

  const toggleOpen = () => {
    if (disabled) return;
    if (isOpen) handleClose();
    else setIsOpen(true);
  };

  const updatePosition = React.useCallback(() => {
    if (containerRef.current && isOpen) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 100000
      });
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current && !containerRef.current.contains(event.target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(event.target))
      ) {
        if (isOpen && !isClosing) handleClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isClosing, handleClose]);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const handleDayClick = (day) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const selectedDateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
    onChange({ target: { name, value: selectedDateStr } });
    handleClose();
  };

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const isFilled = value !== '' && value !== null && value !== undefined;
  const isDateValue = value ? new Date(value) : null;
  const isValidDate = isDateValue && !isNaN(isDateValue.getTime());

  let displayValue = '';
  if (value) {
    const parts = value.split('-');
    if (parts.length === 3) displayValue = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return (
    <div className={`md3-text-field-container md3-custom-select-container ${error ? 'md3-error' : ''} ${disabled ? 'md3-disabled' : ''}`} ref={containerRef}>
      <div className="md3-field-wrapper" onClick={toggleOpen}>
        <input
          id={id}
          name={name}
          type="text"
          className={`md3-field-input md3-date-input has-trailing ${leadingIcon ? 'has-leading' : ''} ${isFilled ? 'is-filled' : ''} ${isOpen ? 'is-focused' : ''}`}
          value={displayValue}
          readOnly
          placeholder={isOpen ? "DD/MM/YYYY" : " "}
          disabled={disabled}
          aria-invalid={!!error}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              if (!isOpen) toggleOpen();
            }
          }}
        />
        {label && <label htmlFor={id} className={`md3-field-label ${isOpen || isFilled ? 'is-floating' : ''}`}>{label}</label>}
        {leadingIcon && <span className="md3-field-leading-icon">{leadingIcon}</span>}
        <button
          type="button"
          className="md3-field-trailing-icon"
          onClick={(e) => { e.stopPropagation(); toggleOpen(); }}
          disabled={disabled}
          tabIndex="-1"
          aria-label={trailingIconAriaLabel || 'Select date'}
        >
          {trailingIcon || (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          )}
        </button>
      </div>

      {(isOpen || isClosing) && createPortal(
        <div ref={dropdownRef} className={`md3-select-dropdown-menu md3-date-picker-dropdown ${isClosing ? 'is-closing' : ''}`} style={dropdownStyle}>
          <div className="md3-date-picker-header">
            <button type="button" className="md3-date-nav-btn" onClick={handlePrevMonth}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <div className="md3-date-picker-title">
              <select 
                className="md3-date-select" 
                value={currentMonth} 
                onChange={(e) => setViewDate(new Date(currentYear, Number(e.target.value), 1))}
              >
                {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select 
                className="md3-date-select" 
                value={currentYear} 
                onChange={(e) => setViewDate(new Date(Number(e.target.value), currentMonth, 1))}
              >
                {Array.from({length: 150}, (_, i) => new Date().getFullYear() - 100 + i).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button type="button" className="md3-date-nav-btn" onClick={handleNextMonth}>
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
          <div className="md3-date-picker-grid">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="md3-date-picker-day-name">{d}</div>
            ))}
            {days.map((day, idx) => {
              const isSelected = isValidDate && 
                                 isDateValue.getDate() === day && 
                                 isDateValue.getMonth() === currentMonth && 
                                 isDateValue.getFullYear() === currentYear;
              const isToday = new Date().getDate() === day && 
                              new Date().getMonth() === currentMonth && 
                              new Date().getFullYear() === currentYear;
              
              if (!day) return <div key={`empty-${idx}`} className="md3-date-picker-cell empty"></div>;
              
              return (
                <button
                  key={day}
                  type="button"
                  className={`md3-date-picker-cell ${isSelected ? 'selected' : ''} ${isToday && !isSelected ? 'today' : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="md3-date-picker-actions">
            <button type="button" className="md3-date-action-btn" onClick={() => { onChange({ target: { name, value: '' } }); handleClose(); }}>Clear</button>
            <button type="button" className="md3-date-action-btn primary" onClick={() => { 
                const today = new Date();
                const formatted = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
                onChange({ target: { name, value: formatted } });
                handleClose();
            }}>Today</button>
          </div>
        </div>,
        document.body
      )}
      {error && <span id={`${id}-error`} className="md3-field-error-text">{error}</span>}
    </div>
  );
};
