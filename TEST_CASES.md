# XpertKarate Tournament Management System - Test Cases

## Test Case Document

### Module 1: Authentication & User Management

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_AUTH_001 | User Registration - Player | None | 1. Navigate to registration page<br>2. Select user type as "Player"<br>3. Fill all required fields<br>4. Submit form | username: "player1", email: "player1@test.com", password: "Test123!", first_name: "John", last_name: "Doe", user_type: "Player", phone: "0712345678", date_of_birth: "2000-01-01", gender: "Male", belt_rank: "Brown", weight_category: "60kg", age_category: "Senior" | User account created successfully, redirected to login page, success message displayed |
| TC_AUTH_002 | User Registration - Coach | None | 1. Navigate to registration page<br>2. Select user type as "Coach"<br>3. Fill all required fields including coach-specific fields<br>4. Submit form | username: "coach1", email: "coach1@test.com", password: "Test123!", first_name: "Jane", last_name: "Smith", user_type: "Coach", certification_level: "Expert", experience_years: 10, specialization: ["Kata", "Kumite"], dojo_name: "Test Dojo" | User and coach profile created successfully, redirected to login page |
| TC_AUTH_003 | User Registration - Judge | None | 1. Navigate to registration page<br>2. Select user type as "Judge"<br>3. Fill all required fields<br>4. Submit form | username: "judge1", email: "judge1@test.com", password: "Test123!", first_name: "Bob", last_name: "Wilson", user_type: "Judge", certification_level: "Advanced", experience_years: 5 | User and judge profile created successfully |
| TC_AUTH_004 | User Registration - Organizer | None | 1. Navigate to registration page<br>2. Select user type as "Organizer"<br>3. Fill all required fields<br>4. Submit form | username: "org1", email: "org1@test.com", password: "Test123!", first_name: "Alice", last_name: "Brown", user_type: "Organizer", organization_name: "Test Org", license_number: "ORG123" | User and organizer profile created successfully |
| TC_AUTH_005 | User Registration - Admin (Should Fail) | None | 1. Navigate to registration page<br>2. Try to select user type as "Admin"<br>3. Submit form | user_type: "Admin" | Registration fails with error message "Admin accounts cannot be created through registration" |
| TC_AUTH_006 | User Registration - Duplicate Username | User with username "player1" already exists | 1. Navigate to registration page<br>2. Enter existing username<br>3. Fill other fields<br>4. Submit form | username: "player1" (existing), email: "new@test.com", password: "Test123!" | Registration fails with error "Username already exists" |
| TC_AUTH_007 | User Registration - Duplicate Email | User with email "player1@test.com" already exists | 1. Navigate to registration page<br>2. Enter existing email<br>3. Fill other fields<br>4. Submit form | username: "newuser", email: "player1@test.com" (existing), password: "Test123!" | Registration fails with error "Email already exists" |
| TC_AUTH_008 | User Registration - Invalid Email Format | None | 1. Navigate to registration page<br>2. Enter invalid email format<br>3. Submit form | email: "invalid-email" | Validation error displayed for email field |
| TC_AUTH_009 | User Registration - Weak Password | None | 1. Navigate to registration page<br>2. Enter weak password<br>3. Submit form | password: "123" | Password strength indicator shows weak, validation error displayed |
| TC_AUTH_010 | User Login - Valid Credentials | User account exists | 1. Navigate to login page<br>2. Enter valid username/email and password<br>3. Click Login | username: "player1", password: "Test123!" | User logged in successfully, redirected to appropriate dashboard based on user type |
| TC_AUTH_011 | User Login - Invalid Credentials | User account exists | 1. Navigate to login page<br>2. Enter invalid password<br>3. Click Login | username: "player1", password: "WrongPass" | Login fails with error "Invalid credentials" |
| TC_AUTH_012 | User Login - Non-existent User | None | 1. Navigate to login page<br>2. Enter non-existent username<br>3. Click Login | username: "nonexistent", password: "Test123!" | Login fails with error "Invalid credentials" |
| TC_AUTH_013 | Password Reset Request | User account exists | 1. Navigate to forgot password page<br>2. Enter registered email<br>3. Submit | email: "player1@test.com" | OTP sent to email, success message displayed |
| TC_AUTH_014 | Password Reset - Valid OTP | OTP sent to email | 1. Navigate to reset password page<br>2. Enter valid OTP and new password<br>3. Submit | otp: "123456", new_password: "NewPass123!" | Password reset successfully, user can login with new password |
| TC_AUTH_015 | Password Reset - Invalid OTP | OTP sent to email | 1. Navigate to reset password page<br>2. Enter invalid OTP<br>3. Submit | otp: "000000", new_password: "NewPass123!" | Password reset fails with error "Invalid or expired OTP" |
| TC_AUTH_016 | Password Reset - Expired OTP | OTP sent more than 10 minutes ago | 1. Navigate to reset password page<br>2. Enter expired OTP<br>3. Submit | otp: "123456" (expired), new_password: "NewPass123!" | Password reset fails with error "OTP expired" |

### Module 2: Tournament Management

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_TM_001 | Create Tournament - Valid Data | User logged in as Organizer | 1. Navigate to Organizer Dashboard<br>2. Click "Create Tournament"<br>3. Fill all required fields<br>4. Submit | tournament_name: "Test Tournament", start_date: "2026-06-01", end_date: "2026-06-03", venue: "Test Venue", venue_address: "123 Test St", registration_deadline: "2026-05-25", status: "Draft" | Tournament created successfully, appears in tournament list |
| TC_TM_002 | Create Tournament - Missing Required Fields | User logged in as Organizer | 1. Navigate to Create Tournament<br>2. Leave required fields empty<br>3. Submit | tournament_name: "", start_date: "", venue: "" | Validation errors displayed for missing fields |
| TC_TM_003 | Create Tournament - Invalid Date Range | User logged in as Organizer | 1. Navigate to Create Tournament<br>2. Enter end_date before start_date<br>3. Submit | start_date: "2026-06-03", end_date: "2026-06-01" | Validation error displayed "End date must be after start date" |
| TC_TM_004 | Create Tournament - Registration Deadline After Start Date | User logged in as Organizer | 1. Navigate to Create Tournament<br>2. Enter registration_deadline after start_date<br>3. Submit | start_date: "2026-06-01", registration_deadline: "2026-06-02" | Validation error displayed "Registration deadline must be before tournament start date" |
| TC_TM_005 | Create Tournament - Non-Organizer User | User logged in as Player | 1. Try to access create tournament endpoint<br>2. Submit tournament data | tournament_name: "Test Tournament" | Access denied with error "Only organizers can create tournaments" |
| TC_TM_006 | Update Tournament - Valid Data | Tournament exists, user is organizer | 1. Navigate to tournament details<br>2. Click Edit<br>3. Update fields<br>4. Save | tournament_name: "Updated Tournament Name", description: "Updated description" | Tournament updated successfully, changes reflected |
| TC_TM_007 | Update Tournament - Unauthorized User | Tournament exists, user is different organizer | 1. Login as different organizer<br>2. Try to update tournament<br>3. Submit changes | tournament_id: "existing_id", tournament_name: "Hacked Name" | Access denied with error "Not authorized to update this tournament" |
| TC_TM_008 | Update Tournament - Admin Override | Tournament exists, user is Admin | 1. Login as Admin<br>2. Navigate to tournament<br>3. Update tournament<br>4. Save | tournament_name: "Admin Updated Name" | Tournament updated successfully (Admin can update any tournament) |
| TC_TM_009 | Delete Tournament - Organizer | Tournament exists, no registrations | 1. Navigate to tournament details<br>2. Click Delete<br>3. Confirm deletion | tournament_id: "test_tournament_id" | Tournament deleted successfully |
| TC_TM_010 | Delete Tournament - Tournament with Registrations | Tournament exists with registrations | 1. Navigate to tournament details<br>2. Click Delete<br>3. Confirm deletion | tournament_id: "tournament_with_regs" | Deletion fails with error "Cannot delete tournament with existing registrations" |
| TC_TM_011 | View Tournament List - Organizer | User logged in as Organizer | 1. Navigate to Tournaments tab<br>2. View tournament list | None | All tournaments created by organizer displayed |
| TC_TM_012 | View Tournament List - Player | User logged in as Player | 1. Navigate to Tournaments tab<br>2. View tournament list | None | All open/ongoing tournaments displayed |
| TC_TM_013 | Filter Tournaments by Status | Tournaments exist with different statuses | 1. Navigate to tournaments page<br>2. Select status filter<br>3. View results | filter: "Open" | Only tournaments with "Open" status displayed |
| TC_TM_014 | Search Tournaments | Multiple tournaments exist | 1. Navigate to tournaments page<br>2. Enter search term<br>3. View results | search_term: "Test" | Only tournaments matching search term displayed |

