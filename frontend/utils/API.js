import Router from 'next/router';
import axios from 'axios';
import Cookies from 'js-cookie';

// Refresh the access token every 4 minutes (in milliseconds).
const tokenRefreshInterval = 4 * 60 * 1000;

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

const login = async payload => {
  const response = await API.post('auth/login/', payload);
  refreshToken();
  return response;
};

const logout = async () => {
  const response = await API.post('auth/logout/');
  window.accessToken = '';
  return response;
};

const resetPassword = payload => API.post('auth/password-reset/', payload);

const completePasswordReset = payload => API.post('auth/password-reset/complete/', payload);

const refreshToken = () => {
  try {
    API.post('auth/token/refresh/').then(function (response) {
      window.accessToken = response.data.access;
    });
  } catch (error) {
    window.accessToken = '';
    Router.push('/login');
  }
};

const startTokenRefresher = () => {
  // Don't start another timer if we already have one going.
  if (!window.timerId) {
    refreshToken();
    window.timerId = setInterval(refreshToken, tokenRefreshInterval);
  }
};

export {
  setupCsrf,
  register,
  login,
  logout,
  resetPassword,
  completePasswordReset,
  startTokenRefresher,
  refreshToken,
};
