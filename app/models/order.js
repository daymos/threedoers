/**
 *  Copyright (c) 2015 [3Doers]
 *
 *  @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *  @version 0.1.0
 */

import mongoose from 'mongoose';
import nconf from 'nconf';
import timestamps from 'mongoose-timestamp';

import mNotification from 'models/notification';
import * as constants from 'utils/constants';


let Schema = mongoose.Schema;
let ObjectId = Schema.ObjectId;


let Comment = new Schema({
  author: {type: ObjectId, required: true, ref: 'User'},
  content: {type: String, required: true},
  createdAt: {type: Date, 'default': Date.now}
});


let ItemOrderSchema = new Schema({
  project: {type: ObjectId, required: true, ref: 'STLProject'},
  color: {type: String, required: true},
  material: {type: String, required: true},
  unit: {type: String, required: true},
  density: {type: Number, required: true},
  surface: {type: Number},
  weight: {type: Number},
  volume: {type: Number},
  amount: {type: String, required: true, default: 1},
  price: {type: String, required: true, default: '0.0'},
  totalPrice: {type: String, required: true, default: '0.0'},
  // Values to ask user to check if all is good
  checkHeight: {type: Boolean, required: true, default: false},
  checkLenght: {type: Boolean, required: true, default: false},
  checkWidth: {type: Boolean, required: true, default: false},
  needsAdditionalProcessing: {type: Boolean, required: true, default: false},
  additionalProcessing: {type: Number, default: 0},
  dimension: {
    length: Number,
    height: Number,
    width: Number
  }
});


let OrderSchema = new Schema({
  // Users related fields
  customer: {type: ObjectId, ref: 'User'},
  printer: {type: ObjectId, ref: 'User'},
  status: {type: Number, default: constants.ORDER_STATUSES.STARTED[0]},

  // some timestamps
  placedAt: {type: Date},
  reviewStartAt: {type: Date},
  printingStartedAt: {type: Date},

  // money
  businessPayment: {type: String},
  printerPayment: {type: String},
  totalPrice: {type: String},
  taxes: {type: String},
  paidToPrinter: {type: Boolean, default: false},
  payPaypalKey: {type: String},

  comments: [Comment],
  projects: [ItemOrderSchema],

  /**
   * Shipping related fields, these fields could change over time
   * from shipping provider so don't define nested fields.
   */
  deliveryMethod: {type: String, default: 'shipping'},
  shipment: {},
  parcel: {},
  rate: {},
  transaction: {},

  /**
   * Shipping addresses (Go Shippo IDs)
   *
   * This will help with logs, calculate rates when printer accept it and
   * user has changed his default address, recalculate shipping rates if needed.
   */
  customerAddress: {type: String},
  printerAddress: {type: String}
});

OrderSchema.plugin(timestamps);


/**
 * Exports
 */
let Order;
export default Order = mongoose.model('Order', OrderSchema);