### Module 3: Category/Event Management

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_CAT_001 | Create Category - Kata Event | Tournament exists, user is organizer | 1. Navigate to tournament<br>2. Click "Add Event"<br>3. Fill category details<br>4. Submit | category_name: "Kata Senior", category_type: "Kata", age_category: "Senior", belt_category: "Black Belt", participation_type: "Individual", individual_player_fee: 5000 | Category created successfully, appears in tournament events list |
| TC_CAT_002 | Create Category - Kumite Event | Tournament exists, user is organizer | 1. Navigate to tournament<br>2. Click "Add Event"<br>3. Fill category details<br>4. Submit | category_name: "Kumite Senior 60kg", category_type: "Kumite", age_category: "Senior", weight_category: "60kg", participation_type: "Individual", individual_player_fee: 5000 | Category created successfully |
| TC_CAT_003 | Create Category - Team Event | Tournament exists, user is organizer | 1. Navigate to tournament<br>2. Click "Add Event"<br>3. Select Team participation<br>4. Fill details<br>5. Submit | category_name: "Team Kata", category_type: "Team Kata", participation_type: "Team", team_size: 3, team_event_fee: 15000 | Category created successfully |
| TC_CAT_004 | Create Category - Missing Required Fields | Tournament exists | 1. Navigate to Add Event<br>2. Leave required fields empty<br>3. Submit | category_name: "", category_type: "" | Validation errors displayed |
| TC_CAT_005 | Create Category - Invalid Fee | Tournament exists | 1. Navigate to Add Event<br>2. Enter negative fee<br>3. Submit | individual_player_fee: -100 | Validation error displayed "Fee must be positive" |
| TC_CAT_006 | Update Category | Category exists | 1. Navigate to category<br>2. Click Edit<br>3. Update fee<br>4. Save | individual_player_fee: 6000 | Category updated successfully |
| TC_CAT_007 | Delete Category - No Registrations | Category exists, no registrations | 1. Navigate to category<br>2. Click Delete<br>3. Confirm | category_id: "test_category" | Category deleted successfully |
| TC_CAT_008 | Delete Category - With Registrations | Category exists with registrations | 1. Navigate to category<br>2. Click Delete<br>3. Confirm | category_id: "category_with_regs" | Deletion fails with error "Cannot delete category with existing registrations" |

### Module 4: Registration Management

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_REG_001 | Register Player for Tournament | Tournament and category exist, user is player | 1. Navigate to tournament<br>2. Select category<br>3. Click Register<br>4. Confirm | tournament_id: "test_tournament", category_id: "test_category" | Registration created with status "Pending", payment required |
| TC_REG_002 | Register Player - Duplicate Registration | Player already registered for category | 1. Navigate to tournament<br>2. Try to register for same category again<br>3. Submit | tournament_id: "existing", category_id: "existing" | Registration fails with error "Already registered for this event" |
| TC_REG_003 | Register Player - Tournament Closed | Tournament status is "Closed" | 1. Navigate to closed tournament<br>2. Try to register<br>3. Submit | tournament_id: "closed_tournament" | Registration fails with error "Tournament registration is closed" |
| TC_REG_004 | Register Player - After Deadline | Registration deadline passed | 1. Navigate to tournament<br>2. Try to register<br>3. Submit | tournament_id: "deadline_passed" | Registration fails with error "Registration deadline has passed" |
| TC_REG_005 | Register Coach for Tournament | Tournament exists, user is coach | 1. Navigate to tournament<br>2. Click Register as Coach<br>3. Confirm | tournament_id: "test_tournament" | Coach registration created (FREE), status "Approved" |
| TC_REG_006 | Register Judge for Tournament | Tournament exists, user is judge | 1. Navigate to tournament<br>2. Click Register as Judge<br>3. Confirm | tournament_id: "test_tournament" | Judge registration created (FREE), status "Approved" |
| TC_REG_007 | Approve Registration - Organizer | Registration exists with status "Pending" | 1. Navigate to Participants tab<br>2. Find pending registration<br>3. Click Approve | registration_id: "pending_reg" | Registration status changed to "Approved", notification sent to player |
| TC_REG_008 | Reject Registration - Organizer | Registration exists with status "Pending" | 1. Navigate to Participants tab<br>2. Find pending registration<br>3. Click Reject<br>4. Enter reason | registration_id: "pending_reg", reason: "Incomplete information" | Registration status changed to "Rejected", notification sent to player |
| TC_REG_009 | View Registrations - Player | User is player, has registrations | 1. Navigate to Player Dashboard<br>2. Click Registrations tab | None | All player's registrations displayed with status and payment info |
| TC_REG_010 | View Registrations - Coach | User is coach, players have registrations | 1. Navigate to Coach Dashboard<br>2. Click Registrations tab | None | All registrations for coach's players displayed |
| TC_REG_011 | Cancel Registration - Before Approval | Registration status is "Pending" | 1. Navigate to registration<br>2. Click Cancel<br>3. Confirm | registration_id: "pending_reg" | Registration cancelled successfully |
| TC_REG_012 | Cancel Registration - After Approval | Registration status is "Approved" | 1. Navigate to registration<br>2. Try to cancel | registration_id: "approved_reg" | Cancellation fails with error "Cannot cancel approved registration" |

