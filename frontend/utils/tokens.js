import axios from 'axios';

const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000; // 4 min in ms

// TODO change this up once portunus is deployed.
const tokenUrl = 'http://localhost:3000/api/auth/token/refresh/';
const loginUrl = 'http://localhost:3000/login';

const defaultOnError = () => {
  window.location.replace(loginUrl);
};

const defaultFetcher = () => {
  axios({
    method: 'post',
    url: tokenUrl,
    responseType: 'json',
    headers: {
      'X-REQUESTED-WITH': 'XMLHttpRequest',
      'Content-Type': 'application/json',
    },
  });
};

class TokenFetcher {
  constructor() {
    this.fetchFunction = null;
    this.onError = null;
    this.accessToken = '';
    this.timerId = null;
  }

  async fetchToken() {
    try {
      const response = await this.fetchFunction();
      console.log(response);
      this.accessToken = response.data.access;
      return true;
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          this.clearToken();
        }
      }
      this.onError(error);
    }
    return false;
  }

  clearToken() {
    this.accessToken = '';
    clearInterval(this.timerId);
    this.timerId = null;
  }

  start(fetchFn = defaultFetcher, onError = defaultOnError) {
    this.fetchFunction = fetchFn;
    this.onError = onError;
    if (!this.timerId) {
      if (this.fetchToken()) {
        this.timerId = setInterval(this.fetchToken, TOKEN_REFRESH_INTERVAL);
      }
    }
  }
}

const tokenFetcher = new TokenFetcher();

const isLoggedIn = () => {
  // NOTE this will only be guaranteed to be up-to-date if the tokenFetcher is started on
  // every page load.
  return Boolean(tokenFetcher.accessToken);
};

export { tokenFetcher, isLoggedIn };
