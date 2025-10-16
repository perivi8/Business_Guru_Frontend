// API Configuration
export const API_CONFIG = {
  // Production URLs (primary)
  FRONTEND_URL: 'https://tmis-business-guru.vercel.app',
  BACKEND_URL: 'https://tmis-business-guru-backend.onrender.com',
  
  // Development URLs (for local development)
  DEV_FRONTEND_URL: 'http://localhost:4200',
  DEV_BACKEND_URL: 'http://localhost:5000',
  
  // API Endpoints
  API_BASE: '/api',
  
  // Full API URL (used by environment files)
  getApiUrl: (baseUrl: string) => `${baseUrl}/api`
};

// Export for easy access
export const DEVELOPMENT_API_URL = API_CONFIG.getApiUrl(API_CONFIG.DEV_BACKEND_URL);
export const PRODUCTION_API_URL = API_CONFIG.getApiUrl(API_CONFIG.BACKEND_URL);
