# Team Password Management - Quick Start Guide

## What is This Feature?

The **Team Password Management** section allows you to quickly reset and manage passwords for all your tutors and team members. Perfect for onboarding new team members or resetting forgotten passwords.

## Quick Access

1. **From Admin Dashboard**, click **Team Passwords** in the sidebar (Key icon)
2. Or navigate directly to: `/admin/team-passwords`

## How to Reset a Team Member's Password

### Step 1: Find the Team Member
- The page shows all active team members and tutors
- Look for the person you want to reset password for
- Each card shows:
  - Name and email
  - Role (Tutor, Admin, etc.)
  - Active/Inactive status
  - When their password was last set

### Step 2: Click "Reset Password & Send"
- Blue button at the bottom of the team member's card
- Opens a modal dialog

### Step 3: Generate or Enter Password
**Option A: Auto-Generate (Recommended)**
- Click **🔄 Generate** button
- System creates random 12-character password
- Contains letters, numbers, and special characters
- Click again to generate a different one

**Option B: Custom Password**
- Type your own password in the field
- Must be at least 8 characters
- Can use any combination of letters, numbers, symbols

### Step 4: Review Password
- **Show/Hide Toggle** (eye icon) to see what you'll send
- **Copy Button** to copy password to clipboard
- Useful to paste in notes or chat before sending

### Step 5: Send to Team Member
- Confirm details in the info box (Email & password)
- Click **Reset & Send Email**
- System will:
  1. Hash the password securely
  2. Store in database
  3. Send professional email to team member

### Step 6: Confirmation
- Green toast notification appears: "Password reset and email sent!"
- Email reaches their inbox within seconds
- They can now log in with email + temp password

---

## Important Information

### 🔒 Password Security
- Passwords are permanent and secure with bcrypt hashing
- Team members can change password anytime after login
- Only admins can reset passwords via this panel
- Each team member should set a unique password

### 🔒 Security
- Passwords are hashed using bcrypt (industry standard)
- Plain text password never stored in database
- Only sent once via email
- Admin should not memorize or store passwords

### ✉️ Email Contains
- Team member's email address
- The password
- Instructions on how to use it
- How to change password in settings

### What Team Members Should Do
1. **Check email immediately** - Look in inbox and spam folder
2. **Copy credentials** - Note down email and password
3. **Log in** - Use credentials to access the system
4. **Change password** - After first login, change to a password of their choice

---

## Common Scenarios

### Scenario 1: Onboarding New Tutor
1. Admin approves tutor in **Tutor Requests**
2. Later, admin can reset their password here for backup
3. Tutor gets fresh credentials
4. Tutor logs in and sets permanent password

### Scenario 2: Tutor Forgot Password
1. Find tutor in Team Passwords list
2. Click "Reset Password & Send"
3. Generate new password and send email
4. Tutor receives new temporary password
5. Tutor logs in with new credentials

### Scenario 3: Bulk Team Reset
1. Go through each team member
2. Click "Reset Password & Send" for each
3. They all receive fresh credentials
4. Useful before team training or deployment

### Scenario 4: Resetting an Existing Password
1. Find team member in Team Passwords list
2. Click "Reset Password & Send"
3. Generate new password and send email
4. Team member receives new password
5. Useful for security rotation or if password compromised

---

## Troubleshooting

### Email Not Received?
- [ ] Check spam/junk folder
- [ ] Verify email address is correct
- [ ] Wait a few seconds (sometimes delayed)
- [ ] Try resetting password again
- [ ] Contact admin to check email service

### Can't Reset Password?
- [ ] Make sure you're logged in as admin
- [ ] Verify team member email exists in system
- [ ] Try refreshing page (click Refresh button)
- [ ] Check password is 8+ characters (if custom)

### Team Member Can't Log In?
- [ ] Check password was set recently (look at password age)
- [ ] Verify email/password are copied correctly
- [ ] Check team member is in "Active" status
- [ ] Reset password again if they forgot it
- [ ] Check email client isn't filtering the email