### Module 5: Payment Processing

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_PAY_001 | Make Payment - PayHere Integration | Registration approved, payment pending | 1. Navigate to registration<br>2. Click "Make Payment"<br>3. Select PayHere<br>4. Complete payment | registration_id: "approved_reg", payment_method: "PayHere", amount: 5000 | Redirected to PayHere payment gateway, payment processed |
| TC_PAY_002 | Payment Success Callback | Payment completed on PayHere | 1. Complete payment on PayHere<br>2. Return to application | payment_id: "payhere_transaction_id", status: "success" | Payment status updated to "Completed", registration payment_status updated to "Paid" |
| TC_PAY_003 | Payment Failure | Payment failed on PayHere | 1. Attempt payment<br>2. Payment fails<br>3. Return to application | payment_id: "failed_transaction", status: "failed" | Payment status updated to "Failed", error message displayed |
| TC_PAY_004 | Payment Cancellation | User cancels payment | 1. Start payment process<br>2. Click Cancel<br>3. Return to application | payment_id: "cancelled_transaction" | Payment status updated to "Cancelled", user can retry payment |
| TC_PAY_005 | View Payment History - Player | User is player, has payments | 1. Navigate to Payments tab<br>2. View payment history | None | All player's payments displayed with status and details |
| TC_PAY_006 | View Payment History - Admin | User is admin | 1. Navigate to Admin Payments<br>2. View all payments | None | All system payments displayed with filters |
| TC_PAY_007 | Calculate Total Revenue - Admin | Payments exist | 1. Navigate to Admin Dashboard<br>2. View Total Revenue | None | Total revenue calculated from all completed payments displayed |
| TC_PAY_008 | Payment Refund - Admin | Payment exists with status "Completed" | 1. Navigate to payment details<br>2. Click Refund<br>3. Confirm | payment_id: "completed_payment" | Payment status updated to "Refunded", registration payment_status updated |

### Module 6: Match Draw Generation

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_DRAW_001 | Generate Match Draws - AI (Gemini) | Category has approved and paid registrations (min 2) | 1. Navigate to Match Draws<br>2. Select category<br>3. Click "Generate Draws"<br>4. Select AI option | category_id: "test_category", tournament_id: "test_tournament", useGemini: true | Matches generated using Gemini AI, bracket structure created |
| TC_DRAW_002 | Generate Match Draws - Fallback | Category has registrations, Gemini unavailable | 1. Navigate to Match Draws<br>2. Select category<br>3. Click "Generate Draws" | category_id: "test_category", useGemini: false | Matches generated using fallback algorithm, bracket created |
| TC_DRAW_003 | Generate Draws - Insufficient Participants | Category has less than 2 approved registrations | 1. Navigate to Match Draws<br>2. Select category<br>3. Try to generate draws | category_id: "insufficient_category" | Error displayed "Need at least 2 participants to generate draws" |
| TC_DRAW_004 | Generate Draws - No Paid Registrations | Category has approved but unpaid registrations | 1. Navigate to Match Draws<br>2. Select category<br>3. Try to generate draws | category_id: "unpaid_category" | Error displayed "All participants must have paid registration fees" |
| TC_DRAW_005 | View Match Draws - Organizer | Matches generated for category | 1. Navigate to Match Draws<br>2. Select category | category_id: "category_with_draws" | Match bracket displayed with all matches and participants |
| TC_DRAW_006 | View Match Draws - Player | Player registered for category, matches generated | 1. Navigate to Player Dashboard<br>2. Click "Match Draws" tab | None | Match draws for player's registered events displayed |
| TC_DRAW_007 | View Match Draws - Coach | Coach's players registered, matches generated | 1. Navigate to Coach Dashboard<br>2. Click "Kumite Match Draws" tab | None | Match draws for coach's players' events displayed |
| TC_DRAW_008 | Update Match Draw - Regenerate | Matches already generated | 1. Navigate to Match Draws<br>2. Click "Regenerate Draws"<br>3. Confirm | category_id: "existing_draws" | Old matches deleted, new draws generated |
| TC_DRAW_009 | Delete Match Draws | Matches generated, no scores submitted | 1. Navigate to Match Draws<br>2. Click "Delete Draws"<br>3. Confirm | category_id: "test_category" | All matches for category deleted successfully |
| TC_DRAW_010 | Delete Match Draws - With Scores | Matches have scores submitted | 1. Navigate to Match Draws<br>2. Try to delete draws | category_id: "scored_matches" | Deletion fails with error "Cannot delete matches with submitted scores" |

### Module 7: Kata Event Management

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_KATA_001 | Create Kata Round - First Round | Category is Kata type, registrations exist | 1. Navigate to Match Draws<br>2. Select Kata category<br>3. Click "Create Round"<br>4. Select "First Round"<br>5. Submit | category_id: "kata_category", round: "First Round" | Kata performances created for all registered players in First Round |
| TC_KATA_002 | Create Kata Round - Second Round (Final 8) | First Round completed | 1. Navigate to Kata Event Progression<br>2. Click "Create Second Round"<br>3. Select top 8 players<br>4. Submit | category_id: "kata_category", round: "Second Round (Final 8)", selected_players: [8 player IDs] | Second Round performances created for selected players |
| TC_KATA_003 | Create Kata Round - Third Round (Final 4) | Second Round completed | 1. Navigate to Kata Event Progression<br>2. Click "Create Third Round"<br>3. Select top 4 players<br>4. Submit | category_id: "kata_category", round: "Third Round (Final 4)", selected_players: [4 player IDs] | Third Round performances created for selected players |
| TC_KATA_004 | Submit Kata Score - Judge | Judge assigned to event, performance exists | 1. Navigate to Kata scoring<br>2. Select performance<br>3. Enter score<br>4. Submit | performance_id: "test_performance", judge_id: "test_judge", kata_score: 8.5 | Score submitted successfully, performance updated |
| TC_KATA_005 | Submit Kata Score - Invalid Range | Performance exists | 1. Navigate to Kata scoring<br>2. Enter score outside valid range<br>3. Submit | kata_score: 4.5 (below 5.0) | Validation error "Kata score must be between 5.0 and 10.0" |
| TC_KATA_006 | Submit Kata Score - All Judges | 5 judges assigned, performance exists | 1. All 5 judges submit scores<br>2. System calculates final score | scores: [8.5, 8.7, 8.6, 8.4, 8.8] | Final score calculated (average of all scores), performance marked as complete |
| TC_KATA_007 | View Kata Player Lists - Player | Player registered for Kata event | 1. Navigate to Player Dashboard<br>2. Click "Match Draws" tab | None | Kata event rounds displayed with player rankings |
| TC_KATA_008 | View Kata Player Lists - Coach | Coach's players registered for Kata | 1. Navigate to Coach Dashboard<br>2. Click "Kata Player Lists" tab | None | Kata rounds for coach's players displayed, coach's players highlighted |
| TC_KATA_009 | View Kata Player Lists - Judge | Judge assigned to Kata event | 1. Navigate to Judge Dashboard<br>2. Click "Kata Player Lists" tab | None | Kata rounds for assigned events displayed |
| TC_KATA_010 | Auto-refresh Kata Lists | Kata performances exist | 1. View Kata Player Lists<br>2. Wait 30 seconds | None | Page automatically refreshes, updated scores displayed |
| TC_KATA_011 | Calculate Final Score - All Judges Scored | 5 judges submitted scores | 1. System calculates final score automatically | performance_id: "test_performance" | Final score = average of 5 scores, displayed in player list |
| TC_KATA_012 | Assign Rankings - Final 4 Round | Third Round completed, all scores submitted | 1. Navigate to Final 4 round<br>2. Click "Assign Rankings"<br>3. Assign places 1-4 | places: {player1: 1, player2: 2, player3: 3, player4: 4} | Rankings assigned, displayed in results |

