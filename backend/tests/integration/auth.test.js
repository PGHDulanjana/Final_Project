const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Coach = require('../../src/models/Coach');
const { createTestUser } = require('../helpers');

describe('Auth Controller Integration Tests', () => {
    let userData;
    let coachUser;
    let coachProfile;

    beforeEach(async () => {
        // Create a Coach User and Profile first (Required for Player registration)
        const coachData = await createTestUser({
            username: 'auth_test_coach',
            email: 'auth_coach@example.com',
            user_type: 'Coach'
        });
        coachUser = coachData.user;

        coachProfile = await Coach.create({
            user_id: coachUser._id,
            certification_level: 'Expert',
            experience_years: 10,
            specialization: ['Kumite']
        });

        userData = {
            username: 'testuser',
            email: 'test@example.com',
            password_hash: 'password123',
            first_name: 'Test',
            last_name: 'User',
            user_type: 'Player',
            gender: 'Male',
            coach_id: coachProfile._id,
            player_dojo_name: 'Test Dojo'
        };
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user.email).toBe(userData.email);
            expect(res.body.data.token).toBeDefined();

            const user = await User.findOne({ email: userData.email });
            expect(user).toBeTruthy();
        });

        it('should fail if user already exists', async () => {
            // Create user first
            await User.create({
                ...userData,
                user_type: 'Player', // Ensure type matches validation expectations
                password_hash: 'hashedpassword'
            });

            const res = await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should register a Coach successfully', async () => {
            const coachData = {
                username: 'new_coach',
                email: 'new_coach@example.com',
                password_hash: 'password123',
                first_name: 'New',
                last_name: 'Coach',
                user_type: 'Coach',
                // Coach specific fields
                dojo_name: 'New Dojo',
                dojo_street: 'Street',
                dojo_city: 'City',
                dojo_state: 'State',
                dojo_zip_code: '12345',
                dojo_country: 'Country',
                certification_level: 'Master',
                experience_years: 15
            };

            const res = await request(app)
                .post('/api/auth/register')
                .send(coachData);

            expect(res.statusCode).toBe(201);
            expect(res.body.data.user.user_type).toBe('Coach');

            const coach = await Coach.findOne({ user_id: res.body.data.user._id });
            expect(coach).toBeTruthy();
            expect(coach.certification_level).toBe('Master');
        });

        it('should fail validation for Coach if dojo data is missing', async () => {
            const coachData = {
                username: 'bad_coach',
                email: 'bad_coach@example.com',
                password_hash: 'password123',
                first_name: 'Bad',
                last_name: 'Coach',
                user_type: 'Coach',
                // Missing dojo fields
                certification_level: 'Master',
                experience_years: 15
            };

            const res = await request(app)
                .post('/api/auth/register')
                .send(coachData);

            expect(res.statusCode).toBe(400);
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Create a user before login tests
            await request(app).post('/api/auth/register').send(userData);
        });

        it('should login successfully with correct credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: userData.email,
                    password_hash: userData.password_hash
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.token).toBeDefined();
        });

        it('should fail with incorrect password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: userData.email,
                    password_hash: 'wrongpassword'
                });

            expect(res.statusCode).toBe(401);
        });

        it('should fail with non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password_hash: 'password123'
                });

            expect(res.statusCode).toBe(401);
        });
    });
});
