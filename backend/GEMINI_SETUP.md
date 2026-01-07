# Google Gemini API Setup for Match Draw Generation

This system uses Google Gemini AI to intelligently generate tournament match draws with optimal bracket structures, seeding, and scheduling.

## Getting Your Gemini API Key

1. **Visit Google AI Studio**
   - Go to: https://makersuite.google.com/app/apikey
   - Or: https://aistudio.google.com/app/apikey

2. **Sign in with your Google Account**

3. **Create API Key**
   - Click "Create API Key"
   - Select or create a Google Cloud project
   - Copy the generated API key

4. **Add to Environment Variables**
   - Open `backend/.env` file
   - Add the following line:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

## Features

The Gemini AI integration provides:

- **Intelligent Bracket Generation**: Creates optimal bracket structures (single-elimination, double-elimination, or round-robin) based on participant count
- **Smart Seeding**: Distributes participants to avoid early matchups between top competitors from the same dojo
- **Fair Scheduling**: Generates match times and venue assignments
- **Dojo Distribution**: Considers dojo affiliations to create balanced brackets
- **Automatic Fallback**: If Gemini API is unavailable, the system automatically falls back to a simple bracket generation algorithm

## How It Works

1. **Organizer selects tournament and category**
2. **System collects all approved registrations** for that category
3. **Gemini AI analyzes participants** (names, belts, ages, dojos)
4. **AI generates optimal bracket structure** with:
   - Match pairings
   - Round levels (Preliminary, Quarterfinal, Semifinal, Final, Bronze)
   - Suggested match times
   - Venue area assignments
   - Seeding information
5. **System creates matches and participants** in the database
6. **Organizer can view and manage** the generated draws

## API Usage

The system uses the `gemini-pro` model. The API is called only when:
- Organizer clicks "Generate Draws" button
- Tournament has approved and paid registrations
- Category has valid participants

## Cost Considerations

- Google Gemini API has a free tier with generous limits
- Each draw generation uses approximately 1 API call
- Check current pricing at: https://ai.google.dev/pricing

## Troubleshooting

### "GEMINI_API_KEY is not configured"
- Add `GEMINI_API_KEY` to your `backend/.env` file
- Restart the backend server

### "Failed to parse Gemini response"
- The AI response format may have changed
- System will automatically fall back to simple bracket generation
- Check backend logs for details

### "Used fallback bracket generation"
- Gemini API may be unavailable or rate-limited
- Simple bracket generation will still create valid matches
- Try again later or check your API key

## Example .env Configuration

```env
MONGO_URI=mongodb://localhost:27017/xpertkarate
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## Security Notes

- **Never commit your API key** to version control
- Keep your `.env` file in `.gitignore`
- Rotate your API key if it's exposed
- Use environment-specific keys for production

