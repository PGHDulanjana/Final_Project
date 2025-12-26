// Kumite Age and Weight Classes
// Standard classes for Individual Kumite events
// Age categories: Under 10, Under 12, Under 14, Under 16, Under 21, Over 21

export const KUMITE_CLASSES = {
  Male: {
    'Under 10': [
      { label: 'Under 35kg', value: 'Under 35kg', min: 0, max: 35 },
      { label: 'Under 40kg', value: 'Under 40kg', min: 0, max: 40 },
      { label: 'Over 40kg', value: 'Over 40kg', min: 40.01, max: null }
    ],
    'Under 12': [
      { label: 'Under 40kg', value: 'Under 40kg', min: 0, max: 40 },
      { label: 'Under 45kg', value: 'Under 45kg', min: 0, max: 45 },
      { label: 'Over 45kg', value: 'Over 45kg', min: 45.01, max: null }
    ],
    'Under 14': [
      { label: 'Under 45kg', value: 'Under 45kg', min: 0, max: 45 },
      { label: 'Under 50kg', value: 'Under 50kg', min: 0, max: 50 },
      { label: 'Over 50kg', value: 'Over 50kg', min: 50.01, max: null }
    ],
    'Under 16': [
      { label: 'Under 55kg', value: 'Under 55kg', min: 0, max: 55 },
      { label: 'Under 61kg', value: 'Under 61kg', min: 0, max: 61 },
      { label: 'Under 68kg', value: 'Under 68kg', min: 0, max: 68 },
      { label: 'Under 76kg', value: 'Under 76kg', min: 0, max: 76 },
      { label: 'Over 76kg', value: 'Over 76kg', min: 76.01, max: null }
    ],
    'Under 21': [
      { label: 'Under 50kg', value: 'Under 50kg', min: 0, max: 50 },
      { label: 'Under 55kg', value: 'Under 55kg', min: 0, max: 55 },
      { label: 'Under 60kg', value: 'Under 60kg', min: 0, max: 60 },
      { label: 'Under 67kg', value: 'Under 67kg', min: 0, max: 67 },
      { label: 'Under 75kg', value: 'Under 75kg', min: 0, max: 75 },
      { label: 'Under 80kg', value: 'Under 80kg', min: 0, max: 80 },
      { label: 'Under 84kg', value: 'Under 84kg', min: 0, max: 84 },
      { label: 'Over 84kg', value: 'Over 84kg', min: 84.01, max: null }
    ],
    'Over 21': [
      { label: 'Under 45kg', value: 'Under 45kg', min: 0, max: 45 },
      { label: 'Under 50kg', value: 'Under 50kg', min: 0, max: 50 },
      { label: 'Under 55kg', value: 'Under 55kg', min: 0, max: 55 },
      { label: 'Under 60kg', value: 'Under 60kg', min: 0, max: 60 },
      { label: 'Under 67kg', value: 'Under 67kg', min: 0, max: 67 },
      { label: 'Under 75kg', value: 'Under 75kg', min: 0, max: 75 },
      { label: 'Under 80kg', value: 'Under 80kg', min: 0, max: 80 },
      { label: 'Under 84kg', value: 'Under 84kg', min: 0, max: 84 },
      { label: 'Over 84kg', value: 'Over 84kg', min: 84.01, max: null }
    ]
  },
  Female: {
    'Under 10': [
      { label: 'Under 30kg', value: 'Under 30kg', min: 0, max: 30 },
      { label: 'Under 35kg', value: 'Under 35kg', min: 0, max: 35 },
      { label: 'Over 35kg', value: 'Over 35kg', min: 35.01, max: null }
    ],
    'Under 12': [
      { label: 'Under 35kg', value: 'Under 35kg', min: 0, max: 35 },
      { label: 'Under 40kg', value: 'Under 40kg', min: 0, max: 40 },
      { label: 'Over 40kg', value: 'Over 40kg', min: 40.01, max: null }
    ],
    'Under 14': [
      { label: 'Under 40kg', value: 'Under 40kg', min: 0, max: 40 },
      { label: 'Under 45kg', value: 'Under 45kg', min: 0, max: 45 },
      { label: 'Over 45kg', value: 'Over 45kg', min: 45.01, max: null }
    ],
    'Under 16': [
      { label: 'Under 48kg', value: 'Under 48kg', min: 0, max: 48 },
      { label: 'Under 53kg', value: 'Under 53kg', min: 0, max: 53 },
      { label: 'Under 59kg', value: 'Under 59kg', min: 0, max: 59 },
      { label: 'Under 66kg', value: 'Under 66kg', min: 0, max: 66 },
      { label: 'Over 66kg', value: 'Over 66kg', min: 66.01, max: null }
    ],
    'Under 21': [
      { label: 'Under 45kg', value: 'Under 45kg', min: 0, max: 45 },
      { label: 'Under 50kg', value: 'Under 50kg', min: 0, max: 50 },
      { label: 'Under 55kg', value: 'Under 55kg', min: 0, max: 55 },
      { label: 'Under 61kg', value: 'Under 61kg', min: 0, max: 61 },
      { label: 'Under 68kg', value: 'Under 68kg', min: 0, max: 68 },
      { label: 'Over 68kg', value: 'Over 68kg', min: 68.01, max: null }
    ],
    'Over 21': [
      { label: 'Under 45kg', value: 'Under 45kg', min: 0, max: 45 },
      { label: 'Under 50kg', value: 'Under 50kg', min: 0, max: 50 },
      { label: 'Under 55kg', value: 'Under 55kg', min: 0, max: 55 },
      { label: 'Under 61kg', value: 'Under 61kg', min: 0, max: 61 },
      { label: 'Under 68kg', value: 'Under 68kg', min: 0, max: 68 },
      { label: 'Over 68kg', value: 'Over 68kg', min: 68.01, max: null }
    ]
  }
};

// Get weight classes for a specific age category and gender
export const getWeightClasses = (ageCategory, gender) => {
  if (!KUMITE_CLASSES[gender] || !KUMITE_CLASSES[gender][ageCategory]) {
    return [];
  }
  return KUMITE_CLASSES[gender][ageCategory];
};

// Get all age categories for a gender
export const getAgeCategories = (gender) => {
  if (!KUMITE_CLASSES[gender]) {
    return [];
  }
  return Object.keys(KUMITE_CLASSES[gender]);
};

// Check if using standard Kumite classes
export const isStandardKumiteClass = (ageCategory, gender, weightCategory) => {
  const classes = getWeightClasses(ageCategory, gender);
  return classes.some(c => c.value === weightCategory);
};
