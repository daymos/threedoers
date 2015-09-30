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
import Comments from '../comments.jsx';


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

  onSelectItem (id, event) {
    OrderActions.selectCurrentItem(id);
  }

  renderCurrentItem () {
    return (
      <div className="job-review">
        <div className="row" key={this.props.currentItem._id}>
          <div className="col-md-12">
            <h4 className="job-name">{this.props.currentItem.project.title}</h4>
          </div>
          <div className="col-md-8">
            <div className="job-details">
              <div className="row">
                <div className="col-md-7">
                  <STLViewer
                    key={this.props.currentItem._id}
                    width="344"
                    height="237"
                    stlURL={'/' + this.props.currentItem.project.design.rel}
                    projectColor={this.props.currentItem.color}
                  />
                </div>
                <div className="col-md-5">
                  <div className="info">
                    <p>
                      <strong>COLOR:</strong>
                      {this.props.currentItem.color}
                    </p>
                    <p>
                      <strong>MATERIAL:</strong>
                      {this.props.currentItem.material}
                    </p>
                    <p>
                      <strong>AMOUNT:</strong>
                      {this.props.currentItem.amount} pieces
                    </p>
                    <p>
                      <strong>ADDITIONAL PROCESSING:</strong>
                      {this.props.currentItem.needsAdditionalProcessing ? 'required' : 'not required'}
                    </p>
                    <p>
                      <strong>VOLUME:</strong>
                      {this.props.currentItem.volume} cm3
                    </p>
                    <p>
                      <strong>WEIGHT:</strong>
                      {this.props.currentItem.weight} g
                    </p>
                    <p>
                      <strong>DIMENSIONS:</strong>
                      {() => {
                        let attr = '';

                        if (this.props.currentItem.dimension) {
                          attr += this.props.currentItem.dimension.width + ' cm (W) ';
                          attr += this.props.currentItem.dimension.height + ' cm (H) ';
                          attr += this.props.currentItem.dimension.length + ' cm (L) ';
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
      </div>
    );
  }

  render () {
    return (
      <div>

        {this.renderCurrentItem()}

        <div className="row">
          <div className="col-sm-8">
            <div className="col-sm-12 list-order-items">
              <h4 className="job-name">Your order</h4>
              <p>
                <strong>{this.props.order.projects.length} file(s)</strong>
              </p>
            </div>

            <ul className="col-sm-12 list-order-items">
              {
                () => {
                  let self = this;
                  return this.props.order.projects.map(function (item) {
                    let className;
                    if (item._id === self.props.currentItem._id) {
                      className = 'active';
                    }
                    return (
                      <li
                        className={className}
                        key={item._id}
                        onClick={self.onSelectItem.bind(self, item._id)}
                        >
                        {item.project.title}
                        <span className="pull-right normal">
                          {item.totalPrice} €
                        </span>
                      </li>
                      );
                  });
                }()
              }
            </ul>
          </div>
        </div>

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

        <div className="job-order row">
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
                  >
                  Cancel Order
                </a>
              </div>
            </div>
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
