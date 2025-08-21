import { mysqlTable, varchar, int, text, timestamp, decimal, json, mysqlEnum } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// App Configuration
export const appConfig = mysqlTable('app_config', {
  id: int('id').primaryKey().autoincrement(),
  configKey: varchar('config_key', { length: 100 }).notNull().unique(),
  configValue: text('config_value').notNull(),
  description: varchar('description', { length: 255 }),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// Users table
export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: varchar('password', { length: 255 }),
  email: varchar('email', { length: 150 }),
  name: varchar('name', { length: 100 }),
  mobile: varchar('mobile', { length: 20 }),
  profileImage: varchar('profile_image', { length: 255 }),
  isVerified: mysqlEnum('is_verified', ['yes', 'no']).notNull().default('no'),
  isGuest: mysqlEnum('is_guest', ['yes', 'no']).notNull().default('no'),
  totalPoints: int('total_points').notNull().default(0),
  status: mysqlEnum('status', ['active', 'inactive', 'suspended']).notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// Pages (restaurants, pubs, brands, etc.)
export const pages = mysqlTable('pages', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  pageType: mysqlEnum('page_type', ['restaurant', 'pub', 'bar', 'cafe', 'franchise', 'brand']).notNull(),
  brandId: int('brand_id'),
  location: varchar('location', { length: 255 }),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  logo: varchar('logo', { length: 255 }),
  banner: varchar('banner', { length: 255 }),
  contactEmail: varchar('contact_email', { length: 150 }),
  contactPhone: varchar('contact_phone', { length: 20 }),
  isActive: mysqlEnum('is_active', ['yes', 'no']).notNull().default('yes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// Tables within pages
export const tables = mysqlTable('tables', {
  id: int('id').primaryKey().autoincrement(),
  pageId: int('page_id').notNull(),
  tableNumber: varchar('table_number', { length: 20 }).notNull(),
  tableName: varchar('table_name', { length: 50 }),
  capacity: int('capacity').notNull().default(4),
  qrCode: varchar('qr_code', { length: 255 }),
  currentTableCode: varchar('current_table_code', { length: 10 }), // Current active table code
  tableCodeExpiresAt: timestamp('table_code_expires_at'), // When current code expires
  isActive: mysqlEnum('is_active', ['yes', 'no']).notNull().default('yes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// User sessions
export const userSessions = mysqlTable('user_sessions', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  pageId: int('page_id').notNull(),
  tableId: int('table_id').notNull(),
  sessionToken: varchar('session_token', { length: 100 }).notNull().unique(),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
  isActive: mysqlEnum('is_active', ['yes', 'no']).notNull().default('yes'),
  pointsEarned: int('points_earned').notNull().default(0),
  tempPoints: int('temp_points').notNull().default(0), // Points for guest users
  sessionType: mysqlEnum('session_type', ['normal', 'guest']).notNull().default('normal'),
});

// Challenges
export const challenges = mysqlTable('challenges', {
  id: int('id').primaryKey().autoincrement(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  challengeType: mysqlEnum('challenge_type', [
    'quiz', 'location', 'photo', 'video', 'checkin', 
    'purchase', 'referral', 'team', 'custom'
  ]).notNull(),
  difficultyLevel: mysqlEnum('difficulty_level', ['easy', 'medium', 'hard']).notNull().default('easy'),
  pointsReward: int('points_reward').notNull().default(0),
  timeLimit: int('time_limit'), // Time limit in minutes
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  isGlobal: mysqlEnum('is_global', ['yes', 'no']).notNull().default('no'),
  requiresModerator: mysqlEnum('requires_moderator', ['yes', 'no']).notNull().default('no'),
  maxAttempts: int('max_attempts').notNull().default(1),
  isActive: mysqlEnum('is_active', ['yes', 'no']).notNull().default('yes'),
  createdBy: mysqlEnum('created_by', ['superadmin', 'page_admin']).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// Page-specific challenges
export const pageChallenges = mysqlTable('page_challenges', {
  id: int('id').primaryKey().autoincrement(),
  pageId: int('page_id').notNull(),
  challengeId: int('challenge_id').notNull(),
  customPoints: int('custom_points'), // Override default challenge points
  isFeatured: mysqlEnum('is_featured', ['yes', 'no']).notNull().default('no'),
  addedAt: timestamp('added_at').notNull().defaultNow(),
});

// Franchise challenges
export const franchiseChallenges = mysqlTable('franchise_challenges', {
  id: int('id').primaryKey().autoincrement(),
  challengeId: int('challenge_id').notNull(),
  brandId: int('brand_id').notNull(), // References pages.id where page_type is brand
  requiredLocations: int('required_locations').notNull().default(1),
  timeWindowDays: int('time_window_days').notNull().default(7),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Quiz questions
export const quizQuestions = mysqlTable('quiz_questions', {
  id: int('id').primaryKey().autoincrement(),
  challengeId: int('challenge_id').notNull(),
  questionText: text('question_text').notNull(),
  questionType: mysqlEnum('question_type', ['multiple_choice', 'true_false', 'text']).notNull().default('multiple_choice'),
  questionOrder: int('question_order').notNull().default(1),
  points: int('points').notNull().default(10),
  timeLimit: int('time_limit').default(30), // Time limit in seconds
  mediaUrl: varchar('media_url', { length: 255 }),
  mediaType: mysqlEnum('media_type', ['image', 'video', 'audio']),
});

// Quiz options
export const quizOptions = mysqlTable('quiz_options', {
  id: int('id').primaryKey().autoincrement(),
  questionId: int('question_id').notNull(),
  optionText: varchar('option_text', { length: 500 }).notNull(),
  optionOrder: int('option_order').notNull().default(1),
  isCorrect: mysqlEnum('is_correct', ['yes', 'no']).notNull().default('no'),
});

// User challenge attempts
export const userChallengeAttempts = mysqlTable('user_challenge_attempts', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  sessionId: int('session_id').notNull(),
  challengeId: int('challenge_id').notNull(),
  pageId: int('page_id').notNull(),
  attemptNumber: int('attempt_number').notNull().default(1),
  status: mysqlEnum('status', [
    'started', 'in_progress', 'completed', 'failed', 'requires_verification'
  ]).notNull().default('started'),
  pointsEarned: int('points_earned').notNull().default(0),
  completionData: json('completion_data'), // Store quiz answers, photos, etc.
  moderatorCode: varchar('moderator_code', { length: 20 }),
  verifiedBy: int('verified_by'), // Moderator user ID
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  verifiedAt: timestamp('verified_at'),
});

// Session challenge locks (one user per table per challenge)
export const sessionChallengeLocks = mysqlTable('session_challenge_locks', {
  id: int('id').primaryKey().autoincrement(),
  tableId: int('table_id').notNull(), // Changed from sessionId to tableId
  challengeId: int('challenge_id').notNull(),
  lockedByUser: int('locked_by_user').notNull(),
  sessionId: int('session_id').notNull(), // User's session
  lockedAt: timestamp('locked_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});

// Moderators
export const moderators = mysqlTable('moderators', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  pageId: int('page_id').notNull(),
  role: mysqlEnum('role', ['waiter', 'manager', 'admin']).notNull().default('waiter'),
  canVerifyChallenges: mysqlEnum('can_verify_challenges', ['yes', 'no']).notNull().default('yes'),
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
  isActive: mysqlEnum('is_active', ['yes', 'no']).notNull().default('yes'),
});

// Superadmin
export const superadmin = mysqlTable('superadmin', {
  id: int('id').primaryKey().autoincrement(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  email: varchar('email', { length: 150 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  role: mysqlEnum('role', ['superadmin', 'admin']).notNull().default('admin'),
  isActive: mysqlEnum('is_active', ['yes', 'no']).notNull().default('yes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// User points history
export const userPointsHistory = mysqlTable('user_points_history', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  pointsChange: int('points_change').notNull(), // Positive for earned, negative for spent
  transactionType: mysqlEnum('transaction_type', [
    'challenge_completion', 'bonus', 'penalty', 'redemption', 'verification_bonus'
  ]).notNull(),
  referenceType: mysqlEnum('reference_type', ['challenge', 'session', 'manual', 'system']).notNull(),
  referenceId: int('reference_id'), // ID of challenge, session, etc.
  description: varchar('description', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Purchase challenges with moderator verification codes
export const purchaseChallenges = mysqlTable('purchase_challenges', {
  id: int('id').primaryKey().autoincrement(),
  challengeId: int('challenge_id').notNull(),
  purchaseDescription: text('purchase_description').notNull(), // e.g. "Buy 3 cokes"
  rewardDescription: text('reward_description').notNull(), // e.g. "Get 1 free"
  moderatorCode: varchar('moderator_code', { length: 20 }).notNull(), // Code for verification
  pointsReward: int('points_reward').notNull().default(0),
  maxRedemptions: int('max_redemptions').notNull().default(1), // Per session/user
  isActive: mysqlEnum('is_active', ['yes', 'no']).notNull().default('yes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Arena challenges (global challenges by superadmin)
export const arenaChallenges = mysqlTable('arena_challenges', {
  id: int('id').primaryKey().autoincrement(),
  challengeId: int('challenge_id').notNull(),
  arenaType: mysqlEnum('arena_type', ['quiz', 'visiting', 'global']).notNull(),
  collaborationType: mysqlEnum('collaboration_type', ['solo', 'page', 'brand']).notNull().default('solo'),
  collaboratorId: int('collaborator_id'), // Page or brand ID if collaborated
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  isGlobal: mysqlEnum('is_global', ['yes', 'no']).notNull().default('yes'),
  maxParticipants: int('max_participants'),
  currentParticipants: int('current_participants').notNull().default(0),
  isActive: mysqlEnum('is_active', ['yes', 'no']).notNull().default('yes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Challenge redemptions tracking
export const challengeRedemptions = mysqlTable('challenge_redemptions', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  sessionId: int('session_id').notNull(),
  challengeId: int('challenge_id').notNull(),
  purchaseChallengeId: int('purchase_challenge_id'), // If it's a purchase challenge
  moderatorCode: varchar('moderator_code', { length: 20 }),
  verifiedBy: int('verified_by'), // Moderator who verified
  pointsAwarded: int('points_awarded').notNull().default(0),
  redeemedAt: timestamp('redeemed_at').notNull().defaultNow(),
  verifiedAt: timestamp('verified_at'),
});

// Moderator session management
export const moderatorSessions = mysqlTable('moderator_sessions', {
  id: int('id').primaryKey().autoincrement(),
  pageId: int('page_id').notNull(),
  tableId: int('table_id').notNull(),
  moderatorId: int('moderator_id').notNull(), // From moderators table
  activeUserSessions: json('active_user_sessions'), // Track active sessions at table
  sessionData: json('session_data'), // Track challenges, codes, etc.
  lastUpdated: timestamp('last_updated').notNull().defaultNow().onUpdateNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(userSessions),
  challengeAttempts: many(userChallengeAttempts),
  pointsHistory: many(userPointsHistory),
  moderatorAssignments: many(moderators),
  challengeLocks: many(sessionChallengeLocks),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  brand: one(pages, { fields: [pages.brandId], references: [pages.id] }),
  tables: many(tables),
  sessions: many(userSessions),
  challenges: many(pageChallenges),
  moderators: many(moderators),
  franchiseChallenges: many(franchiseChallenges),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  page: one(pages, { fields: [tables.pageId], references: [pages.id] }),
  sessions: many(userSessions),
}));

export const userSessionsRelations = relations(userSessions, ({ one, many }) => ({
  user: one(users, { fields: [userSessions.userId], references: [users.id] }),
  page: one(pages, { fields: [userSessions.pageId], references: [pages.id] }),
  table: one(tables, { fields: [userSessions.tableId], references: [tables.id] }),
  challengeAttempts: many(userChallengeAttempts),
  challengeLocks: many(sessionChallengeLocks),
}));

export const challengesRelations = relations(challenges, ({ many }) => ({
  pageAssignments: many(pageChallenges),
  franchiseAssignments: many(franchiseChallenges),
  questions: many(quizQuestions),
  attempts: many(userChallengeAttempts),
  locks: many(sessionChallengeLocks),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one, many }) => ({
  challenge: one(challenges, { fields: [quizQuestions.challengeId], references: [challenges.id] }),
  options: many(quizOptions),
}));

export const quizOptionsRelations = relations(quizOptions, ({ one }) => ({
  question: one(quizQuestions, { fields: [quizOptions.questionId], references: [quizQuestions.id] }),
}));

export const userChallengeAttemptsRelations = relations(userChallengeAttempts, ({ one }) => ({
  user: one(users, { fields: [userChallengeAttempts.userId], references: [users.id] }),
  session: one(userSessions, { fields: [userChallengeAttempts.sessionId], references: [userSessions.id] }),
  challenge: one(challenges, { fields: [userChallengeAttempts.challengeId], references: [challenges.id] }),
  page: one(pages, { fields: [userChallengeAttempts.pageId], references: [pages.id] }),
  verifier: one(users, { fields: [userChallengeAttempts.verifiedBy], references: [users.id] }),
}));

export const moderatorsRelations = relations(moderators, ({ one }) => ({
  user: one(users, { fields: [moderators.userId], references: [users.id] }),
  page: one(pages, { fields: [moderators.pageId], references: [pages.id] }),
}));

export const sessionChallengeLocksRelations = relations(sessionChallengeLocks, ({ one }) => ({
  session: one(userSessions, { fields: [sessionChallengeLocks.sessionId], references: [userSessions.id] }),
  challenge: one(challenges, { fields: [sessionChallengeLocks.challengeId], references: [challenges.id] }),
  user: one(users, { fields: [sessionChallengeLocks.lockedByUser], references: [users.id] }),
  table: one(tables, { fields: [sessionChallengeLocks.tableId], references: [tables.id] }),
}));

export const userPointsHistoryRelations = relations(userPointsHistory, ({ one }) => ({
  user: one(users, { fields: [userPointsHistory.userId], references: [users.id] }),
}));

export const purchaseChallengesRelations = relations(purchaseChallenges, ({ one, many }) => ({
  challenge: one(challenges, { fields: [purchaseChallenges.challengeId], references: [challenges.id] }),
  redemptions: many(challengeRedemptions),
}));

export const arenaChallengesRelations = relations(arenaChallenges, ({ one }) => ({
  challenge: one(challenges, { fields: [arenaChallenges.challengeId], references: [challenges.id] }),
  collaborator: one(pages, { fields: [arenaChallenges.collaboratorId], references: [pages.id] }),
}));

export const challengeRedemptionsRelations = relations(challengeRedemptions, ({ one }) => ({
  user: one(users, { fields: [challengeRedemptions.userId], references: [users.id] }),
  session: one(userSessions, { fields: [challengeRedemptions.sessionId], references: [userSessions.id] }),
  challenge: one(challenges, { fields: [challengeRedemptions.challengeId], references: [challenges.id] }),
  purchaseChallenge: one(purchaseChallenges, { fields: [challengeRedemptions.purchaseChallengeId], references: [purchaseChallenges.id] }),
  verifier: one(users, { fields: [challengeRedemptions.verifiedBy], references: [users.id] }),
}));

export const moderatorSessionsRelations = relations(moderatorSessions, ({ one }) => ({
  page: one(pages, { fields: [moderatorSessions.pageId], references: [pages.id] }),
  table: one(tables, { fields: [moderatorSessions.tableId], references: [tables.id] }),
  moderator: one(moderators, { fields: [moderatorSessions.moderatorId], references: [moderators.id] }),
}));

// Challenge leaderboard for tracking fastest completions
export const challengeLeaderboard = mysqlTable('challenge_leaderboard', {
  id: int('id').primaryKey().autoincrement(),
  challengeId: int('challenge_id').notNull(),
  userId: int('user_id').notNull(),
  sessionId: int('session_id').notNull(),
  pageId: int('page_id').notNull(),
  completionTimeMs: int('completion_time_ms').notNull(), // Total time in milliseconds
  totalScore: int('total_score').notNull(), // Total points earned based on timing
  correctAnswers: int('correct_answers').notNull(),
  totalQuestions: int('total_questions').notNull(),
  completedAt: timestamp('completed_at').notNull().defaultNow(),
  rank: int('rank'), // Global rank for this challenge
});

export const challengeLeaderboardRelations = relations(challengeLeaderboard, ({ one }) => ({
  challenge: one(challenges, { fields: [challengeLeaderboard.challengeId], references: [challenges.id] }),
  user: one(users, { fields: [challengeLeaderboard.userId], references: [users.id] }),
  session: one(userSessions, { fields: [challengeLeaderboard.sessionId], references: [userSessions.id] }),
  page: one(pages, { fields: [challengeLeaderboard.pageId], references: [pages.id] }),
}));