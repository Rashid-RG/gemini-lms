# Team Password Management - Testing & Verification Guide

## Pre-Deployment Testing

Run through these tests to ensure the feature works correctly before going live.

---

## 1. Navigation & Access Control

### 1.1 Accessing the Page
- [ ] Navigate to `/admin/team-passwords`
- [ ] **Expected:** Page loads without errors
- [ ] **Expected:** See list of team members

### 1.2 Non-Admin Access
- [ ] Log out from admin account
- [ ] Try to access `/admin/team-passwords` directly
- [ ] **Expected:** Redirected to login page
- [ ] **Expected:** Cannot see team passwords page

### 1.3 Sidebar Navigation
- [ ] Check admin sidebar
- [ ] **Expected:** "Team Passwords" link visible (with Key icon)
- [ ] **Expected:** Link placed after "Tutor Requests"
- [ ] **Expected:** Click link navigates to page

### 1.4 Role-Based Visibility
- [ ] As admin: Can see "Team Passwords" in sidebar ✓
- [ ] As super_admin: Can see "Team Passwords" in sidebar ✓
- [ ] As tutor: Cannot see "Team Passwords" in sidebar ✓

---

## 2. Team Member List

### 2.1 Loading Team Members
- [ ] Page loads and shows spinner briefly
- [ ] **Expected:** List of all team members appears
- [ ] **Expected:** No errors in console

### 2.2 Member Information Display
For each team member card, verify:
- [ ] Name displays correctly
- [ ] Email displays correctly
- [ ] Role badge shows (Tutor, Admin, etc.)
- [ ] Status badge shows (Active in green, Inactive in gray)
- [ ] Password age displays correctly

### 2.3 Password Age Format
- [ ] Just set: Shows "Just now"
- [ ] 1 hour ago: Shows "1h ago"
- [ ] 5 hours ago: Shows "5h ago"
- [ ] 1 day ago: Shows "1d 0h ago"
- [ ] Never set: Shows "Never set"

### 2.4 Refresh Button
- [ ] Click Refresh button (top right)
- [ ] **Expected:** Spinner appears
- [ ] **Expected:** List updates
- [ ] **Expected:** No duplicate entries
- [ ] **Expected:** Spinner disappears

### 2.5 Empty State
- [ ] If no team members, shows: "No team members found"
- [ ] Shows in centered gray box

---

## 3. Password Reset Modal

### 3.1 Opening Modal
- [ ] Click "Reset Password & Send" on a team member card
- [ ] **Expected:** Modal dialog opens
- [ ] **Expected:** Modal shows team member name
- [ ] **Expected:** Modal shows team member email
- [ ] **Expected:** Email field is read-only (grayed out)

### 3.2 Password Field
- [ ] Password input visible
- [ ] Field is empty or shows placeholder
- [ ] User can click in field and type
- [ ] Text is hidden by default (dots/asterisks shown)

### 3.3 Show/Hide Toggle
- [ ] Password input shows hidden (•••••)
- [ ] Click eye icon (🔍)
- [ ] **Expected:** Password becomes visible
- [ ] **Expected:** Icon changes to crossed-out eye
- [ ] Click again
- [ ] **Expected:** Password hides again

### 3.4 Generate Button
- [ ] Click "🔄 Generate" button
- [ ] **Expected:** Random 12-character password appears
- [ ] Click again
- [ ] **Expected:** Different password appears
- [ ] Password contains: letters, numbers, special chars
- [ ] Password is 12 characters long

### 3.5 Copy Button
- [ ] Type or generate password
- [ ] Click "Copy" button next to password field
- [ ] **Expected:** Toast appears: "Copied to clipboard!"
- [ ] Paste elsewhere (notepad, email, etc.)
- [ ] **Expected:** Password appears correctly

### 3.6 Password Validation
- [ ] Enter password with less than 8 characters: "Pass1"
- [ ] Try to click "Reset & Send Email"
- [ ] **Expected:** Toast error: "Password must be at least 8 characters"
- [ ] Button disabled (grayed out) if password < 8 chars

