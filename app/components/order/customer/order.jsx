/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import _ from 'lodash';
import Decimal from 'decimal.js';
import {Modal, Button, ProgressBar} from 'react-bootstrap';
import Typeahead from 'react-typeahead-component';
import cx from 'classnames';

import ProjectOrderForm from '../project-order-form.jsx';
import ProjectOrder from '../project-order.jsx';

import {OrderActions} from '../actions.jsx';
import {ORDER_STATUSES} from '../../../utils/constants';


class PrinterAutocompleteTemplate extends React.Component {
  constructor (props, context, updater) {
    super(props, context, updater);
    this.displayName = 'OptionTemplate';
  }

  render () {
    var classes = cx({
      'option': true,
      'selected-option': this.props.isSelected
    });

    return (
      <div className={classes}>
        <span className="username">{this.props.data.username}</span>
        {this.props.data.email}
      </div>
    );
  }
}


export default class OrderStatus extends React.Component {

  constructor (props, context, updater) {
    super(props, context, updater);

    this.defaultErrorMessage = 'Error uploading your file, please try again.';
    this.errorMessage = '';

    this.state = {
      error: {isVisible: false},
      printer: {text: '', selected: ''},
      isStartedValidOrder: this.isStartedValidOrder(this.props.order),
      showModal: false,
      tryToOrder: false
    };
  }

  componentDidMount () {
    this._setupUploader();
  }

  componentWillReceiveProps (nextProps) {
    this.state.isStartedValidOrder = this.isStartedValidOrder(nextProps.order);
  }

  /**
   * @return {Boolean}
   *
   * Only used for first step to know if user can place an order.
   */
  isStartedValidOrder (order) {
    for (let index in order.projects) {
      if (order.projects[index].amount <= 0) {
        return false;
      }
    }

    return true;
  }

  // utility functions
  getTotalPrice () {
    let totalPrice = new Decimal(0);
    // we need to collect all values
    _.forEach(this.props.order.projects, function(project) {
      totalPrice = totalPrice.plus(project.totalPrice);
    });

    return totalPrice.toDecimalPlaces(2).toString();
  }

  _setupUploader () {
    // if not uploader available we don't need to setup anything
    if (!this.refs.uploader) {
      return;
    }

    let orderDetail = this;
    let element = React.findDOMNode(this.refs.uploader);
    let progress = React.findDOMNode(this.refs.uploadProgress);

    $.ajaxUploadSettings.name = "design";

    $(element).ajaxUploadPrompt({
      url: `/api/v1/orders/${orderDetail.props.order._id}/upload`,

      beforeSend: function() {
        orderDetail.state.error.isVisible = false;
        orderDetail.state.showModal = true;

        // Fire update
        orderDetail.setState(orderDetail.state);
      },

      onprogress: function(e) {
        let percentComplete;
        if (e.lengthComputable) {
          percentComplete = ((e.loaded / e.total) * 100).toFixed(2);
          orderDetail.setState({uploaderPercentage: percentComplete});
        }
      },

      error: function(response) {
        orderDetail.errorMessage = response.responseText;

        orderDetail.state.error.isVisible = true;
        orderDetail.setState(orderDetail.state);
      },

      success: function(data) {
        if (data.errors) {
          orderDetail.errorMessage = data.errors.design.msg;
          orderDetail.state.error.isVisible = true;
          orderDetail.setState(orderDetail.state);
        } else {
          // should send action with new item
          orderDetail.state.showModal = false;
          orderDetail.state.error.isVisible = false;
          orderDetail.state.uploaderPercentage = 0;
          orderDetail.setState(orderDetail.state);

          OrderActions.newItemAdded(data);
        }
      }
    });
  }

  // Event handlers

  onClickPlaceOrder (event) {
    if (this.props.user.username) {

    } else {
      // If not logged in user will be ask to login or signup
      this.state.showModal = true;
      this.state.tryToOrder = true;
      this.setState(this.state);
    }
  }

  onClickCancelOrder (event) {
    event.preventDefault();
    OrderActions.deleteOrder();
  }

  onChangePrinterAutocomplete (event) {
    let value = event.target.value;

    this.state.printer.text = value;
    this.setState(this.state);

    if (this._timeoutPrinterAutocompleteDelay) {
      clearTimeout(this._timeoutPrinterAutocompleteDelay);
    }

    this._timeoutPrinterAutocompleteDelay = setTimeout(function () {
      OrderActions.requestPrinters(value);
    }, 500);
  }

  onCompletePrinterAutocomplete (event, option, index) {
    if (index === -1) {
      this.state.printer.text = option;
      this.state.printer.selected = '';
    } else {
      this.state.printer.text = option.username;
      this.state.printer.selected = option.username;
    }
    this.setState(this.state);
  }

  onUploadMore (event) {
    event.preventDefault();
  }

