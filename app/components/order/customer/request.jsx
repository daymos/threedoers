/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import _ from 'lodash';
import Decimal from 'decimal.js';
import {OrderActions} from '../actions.jsx';

import STLViewer from '../../utils/stl-viewer.jsx';


export default class Request extends React.Component {

  getTotalPrice () {
    let totalPrice = new Decimal(0);
    // we need to collect all values
    _.forEach(this.props.order.projects, function(project) {
      totalPrice = totalPrice.plus(project.totalPrice);
    });

    return totalPrice.toDecimalPlaces(2).toString();
  }

  calculateTaxes () {
    let price = new Decimal(this.getTotalPrice());
    return price.times(0.0522).toDecimalPlaces(2).toString();
  }

  onClickCancelOrder (event) {
    event.preventDefault();
    OrderActions.deleteOrder();
  }

  renderItems () {
    return (
      <div className="job-review">
        {() => {
          return this.props.order.projects.map(function (item) {
            return (
              <div className="row" key={item._id}>
                <div className="col-md-12">
                  <h4 className="job-name">{item.project.title}</h4>
                </div>
                <div className="col-md-8">
                  <div className="job-details">
                    <div className="row">
                      <div className="col-md-5">
                        <STLViewer
                          key={item._id}
                          width="237"
                          height="237"
                          stlURL={'/' + item.project.design.rel}
                          projectColor={item.color}
                        />
                      </div>
                      <div className="col-md-7">
                        <div className="info">
                          <p>
                            <strong>COLOR:</strong>
                            {item.color}
                          </p>
                          <p>
                            <strong>MATERIAL:</strong>
                            {item.material}
                          </p>
                          <p>
                            <strong>AMOUNT:</strong>
                            {item.amount} pieces
                          </p>
                          <p>
                            <strong>ADDITIONAL PROCESSING:</strong>
                            {item.needsAdditionalProcessing ? 'required' : 'not required'}
                          </p>
                          <p>
                            <strong>VOLUME:</strong>
                            {item.volume} cm3
                          </p>
                          <p>
                            <strong>WEIGHT:</strong>
                            {item.weight} g
                          </p>
                          <p>
                            <strong>DIMENSIONS:</strong>
                            {() => {
                              let attr = '';

                              if (item.dimension) {
                                attr += item.dimension.weight + ' cm (W) ';
                                attr += item.dimension.height + ' cm (H) ';
                                attr += item.dimension.length + ' cm (L) ';
                              }

                              return attr;
                            }()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          });
        }()}
      </div>
    );
  }

  render () {
    return (
      <div>
        {this.renderItems()}

        <div className="row">
          <div className="col-md-8">
            <div className="order-details">
              <h4 className="order-name">Your order quotation</h4>
              {() => {
                return this.props.order.projects.map(function (item) {
                  return (
                    <p>
                      <span>{item.project.title} x {item.amount}</span>
                      <span>{item.totalPrice} €</span>
                    </p>
                  );
                });
              }()}

              <p>
                <span>Additional processing</span>
                <span>0 €</span>
              </p>

              <p>
                <span>Taxes</span>
                <span>{this.calculateTaxes()} €</span>
              </p>

              <p>
                <span>Shipping</span>
                <span>0 €</span>
              </p>
            </div>
          </div>
        </div>

        <div className="job-order">
          <div className="col-sm-8">
            <div className="row">
              <div className="col-sm-9">
                <h4 className="job-quotation">Price quotation*:</h4>

                <p className="text-muted final-price">
                  <small>
                    * Final price will include a shipping fee and will
                    be calculated once the order has been accepted.
                  </small>
                </p>
              </div>

              <div className="col-sm-3">
                <h3 className="job-price">
                  <span>{this.getTotalPrice()}</span>
                  <span>&nbsp; €</span>
                </h3>
              </div>
            </div>
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