### 3.7 Info Box
- [ ] Modal shows blue info box
- [ ] Text reads: "Password will be sent... Team member can use it to log in"
- [ ] Box styled with blue background (not yellow)

### 3.8 Modal Buttons
- [ ] "Cancel" button closes modal without changes
- [ ] "Reset & Send Email" button enabled when password 8+ chars
- [ ] "Reset & Send Email" button disabled when password < 8 chars

---

## 4. Password Generation & Reset

### 4.1 Password Hashing
**Database Verification:**
- [ ] Connect to database
- [ ] Query ADMIN_TABLE where email = team member
- [ ] **Expected:** `temporaryPassword` field contains bcrypt hash
- [ ] **Expected:** Hash does NOT look like the plain password
- [ ] **Expected:** Hash starts with `$2a$` or `$2b$` (bcrypt format)

### 4.2 Timestamp Storage
- [ ] Query ADMIN_TABLE for same team member
- [ ] **Expected:** `passwordSetAt` contains recent timestamp
- [ ] **Expected:** Timestamp is in ISO format (2024-01-15T10:30:00Z)
- [ ] Compare with current time
- [ ] **Expected:** Difference is 0-5 seconds (network delay)

### 4.3 Request/Response
- [ ] Open browser DevTools (F12)
- [ ] Go to Network tab
- [ ] Click "Reset & Send Email" in modal
- [ ] **Expected:** POST request to `/api/admin/reset-team-password`
- [ ] **Expected:** Request body contains: email, password, sendEmail=true
- [ ] Look at response
- [ ] **Expected:** Status 200 OK
- [ ] **Expected:** Response JSON shows: `{ result: { success: true, emailSent: true } }`

### 4.4 Authorization Check
**Test with API directly:**
```bash
# Without authentication - should fail
curl -X POST http://localhost:3000/api/admin/reset-team-password
# Expected: 401 Unauthorized

# With valid session - should work
# (Use browser authenticated session)
```

### 4.5 Multiple Resets
- [ ] Reset password for same team member twice
- [ ] Each time, password should be different
- [ ] Each time, `passwordSetAt` should be updated
- [ ] New email should be sent each time

---

## 5. Email Delivery

### 5.1 Email Received
- [ ] Wait 5-10 seconds after clicking "Reset & Send"
- [ ] Check test team member email
- [ ] **Expected:** Email arrives in inbox
- [ ] **Expected:** Subject: "Your Temporary Password - Valid for 24 Hours"
- [ ] **Expected:** From: noreply@lms.com (or configured sender)

### 5.4 Email Content
Email should contain:
- [ ] Greeting: "Hello [Team Member Name]"
- [ ] Main message about password being set
- [ ] Credentials table with:
      - [ ] Email address (matching team member)
      - [ ] The password sent
- [ ] Blue info box about changing password in settings after login
- [ ] Instructions if didn't request this
- [ ] Professional footer

### 5.3 Email HTML Formatting
- [ ] Email displays nicely in Gmail, Outlook, etc.
- [ ] Colors are correct (yellow warning box)
- [ ] Table is properly formatted
- [ ] Font is readable
- [ ] Links are clickable (if any)

### 5.4 Password in Email
- [ ] Email shows plain text password (not hashed)
- [ ] Password matches what was shown in modal
- [ ] Password is the one we wanted to send
- [ ] Can copy from email and use to log in

### 5.5 Multiple Emails
- [ ] Reset same person twice
- [ ] Should receive 2 different emails
- [ ] Each with different password
- [ ] Each with current timestamp

---

## 6. Password Persistence

### 6.1 Fresh Password Status
- [ ] Just reset password
- [ ] Look at team member card
- [ ] Password age shows "Just now" or very recent
- [ ] Password is ready to use immediately

