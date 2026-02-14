const User = require('../models/User');
const Visitor = require('../models/Visitor');
const Worker = require('../models/Worker');
const jwt = require('jsonwebtoken');
const logActivity = require('../utils/auditLogger');

// @desc    Track registration status
// @route   GET /api/auth/track/:email
// @access  Public
exports.trackStatus = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'No record found with this email' });
    }

    let record;
    if (user.role === 'visitor') {
      record = await Visitor.findOne({ user: user._id }).sort({ createdAt: -1 });
    } else if (user.role === 'worker') {
      record = await Worker.findOne({ user: user._id }).sort({ createdAt: -1 });
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'No registration details found for this user' });
    }

    res.status(200).json({
      success: true,
      data: {
        name: user.name,
        role: user.role,
        status: record.status || 'pending',
        createdAt: record.createdAt
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, organization, phone, nationalId, photo } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Create user
    user = await User.create({
      name,
      email,
      password,
      role: role || 'visitor',
      organization,
      phone,
      nationalId,
      photo
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide an email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Log login
    const tempReq = { user: { id: user._id }, ip: req.ip, headers: req.headers };
    await logActivity(tempReq, 'USER_LOGIN', 'auth', `User ${user.email} logged in successfully`);

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user,
  });
};