### Module 8: Kumite Match Scoring

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_KUMITE_001 | Submit Kumite Score - Valid Points | Match exists, judge assigned | 1. Navigate to match scoring<br>2. Enter points for participant<br>3. Submit | match_id: "test_match", participant_id: "p1", judge_id: "judge1", yuko: 2, waza_ari: 1, ippon: 0, penalties: {chukoku: 1} | Score calculated and submitted, technical_score = (2*1 + 1*2 + 0*3) - (1*0.5) = 3.5 |
| TC_KUMITE_002 | Submit Kumite Score - Ippon Win | Match exists | 1. Navigate to match scoring<br>2. Enter Ippon for participant<br>3. Submit | ippon: 1 | Score submitted, match can be marked as completed with winner |
| TC_KUMITE_003 | Submit Kumite Score - All Judges | Match has 3 judges assigned | 1. All 3 judges submit scores<br>2. System calculates winner | scores: [judge1: 5.5, judge2: 6.0, judge3: 5.8] | Winner determined by highest average score, match status updated to "Completed" |
| TC_KUMITE_004 | Submit Kumite Score - Invalid Penalties | Match exists | 1. Navigate to scoring<br>2. Enter excessive penalties<br>3. Submit | hansoku: 2 (should be max 1) | Validation error displayed |
| TC_KUMITE_005 | Complete Match - Declare Winner | All judges submitted scores | 1. Navigate to match<br>2. Click "Complete Match"<br>3. Select winner | match_id: "test_match", winner_id: "player1" | Match status updated to "Completed", winner_id set, next round match updated |
| TC_KUMITE_006 | View Match Draws - Kumite | Matches generated for Kumite category | 1. Navigate to Match Draws<br>2. Select Kumite category | category_id: "kumite_category" | Bracket visualization displayed with all matches |
| TC_KUMITE_007 | View Match Draws - Player | Player registered for Kumite | 1. Navigate to Player Dashboard<br>2. Click "Match Draws" tab | None | Kumite match draws for player's events displayed |
| TC_KUMITE_008 | View Match Draws - Coach | Coach's players in Kumite | 1. Navigate to Coach Dashboard<br>2. Click "Kumite Match Draws" tab | None | Kumite draws for coach's players displayed |
| TC_KUMITE_009 | Update Match Status - Scheduled to In Progress | Match exists | 1. Navigate to match<br>2. Click "Start Match" | match_id: "test_match" | Match status updated to "In Progress" |
| TC_KUMITE_010 | Update Match Status - In Progress to Completed | Match in progress, scores submitted | 1. Navigate to match<br>2. Click "Complete Match"<br>3. Select winner | match_id: "in_progress_match", winner_id: "player1" | Match status updated to "Completed" |

### Module 9: Judge Assignment & Management

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_JUDGE_001 | Assign Judge to Event - Organizer | Tournament and category exist, judge registered | 1. Navigate to Participants<br>2. Select Judges tab<br>3. Select judge<br>4. Assign to event | category_id: "test_category", judge_id: "test_judge" | Judge assigned to event via Tatami, notification sent to judge |
| TC_JUDGE_002 | Confirm Judge Assignment | Judge assigned to event | 1. Judge receives notification<br>2. Navigate to Assigned Events<br>3. Click "Confirm" | tatami_id: "test_tatami", judge_id: "test_judge" | Assignment confirmed, judge will be auto-assigned to matches |
| TC_JUDGE_003 | Auto-assign Judges to Matches | Judge confirmed assignment, matches generated | 1. Generate match draws<br>2. System auto-assigns judges | category_id: "test_category" | All matches for category assigned to confirmed judges |
| TC_JUDGE_004 | View Assigned Events - Judge | Judge has assignments | 1. Navigate to Judge Dashboard<br>2. Click "Assigned Events" tab | None | All assigned events displayed with confirmation status |
| TC_JUDGE_005 | View Assigned Matches - Judge | Judge assigned to matches | 1. Navigate to Active Matches<br>2. View matches | None | All matches assigned to judge displayed |
| TC_JUDGE_006 | Remove Judge Assignment | Judge assigned to event | 1. Navigate to event<br>2. Click "Remove Judge"<br>3. Confirm | judge_id: "test_judge", category_id: "test_category" | Judge assignment removed, notification sent |

### Module 10: Dashboard Features

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_DASH_001 | View Admin Dashboard | User logged in as Admin | 1. Navigate to /admin/dashboard | None | Dashboard displays total revenue, user counts, payment statistics |
| TC_DASH_002 | View Organizer Dashboard | User logged in as Organizer | 1. Navigate to /organizer/dashboard | None | Dashboard displays tournaments, registrations, match statistics |
| TC_DASH_003 | View Player Dashboard | User logged in as Player | 1. Navigate to /player/dashboard | None | Dashboard displays registrations, match draws, results |
| TC_DASH_004 | View Coach Dashboard | User logged in as Coach | 1. Navigate to /coach/dashboard | None | Dashboard displays players, registrations, Kata/Kumite draws |
| TC_DASH_005 | View Judge Dashboard | User logged in as Judge | 1. Navigate to /judge/dashboard | None | Dashboard displays assigned events, matches, Kata/Kumite draws |
| TC_DASH_006 | Dashboard Auto-refresh | Dashboard loaded | 1. View dashboard<br>2. Wait for auto-refresh interval | None | Data automatically refreshes every 30 seconds |
| TC_DASH_007 | Manual Refresh - Dashboard | Dashboard loaded | 1. Click Refresh button | None | Data refreshed immediately, loading indicator shown |
| TC_DASH_008 | View Statistics Cards | Dashboard loaded | 1. View Overview tab | None | Statistics cards display correct counts and data |
| TC_DASH_009 | Navigate Between Tabs | Dashboard loaded | 1. Click different tabs | tab_id: "tournaments" | Tab content changes, active tab highlighted |
| TC_DASH_010 | View Empty States | No data available | 1. Navigate to empty section | None | Appropriate empty state message displayed |

### Module 11: Notifications

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_NOTIF_001 | Send Registration Notification | Registration created | 1. Player registers for tournament | registration_id: "test_reg" | Notification sent to organizer for approval |
| TC_NOTIF_002 | Send Approval Notification | Registration approved | 1. Organizer approves registration | registration_id: "pending_reg" | Notification sent to player about approval |
| TC_NOTIF_003 | Send Payment Reminder | Registration approved, payment pending | 1. System checks pending payments<br>2. Sends reminder | registration_id: "approved_unpaid" | Notification sent to player to complete payment |
| TC_NOTIF_004 | Send Match Assignment Notification | Judge assigned to match | 1. Match assigned to judge | match_id: "test_match", judge_id: "test_judge" | Notification sent to judge about match assignment |
| TC_NOTIF_005 | View Notifications - All Roles | User has notifications | 1. Navigate to Notifications tab | None | All user's notifications displayed with read/unread status |
| TC_NOTIF_006 | Mark Notification as Read | Notification exists | 1. Click on notification | notification_id: "test_notif" | Notification marked as read, unread count updated |
| TC_NOTIF_007 | Delete Notification | Notification exists | 1. Click delete on notification<br>2. Confirm | notification_id: "test_notif" | Notification deleted successfully |
| TC_NOTIF_008 | Real-time Notification | Socket connection active | 1. New notification created<br>2. User online | notification_data: {...} | Notification appears in real-time without page refresh |

