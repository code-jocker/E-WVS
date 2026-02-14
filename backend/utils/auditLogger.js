const AuditLog = require('../models/AuditLog');

const logActivity = async (req, action, module, description) => {
  try {
    await AuditLog.create({
      user: req.user.id,
      action,
      module,
      description,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
};

module.exports = logActivity;
