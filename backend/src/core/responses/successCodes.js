const SUCCESS_CODES = {
  OK: { code: 'SUCCESS_OK', message: 'Operation completed successfully', httpStatus: 200 },
  CREATED: { code: 'SUCCESS_CREATED', message: 'Resource created successfully', httpStatus: 201 },
  ACCEPTED: { code: 'SUCCESS_ACCEPTED', message: 'Request accepted and is processing', httpStatus: 202 },
};

module.exports = SUCCESS_CODES;
