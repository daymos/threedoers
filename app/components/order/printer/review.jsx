/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import _ from 'lodash';
import Decimal from 'decimal.js';
import { Modal, Button, Alert } from 'react-bootstrap';
import { OrderActions } from '../actions.jsx';
import { PRINTING_PERCENTAGE, EURO_TAXES } from '../../../utils/constants';
import { EUROPE_COUNTRIES } from '../../../utils/constants';

import STLViewer from '../../utils/stl-viewer.jsx';
import Comments from '../comments.jsx';


export default class Request extends React.Component {

  constructor (props, context, updater) {
    super(props, context, updater);

    this.defaultErrorMessage = 'Error uploading your file, please try again.';
    this.errorMessage = '';

    this.state = {
      requestAddress: false,
      requestPaypalAddress: false,
      showModal: false,
      tryToAccept: false
    };
  }

  componentWillReceiveProps (nextProps) {
    this.state.requestAddress = !!nextProps.errors.address &&
      !nextProps.errors.address.ok;

    this.state.requestPaypalAddress = !!nextProps.errors.paypal &&
      !nextProps.errors.paypal.ok;

    this.state.showModal = this.state.requestAddress ||
      this.state.requestPaypalAddress;

    this.state.tryToAccept = this.state.requestAddress ||
      this.state.requestPaypalAddress;

    if (!(nextProps.errors.address && nextProps.errors.address.success) ^
        !(nextProps.errors.paypal && nextProps.errors.paypal.success)) {
      // if address was success
      this.triggerAcceptOrder();
    }
  }

  triggerAcceptOrder () {
    OrderActions.acceptOrder();
  }

  getTotalPrice () {
    let totalPrice = new Decimal(0);
    let self = this;

    // we need to collect all values
    _.forEach(this.props.order.projects, function(project) {
      totalPrice = totalPrice.plus(self.getTotalPrinterItem(project));
    });

    return totalPrice.toDecimalPlaces(2).toString();
  }

  calculateTaxes () {
    let price = new Decimal(this.getTotalPrice());
    return price.times(0.0522).toDecimalPlaces(2).toString();
  }

  getPrinterPrice (item) {
    let price = new Decimal(item.totalPrice);
    let taxes = price.times(EURO_TAXES).toDecimalPlaces(2);
    price = price.minus(taxes).toDecimalPlaces(2);

    return price.times(PRINTING_PERCENTAGE).toDecimalPlaces(2).toString();
  }

  getPrinterPolishing (item) {
    if (item.needsAdditionalProcessing) {
      let price = new Decimal(item.additionalProcessing);
      let taxes = price.times(EURO_TAXES).toDecimalPlaces(2);
      price = price.minus(taxes).toDecimalPlaces(2);
      return price.times(PRINTING_PERCENTAGE).toDecimalPlaces(2).toString();
    } else {
      return '-';
    }
  }

  getTotalPrinterItem (item) {
    let price = new Decimal(this.getPrinterPrice(item));
    if (item.needsAdditionalProcessing) {
      price = price.plus(this.getPrinterPolishing(item));
    }
    return price.toDecimalPlaces(2).toString();
  }

  onCreateAddress (event) {
    let address = {
      name: React.findDOMNode(this.refs.contact).value,
      company: React.findDOMNode(this.refs.company).value,
      street1: React.findDOMNode(this.refs.street1).value,
      street2: React.findDOMNode(this.refs.street2).value,
      street_no: React.findDOMNode(this.refs.street_no).value,
      city: React.findDOMNode(this.refs.city).value,
      state: React.findDOMNode(this.refs.state).value,
      zip_code: React.findDOMNode(this.refs.zip_code).value,
      phone_no: React.findDOMNode(this.refs.phone_no).value,
      country: React.findDOMNode(this.refs.country).value
    };

    OrderActions.createAddress(address);
  }

