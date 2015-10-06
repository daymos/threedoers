/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';

import * as helpers from '../utils/helpers.js';


export default class OrderFinalPrice extends React.Component {

  constructor (props, context, updater) {
    super(props, context, updater);
  }

  render () {
    let title;
    let helpText;
    let finalPrice;

    if (this.props.isPrinter) {
      title = 'Total payment to you*:';
      finalPrice = helpers.calculateFinalPrinterPrice(this.props.order);
    } else {
      title = 'Price quotation*:';
      finalPrice = helpers.calculateFinalPrice(this.props.order);
      helpText = <p className="text-muted final-price">
        <small>
          * Final price will include a shipping fee and will
          be calculated once the order has been accepted.
        </small>
      </p>;
    }

    return (
      <div className="row">
        <div className="col-sm-9">
          <h4 className="job-quotation">{title}</h4>
          {helpText}
        </div>
        <div className="col-sm-3">
          <h3 className="job-price">
            <span>{finalPrice}</span>
            <span>&nbsp; €</span>
          </h3>
        </div>
      </div>
    );
  }

}
