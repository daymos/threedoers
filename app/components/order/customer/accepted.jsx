/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import {OrderActions} from '../actions.jsx';

import ItemOrderDetail from '../ItemOrderDetail.jsx';
import OrderDescription from '../OrderDescription.jsx';
import OrderFinalPrice from '../OrderFinalPrice.jsx';
import StatusOrder from '../StatusOrder.jsx';
import Comments from '../comments.jsx';

import * as helpers from '../../utils/helpers.js';


export default class AcceptedStatus extends React.Component {

  constructor (props, context, updater) {
    super(props, context, updater);
    this.state = {
      tryToPay: false
    };
  }

  componentWillReceiveProps (nextProps) {
    this.setState({
      tryToPay: !(this.state.tryToPay && this.props.errors.paypal)
    });
  }

  onClickCancelOrder (event) {
    event.preventDefault();
    OrderActions.deleteOrder();
  }

  onClickPaymentButton () {
    event.preventDefault();
    this.setState({tryToPay: true});

    OrderActions.payOrder();
  }

  get shippingPrice () {
    if (this.props.order.rate) {
      return this.props.order.rate.amount_local + ' €';
    } else {
      return 'Pending';

    }
  }

  renderPaymentError () {
    if (this.props.errors.paypal) {
      return (
        <div className='alert alert-danger'>
          {this.props.errors.paypal}
        </div>
      );
    }
  }

  render () {
    let acceptedComponent = this;

    return (
      <div>
        <StatusOrder
          status={this.props.order.status}
          isPrinter={this.props.isPrinter}
          printer={this.props.order.printer}
        />

        <div className="job-review">
          {this.props.order.projects.map(function (item) {
            return <ItemOrderDetail
              item={item}
              isPrinter={acceptedComponent.props.isPrinter}
              key={item._id}
            />;
          })}
        </div>

        <div className="job-order row">
          <div className="col-sm-12 text-lg">
            <a
              href="#"
              onClick={this.onClickCancelOrder.bind(this)}
              >
              Cancel Order
            </a>
          </div>
        </div>

        <div className='row'>
          <div className='col-md-offset-8 col-md-4'>
            <p>
              <strong>Shipping: </strong>
              <span className="pull-right">
                {this.shippingPrice}
              </span>
            </p>
            <p>
              <strong className='text-shadow-3doers'>Total: </strong>
              <span className="pull-right">
                <strong>
                  {helpers.calculateFinalPrice(this.props.order)} €
                </strong>
              </span>
            </p>

            <p className="text-muted text-light text-xsmall">
              If you need an invoice please contact us
              at <a href='mailto:invoicing@3doers.it'>invoicing@3doers.it</a> including
              your name and VAT number.
            </p>

            <br />

            {this.renderPaymentError()}

            <button
              className="btn btn-xlg btn-block btn-green"
              onClick={this.onClickPaymentButton.bind(this)}
              disabled={!this.props.order.rate || this.state.tryToPay}
              >
              PROCEED WITH PAYMENT
            </button>

            <br />

            <p className="text-muted text-light text-xsmall">
              The payment will be secured on 3Doers account and won’t be
              released to the printer until the order has been completed and
              delivered to you.
            </p>
          </div>
        </div>

        <Comments
          isPrinter={this.props.isPrinter}
          user={this.props.user}
          comments={this.props.order.comments}
        />
        <br/>
        <br/>
      </div>
    );
  }
}
