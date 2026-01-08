import axios from 'axios';

const api = axios.create({
  baseURL: process.env.API_URL || 'https://api.example.com',
  timeout: 15000
});

api.interceptors.request.use((cfg) => {
  // attach auth token from secure store in the real app
  return cfg;
});

export default api;
