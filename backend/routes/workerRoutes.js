const express = require('express');
const { registerWorker, getWorkers, getWorker, updateWorkerStatus, getMyWorkerRecord, uploadDocuments, getPublicHosts, verifySelf } = require('../controllers/workerController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Public routes
router.get('/hosts', getPublicHosts);

router.use(protect);

router.get('/me', authorize('worker'), getMyWorkerRecord);
router.put('/verify-self', authorize('worker'), verifySelf);
router.post('/upload', authorize('worker'), upload.array('documents', 5), uploadDocuments);
router.post('/', authorize('super-admin', 'org-admin'), registerWorker);
router.get('/', authorize('super-admin', 'org-admin', 'security', 'receptionist'), getWorkers);
router.get('/:id', authorize('super-admin', 'org-admin', 'security', 'receptionist'), getWorker);
router.put('/:id', authorize('super-admin', 'org-admin', 'security'), updateWorkerStatus);

module.exports = router;
