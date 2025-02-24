const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  fcmToken: { type: String },
});

module.exports = mongoose.model('User', userSchema);