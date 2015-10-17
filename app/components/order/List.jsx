/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import moment from 'moment';
import Link from 'react-router/lib/Link';
import { PropTypes } from 'react-router';

import {ORDER_STATUSES} from '../../utils/constants';
import {OrderListStore} from './stores.jsx';


class TabItem extends React.Component {

  constructor (props, context, updater) {
    super(props, context, updater);
  }

  render () {
    let isActive =
      this.context.history.isActive(this.props.to, this.props.query);
    let className = isActive ? 'active' : '';

    return <li className={className}><Link {...this.props}/></li>;
  }

}

TabItem.contextTypes = { history: PropTypes.history };


class Navigation extends React.Component {

  constructor (props, context, updater) {
    super(props, context, updater);
  }

  renderForPrinter () {
    return <ul
      role="tablist"
      className="nav nav-tabs nav-justified nav-tabs-3doers">

      <TabItem
        to='/orders/marketplace'
        aria-controls='orders'
        >
        Marketplace
      </TabItem>

      <TabItem
        to='/orders/on-progress'
        aria-controls='on-progress'
        >
        Printing
      </TabItem>

      <li><a href="/design/projects" aria-controls="designing">Designing</a></li>

      <TabItem
        to='/orders/completed'
        aria-controls='completed'
        >
        Completed
      </TabItem>
    </ul>;
  }

  renderForCustomer () {
    return <ul
      role="tablist"
      className="nav nav-tabs nav-justified nav-tabs-3doers">
      <TabItem
        to='/orders/list'
        aria-controls='orders'
        >
        Orders
      </TabItem>

      <TabItem
        to='/orders/on-progress'
        aria-controls='on-progress'
        >
        Printing
      </TabItem>

      <li><a href="/design/projects" aria-controls="designing">Designing</a></li>

      <TabItem
        to='/orders/completed'
        aria-controls='completed'
        >
        Completed
      </TabItem>
    </ul>;
  }

  render () {
    return this.context.isPrinter ? this.renderForPrinter() :
      this.renderForCustomer();
  }

}

Navigation.contextTypes = {
  isPrinter: React.PropTypes.bool
};


class Order extends React.Component {

  constructor (props, context, updater) {
    super(props, context, updater);
  }

  get orderStatus () {
    for (let key in ORDER_STATUSES) {
      if (ORDER_STATUSES[key][0] === this.props.order.status) {
        return ORDER_STATUSES[key][1];
      }
    }
  }

  render () {
    let className = "col-md-3 col-sm-6" + this.props.className;
    let id = this.props.order.id || this.props.order._id;
    let createdAt = moment(this.props.order.createdAt);

    return (
      <div className={className}>
        <article className="job">
          <h4 className="job-name">
            <Link
              to={`/orders/${id}`}>{this.props.order.projects[0].project.title}
            </Link>
          </h4>

          <h6 className="job-created-at">
            Created on {createdAt.format('DD/MMM/YYYY')} at
            {createdAt.format('hh:mm a')}
          </h6>

          <figure className="job-image">
            <img
              src="/images/job-preview-no-screen.jpg"
              className="img-responsive"/>
            <span className='badge'>
              {this.props.order.projects.length}
            </span>
          </figure>

          <div className="job-status">
            <i>Status:
              <Link
                to={`/orders/${id}`}> {this.orderStatus}
              </Link>
            </i>
          </div>
        </article>
      </div>
    );
  }

}


export default class ListOrder extends React.Component {

  constructor (props, context, updater) {
    super(props, context, updater);

    let filter = props.location.pathname.split('/');
    filter = filter[filter.length - 1];
    this.orderListStore = new OrderListStore(props.data, filter);
    this.state = this.orderListStore.getState() || {};
  }

  componentDidMount () {
    if (!this.state.orders) {
      this.orderListStore.requestOrders();
    } else {
      this.orderListStore.setupPrimus();
    }

    this.unsubscribe = this.orderListStore.listen(this.onStatusChanged.bind(this));
  }

  componentWillReceiveProps (nextProps) {
    // we will update states to empty then request for new ones!
    if (this.props.location.pathname !== nextProps.location.pathname) {
      this.setState({orders: undefined});

      let filter = nextProps.location.pathname.split('/');
      filter = filter[filter.length - 1];
      this.orderListStore.setFilter(filter);
      this.orderListStore.requestOrders();
    }
  }

  componentWillUnmount () {
    this.orderListStore.teardownPrimus();
    this.unsubscribe();
  }

  onStatusChanged (state) {
    this.setState(state);
  }

  renderContent () {
    if (this.state.orders) {
      return this.state.orders.map( function (item, index) {
        let className = ((index + 1) % 4 === 0) ? 'clear-left' : '';
        return <Order key={item._id} order={item} className={className}/>;
      });
    } else {
      return <div className="loader">Loading...</div>;
    }

  }

  render () {
    let header;
    if (this.state.orders) {
      header = <h4 className='light'>Here are your orders</h4>;
    } else {
      header = <h4 className='light'>There is not any project yet for this list.</h4>;
    }
    return <div className="container">
      <br/>
      <Navigation/>
      <br/>

      { header }

      <div className='row'>
        {this.renderContent()}
      </div>
    </div>;
  }

}

ListOrder.contextTypes = {
  isLoggedIn: React.PropTypes.bool,
  isPrinter: React.PropTypes.bool
};
