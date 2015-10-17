/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import ReactDOM from 'react-dom';
import Router from 'react-router/lib/Router';
import createBrowserHistory from 'history/lib/createBrowserHistory';

import AppContext from '../../app/components/AppContext.jsx';
import routes from '../../app/components/routes.jsx';


/**
 * Code used to set prefetched data in component the first time.
 *
 * Next time will be not set this values!!
 *
 * NOTE: React Router create element of leaft then
 * start creating parents.
 */

// START HACK
let prefetchDataUsed = false;

let createElement = function (Component, props) {
  let reactProps = {};
  if (!prefetchDataUsed) {
    reactProps = window.__REACT_DATA_PREFETCHED__;
    prefetchDataUsed = true;
  }
  return <Component {...props} {...reactProps} />;
};
// END HACK


ReactDOM.render(
  <AppContext {...window.__REACT_CONTEXT__}>
    <Router
      history={createBrowserHistory()}
      createElement={createElement}
      routes={routes}/>
  </AppContext>, document.getElementById('react-root'));

