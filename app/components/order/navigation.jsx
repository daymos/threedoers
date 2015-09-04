/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';


const headerCreateorder = 'Upload your STL file and let us take care of the rest';

const headersCustomer = {
  'tab-crete-order': ['Create Order', 'step-one', [0], 0],
  'tab-place-order': ['Place Order', 'step-two', [1, 2], 2],
  'tab-accepted': ['Accepted', 'step-three', [3], 3],
  'tab-printing': ['Printing', 'step-four', [4], 4],
  'tab-shipping': ['Shipping', 'step-five', [5], 5]
};

const tabsCustomer = {
  'tab-crete-order': 'Preview your file and decide printing features.',
  'tab-place-order': `Your order is now available for printers to review.
You'll be notified once the work is accepted in order to proceed with the final payment.`,
  'tab-accepted': `Please proceed with the final payment within the next 24 hours to allow our printer to start working on your order.`,
  'tab-printing': `You order is printing. You'll be notified when it's shipped.`,
  'tab-shipping': `Your order has been shipped and should be delivered to you in the next 48 hours.
You can track it directly from the courrier service website using the code below.`
};

export default class OrderNavigationStatus extends React.Component {

  constructor (props, context, updater) {
    // Setup props as empty because now all are state.
    super(props, context, updater);

    let navigation = this;
    let header = headersCustomer;

    Object.keys(header).map(function (item) {
      if (header[item][2].indexOf(navigation.props.status) >= 0){
        navigation.currentTab = item;
      }
    });

    this.state = {
      hoverTab: this.currentTab
    };
  }

  handleNavMouseEnter (event) {
    let id = event.currentTarget.href.split('#')[1];
    this.setState({hoverTab: id});
  }

  handleNavMouseExit (event) {
    this.setState({hoverTab: this.currentTab});
  }

  renderUL () {
    let header = headersCustomer;
    let navigation = this;
    return (
      <ul
        className="nav nav-justified nav-3doers"
        onMouseLeave={this.handleNavMouseExit.bind(this)}
        >

        {Object.keys(header).map(function (item) {
          let href = `#${item}`;
          let className = 'nav-step';
          if (item === navigation.currentTab){
            className += ' active';
          }

          if (header[item][3] < navigation.props.status) {
            className += ' complete';
          }

          return (
            <li className={className} key={item}>
              <a
                onClick={navigation.handleNavClick}
                onMouseEnter={navigation.handleNavMouseEnter.bind(navigation)}
                href={href}>
                <span className={header[item][1]}></span>
                {header[item][0]}
              </a>
            </li>);
        })}
      </ul>
    );
  }

  renderTab () {
    let tab = tabsCustomer;
    let content = tab[this.state.hoverTab];
    if (this.props.create && this.state.hoverTab === this.currentTab) {
      content = headerCreateorder;
    }

    return (
      <div className="tab-content nav-3doers">
        <div className="tab-pane fade active in">
          <h4 className="light">{content}</h4>
        </div>
      </div>
    );
  }

  render () {
    return (
      <div role="tabpanel">
        { this.renderUL() }
        { this.renderTab() }
      </div>
    );
  }
}
