const Visitor = require('../models/Visitor');
const User = require('../models/User');
const generateQRCode = require('../utils/qrGenerator');
const logActivity = require('../utils/auditLogger');
const sendNotification = require('../utils/notificationSystem');
const { verifyNationalId } = require('../utils/nidaService');

// @desc    Register a visitor
// @route   POST /api/visitors
// @access  Private (Visitor or Receptionist)
exports.registerVisitor = async (req, res) => {
  try {
    const { purpose, host } = req.body;
    
    const visitor = await Visitor.create({
      user: req.user.id,
      purpose,
      host,
      status: 'pending'
    });

    // Generate QR code with visitor ID
    const qrCode = await generateQRCode(visitor._id.toString());
    visitor.qrCode = qrCode;
    await visitor.save();

    await logActivity(req, 'VISITOR_REGISTER', 'visitor', `Visitor registration for ${visitor.host}`);

    // Notify user
    await sendNotification(req.user.id, 'Registration Successful', `Your visit to ${visitor.host} has been scheduled.`, 'success');

    // Notify Host (if found in system)
    const hostUser = await User.findOne({ name: host });
    if (hostUser) {
      await sendNotification(hostUser._id, 'New Visitor Scheduled', `${req.user.name} has registered to visit you for: ${purpose}`, 'info');
    }

    res.status(201).json({ success: true, data: visitor });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Get current visitor record
// @route   GET /api/visitors/me
// @access  Private (Visitor)
exports.getMyVisitorRecord = async (req, res) => {
  try {
    const visitor = await Visitor.findOne({ user: req.user.id }).sort({ createdAt: -1 });
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'No registration record found' });
    }
    res.status(200).json({ success: true, data: visitor });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Get all visitors
// @route   GET /api/visitors
// @access  Private (Admin, Security, Receptionist)
exports.getVisitors = async (req, res) => {
  try {
    let query;
    
    // If user is visitor, only show their own
    if (req.user.role === 'visitor') {
      query = Visitor.find({ user: req.user.id });
    } else {
      query = Visitor.find().populate('user', 'name email');
    }

    const visitors = await query;
    res.status(200).json({ success: true, count: visitors.length, data: visitors });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Get single visitor
// @route   GET /api/visitors/:id
// @access  Private (Admin, Security, Receptionist)
exports.getVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id).populate('user', 'name email');
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }
    res.status(200).json({ success: true, data: visitor });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Update visitor status (Check-in/Check-out/Status)
// @route   PUT /api/visitors/:id
// @access  Private
exports.updateVisitorStatus = async (req, res) => {
  try {
    const { action, status } = req.body;
    let visitor = await Visitor.findById(req.params.id).populate('user');

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    if (status === 'approved') {
      // Verify with NIDA before approving
      const nidaResult = await verifyNationalId(visitor.user.nationalId || '1199080000000000');
      if (!nidaResult.success) {
        return res.status(400).json({ success: false, message: `NIDA Verification Failed: ${nidaResult.message}` });
      }
      visitor.status = status;
      await sendNotification(visitor.user._id, 'Visit Approved', `Your visit to ${visitor.host} has been approved. You can now use your QR code.`, 'success');
    } else if (status) {
      visitor.status = status;
    }

    if (status) {
      await logActivity(req, 'VISITOR_STATUS_UPDATE', 'visitor', `Visitor status updated to ${status}`);
    }

    if (action === 'check-in') {
      visitor.checkInTime = Date.now();
      await logActivity(req, 'VISITOR_CHECK_IN', 'security', `Visitor ${visitor.id} checked in`);
    } else if (action === 'check-out') {
      visitor.checkOutTime = Date.now();
      await logActivity(req, 'VISITOR_CHECK_OUT', 'security', `Visitor ${visitor.id} checked out`);
    }

    // Update history for tracking
    visitor.history = visitor.history || [];
    if (action === 'check-in' || action === 'check-out') {
      visitor.history.push({
        action,
        timestamp: Date.now(),
        performedBy: req.user.id
      });
    }

    await visitor.save();

    res.status(200).json({ success: true, data: visitor });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