### Module 12: Reports

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_REPORT_001 | Generate Kata Report | Kata event completed | 1. Navigate to Match Draws<br>2. Select Kata category<br>3. Click "Generate Report" | category_id: "completed_kata_category" | Kata report generated with all rounds, scores, and rankings |
| TC_REPORT_002 | Generate Kumite Report | Kumite event completed | 1. Navigate to Match Draws<br>2. Select Kumite category<br>3. Click "Generate Report" | category_id: "completed_kumite_category" | Kumite report generated with match results and winners |
| TC_REPORT_003 | View Kata Report | Report generated | 1. Navigate to report view<br>2. View report | report_id: "kata_report" | Report displayed with all performance data, scores, rankings |
| TC_REPORT_004 | View Kumite Report | Report generated | 1. Navigate to report view<br>2. View report | report_id: "kumite_report" | Report displayed with match results, bracket, winners |
| TC_REPORT_005 | Download Report as PDF | Report exists | 1. View report<br>2. Click "Download PDF" | report_id: "test_report" | PDF file generated and downloaded |
| TC_REPORT_006 | Export Report Data | Report exists | 1. View report<br>2. Click "Export" | report_id: "test_report", format: "CSV" | Data exported in requested format |

### Module 13: User Profile Management

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_PROF_001 | Update User Profile | User logged in | 1. Navigate to Profile<br>2. Edit fields<br>3. Save | first_name: "Updated Name", phone: "0711111111" | Profile updated successfully |
| TC_PROF_002 | Upload Profile Picture | User logged in | 1. Navigate to Profile<br>2. Click Upload Picture<br>3. Select image<br>4. Save | image_file: "profile.jpg" | Profile picture uploaded and displayed |
| TC_PROF_003 | Update Player Profile | User is player | 1. Navigate to Player Profile<br>2. Update player-specific fields<br>3. Save | belt_rank: "Black Belt", weight_category: "65kg" | Player profile updated |
| TC_PROF_004 | Update Coach Profile | User is coach | 1. Navigate to Coach Profile<br>2. Update coach-specific fields<br>3. Save | certification_level: "Master", experience_years: 15 | Coach profile updated |
| TC_PROF_005 | Change Password | User logged in | 1. Navigate to Profile<br>2. Click Change Password<br>3. Enter old and new password<br>4. Save | old_password: "OldPass123", new_password: "NewPass123" | Password changed successfully |
| TC_PROF_006 | Change Password - Wrong Old Password | User logged in | 1. Navigate to Change Password<br>2. Enter wrong old password<br>3. Submit | old_password: "WrongPass", new_password: "NewPass123" | Error displayed "Current password is incorrect" |

### Module 14: Security & Authorization

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_SEC_001 | Access Admin Route - Non-Admin | User logged in as Player | 1. Try to access /admin/dashboard | None | Access denied, redirected to unauthorized page |
| TC_SEC_002 | Access Organizer Route - Non-Organizer | User logged in as Player | 1. Try to access /organizer/dashboard | None | Access denied with 403 error |
| TC_SEC_003 | Access Protected Route - Unauthenticated | User not logged in | 1. Try to access /player/dashboard | None | Redirected to login page |
| TC_SEC_004 | Session Timeout | User logged in, session expired | 1. Wait for session timeout<br>2. Try to perform action | None | Session expired, user logged out, redirected to login |
| TC_SEC_005 | CSRF Protection | User logged in | 1. Try to submit form without CSRF token | form_data: {...} | Request rejected with CSRF error |
| TC_SEC_006 | SQL Injection Attempt | User logged in | 1. Enter SQL injection in search field<br>2. Submit | search: "'; DROP TABLE users; --" | Input sanitized, no database damage |
| TC_SEC_007 | XSS Attack Attempt | User logged in | 1. Enter script tag in input field<br>2. Submit | input: "<script>alert('XSS')</script>" | Input sanitized, script not executed |
| TC_SEC_008 | Password Hashing | User registers | 1. Register new user<br>2. Check database | password: "Test123!" | Password stored as hash, not plain text |

### Module 15: Performance & Load Testing

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_PERF_001 | Load Dashboard - Normal Load | System running | 1. Navigate to dashboard<br>2. Measure load time | None | Dashboard loads within 2 seconds |
| TC_PERF_002 | Load Dashboard - High Data Volume | 1000+ records exist | 1. Navigate to dashboard<br>2. Measure load time | None | Dashboard loads within 5 seconds with pagination |
| TC_PERF_003 | Generate Draws - Large Tournament | 100+ participants | 1. Generate match draws<br>2. Measure generation time | participants: 100 | Draws generated within 30 seconds |
| TC_PERF_004 | Concurrent User Login | Multiple users | 1. 50 users login simultaneously | 50 concurrent logins | All logins processed successfully |
| TC_PERF_005 | Real-time Updates - Socket Performance | Multiple users online | 1. 10 users viewing same match<br>2. Update match status | match_id: "test_match" | All users receive update within 1 second |

### Module 16: Integration Testing

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_INT_001 | Complete Registration Flow | Tournament and category exist | 1. Player registers<br>2. Organizer approves<br>3. Player pays<br>4. Draws generated | Full registration flow | Player appears in match draws |
| TC_INT_002 | Complete Match Flow - Kumite | Match created, judges assigned | 1. Start match<br>2. Judges submit scores<br>3. Complete match<br>4. Declare winner | match_id: "test_match" | Match completed, winner declared, next round updated |
| TC_INT_003 | Complete Kata Flow | Kata round created | 1. Create round<br>2. Judges score performances<br>3. Calculate final scores<br>4. Advance to next round | category_id: "kata_category" | Round completed, next round created with top performers |
| TC_INT_004 | Payment Integration - PayHere | Registration approved | 1. Initiate payment<br>2. Complete on PayHere<br>3. Return to app | registration_id: "approved_reg" | Payment status updated, registration marked as paid |
| TC_INT_005 | Email Notification Integration | Registration created | 1. Create registration<br>2. Check email service | registration_id: "test_reg" | Email sent to organizer with registration details |

