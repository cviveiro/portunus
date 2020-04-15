import Router from 'next/router';
import axios from 'axios';
import Cookies from 'js-cookie';

let accessToken = '';

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

const secureAPI = axios.create({
  baseURL: '/api/',
  responseType: 'json',
  headers: {
    'X-REQUESTED-WITH': 'XMLHttpRequest',
    'Content-Type': 'application/json',
  },
});

API.interceptors.request.use(request => {
  request.headers['X-CSRFToken'] = Cookies.get('csrftoken');
  return request;
});

secureAPI.interceptors.request.use(request => {
  request.headers['X-CSRFToken'] = Cookies.get('csrftoken');
  request.headers['Authorization'] = `Bearer ${window.accessToken}`;
  return request;
});

const setupCsrf = () => API.get('set_csrf/');

const register = payload => API.post('auth/register/', payload);

const login = payload => API.post('auth/login/', payload);

const logout = () => API.post('auth/logout/');

const resetPassword = payload => API.post('auth/password-reset/', payload);

const completePasswordReset = payload => API.post('auth/password-reset/complete/', payload);

const refreshToken = () => {
  try {
    API.post('auth/token/refresh/').then(function (response) {
      window.accessToken = response.data.access;
    });
  } catch (error) {
    console.log(error);
    Router.push('/login');
  }
};

const startTokenRefresher = () => {
  refreshToken();
  window.timerId = setInterval(refreshToken, tokenRefreshInterval);
};

export {
  setupCsrf,
  register,
  login,
  logout,
  resetPassword,
  completePasswordReset,
  startTokenRefresher,
};
