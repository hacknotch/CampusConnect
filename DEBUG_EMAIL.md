# 🔍 Email Debugging Steps

## Problem: EmailJS Returns 200 OK but No Email Received

Follow these steps in order:

### Step 1: Check Browser Console (MOST IMPORTANT)
1. Open your browser console (F12)
2. Go to Console tab
3. Try to send an email (click Approve/Reject)
4. Look for these logs:
   - `📧 Sending email with params:` - Shows what email address is being used
   - `✅ EmailJS Response:` - Shows the response from EmailJS
   - `✅ Email sent to:` - Confirms the recipient email

**What to check:**
- Is the email address correct?
- Is the email address in the right format? (e.g., `student@example.com`)
- Any error messages?

### Step 2: Check EmailJS Dashboard - Email Logs
1. Go to https://www.emailjs.com/
2. Login
3. Go to **"Email Logs"** or **"Activity"** section
4. Check recent emails:
   - Status: Sent, Failed, Pending
   - Recipient email address
   - Timestamp
   - Any error messages

### Step 3: Test Template Directly in EmailJS
1. Go to EmailJS → **Email Templates**
2. Find your template: `template_q97nicq`
3. Click **"Test"** button
4. Fill in these values:
   ```
   to_email: your-email@example.com (USE YOUR REAL EMAIL)
   to_name: Your Name
   company_name: Test Company
   status: Approved
   message: This is a test email from EmailJS
   from_name: Placement Cell
   ```
5. Click **"Send Test Email"**
6. Wait 1-2 minutes
7. Check your inbox AND spam folder

**Result:**
- ✅ **If you receive the test email:** Template is working, issue is in the code or email address
- ❌ **If you don't receive the test email:** Issue is with EmailJS/Gmail setup

### Step 4: Verify Template Variables
Your template MUST have EXACTLY these variables (case-sensitive):

```
{{to_email}}    ← Must be in template
{{to_name}}
{{company_name}}
{{status}}
{{message}}
{{from_name}}
```

**How to check:**
1. Go to EmailJS → Email Templates
2. Open `template_q97nicq`
3. Check the template content
4. Make sure ALL variables are present
5. Variable names must match EXACTLY (including underscores and case)

### Step 5: Check Spam/Junk Folder
- **Gmail:** Check "Spam" folder
- **Outlook:** Check "Junk Email" folder  
- **Yahoo:** Check "Spam" folder
- **Other:** Check spam/junk folder

**Important:** Emails from EmailJS often go to spam, especially on first send!

### Step 6: Verify Student Email Address
1. Check the browser console log: `📧 Sending email with params:`
2. Look at `to_email` value
3. Verify this email exists and is correct
4. Try sending to YOUR email address first to test

### Step 7: Check Gmail Service Status
1. Go to EmailJS → **Email Services**
2. Find your Gmail service (`service_iam1mzn`)
3. Check:
   - Status: Should be **"Active"** (green)
   - Connected account: Should show your Gmail address
   - No error messages
4. If there are errors:
   - Click "Reconnect"
   - Grant ALL permissions
   - Check all permission boxes

### Step 8: Check EmailJS Quota
1. Go to EmailJS → **Account** → **General**
2. Check your email quota:
   - Free plan: 200 emails/month
   - If quota exceeded, upgrade or wait for reset

### Step 9: Common Issues & Solutions

#### Issue 1: Template Variables Don't Match
**Symptom:** EmailJS returns 200 OK but email is blank or has `{{variable}}` text

**Solution:**
- Check template variables match EXACTLY
- Variable names are case-sensitive
- Must use underscores: `{{to_email}}` not `{{toEmail}}`

#### Issue 2: Email Going to Spam
**Symptom:** EmailJS says sent but not in inbox

**Solution:**
- Check spam folder
- Add sender to contacts
- Mark as "Not Spam" if found in spam

#### Issue 3: Wrong Email Address
**Symptom:** Email sent to wrong address

**Solution:**
- Check browser console for `to_email` value
- Verify email in Firestore database
- Check if `application.studentEmail` is correct

#### Issue 4: Gmail Service Not Connected
**Symptom:** Errors about authentication

**Solution:**
- Reconnect Gmail service in EmailJS
- Grant ALL permissions
- Check service status is "Active"

### Step 10: Quick Test Checklist

Before contacting support, verify:

- [ ] Browser console shows email sent successfully
- [ ] EmailJS dashboard shows email in logs
- [ ] Test email from EmailJS dashboard works
- [ ] Checked spam/junk folder
- [ ] Email address is correct
- [ ] Template variables match exactly
- [ ] Gmail service is "Active" in EmailJS
- [ ] Email quota not exceeded
- [ ] Tried sending to your own email first

## Still Not Working?

1. **Copy the exact error message** from browser console
2. **Screenshot** the EmailJS dashboard logs
3. **Try sending a test email** from EmailJS dashboard
4. **Check** if test email works (this will tell us if issue is with EmailJS or code)

## Most Likely Issue

Based on "200 OK but no email received":
- **90% chance:** Email is in spam folder
- **5% chance:** Template variables don't match
- **5% chance:** Email address is wrong or doesn't exist

**Action:** Check spam folder first! 🎯

