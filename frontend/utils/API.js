import axios from 'axios';
import Cookies from 'js-cookie';

const API = axios.create({
  baseURL: '/api/',
  responseType: 'json',
  headers: {
    'X-REQUESTED-WITH': 'XMLHttpRequest',
    'Content-Type': 'application/json',
    'X-CSRFToken': Cookies.get('csrftoken'),
 },
})

const setupCsrf = () => API.post('set_csrf');

const register = payload => API.post('auth/register', payload);

const login = payload => API.post('auth/login', payload);

const logout = () => API.post('auth/logout');

const refresh = () => API.post('auth/token/refresh');

export {
  setupCsrf,
  register,
  login,
  logout,
  refresh,
}
