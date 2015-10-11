/**
 *
 * @copyright 2015 [3Doers]
 * @version 1.0.0
 * @overview This files will store all actions required for the system.
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 * @module components/order/stores
 *
 * @exports {{
 *   OrderActions: Object
 * }}
 */

import Airflux from 'airflux';
import _ from 'lodash';

import {OrderActions} from './actions.jsx';
import getAPIClient from '../utils/api-client';


export class OrderStore extends Airflux.Store {

  constructor(order) {
    super();

    this.listenToMany(OrderActions);

    // Request for order and update status
    if (!order) {
      // TODO
    } else {
      // initialize state
      this.initialize(order);
    }
  }


  initialize (order) {
    this._state = {
      order: order,
      currentItem: order.projects[0] || {},
      printers: [],
      errors: {}
    };
  }


  setupPrimus () {
    let primus;
    let orderStore = this;

    primus = Primus.connect(window.__WEBSOCKET_SERVER__).channel('orders');

    primus.on('open', function(msg) {
      primus.write({action: 'join', order: orderStore._state.order._id});
    });

    primus.on('data', function (data) {
      console.log(data);
      if (data.status === 'error') {
        console.log(data);
      } else {
        if (data.action === 'itemUpdated') {
          let item = _.find(orderStore._state.order.projects,
                            function (_item) {
            return _item._id === data.item._id;
          });

          $.extend(item, data.item);
          orderStore.setOrder(orderStore._state.order);
        } else if (data.action === 'newComment') {
          orderStore._state.order.comments.push(data.comment);
          orderStore.publishState();
        } else if (data.action === 'statusUpdated') {
          orderStore.setOrder(data.order);
        } else if (data.action === 'deleted') {
          orderStore.order = null;
          orderStore.currentItem = null;
          orderStore.publishState();
        }
      }
    });

    this.primus = primus;
  }

  getState () {
    return this._state;
  }

  // Getters

  get state() {
    return this._state;
  }

  get itemEndpoint () {
    return getAPIClient().one('orders', this.state.order._id)
    .one('items', this.state.currentItem._id);
  }

  getItemEndpoint (id) {
    return getAPIClient().one('orders', this.state.order._id)
    .one('items', id);
  }

  getOrderEndpoint () {
    return getAPIClient().one('orders', this.state.order._id);
  }

  getAddressEndpoint () {
    return getAPIClient().all('users/addresses');
  }

  getPaypalEndpoint () {
    return getAPIClient().all('users/validate-paypal');
  }

  get printerEndpoint () {
    return getAPIClient().all('printers');
  }


  // Util functions

  setOrder (order) {
    let orderStore = this;
    this._state.order = order;
    this._state.currentItem = _.find(
      this._state.order.projects,
      function (_item) {
        return _item._id === orderStore._state.currentItem._id;
      }
    );

    this._state.errors = {};
    this.publishState();
  }

  // Event Handlers

  onChangeColorProject (value) {
    let orderStore = this;
    let item = this.itemEndpoint();

    item.patch({color: value})
    .then(function (response) {
      orderStore.setOrder(response.data);
    })
    .catch(function () {
      console.log(arguments);
    });
  }

  onSetAdditionalProcessingProject (value) {
    let orderStore = this;
    let item = this.itemEndpoint();

    item.patch({additionalProcessing: value})
    .catch(function () {
      console.log(arguments);
    });
  }

  onChangeMaterialProject (value) {
    let orderStore = this;
    let item = this.itemEndpoint;

    item.patch({material: value})
    .then(function (response) {
      orderStore.setOrder(response.body());
    })
    .catch(function () {
      console.log(arguments);
    });
  }

  onChangeAmountProject (value) {
    let orderStore = this;
    let item = this.itemEndpoint;

    item.patch({amount: value})
    .then(function (response) {
      orderStore.setOrder(response.body());
    })
    .catch(function () {
      console.log(arguments);
    });
  }

  onChangeAdditionalProcessingProject (value) {
    let orderStore = this;
    let item = this.itemEndpoint;

    item.patch({additionalProcessing: value})
    .then(function (response) {
      orderStore.setOrder(response.body());
    })
    .catch(function () {
      console.log(arguments);
    });
  }

