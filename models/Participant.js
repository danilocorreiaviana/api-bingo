const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  roomCode: String,
  username: String,
  joinedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Participant', ParticipantSchema);