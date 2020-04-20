import axios from 'axios';
import Cookies from 'js-cookie';

const API = axios.create({
  baseURL: '/api/',
  responseType: 'json',
  headers: {
    'X-REQUESTED-WITH': 'XMLHttpRequest',
    'Content-Type': 'application/json',
  },
});

API.interceptors.request.use(request => {
  request.headers['X-CSRFToken'] = Cookies.get('csrftoken');
  if (window.accessToken) {
    request.headers['Authorization'] = `Bearer ${window.accessToken}`;
  }
  return request;
});

const setupCsrf = () => API.get('set_csrf/');

const register = payload => API.post('auth/register/', payload);

const login = async payload => API.post('auth/login/', payload);

const logout = () => API.post('auth/logout/');

const resetPassword = payload => API.post('auth/password-reset/', payload);

const completePasswordReset = payload => API.post('auth/password-reset/complete/', payload);

const refreshToken = () => API.post('auth/token/refresh/');

export { setupCsrf, register, login, logout, resetPassword, completePasswordReset, refreshToken };
