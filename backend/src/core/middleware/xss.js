const escapeHtml = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

const sanitize = (data) => {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return escapeHtml(data);
  }

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  if (typeof data === 'object') {
    const clean = {};
    for (const key of Object.keys(data)) {
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
