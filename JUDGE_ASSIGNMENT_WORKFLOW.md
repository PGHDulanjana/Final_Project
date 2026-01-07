# Judge Assignment Workflow

This document outlines the complete workflow after an organizer assigns judges to events in the XpertKarate tournament management system.

## Overview

The workflow follows this sequence:
1. **Organizer assigns judges to events** → 2. **Judges view assignments** → 3. **Judges confirm assignment** → 4. **Organizer generates match draws** → 5. **Judges score matches** → 6. **Results submission & approval**

---

## Step-by-Step Workflow

### Step 1: Organizer Assigns Judges to Events

**Who:** Organizer  
**Where:** Category Management / Event Setup  
**Action:** 
- Organizer selects an event (TournamentCategory)
- Creates or updates a Tatami for that event
- Assigns up to 5 judges to the event
- Each judge is assigned with a role (Head Judge, Judge, Referee, Timekeeper, Scorekeeper)

**Technical Details:**
- Endpoint: `POST /api/tatamis/:id/assign-judges`
- Judges are stored in `Tatami.assigned_judges[]` array
- Initial status: `is_confirmed: false`
- `assigned_at` timestamp is recorded

**Result:** Judges are assigned to the event but not yet confirmed.

---

### Step 2: Judges View Their Assignments

**Who:** Judge  
**Where:** Judge Dashboard → "Assigned Events" tab  
**Action:**
- Judge logs into their dashboard
- Navigates to "Assigned Events" tab
- Views all events they've been assigned to

**What Judges See:**
- Event name and tournament
- Event type (Kata, Kumite, etc.)
- Participation type (Individual, Team)
- Tatami number and location
- Their assigned role
- Confirmation status (Pending/Confirmed)
- Tournament dates

**Technical Details:**
- Endpoint: `GET /api/tatamis/judge/assigned-events`
- Returns all Tatamis where the judge is in `assigned_judges[]`
- Shows both confirmed and unconfirmed assignments

**Status:** Assignment visible but pending confirmation

---

### Step 3: Judge Confirms Assignment (Optional but Recommended)

**Who:** Judge  
**Where:** Judge Dashboard or Tatami Dashboard  
**Action:**
- Judge reviews the assignment details
- Clicks "Confirm Assignment" button
- Assignment status changes to confirmed

**Technical Details:**
- Endpoint: `POST /api/tatamis/:id/confirm-judge/:judgeId`
- Updates `is_confirmed: true`
- Records `confirmed_at` timestamp
- Judge can now access tatami dashboard for that event

**Why Important:**
- Confirmed judges are automatically assigned to matches when draws are generated
- Only confirmed judges appear in match assignments
- Organizer can see which judges have confirmed

**Status:** Assignment confirmed, ready for match generation

---

### Step 4: Organizer Generates Match Draws

**Who:** Organizer  
**Where:** Tatami Dashboard or Category Management  
**Action:**
- Organizer clicks "Generate Draws" for the event
- System creates matches based on registered participants
- Matches are automatically assigned to confirmed judges

**Technical Details:**
- Endpoint: `POST /api/matches/generate-draws`
- Service: `drawGenerationService.js`
- Process:
  1. Gets all approved registrations for the event
  2. Creates bracket structure (single-elimination, round-robin, etc.)
  3. Creates Match documents for each match
  4. Creates MatchParticipant documents
  5. **Automatically assigns confirmed judges to each match:**
     - Queries Tatami for `assigned_judges` where `is_confirmed: true`
     - Creates MatchJudge entries for each confirmed judge
     - Preserves judge role from Tatami assignment

**Key Point:** Only judges with `is_confirmed: true` are assigned to matches automatically.

**Result:** 
- Matches created with participants
- Confirmed judges automatically assigned to all matches in the event
- Matches appear in judge dashboard

---

### Step 5: Judges Score Matches

**Who:** Judge  
**Where:** Judge Dashboard → Scoring Panel  
**Action:**
- Judge views assigned matches (filtered by their assigned events)
- Selects a match to score
- Enters scores based on match type:
  - **Kata:** Technical score, Performance score
  - **Kumite:** Ippon, Waza-ari, penalties (Chukoku, Keikoku, Hansoku-chui, Hansoku, Jogai)
- Submits scores

**Technical Details:**
- Endpoint: `POST /api/scores`
- Score stored with:
  - `match_id`
  - `participant_id`
  - `judge_id`
  - Technical and performance scores
  - Kumite-specific points/penalties
  - Comments

**Match Status Flow:**
- `Scheduled` → `In Progress` (when scoring starts) → `Completed` (when all scores submitted)

**Result:** Scores recorded, match progresses toward completion

---

### Step 6: Results Submission & Approval

**Who:** Table Worker or Organizer  
**Where:** Tatami Dashboard  
**Action:**
- Once all matches in the event are completed
- Table worker or organizer clicks "Submit Results"
- System validates all matches are completed
- Results are locked and sent for organizer approval

**Technical Details:**
- Endpoint: `POST /api/tatamis/:id/submit-results`
- Validates: All matches have status `Completed`
- Updates Tatami:
  - `results_submitted: true`
  - `results_submitted_at: timestamp`
  - `status: 'Completed'`

