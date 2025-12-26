const mongoose = require('mongoose');

const tournamentCategorySchema = new mongoose.Schema({
  tournament_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  category_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  category_type: {
    type: String,
    required: true,
    enum: ['Kata', 'Kumite', 'Team Kata', 'Team Kumite']
  },
  participation_type: {
    type: String,
    required: true,
    enum: ['Individual', 'Team']
  },
  // Customizable fields - can be WKF standard or custom
  use_wkf_standard: {
    type: Boolean,
    default: false
  },
  // Use standard Kumite age and weight classes (for Individual Kumite events)
  use_standard_kumite_classes: {
    type: Boolean,
    default: false
  },
  // Age category - can be custom string or WKF standard
  age_category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  // Custom age range (optional, for custom age groups)
  age_min: {
    type: Number,
    min: 0
  },
  age_max: {
    type: Number,
    min: 0
  },
  // Belt category - can be custom string or individual belt
  belt_category: {
    type: String,
    trim: true,
    maxlength: 100
  },
  // Belt groups (for custom belt groupings like "Novice: White-Green")
  belt_groups: {
    type: [String],
    default: []
  },
  // Custom belt names with kyu levels (optional, for advanced customization)
  use_custom_belt_levels: {
    type: Boolean,
    default: false
  },
  // Custom belt levels organized into groups (e.g., "Level 1: 10-7 Kyu", "Level 2: 6-4 Kyu")
  custom_belt_levels: {
    type: [String],
    default: []
  },
  // Belt level groups structure: { groupName: [beltLevels] }
  // Example: { "Level 1 (10-7 Kyu)": ["White 10th kyu", "White belt red bar 9th kyu", ...] }
  belt_level_groups: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Selected belt level group for this event (e.g., "Level 1 (10-7 Kyu)", "Level 2 (6-4 Kyu)")
  belt_level_group: {
    type: String,
    trim: true,
    maxlength: 100
  },
  // Selected specific belt level/kyu for this event (if using custom belt levels)
  belt_level: {
    type: String,
    trim: true,
    maxlength: 100
  },
  // Is this an "Open" event (for team events over 19 years)
  is_open_event: {
    type: Boolean,
    default: false
  },
  // Weight category - can be custom string or WKF standard
  weight_category: {
    type: String,
    trim: true,
    maxlength: 50
  },
  // Custom weight range (optional, for custom weight classes)
  weight_min: {
    type: Number,
    min: 0
  },
  weight_max: {
    type: Number,
    min: 0
  },
  // Gender (optional)
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Mixed', null],
    default: null
  },
  // Team size (for team events)
  team_size: {
    type: Number,
    min: 2,
    default: 3
  },
  // Fee for individual events
  individual_player_fee: {
    type: Number,
    min: 0,
    default: 0
  },
  // Fee for team events (for a team of team_size members)
  team_event_fee: {
    type: Number,
    min: 0,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TournamentCategory', tournamentCategorySchema);

