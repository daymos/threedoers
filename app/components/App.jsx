/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 * @module components/base
 *
 * @fileoverview This module will contain basic page.
 *
 * Entry point of all code will handle and delegate rendering
 * task to other components.
 */
import React from 'react';


export default class ThreeDoersApp extends React.Component {

  render () {
    return this.props.children;
  }

}

