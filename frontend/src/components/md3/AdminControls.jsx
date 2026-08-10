import React from 'react';
import './AdminControls.css';

export const Md3SearchBar = ({ value, onChange, placeholder = 'Search...' }) => {
  return (
    <div className="md3-search-bar">
      <span className="material-symbols-rounded md3-search-icon">search</span>
      <input
        type="text"
        className="md3-search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button 
          type="button" 
          className="md3-search-clear" 
          onClick={() => onChange('')} 
          aria-label="Clear search"
        >
          <span className="material-symbols-rounded">close</span>
        </button>
      )}
    </div>
  );
};

export const Md3SegmentedFilter = ({ selectedValue, onChange, options = [] }) => {
  return (
    <div className="md3-segmented-filter">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`md3-segmented-item ${selectedValue === opt.value ? 'is-selected' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
