import { useEffect, useRef, useState, useCallback } from 'react';
import { parseMRN } from '../utils/code128Barcode';

/**
 * useBarcodeScanner — Universal Hardware Keyboard-Wedge Scanner Hook.
 *
 * Automatically captures rapid keystroke streams emitted by USB & Bluetooth
 * barcode scanners (e.g., Zebra, Honeywell, Datalogic) across hospital reception,
 * phlebotomy stations, triage desks, and bedside point-of-care carts.
 *
 * @param {object} options
 * @param {(scannedValue: string, mrnMeta: object) => void} options.onScan - Callback invoked upon complete scan
 * @param {number} [options.maxInterval=45] - Maximum millisecond threshold between characters (scanners send <30ms)
 * @param {number} [options.minLength=5] - Minimum characters required for a valid clinical barcode
 * @param {boolean} [options.enabled=true] - Whether scanner listener is active
 * @param {boolean} [options.preventDefaultOnScan=true] - Prevent default Enter key behavior on successful scan
 * @param {boolean} [options.ignoreInputs=false] - If true, skips scans when input/textarea is focused
 */
export function useBarcodeScanner({
  onScan,
  maxInterval = 45,
  minLength = 5,
  enabled = true,
  preventDefaultOnScan = true,
  ignoreInputs = false,
} = {}) {
  const [lastScan, setLastScan] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const isWedgeStreamRef = useRef(false);

  const handleScanComplete = useCallback((scannedCode, event) => {
    const clean = scannedCode.trim();
    if (clean.length >= minLength) {
      if (preventDefaultOnScan && event) {
        event.preventDefault();
        event.stopPropagation();
      }
      const meta = parseMRN(clean);
      setLastScan({ code: clean, meta, timestamp: Date.now() });
      if (typeof onScan === 'function') {
        onScan(clean, meta);
      }
    }
    bufferRef.current = '';
    isWedgeStreamRef.current = false;
    setIsScanning(false);
  }, [minLength, preventDefaultOnScan, onScan]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // If ignoreInputs is set and an input or textarea is active
      if (ignoreInputs) {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.isContentEditable) {
          return;
        }
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Enter key signals end of barcode payload
      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          handleScanComplete(bufferRef.current, e);
        } else {
          bufferRef.current = '';
        }
        return;
      }

      // Ignore non-printable keys (Shift, Ctrl, Alt, CapsLock, Tab, etc.)
      if (e.key.length !== 1) {
        return;
      }

      // If time difference between keystrokes is small, it's a high-speed scanner wedge stream
      if (timeDiff <= maxInterval) {
        isWedgeStreamRef.current = true;
        setIsScanning(true);
        bufferRef.current += e.key;
      } else {
        // Reset buffer if delay is too long (human typing)
        bufferRef.current = e.key;
        isWedgeStreamRef.current = false;
        setIsScanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, maxInterval, minLength, ignoreInputs, handleScanComplete]);

  return {
    lastScan,
    isScanning,
    clearLastScan: () => setLastScan(null),
  };
}

export default useBarcodeScanner;
