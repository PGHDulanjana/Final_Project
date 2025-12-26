const express = require('express');
const router = express.Router();
const {
  getDojos,
  getDojo,
  createDojo,
  updateDojo,
  deleteDojo
} = require('../controllers/dojoController');
const authenticate = require('../middlewares/authMiddleware');

router.get('/', getDojos);
router.get('/:id', getDojo);
router.post('/', authenticate, createDojo);
router.put('/:id', authenticate, updateDojo);
router.delete('/:id', authenticate, deleteDojo);

module.exports = router;

