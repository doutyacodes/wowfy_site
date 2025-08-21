# Wowfy Setup Guide

## Database Setup

1. **Start WAMP Server** and ensure MySQL is running

2. **Create Database:**
   - Open phpMyAdmin or MySQL command line
   - Create database: `CREATE DATABASE wowfy;`

3. **Run Migrations:**
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit push
   ```

4. **Insert Sample Data:**
   - Import the `sample_data.sql` file into your wowfy database
   - This includes sample venues, tables, challenges, and admin users

## Running the Application

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start Development Server:**
   ```bash
   npm run dev
   ```

3. **Access the Application:**
   - Landing Page: `http://localhost:3000`
   - Direct Venue Access: `http://localhost:3000/venue/REST001`

## Testing the QR Code Flow

### Sample Venue Codes:
- `REST001` - Green Bistro Downtown
- `PUB001` - The Cozy Pub  
- `MCD001` - McDonalds Times Square
- `SB001` - Starbucks 5th Ave

### QR Code URLs:
- `http://localhost:3000/venue/REST001`
- `http://localhost:3000/venue/PUB001`
- `http://localhost:3000/venue/MCD001`

## User Flow Testing

### 1. QR Code Access (Not Logged In):
1. Visit `http://localhost:3000/venue/REST001`
2. System redirects to signup page with return URL
3. Create account (or login)
4. Automatically redirected back to venue page
5. Select table and complete OTP verification

### 2. Normal Flow (Logged In):
1. Visit `http://localhost:3000`
2. Sign up or login
3. Go to "Join a Table"
4. Enter venue code (e.g., REST001)
5. Select table and complete OTP

## Admin Credentials (for testing)

**Superadmin:**
- Username: `superadmin`
- Password: `admin123`

**Venue Admin (REST001):**
- Username: `admin_rest001` 
- Password: `admin123`

**Moderator/Waiter (REST001):**
- Username: `waiter_rest001`
- Password: `admin123`

## Features Implemented

✅ **Core System:**
- Database schema with Drizzle ORM
- User authentication (signup/login/guest accounts)
- Venue management with codes
- Table selection and OTP verification
- Session management

✅ **QR Code Support:**
- Direct venue access via URLs
- Automatic auth redirect with return URL
- Seamless user experience

✅ **UI/UX:**
- Modern responsive design
- Green/white theme
- Framer Motion animations
- Mobile-friendly interface

## Next Steps

The foundation is complete! Ready for:
- Challenge system implementation
- Reward points management
- Superadmin dashboard
- Enhanced animations
- Real-time features