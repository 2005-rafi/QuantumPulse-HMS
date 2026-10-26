import React, { useMemo } from 'react';
import { generateCode128SvgData, parseMRN, formatMRNDisplay } from '../../utils/code128Barcode';
import './BarcodeRenderer.css';

/**
 * BarcodeRenderer — Production-grade ISO/IEC 15417 Code 128 Barcode Vector Renderer.
 *
 * Designed for clinical patient identification across:
 * - Patient Wristbands (Thermal & Vinyl)
 * - CR80 Patient Identification Cards
 * - Phlebotomy & Laboratory Vacutainer Specimen Tubes
 * - Inpatient Bedside Charts & Prescription Slips
 *
 * Features:
 * - Single-path SVG rendering (maximum DPI fidelity, crisp edges, minimal DOM load).
 * - Modulo-103 checksum and optional ISO/IEC 7812 Luhn validation.
 * - Screen and Print optimized with CSS shape-rendering crispEdges.
 */
export const BarcodeRenderer = ({
  value,
  height = 36,
  showText = true,
  showBadge = false,
  className = '',
  altText = '',
  quietZone = 10,
  textColor = 'currentColor',
  barColor = 'currentColor',
  onScanClick = null,
}) => {
  const cleanValue = typeof value === 'string' ? value.trim() : String(value || '').trim();

  const { svgData, mrnMeta } = useMemo(() => {
    if (!cleanValue) {
      return { svgData: null, mrnMeta: null };
    }
    const data = generateCode128SvgData(cleanValue, { height, quietZone });
    const meta = parseMRN(cleanValue);
    return { svgData: data, mrnMeta: meta };
  }, [cleanValue, height, quietZone]);

  if (!cleanValue || !svgData || svgData.barsCount === 0) {
    return (
      <div className={`barcode-renderer barcode-renderer--empty ${className}`.trim()}>
        <span className="barcode-renderer-empty-text">No Barcode Data</span>
      </div>
    );
  }

  const accessibleLabel = altText || `Barcode for ${cleanValue}`;

  return (
    <div
      className={`barcode-renderer ${className}`.trim()}
      onClick={onScanClick ? () => onScanClick(cleanValue, mrnMeta) : undefined}
      title={mrnMeta?.isUnified ? `UHID: ${mrnMeta.formatted} (Seq: #${mrnMeta.sequence}, Luhn: ${mrnMeta.isValid ? 'Valid' : 'Invalid'})` : `Barcode: ${cleanValue}`}
    >
      <div className="barcode-renderer-svg-wrap">
        <svg
          className="barcode-renderer-svg"
          viewBox={`0 0 ${svgData.totalWidth} ${svgData.height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={accessibleLabel}
          style={{ color: barColor }}
        >
          <path d={svgData.pathData} fill="currentColor" />
        </svg>
      </div>

      {showText && (
        <div className="barcode-renderer-label-row">
          <span className="barcode-renderer-label" style={{ color: textColor }}>
            {formatMRNDisplay(cleanValue)}
          </span>
          {showBadge && mrnMeta?.isUnified && (
            <span
              className={`barcode-renderer-luhn-badge ${mrnMeta.isValid ? 'is-valid' : 'is-invalid'}`}
              title={mrnMeta.isValid ? 'Luhn Mod-10 Checksum Verified' : 'Invalid Checksum'}
            >
              {mrnMeta.isValid ? '✓ UHID' : '! Luhn Error'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default BarcodeRenderer;
