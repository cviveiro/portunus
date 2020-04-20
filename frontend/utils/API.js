import axios from 'axios';
import Cookies from 'js-cookie';

// TODO this is a holdover until we've got plugin support for tokens for portunus,
// remove this once that's available.
const TOKEN_COOKIE = 'accesstoken';

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
  if (Cookies.get(TOKEN_COOKIE) !== '') {
    config.headers.Authorization = `Bearer ${Cookies.get(TOKEN_COOKIE)}`;
  }
  return config;
});

export const setupCsrf = () => API.get('set_csrf/');

export const register = payload => API.post('auth/register/', payload);

export const login = payload => API.post('auth/login/', payload);

export const socialAuth = payload => API.post('auth/social-auth/', payload);

export const logout = () => API.post('auth/logout/');

export const refresh = async () => {
  try {
    const response = await API.post('auth/token/refresh/');
    // TODO this is a holdover until we've got plugin support for tokens for portunus,
    // remove this once that's available.
    Cookies.set(TOKEN_COOKIE, response.data.access);
  } catch {
    Cookies.set(TOKEN_COOKIE, '');
  }
};

export const resetPassword = payload => API.post('auth/password-reset/', payload);

export const completePasswordReset = payload => API.post('auth/password-reset/complete/', payload);

export const changeUserEmail = payload => API.post('auth/change-email/', payload);
