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

import ItemOrderForm from '../ItemOrderForm.jsx';
import ProjectOrder from '../project-order.jsx';

import {OrderActions} from '../actions.jsx';
import {ORDER_STATUSES, EUROPE_COUNTRIES} from '../../../utils/constants';


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
      requestAddress: false,
      showModal: false,
      tryToOrder: false
    };
  }

  componentDidMount () {
    this._setupUploader();
  }

  componentWillReceiveProps (nextProps) {
    this.state.isStartedValidOrder = this.isStartedValidOrder(nextProps.order);
    this.state.requestAddress = !!nextProps.errors.address &&
      !nextProps.errors.address.ok;
    this.state.showModal = this.state.requestAddress;
    this.state.tryToOrder = this.state.requestAddress;

    if (nextProps.errors.address && nextProps.errors.address.success) {
      // if address was success
      this.triggerRequestOrder();
    }
  }

  /**
   * @return {Boolean}
   *
   * Only used for first step to know if user can place an order.
   */
  isStartedValidOrder (order) {
    if (order.projects.length === 0) {
      return false;
    }

    for (let index in order.projects) {
      if (order.projects[index].amount <= 0) {
        return false;
      }
    }

    if (this.state && this.state.printer) {
      if (this.state.printer.text.trim() === '') {
        return true;
      } else if (this.state.printer.text.trim() === this.state.printer.selected) {
        return true;
      } else {
        return false;
      }
    }
    return true;
  }

  triggerRequestOrder () {
    let printer;
    let printerSelected = this.state.printer.text.trim() !== '';
    printerSelected = printerSelected &&
      this.state.printer.text.trim() === this.state.printer.selected;

    if (printerSelected) {
      printer = this.state.printer.id;
    }

    OrderActions.requestOrder(printer);
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
    let element = this.refs.uploader;
    let progress = this.refs.uploadProgress;

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

  onCreateAddress (event) {
    let address = {
      name: this.refs.contact.value,
      company: this.refs.company.value,
      street1: this.refs.street1.value,
      street2: this.refs.street2.value,
      street_no: this.refs.street_no.value,
      city: this.refs.city.value,
      state: this.refs.state.value,
      zip_code: this.refs.zip_code.value,
      phone_no: this.refs.phone_no.value,
      country: this.refs.country.value
    };

    OrderActions.createAddress(address);
  }

  onClickPlaceOrder (event) {
    if (this.props.user.username) {
      this.triggerRequestOrder();
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
      this.state.printer.id = option._id;
    }
    this.state.isStartedValidOrder = this.isStartedValidOrder(this.props.order);
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

  // TODO: Refactor this to use in many components!!!!
  getFormGroupClassNames (field) {
    return (field ? 'form-group has-error' : 'form-group');
  }

  getFormGroupError (field) {
    if (field) {
      return <span className='help-block'>{field.msg}</span>;
    }
  }

  // render blocks
  getAddressForm () {
    return (
      <form className='form-horizontal'>
        <div
          className={
            () => {
              return this.getFormGroupClassNames(this.props.errors.address.name);
            }()
          }
          >

          <label forHtml="contact" className="col-sm-4 control-label">Contact *</label>
          <div className="col-sm-6">
            <input id="contact" ref="contact" type="text" className="form-control"/>
            {
              () => {
                return this.getFormGroupError(this.props.errors.address.name);
              }()
            }
          </div>
        </div>

        <div className="form-group">
          <label forHtml="company" className="col-sm-4 control-label">Company</label>
          <div className="col-sm-6">
            <input id="company" ref="company" type="text" className="form-control"/>
          </div>
        </div>

        <div
          className={
            () => {
              return this.getFormGroupClassNames(this.props.errors.address.street1);
            }()
          }
          >

          <label forHtml="street1" className="col-sm-4 control-label">Street 1 *</label>
          <div className="col-sm-6">
            <input id="street1" ref="street1" type="text" className="form-control"/>
            {
              () => {
                return this.getFormGroupError(this.props.errors.address.street1);
              }()
            }
          </div>
        </div>

        <div className="form-group">
          <label forHtml="street2" className="col-sm-4 control-label">Street 2</label>
          <div className="col-sm-6">
            <input id="street2" ref="street2" type="text" className="form-control"/>
          </div>
        </div>

        <div className="form-group">
          <label forHtml="street_no" className="col-sm-4 control-label">Street No.</label>
          <div className="col-sm-6">
            <input id="street_no" ref="street_no" type="text" className="form-control"/>
          </div>
        </div>

        <div
          className={
            () => {
              return this.getFormGroupClassNames(this.props.errors.address.city);
            }()
          }
          >

          <label forHtml="city" className="col-sm-4 control-label">City *</label>
          <div className="col-sm-6">
            <input id="city" ref="city" type="text" className="form-control"/>
            {
              () => {
                return this.getFormGroupError(this.props.errors.address.city);
              }()
            }
          </div>
        </div>

        <div className="form-group">
          <label forHtml="state" className="col-sm-4 control-label">State or Province</label>
          <div className="col-sm-6">
            <input id="state" ref="state" type="text" className="form-control"/>
          </div>
        </div>

        <div
          className={
            () => {
              return this.getFormGroupClassNames(this.props.errors.address.zip_code);
            }()
          }
          >

          <label forHtml="zip_code" className="col-sm-4 control-label">Zip Code *</label>
          <div className="col-sm-6">
            <input id="zip_code" ref="zip_code" type="text" className="form-control"/>
            {
              () => {
                return this.getFormGroupError(this.props.errors.address.zip_code);
              }()
            }
          </div>
        </div>

        <div
          className={
            () => {
              return this.getFormGroupClassNames(this.props.errors.address.phone_no);
            }()
          }
          >

          <label forHtml="phone_no" className="col-sm-4 control-label">Phone No. *</label>
          <div className="col-sm-6">
            <input id="phone_no" ref="phone_no" type="text" className="form-control"/>
            {
              () => {
                return this.getFormGroupError(this.props.errors.address.phone_no);
              }()
            }
          </div>
        </div>

        <div className="form-group">
          <label forHtml="country" className="col-sm-4 control-label">Country</label>
          <div className="col-sm-6">
            <select name="country" className="form-control" ref="country">
              {() => {
                return EUROPE_COUNTRIES.map(function (item) {
                  return <option key={item.abbr} value={item.abbr}>{item.name}</option>;
                });
              }()}
            </select>
          </div>
        </div>
      </form>
    );
  }

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
      if (this.state.requestAddress) {
        return 'Address Form';
      } else {
        return 'You need to be part of 3Doers';
      }
    } else {
      return 'Uploading file...';
    }
  }

  get _modalFooter () {
    if (this.state.tryToOrder && this.state.requestAddress) {
      return (
        <div>
          <button
            className="btn btn-danger"
            onClick={this.onHideModal.bind(this)}
            >
            Cancel
          </button>
          <button
            className="btn btn-green"
            onClick={this.onCreateAddress.bind(this)}
            >
            Create Address
          </button>
        </div>
      );
    }
  }

  get _modalBody () {
    if (this.state.tryToOrder) {
      if (this.state.requestAddress) {
        return this.getAddressForm();
      } else {
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
      }
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
                  <ItemOrderForm
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

