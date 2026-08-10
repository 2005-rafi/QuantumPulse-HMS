const SUCCESS_CODES = require('./successCodes');

const success = (res, data, codeOrMessage = 'Success', statusCode = null) => {
  let message = codeOrMessage;
  let successCode = 'SUCCESS_OK';
  let httpStatus = statusCode || 200;

  if (SUCCESS_CODES[codeOrMessage]) {
    const def = SUCCESS_CODES[codeOrMessage];
    message = def.message;
    successCode = def.code;
    httpStatus = statusCode || def.httpStatus;
  }

  return res.status(httpStatus).json({
    status: 'success',
    successCode,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const error = (res, errorCode, message, details = null, httpStatus = 500, req = null) => {
  const request = req || res.req;
  const requestId = (request && request.requestId) || (res.locals && res.locals.requestId) || null;
  const instance = request ? request.originalUrl : null;

  // RFC 7807 Standard Error Response
  const errorResponse = {
    type: `https://hms.example.com/errors/${errorCode}`,
    title: message,
    status: httpStatus,
    detail: typeof details === 'string' ? details : (details ? JSON.stringify(details) : message),
    instance,
    code: errorCode,
    invalidParams: Array.isArray(details) ? details : (details ? [details] : []),
    requestId,
    timestamp: new Date().toISOString(),

    // Legacy fields for backward compatibility
    success: false,
    errorCode,
    message,
    details,
  };

  return res.status(httpStatus).json(errorResponse);
};

module.exports = { success, error };
