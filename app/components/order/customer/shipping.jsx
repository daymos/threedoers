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


export default class PrintingStatus extends React.Component {

  constructor (props, context, updater) {
    super(props, context, updater);
  }

  render () {
    let acceptedComponent = this;

    return (
      <div>

        <div className="job-review">
          {this.props.order.projects.map(function (item) {
            return <ItemOrderDetail
              item={item}
              isPrinter={acceptedComponent.props.isPrinter}
              key={item._id}
            />;
          })}
        </div>

        <div className='row'>
          <div className='col-md-offset-8 col-md-4'>
            <p>
              <strong>Shipping: </strong>
              <span className="pull-right">
                {this.props.order.rate.amount_local} €
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
