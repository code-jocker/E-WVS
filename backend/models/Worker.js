const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  department: String,
  position: String,
  contractStart: Date,
  contractEnd: Date,
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
  qrCode: String,
  lastCheckIn: Date,
  lastCheckOut: Date,
  documents: [String],
  history: [{
    action: { type: String, enum: ['check-in', 'check-out'] },
    timestamp: { type: Date, default: Date.now },
    performedBy: { type: mongoose.Schema.ObjectId, ref: 'User' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Worker', workerSchema);
