const Organizer = require('../models/Organizer');
const User = require('../models/User');

// @desc    Get all organizers
// @route   GET /api/organizers
// @access  Public
const getOrganizers = async (req, res, next) => {
  try {
    const organizers = await Organizer.find()
      .populate('user_id', 'username email first_name last_name profile_picture')
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      count: organizers.length,
      data: organizers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single organizer
// @route   GET /api/organizers/:id
// @access  Public
const getOrganizer = async (req, res, next) => {
  try {
    const organizer = await Organizer.findById(req.params.id)
      .populate('user_id', 'username email first_name last_name phone profile_picture');

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: organizer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create organizer profile
// @route   POST /api/organizers
// @access  Private
const createOrganizer = async (req, res, next) => {
  try {
    // Check if user is Organizer type
    if (req.user.user_type !== 'Organizer') {
      return res.status(403).json({
        success: false,
        message: 'Only users with Organizer type can create organizer profile'
      });
    }

    // Check if organizer profile already exists
    const existingOrganizer = await Organizer.findOne({ user_id: req.user._id });
    if (existingOrganizer) {
      return res.status(400).json({
        success: false,
        message: 'Organizer profile already exists'
      });
    }

    const organizer = await Organizer.create({
      ...req.body,
      user_id: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Organizer profile created successfully',
      data: organizer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update organizer
// @route   PUT /api/organizers/:id
// @access  Private
const updateOrganizer = async (req, res, next) => {
  try {
    let organizer = await Organizer.findById(req.params.id);

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }

    // Check authorization
    if (organizer.user_id.toString() !== req.user._id.toString() && req.user.user_type !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this organizer'
      });
    }

    organizer = await Organizer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('user_id', 'username email first_name last_name profile_picture');

    res.status(200).json({
      success: true,
      message: 'Organizer updated successfully',
      data: organizer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete organizer
// @route   DELETE /api/organizers/:id
// @access  Private/Admin
const deleteOrganizer = async (req, res, next) => {
  try {
    const organizer = await Organizer.findById(req.params.id);

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }

    await organizer.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Organizer deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrganizers,
  getOrganizer,
  createOrganizer,
  updateOrganizer,
  deleteOrganizer
};

