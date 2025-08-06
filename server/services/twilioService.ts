import { externalApiService } from './externalApiService';

export const twilioService = {
  /**
   * Send verification code via SMS using external API
   * @param phoneNumber - The phone number to send the verification to
   * @returns Promise with verification details
   */
  async sendSmsVerification(phoneNumber: string) {
    try {
      // Format phone number to E.164 format
      let formattedNumber = phoneNumber.trim();
      
      // If it doesn't start with +, add it
      if (!formattedNumber.startsWith('+')) {
        // For US numbers, add +1
        if (formattedNumber.startsWith('1')) {
          formattedNumber = '+' + formattedNumber;
        } else {
          formattedNumber = '+1' + formattedNumber;
        }
      }
      
      console.log(`Sending SMS verification to formatted number: ${formattedNumber}`);
      
      const result = await externalApiService.post('/SmsVerification/send', {
        phoneNumber: formattedNumber
      });
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to send SMS verification'
        };
      }
      
      // Extract data from the external API response format
      const apiData = result.data;
      
      return {
        success: apiData.success,
        sid: apiData.data?.sid,
        status: apiData.data?.status,
        message: apiData.message
      };
    } catch (error: any) {
      console.error('Error sending SMS verification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },



  /**
   * Check verification code using external API
   * @param to - Phone number or email that received the code
   * @param code - The verification code to check
   * @returns Promise with verification check result
   */
  async checkVerification(to: string, code: string) {
    try {
      // Format phone number to E.164 format (same formatting as in sendSmsVerification)
      let formattedTo = to.trim();
      
      // If it looks like a phone number, format it
      if (/^[0-9+]+$/.test(formattedTo)) {
        // If it doesn't start with +, add it
        if (!formattedTo.startsWith('+')) {
          // For US numbers, add +1
          if (formattedTo.startsWith('1')) {
            formattedTo = '+' + formattedTo;
          } else {
            formattedTo = '+1' + formattedTo;
          }
        }
      }
      
      console.log(`Checking verification code for: ${formattedTo}`);
      
      const result = await externalApiService.post('/SmsVerification/verify', {
        phoneNumber: formattedTo,
        code: code
      });
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to verify code'
        };
      }
      
      // Extract data from the external API response format
      const apiData = result.data;
      
      return {
        success: apiData.success,
        status: apiData.data?.status,
        valid: apiData.data?.isValid,
        message: apiData.message
      };
    } catch (error: any) {
      console.error('Error checking verification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};