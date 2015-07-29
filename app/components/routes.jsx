/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import {RouteHandler, NotFoundRoute, Route} from 'react-router';

import {Project} from './project.jsx';


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
    <Route path="/project/:id" handler={Project} />
  </Route>
);
