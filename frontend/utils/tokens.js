const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000; // 4 min in ms

// TODO change this up once portunus is deployed.
const loginUrl = 'http://localhost:3000/login';

class TokenFetcher {
  constructor() {
    this.fetchFunction = null;
    this.onError = null;
    this.accessToken = '';
    this.timerId = null;
  }

  defaultOnError(_) {
    window.location.replace(loginUrl);
  }

  async fetchToken() {
    try {
      const response = await this.fetchFunction();
      this.accessToken = response.data.access;
      return true;
    } catch (error) {
      console.log('error!');
      if (error.response) {
        if (error.response.status === 401) {
          console.log('error and 401!');
          this.clearToken();
        }
      }
      console.log('calling onError');
      this.onError(error);
    }
    return false;
  }

  clearToken() {
    this.accessToken = '';
    clearInterval(this.timerId);
    this.timerId = null;
  }

  start(fetchFn, onError = this.defaultOnError) {
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
  return Bool(tokenFetcher.accessToken);
};

export { tokenFetcher, isLoggedIn };