---

## Tips & Best Practices

✅ **DO:**
- Use auto-generate for random, strong passwords
- Send to verify email immediately
- Include password reset instructions in onboarding docs
- Reset if team member reports forgotten password or security issue
- Monitor team member access for security

❌ **DON'T:**
- Share password over chat or unencrypted channels
- Reuse same password for multiple team members
- Set passwords without team member's knowledge
- Keep plain-text copy of passwords
- Use weak or simple passwords

---

## Features Explained

### 🔄 Refresh Button
- Click top-right to reload team member list
- Fetches latest data from server
- Useful after adding new team members

### 📋 Team Member Card
Shows:
- **Name & Email** - Who the account belongs to
- **Role Badge** - Tutor, Admin, etc. (blue badge)
- **Status Badge** - Active (green) or Inactive (gray)
- **Password Age** - Shows days/hours since last password set
- **Reset Button** - Opens password reset modal

### 🔐 Password Modal
Shows:
- **Name & Email** - Confirms who you're resetting for
- **Password Input** - Where you type or see password
- **Generate Button** - Creates random 12-char password
- **Copy Button** - Copies to clipboard
- **Show/Hide Toggle** - Eye icon to reveal/hide password
- **Info Box** - Warning about 24-hour validity
- **Cancel/Send Buttons** - To close or confirm reset

---

## Examples

### Generating Password
```
1. Click "Reset Password & Send" for John Doe
2. Modal opens with email: john@example.com
3. Password field shows: a7kR2$mP9vQx
4. Click 🔄 Generate
5. Password changes to: 3xFj8@bL5tNm
```

### Custom Password
```
1. Clear the password field
2. Type: MySecurePass123!
3. System accepts (8+ chars)
4. Click "Reset & Send Email"
5. John receives email with: MySecurePass123!
```

### Copying Password
```
1. Password shows: K9pL2@qR7sB8
2. Click Copy button
3. Toast shows: "Copied to clipboard!"
4. Can paste elsewhere
5. Send to team member through secure channel
```

---

## Related Features

| Feature | Purpose | Location |
|---------|---------|----------|
| Tutor Requests | Approve new tutors & set initial password | `/admin/tutor-requests` |
| Team Passwords | Manage existing team member passwords | `/admin/team-passwords` ← YOU ARE HERE |
| Manage Team | Full team member management | `/admin/team` |
| User Profile | Team member sees their temp password | `/admin/profile` |

---

## Security Reminders

🛡️ **Your Responsibility:**
- Only reset passwords when necessary
- Send via secure channels when possible
- Monitor team member activity
- Report suspicious access attempts
- Keep password resets documented for audit trails

🔐 **System Protection:**
- All passwords are hashed with bcrypt
- 24-hour automatic expiry
- Admin authentication required
- Email verification via Resend
- Database encryption at rest (depends on hosting)

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Refresh team list | Top-right Refresh button |
| Show/hide password | Eye icon in modal |
| Copy password | Copy button in modal |
| Generate password | 🔄 Generate button |
| Close modal | Cancel button or ESC key |
| Reset & send | Alt + S (Save/Send) |

---

## FAQ

**Q: How long is the password valid?**
A: Passwords are permanent and don't expire. Team members can use them indefinitely or change them anytime.

**Q: Can I resend the same password?**
A: Yes, you can reset anytime to send a new password or resend the current one.

**Q: What if team member didn't receive email?**
A: Check spam folder, verify email address, or reset again. Contact support if persistent.

**Q: Can team members change their password?**
A: Yes! After first login, they should change their password in their profile to something they choose.

**Q: Can multiple people reset the same password?**
A: Yes. Each reset creates a new password.

---

## Need More Help?

- **Full Documentation:** See `TEAM_PASSWORD_MANAGEMENT.md` for technical details
- **API Details:** Check API endpoint documentation for developers
- **Support:** Contact your system administrator
- **Feedback:** Report issues or feature requests

