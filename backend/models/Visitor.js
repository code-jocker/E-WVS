const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  purpose: {
    type: String,
    required: [true, 'Please add a purpose of visit'],
  },
  host: {
    type: String, // Person being visited
    required: [true, 'Please add a host name'],
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'checked-in', 'checked-out'],
    default: 'pending',
  },
  qrCode: String,
  checkInTime: Date,
  checkOutTime: Date,
  documents: [String], // Paths to uploaded files
  history: [{
    action: { type: String, enum: ['check-in', 'check-out'] },
    timestamp: { type: Date, default: Date.now },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Visitor', visitorSchema);
