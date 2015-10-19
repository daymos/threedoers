/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import _ from 'lodash';
import Loader from 'react-loader';

import OrderNavigationStatus from './navigation.jsx';

import {OrderActions} from './actions.jsx';
import {OrderStore} from './stores.jsx';
import {ORDER_STATUSES} from '../../utils/constants';

// Customer order status
import CustomerOrderStatus from './customer/order.jsx';
import CustomerRequestStatus from './customer/request.jsx';
import CustomerReviewStatus from './customer/review.jsx';
import CustomerAcceptedStatus from './customer/accepted.jsx';
import CustomerPrintingStatus from './customer/printing.jsx';
import CustomerShippingStatus from './customer/shipping.jsx';

// Printer order status
import PrinterReviewStatus from './printer/review.jsx';
import PrinterAcceptedStatus from './printer/accepted.jsx';
import PrinterPrintingStatus from './printer/printing.jsx';
import PrinterPrintedStatus from './printer/printed.jsx';
import PrinterShippingStatus from './printer/shipping.jsx';


export default class Order extends React.Component {

  constructor (props, context, updater) {
    super(props, context, updater);

    this.orderStore = new OrderStore(props.order);
    this.state = this.orderStore.getState() || {};
  }

  componentDidMount () {
    if (!this.state.order) {
      this.orderStore.requestOrder(this.props.params.id);
    } else {
      this.orderStore.setupPrimus();
    }

    this.unsubscribe = this.orderStore.listen(this.onOrderChanged.bind(this));
  }

  componentWillUnmount () {
    this.orderStore.teardownPrimus();
    this.unsubscribe();
    this.orderStore.stopListeningToAll();
  }

  onOrderChanged (state) {
    let shouldRedirect = !state.order;
    shouldRedirect |= (this.isPrinter() && !state.order.printer);

    if (shouldRedirect) {
      this.context.history.goBack();
    } else {
      this.setState(state);
    }
  }

  isPrinter () {
    return this.context.user && this.context.user.printer &&
      (this.context.user.printer === 'accepted' ||
      this.context.user.isPrinter);
  }

  renderAppropriateStep () {
    let rendered;
    let isPrinter = this.isPrinter();
    let props = {...this.state, user: this.context.user, isPrinter};

    switch (this.state.order.status) {
      case ORDER_STATUSES.STARTED[0]:
        rendered = <CustomerOrderStatus {...props}/>;
        break;
      case ORDER_STATUSES.PRINT_REQUESTED[0]:
        rendered = <CustomerRequestStatus {...props}/>;
        break;
      case ORDER_STATUSES.PRINT_REVIEW[0]:
        if (isPrinter) {
          rendered = <PrinterReviewStatus {...props}/>;
        } else {
          rendered = <CustomerReviewStatus {...props}/>;
        }
        break;
      case ORDER_STATUSES.PRINT_ACCEPTED[0]:
        if (isPrinter) {
          rendered = <PrinterAcceptedStatus {...props}/>;
        } else {
          rendered = <CustomerAcceptedStatus {...props}/>;
        }
        break;
      case ORDER_STATUSES.PRINTING[0]:
        if (isPrinter) {
          rendered = <PrinterPrintingStatus {...props}/>;
        } else {
          rendered = <CustomerPrintingStatus {...props}/>;
        }
        break;
      case ORDER_STATUSES.PRINTED[0]:
        if (isPrinter) {
          rendered = <PrinterPrintedStatus {...props}/>;
        } else {
          rendered = <CustomerPrintingStatus {...props}/>;
        }
        break;
      case ORDER_STATUSES.SHIPPING[0]:
      case ORDER_STATUSES.ARCHIVED[0]:
        if (isPrinter) {
          rendered = <PrinterShippingStatus {...props}/>;
        } else {
          rendered = <CustomerShippingStatus {...props}/>;
        }
        break;
    }

    return rendered;
  }

  render () {
    if (this.state.order) {
      return <div>
        <OrderNavigationStatus
          status={this.state.order.status}
          isPrinter={this.isPrinter()}
        />
        {this.renderAppropriateStep()}
      </div>;
    } else {
      return <div className="loader">Loading...</div>;
    }
  }
}


Order.contextTypes = {
  user: React.PropTypes.object,
  history: React.PropTypes.object
};

