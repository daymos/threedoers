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
    this.state = {
      tryToSetPrinted: false
    };
  }

  componentWillReceiveProps (nextProps) {
    this.setState({
      tryToSetPrinted: !(this.state.tryToSetPrinted && this.props.errors.printed)
    });
  }

  onClickOrderPrinted () {
    this.setState({tryToSetPrinted: true});
    OrderActions.orderPrinted();
  }

  renderPaymentError () {
    if (this.props.errors.printed) {
      return (
        <div className='alert alert-danger'>
          {this.props.errors.printed}
        </div>
      );
    }
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
              <strong className='text-shadow-3doers'>Total to you: </strong>
              <span className="pull-right">
                <strong>
                  {helpers.calculateFinalPrinterPrice(this.props.order)} €
                </strong>
              </span>
            </p>

            <br />

            <button
              className="btn btn-xlg btn-block btn-green"
              disabled={this.state.tryToSetPrinted}
              onClick={this.onClickOrderPrinted.bind(this)}
              >
              ORDER PRINTED
            </button>

            <br />

            <p className="text-muted text-light text-xsmall">
              Click the button above to generate a shipping label.
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
