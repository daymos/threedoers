/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import moment from 'moment';
import TimeAgo from 'react-timeago';
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
    let isMarketPlace = this.context.isPrinter &&
      this.context.listType === 'marketplace';

    let createdAt = moment(this.props.order.createdAt);

    return (
      <div className={className}>
        <article className="job">
          <h4 className="job-name">
            {()=> {
              if (!isMarketPlace) {
                return <Link
                  to={`/orders/${id}`}>{this.props.order.projects[0].project.title}
                </Link>;
              } else {
                return this.props.order.projects[0].project.title;
              }
            }()}
          </h4>

          {()=> {
            if (!isMarketPlace) {
              return <h6 className="job-created-at">
                Created on {createdAt.format('DD/MMM/YYYY')} at
                {createdAt.format('hh:mm a')}
              </h6>;
            }
          }()}

          <figure className="job-image">
            <img
              src="/images/job-preview-no-screen.jpg"
              className="img-responsive"/>
            <span className='badge'>
              {this.props.order.projects.length}
            </span>
          </figure>

          {()=> {
            if (isMarketPlace) {
              return <div className="job-wtime">This order has been waiting for
                <TimeAgo component='h5' date={this.props.order.placedAt}/>
              </div>;
            }
          }()}

          {()=> {
            if (!isMarketPlace) {
              return <div className="job-status">
                <i>Status:
                  <Link
                    to={`/orders/${id}`}> {this.orderStatus}
                  </Link>
                </i>
              </div>;
            } else {
              return <div className="form-group text-center">
                <button
                  className="btn btn-lg btn-green review"
                  disabled={!this.props.isActive}
                  >
                  REVIEW ORDER
                </button>
              </div>;
            }
          }()}
        </article>
      </div>
    );
  }
}

Order.contextTypes = {
  listType: React.PropTypes.string,
  isPrinter: React.PropTypes.bool
};


export default class ListOrder extends React.Component {

  constructor (props, context, updater) {
    super(props, context, updater);

    let filter = props.location.pathname.split('/');
    filter = filter[filter.length - 1];
    this.filter = filter;
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
      this.filter = filter;
      this.orderListStore.setFilter(filter);
      this.orderListStore.requestOrders();
    }
  }

  componentWillUnmount () {
    this.orderListStore.teardownPrimus();
    this.orderListStore.stopListeningToAll();
    this.unsubscribe();
  }

  onStatusChanged (state) {
    this.setState(state);
  }

  renderContent () {
    let isActive = this.state.orders &&
      this.context.user.printerJobs > this.state.printingOrders;

    if (this.state.orders) {
      return this.state.orders.map( function (item, index) {
        let className = ((index + 1) % 4 === 0) ? 'clear-left' : '';
        return <Order
          key={item._id}
          order={item}
          isActive={isActive}
          className={className}/>;
      });
    } else {
      return <div className="loader">Loading...</div>;
    }
  }

  renderHeader () {
    if (this.state.orders) {
      if (this.filter === 'marketplace') {
        return <h4 className='light'>
          Here you can find printing and design jobs
        </h4>;
      } else if (this.filter === 'list') {
        return <h4 className='light'>
          Here are your orders.
        </h4>;
      }
    } else {
      return <h4 className='light'>There is not any order for this list.</h4>;
    }
  }

  render () {
    let isActive = this.state.orders &&
      this.context.user.printerJobs > this.state.printingOrders;

    return <div className="container">
      <br/>
      <Navigation/>
      <br/>

      { this.renderHeader() }

      {(() => {
        if (!isActive) {
          return <div className="alert alert-warning">
            <h4>
              You need to complete at least one previous
              order before you can accept another one.
            </h4>
          </div>;
        }
      })()}

      <div className='row'>
        {this.renderContent()}
      </div>
    </div>;
  }

  getChildContext () {
    return {
      listType: this.filter
    };
  }
}

ListOrder.contextTypes = {
  isLoggedIn: React.PropTypes.bool,
  isPrinter: React.PropTypes.bool,
  user: React.PropTypes.object
};

ListOrder.childContextTypes = {
    listType: React.PropTypes.string
};

