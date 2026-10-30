import React from 'react';
import CanonicalMd3SearchBar from './Md3SearchBar';
import './AdminControls.css';

export const Md3SearchBar = (props) => {
  return <CanonicalMd3SearchBar {...props} />;
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
