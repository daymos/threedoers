/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import Link from 'react-router/lib/Link';


export default class OrderApp extends React.Component {

  render () {
    let header;

    if (!this.context.isPrinter) {
      header = <div className="container">
        <br/>
        <br/>
        <div className="row">
          <div className="col-md-10 col-md-offset-1">
            <div className="row">
              <div className="col-md-6">
                <div className="step">
                  <Link to="/orders/create">
                    <img
                      src="/img/icons_printing.png"
                      style={{width: 100, height: 100}}
                      className="img-circle"/>
                  </Link>
                  <h5>Send to print</h5>
                  <p>
                    Upload an STL file, see the price<br/>
                    and order your print
                  </p>
                </div>
              </div>
              <div className="col-md-6">
                <div className="step">
                  <a href="/profile/settings">
                    <img
                      src="/img/icon-22.png"
                      style={{width: 100, height: 100}}
                      className="img-circle"/>
                  </a>
                  <h5>Upgrade your Profile</h5>
                  <p>
                    Are you a printer or a designer?<br/>
                    Click here to upgrade your profile<br/>
                    and start to print or design for<br/>
                    l&nbsp;others
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>;
    }

    return <div className="page">
      { header }
      <div className="bg-3doers">
        <div className="container">
          {this.props.children}
        </div>
      </div>
    </div>;
  }
}


OrderApp.contextTypes = {
  isPrinter: React.PropTypes.bool
};