### Module 17: UI/UX Testing

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_UI_001 | Responsive Design - Mobile | Application loaded | 1. View on mobile device (375px width) | screen_width: 375px | All elements properly displayed, no horizontal scroll |
| TC_UI_002 | Responsive Design - Tablet | Application loaded | 1. View on tablet (768px width) | screen_width: 768px | Layout adapts to tablet size |
| TC_UI_003 | Responsive Design - Desktop | Application loaded | 1. View on desktop (1920px width) | screen_width: 1920px | Full layout displayed with optimal spacing |
| TC_UI_004 | Navigation - Sidebar | User logged in | 1. Click sidebar navigation items | nav_item: "Dashboard" | Correct page loaded, active item highlighted |
| TC_UI_005 | Form Validation - Real-time | Form displayed | 1. Enter invalid data in field<br>2. Move to next field | email: "invalid" | Validation error displayed immediately |
| TC_UI_006 | Loading States | Action triggered | 1. Perform action that takes time<br>2. Observe UI | action: "Generate Draws" | Loading spinner/indicator displayed |
| TC_UI_007 | Error Messages | Error occurs | 1. Trigger error condition | invalid_action | Clear, user-friendly error message displayed |
| TC_UI_008 | Success Messages | Action succeeds | 1. Complete successful action | action: "Registration" | Success toast/notification displayed |
| TC_UI_009 | Empty States | No data available | 1. Navigate to empty section | None | Appropriate empty state with helpful message |
| TC_UI_010 | Accessibility - Keyboard Navigation | Application loaded | 1. Navigate using only keyboard (Tab, Enter) | None | All interactive elements accessible via keyboard |

### Module 18: Data Validation

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_VAL_001 | Email Validation | Registration form | 1. Enter invalid email format<br>2. Submit | email: "notanemail" | Validation error "Please enter a valid email" |
| TC_VAL_002 | Phone Number Validation | Registration form | 1. Enter invalid phone<br>2. Submit | phone: "123" | Validation error "Please enter a valid phone number" |
| TC_VAL_003 | Date Validation - Past Dates | Tournament creation | 1. Enter past start date<br>2. Submit | start_date: "2020-01-01" | Validation error "Start date must be in the future" |
| TC_VAL_004 | Number Validation - Negative | Fee input | 1. Enter negative fee<br>2. Submit | fee: -100 | Validation error "Fee must be positive" |
| TC_VAL_005 | Required Field Validation | Any form | 1. Leave required field empty<br>2. Submit | field: "" | Validation error displayed for required field |
| TC_VAL_006 | String Length Validation | Tournament name | 1. Enter name > 200 characters<br>2. Submit | name: "A" * 201 | Validation error "Name must be less than 200 characters" |
| TC_VAL_007 | Enum Validation - User Type | Registration | 1. Enter invalid user_type<br>2. Submit | user_type: "InvalidType" | Validation error "User type must be one of: Player, Coach, Judge, Organizer" |
| TC_VAL_008 | Score Range Validation - Kata | Kata scoring | 1. Enter score outside 5.0-10.0<br>2. Submit | kata_score: 11.0 | Validation error "Kata score must be between 5.0 and 10.0" |

### Module 19: Edge Cases & Error Handling

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_EDGE_001 | Delete Tournament - With Active Matches | Tournament has matches in progress | 1. Try to delete tournament<br>2. Confirm | tournament_id: "active_tournament" | Deletion prevented with error "Cannot delete tournament with active matches" |
| TC_EDGE_002 | Generate Draws - Odd Number of Participants | Category has odd number of registrations | 1. Generate draws<br>2. Check bracket | participants: 7 | Bye match created for odd participant |
| TC_EDGE_003 | Score Submission - Duplicate Judge Score | Judge already submitted score | 1. Try to submit score again<br>2. Submit | judge_id: "existing_judge", performance_id: "scored_performance" | Score updated (not duplicated) or error "Score already submitted" |
| TC_EDGE_004 | Payment - Network Failure | Payment in progress | 1. Network disconnects during payment<br>2. Reconnect | payment_id: "in_progress" | Payment status checked, user can retry if failed |
| TC_EDGE_005 | Concurrent Score Submission | Multiple judges submit simultaneously | 1. 3 judges submit scores at same time<br>2. Check results | match_id: "test_match" | All scores saved correctly, no data loss |
| TC_EDGE_006 | Large File Upload - Profile Picture | User uploading picture | 1. Upload file > 5MB<br>2. Submit | file_size: 6MB | Error "File size must be less than 5MB" |
| TC_EDGE_007 | Special Characters in Input | Any text input | 1. Enter special characters<br>2. Submit | name: "Test & <Special> Characters" | Input sanitized and saved correctly |
| TC_EDGE_008 | Very Long Tournament Name | Tournament creation | 1. Enter name at max length<br>2. Submit | name: "A" * 200 | Tournament created successfully |
| TC_EDGE_009 | Timezone Handling | User in different timezone | 1. Create tournament with dates<br>2. View in different timezone | start_date: "2026-06-01T00:00:00Z" | Dates displayed correctly in user's timezone |
| TC_EDGE_010 | Database Connection Loss | Application running | 1. Disconnect database<br>2. Try to perform action | action: "Create Tournament" | Graceful error handling, user-friendly error message |

### Module 20: Real-time Features

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_RT_001 | Real-time Score Updates | Multiple users viewing match | 1. Judge submits score<br>2. Other users viewing match | match_id: "test_match" | All users see updated score immediately |
| TC_RT_002 | Real-time Match Status Updates | Users viewing match | 1. Organizer updates match status<br>2. Users viewing match | status: "In Progress" | All users see status update immediately |
| TC_RT_003 | Real-time Notification Delivery | User online | 1. New notification created<br>2. User has page open | notification: {...} | Notification appears in real-time |
| TC_RT_004 | Socket Reconnection | Connection lost | 1. Network disconnects<br>2. Network reconnects | None | Socket automatically reconnects, data syncs |
| TC_RT_005 | Multiple Tab Synchronization | User has multiple tabs open | 1. Update data in one tab<br>2. Check other tabs | action: "Update Profile" | All tabs reflect changes |

### Module 21: Chat & Chatbot Features

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_CHAT_001 | Send Chat Message - User to User | Two users logged in | 1. Navigate to chat<br>2. Select receiver<br>3. Type message<br>4. Send | receiver_id: "user2", message: "Hello" | Message sent successfully, appears in chat history |
| TC_CHAT_002 | Send Bot Message - Valid Question | User logged in | 1. Open chatbot<br>2. Type question<br>3. Send | message: "What are the tournament fees?" | AI response received with relevant information |
| TC_CHAT_003 | Send Bot Message - Tournament Info | Tournaments exist | 1. Open chatbot<br>2. Ask about tournament<br>3. Send | message: "Tell me about upcoming tournaments" | AI response includes tournament details from system |
| TC_CHAT_004 | Send Bot Message - Scoring Questions | User logged in | 1. Open chatbot<br>2. Ask about scoring<br>3. Send | message: "How is Kata scored?" | AI response explains Kata scoring criteria |
| TC_CHAT_005 | Send Bot Message - AI Service Unavailable | Gemini API not configured | 1. Open chatbot<br>2. Send message | message: "Hello" | Error message "AI service is not available" |
| TC_CHAT_006 | View Chat History | User has sent/received messages | 1. Navigate to chat<br>2. View message history | None | All messages displayed in chronological order |
| TC_CHAT_007 | Delete Chat Message | Message exists | 1. Navigate to message<br>2. Click Delete<br>3. Confirm | message_id: "test_message" | Message deleted successfully |
| TC_CHAT_008 | Update Chat Message | Message exists | 1. Navigate to message<br>2. Click Edit<br>3. Update text<br>4. Save | message_id: "test_message", new_text: "Updated message" | Message updated successfully |
| TC_CHAT_009 | Chat Message - Empty Message | User in chat | 1. Try to send empty message<br>2. Submit | message: "" | Validation error "Message is required" |
| TC_CHAT_010 | Chat Message - Long Message | User in chat | 1. Enter message > 2000 characters<br>2. Submit | message: "A" * 2001 | Validation error "Message must be less than 2000 characters" |

