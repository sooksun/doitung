// Email notification utilities
// Note: This is a placeholder for email functionality
// In production, you would use a service like Nodemailer, SendGrid, or AWS SES

interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  // TODO: Implement actual email sending
  // This is a placeholder that logs the email instead of sending it
  
  console.log('📧 Email notification (placeholder):')
  console.log('To:', to)
  console.log('Subject:', subject)
  console.log('Content:', html)
  
  // In production, you would do something like:
  // const transporter = nodemailer.createTransport({ ... })
  // await transporter.sendMail({ to, subject, html })
  
  return true
}

// Email templates
export function getAssessmentSubmittedEmail(assessment: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7c3aed;">แบบประเมินถูกส่งแล้ว</h2>
      <p>แบบประเมินคุณภาพสถานศึกษาถูกส่งเรียบร้อยแล้ว</p>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>โรงเรียน:</strong> ${assessment.schoolName}</p>
        <p><strong>ปีการศึกษา:</strong> ${assessment.academicYearName}</p>
        <p><strong>คะแนนรวม:</strong> ${assessment.overallScore.toFixed(2)} / 5.00</p>
        <p><strong>วันที่ส่ง:</strong> ${new Date(assessment.submittedAt).toLocaleDateString('th-TH')}</p>
      </div>
      <p>ขอบคุณที่ใช้ระบบประเมินคุณภาพสถานศึกษา</p>
    </div>
  `
}

export function getUserCreatedEmail(user: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7c3aed;">ยินดีต้อนรับสู่ระบบ EQAP</h2>
      <p>บัญชีของคุณถูกสร้างเรียบร้อยแล้ว</p>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>ชื่อ-นามสกุล:</strong> ${user.firstName} ${user.lastName}</p>
        <p><strong>อีเมล:</strong> ${user.email}</p>
        <p><strong>บทบาท:</strong> ${user.role}</p>
      </div>
      <p>กรุณาเข้าสู่ระบบที่: <a href="${process.env.NEXT_PUBLIC_APP_URL}/login">เข้าสู่ระบบ</a></p>
    </div>
  `
}

export function getPasswordResetEmail(email: string, resetToken: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7c3aed;">รีเซ็ตรหัสผ่าน</h2>
      <p>คุณได้ขอรีเซ็ตรหัสผ่านสำหรับบัญชี: ${email}</p>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p>กรุณาคลิกลิงก์ด้านล่างเพื่อรีเซ็ตรหัสผ่าน:</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}" 
           style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 10px;">
          รีเซ็ตรหัสผ่าน
        </a>
      </div>
      <p style="color: #ef4444; font-size: 14px;">ลิงก์นี้จะหมดอายุภายใน 1 ชั่วโมง</p>
    </div>
  `
}
