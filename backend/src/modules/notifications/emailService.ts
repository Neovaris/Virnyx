// src/modules/notifications/emailService.ts
import { Refund } from "@prisma/client";
import { prisma } from "../../db/prisma";

/**
 * Email notification service
 * Handles sending email notifications for refund approvals, rejections, etc.
 *
 * Note: Configure email provider (Gmail, SendGrid, etc.) via environment variables
 * EMAIL_PROVIDER, EMAIL_FROM, EMAIL_API_KEY
 */

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

class EmailService {
  async send(options: EmailOptions): Promise<boolean> {
    try {
      // TODO: Integrate with actual email provider (SendGrid, AWS SES, Gmail SMTP, etc.)
      // For now, this is a placeholder that logs the email
      console.log(`📧 Email sent to ${options.to}`);
      console.log(`   Subject: ${options.subject}`);
      console.log(`   Template: ${options.template}`);
      console.log(`   Data:`, options.data);

      // In a real implementation, you would:
      // 1. Render the template with data
      // 2. Send via SMTP/API
      // 3. Log delivery status

      return true;
    } catch (error) {
      console.error("❌ Email sending failed:", error);
      return false;
    }
  }

  /**
   * Notify manager of pending refund approval
   */
  async notifyRefundPendingApproval(
    merchantId: string,
    refund: Refund,
    cashierName: string,
    refundAmount: number
  ): Promise<void> {
    try {
      // Get merchant managers
      const managers = await prisma.user.findMany({
        where: {
          merchantId,
          userRoles: {
            some: {
              role: {
                name: { in: ["Manager", "Admin"] },
              },
            },
          },
        },
      });

      for (const manager of managers) {
        if (!manager.email) continue;

        await this.send({
          to: manager.email,
          subject: `⏳ Refund Approval Required - ${refundAmount.toFixed(2)}`,
          template: "refund-pending-approval",
          data: {
            managerName: manager.fullName,
            cashierName,
            refundAmount,
            refundReason: refund.reason || "No reason provided",
            refundId: refund.id,
            merchantId,
            approvalLink: `${process.env.ADMIN_BASE_URL || "http://localhost:3000"}/refunds?id=${refund.id}`,
          },
        });
      }
    } catch (error) {
      console.error(
        "❌ Failed to notify managers about pending refund:",
        error
      );
    }
  }

  /**
   * Notify cashier of refund approval
   */
  async notifyRefundApproved(
    cashierId: string,
    refund: Refund,
    approverName: string
  ): Promise<void> {
    try {
      const cashier = await prisma.user.findUnique({
        where: { id: cashierId },
      });

      if (!cashier?.email) return;

      await this.send({
        to: cashier.email,
        subject: `✅ Refund Approved - ${refund.amount.toFixed(2)}`,
        template: "refund-approved",
        data: {
          cashierName: cashier.fullName,
          approverName,
          refundAmount: refund.amount,
          refundId: refund.id,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("❌ Failed to notify cashier of refund approval:", error);
    }
  }

  /**
   * Notify cashier of refund rejection
   */
  async notifyRefundRejected(
    cashierId: string,
    refund: Refund,
    approverName: string,
    rejectionReason: string
  ): Promise<void> {
    try {
      const cashier = await prisma.user.findUnique({
        where: { id: cashierId },
      });

      if (!cashier?.email) return;

      await this.send({
        to: cashier.email,
        subject: `❌ Refund Rejected - ${refund.amount.toFixed(2)}`,
        template: "refund-rejected",
        data: {
          cashierName: cashier.fullName,
          approverName,
          refundAmount: refund.amount,
          refundId: refund.id,
          rejectionReason: rejectionReason || "No reason provided",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("❌ Failed to notify cashier of refund rejection:", error);
    }
  }
}

export const emailService = new EmailService();
