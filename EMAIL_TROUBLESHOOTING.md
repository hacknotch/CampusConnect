# 📧 Email Troubleshooting Guide

## Problem: EmailJS Returns 200 OK but No Email Received

If EmailJS is returning 200 OK (success) but you're not receiving emails, follow these steps:

### ✅ Step 1: Check EmailJS Dashboard
1. Go to https://www.emailjs.com/
2. Login to your dashboard
3. Go to **"Email Logs"** or **"Activity"** section
4. Check if emails are being sent:
   - Look for recent email attempts
   - Check the status (Sent, Failed, Pending)
   - Check the recipient email address

### ✅ Step 2: Verify Template Variables
1. Go to **Email Templates** in EmailJS
2. Open your template (`template_q97nicq`)
3. Make sure it has EXACTLY these variables:
   - `{{to_email}}` - Must be in the template
   - `{{to_name}}`
   - `{{company_name}}`
   - `{{status}}`
   - `{{message}}`
   - `{{from_name}}`

4. **Test the template directly in EmailJS:**
   - Click "Test" button on your template
   - Fill in test values:
     - to_email: Your own email address
     - to_name: Your name
     - company_name: Test Company
     - status: Approved
     - message: Test message
     - from_name: Placement Cell
   - Click "Send Test Email"
   - **Check if you receive the test email**

### ✅ Step 3: Check Spam/Junk Folder
- **Gmail**: Check "Spam" folder
- **Outlook**: Check "Junk Email" folder
- **Other**: Check your spam/junk folder
- Emails might be filtered as spam

### ✅ Step 4: Verify Email Address
1. Check browser console (F12) when sending email
2. Look for the log: `Email sent to: [email address]`
3. Verify the email address is correct
4. Try sending to your own email address first to test

### ✅ Step 5: Check Gmail Service Status
1. Go to EmailJS → Email Services
2. Find your Gmail service (`service_iam1mzn`)
3. Check:
   - Status should be "Active"
   - Connected account should show your Gmail
   - No error messages
4. If there are errors, click "Reconnect"

### ✅ Step 6: Verify EmailJS Quota
1. Go to EmailJS → Account → General
2. Check your email quota
3. Free plan: 200 emails/month
4. If quota exceeded, upgrade or wait for reset

### ✅ Step 7: Check Browser Console
1. Open browser console (F12)
2. Go to "Console" tab
3. When you click "Approve" or "Reject", check for:
   - `📧 Sending email with params: {...}`
   - `✅ EmailJS Response: {...}`
   - `✅ Email sent successfully!`
   - Any error messages

### ✅ Step 8: Common Issues & Solutions

#### Issue: Template variables not matching
**Solution:**
- Variable names in template must match EXACTLY:
  - `{{to_email}}` not `{{email}}`
  - `{{to_name}}` not `{{name}}`
  - Case-sensitive: `{{company_name}}` not `{{Company_Name}}`

#### Issue: Email going to spam
**Solution:**
- Check spam folder
- Add sender to contacts
- Use a verified domain (if possible)
- Check email content (avoid spam trigger words)

#### Issue: Wrong recipient email
**Solution:**
- Verify student email in Firestore
- Check console logs for actual email being sent
- Test with your own email first

#### Issue: Gmail service not properly connected
**Solution:**
1. Go to EmailJS → Email Services
2. Delete the Gmail service
3. Create a new Gmail service
4. Reconnect with ALL permissions
5. Update Service ID in `emailjs.js`

### ✅ Step 9: Test Email Manually
1. Go to EmailJS → Email Templates
2. Open your template
3. Click "Test" button
4. Fill in:
   ```
   to_email: your-email@example.com
   to_name: Your Name
   company_name: Test Company
   status: Approved
   message: This is a test email
   from_name: Placement Cell
   ```
5. Click "Send Test Email"
6. Check your inbox (and spam folder)
7. If test email works → Issue is in the code
8. If test email doesn't work → Issue is with EmailJS/Gmail setup

### ✅ Step 10: Debug Code
Check the browser console logs when sending:
- `📧 Sending email with params:` - Shows what's being sent
- `✅ EmailJS Response:` - Shows EmailJS response
- `✅ Email sent to:` - Shows recipient email

## Quick Checklist

- [ ] EmailJS returns 200 OK
- [ ] Template variables match exactly
- [ ] Test email from EmailJS dashboard works
- [ ] Checked spam/junk folder
- [ ] Email address is correct
- [ ] Gmail service is "Active" in EmailJS
- [ ] Email quota not exceeded
- [ ] Browser console shows email sent
- [ ] No error messages in console

## Still Not Working?

1. **Check EmailJS Email Logs:**
   - Go to EmailJS dashboard
   - Check "Email Logs" or "Activity"
   - See if emails are actually being sent
   - Check delivery status

2. **Verify Template:**
   - Make sure template is saved
   - Check template is linked to correct service
   - Verify all variables are in the template

3. **Test with Different Email:**
   - Try sending to a different email address
   - Use your own email to test
   - Check if issue is with specific email

4. **Contact EmailJS Support:**
   - If everything looks correct but emails not arriving
   - Check EmailJS documentation
   - Contact EmailJS support

## Most Common Issue

**Email going to spam folder** - Always check spam/junk folder first!

