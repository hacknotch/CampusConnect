# 📧 Quick Outlook Setup Guide for EmailJS

## Step-by-Step: Setting Up Outlook with EmailJS

### Step 1: Create EmailJS Account (2 minutes)
1. Go to **https://www.emailjs.com/**
2. Click **"Sign Up"** (free account)
3. Sign up with email or Google
4. Verify your email address

### Step 2: Add Outlook Service (1 minute)
1. Login to EmailJS dashboard
2. Click **"Email Services"** in left menu
3. Click **"Add New Service"** button
4. Select **"Outlook"** or **"Outlook.com"** from the list
5. Click **"Connect Account"**
6. Sign in with your **Microsoft/Outlook account**
7. **IMPORTANT**: When asked for permissions, click **"Accept"** or **"Allow"** for ALL permissions
8. After connection, you'll see your **Service ID** (e.g., `service_outlook_abc123`)
9. **Copy this Service ID** - you'll need it later

### Step 3: Create Email Template (2 minutes)
1. Click **"Email Templates"** in left menu
2. Click **"Create New Template"**
3. **Template Name**: "Placement Status Update"
4. **Subject**: `Application Status Update - {{company_name}}`
5. **Content** (copy and paste this):

```
Hi {{to_name}},

Your placement application status has been updated.

{{message}}

Company: {{company_name}}
New Status: {{status}}

Please log in to the placement portal to view more details.

Best regards,
{{from_name}}
College Placement Cell
```

6. Click **"Save"**
7. **Copy the Template ID** (e.g., `template_xyz789`)

### Step 4: Get Public Key (30 seconds)
1. Click **"Account"** → **"General"** in left menu
2. Scroll to **"API Keys"** section
3. **Copy the Public Key** (e.g., `user_abcdef123456`)

### Step 5: Update Your Code (1 minute)
1. Open file: `CampusConnect/src/config/emailjs.js`
2. Replace the three values:

```javascript
export const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_YOUR_OUTLOOK_SERVICE_ID',    // Paste your Outlook Service ID
  TEMPLATE_ID: 'template_YOUR_TEMPLATE_ID',        // Paste your Template ID
  PUBLIC_KEY: 'YOUR_PUBLIC_KEY'                    // Paste your Public Key
};
```

3. **Save the file**
4. **Restart your React app** (stop with Ctrl+C, then run `npm start` again)

### Step 6: Test It! (1 minute)
1. Login as **Manager**
2. Go to **Student Applications**
3. Click **"Approve"** or **"Reject"** on any application
4. Check browser console (F12) for any errors
5. Check the student's email inbox
6. Student should receive email notification!

## ✅ Success Checklist

- [ ] EmailJS account created
- [ ] Outlook service connected in EmailJS
- [ ] Email template created with all variables
- [ ] Service ID, Template ID, and Public Key copied
- [ ] Credentials updated in `emailjs.js`
- [ ] React app restarted
- [ ] Test email sent successfully

## 🔧 Common Issues & Solutions

### Issue: "Insufficient authentication scopes"
**Solution:**
1. Go to EmailJS → Email Services
2. Click on your Outlook service
3. Click **"Reconnect"** or **"Re-authorize"**
4. **Grant ALL permissions** when prompted
5. Make sure all checkboxes are checked

### Issue: "Service not found"
**Solution:**
- Double-check your Service ID is correct
- Make sure there are no extra spaces
- Verify the service is "Active" in EmailJS dashboard

### Issue: "Email not sending"
**Solution:**
1. Check browser console (F12) for error messages
2. Verify all three IDs are correct in `emailjs.js`
3. Make sure you saved the file and restarted the app
4. Test the template directly in EmailJS dashboard first
5. Check Outlook spam/junk folder

### Issue: "Template variables not working"
**Solution:**
- Make sure your template uses EXACT variable names:
  - `{{to_email}}` (not `{{email}}`)
  - `{{to_name}}` (not `{{name}}`)
  - `{{company_name}}`
  - `{{status}}`
  - `{{message}}`
  - `{{from_name}}`

## 🎉 That's It!

Once configured, emails will automatically send when managers update application status. The warning message will disappear from the manager dashboard.

## Need Help?

- Check `EMAILJS_SETUP.md` for more details
- EmailJS Documentation: https://www.emailjs.com/docs/
- Check browser console (F12) for specific error messages

