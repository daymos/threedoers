/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import InlineEdit from 'react-inline-edit';
import restful from 'restful.js';


class NavigationState extends React.Component {

  handleNavClick (event) {
    event.preventDefault();
  }

  handleNavMouseEnter (event) {
    let id = event.currentTarget.href.split('#')[1];
    let element = document.getElementById(id);
    element.className = 'tab-pane fade active in';
  }

  handleNavMouseExit (event) {
    let id = event.currentTarget.href.split('#')[1];
    let element = document.getElementById(id);
    element.className = 'tab-pane fade';
  }

  renderUL () {
    return (
        <ul className="nav nav-justified nav-3doers">
          <li className="nav-step">
            <a onClick={ this.handleNavClick } onMouseEnter={ this.handleNavMouseEnter } onMouseLeave={ this.handleNavMouseExit } href="#tab-crete-order"><span className="step-one"></span> Create Order</a></li>
          <li className="nav-step">
            <a onClick={ this.handleNavClick } onMouseEnter={ this.handleNavMouseEnter } onMouseLeave={ this.handleNavMouseExit } href="#tab-place-order"><span className="step-two"></span> Place order</a></li>
          <li className="nav-step">
            <a onClick={ this.handleNavClick } onMouseEnter={ this.handleNavMouseEnter } onMouseLeave={ this.handleNavMouseExit } href="#tab-accepted"><span className="step-three"></span> Accepted</a></li>
          <li className="nav-step">
            <a onClick={ this.handleNavClick } onMouseEnter={ this.handleNavMouseEnter } onMouseLeave={ this.handleNavMouseExit } href="#tab-printing"><span className="step-four"></span> Printing</a></li>
          <li className="nav-step">
            <a onClick={ this.handleNavClick } onMouseEnter={ this.handleNavMouseEnter } onMouseLeave={ this.handleNavMouseExit } href="#tab-shipping"><span className="step-five"></span> Shipping</a></li>
        </ul>
    );
  }

  render () {
    return (
      <div role="tabpanel">

        { this.renderUL() }

        <div className="tab-content">
          <div id="tab-crete-order" className="tab-pane fade active in">
            <h4 className="light">Preview your file and decide printing features.</h4>
          </div>
          <div id="tab-place-order" className="tab-pane fade">
            <h4 className="light">Your order is now available for printers to review.<br />You'll be notified once the work is accepted in order to proceed with the final payment.</h4>
          </div>
          <div id="tab-accepted" className="tab-pane fade">
            <h4 className="light">Please proceed with the final payment within the next 24 hours to allow our printer to start working on your order.</h4>
          </div>
          <div id="tab-printing" className="tab-pane fade">
            <h4 className="light">You order is printing. You'll be notified when it's shipped.</h4>
          </div>
          <div id="tab-shipping" className="tab-pane fade">
            <h4 className="light">Your order has been shipped and should be delivered to you in the next 48 hours.<br />You can track it directly from the courrier service website using the code below.</h4>
          </div>
        </div>
        <div id="message-error" className="alert alert-danger hide"> Error in stl</div>
      </div>
    );
  }
}


class STLViewer extends React.Component {
  render () {
    return (
      <figure>
          <canvas height="315" width="390" id="cv"></canvas>
      </figure>
    );
  }
}


export class Project extends React.Component {

  constructor (props, context, updater) {
    let project = props.project || {};
    delete props.project;

    // Setup props as empty because now all are state.
    super(props, context, updater);

    this.state = {
      project: project
    };
  }

  componentDidMount () {
    let API = restful(`${window.location.host}`).prefixUrl(`api/v1`);
    API.one('projects', this.props.params.id)
       .get()
       .then(function (response) {
         console.log(arguments);
       });
  }

  render () {
    return (
      <div>
        <NavigationState />

        <div className="job-order">
          <InlineEdit
            tagName='h4'
            className="job-name"
            placeholder="Entet the Title"
            autofocus={true}
            maxLength={200}
            text={this.state.project.title}
          />
          <h5 className="job-volume">
            <strong>VOLUME:&nbsp;</strong>
            <span className="object-volume"> {this.state.project.volume}</span>
            <span className="object-volume-unit">&nbsp; cm3</span>
          </h5>

        <div className="row">
          <div className="col-md-9">
            <div className="job-details">
              <div className="row">
                <div className="col-md-7">
                  <STLViewer />
                </div>
                <div className="col-md-5">
                  <form action="/project/order/5581987181a36d00009f8c92" method="POST" role="form" accept-charset="utf-8" name="" className="form-3doers">
                    <input name="_csrf" type="hidden" />
                    <input name="authenticity_token" type="hidden" />
                    <div className="form-group">
                      <select id="color-chooser" className="form-control">
                        <option disabled="disabled" selected="selected">What color?</option>
                        <option value="black">black</option>
                        <option value="white">white</option>
                        <option value="yellow">yellow</option>
                        <option value="red">red</option>
                        <option value="blue">blue</option>
                        <option value="green">green</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <select id="material-chooser" className="form-control">
                        <option value="Any Material">Any Material</option>
                        <option value="ABS">ABS</option>
                        <option value="PLA">PLA</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <input id="ammount" min="1" placeholder="How many items?" name="ammount" className="form-control" type="text" />
                      <input id="printer-hidden" name="printer" type="hidden" />
                    </div>
                    <div className="row">
                      <div className="col-sm-7">
                        <h4 className="job-quotation">Price quotation*:</h4></div>
                      <div className="col-sm-5">
                        <h3 className="job-price"><span id="order-price">10.88</span><span>&nbsp; €</span></h3></div>
                    </div>
                    <p class="text-muted final-price"><small>*Final price will include a shipping fee and will be calculated once the order has been accepted.</small></p>
                    <button id="order-button" type="submit" className="btn btn-lg btn-block btn-green">PLACE ORDER</button>
                  </form>
                </div>
                <div className="col-sm-12">
                  <h4>Do you have a printer reference?</h4>
                  <p>If you know who should print your order, insert the printer's e-mail or username directly submit your order to him, otherwise leave it blank.</p>
                  <div className="row">
                    <div className="col-md-5">
                      <div className="form-group has-feedback">
                        <input id="printer-input" placeholder="E-mail or username of the printer" autocomplete="off" className="form-control" type="text"/>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="row">
              <br />
              <div className="col-md-12"><a href="#" data-toggle="modal" data-target="#orderModal">Cancel order</a></div>
            </div>
          </div>
        </div>
        <div id="orderModal" role="dialog" className="modal fade">
          <div className="modal-dialog modal-md">
            <div className="modal-content">
              <div className="modal-header">
                <button data-dismiss="modal" className="close"><span>×</span></button>
                <h4 className="modal-title">&nbsp;</h4></div>
              <div className="modal-body">
                <p>Once deleted the order won't be accesible anymore.
                  <br />Do you want to proceed?</p>
                <br />
                <form action="/project/delete/5581987181a36d00009f8c92" method="post">
                  <div className="row">
                    <div className="col-md-5">
                      <div className="form-group"><a data-dismiss="modal" href="#" class="btn btn-xlg btn-block btn-green-inverse">Undo</a></div>
                    </div>
                    <div className="col-md-7">
                      <div className="form-group">
                        <button type="submit" className="btn btn-xlg btn-block btn-green">CANCEL ORDER</button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  }

}

