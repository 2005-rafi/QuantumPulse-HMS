import React from 'react';
import './Md3NavigationRail.css';

/**
 * Md3NavigationRail
 * 
 * MD3 compliant Navigation Rail component.
 * Features:
 * - 80dp compact width, 240dp expanded width (managed via CSS classes/media queries if needed)
 * - Active state mapping
 * - Google Material Symbols (Rounded & Filled)
 * 
 * @param {Array} items - Array of navigation items { id, icon, label }
 * @param {string} activeItem - The currently active item id
 * @param {Function} onSelect - Callback when an item is selected
 */
const Md3NavigationRail = ({ items, activeItem, onSelect }) => {
  return (
    <nav className="md3-nav-rail">
      {/* Optional FAB area can go here if needed per spec */}
      <div className="md3-nav-rail__items">
        {items.map((item) => {
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              className={`md3-nav-rail__item ${isActive ? 'md3-nav-rail__item--active' : ''}`}
              onClick={() => onSelect(item.id)}
              aria-label={item.label}
              title={item.label}
            >
              <div className="md3-nav-rail__item-indicator">
                <span 
                  className="material-symbols-rounded md3-nav-rail__icon" 
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
              </div>
              <span className="md3-nav-rail__label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Md3NavigationRail;
