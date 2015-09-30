/**
 *  Copyright (c) 2015 [3Doers]
 *
 *  @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *  @version 0.1.0
 */

import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from 'utils/constants';

let Schema = mongoose.Schema;
let ObjectId = Schema.ObjectId;

let Notification = new Schema({
  read: {type: Boolean, "default": false},
  creator: {type: ObjectId, required: true},
  title: {type: String, required: true},
  createAt: {type: Date, "default": Date.now},
  recipient: {type: ObjectId, required: true},
  referToURL: {type: String, require: true},
  deleted: { type: Boolean, "default": false},
  relatedObject: {type: ObjectId},
  type: {
    type: Number,
    "default": NOTIFICATION_TYPES.COMMENT[0],
    required: true
  }
});

export default Notification = mongoose.model('Notification', Notification);
