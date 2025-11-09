# EmailJS Setup Guide for Placement Portal

## 📧 Email Notification System

Your placement portal now includes an automated email notification system that sends updates to students when their application status changes.

## 🚀 Quick Setup Steps

### 1. Create EmailJS Account
1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Sign up for a free account
3. Verify your email address

### 2. Add Email Service (Outlook)
1. In EmailJS dashboard, go to **Email Services**
2. Click **Add New Service**
3. Choose **Outlook** (or **Outlook.com** / **Microsoft 365**)
4. Click **Connect Account** and sign in with your Microsoft/Outlook account
5. Grant all requested permissions when prompted
6. **Copy the Service ID** (e.g., `service_outlook123`)

### 3. Create Email Template
1. Go to **Email Templates**
2. Click **Create New Template**
3. Use this template structure:

```
Subject: Application Status Update - {{company_name}}

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

4. **Copy the Template ID** (e.g., `template_xyz789`)

### 4. Get Public Key
1. Go to **Account** → **General**
2. Find **Public Key** section
3. **Copy the Public Key** (e.g., `user_abcdef123`)

### 5. Update Configuration
1. Open `src/config/emailjs.js`
2. Replace the placeholder values:

```javascript
export const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_abc123',        // Your Service ID
  TEMPLATE_ID: 'template_xyz789',      // Your Template ID  
  PUBLIC_KEY: 'user_abcdef123'         // Your Public Key
};
```

## 📋 Template Variables

Make sure your EmailJS template includes these variables:
- `{{to_email}}` - Student's email address
- `{{to_name}}` - Student's name
- `{{company_name}}` - Company name
- `{{status}}` - New application status
- `{{message}}` - Detailed message
- `{{from_name}}` - Sender name (Placement Cell)

## 🔄 How It Works

### Manager Workflow:
1. Manager logs into placement dashboard
2. Views student applications in "Student Applications" section
3. Clicks **Approve**, **Reject**, or **On Hold** button
4. System updates Firestore database
5. **Email automatically sent to student**
6. Success confirmation shown

### Student Experience:
1. Student receives email notification instantly
2. Student logs into dashboard
3. **Status updates in real-time** (no refresh needed)
4. Recent updates shown in notification section

## 🎯 Features Included

### ✅ Real-time Updates
- **Instant status changes** without page refresh
- **Live notifications** in student dashboard
- **Color-coded status** indicators

### ✅ Email Notifications
- **Automatic email sending** on status change
- **Professional email templates**
- **Personalized messages** with student/company details

### ✅ Status Management
- **Three status types**: Approved, Rejected, On Hold
- **Disabled buttons** prevent duplicate actions
- **Audit trail** with timestamps and manager info

## 🔧 Troubleshooting

### Email Not Sending?
1. Check EmailJS credentials in `src/config/emailjs.js`
2. Verify template variables match exactly
3. Check browser console for errors
4. Ensure EmailJS service is active
5. **For Outlook**: Make sure you granted all permissions during account connection
6. **For Outlook**: Try disconnecting and reconnecting your Outlook account in EmailJS

### Outlook-Specific Issues
- **"Insufficient authentication scopes" error**: 
  - Go to EmailJS dashboard → Email Services
  - Click on your Outlook service
  - Click "Reconnect" or "Re-authorize"
  - Grant ALL permissions when prompted
  - Make sure to check all the permission boxes

- **"Service not found" error**:
  - Verify your Service ID is correct in `emailjs.js`
  - Check that the Outlook service is "Active" in EmailJS dashboard

- **Emails not arriving**:
  - Check your Outlook spam/junk folder
  - Verify the recipient email address is correct
  - Test sending from EmailJS dashboard first

### Status Not Updating?
1. Check Firebase Firestore rules
2. Verify internet connection
3. Check browser console for errors

## 📊 Testing the System

### Test Flow:
1. **Create student account** → Apply to placement drive
2. **Login as manager** → See application in dashboard
3. **Update status** → Click Approve/Reject/Hold
4. **Check student dashboard** → Status updates instantly
5. **Check email** → Student receives notification

## 🎉 Success!

Your placement portal now has a complete application management system with:
- ✅ **Real-time status updates**
- ✅ **Email notifications**
- ✅ **Professional UI/UX**
- ✅ **Complete audit trail**

Students will receive instant notifications and see live updates without refreshing the page!
