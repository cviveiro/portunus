import { observable } from 'mobx';

import tokenFetcher from '@@/zg_utils/tokens';
import * as api from '@@/utils/API';

class Store {
  @observable loading = true;

  @observable authenticated = false;

  onSuccess = token => {
    this.authenticated = Boolean(token);
    this.loading = false;
  };

  onError = () => {
    this.authenticated = false;
    this.loading = false;
  };

  startFetching() {
    tokenFetcher.start(api.refresh, this.onSuccess, this.onError);
  }

  constructor() {
    this.startFetching();
  }

  login() {
    this.authenticated = true;
    this.startFetching();
  }

  logout = async () => {
    await api.logout();
    tokenFetcher.clearToken();
    this.authenticated = false;
  };
}

export default Store;
