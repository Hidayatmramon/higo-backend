const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  gender: String,
  age: Number,
  country: String,
  login_hour: Number,
  digital_interest: String,
}, { strict: false });

module.exports = mongoose.model('Customer', customerSchema);