  onValidatePaypal (event) {
    let address = {
      email: React.findDOMNode(this.refs.email).value,
      firstName: React.findDOMNode(this.refs.firstName).value,
      lastName: React.findDOMNode(this.refs.lastName).value
    };

    OrderActions.validatePaypalEmailAddress(address);
  }

  onSelectItem (id, event) {
    OrderActions.selectCurrentItem(id);
  }

  onSetFee () {
    let amount = React.findDOMNode(this.refs.amount);
    let re = /^[+]?([1-9][0-9]*(?:[\.][0-9]*)?|0*\.0*[1-9][0-9]*)(?:[eE][+-][0-9]+)?$/;
    if (amount.value.match(re)) {
      OrderActions.setAdditionalProcessingProject(amount.value);
    }
  }

  onClickNotForMe () {
    OrderActions.denyOrder();
  }

  onClickAcceptOrder () {
    this.setState({tryToAccept: true});
    OrderActions.acceptOrder();
  }

  onHideModal () {
    this.state.tryToAccept = false;
    this.state.showModal = false;
    this.setState(this.state);
  }


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
              this.getFormGroupClassNames(this.props.errors.address.name)
          }
          >

          <label forHtml="contact" className="col-sm-4 control-label">Contact *</label>
          <div className="col-sm-6">
            <input id="contact" ref="contact" type="text" className="form-control"/>
            {this.getFormGroupError(this.props.errors.address.name)}
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
              this.getFormGroupClassNames(this.props.errors.address.street1)
          }
          >

          <label forHtml="street1" className="col-sm-4 control-label">Street 1 *</label>
          <div className="col-sm-6">
            <input id="street1" ref="street1" type="text" className="form-control"/>
            {this.getFormGroupError(this.props.errors.address.street1)}
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
              this.getFormGroupClassNames(this.props.errors.address.city)
          }
          >

          <label forHtml="city" className="col-sm-4 control-label">City *</label>
          <div className="col-sm-6">
            <input id="city" ref="city" type="text" className="form-control"/>
            {this.getFormGroupError(this.props.errors.address.city)}
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
              this.getFormGroupClassNames(this.props.errors.address.zip_code)
          }
          >

          <label forHtml="zip_code" className="col-sm-4 control-label">Zip Code *</label>
          <div className="col-sm-6">
            <input id="zip_code" ref="zip_code" type="text" className="form-control"/>
            {this.getFormGroupError(this.props.errors.address.zip_code)}
          </div>
        </div>

        <div
          className={
              this.getFormGroupClassNames(this.props.errors.address.phone_no)
          }
          >

          <label forHtml="phone_no" className="col-sm-4 control-label">Phone No. *</label>
          <div className="col-sm-6">
            <input id="phone_no" ref="phone_no" type="text" className="form-control"/>
            {this.getFormGroupError(this.props.errors.address.phone_no)}
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


  get _modalTitle () {
    if (this.state.tryToAccept && this.state.requestAddress) {
        return 'Address Form';
    } else {
      return 'Paypal Validation Email';
    }
  }

  get _modalFooter () {
    if (this.state.tryToAccept && this.state.requestAddress) {
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
    } else if (this.state.tryToAccept && this.state.requestPaypalAddress){
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
            onClick={this.onValidatePaypal.bind(this)}
            >
            Validate Paypal Email
          </button>
        </div>
      );
    }
  }


  get _modalBody () {
    if (this.state.tryToAccept && this.state.requestAddress) {
      return this.getAddressForm();
    } else if (this.state.tryToAccept && this.state.requestPaypalAddress) {
      let globalError;
      if (this.props.errors.paypal && this.props.errors.paypal.error) {
        globalError = <Alert bsStyle="danger">
          {this.props.errors.paypal.error}
        </Alert>;
      }
      return (
        <form className="form-3doers">
          <br/>
          <br/>

          {globalError}

          <div
            className={
              this.getFormGroupClassNames(this.props.errors.paypal.email)
            }
            >
            <input
              ref="email"
              placeholder="Paypal Email Address"
              className="form-control input-text resize-input-form"
            />
            {this.getFormGroupError(this.props.errors.paypal.email)}
          </div>

          <div className="row">
            <div className="col-md-6">
              <div
                className={
                  this.getFormGroupClassNames(this.props.errors.paypal.firstName)
                }
                >
                <input
                  ref="firstName"
                  placeholder="Paypal First Name"
                  className="form-control input-text col-md-6"/>
                {this.getFormGroupError(this.props.errors.paypal.firstName)}
              </div>
            </div>

            <div className="col-md-6">
              <div
                className={
                  this.getFormGroupClassNames(this.props.errors.paypal.lastName)
                }
                >
                <input
                  ref="lastName"
                  placeholder="Paypal Last Name"
                  className="form-control input-text col-md-6"/>
                {this.getFormGroupError(this.props.errors.paypal.lastName)}
              </div>
            </div>
          </div>
        </form>
      );
    }
  }


  renderAdditionalProcessingForm () {
    let html;

    if (this.props.currentItem.needsAdditionalProcessing) {
      html = <div className='row'>
        <div className="col-md-5">
          <p>
            The user requested additional polishing for this
            <br/> object. Add your fee for it.
          </p>

          <div className="row">
            <div className="col-md-5">
              <div className="form-group">
                <input
                  ref="amount"
                  type="text"
                  placeholder="Polishing fee"
                  className="form-control"/>
              </div>
            </div>

            <div className="col-md-1">
              <h4>€</h4>
            </div>

            <div className="col-md-4 col-md-offset-1">
              <div className="form-group">
                <a
                  className="btn btn-block btn-green-inverse"
                  onClick={this.onSetFee.bind(this)}
                  >
                  Set fee
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>;
    }
    return html;
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
                    height="280"
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
                    <p>
                      <a
                        href={this.props.currentItem.project.design.rel}>
                        Download STL file
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <br />
            <p>
              <strong>Printing: </strong>
              <span className="pull-right">
              {this.getPrinterPrice(this.props.currentItem)} €
              </span>
            </p>
            <p>
              <strong>Polishing: </strong>
              <span className="pull-right">
              {this.getPrinterPolishing(this.props.currentItem)} €
              </span>
            </p>

            <br />
            <br />
            <p>
              <strong>Total: </strong>
              <span className="pull-right">
              {this.getTotalPrinterItem(this.props.currentItem)} €
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  render () {
    return (
      <div>

        {this.renderCurrentItem()}

        {this.renderAdditionalProcessingForm()}

        <div className="row">
          <div className="col-sm-8">
            <div className="col-sm-12 list-order-items">
              <h4 className="job-name">Order</h4>
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
                          {self.getTotalPrinterItem(item)} €
                        </span>
                      </li>
                      );
                  });
                }()
              }
            </ul>
          </div>
        </div>

        <div className="job-order row">
          <div className="col-sm-8">
            <div className="row">
              <div className="col-sm-9">
                <h4 className="job-quotation">Total payment to you*:</h4>
              </div>

              <div className="col-sm-3">
                <h3 className="job-price">
                  <span>{this.getTotalPrice()}</span>
                  <span>&nbsp; €</span>
                </h3>
              </div>
            </div>
          </div>
        </div>

        <br/>
        <br/>

        <div className="row">
          <div className="col-md-3">
            <div className="form-group">
              <a
                className="btn btn-xlg btn-block btn-green-inverse"
                onClick={this.onClickNotForMe.bind(this)}
                >
                Not for me
              </a>
            </div>
          </div>

          <div className="col-md-4 col-md-offset-5">
            <div className="form-group">
              <a
                className="btn btn-xlg btn-block btn-green"
                onClick={this.onClickAcceptOrder.bind(this)}
                >
                ACCEPT ORDER
              </a>
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
