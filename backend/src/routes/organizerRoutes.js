const express = require('express');
const router = express.Router();
const {
  getOrganizers,
  getOrganizer,
  createOrganizer,
  updateOrganizer,
  deleteOrganizer
} = require('../controllers/organizerController');
const authenticate = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get('/', getOrganizers);
router.get('/:id', getOrganizer);
router.post('/', authenticate, createOrganizer);
router.put('/:id', authenticate, updateOrganizer);
router.delete('/:id', authenticate, roleMiddleware('Admin'), deleteOrganizer);

module.exports = router;

