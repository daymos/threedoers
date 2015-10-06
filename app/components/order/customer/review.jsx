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
import {EURO_TAXES} from '../../../utils/constants';

import STLViewer from '../../utils/stl-viewer.jsx';
import Comments from '../comments.jsx';


export default class Request extends React.Component {

  getTotalPrice () {
    let totalPrice = new Decimal(0);
    // we need to collect all values
    _.forEach(this.props.order.projects, function(project) {
      totalPrice = totalPrice.plus(project.totalPrice);
    });

    totalPrice = totalPrice.plus(this.getTotalAdditional());

    return totalPrice.toDecimalPlaces(2).toString();
  }

  getTotalAdditional () {
    let totalPrice = new Decimal(0);
    // we need to collect all values
    _.forEach(this.props.order.projects, function(project) {
      totalPrice = totalPrice.plus(project.additionalProcessing);
    });

    return totalPrice.toDecimalPlaces(2).toString();
  }

  calculateTaxes () {
    let price = new Decimal(this.getTotalPrice());
    return price.times(EURO_TAXES).toDecimalPlaces(2).toString();
  }

  getPriceWithoutTaxes (item) {
    let price = new Decimal(item.totalPrice);
    let tax = price.times(EURO_TAXES);
    return price.minus(tax).toDecimalPlaces(2).toString();
  }

  getAdditionalWithoutTaxes () {
    let price = new Decimal(this.getTotalAdditional());
    let tax = price.times(EURO_TAXES);
    return price.minus(tax).toDecimalPlaces(2).toString();
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
                                attr += item.dimension.width + ' cm (W) ';
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

  getPrinterAvatar () {
    if (this.props.order.printer.photo) {
      return <img src={"/" + this.props.order.printer.photo} alt="" className="media-object" />;
    } else {
      return <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9InllcyI/PjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ibm9uZSI+PGRlZnMvPjxyZWN0IHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgZmlsbD0iI0VFRUVFRSIvPjxnPjx0ZXh0IHg9IjEzLjQ2MDkzNzUiIHk9IjMyIiBzdHlsZT0iZmlsbDojQUFBQUFBO2ZvbnQtd2VpZ2h0OmJvbGQ7Zm9udC1mYW1pbHk6QXJpYWwsIEhlbHZldGljYSwgT3BlbiBTYW5zLCBzYW5zLXNlcmlmLCBtb25vc3BhY2U7Zm9udC1zaXplOjEwcHQ7ZG9taW5hbnQtYmFzZWxpbmU6Y2VudHJhbCI+NjR4NjQ8L3RleHQ+PC9nPjwvc3ZnPg==" className="media-object"/>;
    }
  }

  render () {
    return (
      <div>
        <div className="alert alert-primary">
          <div className="media">
            <div className="media-left">
              <a href="#">{this.getPrinterAvatar()}</a>
            </div>
            <div className="media-body media-middle">
              <div className="message">
                <strong> {this.props.order.printer.username} </strong>
                is currently reviewing this order and may contact you
              </div>
            </div>
          </div>
        </div>

        {this.renderItems()}

        <div className="row">
          <div className="col-md-8">
            <div className="order-details">
              <h4 className="order-name">Your order quotation</h4>
              {() => {
                let reviewComponent = this;
                return this.props.order.projects.map(function (item) {
                  return (
                    <p key={item._id}>
                      <span>{item.project.title} x {item.amount}</span>
                      <span>{reviewComponent.getPriceWithoutTaxes(item)} €</span>
                    </p>
                  );
                });
              }()}

              <p>
                <span>Additional processing</span>
                <span>{this.getAdditionalWithoutTaxes()} €</span>
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
                  onClick={this.onClickCancelOrder.bind(this)}
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