### Module 22: Dojo Management

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_DOJO_001 | Create Dojo - Coach | User logged in as Coach | 1. Navigate to Coach Dashboard<br>2. Click "My Dojos"<br>3. Click "Create Dojo"<br>4. Fill details<br>5. Submit | dojo_name: "Test Dojo", address: {street: "123 St", city: "Colombo"}, phone: "0712345678" | Dojo created successfully, appears in dojo list |
| TC_DOJO_002 | Create Dojo - Missing Required Fields | User is coach | 1. Navigate to Create Dojo<br>2. Leave dojo_name empty<br>3. Submit | dojo_name: "" | Validation error displayed |
| TC_DOJO_003 | Update Dojo | Dojo exists, user is owner | 1. Navigate to dojo<br>2. Click Edit<br>3. Update details<br>4. Save | dojo_name: "Updated Dojo Name", phone: "0711111111" | Dojo updated successfully |
| TC_DOJO_004 | Update Dojo - Unauthorized | Dojo exists, user is different coach | 1. Login as different coach<br>2. Try to update dojo | dojo_id: "other_coach_dojo" | Access denied with error "Not authorized" |
| TC_DOJO_005 | View Dojo List - Coach | User is coach, has dojos | 1. Navigate to My Dojos tab | None | All coach's dojos displayed |
| TC_DOJO_006 | Delete Dojo - No Players | Dojo exists, no players assigned | 1. Navigate to dojo<br>2. Click Delete<br>3. Confirm | dojo_id: "empty_dojo" | Dojo deleted successfully |
| TC_DOJO_007 | Delete Dojo - With Players | Dojo has players assigned | 1. Navigate to dojo<br>2. Try to delete | dojo_id: "dojo_with_players" | Deletion fails with error "Cannot delete dojo with assigned players" |

### Module 23: Admin User Management

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_ADMIN_001 | View All Users - Admin | User logged in as Admin | 1. Navigate to User Management<br>2. View users list | None | All system users displayed with filters |
| TC_ADMIN_002 | Filter Users by Role | Users exist with different roles | 1. Navigate to User Management<br>2. Select role filter<br>3. View results | filter: "Player" | Only players displayed |
| TC_ADMIN_003 | Search Users | Multiple users exist | 1. Navigate to User Management<br>2. Enter search term<br>3. View results | search_term: "John" | Only users matching search displayed |
| TC_ADMIN_004 | Activate User | User exists, is inactive | 1. Navigate to user<br>2. Click Activate | user_id: "inactive_user" | User status updated to active |
| TC_ADMIN_005 | Deactivate User | User exists, is active | 1. Navigate to user<br>2. Click Deactivate<br>3. Confirm | user_id: "active_user" | User status updated to inactive, cannot login |
| TC_ADMIN_006 | Create Admin User - Script | Admin script available | 1. Run createAdmin.js script<br>2. Provide credentials | username: "admin", email: "admin@test.com", password: "Admin123!" | Admin user created successfully |
| TC_ADMIN_007 | View User Details | User exists | 1. Navigate to user<br>2. View details | user_id: "test_user" | Complete user profile displayed |
| TC_ADMIN_008 | View Analytics Dashboard | User is admin | 1. Navigate to Analytics<br>2. View charts | None | Revenue charts, user statistics, tournament stats displayed |

### Module 24: Schedule Management

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_SCHED_001 | View Schedule - Player | Player has matches | 1. Navigate to Player Schedule<br>2. View calendar | None | Player's matches displayed on calendar |
| TC_SCHED_002 | View Schedule - Judge | Judge has assigned matches | 1. Navigate to Judge Schedule<br>2. View calendar | None | Judge's assigned matches displayed |
| TC_SCHED_003 | View Schedule - Coach | Coach's players have matches | 1. Navigate to Coach Schedule<br>2. View calendar | None | Matches for coach's players displayed |
| TC_SCHED_004 | Filter Schedule by Status | Matches exist with different statuses | 1. Navigate to schedule<br>2. Select status filter | filter: "Scheduled" | Only scheduled matches displayed |
| TC_SCHED_005 | View Schedule - Month View | Schedule page loaded | 1. Navigate to schedule<br>2. Select month view | view: "month" | Calendar displays month view with matches |
| TC_SCHED_006 | View Schedule - Week View | Schedule page loaded | 1. Navigate to schedule<br>2. Select week view | view: "week" | Calendar displays week view with matches |
| TC_SCHED_007 | View Schedule - Day View | Schedule page loaded | 1. Navigate to schedule<br>2. Select day view | view: "day" | Calendar displays day view with matches |
| TC_SCHED_008 | Navigate Calendar Dates | Schedule page loaded | 1. Click next/previous month<br>2. View matches | direction: "next" | Calendar navigates to next month, matches displayed |

### Module 25: Results & Performance Tracking

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_RES_001 | View Player Results | Player has completed matches | 1. Navigate to Player Dashboard<br>2. Click "My Results" | None | All player's match results displayed |
| TC_RES_002 | View Player Performance | Player has matches and scores | 1. Navigate to Performance tab<br>2. View statistics | None | Performance charts and statistics displayed |
| TC_RES_003 | View Tournament Results | Tournament completed | 1. Navigate to tournament<br>2. View results | tournament_id: "completed_tournament" | All match results and winners displayed |
| TC_RES_004 | View Category Results | Category completed | 1. Navigate to category<br>2. View results | category_id: "completed_category" | Category results with rankings displayed |
| TC_RES_005 | Export Results | Results exist | 1. View results<br>2. Click Export<br>3. Select format | format: "PDF" | Results exported in selected format |
| TC_RES_006 | Filter Results by Tournament | Player has results in multiple tournaments | 1. Navigate to Results<br>2. Select tournament filter | tournament_id: "test_tournament" | Only results from selected tournament displayed |
| TC_RES_007 | View Match History | Player has match history | 1. Navigate to Results<br>2. View match history | None | Complete match history with scores displayed |
| TC_RES_008 | Calculate Win/Loss Statistics | Player has completed matches | 1. Navigate to Performance<br>2. View statistics | None | Win/loss ratio and statistics calculated and displayed |

### Module 26: Data Export & Import

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_EXPORT_001 | Export Tournament Data - CSV | Tournament exists | 1. Navigate to tournament<br>2. Click Export<br>3. Select CSV | tournament_id: "test_tournament", format: "CSV" | CSV file generated and downloaded |
| TC_EXPORT_002 | Export Registration Data | Registrations exist | 1. Navigate to Participants<br>2. Click Export<br>3. Select format | format: "Excel" | Excel file with registration data downloaded |
| TC_EXPORT_003 | Export Payment Data - Admin | Payments exist | 1. Navigate to Admin Payments<br>2. Click Export<br>3. Select format | format: "PDF" | PDF report with payment data generated |
| TC_EXPORT_004 | Export Match Results | Matches completed | 1. Navigate to results<br>2. Click Export | format: "PDF" | PDF with match results generated |

