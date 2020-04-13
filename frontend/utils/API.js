import axios from 'axios';
import Cookies from 'js-cookie';

import tokenFetcher from '@@/zg_utils/tokens';

const API = axios.create({
  baseURL: '/api/',
  responseType: 'json',
  headers: {
    'X-REQUESTED-WITH': 'XMLHttpRequest',
    'Content-Type': 'application/json',
  },
});

API.interceptors.request.use(config => {
  config.headers['X-CSRFToken'] = Cookies.get('csrftoken');
  if (tokenFetcher.accessToken) {
    config.headers.Authorization = `Bearer ${tokenFetcher.accessToken}`;
  }
  return config;
});

export const setupCsrf = () => API.get('set_csrf/');

export const register = payload => API.post('auth/register/', payload);

export const login = payload => API.post('auth/login/', payload);

export const socialAuth = payload => API.post('auth/social-auth/', payload);

export const logout = () => API.post('auth/logout/');

export const refresh = async () => API.post('auth/token/refresh/');

export const resetPassword = payload => API.post('auth/password-reset/', payload);

export const sendNewUserEmail = payload => API.post('auth/send-new-user-email', payload);

export const completePasswordReset = payload => API.post('auth/password-reset/complete/', payload);

export const changeUserEmail = payload => API.post('auth/change-email/', payload);

export const changePassword = payload => API.post('auth/change-password/', payload);

export const activateMFA = method => API.post(`auth/${method}/activate/`);

export const completeActivateMFA = (method, payload) =>
  API.post(`auth/${method}/activate/confirm/`, payload);
