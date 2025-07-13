const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
  uploadCustomerCSV, 
  getCustomers, 
  deleteAllCustomers, 
  getStats 
} = require('../controllers/customerController');
const { getProgress } = require('../controllers/progressState');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

router.post('/upload', upload.single('file'), uploadCustomerCSV);
router.get('/', getCustomers);
router.get('/stats', getStats);
router.delete('/delete', deleteAllCustomers);

router.get('/progress', (req, res) => {
  res.json(getProgress());
});
module.exports = router;
