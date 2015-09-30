/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import Button from 'react-bootstrap/lib/Button';


/**
 * Component that is used as forbidden page.
 *
 * This will be displayed when server notify us
 * that actual anonymous or logged in user is not allowed.
 */

export default class Forbidden extends React.Component {

  render () {
    var loginButton;
    var text;

    if (!this.props.loggedIn) {
      text = <p>Or</p>;
      loginButton = (
        <Button
          block
          bsSize='large'
          bsStyle='primary'
          href="/"
          >
          Login
        </Button>
      );
    }

    return <div className="container error-page">
      <div className="row">
        <div className="col-md-12 text-center">

          <div className="logo">
            <h1>Forbidden</h1>
          </div>

          <p className="lead text-muted">
            <i className="fa fa-exclamation-circle"></i>
            { this.props.message }
          </p>

          <br />

          <div className="col-lg-6 col-lg-offset-3 control-links">
            <br />
            { loginButton }
            <br />
            { text }
            <Button
              block
              bsSize='large'
              bsStyle='default'
              className='btn-green'
              href="/"
              >
              Go Home
            </Button>
            <br />
          </div>

        </div>
      </div>
    </div>;
  }
}
