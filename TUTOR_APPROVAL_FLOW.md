# Tutor Approval & Password Setup - Complete Flow

## Overview
When an admin approves a tutor application, the system automatically:
1. Creates a tutor account in the database
2. Sends an email with credentials and password setup link
3. Shows user credentials on their profile page
4. Allows user to set password and login

---

## Step-by-Step Flow

### 1️⃣ USER APPLIES
- User clicks "Become a Tutor" on dashboard or profile
- Opens `BecomeTutorModal` form
- Fills in: experience level, subject expertise, motivation, certifications
- Submits to `/api/user/tutor-request`
- Status: `pending`

📁 **File:** `/components/BecomeTutorModal.jsx`

---

### 2️⃣ ADMIN REVIEWS
- Admin goes to `/admin/tutor-requests`
- Sees all pending applications
- Can filter by status (Pending, Approved, Rejected)
- Clicks **APPROVE** or **REJECT**

📁 **File:** `/app/admin/tutor-requests/page.jsx`

---

### 3️⃣ ADMIN APPROVES - BACKEND PROCESS
When admin clicks **APPROVE**:

**Request sent to:** `/api/admin/tutor-requests/[id]`

**Backend does:**
1. Creates entry in `ADMIN_TABLE` with:
   - email: tutor's email
   - name: tutor's name
   - role: `'tutor'`
   - isActive: `true`
   - passwordHash: empty (user will set)

2. Sends email with:
   - Tutor email (for login)
   - Password reset link: `/admin/forgot-password?email=tutor@email.com`
   - Login URL: `/admin/login`
   - Quick start guide
   - Benefits overview

📁 **File:** `/app/api/admin/tutor-requests/[id]/route.js`

---

### 4️⃣ EMAIL SENT TO USER
User receives email with:
- Subject: "🎉 Your Tutor Application Has Been Approved!"
- Tutor email for login
- Getting Started instructions
- Links to set password and login

**Email Template:** In the route file (lines 23-55) using HTML template

---

### 5️⃣ USER SETS PASSWORD
User clicks **"Set Password"** link in email or TutorApprovalCard.

**Link format:** `/admin/forgot-password?email=tutor@email.com`

**What happens:**
1. Opens forgot-password page
2. Email is **pre-filled** from URL query param
3. User enters new password (min 8 chars)
4. User confirms password
5. Clicks **"Set Password"**

📁 **File:** `/app/admin/forgot-password/page.jsx` (updated)

**Two Flows:**
- **With email param** → Show password setup form directly
- **Without email param** → Show traditional email request form

---

### 6️⃣ PASSWORD SAVED TO DATABASE
When user submits password:

**Request sent to:** `/api/admin/auth/set-password`

**Backend does:**
1. Hash password with bcrypt
2. Update `ADMIN_TABLE` passwordHash field
3. Return success
4. Page shows "Password Set Successfully"
5. Auto-redirects to `/admin/login` in 3 seconds

📁 **File:** `/app/api/admin/auth/set-password/route.js`

---

### 7️⃣ USER SEES CREDENTIALS ON PROFILE
User goes to `/dashboard/profile`

**TutorApprovalCard appears showing:**

#### Green Success Banner
- "Congratulations! 🎉"
- "You're now an approved tutor"

#### Credentials Section
1. **Email Display** (with copy button)
   - Shows tutor email
   - Instruction: "Use this email to log in"

2. **Set Password Button**
   - Opens `/admin/forgot-password?email=...`
   - Instructions on what to do

3. **Login Button**
   - Opens `/admin/login`
   - Instructions: "Access your tutor dashboard"

4. **Quick Start Guide** (5 steps)
   - Set password
   - Log in
   - Click Create Course button
   - Fill course details
   - Publish and earn

5. **Benefits Grid**
   - 📖 Create Courses
   - 👥 Manage Students
   - 💰 Earn Revenue

📁 **File:** `/components/TutorApprovalCard.jsx`

---

### 8️⃣ USER LOGS IN
1. User clicks **"Open Tutor Login"** button
2. Navigated to `/admin/login`
3. Enters email and password
4. Redirected to `/admin/dashboard`
5. **Tutor Panel Access:**
   - Create Course button (main action)
   - View courses created
   - Student management
   - Analytics
   - All tutor features

📁 **File:** `/app/admin/login/page.jsx`

---

## Database Tables Involved

### 1. TUTOR_REQUESTS_TABLE
```
{
  id: int
  userEmail: string
  userName: string
  experienceLevel: string ('beginner', 'intermediate', 'advanced', 'expert')
  subjectExpertise: string
  motivation: string
  certifications: string (optional)
  status: string ('pending', 'approved', 'rejected')
  rejectionReason: string (if rejected)
  requestedAt: datetime
  reviewedAt: datetime
  reviewedBy: string (admin email)
}
```

