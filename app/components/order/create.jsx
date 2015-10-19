/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */
import React from 'react';

import OrderNavigationStatus from './navigation.jsx';


export default class CreateOrder extends React.Component {

  constructor (props, context, updater) {
    // Setup props as empty because now all are state.
    super(props, context, updater);

    this.defaultErrorMessage = 'Error uploading your file, please try again.';
    this.errorMessage = '';

    this.state = {
      isProgressVisible: false,
      isErrorVisible: false
    };
  }

  componentDidMount () {
    let form = this;
    let element = this.refs.uploader;
    $.ajaxUploadSettings.name = "design";

    $(element).ajaxUploadPrompt({
      url: "/api/v1/projects/upload",

      beforeSend: function() {
        form.setState({isErrorVisible: false, isProgressVisible: true});
      },

      onprogress: function(e) {
        let percentComplete;
        if (e.lengthComputable && form.refs.progress) {
          let progress = React.findDOMNode(form.refs.progress);
          percentComplete = ((e.loaded / e.total) * 100).toFixed(2);
          $(progress).css('width', percentComplete + "%")
                     .attr('aria-valuenow', "" + percentComplete)
                     .html(percentComplete + "% Complete");
        }
      },

      error: function() {
        form.errorMessage = form.defaultErrorMessage;
        form.setState({isErrorVisible: true, isProgressVisible: false});
      },

      success: function(data) {
        if (data.errors) {
          form.errorMessage = data.errors.design.msg;
          form.setState({isErrorVisible: true, isProgressVisible: false});
        } else {
          this.props.history.pushState(`/orders/${data.id}`)
        }
      }
    });
  }

  renderUploader () {
    if (!this.state.isProgressVisible) {
      return (
        <p className="upload">
          <img src="/images/icon_stlfile.png"/>
          <br/>
          <a className="btn btn-xlg btn-green fileinput-button">
            CHOOSE FILE
          </a>
        </p>
      );
    }
  }

  renderError () {
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
  }

  renderProgressBar () {
    if (this.state.isProgressVisible) {
      return (
        <div className="progress">
          <div
            aria-valuemax="100"
            aria-valuemin="0"
            aria-valuenow="0"
            role="progressbar"
            className="progress-bar"
            href="progress">

            <span className="sr-only"> 0% Complete</span>
          </div>
        </div>
      );
    }
  }

  render () {
    return (
      <div>
        <OrderNavigationStatus status={0} create={true} />
        <div className="row">
          <div className="col-md-5">
            <div className="upload-stl" ref="uploader">
              <div className="preview-print">
                {this.renderUploader()}
                {this.renderError()}
                {this.renderProgressBar()}
              </div>
            </div>
          </div>
        </div>
        <br/>
        <br/>
      </div>
    );
  }
}