  onHideModal () {
    this.state.error.isVisible = false;
    this.state.tryToOrder = false;
    this.state.showModal = false;
    this.setState(this.state);
  }

  onSelectItem (id, event) {
    OrderActions.selectCurrentItem(id);
  }

  onDeleteItem (id, event) {
    event.preventDefault();
    event.stopPropagation();
    OrderActions.deleteItem(id);
  }

  // render blocks

  getSelectedPrinter () {
    if (this.state.printer.text.trim() === '') {
      return '';
    } else if (this.state.printer.text.trim() === this.state.printer.selected) {
      return (
        <div className="autocomplete-printer-found">
          <img src="/images/check.png" alt=""/><span> Printer found</span>
        </div>
      );
    } else {
      return (
        <div className="autocomplete-printer-not-found">
          <img src="/images/close.png" alt=""/><span> Printer not found</span>
        </div>
      );
    }
  }

  get _modalTitle () {
    if (this.state.tryToOrder) {
      return 'You need to be part of 3Doers';
    } else {
      return 'Uploading file...';
    }
  }

  get _modalFooter () {
  }

  get _modalBody () {
    if (this.state.tryToOrder) {
      return (
        <div>
          <h1 className="text-center">Sorry! You missed one step.</h1>
          <p className="text-center">
            To order you need to follow what one the following actions.
          </p>

          <p className="text-center anonymous">
            <a href="/accounts/signup" className="btn btn-green btn-lg">
              Signup
            </a>
            or
            <a href="/accounts/login" className="btn btn-green btn-lg">
              Login
            </a>
          </p>
        </div>
      );
    } else {
      return (
        <div>
          {() => {
            if (this.state.error.isVisible) {
              return (
                <div>
                  <br/>
                  <div className="alert alert-danger">
                    {this.errorMessage}
                  </div>
                </div>
                );
            }
          }()}
          <ProgressBar
            now={this.state.uploaderPercentage}
            label='%(percent)s%'
          />
        </div>
      );
    }
  }

  render () {
    return (
      <div className="job-order">
        <div className="row">
          <div className="col-md-9">
            <div className="job-details">
              <div className="row">
                <div className="col-md-7">
                  <ProjectOrder item={this.props.currentItem} />
                </div>
                <div className="col-md-5">
                  <h4>&nbsp;</h4>
                  <h5>&nbsp;</h5>
                  <ProjectOrderForm
                    color={this.props.currentItem.color}
                    material={this.props.currentItem.material}
                    amount={this.props.currentItem.amount}
                    totalPrice={this.props.currentItem.totalPrice}
                    needsAdditionalProcessing={this.props.currentItem.needsAdditionalProcessing}
                  />
                </div>

                <div className="col-sm-12">
                  <div className="col-sm-12 list-order-items">
                    <h4 className="job-name">Your order</h4>
                    <p>
                      <strong>{this.props.order.projects.length} file(s)</strong>
                      <a
                        href="#"
                        className="green pull-right"
                        ref="uploader"
                        onClick={this.onUploadMore.bind(this)}
                        >
                        Upload more
                      </a>
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
                              <a
                                href="#"
                                className="pull-right normal"
                                onClick={self.onDeleteItem.bind(self, item._id)}
                                >
                                X
                              </a>
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

                <div className="col-sm-12">
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

                    <div className="col-sm-5">
                      <button
                        className="btn btn-green btn-lg btn-block"
                        href=""
                        disabled={!this.state.isStartedValidOrder}
                        onClick={this.onClickPlaceOrder.bind(this)}
                      >
                        PLACE ORDER
                      </button>
                    </div>
                  </div>
                </div>

                <div className="col-sm-12">
                  <h4>Do you have a printer reference?</h4>
                  <p>
                    If you know who should print your order, insert the
                    printer's e-mail or username directly submit your order
                    to him, otherwise leave it blank.
                  </p>

                  <div className="row">
                    <div className="col-md-5">
                      <div className="form-group has-feedback">
                        <Typeahead
                          inputValue={this.state.printer.text}
                          placeholder="E-mail or username of the printer"
                          optionTemplate={PrinterAutocompleteTemplate}
                          customClasses={{input: "form-control"}}
                          options={this.props.printers}
                          onChange={this.onChangePrinterAutocomplete.bind(this)}
                          onOptionChange={this.onCompletePrinterAutocomplete.bind(this)}
                          onOptionClick={this.onCompletePrinterAutocomplete.bind(this)}
                        />
                      </div>
                    </div>
                    <div className="col-md-5">
                      {this.getSelectedPrinter()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Modal show={this.state.showModal} onHide={this.onHideModal.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>{this._modalTitle}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {this._modalBody}
          </Modal.Body>
          <Modal.Footer>
            {this._modalFooter}
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
}

