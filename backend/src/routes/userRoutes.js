const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const authenticate = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const { uploadProfilePicture } = require('../utils/imageHandler');
const { updateProfileValidation } = require('../validations/userValidation');
const validateRequest = require('../middlewares/validateRequest');

router.get('/', authenticate, roleMiddleware('Admin'), getUsers);
router.get('/:id', authenticate, getUser);
router.put('/:id', authenticate, uploadProfilePicture, updateProfileValidation, validateRequest, updateUser);
router.delete('/:id', authenticate, roleMiddleware('Admin'), deleteUser);

module.exports = router;

