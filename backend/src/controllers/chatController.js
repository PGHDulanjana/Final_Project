const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const TournamentCategory = require('../models/TournamentCategory');
const { initializeGemini } = require('../utils/geminiService');

// @desc    Get all messages for user
// @route   GET /api/chat
// @access  Private
const getMessages = async (req, res, next) => {
  try {
    const { receiver_id } = req.query;
    const query = {
      $or: [
        { sender_id: req.user._id },
        { receiver_id: req.user._id }
      ]
    };

    if (receiver_id) {
      query.$or = [
        { sender_id: req.user._id, receiver_id },
        { sender_id: receiver_id, receiver_id: req.user._id }
      ];
    }

    const messages = await ChatMessage.find(query)
      .populate('sender_id', 'username first_name last_name profile_picture')
      .populate('receiver_id', 'username first_name last_name profile_picture')
      .sort({ created_at: 1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single message
// @route   GET /api/chat/:id
// @access  Private
const getMessage = async (req, res, next) => {
  try {
    const message = await ChatMessage.findById(req.params.id)
      .populate('sender_id', 'username first_name last_name profile_picture')
      .populate('receiver_id', 'username first_name last_name profile_picture');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check authorization
    if (message.sender_id._id.toString() !== req.user._id.toString() &&
        message.receiver_id._id.toString() !== req.user._id.toString() &&
        req.user.user_type !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this message'
      });
    }

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send message
// @route   POST /api/chat
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const { receiver_id, message, message_type } = req.body;

    // Verify receiver exists
    const receiver = await User.findById(receiver_id);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    const chatMessage = await ChatMessage.create({
      sender_id: req.user._id,
      receiver_id,
      message,
      message_type: message_type || 'Text'
    });

    const populatedMessage = await ChatMessage.findById(chatMessage._id)
      .populate('sender_id', 'username first_name last_name profile_picture')
      .populate('receiver_id', 'username first_name last_name profile_picture');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: populatedMessage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update message (mark as resolved, etc.)
// @route   PUT /api/chat/:id
// @access  Private
const updateMessage = async (req, res, next) => {
  try {
    let chatMessage = await ChatMessage.findById(req.params.id);

    if (!chatMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check authorization
    if (chatMessage.sender_id.toString() !== req.user._id.toString() &&
        chatMessage.receiver_id.toString() !== req.user._id.toString() &&
        req.user.user_type !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this message'
      });
    }

    chatMessage = await ChatMessage.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('sender_id', 'username first_name last_name profile_picture')
      .populate('receiver_id', 'username first_name last_name profile_picture');

    res.status(200).json({
      success: true,
      message: 'Message updated successfully',
      data: chatMessage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete message
// @route   DELETE /api/chat/:id
// @access  Private
const deleteMessage = async (req, res, next) => {
  try {
    const chatMessage = await ChatMessage.findById(req.params.id);

    if (!chatMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check authorization
    if (chatMessage.sender_id.toString() !== req.user._id.toString() &&
        req.user.user_type !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }

    await chatMessage.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send message to bot and get AI response
// @route   POST /api/chat/bot
// @access  Private
const sendBotMessage = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Initialize Gemini AI
    const ai = initializeGemini();
    if (!ai) {
      return res.status(503).json({
        success: false,
        message: 'AI service is not available. Please configure GEMINI_API_KEY in environment variables.'
      });
    }

    // Get user context for personalized responses
    const user = req.user;
    const userType = user.user_type || 'User';
    const userName = user.first_name || user.username || 'User';

    // Fetch relevant tournament and category data for context
    let tournamentsData = [];
    let categoriesData = [];
    
    try {
      // Get open and ongoing tournaments
      const tournaments = await Tournament.find({
        status: { $in: ['Open', 'Ongoing'] }
      }).select('tournament_name venue venue_address start_date end_date status').limit(10);
      
      tournamentsData = tournaments.map(t => ({
        name: t.tournament_name,
        venue: t.venue,
        venue_address: t.venue_address,
        start_date: t.start_date,
        end_date: t.end_date,
        status: t.status
      }));

      // Get categories with pricing and details
      const categories = await TournamentCategory.find()
        .populate('tournament_id', 'tournament_name venue')
        .select('category_name category_type participation_type age_category weight_category belt_category individual_player_fee team_event_fee tournament_id')
        .limit(20);
      
      categoriesData = categories.map(c => ({
        name: c.category_name,
        type: c.category_type,
        participation: c.participation_type,
        age_category: c.age_category,
        weight_category: c.weight_category,
        belt_category: c.belt_category,
        individual_fee: c.individual_player_fee || 0,
        team_fee: c.team_event_fee || 0,
        tournament: c.tournament_id?.tournament_name || 'Unknown'
      }));
    } catch (dbError) {
      console.error('Error fetching tournament data for bot:', dbError);
      // Continue without data - bot can still provide general information
    }

    // Create comprehensive knowledge base
    const knowledgeBase = `
KARATE TOURNAMENT KNOWLEDGE BASE:

1. EVENT PRICING:
- Individual events: Fees are set per category/event (individual_player_fee)
- Team events: Fees are set per team (team_event_fee)
- Payment is required before registration approval
- Current event prices in system:
${categoriesData.length > 0 ? categoriesData.map(c => `  - ${c.name} (${c.type}, ${c.participation}): Individual = ${c.individual_fee}, Team = ${c.team_fee}`).join('\n') : '  (No events currently available)'}

2. WEIGHT CLASSES:
- Weight categories vary by event and can be custom or WKF standard
- Common Kumite weight classes (WKF):
  * Cadets (14-15): -52kg, -57kg, -63kg, -70kg, -78kg, +78kg (Male); -47kg, -54kg, -61kg, +61kg (Female)
  * Juniors (16-17): -55kg, -61kg, -68kg, -76kg, +76kg (Male); -48kg, -53kg, -59kg, +59kg (Female)
  * U21 (18-20): -60kg, -67kg, -75kg, -84kg, +84kg (Male); -50kg, -55kg, -61kg, -68kg, +68kg (Female)
  * Seniors (21+): -60kg, -67kg, -75kg, -84kg, +84kg (Male); -50kg, -55kg, -61kg, -68kg, +68kg (Female)
- Current weight classes in system:
${categoriesData.filter(c => c.weight_category).map(c => `  - ${c.name}: ${c.weight_category}`).join('\n') || '  (Check specific events for weight class details)'}

3. AGE GROUPS/CLASSES:
- Age categories can be custom or follow WKF standards
- Common age categories:
  * Cadets: 14-15 years
  * Juniors: 16-17 years
  * U21: 18-20 years
  * Seniors: 21+ years
  * Veterans: 35+ years
- Current age categories in system:
${categoriesData.map(c => `  - ${c.name}: ${c.age_category}`).join('\n') || '  (Check specific events for age category details)'}

4. TOURNAMENT VENUES:
- Current tournament venues:
${tournamentsData.length > 0 ? tournamentsData.map(t => `  - ${t.name}: ${t.venue}, ${t.venue_address || 'Address not specified'}`).join('\n') : '  (No active tournaments currently)'}

5. BELT RANKS AND KYU DETAILS:
- Standard belt progression: White (10th-9th Kyu) → Yellow (8th-7th Kyu) → Orange (6th-5th Kyu) → Green (4th-3rd Kyu) → Blue (2nd-1st Kyu) → Brown (1st-3rd Dan preparation) → Black (1st Dan+)
- Kyu levels: 10th Kyu (beginner) down to 1st Kyu (highest kyu, before black belt)
- Dan levels: 1st Dan (Shodan) and above are black belt ranks
- Current belt requirements in system:
${categoriesData.filter(c => c.belt_category).map(c => `  - ${c.name}: ${c.belt_category}`).join('\n') || '  (Check specific events for belt requirements)'}

6. PAYMENT METHODS:
- Accepted payment methods: Card, Bank Transfer, Cash, PayHere (online payment gateway)
- PayHere is the primary online payment method
- Bank transfer details may be provided by tournament organizers
- Payment must be completed before registration approval

7. KATA SCORING CRITERIA:
- Each judge scores from 5.0 to 10.0
- Scoring components:
  * Technical Score (0-10): Technique, form, stances, transitions, timing
  * Performance Score (0-10): Power, speed, rhythm, kime (focus), breathing
- Final score: Average of all judges' scores (typically 3-5 judges)
- Highest and lowest scores may be dropped in some competitions
- Scoring scale: 5.0-5.9 (Below average), 6.0-6.9 (Average), 7.0-7.9 (Good), 8.0-8.9 (Very Good), 9.0-9.9 (Excellent), 10.0 (Perfect)

8. KUMITE SCORING CRITERIA:
- Points system:
  * Yuko (1 point): Valid punch to body or head
  * Waza-ari (2 points): Valid kick to body
  * Ippon (3 points): Valid kick to head, or opponent falls/knocked down
- Final score calculation: (Yuko × 1) + (Waza-ari × 2) + (Ippon × 3) - Penalty deductions
- Match duration: Typically 2-3 minutes for cadets/juniors, 3 minutes for seniors
- Win conditions: First to 8 points (ippon), or highest score at time end

9. PENALTY DETAILS (KUMITE):
- Chukoku (Warning): -0.5 points - Minor infractions (excessive contact, stepping out)
- Keikoku: -1.0 point - Repeated minor infractions
- Hansoku-chui: -1.5 points - Serious infractions (excessive contact, dangerous techniques)
- Hansoku (Disqualification): -2.0 points or match loss - Severe infractions or repeated serious violations
- Jogai (Stepping out): -0.25 points per occurrence - Stepping outside the competition area
- Penalties are cumulative and deducted from total points
- Two hansoku-chui = automatic hansoku (disqualification)
`;

    // Create a system prompt for the chatbot
    const systemPrompt = `You are a helpful AI assistant for the XpertKarate tournament management system. 
You help ${userType}s (${userName}) with questions about:
- Event prices and registration fees
- Weight classes and categories
- Age groups and age classifications
- Tournament venues and locations
- Belt ranks and Kyu details
- Payment methods and processes
- Scoring criteria for Kata competitions
- Scoring criteria for Kumite competitions
- Penalty details and rules
- Tournament registration and management
- Match schedules and results
- Player and team management
- General karate tournament information
- How to register for tournaments and events
- Understanding match results and scores
- Finding information about upcoming tournaments

${knowledgeBase}

IMPORTANT INSTRUCTIONS:
- Use the knowledge base above to provide accurate, specific information
- When asked about prices, weight classes, age groups, venues, or belt requirements, reference the current data from the system
- For scoring and penalty questions, provide detailed explanations based on the criteria above
- If specific tournament/event data is requested but not in the knowledge base, suggest checking the tournament details page
- Provide clear, concise, and helpful responses
- Format information in an easy-to-read manner (use bullet points, numbered lists when appropriate)
- If you don't know something specific, admit it and suggest where the user can find the information
- Keep responses friendly and professional`;

    try {
      const model = ai.getGenerativeModel({ model: 'gemini-pro' });
      
      const prompt = `${systemPrompt}

User Question: ${message}

Please provide a helpful, detailed response based on the knowledge base above:`;

      console.log('Sending prompt to Gemini AI...');
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let botResponse = response.text().trim();

      // Clean up the response
      botResponse = botResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Validate response
      if (!botResponse || botResponse.length === 0) {
        throw new Error('Empty response from AI');
      }
      
      console.log('Received response from Gemini AI, length:', botResponse.length);

      // Create a bot user ID (we'll use a special identifier)
      // In a real system, you might want to create a bot user in the database
      // For now, we'll use a special receiver_id pattern or store it differently
      // Since we need a receiver_id, let's create a message with the bot response stored in bot_response field

      // Save the conversation
      const chatMessage = await ChatMessage.create({
        sender_id: req.user._id,
        receiver_id: req.user._id, // Self-reference for bot conversations
        message: message,
        bot_response: botResponse,
        message_type: 'Text'
      });

      const populatedMessage = await ChatMessage.findById(chatMessage._id)
        .populate('sender_id', 'username first_name last_name profile_picture')
        .populate('receiver_id', 'username first_name last_name profile_picture');

      res.status(200).json({
        success: true,
        message: 'Bot response generated successfully',
        data: {
          ...populatedMessage.toObject(),
          bot_response: botResponse
        }
      });
    } catch (aiError) {
      console.error('Gemini AI error:', aiError);
      console.error('Error details:', {
        message: aiError.message,
        stack: aiError.stack,
        name: aiError.name
      });
      
      // Provide more specific error messages
      let fallbackResponse = "I'm sorry, I'm having trouble processing your request right now.";
      
      if (aiError.message?.includes('API_KEY') || aiError.message?.includes('401') || aiError.message?.includes('403')) {
        fallbackResponse = "The AI service is currently unavailable due to configuration issues. Please contact the administrator.";
      } else if (aiError.message?.includes('quota') || aiError.message?.includes('rate limit') || aiError.message?.includes('429')) {
        fallbackResponse = "The AI service is temporarily unavailable due to high demand. Please try again in a few moments.";
      } else if (aiError.message?.includes('Empty response')) {
        fallbackResponse = "I received an empty response. Please try rephrasing your question.";
      } else {
        // For other errors, use knowledge base to provide intelligent fallback responses
        const lowerMessage = message.toLowerCase();
        
        // Weight classes question
        if (lowerMessage.includes('weight') && (lowerMessage.includes('class') || lowerMessage.includes('category'))) {
          const weightClassesInfo = categoriesData.filter(c => c.weight_category).length > 0
            ? `\n\n**Current Weight Classes in System:**\n${categoriesData.filter(c => c.weight_category).map(c => `- ${c.name}: ${c.weight_category}`).join('\n')}`
            : '';
          
          fallbackResponse = `Weight Classes in Karate Tournaments:

**WKF Standard Kumite Weight Classes:**

**Cadets (14-15 years):**
- Male: -52kg, -57kg, -63kg, -70kg, -78kg, +78kg
- Female: -47kg, -54kg, -61kg, +61kg

**Juniors (16-17 years):**
- Male: -55kg, -61kg, -68kg, -76kg, +76kg
- Female: -48kg, -53kg, -59kg, +59kg

**U21 (18-20 years):**
- Male: -60kg, -67kg, -75kg, -84kg, +84kg
- Female: -50kg, -55kg, -61kg, -68kg, +68kg

**Seniors (21+ years):**
- Male: -60kg, -67kg, -75kg, -84kg, +84kg
- Female: -50kg, -55kg, -61kg, -68kg, +68kg

Weight categories can also be custom for specific tournaments.${weightClassesInfo}

Note: For tournament-specific weight classes, please check the event details in the tournament information.`;
        }
        // Age groups question
        else if (lowerMessage.includes('age') && (lowerMessage.includes('group') || lowerMessage.includes('class') || lowerMessage.includes('category'))) {
          const ageGroupsInfo = categoriesData.length > 0
            ? `\n\n**Current Age Categories in System:**\n${categoriesData.map(c => `- ${c.name}: ${c.age_category}`).join('\n')}`
            : '';
          
          fallbackResponse = `Age Groups/Classes in Karate Tournaments:

**Common Age Categories:**

- **Cadets**: 14-15 years
- **Juniors**: 16-17 years
- **U21 (Under 21)**: 18-20 years
- **Seniors**: 21+ years
- **Veterans**: 35+ years

Age categories can be custom for specific tournaments and may vary by event type (Kata, Kumite, Team events).${ageGroupsInfo}

Note: For tournament-specific age categories, please check the event details.`;
        }
        // Venues question
        else if (lowerMessage.includes('venue') || lowerMessage.includes('location') || lowerMessage.includes('where')) {
          const venuesInfo = tournamentsData.length > 0
            ? `\n\n**Current Tournament Venues:**\n${tournamentsData.map(t => `- **${t.name}**: ${t.venue}${t.venue_address ? `, ${t.venue_address}` : ''}`).join('\n')}`
            : '\n\n(No active tournaments currently available)';
          
          fallbackResponse = `Tournament Venues:${venuesInfo}

Note: Venue information is provided by tournament organizers. Check individual tournament details for specific addresses and directions.`;
        }
        // Event prices question
        else if (lowerMessage.includes('price') || lowerMessage.includes('fee') || lowerMessage.includes('cost')) {
          const pricesInfo = categoriesData.length > 0
            ? `\n\n**Current Event Prices:**\n${categoriesData.map(c => `- **${c.name}** (${c.type}, ${c.participation}):\n  * Individual: ${c.individual_fee > 0 ? `$${c.individual_fee}` : 'Free'}\n  * Team: ${c.team_fee > 0 ? `$${c.team_fee}` : 'Free'}`).join('\n')}`
            : '\n\n(No events currently available)';
          
          fallbackResponse = `Event Prices and Registration Fees:${pricesInfo}

**Payment Methods:**
- Card payments
- Bank Transfer
- Cash (at venue)
- PayHere (online payment gateway)

Payment must be completed before registration approval.`;
        }
        // Belt ranks/Kyu question
        else if (lowerMessage.includes('belt') || lowerMessage.includes('kyu') || lowerMessage.includes('rank')) {
          const beltInfo = categoriesData.filter(c => c.belt_category).length > 0
            ? `\n\n**Current Belt Requirements in System:**\n${categoriesData.filter(c => c.belt_category).map(c => `- ${c.name}: ${c.belt_category}`).join('\n')}`
            : '';
          
          fallbackResponse = `Belt Ranks and Kyu Details:

**Standard Belt Progression:**
- **White Belt**: 10th-9th Kyu (Beginner)
- **Yellow Belt**: 8th-7th Kyu
- **Orange Belt**: 6th-5th Kyu
- **Green Belt**: 4th-3rd Kyu
- **Blue Belt**: 2nd-1st Kyu
- **Brown Belt**: 1st-3rd Dan preparation
- **Black Belt**: 1st Dan (Shodan) and above

**Kyu Levels:**
- Kyu levels count down from 10th Kyu (beginner) to 1st Kyu (highest kyu, before black belt)
- 1st Kyu is the highest kyu rank before achieving black belt

**Dan Levels:**
- 1st Dan (Shodan) and above are black belt ranks
- Higher dans indicate advanced mastery${beltInfo}

Note: Belt requirements may vary by tournament and event. Check specific event details for requirements.`;
        }
        // Payment methods question
        else if (lowerMessage.includes('payment') && (lowerMessage.includes('method') || lowerMessage.includes('how to pay'))) {
          fallbackResponse = `Payment Methods:

**Accepted Payment Methods:**
1. **Card Payments**: Credit or debit card payments
2. **Bank Transfer**: Direct bank transfer (details provided by organizers)
3. **Cash**: Cash payments accepted at the tournament venue
4. **PayHere**: Online payment gateway for secure online transactions

**Payment Process:**
- Payment is required before registration approval
- You'll receive payment instructions after submitting your registration
- Payment confirmation is needed to finalize your registration

For specific payment details, check the tournament information or contact the tournament organizers.`;
        }
        // Kata scoring question
        else if (lowerMessage.includes('kata') && lowerMessage.includes('scoring')) {
          fallbackResponse = `Kata Scoring Criteria:

**Scoring Components:**
- **Technical Score (0-10)**: Evaluates technique, form, stances, transitions, and timing
- **Performance Score (0-10)**: Evaluates power, speed, rhythm, kime (focus), and breathing

**Scoring Scale:**
- **5.0-5.9**: Below average
- **6.0-6.9**: Average
- **7.0-7.9**: Good
- **8.0-8.9**: Very Good
- **9.0-9.9**: Excellent
- **10.0**: Perfect

**Final Score Calculation:**
- Each judge scores from 5.0 to 10.0
- Final score is the average of all judges' scores (typically 3-5 judges)
- Highest and lowest scores may be dropped in some competitions

**Evaluation Criteria:**
- Technical accuracy of techniques
- Proper stances and transitions
- Power and speed of execution
- Rhythm and timing
- Kime (focus) and breathing control`;
        }
        // Kumite scoring question
        else if (lowerMessage.includes('kumite') && (lowerMessage.includes('scoring') || lowerMessage.includes('penalty'))) {
          fallbackResponse = `Kumite Scoring and Penalties:

**Scoring Points:**
- Yuko (1 point): Valid punch to body or head
- Waza-ari (2 points): Valid kick to body  
- Ippon (3 points): Valid kick to head, or opponent falls/knocked down

**Penalties:**
- Chukoku (Warning): -0.5 points - Minor infractions
- Keikoku: -1.0 point - Repeated minor infractions
- Hansoku-chui: -1.5 points - Serious infractions
- Hansoku (Disqualification): -2.0 points or match loss
- Jogai: -0.25 points per occurrence - Stepping outside competition area

**Final Score:** (Yuko × 1) + (Waza-ari × 2) + (Ippon × 3) - Penalty deductions

Note: For tournament-specific rules, please check the tournament information page.`;
        }
        // General help or unknown question
        else {
          fallbackResponse = `I'm here to help with questions about:

• **Event Prices** - Registration fees for individual and team events
• **Weight Classes** - WKF standard and custom weight categories
• **Age Groups** - Age classifications (Cadets, Juniors, U21, Seniors, Veterans)
• **Tournament Venues** - Location and address information
• **Belt Ranks & Kyu** - Belt progression and requirements
• **Payment Methods** - How to pay for registrations
• **Kata Scoring** - Technical and performance scoring criteria
• **Kumite Scoring** - Point system and penalty details

Try asking about any of these topics! For example:
- "What are the weight classes?"
- "Explain Kata scoring criteria"
- "What are the payment methods?"

Note: The AI service is temporarily unavailable. For specific tournament details, please check the tournament information pages.`;
        }
      }
      
      const chatMessage = await ChatMessage.create({
        sender_id: req.user._id,
        receiver_id: req.user._id,
        message: message,
        bot_response: fallbackResponse,
        message_type: 'Text'
      });

      const populatedMessage = await ChatMessage.findById(chatMessage._id)
        .populate('sender_id', 'username first_name last_name profile_picture')
        .populate('receiver_id', 'username first_name last_name profile_picture');

      res.status(200).json({
        success: true,
        message: 'Bot response generated (fallback)',
        data: {
          ...populatedMessage.toObject(),
          bot_response: fallbackResponse
        }
      });
    }
  } catch (error) {
    console.error('Error in sendBotMessage:', error);
    next(error);
  }
};

module.exports = {
  getMessages,
  getMessage,
  sendMessage,
  updateMessage,
  deleteMessage,
  sendBotMessage
};

