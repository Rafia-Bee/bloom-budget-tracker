# Email Integration Setup Guide

This guide explains how to set up email functionality for Bloom's password reset feature.

## Overview

Bloom uses SendGrid for transactional email delivery. The email service is optional in development (tokens are displayed in the UI for testing) but recommended for production.

## Features

- ✅ Password reset emails with branded HTML templates
- ✅ Secure token-based reset links
- ✅ Rate limiting (3 emails per hour per IP)
- ✅ Development mode with in-browser token display
- ✅ Production-ready email delivery
- ✅ Mobile-responsive email templates

## SendGrid Setup

### 1. Create SendGrid Account

1. Sign up at [SendGrid](https://signup.sendgrid.com/)
2. Verify your email address
3. Complete sender authentication (required for email delivery)

### 2. Create API Key

1. Go to Settings → API Keys
2. Click "Create API Key"
3. Name it "bloom-budget-production" (or similar)
4. Select "Full Access" or "Restricted Access" with Mail Send permission
5. Copy the API key immediately (you won't see it again)

### 3. Verify Sender Identity

For production email delivery, you must verify your sender:

**Option A: Single Sender Verification** (Easier, recommended for small projects)
1. Go to Settings → Sender Authentication → Single Sender Verification
2. Click "Create New Sender"
3. Fill in your email details (must be real email you control)
4. Verify the email sent to that address

**Option B: Domain Authentication** (Better for production)
1. Go to Settings → Sender Authentication → Domain Authentication
2. Follow the wizard to add DNS records to your domain
3. Wait for DNS propagation (up to 48 hours)
4. SendGrid will automatically verify

## Environment Configuration

### Backend Environment Variables

Add these to your `.env` file:

```env
# Email Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
FRONTEND_URL=http://localhost:3000
```

**Production values:**
```env
SENDGRID_API_KEY=your_production_api_key
SENDGRID_FROM_EMAIL=noreply@bloom-budget.com
FRONTEND_URL=https://your-production-frontend.pages.dev
```

### Configuration Details

- **SENDGRID_API_KEY**: Your SendGrid API key from step 2
- **SENDGRID_FROM_EMAIL**: Must match your verified sender email
- **FRONTEND_URL**: Used to construct password reset links

## Development Mode

When `SENDGRID_API_KEY` is not set, the application runs in development mode:

- ✅ Password reset tokens are displayed in the login screen
- ✅ No emails are actually sent
- ✅ Copy the token and use the test URL to reset passwords
- ⚠️ Warning logged: "SendGrid API key not configured"

**Development testing:**
1. Request password reset
2. Copy the token from the success message
3. Use the provided test URL: `http://localhost:3000/reset-password?token=YOUR_TOKEN`
4. Complete password reset

## Production Deployment

### Render (Backend)

1. Go to your Render service dashboard
2. Navigate to Environment
3. Add environment variables:
   - `SENDGRID_API_KEY` = your API key
   - `SENDGRID_FROM_EMAIL` = your verified sender email
   - `FRONTEND_URL` = your Cloudflare Pages frontend URL
4. Save changes (service will auto-redeploy)

### Cloudflare Pages (Frontend)

No frontend environment variables needed. The frontend URL is only used by the backend.

### Testing Production Emails

1. Deploy backend with SendGrid configuration
2. Set up CloudFlare Email Routing for support@bloom-tracker.app (see above)
3. Request password reset with a real email address
4. Check your inbox (and spam folder)
5. Verify the email:
   - Contains Bloom branding
   - Has working reset link
   - Shows 1-hour expiration
   - Mobile responsive design
   - Support email link works

## Email Template Customization

The password reset email template is in `backend/services/email_service.py`.

### Customize Branding

Edit the `send_password_reset_email` method:

```python
# Change logo/branding
<div class="logo">🌸 Bloom</div>

# Update colors
background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
background-color: #ec4899;

# Modify button text
<a href="{reset_link}" class="button">Reset Password</a>
```

### Add Logo Image

Replace the emoji with an image:

```html
<div class="header">
    <img src="https://your-cdn.com/bloom-logo.png" alt="Bloom" style="max-width: 200px;">
</div>
```

## Rate Limiting

Email sending is rate-limited to prevent abuse:

- **3 password reset emails per hour** per IP address
- Returns HTTP 429 (Too Many Requests) when limit exceeded
- Rate limit tracked in memory (resets on server restart)

For production with multiple servers, consider Redis-based rate limiting.

## Monitoring & Troubleshooting

### Check Email Delivery

SendGrid Dashboard → Activity Feed:
- View all sent emails
- Check delivery status
- See bounce/spam complaints
- Monitor click/open rates

### Common Issues

**1. Emails not received**
- Check spam/junk folder
- Verify sender authentication completed
- Check SendGrid Activity Feed for delivery status
- Verify `SENDGRID_FROM_EMAIL` matches verified sender

**2. "Email service is not configured" error**
- `SENDGRID_API_KEY` not set in environment
- API key invalid or expired
- Backend server needs restart after adding env vars

**3. "Too many requests" error**
- Rate limit exceeded (3 per hour)
- Wait an hour or increase `RATE_LIMITS['password_reset.forgot_password']` in `backend/utils/rate_limiter.py`

**4. Invalid sender email**
- SendGrid requires verified sender
- Complete Single Sender Verification or Domain Authentication
- Ensure `SENDGRID_FROM_EMAIL` matches verified address

### Logs

Backend logs email operations:

```
INFO: Email service initialized with SendGrid
INFO: Email sent successfully to user@example.com. Status: 202
ERROR: Failed to send password reset email: <error details>
WARNING: SendGrid API key not configured. Email sending is disabled.
```

## Email Forwarding with CloudFlare (Recommended)

For receiving emails at support@bloom-tracker.app and other domain emails, use CloudFlare Email Routing (free):

### Setup Steps

1. **Sign up for CloudFlare** (free plan)
   - Go to [cloudflare.com](https://www.cloudflare.com) and create account

2. **Add your domain**
   - Add bloom-tracker.app to CloudFlare
   - Select Free plan

3. **Update nameservers at Namecheap**
   - Use Cloudflare nameservers for domain management
   - Wait for DNS propagation (15 min - 48 hours, usually ~1 hour)

4. **Enable Email Routing in CloudFlare**
   - Dashboard → Email → Email Routing → Get Started
   - CloudFlare auto-adds required MX records

5. **Create forwarding rules**
   - Add destination: your Gmail address
   - Verify Gmail by clicking CloudFlare's verification email
   - Create routing rule: `support@bloom-tracker.app` → your Gmail
   - Add more addresses: `no-reply@bloom-tracker.app`, `hello@bloom-tracker.app`, etc.

6. **Test forwarding**
   - Send email to support@bloom-tracker.app
   - Should arrive in Gmail inbox within seconds

### Benefits

- ✅ Unlimited free email forwarding
- ✅ Multiple email addresses on your domain
- ✅ Better DNS performance
- ✅ Built-in DDoS protection
- ✅ Easy to manage forwarding rules

### Sending FROM support@bloom-tracker.app

Once email routing is set up:

1. **Verify sender in SendGrid**
   - Settings → Sender Authentication → Single Sender Verification
   - Use `support@bloom-tracker.app`
   - Verification email forwards to your Gmail
   - Click verification link

2. **Configure Gmail "Send As"** (optional)
   - Gmail Settings → Accounts → Add another email address
   - Name: "Bloom Support"
   - Email: support@bloom-tracker.app
   - SMTP: smtp.sendgrid.net, Port 587
   - Username: `apikey`
   - Password: Your SendGrid API key
   - TLS enabled

3. **Update backend configuration**
   - Set `SENDGRID_FROM_EMAIL=support@bloom-tracker.app` in production
   - Deploy with updated environment variable

## Alternative Email Providers

While SendGrid is recommended, the email service can be adapted for:

### AWS SES
- More cost-effective for high volume
- Requires AWS account and IAM credentials
- Replace `sendgrid` with `boto3` in `requirements.txt`
- Update `email_service.py` to use SES client

### Mailgun
- Similar pricing to SendGrid
- Good API documentation
- Replace `sendgrid` with `mailgun` in `requirements.txt`
- Update `email_service.py` to use Mailgun API

### SMTP
- Works with any email provider (Gmail, Outlook, etc.)
- Less reliable than dedicated services
- Use Flask-Mail or Python smtplib
- Not recommended for production

## Security Best Practices

- ✅ Never commit API keys to version control
- ✅ Use environment variables for all credentials
- ✅ Rotate API keys periodically
- ✅ Monitor SendGrid Activity Feed for abuse
- ✅ Keep rate limits enabled
- ✅ Use verified sender addresses only
- ✅ Consider bounce/complaint handling for production

## Cost Considerations

**SendGrid Free Tier:**
- 100 emails/day free
- Sufficient for small applications
- No credit card required

**SendGrid Paid Plans:**
- Start at $15/month for 40,000 emails
- Dedicated IP addresses available
- Advanced analytics and features

For most Bloom deployments, the free tier is adequate.

## Next Steps

1. ✅ Create SendGrid account and verify sender
2. ✅ Add environment variables to `.env` and production
3. ✅ Test in development mode first
4. ✅ Deploy to production and test with real email
5. ✅ Monitor SendGrid Activity Feed for delivery
6. ⚡ Optional: Customize email template branding
7. ⚡ Optional: Set up webhook for bounce handling

## Support Resources

- [SendGrid Documentation](https://docs.sendgrid.com/)
- [SendGrid API Reference](https://docs.sendgrid.com/api-reference/how-to-use-the-sendgrid-v3-api/authentication)
- [Flask Email Best Practices](https://flask.palletsprojects.com/en/latest/)
- [Email Template Testing](https://www.emailonacid.com/)

## Related Documentation

- [SECURITY.md](SECURITY.md) - Security practices and password reset flow
- [EMAIL_INTEGRATION_ISSUE.md](EMAIL_INTEGRATION_ISSUE.md) - Original feature specification
- [Main README](../README.md) - Project setup and deployment
