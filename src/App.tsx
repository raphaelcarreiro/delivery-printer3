import { MuiThemeProvider } from '@material-ui/core';
import AuthProvider from '@src/providers/auth';
import MessagingProvider from '@src/providers/messaging';
import React from 'react';
import { Provider } from 'react-redux';
import Routes from '@src/routes/Routes';
import { store } from '@src/store';
import { theme } from './theme/theme';

const App = () => (
  <Provider store={store}>
    <AuthProvider>
      <MuiThemeProvider theme={theme}>
        <MessagingProvider>
          <Routes />
        </MessagingProvider>
      </MuiThemeProvider>
    </AuthProvider>
  </Provider>
);

export default App;
