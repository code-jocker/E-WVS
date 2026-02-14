const express = require('express');
const { getAuditLogs } = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('super-admin'));

router.get('/', getAuditLogs);

module.exports = router;
