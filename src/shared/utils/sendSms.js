// src/shared/utils/sendSms.js
const axios = require('axios');

/**
 * Sends an SMS using the Text SMS API gateway [cite: 1]
 * @param {string} phone - Target mobile number (Exp: 88017XXXXXXXX) 
 * @param {string} message - SMS body content 
 */
const sendSms = async (phone, message) => {
  try {
    const params = {
      api_key: process.env.SMS_API_KEY, // Your API Key 
      type: 'text', // 'text' for normal SMS/ 'unicode' for Bangla 
      contacts: phone, // Mobile number 
      senderid: process.env.SMS_SENDER_ID, // Approved Sender ID 
      msg: message, // SMS body 
      label: 'transactional' // Recommended for OTPs 
    };

    const response = await axios.get(process.env.SMS_API_URL, { params });

    // The API returns a Shoot ID on success [cite: 20]
    console.log(`📱 [SMS API Response]:`, response.data);
    return response.data;
  } catch (error) {
    console.error("❌ [SMS API Error]:", error.message);
    throw new Error("Failed to send SMS");
  }
};

module.exports = { sendSms };