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
  'tab-printing': ['Printing', 'step-four', [4, 5], 5],
  'tab-shipping': ['Shipping', 'step-five', [6], 6]
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

const headersPrinter = {
  'tab-review': ['Review', 'step-one', [2], 2],
  'tab-accepted': ['Accepted', 'step-two', [3], 3],
  'tab-printing': ['Printing', 'step-three', [4, 5], 5],
  'tab-shipping': ['Shipping', 'step-four', [6], 6]
};

const tabsPrinter = {
  'tab-review': 'You have 24 hours to review and accept this order before it' +
  'goes automatically back to the Workplace.',
  'tab-accepted': '',
  'tab-printing': 'You can now proceed with the printing, remember that a ' +
  'faster service will result in a higher rating for you.\nOnce you\'ve ' +
  'completed the order, please click on "ORDER PRINTED" to generate a ' +
  'shipping label.',
  'tab-shipping': 'Print the shipping label, pack the item and attach the label on it.'
};


export default class OrderNavigationStatus extends React.Component {

  constructor (props, context, updater) {
    // Setup props as empty because now all are state.
    super(props, context, updater);
    this.setCorrectHeader();
  }

  setCorrectHeader (props) {
    let navigation = this;
    let header = (this.props.isPrinter) ? headersPrinter : headersCustomer;
    let actualProps = props || this.props;

    Object.keys(header).map(function (item) {
      if (header[item][2].indexOf(actualProps.status) >= 0){
        navigation.currentTab = item;
      }
    });

    this.state = {
      hoverTab: this.currentTab
    };
  }

  componentWillReceiveProps (nextProps) {
    this.setCorrectHeader(nextProps);
  }

  handleNavMouseEnter (event) {
    let id = event.currentTarget.href.split('#')[1];
    this.setState({hoverTab: id});
  }

  handleNavMouseExit (event) {
    this.setState({hoverTab: this.currentTab});
  }

  renderUL () {
    let header = (this.props.isPrinter) ? headersPrinter : headersCustomer;
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
    let tab = (this.props.isPrinter) ? tabsPrinter : tabsCustomer;
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
