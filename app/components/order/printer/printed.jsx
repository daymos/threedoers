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

  onClickRequestLabel () {
    this.setState({tryToSetPrinted: true});
    OrderActions.updateTransaction();
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

  renderButton () {
    if (!this.props.order.transaction.label_url) {
      return (
        <div>
          <button
            className="btn btn-xlg btn-block btn-green"
            onClick={this.onClickRequestLabel.bind(this)}
            >
            REQUEST LABEL
          </button>

          <br />

          <p className="text-muted text-light text-xsmall">
            If shipping label is not generated by clicking send an email
            to <a href='mailto:shipping@3doers.it'>shipping@3doers.it</a> to
            request one
          </p>
        </div>
      );
    } else {
      return <a
        className="btn btn-xlg btn-block btn-green"
        href={this.props.order.transaction.label_url}
        target='_blank'
        >
        PRINT SHIPPING LABEL
      </a>;
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

            {this.renderButton()}
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
