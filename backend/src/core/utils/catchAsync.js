/**
 * Higher-order function to wrap async controller methods.
 * Automatically catches any rejected promise and passes it to next(err).
 * Eliminates try/catch boilerplate across all controllers (SOLID / DRY principle).
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;
