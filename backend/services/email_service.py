"""
Bloom - Email Service

Handles email sending functionality using SendGrid.
Provides methods for sending transactional emails like password resets.
"""

import os
import logging
from typing import Optional, Dict, Any
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import (
    Mail,
    Email,
    To,
    Content,
    PlainTextContent,
    HtmlContent,
)

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SendGrid."""

    def __init__(self, api_key: Optional[str] = None, from_email: Optional[str] = None):
        """
        Initialize the email service.

        Args:
            api_key: SendGrid API key (defaults to SENDGRID_API_KEY env var)
            from_email: Sender email address (defaults to SENDGRID_FROM_EMAIL env var)
        """
        self.api_key = api_key or os.getenv("SENDGRID_API_KEY")
        self.from_email = from_email or os.getenv(
            "SENDGRID_FROM_EMAIL", "noreply@bloom-budget.com"
        )
        self.enabled = bool(self.api_key)

        if not self.enabled:
            logger.warning(
                "SendGrid API key not configured. Email sending is disabled."
            )
        else:
            logger.info("Email service initialized with SendGrid")

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        plain_text_content: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send an email using SendGrid.

        Args:
            to_email: Recipient email address
            subject: Email subject line
            html_content: HTML version of the email
            plain_text_content: Plain text version (optional, extracted from HTML if not provided)

        Returns:
            Dict with success status and message/error

        Raises:
            Exception: If email sending fails and error handling is needed by caller
        """
        if not self.enabled:
            logger.warning(
                f"Email sending disabled. Would have sent to {to_email}: {subject}"
            )
            return {"success": False, "error": "Email service is not configured"}

        try:
            # Create message
            message = Mail(
                from_email=Email(self.from_email, "Bloom Budget"),
                to_emails=To(to_email),
                subject=subject,
            )

            # Add plain text content
            if plain_text_content:
                message.content = [
                    PlainTextContent(plain_text_content),
                    HtmlContent(html_content),
                ]
            else:
                message.content = HtmlContent(html_content)

            # Send email
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)

            logger.info(
                f"Email sent successfully to {to_email}. Status: {response.status_code}"
            )

            return {
                "success": True,
                "message": "Email sent successfully",
                "status_code": response.status_code,
            }

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return {"success": False, "error": str(e)}

    def send_password_reset_email(
        self, to_email: str, reset_token: str, frontend_url: str
    ) -> Dict[str, Any]:
        """
        Send a password reset email with a reset link.

        Args:
            to_email: Recipient email address
            reset_token: Password reset token
            frontend_url: Frontend URL for constructing reset link

        Returns:
            Dict with success status and message/error
        """
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"

        # HTML email content
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password - Bloom Budget</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 0;
                    background-color: #f5f5f5;
                }}
                .container {{
                    max-width: 600px;
                    margin: 40px auto;
                    background-color: #ffffff;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                }}
                .header {{
            background: linear-gradient(135deg, #ffc1e0 0%, #d4b5ff 100%);
                    padding: 40px 20px;
                    text-align: center;
                }}
                .logo {{
                    font-size: 32px;
                    font-weight: bold;
                    color: #ffffff;
                    margin: 0;
                }}
                .content {{
                    padding: 40px 30px;
                }}
                h1 {{
                    color: #1f2937;
                    font-size: 24px;
                    margin: 0 0 20px 0;
                }}
                p {{
                    margin: 0 0 20px 0;
                    color: #4b5563;
                }}
                .button {{
            display: inline-block;
                    padding: 14px 32px;
                    background-color: #ff9dcd;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    margin: 20px 0;
                    transition: background-color 0.3s;
                    box-shadow: 0 2px 4px rgba(255, 157, 205, 0.3);
                }}
                .button:hover {{
            background-color: #ff7cbd;
                }}
                .expiry-notice {{
            background-color: #fff5e6;
                    border-left: 4px solid #ffcc99;
                    padding: 12px 16px;
                    margin: 20px 0;
                    border-radius: 4px;
                }}
                .security-notice {{
                    font-size: 14px;
                    color: #6b7280;
                    margin-top: 30px;
                    padding-top: 30px;
                    border-top: 1px solid #e5e7eb;
                }}
                .footer {{
                    background-color: #f9fafb;
                    padding: 20px;
                    text-align: center;
                    font-size: 14px;
                    color: #6b7280;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🌸 Bloom</div>
                </div>
                <div class="content">
                    <h1>Reset Your Password</h1>
                    <p>You recently requested to reset your password for your Bloom Budget account. Click the button below to reset it:</p>

                    <center>
                        <a href="{reset_link}" class="button">Reset Password</a>
                    </center>

                    <div class="expiry-notice">
                        <strong>⏰ This link expires in 1 hour</strong><br>
                        For your security, this password reset link will expire after one hour.
                    </div>

                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background-color: #f3f4f6; padding: 12px; border-radius: 4px; font-size: 14px; font-family: monospace;">
                        {reset_link}
                    </p>

                    <div class="security-notice">
                        <strong>🔒 Security Tips:</strong>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li>Never share this link with anyone</li>
                            <li>If you didn't request this reset, please ignore this email</li>
                            <li>Your password will remain unchanged unless you complete the reset process</li>
                        </ul>
                    </div>
                </div>
                <div class="footer">
                    <p>This email was sent from Bloom Budget</p>
                    <p>Questions? Email us at <a href="mailto:support@bloom-tracker.app" style="color: #ff9dcd;">support@bloom-tracker.app</a></p>
                </div>
            </div>
        </body>
        </html>
        """

        # Plain text fallback
        plain_text_content = f"""
        Reset Your Password - Bloom Budget

        You recently requested to reset your password for your Bloom Budget account.

        To reset your password, visit this link:
        {reset_link}

        ⏰ This link expires in 1 hour

        If you didn't request this reset, please ignore this email.
        Your password will remain unchanged unless you complete the reset process.

        Security Tips:
        - Never share this link with anyone
        - If you didn't request this reset, you can safely ignore this email

        ---
        Bloom Budget
        Questions? Email us at support@bloom-tracker.app
        """

        return self.send_email(
            to_email=to_email,
            subject="Reset Your Password - Bloom Budget",
            html_content=html_content,
            plain_text_content=plain_text_content,
        )

    def send_welcome_email(
        self, to_email: str, user_name: str, frontend_url: str
    ) -> Dict[str, Any]:
        """
        Send a welcome email to newly registered users.

        Args:
            to_email: Recipient email address
            user_name: User's name or email
            frontend_url: Frontend URL for login link

        Returns:
            Dict with success status and message/error
        """
        login_link = f"{frontend_url}/login"

        # HTML email content with pastel theme
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Bloom Budget</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 0;
                    background-color: #fef8f5;
                }}
                .container {{
                    max-width: 600px;
                    margin: 40px auto;
                    background-color: #ffffff;
                    border-radius: 16px;
                    box-shadow: 0 4px 12px rgba(255, 157, 205, 0.15);
                    overflow: hidden;
                }}
                .header {{
                    background: linear-gradient(135deg, #ffc1e0 0%, #d4b5ff 100%);
                    padding: 50px 20px;
                    text-align: center;
                }}
                .logo {{
                    font-size: 48px;
                    margin-bottom: 10px;
                }}
                .header-text {{
                    font-size: 28px;
                    font-weight: bold;
                    color: #ffffff;
                    margin: 0;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }}
                .content {{
                    padding: 40px 30px;
                }}
                h1 {{
                    color: #ff9dcd;
                    font-size: 26px;
                    margin: 0 0 20px 0;
                }}
                p {{
                    margin: 0 0 20px 0;
                    color: #4b5563;
                    font-size: 16px;
                }}
                .button {{
                    display: inline-block;
                    padding: 14px 32px;
                    background-color: #ff9dcd;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    margin: 20px 0;
                    transition: background-color 0.3s;
                    box-shadow: 0 2px 4px rgba(255, 157, 205, 0.3);
                }}
                .button:hover {{
                    background-color: #ff7cbd;
                }}
                .features {{
                    background-color: #fef8f5;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 30px 0;
                }}
                .features h2 {{
                    color: #ff9dcd;
                    font-size: 20px;
                    margin: 0 0 15px 0;
                }}
                .feature-item {{
                    display: flex;
                    align-items: start;
                    margin-bottom: 12px;
                }}
                .feature-icon {{
                    font-size: 20px;
                    margin-right: 10px;
                }}
                .footer {{
                    background-color: #fef8f5;
                    padding: 25px;
                    text-align: center;
                    font-size: 14px;
                    color: #9ca3af;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🌸</div>
                    <div class="header-text">Welcome to Bloom!</div>
                </div>
                <div class="content">
                    <h1>Hi there! 👋</h1>
                    <p>We're thrilled to have you join the Bloom community! Your account has been successfully created and you're ready to start building better financial habits.</p>

                    <center>
                        <a href="{login_link}" class="button">Get Started</a>
                    </center>

                    <div class="features">
                        <h2>What you can do with Bloom:</h2>
                        <div class="feature-item">
                            <span class="feature-icon">💰</span>
                            <span>Track your 4-week salary periods with weekly budgets</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">💳</span>
                            <span>Manage debit and credit card balances in one place</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">🔄</span>
                            <span>Automate recurring expenses and bills</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">📊</span>
                            <span>Visualize your spending with beautiful insights</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">🌱</span>
                            <span>Build financial habits that grow with you</span>
                        </div>
                    </div>

                    <p><strong>Getting Started:</strong></p>
                    <ol style="margin: 0 0 20px 0; padding-left: 20px; color: #4b5563;">
                        <li style="margin-bottom: 8px;">Set up your first salary period</li>
                        <li style="margin-bottom: 8px;">Enter your initial balances</li>
                        <li style="margin-bottom: 8px;">Add recurring expenses to automate tracking</li>
                        <li style="margin-bottom: 8px;">Start logging transactions and watch your budget bloom!</li>
                    </ol>

                    <p>If you have any questions or need help getting started, just reply to this email. We're here to help! 💕</p>
                </div>
                <div class="footer">
                    <p><strong>Bloom Budget</strong></p>
                    <p>Financial Habits That Grow With You</p>
                    <p style="margin-top: 10px;">Need help? <a href="mailto:support@bloom-tracker.app" style="color: #ff9dcd;">support@bloom-tracker.app</a></p>
                </div>
            </div>
        </body>
        </html>
        """

        # Plain text fallback
        plain_text_content = f"""
        Welcome to Bloom Budget!

        Hi there!

        We're thrilled to have you join the Bloom community! Your account has been successfully created and you're ready to start building better financial habits.

        What you can do with Bloom:
        💰 Track your 4-week salary periods with weekly budgets
        💳 Manage debit and credit card balances in one place
        🔄 Automate recurring expenses and bills
        📊 Visualize your spending with beautiful insights
        🌱 Build financial habits that grow with you

        Getting Started:
        1. Set up your first salary period
        2. Enter your initial balances
        3. Add recurring expenses to automate tracking
        4. Start logging transactions and watch your budget bloom!

        Login here: {login_link}

        If you have any questions or need help getting started, email us at support@bloom-tracker.app

        ---
        Bloom Budget
        Financial Habits That Grow With You
        Need help? support@bloom-tracker.app
        """

        return self.send_email(
            to_email=to_email,
            subject="Welcome to Bloom Budget! 🌸",
            html_content=html_content,
            plain_text_content=plain_text_content,
        )


# Create a singleton instance
email_service = EmailService()
