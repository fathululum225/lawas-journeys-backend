'use strict';

const categoryModel = require('../models/category.model');
const { sendSuccess } = require('../utils/response.util');

const listCategories = (req, res) => {
  sendSuccess(res, { data: categoryModel.findAll() });
};

module.exports = { listCategories };