### Module 27: Search & Filter Functionality

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_SEARCH_001 | Search Tournaments | Multiple tournaments exist | 1. Navigate to tournaments<br>2. Enter search term<br>3. View results | search_term: "Karate" | Tournaments matching search displayed |
| TC_SEARCH_002 | Search Players - Admin | Multiple players exist | 1. Navigate to User Management<br>2. Enter search term<br>3. View results | search_term: "John" | Players matching search displayed |
| TC_SEARCH_003 | Search Matches | Multiple matches exist | 1. Navigate to matches<br>2. Enter search term<br>3. View results | search_term: "Final" | Matches matching search displayed |
| TC_SEARCH_004 | Filter by Date Range | Data exists with dates | 1. Navigate to page<br>2. Select date range<br>3. Apply filter | start_date: "2026-01-01", end_date: "2026-12-31" | Only data within date range displayed |
| TC_SEARCH_005 | Multiple Filter Combination | Data exists | 1. Apply multiple filters<br>2. View results | status: "Open", type: "Kata", date_range: "2026" | Data matching all filters displayed |
| TC_SEARCH_006 | Clear Filters | Filters applied | 1. Click "Clear Filters" | None | All filters cleared, all data displayed |
| TC_SEARCH_007 | Search with Special Characters | Data exists | 1. Enter search with special chars<br>2. Submit | search: "Test & Match" | Search handles special characters correctly |
| TC_SEARCH_008 | Case Insensitive Search | Data exists | 1. Enter search in different case<br>2. Submit | search: "KARATE" | Results include "Karate", "karate", "KARATE" |

### Module 28: Error Handling & Recovery

| Test Case ID | Test Case Name | Prerequisite | Test Step | Input Data | Expected Result |
|--------------|----------------|--------------|-----------|------------|-----------------|
| TC_ERR_001 | Handle 404 Error | Invalid route accessed | 1. Navigate to non-existent route | route: "/invalid-route" | 404 error page displayed with helpful message |
| TC_ERR_002 | Handle 500 Error | Server error occurs | 1. Trigger server error<br>2. View response | action: "Invalid operation" | Error message displayed, system remains stable |
| TC_ERR_003 | Handle Network Error | Network disconnected | 1. Disconnect network<br>2. Try to perform action | action: "Load data" | Error message displayed, retry option provided |
| TC_ERR_004 | Handle Validation Error | Invalid data submitted | 1. Submit form with invalid data<br>2. View response | invalid_data: {...} | Validation errors displayed for each field |
| TC_ERR_005 | Handle Timeout Error | Slow network | 1. Simulate slow network<br>2. Perform action | action: "Generate draws" | Timeout error handled gracefully |
| TC_ERR_006 | Handle Database Connection Error | Database unavailable | 1. Disconnect database<br>2. Try to perform action | action: "Create tournament" | Error message displayed, system handles gracefully |
| TC_ERR_007 | Handle Payment Gateway Error | Payment gateway unavailable | 1. Initiate payment<br>2. Gateway fails | payment_data: {...} | Error message displayed, payment can be retried |
| TC_ERR_008 | Handle File Upload Error | Large file uploaded | 1. Upload file exceeding limit<br>2. Submit | file_size: 10MB | Error message "File too large" displayed |

---

## Test Execution Summary

**Total Test Cases: 200+**

**Coverage Areas:**
- Authentication & User Management: 16 test cases
- Tournament Management: 14 test cases
- Category/Event Management: 8 test cases
- Registration Management: 12 test cases
- Payment Processing: 8 test cases
- Match Draw Generation: 10 test cases
- Kata Event Management: 12 test cases
- Kumite Match Scoring: 10 test cases
- Judge Assignment: 6 test cases
- Dashboard Features: 10 test cases
- Notifications: 8 test cases
- Reports: 6 test cases
- User Profile Management: 6 test cases
- Security & Authorization: 8 test cases
- Performance & Load: 5 test cases
- Integration Testing: 5 test cases
- UI/UX Testing: 10 test cases
- Data Validation: 8 test cases
- Edge Cases: 10 test cases
- Real-time Features: 5 test cases
- Chat & Chatbot: 10 test cases
- Dojo Management: 7 test cases
- Admin User Management: 8 test cases
- Schedule Management: 8 test cases
- Results & Performance: 8 test cases
- Data Export: 4 test cases
- Search & Filter: 8 test cases
- Error Handling: 8 test cases

**Priority Levels:**
- **High Priority:** TC_AUTH_001 to TC_AUTH_016, TC_TM_001 to TC_TM_014, TC_REG_001 to TC_REG_012, TC_PAY_001 to TC_PAY_008, TC_DRAW_001 to TC_DRAW_010
- **Medium Priority:** TC_KATA_001 to TC_KATA_012, TC_KUMITE_001 to TC_KUMITE_010, TC_JUDGE_001 to TC_JUDGE_006, TC_CHAT_001 to TC_CHAT_010
- **Low Priority:** TC_UI_001 to TC_UI_010, TC_PERF_001 to TC_PERF_005, TC_EXPORT_001 to TC_EXPORT_004

**Test Environment Requirements:**
- Frontend: React application running on localhost:3000
- Backend: Node.js/Express API running on configured port
- Database: MongoDB instance
- Payment Gateway: PayHere sandbox environment
- AI Service: Gemini API (optional for draw generation and chatbot)
- Socket.IO: For real-time features

**Test Data Requirements:**
- Test users for each role (Admin, Player, Coach, Judge, Organizer)
- Test tournaments with various statuses (Draft, Open, Ongoing, Completed)
- Test categories (Kata and Kumite, Individual and Team)
- Test registrations with different statuses (Pending, Approved, Rejected, Paid)
- Test matches (Scheduled, In Progress, Completed)
- Test scores (Kata and Kumite)
- Test payments (Completed, Pending, Failed, Refunded)
- Test notifications
- Test chat messages
- Test dojos

**Test Execution Strategy:**
1. **Smoke Testing:** Execute high-priority test cases first
2. **Regression Testing:** Execute all test cases after major changes
3. **Integration Testing:** Execute integration test cases after feature completion
4. **Performance Testing:** Execute performance test cases with load
5. **Security Testing:** Execute security test cases regularly
6. **User Acceptance Testing:** Execute UI/UX test cases with stakeholders

**Test Automation Recommendations:**
- Automate: TC_AUTH_001 to TC_AUTH_016, TC_TM_001 to TC_TM_014, TC_REG_001 to TC_REG_012
- Manual: TC_UI_001 to TC_UI_010, TC_PERF_001 to TC_PERF_005, TC_CHAT_001 to TC_CHAT_010
- Hybrid: TC_DRAW_001 to TC_DRAW_010, TC_KATA_001 to TC_KATA_012, TC_KUMITE_001 to TC_KUMITE_010

