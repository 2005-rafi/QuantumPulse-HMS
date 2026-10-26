const authenticate = require('./authenticate.middleware');
const authorize = require('./authorize.middleware');
const errorHandler = require('./error-handler.middleware');
const mongoSanitize = require('./mongo-sanitize.middleware');
const requestId = require('./request-id.middleware');
const xssClean = require('./xss.middleware');

module.exports = {
  authenticate,
  authorize,
  errorHandler,
  mongoSanitize,
  requestId,
  xssClean,
};
