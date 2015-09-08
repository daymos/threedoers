/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import _ from 'lodash';

import OrderNavigationStatus from './navigation.jsx';

import {OrderActions} from './actions.jsx';
import {OrderStore} from './stores.jsx';
import {PageWithMenu} from '../base.jsx';
import {ORDER_STATUSES} from '../../utils/constants';

// Customer order status
import CustomerOrderStatus from './customer/order.jsx';
import CustomerRequestStatus from './customer/request.jsx';

// Printer order status


export default class Order extends PageWithMenu {

  constructor (props, context, updater) {
    let order = props.order;
    delete props.order;

    super(props, context, updater);

    this.orderStore = new OrderStore(order);
    this.state = this.orderStore.getState();
  }

  componentDidMount () {
    this.orderStore.setupPrimus();
    this.unsubscribe = this.orderStore.listen(this.onOrderChanged.bind(this));
  }

  componentWillUnmount () {
    this.unsubscribe();
  }

  onOrderChanged (state) {
    this.setState(state);
  }

  renderAppropriateStep () {
    let rendered;

    switch (this.state.order.status) {
      case ORDER_STATUSES.STARTED[0]:
        rendered = <CustomerOrderStatus {...this.state} user={this.props.user} />;
        break;
      case ORDER_STATUSES.PRINT_REQUESTED[0]:
        rendered = <CustomerRequestStatus {...this.state} user={this.props.user} />;
        break;
    }

    return rendered;
  }


  renderBlock () {
    return (
      <div>
        <OrderNavigationStatus status={this.state.order.status}/>
        {this.renderAppropriateStep()}
      </div>
    );
  }
}

