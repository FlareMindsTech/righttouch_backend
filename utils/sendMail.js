import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, text) => {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // e.g. "smtp.gmail.com"
      port: process.env.SMTP_PORT, // e.g. 587
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER, // Your email
        pass: process.env.SMTP_PASS  // Your email password or app password
      }
    });

    // Send mail
    const info = await transporter.sendMail({
      from: `"Service App" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text
    });

    console.log(`Email sent: ${info.messageId}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Email could not be sent");
  }
};