### 6.2 Password Permanence
**Test Approach:**
- [ ] Reset password for a team member
- [ ] Verify password is stored in database
- [ ] Team member logs in successfully
- [ ] Does NOT expire after any period
- [ ] Team member can use password anytime

---

## 7. User Experience

### 7.1 Toast Notifications
- [ ] On successful reset: Green toast "Password reset and email sent!"
- [ ] On password too short: Red toast "Password must be at least 8 characters"
- [ ] On error: Red toast with error message
- [ ] Toasts auto-dismiss after 3-4 seconds

### 7.2 Loading States
- [ ] When sending password, button shows "Sending..."
- [ ] When sending, button is disabled (grayed out)
- [ ] Spinner appears next to "Sending..." text
- [ ] After completion, button returns to normal state

### 7.3 Modal Behavior
- [ ] Modal backdrop (dark overlay) covers page
- [ ] Cannot click outside modal to close (unless ESC key)
- [ ] Modal appears centered on screen
- [ ] Modal has proper shadows/elevation
- [ ] Closing modal clears the form

### 7.4 Page State
- [ ] After reset, page doesn't refresh automatically
- [ ] You can reset another team member without reloading
- [ ] Data stays consistent across resets
- [ ] Can use Refresh button to reload if needed

---

## 8. Error Handling

### 8.1 Non-Existent Email
- [ ] In password modal, change team member email somehow
- [ ] (Or test API directly with fake email)
- [ ] Try to reset password
- [ ] **Expected:** Error toast: "Team member not found"

### 8.2 Database Connection Error
- [ ] (Simulate by disconnecting from DB)
- [ ] Try to reset password
- [ ] **Expected:** Error toast with meaningful message
- [ ] **Expected:** No crash or blank page

### 8.3 Email Service Error
- [ ] (Simulate by using invalid API key for Resend)
- [ ] Try to reset password
- [ ] **Expected:** Error message about email failure
- [ ] **Expected:** Database still updated (password stored)

### 8.4 Invalid Password Characters
- [ ] Password with special characters: Pass!@#123
- [ ] **Expected:** Accepts without error
- [ ] **Expected:** Stores correctly
- [ ] **Expected:** Email contains special chars correctly

---

## 9. Security Tests

### 9.1 Password Hashing Verification
- [ ] Never log plain text password to console
- [ ] Network DevTools shows password in plain text in request
- [ ] (This is expected - HTTPS protects in transit)
- [ ] Database shows bcrypt hash, not plain text

### 9.2 Authentication Check
- [ ] Try API with non-authenticated user
- [ ] **Expected:** 401 Unauthorized
- [ ] Try with regular user (not admin)
- [ ] **Expected:** 403 Forbidden

### 9.3 CSRF Protection
- [ ] Reset password works normally
- [ ] (Framework should handle CSRF automatically)
- [ ] No CSRF token errors in console

### 9.4 SQL Injection Test
- [ ] In email field, try: `admin' OR '1'='1`
- [ ] **Expected:** Treated as literal string
- [ ] **Expected:** No errors or security issues
- [ ] (ORM should protect, but good to verify)

---

## 10. Browser Compatibility

Test in multiple browsers:

### Chrome/Edge
- [ ] Page loads correctly
- [ ] Modal works
- [ ] Copy to clipboard works
- [ ] All styling correct

### Firefox
- [ ] All features work
- [ ] Modal displays correctly

### Safari
- [ ] Page loads on Mac
- [ ] Mobile Safari on iPhone works

### Mobile Browsers
- [ ] Team member list scrolls properly
- [ ] Modal opens correctly
- [ ] Can type password on mobile
- [ ] Copy button works on mobile

---

## 11. Performance Tests

### 11.1 Loading Speed
- [ ] Page loads in < 2 seconds
- [ ] Team member list loads in < 1 second
- [ ] No jank or stuttering

### 11.2 Large Team List
- [ ] Test with 50+ team members
- [ ] List still loads smoothly
- [ ] No slowdown when scrolling
- [ ] Search/filter responsive (if implemented)

