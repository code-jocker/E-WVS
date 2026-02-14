const express = require('express');
const { registerVisitor, getVisitors, getVisitor, updateVisitorStatus, getMyVisitorRecord } = require('../controllers/visitorController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/me', authorize('visitor'), getMyVisitorRecord);
router.post('/', authorize('visitor', 'receptionist', 'super-admin'), registerVisitor);
router.get('/', authorize('super-admin', 'org-admin', 'security', 'receptionist', 'visitor'), getVisitors);
router.get('/:id', authorize('super-admin', 'org-admin', 'security', 'receptionist'), getVisitor);
router.put('/:id', authorize('super-admin', 'org-admin', 'security', 'receptionist'), updateVisitorStatus);

module.exports = router;
