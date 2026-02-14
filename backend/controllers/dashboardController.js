const Visitor = require('../models/Visitor');
const Worker = require('../models/Worker');
const User = require('../models/User');

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalVisitors = await Visitor.countDocuments();
    const approvedVisitors = await Visitor.countDocuments({ status: 'approved' });
    const checkedInVisitors = await Visitor.countDocuments({ status: 'checked-in' });
    const todayVisitors = await Visitor.countDocuments({ createdAt: { $gte: today } });
    
    const totalWorkers = await Worker.countDocuments();
    const activeWorkers = await Worker.countDocuments({ status: 'active' });
    
    const checkedInWorkersCount = await Worker.countDocuments({ 
      lastCheckIn: { $exists: true },
      $expr: { $gt: ["$lastCheckIn", { $ifNull: ["$lastCheckOut", new Date(0)] }] }
    });

    const recentVisitors = await Visitor.find()
      .populate('user', 'name')
      .sort('-createdAt')
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalVisitors,
          approvedVisitors,
          checkedInVisitors,
          todayVisitors,
          totalWorkers,
          activeWorkers,
          checkedInWorkers: checkedInWorkersCount
        },
        recentVisitors
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
