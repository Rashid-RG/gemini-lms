# Team Password Management - Admin Feature

## Overview

The **Team Password Management** feature allows administrators to securely manage and reset passwords for team members and tutors directly from the admin dashboard. This streamlines the process of onboarding new tutors and managing team credentials.

## Features

### 1. **Team Member List**
- View all tutors and team members
- See password age (how long ago the password was set)
- Status indicator (Active/Inactive)
- Role badge (Admin, Tutor, etc.)

### 2. **Password Reset Modal**
- Generate random 12-character passwords with special characters
- Manually enter custom passwords (8+ characters required)
- Show/hide password visibility for security
- Quick copy button for reference
- 24-hour validity warning

### 3. **Automated Email Delivery**
- Temporary passwords sent directly to team member email
- Professional HTML email template
- Clear credentials display in email
- 24-hour validity notice

### 4. **Permanent Passwords**
- Passwords are permanent and don't expire
- Clear timestamp tracking (`passwordSetAt`) - shows when password was last set
- Can reset password anytime for security
- Team members can change password anytime in their profile

## File Structure

```
app/
├── admin/
│   └── team-passwords/
│       └── page.jsx                    # Main team password management page
└── api/
    └── admin/
        ├── team-members/
        │   └── route.js               # GET list team members
        └── reset-team-password/
            └── route.js               # POST reset password & send email
```

## API Endpoints

### GET `/api/admin/team-members`

**Query Parameters:**
- `role` (optional): Filter by role (e.g., "tutor", "admin")

**Response:**
```json
{
  "result": {
    "success": true,
    "message": "Password reset successfully",
    "emailSent": true
  }
}
```

**Authorization:** Admin/Super Admin only

---

### POST `/api/admin/reset-team-password`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "TempPass123!@",
  "sendEmail": true
}
```

**Parameters:**
- `email` (required): Team member's email address
- `password` (required): New temporary password (8+ characters)
- `sendEmail` (required): Whether to send email notification

**Response:**
```json
{
  "result": {
    "success": true,
    "message": "Password reset successfully",
    "emailSent": true
  }
}
```

**Authorization:** Admin/Super Admin only

**Error Cases:**
- `401`: Not authenticated
- `403`: User is not an admin
- `404`: Team member not found
- `400`: Invalid password length (< 8 chars)

---

## Database Schema

### ADMIN_TABLE

New/Updated fields:
```javascript
{
  // ... existing fields
  
  // Password Management
  temporaryPassword: string,  // Bcrypt-hashed password
  passwordSetAt: datetime,    // Timestamp of when password was set
}
```

## User Flow

### Admin Perspective
1. Admin navigates to **Team Passwords** from sidebar
2. Views list of all team members with their password age
3. Clicks **Reset Password & Send** on any team member
4. Modal opens with team member info
5. Admin can:
   - Click "Generate" to create random password
   - Copy password for reference
   - Manually enter custom password
6. Clicks "Reset & Send Email"
7. Password is hashed and stored in database
8. Email sent automatically to team member

### Team Member Perspective
1. Receives email with temporary credentials
2. Email contains: email & temporary password
3. Password is valid for **24 hours**
4. After 24 hours, must request new password from admin
5. Can log in during the 24-hour window

## Implementation Details

### Password Generation

```javascript
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
```

### Password Hashing

Uses **bcryptjs** with 10-round salt:
```javascript
const salt = await bcrypt.genSalt(10)
const hashedPassword = await bcrypt.hash(password, salt)
```

### Password Persistence

```javascript
// Passwords are stored permanently
// Team members can use them indefinitely
const setTime = new Date(passwordSetAt).getTime()
// Password does not expire
```

## Email Template

Professional HTML email includes:
- Greeting with team member name
- Clear credentials table (Email + Password)
- Blue info box about changing password in profile
- Instructions to contact admin if not requested
- Footers and security warnings

## Security Considerations

✅ **Implemented:**
- Bcrypt hashing (10-round salt) - never store plain text
- Only admins can reset passwords
- Email verification via Resend
- 24-hour temporary password expiry
- Authentication required via Clerk

⚠️ **Best Practices:**
- Users should change password immediately after first login
- Passwords should not be re-used from previous resets
- Email delivery is tracked but not confirmed read
- Password reset logs should be monitored

## Testing Checklist

- [ ] Fetch team members list successfully
- [ ] Filter team members by role
- [ ] Open password reset modal
- [ ] Generate random password (click button multiple times)
- [ ] Show/hide password toggle works
- [ ] Copy to clipboard copies correct text
- [ ] Can enter custom password (8+ chars)
- [ ] Error on password < 8 characters
- [ ] Reset button sends request
- [ ] Email received with credentials
- [ ] Password stored in database as hashed
- [ ] `passwordSetAt` timestamp set correctly
- [ ] Team member can log in with temporary password
- [ ] Temporary password expires after 24 hours
- [ ] Non-existent email shows error
- [ ] Only admins can access endpoint (403 error check)
- [ ] UI shows "EXPIRED" status after 24h
- [ ] Can reset expired password

## Component Props

### Team Password Management Page
- No props - fetches data from API
- Uses `useAdminAuth` context for admin verification
- Uses `sonner` toast for notifications
- Uses `axios` for API calls

## Navigation

The new page is added to the admin sidebar:
- **Label:** Team Passwords
- **Icon:** Key
- **Route:** `/admin/team-passwords`
- **Roles:** admin, super_admin
- **Position:** After "Tutor Requests"

## Future Enhancements

1. **Bulk Password Reset** - Reset passwords for multiple team members at once
2. **Password History** - View all password reset activities for an admin
3. **Audit Log Integration** - Log all password changes
4. **Scheduled Password Expiry** - Automatically force password reset after 30 days
5. **SMS Delivery** - Backup credentials via SMS
6. **Password Strength Indicator** - Show password strength in real-time
7. **Team Member Notifications** - Send reminder emails before password expiry
8. **Export Credentials** - (Careful!) Export credentials list for bulk onboarding

## Troubleshooting

### Email Not Received
1. Check Resend API key is configured
2. Verify email address is correct
3. Check spam/junk folder
4. Review API response for errors

### Password Reset Fails
1. Verify team member email exists in database
2. Check user has admin/super_admin role
3. Ensure password is 8+ characters
4. Check database connection

### Expired Passwords Still Showing
1. Password expiry is checked on reset request/fetch
2. If timestamp is wrong, use database to check `passwordSetAt`
3. Can manually reset if issue persists

## Related Features

- **Tutor Requests** (`/admin/tutor-requests`) - Approve tutors and set initial password
- **Manage Team** (`/admin/team`) - Full team member management (super admin only)
- **User Profile** - Team members see their temporary password on profile while valid

---

## Code Examples

### Reset Password for Team Member
```javascript
const response = await axios.post('/api/admin/reset-team-password', {
  email: 'tutor@example.com',
  password: 'NewPass123!@',
  sendEmail: true
})

if (response.data.result.success) {
  toast.success('Password reset and email sent!')
}
```

### Fetch Team Members
```javascript
const response = await axios.get('/api/admin/team-members?role=tutor')
const tutors = response.data.result
```

### Display Password Age
```javascript
const formatPasswordAge = (passwordSetAt) => {
  const setTime = new Date(passwordSetAt).getTime()
  const now = Date.now()
  const diff = now - setTime
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  return `${days}d ${hours}h ago`
}
```

---

## Conclusion

The Team Password Management feature provides administrators with a secure, user-friendly way to manage team member passwords. It combines ease of use with strong security practices through bcrypt hashing, email verification, and automatic 24-hour expiry.
