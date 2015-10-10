/**
 *  @copyright 2015 [3Doers]
 *
 *  @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *  @version 0.1.0
 */

import React from 'react';
import cx from 'classnames';
import {ORDER_STATUSES} from '../../utils/constants';


export default class StatusOrder extends React.Component {

  constructor (props, context, updater) {
    super(props, context, updater);
  }

  getPrinterAvatar () {
    if (this.props.printer.photo) {
      return <img src={"/" + this.props.printer.photo} alt="" className="media-object" />;
    } else {
      return <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9InllcyI/PjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ibm9uZSI+PGRlZnMvPjxyZWN0IHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgZmlsbD0iI0VFRUVFRSIvPjxnPjx0ZXh0IHg9IjEzLjQ2MDkzNzUiIHk9IjMyIiBzdHlsZT0iZmlsbDojQUFBQUFBO2ZvbnQtd2VpZ2h0OmJvbGQ7Zm9udC1mYW1pbHk6QXJpYWwsIEhlbHZldGljYSwgT3BlbiBTYW5zLCBzYW5zLXNlcmlmLCBtb25vc3BhY2U7Zm9udC1zaXplOjEwcHQ7ZG9taW5hbnQtYmFzZWxpbmU6Y2VudHJhbCI+NjR4NjQ8L3RleHQ+PC9nPjwvc3ZnPg==" className="media-object"/>;
    }
  }

  getClassNames () {
    let classNames = {alert: true, pre: true};
    switch (this.props.status) {
      case ORDER_STATUSES.PRINT_REQUESTED[0]:
        classNames['alert-warning'] = true;
        break;
      case ORDER_STATUSES.PRINT_REVIEW[0]:
        classNames['alert-primary'] = true;
        break;
      case ORDER_STATUSES.PRINT_ACCEPTED[0]:
        if (this.props.isPrinter) {
          classNames['alert-warning'] = true;
        } else {
          classNames['alert-primary'] = true;
        }
        break;
    }

    return cx(classNames);
  }

  getMessage () {
    switch (this.props.status) {
      case ORDER_STATUSES.PRINT_REQUESTED[0]:
        return 'Your order was placed in our marketplace, please wait while' +
               'a printer request your order for review.';
      case ORDER_STATUSES.PRINT_REVIEW[0]:
        return (
          <div className="media">
            <div className="media-left">
              <a href="#">{this.getPrinterAvatar()}</a>
            </div>
            <div className="media-body media-middle">
              <div className="message">
                <strong> {this.props.printer.username} </strong>
                is currently reviewing this order and may contact you
              </div>
            </div>
          </div>
        );
      case ORDER_STATUSES.PRINT_ACCEPTED[0]:
        if (this.props.isPrinter) {
          let text = 'Please wait for the user to complete the payment before' +
            ' proceeding with the printing.\nYou’ll be notified when the' +
            ' money is secured on 3doers account.';
          return text;
        } else {
          return (
            <div className="media">
              <div className="media-left">
                <a href="#">{this.getPrinterAvatar()}</a>
              </div>
              <div className="media-body media-middle">
                <div className="message">
                  Your order has been accepted by
                  <strong> {this.props.printer.username}</strong>.
                </div>
              </div>
            </div>
          );
        }
    }
  }

  hasStatus () {
    switch (this.props.status) {
      case ORDER_STATUSES.PRINT_REQUESTED[0]:
        return true;
      case ORDER_STATUSES.PRINT_REVIEW[0]:
        return !this.props.isPrinter;
      case ORDER_STATUSES.PRINT_ACCEPTED[0]:
        if (this.props.isPrinter) {
          return true;
        } else {
          return true;
        }
        break;
    }
  }

  render () {
    if (this.hasStatus()) {
      return (
        <div className={this.getClassNames()}>
          {this.getMessage()}
        </div>
      );
    }
  }

}
