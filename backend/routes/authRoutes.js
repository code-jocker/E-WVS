const express = require('express');
const { register, login, getMe, trackStatus } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/track/:email', trackStatus);
router.get('/me', protect, getMe);

module.exports = router;
