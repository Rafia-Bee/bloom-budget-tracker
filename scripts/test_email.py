"""
⚠️ WARNING: SENDS REAL EMAIL VIA SENDGRID ⚠️

Test email sending via SendGrid.
Run this script SPARINGLY to verify email configuration.

QUOTA: SendGrid free tier = 100 emails/day
RECOMMENDATION: Use max 1-2 times per day for troubleshooting only

This script will:
1. Prompt you for a recipient email address
2. Send 1 real email using your SendGrid quota
3. Count against your daily 100-email limit
"""

from services.email_service import EmailService
from dotenv import load_dotenv
import os
import sys
from pathlib import Path

# Add backend to path FIRST
backend_path = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

# Now import from backend

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Loaded .env from {env_path}")
else:
    print(f"⚠️  No .env file found at {env_path}")


def test_email():
    """Test sending an email."""

    # Get config from environment
    api_key = os.getenv('SENDGRID_API_KEY')
    from_email = os.getenv('SENDGRID_FROM_EMAIL', 'noreply@bloom-budget.com')

    print("\n📧 Email Configuration:")
    print(f"   From: {from_email}")
    print(f"   API Key: {'✅ Set' if api_key else '❌ Not set'}")

    if not api_key:
        print("\n❌ ERROR: SENDGRID_API_KEY not set in environment variables")
        print("   Please add it to your .env file:")
        print("   SENDGRID_API_KEY=your-api-key-here")
        return False

    # Initialize email service
    email_service = EmailService(api_key=api_key, from_email=from_email)

    if not email_service.enabled:
        print("\n❌ Email service is not enabled")
        return False

    # Confirm before sending
    print("\n" + "="*60)
    print("⚠️  WARNING: This will send 1 REAL email using SendGrid quota")
    print("   Daily limit: 100 emails (free tier)")
    confirm = input("Continue? (type 'yes' to confirm): ").strip().lower()

    if confirm != 'yes':
        print("❌ Cancelled - no email sent")
        return False

    # Prompt for test email
    print("\n" + "="*60)
    to_email = input("Enter email address to send test email to: ").strip()

    if not to_email or '@' not in to_email:
        print("❌ Invalid email address")
        return False

    print(f"\n📤 Sending test email to {to_email}...")

    # Send test email
    html_content = """
    <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #FFB3C6;">🌸 Bloom Budget Tracker</h2>
            <p>Hello!</p>
            <p>This is a test email from your Bloom Budget Tracker app.</p>
            <p>If you're receiving this, your email configuration is working correctly! ✨</p>
            <hr style="border: 1px solid #FFE5EC; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
                This email was sent from <strong>{from_email}</strong><br>
                If you didn't request this, you can safely ignore it.
            </p>
        </body>
    </html>
    """.format(from_email=from_email)

    plain_content = f"""
    Bloom Budget Tracker - Test Email

    Hello!

    This is a test email from your Bloom Budget Tracker app.
    If you're receiving this, your email configuration is working correctly!

    This email was sent from {from_email}
    If you didn't request this, you can safely ignore it.
    """

    result = email_service.send_email(
        to_email=to_email,
        subject="🌸 Bloom Budget - Test Email",
        html_content=html_content,
        plain_text_content=plain_content
    )

    print("\n" + "="*60)
    if result.get('success'):
        print("✅ SUCCESS! Email sent successfully")
        print(f"   Status Code: {result.get('status_code')}")
        print(f"\n📬 Check your inbox at {to_email}")
        print("   (Don't forget to check spam/junk folder!)")
        return True
    else:
        print("❌ FAILED to send email")
        print(f"   Error: {result.get('error')}")
        return False


if __name__ == '__main__':
    print("="*60)
    print("🌸 Bloom Budget Tracker - Email Test")
    print("="*60)

    success = test_email()

    print("\n" + "="*60)
    if success:
        print("✅ Email test completed successfully!")
    else:
        print("❌ Email test failed")
    print("="*60)

    sys.exit(0 if success else 1)
