import axios from "axios";

export default async function sendSms(phoneNumber, otpCode) {
  try {
    await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "otp",                 // OTP route
        variables_values: otpCode,    // OTP value
        numbers: phoneNumber,         // Indian number (without +91)
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending SMS:", error.response?.data || error.message);
    throw new Error("SMS could not be sent");
  }
}
