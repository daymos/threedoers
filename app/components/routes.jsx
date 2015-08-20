/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import {RouteHandler, NotFoundRoute, Route} from 'react-router';

import CreateOrder from './order/create.jsx';
import OrderDetail from './order/detail.jsx';


let routes;

/**
 * Entry point of all code will handle and delegate rendering
 * task to other components.
 *
 * This props will be props! just the underlay component
 * will treat that as state if needed.
 */
class ThreeDoersApp extends React.Component {
  render () {
    return (
      <RouteHandler {...this.props}/>
    );
  }
}


export default routes = (
  <Route handler={ThreeDoersApp}>
    <Route path="/order/create" handler={CreateOrder} name="createOrder" />
    <Route path="/order/:id" handler={OrderDetail} />
  </Route>
);