  onDeleteItem (id) {
    let orderStore = this;
    let item = this.getItemEndpoint(id);
    this._state.errors = {};

    item.delete()
    .then(function (response) {
      _.remove(
        orderStore._state.order.projects,
        function (_item) {
          return _item._id === id;
        });

      if (orderStore._state.currentItem._id === id) {
        if (orderStore._state.order.projects.length) {
          orderStore._state.currentItem = orderStore._state.order.projects[0];
        } else {
          // this is to avoid break order layout
          orderStore._state.currentItem = {project: {design: {}}};
        }
      }
      orderStore.publishState();
    })
    .catch(function () {
      console.log(arguments);
    });
  }

  onNewItemAdded (value) {
    this._state.order.projects.push(value);
    this._state.currentItem = value;
    this._state.errors = {};
    this.publishState();
  }

  selectCurrentItem (id) {
    this._state.currentItem = _.find(this._state.order.projects,
                                     function (_item) {
      return _item._id === id;
    });
    this._state.errors = {};
    this.publishState();
  }

  onRequestPrinters (value) {
    let orderStore = this;
    this._state.errors = {};

    if (value.trim() === '') {
      orderStore._state.printers = [];
      orderStore.publishState();
    } else {
      this.printerEndpoint.getAll({q: value})
      .then(function (response) {
        orderStore._state.printers = response().data;
        orderStore.publishState();
      })
      .catch(function () {
        console.log(arguments);
      });
    }
  }

  onDeleteOrder () {
    this.getOrderEndpoint().delete().then(function () {
      window.location.href = '/';
    }).catch(function () {
      console.log(arguments);
    });
  }

  onRequestOrder (printer) {
    let orderStore = this;

    this.getOrderEndpoint()
    .all('order')
    .post({printer}).then(function (response) {
      delete orderStore._state.errors.address;
      orderStore.setOrder(response().data);
      orderStore.publishState();
    }).catch(function (response) {
      // WE delete previous errors on address because we try again request
      delete orderStore._state.errors.address;
      for (let key in response.data) {
        orderStore._state.errors[key] = response.data[key];
      }
      orderStore.publishState();
    });
  }

  onDenyOrder () {
    let orderStore = this;

    this.getOrderEndpoint()
    .all('deny')
    .post()
    .catch(function (response) { console.log(arguments); });
  }

  onPayOrder () {
    let orderStore = this;

    this.getOrderEndpoint()
    .all('pay')
    .post()
    .then(function (response) {
      let data = response().data;
      location.href = data.redirectURL;
    })
    .catch(function (response) {
      orderStore._state.errors.paypal = response.data.error;
      orderStore.publishState();
    });
  }


  onOrderPrinted () {
    let orderStore = this;

    this.getOrderEndpoint()
    .all('printed')
    .post()
    .catch(function (response) {
      orderStore._state.errors.printed = response.data.error;
      orderStore.publishState();
    });
  }

  onAcceptOrder () {
    let orderStore = this;

    this.getOrderEndpoint()
    .all('accept')
    .post().then(function (response) {
      delete orderStore._state.errors.address;
      delete orderStore._state.errors.paypal;
      orderStore.publishState();
    }).catch(function (response) {
      // WE delete previous errors on address because we try again request
      delete orderStore._state.errors.address;
      delete orderStore._state.errors.paypal;
      for (let key in response.data) {
        orderStore._state.errors[key] = response.data[key];
      }
      orderStore.publishState();
    });
  }

  onUpdateTransaction () {
    let orderStore = this;

    this.getOrderEndpoint()
    .all('update-transaction')
    .post()
    .catch(function (response) {
      orderStore._state.errors.printed = response.data.error;
      orderStore.publishState();
    });
  }

  onCreateAddress (address) {
    let orderStore = this;

    this.getAddressEndpoint()
    .post(address).then(function (response) {
      orderStore._state.errors.address = {success: true};
      orderStore.publishState();
    }).catch(function (response) {
      orderStore._state.errors.address = response.data;
      orderStore.publishState();
    });
  }


  onValidatePaypalEmailAddress (address) {
    let orderStore = this;

    this.getPaypalEndpoint()
    .post(address).then(function (response) {
      orderStore._state.errors.paypal = {success: true};
      orderStore.publishState();
    }).catch(function (response) {
      orderStore._state.errors.paypal = response.data;
      orderStore.publishState();
    });
  }

  onNewComment (comment) {
    let orderStore = this;

    this.getOrderEndpoint()
    .all('comment')
    .post({comment}).then(function (response) {
    });
  }
}
