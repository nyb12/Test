/**
 * External API Service
 * Handles communication with the common API infrastructure
 */

import dotenv from 'dotenv';
dotenv.config();

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class ExternalApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl =
      process.env.EXTERNAL_API_BASE_URL || 'http://localhost:5000/api';
    this.apiKey = process.env.EXTERNAL_API_KEY || 'default-key';

    if (!this.baseUrl) {
      console.warn('EXTERNAL_API_BASE_URL not set, using default');
    }

    if (!this.apiKey) {
      console.warn('EXTERNAL_API_KEY not set, using default');
    }
  }

  /**
   * Make a request to the external API
   */
  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;

      if (options.body) {
        console.log(`Body: ${options.body}`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 10 second timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      // Check if response has content before parsing JSON
      const text = await response.text();

      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw response text:', text);
        return {
          success: false,
          error: `Invalid JSON response: ${text.substring(0, 200)}`,
        };
      }

      if (!response.ok) {
        console.error('External API error:', data);
        return {
          success: false,
          error:
            data.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('External API request failed:', error);
      return {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  }

  /**
   * GET request to external API
   */
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request to external API
   */
  async post<T = any>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * POST request with FormData (for file uploads)
   */
  async postFormData<T = any>(
    endpoint: string,
    formDataObj: any,
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let body: any;
      let headers: Record<string, string> = {
        'X-API-Key': this.apiKey,
      };

      // Check if we received a FormData instance or a plain object
      if (formDataObj instanceof FormData) {
        // If it's already a FormData instance, use it directly
        body = formDataObj;
        // Don't set Content-Type - let fetch set it with boundary
      } else {
        // If it's a plain object, convert it to FormData
        const formData = new FormData();

        // Handle the request data
        if (formDataObj.request) {
          formData.append('request', JSON.stringify(formDataObj.request));
        }

        // Handle files - these come from multer as Buffer objects
        if (formDataObj.files && Array.isArray(formDataObj.files)) {
          formDataObj.files.forEach((file: any, index: number) => {
            // If it's a multer file object, extract the buffer and filename
            if (file.buffer && file.originalname) {
              const blob = new Blob([file.buffer], {
                type: file.mimetype || 'application/octet-stream',
              });
              formData.append('files', blob, file.originalname);
            } else if (file instanceof File) {
              // If it's already a File object
              formData.append('files', file);
            } else if (file.buffer) {
              // If it's just a buffer
              const blob = new Blob([file.buffer], {
                type: 'application/octet-stream',
              });
              formData.append('files', blob, `file_${index}`);
            }
          });
        }

        body = formData;
        // Don't set Content-Type - let fetch set it with boundary
      }

      const response = await fetch(url, {
        method: 'POST',
        body: body,
        signal: controller.signal,
        headers: headers,
      });

      clearTimeout(timeoutId);

      const text = await response.text();

      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return {
          success: false,
          error: `Invalid JSON response: ${text.substring(0, 200)}`,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error:
            data.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('FormData POST request failed:', error);
      return {
        success: false,
        error: error.message || 'FormData network error occurred',
      };
    }
  }

  /**
   * PUT request to external API
   */
  async put<T = any>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request to external API
   */
  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * PATCH request to external API
   */
  async patch<T = any>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /**
   * Health check for the external API
   */
  async healthCheck(): Promise<ApiResponse> {
    return this.get('/health');
  }

  /**
   * Send chat message with files to external API
   */
  async postChatWithFiles<T = any>(
    endpoint: string,
    chatRequest: any,
    files: any[] = [],
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const formData = new FormData();

      // Add chatRequest as JSON string
      formData.append('chatRequest', JSON.stringify(chatRequest));

      // Add files if provided
      if (files && Array.isArray(files)) {
        files.forEach((file: any, index: number) => {
          if (file.buffer && file.originalname) {
            // Handle multer file objects
            const blob = new Blob([file.buffer], {
              type: file.mimetype || 'application/octet-stream',
            });
            formData.append('files', blob, file.originalname);
          } else if (file instanceof File) {
            // Handle File objects
            formData.append('files', file);
          } else if (file.buffer) {
            // Handle buffer-only files
            const blob = new Blob([file.buffer], {
              type: 'application/octet-stream',
            });
            formData.append('files', blob, `file_${index}`);
          }
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          'X-API-Key': this.apiKey,
          Accept: 'text/plain',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      // Check if response has content before parsing JSON
      const text = await response.text();

      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw response text:', text);
        return {
          success: false,
          error: `Invalid JSON response: ${text.substring(0, 200)}`,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error:
            data.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  }

  /**
   * Send email OTP for verification
   */
  async sendEmailOtp(email: string): Promise<
    ApiResponse<{
      sessionToken: string;
      expiresAt: string;
      remainingAttempts: number;
    }>
  > {
    return this.post('/EmailVerification/send-otp', { email });
  }

  /**
   * Verify email OTP
   */
  async verifyEmailOtp(
    email: string,
    otpCode: string,
    sessionToken: string,
  ): Promise<
    ApiResponse<{
      isVerified: boolean;
      verifiedAt: string;
      remainingAttempts: number;
      status: number;
    }>
  > {
    return this.post('/EmailVerification/verify-otp', {
      email,
      otpCode,
      sessionToken,
    });
  }
}

// Export a singleton instance
export const externalApiService = new ExternalApiService();
