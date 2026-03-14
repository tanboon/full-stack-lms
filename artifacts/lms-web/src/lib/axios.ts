import axios from 'axios';

// Create base instance
export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// [6.4] Response interceptor for optimistic UI retries + 401 redirect
// Retry failed requests up to 3 times on network error
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // [5.2] If token is rejected (401), clear local storage and redirect to login
    if (error.response?.status === 401 && !config?._is401Redirect) {
      const token = localStorage.getItem('lms_token');
      if (token) {
        // Token existed but was rejected (expired / revoked) — clear it and redirect
        localStorage.removeItem('lms_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    
    // Only retry if config.retry is explicitly set to true
    if (!config || !config.retry) {
      return Promise.reject(error);
    }
    
    config.retryCount = config.retryCount || 0;
    
    // Check if we've maxed out retries
    if (config.retryCount >= 3) {
      return Promise.reject(error);
    }
    
    // Increment retry count
    config.retryCount += 1;
    
    // Exponential backoff delay
    const delay = Math.pow(2, config.retryCount) * 500;
    console.log(`[Axios] Retry ${config.retryCount}/3 after ${delay}ms...`);
    
    await new Promise((resolve) => setTimeout(resolve, delay));
    
    // Retry request
    return api(config);
  }
);

// Type extension for custom axios config
declare module 'axios' {
  export interface AxiosRequestConfig {
    retry?: boolean;
    retryCount?: number;
  }
}
