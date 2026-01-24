const request = require('supertest');
const app = require('../../src/app');
const TournamentCategory = require('../../src/models/TournamentCategory');
const Tournament = require('../../src/models/Tournament');
const Organizer = require('../../src/models/Organizer');
const { createTestUser } = require('../helpers');

describe('Category Controller Integration Tests', () => {
    let organizerUser, organizerToken;
    let otherUser, otherToken;
    let tournament;

    beforeEach(async () => {
        // Setup Organizer
        const orgData = await createTestUser({
            username: 'cat_organizer',
            email: 'cat_org@example.com',
            user_type: 'Organizer'
        });
        organizerUser = orgData.user;
        organizerToken = orgData.token;

        const organizerProfile = await Organizer.create({
            user_id: organizerUser._id,
            organization_name: 'Cat Org',
            license_number: 'CAT123'
        });

        // Setup Regular User
        const userData = await createTestUser({
            username: 'cat_user',
            email: 'cat_user@example.com',
            user_type: 'Player'
        });
        otherUser = userData.user;
        otherToken = userData.token;

        // Create Tournament
        tournament = await Tournament.create({
            organizer_id: organizerProfile._id,
            tournament_name: 'Category Test Tournament',
            start_date: new Date(Date.now() + 86400000),
            end_date: new Date(Date.now() + 172800000),
            registration_deadline: new Date(Date.now() + 43200000),
            venue: 'Cat Venue',
            venue_address: 'Cat Address',
            status: 'Draft'
        });
    });

    describe('POST /api/categories', () => {
        it('should create a category as organizer', async () => {
            const categoryData = {
                tournament_id: tournament._id,
                category_name: 'Men Kumite -75kg',
                category_type: 'Kumite',
                age_category: 'Senior',
                gender: 'Male',
                weight_class: '-75kg',
                participation_type: 'Individual'
            };

            const res = await request(app)
                .post('/api/categories')
                .set('Authorization', `Bearer ${organizerToken}`)
                .send(categoryData);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.category_name).toBe(categoryData.category_name);

            const savedCat = await TournamentCategory.findById(res.body.data._id);
            expect(savedCat).toBeTruthy();
        });

        it('should fail to create category as regular user', async () => {
            const res = await request(app)
                .post('/api/categories')
                .set('Authorization', `Bearer ${otherToken}`)
                .send({
                    tournament_id: tournament._id,
                    category_name: 'Hacked Cat',
                    category_type: 'Kumite',
                    age_category: 'Senior',
                    gender: 'Male',
                    participation_type: 'Individual'
                });

            expect(res.statusCode).toBe(403);
        });

        it('should fail if tournament not found', async () => {
            // Generate a random valid ObjectId
            const mongoose = require('mongoose');
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .post('/api/categories')
                .set('Authorization', `Bearer ${organizerToken}`)
                .send({
                    tournament_id: fakeId,
                    category_name: 'Ghost Cat',
                    category_type: 'Kumite',
                    age_category: 'Senior',
                    gender: 'Male',
                    participation_type: 'Individual'
                });

            expect(res.statusCode).toBe(404);
        });
    });

    describe('GET /api/categories', () => {
        it('should get all categories', async () => {
            await TournamentCategory.create({
                tournament_id: tournament._id,
                category_name: 'Cat 1',
                category_type: 'Kata',
                age_category: 'Adult',
                gender: 'Male',
                participation_type: 'Individual'
            });

            const res = await request(app)
                .get(`/api/categories?tournament_id=${tournament._id}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.length).toBe(1);
        });
    });

    describe('PUT /api/categories/:id', () => {
        it('should update category as organizer', async () => {
            const category = await TournamentCategory.create({
                tournament_id: tournament._id,
                category_name: 'Old Name',
                category_type: 'Kata',
                age_category: 'Adult',
                gender: 'Male',
                participation_type: 'Individual'
            });

            const res = await request(app)
                .put(`/api/categories/${category._id}`)
                .set('Authorization', `Bearer ${organizerToken}`)
                .send({ category_name: 'New Name' });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.category_name).toBe('New Name');
        });

        it('should fail update as non-organizer', async () => {
            const category = await TournamentCategory.create({
                tournament_id: tournament._id,
                category_name: 'Protected',
                category_type: 'Kata',
                age_category: 'Adult',
                gender: 'Male',
                participation_type: 'Individual'
            });

            const res = await request(app)
                .put(`/api/categories/${category._id}`)
                .set('Authorization', `Bearer ${otherToken}`)
                .send({ category_name: 'Hacked' });

            expect(res.statusCode).toBe(403);
        });
    });

    describe('DELETE /api/categories/:id', () => {
        it('should delete category as organizer', async () => {
            const category = await TournamentCategory.create({
                tournament_id: tournament._id,
                category_name: 'To Delete',
                category_type: 'Kata',
                age_category: 'Adult',
                gender: 'Male',
                participation_type: 'Individual'
            });

            const res = await request(app)
                .delete(`/api/categories/${category._id}`)
                .set('Authorization', `Bearer ${organizerToken}`);

            expect(res.statusCode).toBe(200);

            const check = await TournamentCategory.findById(category._id);
            expect(check).toBeNull();
        });
    });
});
