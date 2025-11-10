// Email service for sending notifications
// Currently using console logging - can be integrated with SendGrid, AWS SES, etc.

export interface WelcomeEmailData {
  companyName: string;
  adminName: string;
  adminEmail: string;
  companySlug: string;
  loginUrl: string;
}

export class EmailService {
  private emailProvider: string;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.emailProvider = process.env.EMAIL_PROVIDER || 'console'; // 'console', 'sendgrid', 'ses'
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@auzguard.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'AuzGuard';
  }

  /**
   * Send welcome email to new company admin
   */
  async sendCompanyWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    const subject = `Welcome to AuzGuard - ${data.companyName}`;
    const htmlContent = this.generateWelcomeEmailHTML(data);
    const textContent = this.generateWelcomeEmailText(data);

    await this.sendEmail({
      to: data.adminEmail,
      subject,
      html: htmlContent,
      text: textContent
    });
  }

  /**
   * Generate HTML email template for welcome email
   */
  private generateWelcomeEmailHTML(data: WelcomeEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to AuzGuard</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🎉 Welcome to AuzGuard
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333; font-size: 22px;">
                Hi ${data.adminName || 'there'}! 👋
              </h2>
              
              <p style="margin: 0 0 16px 0; color: #555; font-size: 16px; line-height: 1.6;">
                Congratulations! Your company <strong>${data.companyName}</strong> has been successfully set up on AuzGuard.
              </p>

              <p style="margin: 0 0 16px 0; color: #555; font-size: 16px; line-height: 1.6;">
                You now have a completely isolated, secure environment for managing your AI governance and routing.
              </p>

              <!-- Company Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0; background-color: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; color: #666; font-size: 14px;">
                      <strong>Company ID:</strong> <code style="background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${data.companySlug}</code>
                    </p>
                    <p style="margin: 0 0 12px 0; color: #666; font-size: 14px;">
                      <strong>Admin Email:</strong> ${data.adminEmail}
                    </p>
                    <p style="margin: 0; color: #666; font-size: 14px;">
                      <strong>Login URL:</strong> <a href="${data.loginUrl}" style="color: #667eea; text-decoration: none;">${data.loginUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.loginUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      Access Your Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <h3 style="margin: 30px 0 16px 0; color: #333; font-size: 18px;">
                🚀 Next Steps:
              </h3>
              <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #555; font-size: 15px; line-height: 1.8;">
                <li>Log in to your dashboard</li>
                <li>Add team members via User Management</li>
                <li>Configure your AI routing policies</li>
                <li>Set up model pools and targets</li>
                <li>Explore audit logs and compliance features</li>
              </ul>

              <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.6;">
                Need help? Check out our <a href="#" style="color: #667eea; text-decoration: none;">documentation</a> or contact support.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 8px 0; color: #999; font-size: 12px;">
                © ${new Date().getFullYear()} AuzGuard. All rights reserved.
              </p>
              <p style="margin: 0; color: #999; font-size: 12px;">
                Secure AI Governance & Routing Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text version of welcome email
   */
  private generateWelcomeEmailText(data: WelcomeEmailData): string {
    return `
Welcome to AuzGuard!

Hi ${data.adminName || 'there'},

Congratulations! Your company "${data.companyName}" has been successfully set up on AuzGuard.

You now have a completely isolated, secure environment for managing your AI governance and routing.

COMPANY DETAILS:
- Company ID: ${data.companySlug}
- Admin Email: ${data.adminEmail}
- Login URL: ${data.loginUrl}

NEXT STEPS:
1. Log in to your dashboard: ${data.loginUrl}
2. Add team members via User Management
3. Configure your AI routing policies
4. Set up model pools and targets
5. Explore audit logs and compliance features

Need help? Check out our documentation or contact support.

Best regards,
The AuzGuard Team

---
© ${new Date().getFullYear()} AuzGuard. All rights reserved.
Secure AI Governance & Routing Platform
    `.trim();
  }

  /**
   * Send email using configured provider
   */
  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    switch (this.emailProvider) {
      case 'console':
        await this.sendViaConsole(options);
        break;
      case 'sendgrid':
        await this.sendViaSendGrid(options);
        break;
      case 'ses':
        await this.sendViaSES(options);
        break;
      default:
        console.warn(`Unknown email provider: ${this.emailProvider}, falling back to console`);
        await this.sendViaConsole(options);
    }
  }

  /**
   * Console logger (for development/testing)
   */
  private async sendViaConsole(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    console.log('\n========================================');
    console.log('📧 EMAIL NOTIFICATION (Console Mode)');
    console.log('========================================');
    console.log(`From: ${this.fromName} <${this.fromEmail}>`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('----------------------------------------');
    console.log(options.text);
    console.log('========================================\n');
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * SendGrid integration (placeholder)
   */
  private async sendViaSendGrid(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    // TODO: Implement SendGrid integration
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({ ... });
    
    console.log('SendGrid email sending not yet implemented');
    await this.sendViaConsole(options);
  }

  /**
   * AWS SES integration (placeholder)
   */
  private async sendViaSES(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    // TODO: Implement AWS SES integration
    // const AWS = require('aws-sdk');
    // const ses = new AWS.SES();
    // await ses.sendEmail({ ... }).promise();
    
    console.log('AWS SES email sending not yet implemented');
    await this.sendViaConsole(options);
  }
}

