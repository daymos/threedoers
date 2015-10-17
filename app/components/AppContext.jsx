/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 * @fileoverview This module will contain context for all app.
 */

import React from 'react';


export default class AppContext extends React.Component {

  isLoggedIn () {
    return !!this.props.user;
  }

  isPrinter () {
    return this.props.user &&
      (this.props.user.isPrinter || this.props.user.printer === 'accepted');
  }

  getChildContext () {
    return {
      user: this.props.user,
      isLoggedIn: this.isLoggedIn(),
      isPrinter: this.isPrinter()
    };
  }

  render () {
    return this.props.children;
  }

}

AppContext.childContextTypes = {
  user: React.PropTypes.object,
  isLoggedIn: React.PropTypes.bool,
  isPrinter: React.PropTypes.bool
};
