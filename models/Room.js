const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  code: String,
  drawnNumber: Number,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Room', RoomSchema);