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


export default class Request extends React.Component {

  onClickCancelOrder (event) {
    event.preventDefault();
    OrderActions.deleteOrder();
  }

  render () {
    let requestComponent = this;
    return (
      <div>

        <StatusOrder
          status={this.props.order.status}
          isPrinter={this.props.isPrinter}
        />

        <div className="job-review">
          {this.props.order.projects.map(function (item) {
            return <ItemOrderDetail
              item={item}
              isPrinter={requestComponent.props.isPrinter}
              key={item._id}
            />;
          })}
        </div>

        <div className="row">
          <div className="col-md-8">
            <OrderDescription
              order={this.props.order}
              isPrinter={this.props.isPrinter}
            />
          </div>
        </div>

        <div className="job-order">
          <div className="col-sm-8">
            <OrderFinalPrice
              order={this.props.order}
              isPrinter={this.props.isPrinter}
            />
          </div>

          <div className="col-sm-12">
            <div className="row">
              <div className="col-sm-7 text-lg">
                <a
                  href="#"
                  onClick={this.onClickCancelOrder.bind(this)}
                  >
                  Cancel Order
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
