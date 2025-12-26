const express = require('express');
const router = express.Router();
const {
  getPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  deletePlayer
} = require('../controllers/playerController');
const authenticate = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get('/', getPlayers);
router.get('/:id', getPlayer);
router.post('/', authenticate, createPlayer);
router.put('/:id', authenticate, updatePlayer);
router.delete('/:id', authenticate, roleMiddleware('Admin'), deletePlayer);

module.exports = router;

