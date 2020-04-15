import { useEffect } from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';
import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/core/styles';
import theme from '@wui/theme';
import { setupCsrf, startTokenRefresher } from '../utils/API';

const App = ({ Component, pageProps }) => {
  useEffect(() => {
    // Remove the server-side injected CSS.
    const jssStyles = document.querySelector('#jss-server-side');
    if (jssStyles) {
      jssStyles.parentElement.removeChild(jssStyles);
    }
  });

  useEffect(() => {
    // Ensure the CSRF cookie is set.
    setupCsrf();
  }, []);

  useEffect(() => {
    // Make sure we keep the access token up to date.
    startTokenRefresher();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"
        />

        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
        />
      </Head>

      <CssBaseline />
      <Component {...pageProps} />
    </ThemeProvider>
  );
};

App.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object,
};

App.defaultProps = {
  pageProps: {},
};

export default App;
