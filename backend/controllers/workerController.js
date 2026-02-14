const Worker = require('../models/Worker');
const User = require('../models/User');
const generateQRCode = require('../utils/qrGenerator');
const logActivity = require('../utils/auditLogger');
const sendNotification = require('../utils/notificationSystem');
const { verifyNationalId } = require('../utils/nidaService');

// @desc    Verify self identity at gate
// @route   PUT /api/workers/verify-self
// @access  Private (Worker)
exports.verifySelf = async (req, res) => {
  try {
    const { qrData } = req.body;
    const worker = await Worker.findOne({ user: req.user.id }).populate('user');
    
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker record not found' });
    }

    // In this simulation, we check if the scanned data matches the worker's ID or their QR code string
    // If it's their own QR code being scanned from a physical card
    if (qrData !== worker._id.toString() && qrData !== worker.qrCode) {
       // Allow "DEMO_GATE_PASS" for testing purposes
       if (qrData !== "DEMO_GATE_PASS") {
         return res.status(400).json({ success: false, message: 'Invalid ID scanned. Please use your registered Worker ID.' });
       }
    }

    // Verify identity with Mock NIDA API
    const nidaResult = await verifyNationalId(worker.user.nationalId || '1199080000000000');
    
    if (!nidaResult.success) {
      return res.status(400).json({ success: false, message: nidaResult.message });
    }

    // Toggle Check-in/Check-out
    const isCheckingIn = !worker.lastCheckIn || (worker.lastCheckOut && worker.lastCheckIn < worker.lastCheckOut);
    const now = new Date();
    
    if (isCheckingIn) {
      worker.lastCheckIn = now;
      worker.history.push({ action: 'check-in', timestamp: now });
      await logActivity(req, 'WORKER_SELF_CHECKIN', 'worker', `Worker self-verified at gate`);
      await sendNotification(req.user.id, 'Gate Access Granted', 'You have successfully checked in via gate verification.', 'success');
    } else {
      worker.lastCheckOut = now;
      worker.history.push({ action: 'check-out', timestamp: now });
      await logActivity(req, 'WORKER_SELF_CHECKOUT', 'worker', `Worker self-verified at gate`);
      await sendNotification(req.user.id, 'Gate Access Granted', 'You have successfully checked out via gate verification.', 'success');
    }

    await worker.save();

    res.status(200).json({ 
      success: true, 
      message: `${isCheckingIn ? 'Check-in' : 'Check-out'} verified! ${nidaResult.message}`,
      data: worker 
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Register a worker
// @route   POST /api/workers
// @access  Private (Org Admin, Super Admin)
exports.registerWorker = async (req, res) => {
  try {
    const { userId, department, position, contractStart, contractEnd } = req.body;
    
    const worker = await Worker.create({
      user: userId,
      department,
      position,
      contractStart,
      contractEnd
    });

    const qrCode = await generateQRCode(worker._id.toString());
    worker.qrCode = qrCode;
    await worker.save();

    await logActivity(req, 'WORKER_REGISTER', 'worker', `Worker registration for department ${department}`);
    await sendNotification(req.user.id, 'Registration Successful', `Your worker profile for ${department} has been created.`, 'success');

    res.status(201).json({ success: true, data: worker });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Get current worker record
// @route   GET /api/workers/me
// @access  Private (Worker)
exports.getMyWorkerRecord = async (req, res) => {
  try {
    const worker = await Worker.findOne({ user: req.user.id }).sort({ createdAt: -1 });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'No registration record found' });
    }
    res.status(200).json({ success: true, data: worker });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Upload worker documents
// @route   POST /api/workers/upload
// @access  Private (Worker)
exports.uploadDocuments = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const worker = await Worker.findOne({ user: req.user.id });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker record not found' });
    }

    const filePaths = req.files.map(file => `/uploads/documents/${file.filename}`);
    
    worker.documents = [...(worker.documents || []), ...filePaths];
    await worker.save();

    await logActivity(req, 'WORKER_DOC_UPLOAD', 'worker', `Uploaded ${req.files.length} documents`);
    await sendNotification(req.user.id, 'Documents Uploaded', `Successfully uploaded ${req.files.length} documents for verification.`, 'success');

    res.status(200).json({
      success: true,
      data: worker.documents,
      message: 'Documents uploaded successfully'
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Get all workers
// @route   GET /api/workers
// @access  Private
exports.getWorkers = async (req, res) => {
  try {
    const workers = await Worker.find().populate('user', 'name email');
    res.status(200).json({ success: true, count: workers.length, data: workers });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Get public host list (name & department only)
// @route   GET /api/workers/hosts
// @access  Public
exports.getPublicHosts = async (req, res) => {
  try {
    const workers = await Worker.find({ status: 'active' }).populate('user', 'name');
    const hosts = workers.map(w => ({
      id: w.user._id,
      name: w.user.name,
      department: w.department
    }));
    res.status(200).json({ success: true, data: hosts });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Get single worker
// @route   GET /api/workers/:id
// @access  Private
exports.getWorker = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id).populate('user', 'name email');
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }
    res.status(200).json({ success: true, data: worker });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Update worker (Check-in/Check-out/Status)
// @route   PUT /api/workers/:id
// @access  Private (Security, Admin)
exports.updateWorkerStatus = async (req, res) => {
  try {
    const { action, status } = req.body; // 'check-in', 'check-out' or status update
    let worker = await Worker.findById(req.params.id);

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    if (status) {
      worker.status = status;
      await logActivity(req, 'WORKER_STATUS_UPDATE', 'worker', `Worker status updated to ${status}`);
      await sendNotification(worker.user, 'Profile Updated', `Your status has been updated to ${status}`, 'info');
    }

    if (action === 'check-in') {
      worker.lastCheckIn = Date.now();
      await logActivity(req, 'WORKER_CHECK_IN', 'security', `Worker ${worker.id} checked in`);
    } else if (action === 'check-out') {
      worker.lastCheckOut = Date.now();
      await logActivity(req, 'WORKER_CHECK_OUT', 'security', `Worker ${worker.id} checked out`);
    }

    // Update history for tracking
    worker.history = worker.history || [];
    if (action === 'check-in' || action === 'check-out') {
      worker.history.push({
        action,
        timestamp: Date.now(),
        performedBy: req.user.id
      });
    }

    await worker.save();

    res.status(200).json({ success: true, data: worker });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
