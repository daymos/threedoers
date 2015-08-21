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

    constructor(state) {
        super();

        this._state = state;
        this.listenToMany(OrderActions);

        // Request for order and update status
        if (!this._state) {
          // TODO
        } else {
          this.setupPrimus();
        }
    }

    setupPrimus () {
      let primus;
      let orderStore = this;

      primus = Primus.connect(':8000').channel('orders');

      primus.on('open', function(msg) {
        primus.write({action: 'join', order: orderStore._state.order._id});
      });

      primus.on('data', function (data) {
        if (data.status === 'error') {
          console.log(data);
        } else {
          if (data.action === 'itemUpdated') {
            let item = _.find(orderStore._state.order.projects,
                              function (_item) {
              return _item._id === data.item._id;
            });

            $.extend(item, data.item);
            orderStore.setState(orderStore._state.order);
          }
        }
      });

      this.primus = primus;
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

    // Util functions

    setState (order) {
      let orderStore = this;
      this._state.order = order;
      this._state.currentItem = _.find(this._state.order.projects,
                                       function (_item) {
        return _item._id === orderStore._state.currentItem._id;
      });

      this.publishState();
    }

    // Event Handlers

    onChangeColorProject (value) {
      let orderStore = this;
      let item = this.itemEndpoint();

      item.patch({color: value})
      .then(function (response) {
        orderStore.setState(response.data);
      })
      .catch(function () {
        console.log(arguments);
      });
    }

    onChangeMaterialProject (value) {
      let orderStore = this;
      let item = this.itemEndpoint;

      item.patch({material: value})
      .then(function (response) {
        orderStore.setState(response.body());
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
        orderStore.setState(response.body());
      })
      .catch(function () {
        console.log(arguments);
      });
    }

    onChangeAdditionalProcessingProject (value) {
      let orderStore = this;
      let item = this.itemEndpoint;

      item.patch({additionalProcesssing: value})
      .then(function (response) {
        orderStore.setState(response.body());
      })
      .catch(function () {
        console.log(arguments);
      });
    }

    onDeleteItem (id) {
      let orderStore = this;
      let item = this.getItemEndpoint(id);

      item.delete()
      .then(function (response) {
        _.remove(orderStore._state.order.projects,
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
      this.publishState();
    }

    selectCurrentItem (id) {
      this._state.currentItem = _.find(this._state.order.projects,
                                       function (_item) {
        return _item._id === id;
      });
      this.publishState();
    }
}