### 2. ADMIN_TABLE (Updated)
```
{
  id: int
  email: string (UNIQUE)
  name: string
  passwordHash: string
  role: string ('admin', 'super_admin', 'tutor')
  isActive: boolean
  createdAt: datetime
  updatedAt: datetime
}
```

---

## API Endpoints

### For Users
- **POST** `/api/user/tutor-request` - Submit application
- **GET** `/api/user/tutor-request?email=X` - Check status

### For Admin
- **GET** `/api/admin/tutor-requests` - List all (optional ?status=)
- **PATCH** `/api/admin/tutor-requests/[id]` - Approve/Reject
- **POST** `/api/admin/auth/set-password` - Set password (used by user)

---

## Files Modified/Created

### Created
- ✅ `/components/TutorApprovalCard.jsx` - Credentials display component
- ✅ `/components/BecomeTutorModal.jsx` - Application form
- ✅ `/app/admin/tutor-requests/page.jsx` - Admin review panel
- ✅ `/app/api/user/tutor-request/route.js` - User request submission
- ✅ `/app/api/admin/tutor-requests/route.js` - List requests
- ✅ `/app/api/admin/tutor-requests/[id]/route.js` - Approve/reject + email
- ✅ `/app/api/admin/auth/set-password/route.js` - Password setting

### Updated
- ✅ `/configs/schema.js` - Added TUTOR_REQUESTS_TABLE
- ✅ `/app/admin/forgot-password/page.jsx` - Support email query param
- ✅ `/app/dashboard/profile/page.jsx` - Show approval card
- ✅ `/app/dashboard/_components/WelcomeBanner.jsx` - Show approval card
- ✅ `/app/admin/layout.jsx` - Added tutor-requests nav link

---

## Key Features

✅ **Email Notifications**
- Approval email with credentials
- Rejection email with reason

✅ **Pre-filled Email**
- Password reset link auto-fills user email
- Users can't change email during password setup

✅ **Credential Display**
- Shows on profile page
- Shows on dashboard
- Copyable email
- Direct login buttons

✅ **Status Tracking**
- Pending: Show "Under Review" badge
- Approved: Show credentials card
- Rejected: Show reason + "Apply Again" button

✅ **Security**
- Passwords hashed with bcrypt
- Role-based access control
- Email field disabled during setup

---

## User Experience Timeline

```
Day 1: User applies
↓
Day 2-7: Waiting for approval (sees "Pending" badge on profile)
↓
Day 7: Admin approves
↓
Immediately: Email received with setup instructions
↓
User clicks: "Set Password" link in email
↓
Redirected: To `/admin/forgot-password?email=user@email.com`
↓
User enters: New password + confirm
↓
Database: Password saved, account activated
↓
User clicks: "Go to Login" button
↓
Redirected: To `/admin/login`
↓
User enters: email + password
↓
Access: Tutor dashboard ready to create courses
```

---

## Testing Checklist

- [ ] User can submit tutor application
- [ ] Admin can see application in review panel
- [ ] Admin can approve application
- [ ] Approval email is sent
- [ ] Email contains password reset link with email param
- [ ] User can click link and see pre-filled email
- [ ] User can set password (8+ chars)
- [ ] Password mismatch validation works
- [ ] Password successfully updates in database
- [ ] User profile shows TutorApprovalCard
- [ ] Can copy email address from card
- [ ] Can click "Open Tutor Login" button
- [ ] Can login with email + password
- [ ] Can access tutor dashboard
- [ ] Admin can reject with reason
- [ ] Rejection email is sent
- [ ] User profile shows rejection with reason
- [ ] User can apply again after rejection

---

## Configuration Required

Make sure environment variables are set:
```env
# Email service
RESEND_API_KEY=your_key
RESEND_FROM_EMAIL=noreply@geminilms.com

# Base URL (for generating links)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Database
NEXT_PUBLIC_DB_CONNECTION_STRING=your_db_url

# Admin emails
NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com,admin2@example.com
```

---

## Security Notes

1. **Passwords** are hashed with bcrypt, never stored plain text
2. **Email validation** prevents invalid emails being used
3. **Role-based access** ensures only tutors see tutor features
4. **Pre-filled email** cannot be changed (disabled field)
5. **Password requirement** minimum 8 characters enforced
6. **Rate limiting** should be added to prevent abuse
7. **Email verification** optional add-on for extra security

---

## Future Enhancements

- [ ] Email verification step before approval
- [ ] Tutor rating/review system
- [ ] Certification validation
- [ ] Video tutorial for new tutors
- [ ] Tutor performance dashboard
- [ ] Revenue tracking system
- [ ] Tutor approval workflow steps
- [ ] Admin notes on applications
