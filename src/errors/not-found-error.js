const { HTTP_RESPONSE } = require('../constants/errors');

class NotFoundError extends Error {
  constructor(message = HTTP_RESPONSE.notFound.message) {
    super(message);
    this.statusCode = HTTP_RESPONSE.notFound.status;
  }
}

module.exports = NotFoundError;
