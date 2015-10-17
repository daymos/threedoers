/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import { match, RoutingContext } from 'react-router';
import _ from 'lodash';

import AppContext from 'components/AppContext.jsx';
import routes from 'components/routes.jsx';


export function renderHTML (req, res, next) {
  let createElement = function (Component, props) {
    return <Component {...props} {...req.reactProps} />;
  };

  match(
    { routes, location: req.originalUrl },
    (routerMatchError, redirectLocation, renderProps) => {
      if (routerMatchError) {
        return next(routerMatchError);
      } else if (redirectLocation) {
        res.redirect(302, redirectLocation.pathname + redirectLocation.search);
      } else if (renderProps) {
        let component =
          <AppContext {...req.reactContext}>
            <RoutingContext {...renderProps} createElement={createElement}/>
          </AppContext>;


        let reactHTML = renderToString(component);
        let reactPrefetchedData = JSON.stringify(req.reactProps);
        let reactContext = JSON.stringify(req.reactContext);

        return res.render('layout.html',
                          {reactHTML, reactPrefetchedData, reactContext});
      } else {
        let error = new Error();
        return next(error);
      }
    }
  );
}
