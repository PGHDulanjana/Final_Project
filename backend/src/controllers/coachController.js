const Coach = require('../models/Coach');
const User = require('../models/User');
const Dojo = require('../models/Dojo');

// @desc    Get all coaches with dojo information
// @route   GET /api/coaches
// @access  Public
const getCoaches = async (req, res, next) => {
  try {
    const coaches = await Coach.find()
      .populate('user_id', 'username email first_name last_name profile_picture')
      .sort({ created_at: -1 });

    // Get ALL dojos for each coach (coaches can have multiple dojos)
    const coachesWithDojos = await Promise.all(
      coaches.map(async (coach) => {
        const dojos = await Dojo.find({ coach_id: coach._id, is_active: true });
        return {
          ...coach.toObject(),
          dojos: dojos.map(dojo => ({
            _id: dojo._id,
            dojo_name: dojo.dojo_name,
            address: dojo.address,
            phone: dojo.phone,
            description: dojo.description
          })),
          // Keep backward compatibility - use first dojo as primary
          dojo: dojos.length > 0 ? {
            _id: dojos[0]._id,
            dojo_name: dojos[0].dojo_name,
            address: dojos[0].address,
            phone: dojos[0].phone
          } : null
        };
      })
    );

    res.status(200).json({
      success: true,
      count: coachesWithDojos.length,
      data: coachesWithDojos
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single coach
// @route   GET /api/coaches/:id
// @access  Public
const getCoach = async (req, res, next) => {
  try {
    const coach = await Coach.findById(req.params.id)
      .populate('user_id', 'username email first_name last_name phone profile_picture');

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
    }

    res.status(200).json({
      success: true,
      data: coach
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create coach profile
// @route   POST /api/coaches
// @access  Private
const createCoach = async (req, res, next) => {
  try {
    // Check if user is Coach type
    if (req.user.user_type !== 'Coach') {
      return res.status(403).json({
        success: false,
        message: 'Only users with Coach type can create coach profile'
      });
    }

    // Check if coach profile already exists
    const existingCoach = await Coach.findOne({ user_id: req.user._id });
    if (existingCoach) {
      return res.status(400).json({
        success: false,
        message: 'Coach profile already exists'
      });
    }

    const coach = await Coach.create({
      ...req.body,
      user_id: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Coach profile created successfully',
      data: coach
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update coach
// @route   PUT /api/coaches/:id
// @access  Private
const updateCoach = async (req, res, next) => {
  try {
    let coach = await Coach.findById(req.params.id);

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
    }

    // Check authorization
    if (coach.user_id.toString() !== req.user._id.toString() && req.user.user_type !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this coach'
      });
    }

    coach = await Coach.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('user_id', 'username email first_name last_name profile_picture');

    res.status(200).json({
      success: true,
      message: 'Coach updated successfully',
      data: coach
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete coach
// @route   DELETE /api/coaches/:id
// @access  Private/Admin
const deleteCoach = async (req, res, next) => {
  try {
    const coach = await Coach.findById(req.params.id);

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
    }

    await coach.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Coach deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCoaches,
  getCoach,
  createCoach,
  updateCoach,
  deleteCoach
};

