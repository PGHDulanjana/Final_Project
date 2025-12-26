const crypto = require('crypto');
const User = require('../models/User');
const Coach = require('../models/Coach');
const Player = require('../models/Player');
const Dojo = require('../models/Dojo');
const { generateToken } = require('../utils/generateToken');
const { sendPasswordResetOTP } = require('../utils/emailService');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { 
      username, 
      email, 
      password_hash, 
      first_name, 
      last_name, 
      user_type, 
      phone, 
      date_of_birth, 
      gender: genderRaw,
      // Player-specific fields
      selected_coach_id,
      player_dojo_name,
      coach_name,
      coach_id,
      // Coach-specific fields
      dojo_name,
      dojo_street,
      dojo_city,
      dojo_state,
      dojo_zip_code,
      dojo_country,
      dojo_phone,
      dojo_description,
      dojo_established_date,
      // Coach profile fields
      certification_level,
      experience_years,
      specialization,
      // Optional organization details
      organization_name,
      organization_license
    } = req.body;

    // Prevent Admin registration through API
    if (user_type === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be created through registration'
      });
    }

    // Validate coach-specific required fields
    if (user_type === 'Coach') {
      if (!dojo_name || !dojo_street || !dojo_city || !dojo_state || !dojo_zip_code || !dojo_country) {
        return res.status(400).json({
          success: false,
          message: 'Dojo details are required for coach registration'
        });
      }
      if (!certification_level || experience_years === undefined || experience_years === '') {
        return res.status(400).json({
          success: false,
          message: 'Certification level and experience years are required for coach registration'
        });
      }
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Create user - only include gender if it's a valid enum value
    const userData = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password_hash,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      user_type: user_type || 'Player',
    };
    
    // Only include optional fields if they have valid values
    if (phone && phone.trim() !== '') {
      userData.phone = phone.trim();
    }
    
    if (date_of_birth) {
      userData.date_of_birth = date_of_birth;
    }
    
    // Handle gender: Convert null/undefined/empty to undefined to prevent Mongoose enum validation errors
    // CRITICAL: If gender is null, undefined, or empty string, we must NOT include it in userData
    let gender = genderRaw;
    if (gender === null || gender === undefined || gender === '') {
      gender = undefined; // Explicitly set to undefined so it's not included
    }
    
    // Only include gender if it's a valid enum value
    const validGenders = ['Male', 'Female', 'Other'];
    if (gender && typeof gender === 'string') {
      const trimmedGender = gender.trim();
      if (validGenders.includes(trimmedGender)) {
        userData.gender = trimmedGender;
      }
      // If gender is provided but invalid, explicitly do NOT include it
    }
    // If gender is not provided or invalid, don't include it in userData at all
    // This prevents Mongoose from trying to validate null/undefined values
    
    // Log userData for debugging (remove password_hash from log)
    console.log('📝 Backend - Creating user with data:', {
      ...userData,
      password_hash: '***hidden***',
      hasGender: 'gender' in userData,
      genderValue: userData.gender
    });
    
    let user;
    try {
      user = await User.create(userData);
      console.log('✅ Backend - User created successfully:', {
        userId: user._id,
        gender: user.gender
      });
    } catch (createError) {
      // Log the full error for debugging
      console.error('❌ Backend - User creation error:', createError);
      console.error('Error details:', {
        name: createError.name,
        message: createError.message,
        errors: createError.errors,
        stack: createError.stack
      });
      
      // Return a more descriptive error message
      if (createError.name === 'ValidationError') {
        const validationErrors = Object.values(createError.errors || {}).map(err => ({
          field: err.path,
          message: err.message,
          value: err.value
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation error: ' + validationErrors.map(e => `${e.field}: ${e.message}`).join(', '),
          errors: validationErrors
        });
      }
      
      // Re-throw to be handled by error middleware
      throw createError;
    }

    // If user is a Coach, create Coach profile and Dojo
    if (user_type === 'Coach') {
      // Create Coach profile
      const coach = await Coach.create({
        user_id: user._id,
        certification_level: certification_level || 'Beginner',
        experience_years: parseInt(experience_years) || 0,
        specialization: specialization || []
      });

      // Create Dojo
      const dojo = await Dojo.create({
        coach_id: coach._id,
        dojo_name,
        address: {
          street: dojo_street,
          city: dojo_city,
          state: dojo_state,
          zip_code: dojo_zip_code,
          country: dojo_country
        },
        phone: dojo_phone || phone,
        description: dojo_description || '',
        established_date: dojo_established_date || null
      });

      // Update Coach with organization details if provided
      if (organization_name || organization_license) {
        coach.organization_name = organization_name || coach.organization_name;
        coach.organization_license = organization_license || coach.organization_license;
        await coach.save();
      }
    }

    // If user is a Player, create Player profile with dojo and coach info
    if (user_type === 'Player') {
      console.log('🔵 Player registration - Received data:', {
        selected_coach_id,
        coach_id,
        player_dojo_name,
        coach_name,
        user_id: user._id
      });
      
      // Validate player-specific required fields - Coach selection is MANDATORY
      if (!selected_coach_id && !coach_id) {
        console.error('❌ Player registration failed: No coach selected');
        return res.status(400).json({
          success: false,
          message: 'Coach selection is required. Please select your coach from the dropdown.'
        });
      }
      
      if (!player_dojo_name || player_dojo_name.trim() === '') {
        console.error('❌ Player registration failed: No dojo selected');
        return res.status(400).json({
          success: false,
          message: 'Dojo selection is required. Please select your dojo from the dropdown.'
        });
      }

      let coach = null;
      let finalDojoName = player_dojo_name;
      let finalCoachName = coach_name;

      // Coach MUST be selected from dropdown (selected_coach_id is required)
      const coachId = selected_coach_id || coach_id;
      if (!coachId) {
        return res.status(400).json({
          success: false,
          message: 'Coach selection is required. Please select your coach from the dropdown.'
        });
      }
      
      coach = await Coach.findById(coachId).populate('user_id', 'first_name last_name username');
      
      if (!coach) {
        return res.status(400).json({
          success: false,
          message: 'Selected coach not found. Please select a valid coach.'
        });
      }

        // Get dojo information - find the specific dojo that matches player_dojo_name
        const Dojo = require('../models/Dojo');
        let dojo = null;
        
        // If player_dojo_name is provided, find the specific dojo by name
        if (player_dojo_name && player_dojo_name.trim() !== '') {
          dojo = await Dojo.findOne({ 
            coach_id: coach._id,
            dojo_name: { $regex: new RegExp(`^${player_dojo_name.trim()}$`, 'i') }
          });
        }
        
        // If specific dojo not found, try to find any dojo for this coach
        if (!dojo) {
          dojo = await Dojo.findOne({ coach_id: coach._id, is_active: true });
        }
        
        // Use the selected dojo name from form, or dojo from database, or fallback
        if (player_dojo_name && player_dojo_name.trim() !== '') {
          // Prefer the selected dojo name from the form
          finalDojoName = player_dojo_name.trim();
        } else if (dojo && dojo.dojo_name) {
          // Fallback to dojo from database
          finalDojoName = dojo.dojo_name;
        }
        
      // Get coach name from user
      if (coach.user_id) {
        finalCoachName = coach.user_id.first_name && coach.user_id.last_name
          ? `${coach.user_id.first_name} ${coach.user_id.last_name}`
          : coach.user_id.username || 'Coach';
      }

      // Validate that we have both coach_name and dojo_name before creating player
      if (!finalCoachName) {
        console.error('❌ Player registration failed: finalCoachName is empty');
        return res.status(400).json({
          success: false,
          message: 'Coach name is required for player registration'
        });
      }
      
      if (!finalDojoName || finalDojoName.trim() === '') {
        console.error('❌ Player registration failed: finalDojoName is empty');
        return res.status(400).json({
          success: false,
          message: 'Dojo name is required for player registration. Please ensure your coach has a dojo set up.'
        });
      }
      
      console.log('🔵 Player registration - Validated data:', {
        finalCoachName,
        finalDojoName,
        coach_id: coach ? coach._id : null,
        user_id: user._id
      });

      // Create Player profile - CRITICAL: This must succeed for player to appear in dashboards
      let player = null;
      try {
        // Check if player already exists for this user (shouldn't happen, but safety check)
        const existingPlayer = await Player.findOne({ user_id: user._id });
        if (existingPlayer) {
          console.warn('⚠️ Player profile already exists for this user:', existingPlayer._id);
          player = existingPlayer;
        } else {
          // Calculate age from date_of_birth if provided
          let age = null;
          if (date_of_birth) {
            const today = new Date();
            const birthDate = new Date(date_of_birth);
            age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
          }
          
          // Calculate age_category from age or date_of_birth
          let calculatedAgeCategory = 'Under 10'; // Default
          if (age !== null) {
            if (age < 10) calculatedAgeCategory = 'Under 10';
            else if (age >= 10 && age <= 12) calculatedAgeCategory = '10-12';
            else if (age >= 13 && age <= 15) calculatedAgeCategory = '13-15';
            else if (age >= 16 && age <= 17) calculatedAgeCategory = '16-17';
            else if (age >= 18 && age <= 21) calculatedAgeCategory = '18-21';
            else if (age >= 22 && age <= 34) calculatedAgeCategory = '22-34';
            else calculatedAgeCategory = '35+';
          } else if (date_of_birth) {
            const today = new Date();
            const birthDate = new Date(date_of_birth);
            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              calculatedAge--;
            }
            if (calculatedAge < 10) calculatedAgeCategory = 'Under 10';
            else if (calculatedAge >= 10 && calculatedAge <= 12) calculatedAgeCategory = '10-12';
            else if (calculatedAge >= 13 && calculatedAge <= 15) calculatedAgeCategory = '13-15';
            else if (calculatedAge >= 16 && calculatedAge <= 17) calculatedAgeCategory = '16-17';
            else if (calculatedAge >= 18 && calculatedAge <= 21) calculatedAgeCategory = '18-21';
            else if (calculatedAge >= 22 && calculatedAge <= 34) calculatedAgeCategory = '22-34';
            else calculatedAgeCategory = '35+';
          }
          
          // Prepare player data - only include gender if it's a valid enum value
          const playerData = {
            user_id: user._id,
            dojo_name: finalDojoName.trim(),
            coach_name: finalCoachName.trim(),
            coach_id: coach ? coach._id : null,
            belt_rank: 'White', // Default, can be updated later
            age_category: calculatedAgeCategory,
            // Event type preferences - defaults to false, can be updated later
            kata: false,
            kumite: false,
            team_kata: false,
            team_kumite: false,
            medical_info: null,
            emergency_contact: {
              name: null,
              phone: null,
              relationship: null
            }
          };
          
          // Only include age if calculated
          if (age !== null) {
            playerData.age = age;
          }
          
          // Only include gender if it's a valid enum value ('Male' or 'Female')
          // Don't set gender to null as it will fail enum validation
          if (genderRaw && (genderRaw === 'Male' || genderRaw === 'Female')) {
            playerData.gender = genderRaw;
          }
          // If genderRaw is not valid, don't include it (will use model default)
          
          // Only include weight_category if provided (otherwise omit to use default)
          
          // Create Player profile with all available data
          player = await Player.create(playerData);
        }
        
        // Verify player was created successfully
        if (!player || !player._id) {
          throw new Error('Player creation returned null or invalid player object');
        }
        
        // Log for debugging
        console.log('✅ Player created successfully:', {
          player_id: player._id,
          user_id: user._id,
          coach_name: player.coach_name,
          dojo_name: player.dojo_name,
          coach_id: player.coach_id,
          coach_id_type: typeof player.coach_id,
          coach_id_string: String(player.coach_id)
        });
      } catch (playerError) {
        console.error('❌ CRITICAL ERROR creating player profile:', playerError);
        console.error('Error details:', {
          message: playerError.message,
          name: playerError.name,
          code: playerError.code,
          errors: playerError.errors,
          keyPattern: playerError.keyPattern,
          keyValue: playerError.keyValue
        });
        
        // If Player creation fails, we should fail the entire registration
        // because the user account without a Player profile won't work properly
        // Delete the user account that was just created
        try {
          await User.findByIdAndDelete(user._id);
          console.log('✅ Rolled back user creation due to Player profile creation failure');
        } catch (deleteError) {
          console.error('❌ Error deleting user after Player creation failure:', deleteError);
        }
        
        // Return detailed error to frontend
        let errorMessage = 'Failed to create player profile. ';
        if (playerError.code === 11000) {
          errorMessage += 'A player profile already exists for this user.';
        } else if (playerError.errors) {
          const validationErrors = Object.values(playerError.errors).map(e => e.message).join(', ');
          errorMessage += validationErrors;
        } else {
          errorMessage += playerError.message || 'Unknown error';
        }
        
        return res.status(500).json({
          success: false,
          message: errorMessage + ' Please try again or contact support.',
          error: process.env.NODE_ENV === 'development' ? playerError.message : undefined
        });
      }
    }

    // Generate token
    const token = generateToken(user._id, user.user_type);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          user_type: user.user_type
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password_hash } = req.body;

    // Validate email & password
    if (!email || !password_hash) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password_hash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user._id, user.user_type);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          user_type: user.user_type,
          profile_picture: user.profile_picture
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password_hash');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password - Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    // Don't reveal if user exists or not for security
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, an OTP has been sent.'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetPasswordOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save OTP to user
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpire = resetPasswordOTPExpire;
    await user.save({ validateBeforeSave: false });

    try {
      const emailResult = await sendPasswordResetOTP(user.email, otp);
      
      // Check if email was actually sent
      if (!emailResult || !emailResult.success) {
        // In development, log the OTP to console for testing
        if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_HOST) {
          console.log('\n========================================');
          console.log('PASSWORD RESET OTP (Email not configured):');
          console.log('========================================');
          console.log(`Email: ${user.email}`);
          console.log(`OTP: ${otp}`);
          console.log(`Expires: ${new Date(resetPasswordOTPExpire).toLocaleString()}`);
          console.log('========================================\n');
          
          // Don't clear the OTP in development so user can still use it
          return res.status(200).json({
            success: true,
            message: 'OTP generated. Check server console for the OTP (email not configured).',
            development: true,
            otp: process.env.NODE_ENV === 'development' ? otp : undefined
          });
        }

        // If email fails in production, clear the OTP
        user.resetPasswordOTP = undefined;
        user.resetPasswordOTPExpire = undefined;
        await user.save({ validateBeforeSave: false });

        console.error('Email send failed:', emailResult?.error || 'Unknown error');
        return res.status(500).json({
          success: false,
          message: emailResult?.error || 'Email could not be sent. Please check your email configuration or try again later.'
        });
      }

      res.status(200).json({
        success: true,
        message: 'OTP sent to your email successfully'
      });
    } catch (error) {
      // In development, still log the OTP
      if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_HOST) {
        console.log('\n========================================');
        console.log('PASSWORD RESET OTP (Email error occurred):');
        console.log('========================================');
        console.log(`Email: ${user.email}`);
        console.log(`OTP: ${otp}`);
        console.log(`Expires: ${new Date(resetPasswordOTPExpire).toLocaleString()}`);
        console.log('========================================\n');
        
        return res.status(200).json({
          success: true,
          message: 'OTP generated. Check server console for the OTP (email error occurred).',
          development: true,
          otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });
      }

      // If email fails, clear the OTP
      user.resetPasswordOTP = undefined;
      user.resetPasswordOTPExpire = undefined;
      await user.save({ validateBeforeSave: false });

      console.error('Email send error:', error);
      return res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please check your email configuration or try again later.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP'
      });
    }

    // Find user with valid OTP
    const user = await User.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordOTPExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, OTP, and password'
      });
    }

    // Find user with valid OTP
    const user = await User.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordOTPExpire: { $gt: Date.now() }
    }).select('+password_hash');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Set new password and clear OTP
    user.password_hash = password;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  forgotPassword,
  verifyOTP,
  resetPassword
};

