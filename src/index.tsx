import React from 'react';
import ReactDOM from 'react-dom';
import { Route, BrowserRouter as Router } from 'react-router-dom';

import * as serviceWorker from './serviceWorker';
import './sass/app.scss';
//pages
import Splash from './pages/splash';
import Login from './pages/login';
import Home from './pages/home';

const routing = (
  <Router>
    <div>
      <Route exact path="/" component={Splash} />
      <Route exact path="/login" component={Login} />
      <Route exact path="/home" component={Home} />
    </div>
  </Router>
);

ReactDOM.render(routing, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
