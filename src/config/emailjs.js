// EmailJS Configuration
// Read from environment variables only (no hardcoded IDs/keys)
export const EMAILJS_CONFIG = {
  SERVICE_ID: process.env.REACT_APP_EMAILJS_SERVICE_ID,
  TEMPLATE_ID: process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
  PUBLIC_KEY: process.env.REACT_APP_EMAILJS_PUBLIC_KEY,
};

// Instructions to set up EmailJS with Gmail:
// 1. Go to https://www.emailjs.com/
// 2. Create a free account
// 3. Add Gmail email service and copy SERVICE_ID
// 4. Create an email template and copy TEMPLATE_ID
// 5. Copy PUBLIC_KEY from Account → General → API Keys
// 6. Put them into your .env.local as REACT_APP_EMAILJS_* vars
// 7. Restart your React app after updating

// Sample Email Template:
/*
Subject: Application Status Update - {{company_name}}

Hi {{to_name}},

Your placement application status has been updated.

{{message}}

Company: {{company_name}}
Status: {{status}}

Please check the placement portal for more details.

Best regards,
{{from_name}}
Placement Cell
*/
