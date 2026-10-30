/**
 * backend/src/core/middleware/xss.js
 * Sanitizes input strings by stripping executable scripts and malicious injection vectors,
 * while safely preserving valid business punctuation (&, ', ", -, /, etc.) and
 * decoding any legacy HTML entities.
 */

const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;

  // 1. Unescape historical HTML entities so values are canonical
  let clean = str
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // 2. Strip dangerous executable HTML tags (<script>, <iframe>, <object>, <embed>, <applet>, <meta>, <link>, <style>, <form>, <base>)
  clean = clean.replace(/<\s*(?:script|iframe|object|embed|applet|meta|link|style|form|base)[^>]*>[\s\S]*?<\s*\/\s*(?:script|iframe|object|embed|applet|meta|link|style|form|base)\s*>/gi, '');
  clean = clean.replace(/<\s*(?:script|iframe|object|embed|applet|meta|link|style|form|base)[^>]*>/gi, '');

  // 3. Strip dangerous javascript:, vbscript:, data:text/html protocol URIs
  clean = clean.replace(/(?:javascript|vbscript|data\s*:\s*text\/html)\s*:[^\s"'>]*/gi, '');

  // 4. Strip inline event handlers (e.g. onload=, onerror=, onclick=, onmouseover=)
  clean = clean.replace(/\bon[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  return clean;
};

const sanitize = (data) => {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return sanitizeString(data);
  }

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  if (typeof data === 'object' && !(data instanceof Date) && !(data instanceof RegExp) && !(data instanceof Buffer)) {
    const clean = {};
    for (const key of Object.keys(data)) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      clean[key] = sanitize(data[key]);
    }
    return clean;
  }

  return data;
};

const xssClean = (req, res, next) => {
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  next();
};

module.exports = xssClean;

