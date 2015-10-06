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


export default class AcceptedStatus extends React.Component {

  onClickCancelOrder (event) {
    event.preventDefault();
    OrderActions.deleteOrder();
  }

  getPrinterAvatar () {
    if (this.props.order.printer.photo) {
      return <img src={"/" + this.props.order.printer.photo} alt="" className="media-object" />;
    } else {
      return <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9InllcyI/PjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ibm9uZSI+PGRlZnMvPjxyZWN0IHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgZmlsbD0iI0VFRUVFRSIvPjxnPjx0ZXh0IHg9IjEzLjQ2MDkzNzUiIHk9IjMyIiBzdHlsZT0iZmlsbDojQUFBQUFBO2ZvbnQtd2VpZ2h0OmJvbGQ7Zm9udC1mYW1pbHk6QXJpYWwsIEhlbHZldGljYSwgT3BlbiBTYW5zLCBzYW5zLXNlcmlmLCBtb25vc3BhY2U7Zm9udC1zaXplOjEwcHQ7ZG9taW5hbnQtYmFzZWxpbmU6Y2VudHJhbCI+NjR4NjQ8L3RleHQ+PC9nPjwvc3ZnPg==" className="media-object"/>;
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

        <div className="row">
          <div className="col-md-8">
            <OrderDescription
              order={this.props.order}
              isPrinter={this.props.isPrinter}
            />
          </div>
        </div>

        <div className="job-order row">
          <div className="col-sm-8">
            <OrderFinalPrice
              order={this.props.order}
              isPrinter={this.props.isPrinter}
            />
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
      </div>
    );
  }
}
