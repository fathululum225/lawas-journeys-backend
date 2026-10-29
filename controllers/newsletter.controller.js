'use strict';

const subscriberModel = require('../models/subscriber.model');
const { validate } = require('../utils/validators.util');
const { sendSuccess } = require('../utils/response.util');

const subscribe = (req, res) => {
  const v = validate(req.body);
  const email = v.email('email');
  v.throwIfInvalid();

  const isNew = subscriberModel.subscribe(email);

  sendSuccess(res, {
    message: isNew ? 'Thank you for subscribing to our stories!' : 'You are already subscribed, thank you!',
    statusCode: isNew ? 201 : 200,
  });
};

module.exports = { subscribe };