### 11.3 Password Generation Speed
- [ ] Generate button responds immediately
- [ ] Multiple generates work without delay

---

## 12. Integration Tests

### 12.1 Works with Tutor Approval
- [ ] Approve tutor in `/admin/tutor-requests`
- [ ] Tutor account created with temp password
- [ ] Tutor appears in Team Passwords list
- [ ] Can reset their password from Team Passwords

### 12.2 Works with User Login
- [ ] Tutor receives temp password email
- [ ] Tutor uses email + password to log in
- [ ] Can access dashboard/profile after login
- [ ] Can update profile or courses

### 12.3 Profile Shows Password
- [ ] Team member logs in with password
- [ ] Goes to their profile page
- [ ] Should see password in their account settings
- [ ] Can change password anytime

---

## 13. Data Integrity

### 13.1 Duplicate Prevention
- [ ] Reset password for same person twice
- [ ] Only one record in database
- [ ] Only latest password/timestamp saved

### 13.2 Unique Constraints
- [ ] Team member record stays unique
- [ ] No duplicate entries created
- [ ] Email field matches exactly

### 13.3 Timezone Consistency
- [ ] Reset password
- [ ] Check `passwordSetAt` timestamp
- [ ] Should match server timezone (usually UTC)
- [ ] Should be consistent across resets

---

## 14. Documentation Tests

### 14.1 Code Comments
- [ ] API endpoints have comment documentation
- [ ] Component has clear prop documentation
- [ ] Complex logic is explained

### 14.2 README/Guide
- [ ] TEAM_PASSWORD_MANAGEMENT.md is complete
- [ ] TEAM_PASSWORD_QUICK_START.md is clear
- [ ] Examples are accurate

---

## 15. Final Checklist

Before deploying to production:

- [ ] All 15 test sections passed
- [ ] No console errors in DevTools
- [ ] No unhandled promise rejections
- [ ] All async operations properly handled
- [ ] Loading states all working
- [ ] Error messages are helpful
- [ ] Email templates look good
- [ ] Database structure correct
- [ ] API endpoints secure
- [ ] No sensitive data logged
- [ ] Documentation complete
- [ ] Code reviewed by team
- [ ] Ready for user testing
- [ ] Database backups in place
- [ ] Rollback plan documented

---

## Test Data

Use these accounts for testing:

```
Admin Account:
Email: admin@test.com
Password: (from login)

Test Tutors:
1. john.doe@example.com (created via tutor requests)
2. jane.smith@example.com (created via tutor requests)
3. bob.wilson@example.com (created via tutor requests)
```

---

## Known Limitations

⚠️ **Current Limitations:**
- [ ] Cannot bulk reset multiple passwords at once
- [ ] No audit log of password resets
- [ ] No password strength indicator in UI
- [ ] Cannot schedule forced password changes

(These could be future enhancements)

---

## Sign-Off

| Role | Tester | Date | Status |
|------|--------|------|--------|
| Developer | | | ☐ Passed |
| QA | | | ☐ Passed |
| Product Owner | | | ☐ Approved |
| Security | | | ☐ Reviewed |

---

## Issues Found

Log any issues discovered during testing:

### Issue #1
- **Date:** 
- **Severity:** (Critical/High/Medium/Low)
- **Description:** 
- **Steps to Reproduce:** 
- **Expected:** 
- **Actual:** 
- **Status:** (Open/Fixed/Verified)

*(Add more as needed)*

---

## Deployment Checklist

Before going live:

- [ ] All tests passed
- [ ] All issues resolved
- [ ] Database migrations applied: `npx drizzle-kit push:pg`
- [ ] Environment variables configured
- [ ] Resend API key verified
- [ ] Backup of production database taken
- [ ] Monitoring set up for errors
- [ ] Team briefed on new feature
- [ ] Documentation shared with admins
- [ ] Rollback plan tested
- [ ] Ready to deploy!

