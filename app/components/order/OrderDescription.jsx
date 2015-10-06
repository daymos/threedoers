/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import Decimal from 'decimal.js';
import _ from 'lodash';

import * as helpers from '../utils/helpers.js';


export default class OrderDescription extends React.Component {

  constructor (props, context, updater) {
    super(props, context, updater);
  }

  getAdditionalProcessing () {
    let total = new Decimal(0);
    let isPrinter = this.props.isPrinter;

    _.each(this.props.order.projects, function (project) {
      if (project.needsAdditionalProcessing) {
        total = total.plus(helpers.getItemPolishingPrice(project, isPrinter));
      }
    });

    return total.toDecimalPlaces(2).toString();
  }

  render () {
    let orderDescription = this;
    return (
      <div className="order-details">
        <h4 className="order-name">Your order quotation</h4>
        { this.props.order.projects.map(function (item) {
          return (
            <p key={item._id}>
              <span>{item.project.title} x {item.amount}</span>
              <span>
                {helpers.getItemPrice(item, orderDescription.props.isPrinter)} €
              </span>
            </p>
            );
        })}

        <p>
          <span>Additional processing</span>
          <span>{this.getAdditionalProcessing()} €</span>
        </p>

        <p>
          <span>Taxes</span>
          <span>{helpers.calculateTotalTaxes(this.props.order)} €</span>
        </p>

        <p>
          <span>Shipping</span>
          <span>
            {this.props.order.rate ? this.props.order.rate.amount_local : 0} €
          </span>
        </p>
      </div>
    );
  }

}
