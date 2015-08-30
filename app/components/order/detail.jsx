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

import OrderNavigationStatus from './navigation.jsx';
import ProjectOrderForm from './project-order-form.jsx';
import ProjectOrder from './project-order.jsx';

import {OrderActions} from './actions.jsx';
import {OrderStore} from './stores.jsx';
import {PageWithMenu} from '../base.jsx';
import {ORDER_STATUSES} from '../../utils/constants';


export default class Order extends PageWithMenu {

  constructor (props, context, updater) {
    let order = props.order;
    delete props.order;

    super(props, context, updater);

    this.defaultErrorMessage = 'Error uploading your file, please try again.';
    this.errorMessage = '';

    // Set current project to first project in order
    this.state = {
      order: order,
      currentItem: order.projects[0] || {},
      isErrorVisible: false,
      uploaderPercentage: 0,
      showModal: false
    };
  }

  // utility functions

  getTotalPrice () {
    let totalPrice = new Decimal(0);
    // we need to collect all values
    _.forEach(this.state.order.projects, function(project) {
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
      url: `/api/v1/orders/${orderDetail.state.order._id}/upload`,

      beforeSend: function() {
        orderDetail.setState({isErrorVisible: false, showModal: true});
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
        orderDetail.setState({isErrorVisible: true});
      },

      success: function(data) {
        if (data.errors) {
          orderDetail.errorMessage = data.errors.design.msg;
          orderDetail.setState({isErrorVisible: true});
        } else {
          // should send action with new item
          orderDetail.setState({showModal: true, uploaderPercentage: 0});
          OrderActions.newItemAdded(data);
        }
      }
    });
  }

  // Event handlers

  onUploadMore (event) {
    event.preventDefault();
  }

  onHideModal () {
    this.setState({showModal: false});
  }

  onOrderChanged (state) {
    this.setState(state);
  }

  onSelectItem (id, event) {
    OrderActions.selectCurrentItem(id);
  }

  onDeleteItem (id, event) {
    event.preventDefault();
    event.stopPropagation();
    OrderActions.deleteItem(id);
  }

  // Components life cycle

  componentDidMount () {
    let orderStore = new OrderStore(this.state);
    this.unsubscribe = orderStore.listen(this.onOrderChanged.bind(this));
    this._setupUploader();
  }

  componentWillUnmount () {
    this.unsubscribe();
  }

  // render blocks

  get _modalTitle () {
    switch (this.state.order.status) {
      case ORDER_STATUSES.STARTED[0]:
        return 'Uploading file...';
    }
  }

  get _modalFooter () {
    switch (this.state.order.status) {
      case ORDER_STATUSES.STARTED[0]:
        return '';
    }
  }

  get _modalBody () {
    switch (this.state.order.status) {
      case ORDER_STATUSES.STARTED[0]:
        return (
          <div>
            {() => {
              if (this.state.isErrorVisible) {
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
            <ProgressBar now={this.state.uploaderPercentage} label='%(percent)s%'/>
          </div>
      );
    }
  }

  renderAppropriateStep () {
    let rendered;

    switch (this.state.order.status) {
      case ORDER_STATUSES.STARTED[0]:
        rendered = this._renderStartedBlock.bind(this);
        break;
    }

    return rendered();
  }

  _renderStartedBlock () {
    return (
      <div className="job-order">
        <div className="row">
          <div className="col-md-9">
            <div className="job-details">
              <div className="row">
                <div className="col-md-7">
                  <ProjectOrder item={this.state.currentItem} />
                </div>
                <div className="col-md-5">
                  <h4>&nbsp;</h4>
                  <h5>&nbsp;</h5>
                  <ProjectOrderForm
                    color={this.state.currentItem.color}
                    material={this.state.currentItem.material}
                    amount={this.state.currentItem.amount}
                    totalPrice={this.state.currentItem.totalPrice}
                    needsAdditionalProcessing={this.state.currentItem.needsAdditionalProcessing}
                  />
                </div>

                <div className="col-sm-12">
                  <div className="col-sm-12 list-order-items">
                    <h4 className="job-name">Your order</h4>
                    <p>
                      <strong>{this.state.order.projects.length} file(s)</strong>
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
                        return this.state.order.projects.map(function (item) {
                          let className;
                          if (item._id === self.state.currentItem._id) {
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
                              <span className="pull-right normal">{item.totalPrice} €</span>
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
                  <h4>Do you have a printer reference?</h4>
                  <p>
                    If you know who should print your order, insert the
                    printer's e-mail or username directly submit your order
                    to him, otherwise leave it blank.
                  </p>

                  <div className="row">
                    <div className="col-md-5">
                      <div className="form-group has-feedback">
                        <input
                          id="printer-input"
                          placeholder="E-mail or username of the printer"
                          autoComplete="off"
                          className="form-control"
                          type="text"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderBlock () {
    return (
      <div>
        <OrderNavigationStatus status={this.state.order.status}/>
        {this.renderAppropriateStep()}

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

