/**
 * components/SafeHtml.jsx
 * Strict DOMPurify wrapper for safely rendering formatted narrative text & medical notes
 * without introducing Cross-Site Scripting (XSS) vulnerabilities (OWASP ASVS V5.1).
 */
import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';

const DEFAULT_ALLOWED_TAGS = [
  'b', 'i', 'em', 'strong', 'u', 's',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'span', 'code', 'pre', 'blockquote',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'a',
];

const DEFAULT_ALLOWED_ATTR = ['href', 'target', 'rel', 'class', 'style', 'title'];

export const sanitizeContent = (dirtyHtml, customConfig = {}) => {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  const config = {
    ALLOWED_TAGS: customConfig.allowedTags || DEFAULT_ALLOWED_TAGS,
    ALLOWED_ATTR: customConfig.allowedAttr || DEFAULT_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target', 'rel'],
    ...customConfig,
  };

  // Enforce secure link attributes
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.hasAttribute('href')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  const clean = DOMPurify.sanitize(dirtyHtml, config);
  DOMPurify.removeHook('afterSanitizeAttributes');
  return clean;
};

export const SafeHtml = ({
  html = '',
  className = '',
  style = {},
  tag: Component = 'div',
  allowedTags,
  allowedAttr,
}) => {
  const sanitizedHtml = useMemo(() => {
    return sanitizeContent(html, { allowedTags, allowedAttr });
  }, [html, allowedTags, allowedAttr]);

  if (!sanitizedHtml) return null;

  return (
    <Component
      className={`safe-html-content ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

export default SafeHtml;
