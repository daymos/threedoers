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

  onClickCancelOrder (event) {
    event.preventDefault();
    OrderActions.deleteOrder();
  }

  onClickPaymentButton () {
    event.preventDefault();
  }

  get shippingPrice () {
    if (this.props.order.rate) {
      return this.props.order.rate.amount_local + ' €';
    } else {
      return 'Pending';
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
          <div className='col-md-offset-8 col-md-3'>
            <p>
              <strong className='text-shadow-3doers'>Total to you: </strong>
              <span className="pull-right">
                <strong>
                  {helpers.calculateFinalPrinterPrice(this.props.order)} €
                </strong>
              </span>
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
