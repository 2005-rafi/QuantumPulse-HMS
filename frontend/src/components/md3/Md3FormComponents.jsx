import React from 'react';
import { createPortal } from 'react-dom';
import './Md3FormComponents.css';
export { Md3TextArea } from './Md3Widgets';

export const Md3TextField = (props) => {
  const {
    id, name, type = 'text', label, value, onChange, placeholder,
    error, disabled, leadingIcon, trailingIcon, onTrailingIconClick,
    trailingIconAriaLabel, autoComplete, autoFocus,
    multiline, rows, minRows, maxRows, fullWidth, variant, helperText,
    className = '',
    ...rest
  } = props;

  const isDate = type === 'date';

  if (isDate) {
    return <Md3DatePicker {...props} />;
  }

  const safeValue = value ?? '';

  // MD3 Standard: Outlined inputs with floating labels should not render example placeholder text
  // that clashes with labels or clutters the UI. Use ' ' for CSS :placeholder-shown hook.
  // Standalone inputs without a label (e.g. search bars) preserve their placeholder.
  const resolvedPlaceholder = label ? ' ' : (placeholder || ' ');

  return (
    <div className={`md3-text-field-container ${error ? 'md3-error' : ''} ${disabled ? 'md3-disabled' : ''} ${fullWidth ? 'md3-full-width' : ''} ${className}`.trim()}>
      <div className="md3-field-wrapper">
        {multiline ? (
          <textarea
            id={id}
            name={name}
            rows={rows || 3}
            className={`md3-field-input md3-field-textarea ${leadingIcon ? 'has-leading' : ''} ${trailingIcon ? 'has-trailing' : ''} ${safeValue !== '' ? 'is-filled' : ''}`}
            value={safeValue}
            onChange={onChange}
            placeholder={resolvedPlaceholder}
            disabled={disabled}
            autoFocus={autoFocus}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            {...rest}
          />
        ) : (
          <input
            id={id}
            name={name}
            type={type}
            className={`md3-field-input ${leadingIcon ? 'has-leading' : ''} ${trailingIcon ? 'has-trailing' : ''} ${safeValue !== '' ? 'is-filled' : ''}`}
            value={safeValue}
            onChange={onChange}
            placeholder={resolvedPlaceholder}
            disabled={disabled}
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            {...rest}
          />
        )}
        {label && <label htmlFor={id} className="md3-field-label">{label}</label>}
        
        {leadingIcon && (
          <span className="md3-field-leading-icon">
            {typeof leadingIcon === 'string' ? (
              <span className="material-symbols-rounded">{leadingIcon}</span>
            ) : (
              leadingIcon
            )}
          </span>
        )}
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
      {helperText && !error && (
        <span className="md3-field-helper-text">{helperText}</span>
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
  leadingIcon,
  trailingIcon,
  icon,
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
        <>
          {leadingIcon && <span className="md3-btn-leading-icon">{leadingIcon}</span>}
          {icon && <span className="md3-btn-icon">{icon}</span>}
          {children}
          {trailingIcon && <span className="md3-btn-trailing-icon">{trailingIcon}</span>}
        </>
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

// Helper to extract clean plain text from React nodes / children
const extractNodeText = (node) => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractNodeText).join('');
  if (React.isValidElement(node) && node.props?.children) {
    return extractNodeText(node.props.children);
  }
  return '';
};

// Helper to parse children or options into a flat array of group headers and selectable items
const parseSelectItems = (children, options) => {
  const items = [];

  const traverseNodes = (nodes, currentGroup = null) => {
    React.Children.forEach(nodes, (child) => {
      if (!child) return;

      // Handle React.Fragment
      if (child.type === React.Fragment) {
        traverseNodes(child.props.children, currentGroup);
        return;
      }

      // Handle <optgroup>
      if (child.type === 'optgroup' || (child.props && child.props.label && child.props.children && child.type !== 'option')) {
        const groupLabel = child.props.label || '';
        if (groupLabel) {
          items.push({
            isGroupHeader: true,
            label: groupLabel,
            key: `gh-${groupLabel}-${items.length}`,
            disabled: true,
          });
        }
        traverseNodes(child.props.children, groupLabel);
        return;
      }

      // Handle <option> or elements with value/children
      if (child.type === 'option' || (child.props && ('value' in child.props || 'children' in child.props))) {
        const optVal = child.props.value !== undefined ? child.props.value : '';
        const rawChildren = child.props.children;
        const textLabel = extractNodeText(rawChildren) || String(optVal);

        items.push({
          isGroupHeader: false,
          value: optVal,
          label: textLabel,
          disabled: !!child.props.disabled,
          group: currentGroup,
          key: `opt-${optVal}-${items.length}`,
        });
        return;
      }

      // Fallback: nested wrappers
      if (child.props?.children) {
        traverseNodes(child.props.children, currentGroup);
      }
    });
  };

  if (children) {
    traverseNodes(children);
  } else if (Array.isArray(options)) {
    options.forEach((opt, idx) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        items.push({
          isGroupHeader: false,
          value: opt,
          label: String(opt),
          disabled: false,
          key: `opt-${opt}-${idx}`,
        });
      } else if (opt && typeof opt === 'object') {
        if (opt.group && Array.isArray(opt.options)) {
          items.push({
            isGroupHeader: true,
            label: opt.group,
            key: `gh-${opt.group}-${idx}`,
            disabled: true,
          });
          opt.options.forEach((subOpt, subIdx) => {
            const subVal = typeof subOpt === 'object' ? subOpt.value : subOpt;
            const subLabel = typeof subOpt === 'object' ? (subOpt.label ?? subOpt.value) : subOpt;
            items.push({
              isGroupHeader: false,
              value: subVal,
              label: String(subLabel),
              disabled: !!subOpt.disabled,
              group: opt.group,
              key: `opt-${subVal}-${idx}-${subIdx}`,
            });
          });
        } else {
          items.push({
            isGroupHeader: !!opt.isGroupHeader,
            value: opt.value !== undefined ? opt.value : '',
            label: String(opt.label ?? opt.value ?? ''),
            disabled: !!opt.disabled,
            group: opt.group || null,
            key: opt.key || `opt-${opt.value}-${idx}`,
          });
        }
      }
    });
  }

  return items;
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
  className = '',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [menuStyle, setMenuStyle] = React.useState({});
  const containerRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const searchInputRef = React.useRef(null);
  
  const [listStyle, setListStyle] = React.useState({});

  const handleClose = React.useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setFocusedIndex(-1);
    }, 180);
  }, []);

  // Calculate top-layer floating viewport coordinates with screen-edge intelligence
  const updatePosition = React.useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // If anchor is scrolled completely off-screen, close menu
    if (rect.bottom < -60 || rect.top > viewportHeight + 60) {
      if (isOpen && !isClosing) handleClose();
      return;
    }

    const safeMargin = 12;
    const spaceBelow = viewportHeight - rect.bottom - safeMargin;
    const spaceAbove = rect.top - safeMargin;
    const minComfortableHeight = 220; // Height required for search input + options
    const targetMaxHeight = 320;

    // Flip to top if insufficient space below and more space above
    const placeAbove = spaceBelow < minComfortableHeight && spaceAbove > spaceBelow;
    const availableSpace = placeAbove ? spaceAbove : spaceBelow;
    const computedMaxHeight = Math.max(140, Math.min(targetMaxHeight, availableSpace));
    const computedListMaxHeight = Math.max(60, computedMaxHeight - 56); // Space remaining for options list

    // Horizontal positioning and screen edge clamping
    let width = Math.max(rect.width, 220);
    if (width > viewportWidth - 2 * safeMargin) {
      width = viewportWidth - 2 * safeMargin;
    }

    let left = rect.left;
    if (left + width > viewportWidth - safeMargin) {
      left = Math.max(safeMargin, viewportWidth - width - safeMargin);
    }
    if (left < safeMargin) {
      left = safeMargin;
    }

    if (placeAbove) {
      setMenuStyle({
        position: 'fixed',
        bottom: `${Math.max(safeMargin, viewportHeight - rect.top + 4)}px`,
        top: 'auto',
        left: `${left}px`,
        width: `${width}px`,
        maxHeight: `${computedMaxHeight}px`,
        zIndex: 999999,
        transformOrigin: 'bottom',
      });
    } else {
      setMenuStyle({
        position: 'fixed',
        top: `${Math.min(viewportHeight - safeMargin - computedMaxHeight, rect.bottom + 4)}px`,
        bottom: 'auto',
        left: `${left}px`,
        width: `${width}px`,
        maxHeight: `${computedMaxHeight}px`,
        zIndex: 999999,
        transformOrigin: 'top',
      });
    }

    setListStyle({
      maxHeight: `${computedListMaxHeight}px`,
      overflowY: 'auto',
    });
  }, [isOpen, isClosing, handleClose]);

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
  
  // Parse options recursively (handling <optgroup>, Fragments, raw arrays)
  const parsedItems = React.useMemo(() => {
    return parseSelectItems(children, options);
  }, [children, options]);

  // Selectable options (excluding group headers)
  const selectableOptions = React.useMemo(() => {
    return parsedItems.filter(item => !item.isGroupHeader);
  }, [parsedItems]);

  // Filter options based on user search term (preserving group headers if group has matches)
  const filteredOptions = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return parsedItems;

    const result = [];
    let currentGroupHeader = null;
    let groupHasMatch = false;
    let currentGroupItems = [];

    parsedItems.forEach((item) => {
      if (item.isGroupHeader) {
        if (currentGroupHeader && groupHasMatch) {
          result.push(currentGroupHeader);
          result.push(...currentGroupItems);
        }
        currentGroupHeader = item;
        groupHasMatch = false;
        currentGroupItems = [];
      } else {
        const matches = String(item.label || '').toLowerCase().includes(query);
        if (matches) {
          if (currentGroupHeader) {
            groupHasMatch = true;
            currentGroupItems.push(item);
          } else {
            result.push(item);
          }
        }
      }
    });

    if (currentGroupHeader && groupHasMatch) {
      result.push(currentGroupHeader);
      result.push(...currentGroupItems);
    }

    return result;
  }, [parsedItems, searchTerm]);

  // Determine matching option and display label
  const hasValue = value !== '' && value !== null && value !== undefined;
  const selectedOption = selectableOptions.find(opt => {
    if (hasValue) {
      return String(opt.value) === String(value);
    }
    return opt.value === '' || opt.value === null || opt.value === undefined;
  });

  const selectedLabel = selectedOption ? selectedOption.label : '';
  // Only consider filled if we have a non-empty value or if the selected option value is not empty
  const isFilled = hasValue && selectedLabel !== '';

  const getNextSelectableIndex = (items, currentIndex, direction) => {
    let next = currentIndex + direction;
    while (next >= 0 && next < items.length) {
      if (!items[next].isGroupHeader && !items[next].disabled) {
        return next;
      }
      next += direction;
    }
    return currentIndex;
  };

  const toggleOpen = () => {
    if (disabled) return;
    if (isOpen) {
      handleClose();
    } else {
      updatePosition();
      setIsOpen(true);
      const currentIndex = filteredOptions.findIndex(o => !o.isGroupHeader && String(o.value) === String(value));
      if (currentIndex >= 0) {
        setFocusedIndex(currentIndex);
      } else {
        const firstValid = filteredOptions.findIndex(o => !o.isGroupHeader && !o.disabled);
        setFocusedIndex(firstValid >= 0 ? firstValid : 0);
      }
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
          if (!opt.isGroupHeader && !opt.disabled) handleSelect(opt.value);
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
        setFocusedIndex(prev => getNextSelectableIndex(filteredOptions, prev, 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (!isOpen) {
        toggleOpen();
      } else {
        setFocusedIndex(prev => getNextSelectableIndex(filteredOptions, prev, -1));
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
      className={`md3-text-field-container md3-custom-select-container ${compact ? 'md3-select--compact' : ''} ${error ? 'md3-error' : ''} ${disabled ? 'md3-disabled' : ''} ${className}`.trim()}
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
          <span className="md3-select-display-text">{isFilled ? selectedLabel : ''}</span>
        </div>
        {label && <label htmlFor={id} className={`md3-field-label md3-select-label ${isOpen || isFilled ? 'is-floating' : ''}`}>{label}</label>}
        {leadingIcon && (
          <span className="md3-field-leading-icon">
            {typeof leadingIcon === 'string' ? (
              <span className="material-symbols-rounded">{leadingIcon}</span>
            ) : (
              leadingIcon
            )}
          </span>
        )}
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
          <ul className="md3-select-dropdown-list" style={listStyle}>
            {filteredOptions.length === 0 ? (
              <li className="md3-select-dropdown-item is-disabled">No results found</li>
            ) : (
              filteredOptions.map((opt, index) => (
                opt.isGroupHeader ? (
                  <li
                    key={opt.key || `gh-${index}`}
                    className="md3-select-group-header"
                    role="presentation"
                    aria-hidden="true"
                  >
                    {opt.label}
                  </li>
                ) : (
                  <li 
                    key={opt.key || `opt-${opt.value}-${index}`}
                    className={`md3-select-dropdown-item ${String(opt.value) === String(value) ? 'is-selected' : ''} ${opt.disabled ? 'is-disabled' : ''} ${focusedIndex === index ? 'is-focused' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!opt.disabled) handleSelect(opt.value);
                    }}
                    onMouseEnter={() => !opt.disabled && setFocusedIndex(index)}
                    role="option"
                    aria-selected={String(opt.value) === String(value)}
                  >
                    {opt.label}
                  </li>
                )
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
  initialHeightVh = 88,
  minHeightVh = 32,
  maxHeightVh = 96,
  children
}) => {
  const [shouldRender, setShouldRender] = React.useState(isOpen);
  const [isClosing, setIsClosing] = React.useState(false);
  const [sheetHeightVh, setSheetHeightVh] = React.useState(initialHeightVh);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartYRef = React.useRef(0);
  const dragStartHeightRef = React.useRef(initialHeightVh);

  React.useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      setSheetHeightVh(initialHeightVh);
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 240); // 240ms exit animation
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialHeightVh]);

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

  // Drag to resize handlers
  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    dragStartHeightRef.current = sheetHeightVh;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const deltaY = dragStartYRef.current - e.clientY;
    const deltaVh = (deltaY / window.innerHeight) * 100;
    const nextHeight = Math.min(maxHeightVh, Math.max(minHeightVh, dragStartHeightRef.current + deltaVh));
    setSheetHeightVh(nextHeight);
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    // Auto-close if dragged below 22vh
    if (sheetHeightVh < 24) {
      handleClose();
    }
  };

  const handleDoubleClickHandle = () => {
    // Quick toggle between expanded (95vh) and standard (60vh)
    setSheetHeightVh((prev) => (prev > 80 ? 60 : 95));
  };

  if (!shouldRender) return null;

  return createPortal(
    <div 
      className={`md3-bottom-sheet-overlay ${isClosing ? 'is-closing' : ''}`} 
      onClick={handleClose} 
      role="dialog" 
      aria-modal="true"
    >
      <div 
        className={`md3-bottom-sheet-container ${isClosing ? 'is-closing' : ''} ${isDragging ? 'is-dragging' : ''} ${className}`} 
        onClick={(e) => e.stopPropagation()}
        style={{
          height: `${sheetHeightVh}vh`,
          maxHeight: `${maxHeightVh}vh`,
        }}
      >
        <div 
          className="md3-bottom-sheet-handle-bar"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleDoubleClickHandle}
          title="Drag up or down to resize sheet • Double click to toggle expand"
          role="separator"
          aria-label="Resize Bottom Sheet"
        >
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
    </div>,
    document.body
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
    if (!containerRef.current || !isOpen) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // If anchor is scrolled completely off-screen, close menu
    if (rect.bottom < -60 || rect.top > viewportHeight + 60) {
      if (isOpen && !isClosing) handleClose();
      return;
    }

    const safeMargin = 12;
    const spaceBelow = viewportHeight - rect.bottom - safeMargin;
    const spaceAbove = rect.top - safeMargin;
    const expectedCalendarHeight = 310;
    const placeAbove = spaceBelow < expectedCalendarHeight && spaceAbove > spaceBelow;

    let width = Math.max(rect.width, 280);
    if (width > viewportWidth - 2 * safeMargin) {
      width = viewportWidth - 2 * safeMargin;
    }

    let left = rect.left;
    if (left + width > viewportWidth - safeMargin) {
      left = Math.max(safeMargin, viewportWidth - width - safeMargin);
    }
    if (left < safeMargin) {
      left = safeMargin;
    }

    if (placeAbove) {
      setDropdownStyle({
        position: 'fixed',
        bottom: `${Math.max(safeMargin, viewportHeight - rect.top + 4)}px`,
        top: 'auto',
        left: `${left}px`,
        width: `${width}px`,
        maxHeight: `${Math.max(160, Math.min(340, spaceAbove))}px`,
        zIndex: 100000,
        transformOrigin: 'bottom',
      });
    } else {
      setDropdownStyle({
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        bottom: 'auto',
        left: `${left}px`,
        width: `${width}px`,
        maxHeight: `${Math.max(160, Math.min(340, spaceBelow))}px`,
        zIndex: 100000,
        transformOrigin: 'top',
      });
    }
  }, [isOpen, isClosing, handleClose]);

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
    else displayValue = value;
  }

  const handleInputChange = (e) => {
    const val = e.target.value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      onChange({ target: { name, value: val } });
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      const [d, m, y] = val.split('/');
      onChange({ target: { name, value: `${y}-${m}-${d}` } });
    } else {
      onChange({ target: { name, value: val } });
    }
  };

  return (
    <div className={`md3-text-field-container md3-custom-select-container ${error ? 'md3-error' : ''} ${disabled ? 'md3-disabled' : ''}`} ref={containerRef}>
      <div className="md3-field-wrapper">
        <input
          id={id}
          name={name}
          type="text"
          className={`md3-field-input md3-date-input has-trailing ${leadingIcon ? 'has-leading' : ''} ${isFilled ? 'is-filled' : ''} ${isOpen ? 'is-focused' : ''}`}
          value={displayValue}
          onChange={handleInputChange}
          onClick={toggleOpen}
          placeholder={isOpen ? "DD/MM/YYYY" : " "}
          disabled={disabled}
          aria-invalid={!!error}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              if (!isOpen) toggleOpen();
            }
          }}
        />
        {label && <label htmlFor={id} className={`md3-field-label ${isOpen || isFilled ? 'is-floating' : ''}`}>{label}</label>}
        {leadingIcon && (
          <span className="md3-field-leading-icon">
            {typeof leadingIcon === 'string' ? (
              <span className="material-symbols-rounded">{leadingIcon}</span>
            ) : (
              leadingIcon
            )}
          </span>
        )}
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

export { Md3UnsavedChangesDialog } from './Md3UnsavedChangesDialog';

