const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI - will be initialized when API key is available
let genAI = null;

const initializeGemini = () => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
    console.warn('⚠️ GEMINI_API_KEY not configured');
    return null;
  }
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY.trim();
    // Basic validation - Gemini API keys typically start with "AIza"
    if (!apiKey.startsWith('AIza')) {
      console.warn('⚠️ GEMINI_API_KEY format may be incorrect (should start with "AIza")');
    }
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('✅ Gemini AI initialized');
  }
  return genAI;
};

/**
 * Generate match draws using Google Gemini AI
 * @param {Object} tournamentData - Tournament and registration data
 * @returns {Promise<Object>} Generated match draws structure
 */
const generateMatchDraws = async (tournamentData) => {
  try {
    // Initialize Gemini AI
    const ai = initializeGemini();
    if (!ai) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables');
    }

    console.log('🔵 Initializing Gemini AI model...');
    // Start with gemini-pro (most widely available)
    // If it fails, we'll catch the error and provide helpful guidance
    const model = ai.getGenerativeModel({ model: 'gemini-pro' });
    console.log('✅ Initialized gemini-pro model (will test on first API call)');

    const prompt = `You are an expert tournament bracket generator for Karate tournaments. Generate a fair and balanced match draw structure based on the following tournament information:

Tournament Details:
- Tournament Name: ${tournamentData.tournamentName}
- Category: ${tournamentData.categoryName}
- Category Type: ${tournamentData.categoryType} (${tournamentData.participationType})
- Number of Participants: ${tournamentData.participants.length}
- Tournament Start Date: ${tournamentData.startDate}

Participants:
${tournamentData.participants.map((p, idx) => 
  `${idx + 1}. ${p.name} (ID: ${p.id})${p.belt ? ` - Belt: ${p.belt}` : ''}${p.age ? ` - Age: ${p.age}` : ''}${p.dojo ? ` - Dojo: ${p.dojo}` : ''}`
).join('\n')}

Requirements:
1. Generate a fair bracket structure (single elimination, double elimination, or round-robin based on participant count)
2. For ${tournamentData.participants.length} participants, determine the best bracket format
3. Create matches with proper seeding to avoid early matchups between top competitors from the same dojo
4. Distribute participants evenly across brackets
5. For team events, ensure teams are properly matched
6. Generate match levels: Preliminary, Quarterfinal (if needed), Semifinal, Final, and Bronze matches (if applicable)

CRITICAL: You must return ONLY a valid JSON object. Do not include any markdown code blocks, explanations outside the JSON, or additional text.

Required JSON structure (return this exact format):
{
  "bracketType": "single-elimination",
  "totalRounds": 3,
  "matches": [
    {
      "matchNumber": 1,
      "matchLevel": "Preliminary",
      "round": 1,
      "participant1Id": "exact_participant_id_from_list",
      "participant2Id": "exact_participant_id_from_list",
      "suggestedTime": "09:00",
      "venueArea": "Area A"
    }
  ],
  "seeding": {
    "participant_id_1": 1,
    "participant_id_2": 2
  },
  "explanation": "Brief explanation"
}

Rules:
1. Use EXACT participant IDs from the list above (the "id" field)
2. Ensure ALL participants are included in matches
3. For odd participant counts, set participant2Id to null for bye matches
4. Match levels: Use "Preliminary" for early rounds, "Quarterfinal" for 8+ participants, "Semifinal" for 4+, "Final" for championship, "Bronze" for third place
5. Suggested times: Format as "HH:MM" (e.g., "09:00", "10:30", "14:15")
6. Venue areas: Use "Area A", "Area B", "Area C", etc.
7. Return ONLY the JSON object, nothing else`;

    console.log('🔵 Sending request to Gemini AI...');
    console.log('📊 Tournament data:', {
      tournamentName: tournamentData.tournamentName,
      participantsCount: tournamentData.participants.length
    });

    let result, response, text;
    try {
      console.log('📤 Calling model.generateContent...');
      result = await model.generateContent(prompt);
      console.log('📥 Got result, extracting response...');
      response = await result.response;
      console.log('📄 Extracting text from response...');
      text = response.text();
      console.log('✅ Received response from Gemini AI');
      console.log('📝 Response length:', text.length, 'characters');
      console.log('📝 Response preview (first 200 chars):', text.substring(0, 200));
    } catch (apiError) {
      console.error('❌ Gemini API call failed:', {
        message: apiError.message,
        status: apiError.status,
        statusText: apiError.statusText,
        error: apiError
      });
      
      // Check for specific error types
      if (apiError.message?.includes('API_KEY') || apiError.message?.includes('401') || apiError.message?.includes('403')) {
        throw new Error('Invalid or unauthorized Gemini API key. Please verify your GEMINI_API_KEY in .env file and ensure it has proper permissions.');
      } else if (apiError.message?.includes('quota') || apiError.message?.includes('rate limit') || apiError.message?.includes('429')) {
        throw new Error('Gemini API quota exceeded or rate limited. Please try again later.');
      } else if (apiError.message?.includes('404') || apiError.message?.includes('not found')) {
        // Model not found - try alternative model names
        console.log('⚠️ gemini-pro not found, trying alternative models...');
        const alternativeModels = ['models/gemini-pro', 'gemini-1.5-pro', 'models/gemini-1.5-pro'];
        let fallbackSuccess = false;
        
        for (const altModelName of alternativeModels) {
          try {
            console.log(`🔵 Trying alternative model: ${altModelName}`);
            const altModel = ai.getGenerativeModel({ model: altModelName });
            result = await altModel.generateContent(prompt);
            response = await result.response;
            text = response.text();
            console.log(`✅ Successfully used alternative model: ${altModelName}`);
            fallbackSuccess = true;
            break;
          } catch (altError) {
            console.log(`⚠️ Alternative model ${altModelName} also failed: ${altError.message}`);
            continue;
          }
        }
        
        if (!fallbackSuccess) {
          throw new Error('Gemini API model not found. Your API key may not have access to any Gemini models. Please:\n1. Verify your API key at https://aistudio.google.com/apikey\n2. Ensure your API key is not restricted\n3. Check that Gemini API is enabled for your project');
        }
      } else {
        throw new Error(`Gemini API error: ${apiError.message || 'Failed to generate content'}`);
      }
    }

    // Clean up the response - remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Remove any leading/trailing whitespace and newlines
    text = text.trim();

    // Parse the JSON response
    let drawData;
    try {
      drawData = JSON.parse(text);
      console.log('✅ Successfully parsed JSON response');
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      console.error('📄 Full response text:', text);
      console.error('📄 Response text (first 1000 chars):', text.substring(0, 1000));
      
      // Try to extract JSON object from the response (handle markdown code blocks)
      let jsonText = text;
      
      // Remove markdown code blocks more aggressively
      jsonText = jsonText.replace(/```json\s*/gi, '');
      jsonText = jsonText.replace(/```\s*/g, '');
      jsonText = jsonText.trim();
      
      // Try to find JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          drawData = JSON.parse(jsonMatch[0]);
          console.log('✅ Successfully extracted and parsed JSON from response');
        } catch (extractError) {
          console.error('❌ Failed to parse extracted JSON:', extractError.message);
          console.error('📄 Extracted JSON:', jsonMatch[0].substring(0, 500));
          throw new Error(`Failed to parse Gemini response as JSON: ${parseError.message}. Please check the API response format.`);
        }
      } else {
        console.error('❌ No JSON object found in response');
        throw new Error(`Failed to find JSON in Gemini response. The AI may have returned invalid format. Response preview: ${text.substring(0, 300)}`);
      }
    }

    // Validate the response structure
    if (!drawData.matches || !Array.isArray(drawData.matches)) {
      throw new Error('Invalid response structure: matches array is missing');
    }

    if (!drawData.bracketType) {
      drawData.bracketType = 'single-elimination';
    }

    if (!drawData.totalRounds) {
      drawData.totalRounds = Math.ceil(Math.log2(drawData.matches.length * 2));
    }

    return drawData;
  } catch (error) {
    console.error('Error generating match draws with Gemini:', error);
    throw error;
  }
};

/**
 * Generate intelligent match schedule using Gemini
 * @param {Object} scheduleData - Match and tournament schedule data
 * @returns {Promise<Object>} Optimized schedule
 */
const optimizeMatchSchedule = async (scheduleData) => {
  try {
    const ai = initializeGemini();
    if (!ai) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const model = ai.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `You are a tournament scheduling expert. Optimize the match schedule to:
1. Avoid scheduling conflicts for participants
2. Distribute matches evenly throughout the day
3. Allow adequate rest time between matches for participants
4. Balance venue area usage
5. Consider match importance (earlier rounds can be scheduled closer together)

Current Schedule Data:
${JSON.stringify(scheduleData, null, 2)}

Return optimized schedule times in JSON format.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error('Error optimizing schedule with Gemini:', error);
    throw error;
  }
};

module.exports = {
  generateMatchDraws,
  optimizeMatchSchedule,
  initializeGemini
};