**Who Can Submit:**
- Organizer of the tournament
- Table workers with granted access
- Admin

---

### Step 7: Organizer Approves Results

**Who:** Organizer  
**Where:** Tatami Dashboard or Organizer Dashboard  
**Action:**
- Organizer reviews submitted results
- Clicks "Approve Results"
- Results are finalized

**Technical Details:**
- Endpoint: `POST /api/tatamis/:id/approve-results`
- Updates Tatami:
  - `results_approved: true`
  - `results_approved_at: timestamp`
  - `results_approved_by: organizer_id`

**Result:** Event results are finalized and official

---

## Data Flow Diagram

```
Organizer
    ↓
Assigns Judges to Event (Tatami)
    ↓
Tatami.assigned_judges[] created
    ↓
Judge Dashboard
    ↓
Judge Views Assignment
    ↓
Judge Confirms Assignment (optional)
    ↓
is_confirmed: true
    ↓
Organizer Generates Draws
    ↓
Matches Created
    ↓
MatchJudge entries created (only for confirmed judges)
    ↓
Judge Scores Matches
    ↓
Scores Recorded
    ↓
All Matches Completed
    ↓
Results Submitted
    ↓
Results Approved
    ↓
Event Complete
```

---

## Key Models & Relationships

### Tatami Model
- `category_id`: The event (TournamentCategory)
- `assigned_judges[]`: Array of judge assignments
  - `judge_id`: Reference to Judge
  - `judge_role`: Role (Head Judge, Judge, etc.)
  - `is_confirmed`: Boolean
  - `confirmed_at`: Timestamp
  - `assigned_at`: Timestamp

### Match Model
- `category_id`: The event this match belongs to
- `status`: Scheduled → In Progress → Completed

### MatchJudge Model
- `match_id`: Reference to Match
- `judge_id`: Reference to Judge
- `judge_role`: Role from Tatami assignment
- `is_confirmed`: Usually true (inherited from Tatami)

### Score Model
- `match_id`: Reference to Match
- `judge_id`: Reference to Judge
- `participant_id`: Reference to MatchParticipant
- Technical and performance scores

---

## Important Notes

1. **Confirmation is Important:**
   - Only confirmed judges are automatically assigned to matches
   - Unconfirmed judges won't appear in match assignments
   - Judges should confirm as soon as possible

2. **Match Assignment:**
   - When draws are generated, ALL confirmed judges from the Tatami are assigned to ALL matches in that event
   - This ensures consistency - same judges judge all matches in an event

3. **Scoring:**
   - Judges can score matches from their assigned events
   - Multiple judges can score the same match
   - Final scores may be averaged or calculated based on all judge scores

4. **Access Control:**
   - Judges can only see events they're assigned to
   - Judges can only score matches from their assigned events
   - Table workers need explicit access granted by organizer

5. **Workflow Flexibility:**
   - Judges don't HAVE to confirm (but it's recommended)
   - Organizer can manually assign judges to matches if needed
   - Results can be submitted even if some judges haven't confirmed

---

## API Endpoints Reference

| Endpoint | Method | Who | Purpose |
|----------|--------|-----|---------|
| `/api/tatamis/:id/assign-judges` | POST | Organizer | Assign judges to event |
| `/api/tatamis/judge/assigned-events` | GET | Judge | Get all assigned events |
| `/api/tatamis/:id/confirm-judge/:judgeId` | POST | Judge | Confirm assignment |
| `/api/matches/generate-draws` | POST | Organizer | Generate matches and assign judges |
| `/api/scores` | POST | Judge | Submit score for match |
| `/api/tatamis/:id/submit-results` | POST | Table Worker/Organizer | Submit event results |
| `/api/tatamis/:id/approve-results` | POST | Organizer | Approve final results |

---

## Status Indicators

### Tatami Status
- `Setup`: Event setup, judges assigned
- `Active`: Event in progress, matches ongoing
- `Completed`: All matches done, results submitted
- `Closed`: Results approved, event finalized

### Judge Assignment Status
- `is_confirmed: false`: Pending confirmation
- `is_confirmed: true`: Confirmed and ready

### Match Status
- `Scheduled`: Match created, not started
- `In Progress`: Match ongoing, scoring in progress
- `Completed`: Match finished, all scores submitted

---

## Troubleshooting

**Q: Judge doesn't see matches after assignment?**
- Check if judge confirmed assignment (`is_confirmed: true`)
- Verify matches were generated for the event
- Check if matches belong to the assigned event category

**Q: Judges not assigned to matches after draw generation?**
- Only confirmed judges are auto-assigned
- Check `Tatami.assigned_judges[].is_confirmed`
- Manually assign via MatchJudge if needed

**Q: Can't submit results?**
- Verify all matches have status `Completed`
- Check user has table worker access or is organizer
- Ensure results haven't already been submitted

---

## Future Enhancements

Potential improvements to consider:
1. Email notifications when judges are assigned
2. Reminder notifications for unconfirmed assignments
3. Bulk confirmation for multiple events
4. Judge availability calendar
5. Automatic match scheduling based on judge availability
6. Real-time scoreboard updates during matches

