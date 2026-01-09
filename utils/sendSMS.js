import axios from "axios";
import querystring from "querystring";

export default async function sendSms(phoneNumber, otpCode) {
  try {
    const params = {
      key: process.env.SMSLOCAL_API_KEY, // REQUIRED
      sender: "SMSLOC",                  // default sender
      number: phoneNumber,               // comma separated allowed
      sms: `Your OTP is ${otpCode}`,      // message text
    };

    const url =
      "https://app.smslocal.in/api/smsapi?" +
      querystring.stringify(params);

    const response = await axios.get(url, { timeout: 10000 });

    // SMSLocal success response usually contains "status":"success"
    if (
      !response.data ||
      (typeof response.data === "object" &&
        response.data.status &&
        response.data.status !== "success")
    ) {
      const err = new Error("SMSLocal rejected the request");
      err.name = "SmsError";
      err.provider = "smslocal";
      err.details = response.data;
      throw err;
    }

    return true;
  } catch (error) {
    const apiData = error.response?.data;

    const providerMessage =
      (typeof apiData === "object" && apiData?.message) ||
      (typeof apiData === "string" && apiData) ||
      error.message;

    const err = new Error(`SMS failed: ${providerMessage}`);
    err.name = "SmsError";
    err.provider = "smslocal";
    err.status = error.response?.status || 502;
    err.details = apiData || {};

    throw err;
  }
}
