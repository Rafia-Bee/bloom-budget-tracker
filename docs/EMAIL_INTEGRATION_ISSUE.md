# Email Integration for Password Reset Feature

## Issue Title
**Feature Request: Add Email Integration for Password Reset Functionality**

## Issue Description

Currently, the password reset feature generates secure tokens but only displays them in the UI for manual copy-paste testing. We need to integrate actual email sending capabilities to provide a production-ready password reset flow.

## Current State
- ✅ Password reset tokens are generated securely
- ✅ Token validation and expiration work correctly
- ✅ Frontend modal and reset page are implemented
- ✅ Backend API endpoints are functional
- ❌ No email sending - tokens only shown in development UI

## Requirements

### Core Email Functionality
1. **Email Service Integration**
   - Choose email provider (SendGrid, AWS SES, Mailgun, or SMTP)
   - Configure API keys and authentication
   - Add email service configuration to environment variables

2. **Email Templates**
   - Design HTML email template for password reset
   - Include branding consistent with Bloom UI
   - Add fallback plain text version
   - Template should include:
     - Bloom logo/branding
     - Clear call-to-action button
     - Reset link with token
     - Expiration time (1 hour)
     - Security notice about not sharing link

3. **Environment Configuration**
   - Add email service credentials to `.env`
   - Update production deployment configuration
   - Add email settings to config classes

### Implementation Tasks

#### Backend Changes
- [ ] Install email service SDK (e.g., `sendgrid`, `boto3` for SES)
- [ ] Create `backend/services/email_service.py` module
- [ ] Add email configuration to `backend/config.py`
- [ ] Create email templates in `backend/templates/emails/`
- [ ] Update `password_reset.py` to send actual emails
- [ ] Remove development token display from API response
- [ ] Add email sending error handling and logging

#### Frontend Changes
- [ ] Remove development token display from success messages
- [ ] Update success message to standard "Check your email" text
- [ ] Add email resend functionality (with rate limiting)
- [ ] Improve user feedback for email sending status

#### Configuration & Security
- [ ] Add email service environment variables
- [ ] Configure rate limiting for email sending
- [ ] Add email template validation
- [ ] Set up email delivery monitoring
- [ ] Add bounce/complaint handling

#### Testing & Documentation
- [ ] Test email delivery in development
- [ ] Test email templates across different email clients
- [ ] Add email service setup to deployment documentation
- [ ] Create email template customization guide
- [ ] Add troubleshooting guide for email issues

## Technical Considerations

### Email Service Options
1. **SendGrid** (Recommended)
   - Easy integration with Flask
   - Good delivery rates
   - Template management
   - Analytics and tracking

2. **AWS SES**
   - Cost-effective for high volume
   - Requires AWS account setup
   - Good for existing AWS infrastructure

3. **Mailgun**
   - Developer-friendly API
   - Good documentation
   - Reliable delivery

4. **SMTP**
   - Works with any email provider
   - More configuration required
   - Less reliable than dedicated services

### Security Considerations
- Rate limiting (max 3 reset emails per hour per email address)
- Email validation and sanitization
- Secure storage of email service credentials
- Bounce and complaint handling
- Email content should not reveal if email exists in system

### Performance Considerations
- Async email sending to avoid blocking API responses
- Email queue for high volume handling
- Retry logic for failed email delivery
- Monitoring and alerting for email service issues

## Acceptance Criteria
- [ ] Users receive password reset emails when requesting password reset
- [ ] Emails contain properly formatted reset links
- [ ] Development token display is removed from production
- [ ] Email templates are mobile-responsive and accessible
- [ ] Rate limiting prevents abuse
- [ ] Failed email sending is handled gracefully
- [ ] Email service credentials are properly secured
- [ ] Documentation is updated for deployment setup

## Priority
**Medium-High** - Important for production deployment but not blocking current development

## Labels
- `feature`
- `email`
- `security`
- `backend`
- `production-ready`

## Estimated Effort
**Medium (8-12 hours)** - Includes service setup, template creation, testing, and documentation

---

**Note:** This issue should be created in the GitHub repository for proper tracking and collaboration.