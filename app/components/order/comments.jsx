/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import moment from 'moment';

import {OrderActions} from './actions.jsx';


class CommentForm extends React.Component {

  constructor (props, context, updater) {
    super(props, context, updater);

    this.state = {
      hasError: false
    };
  }

  onSendComment (event) {
    let comment = React.findDOMNode(this.refs.comment);
    if (comment.value.match(/^\s*$/)) {
      this.setState({hasError: true});
    } else {
      OrderActions.newComment(comment.value);
      comment.value = '';
      this.setState({hasError: false});
    }
  }

  render () {
    let textAreaClassNames = 'form-group';
    if (this.state.hasError) {
      textAreaClassNames += ' has-error';
    }
    return (
      <div>
        <div className={textAreaClassNames}>
          <textarea
            ref="comment"
            rows="4"
            placeholder="Write a comment"
            className="form-control">
          </textarea>
          {() => {
            if (this.state.hasError) {
              return (
                <span className='help-block'>This field is required.</span>
                );
            }
          }()}
        </div>

        <div className="row">
          <div className="col-xs-3 col-xs-offset-9">
            <button
              type="submit"
              className="btn btn-md btn-block btn-green-inverse"
              onClick={this.onSendComment.bind(this)}
              >
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }

}


export default class Comments extends React.Component {

  constructor (props, context, updater) {
    super(props, context, updater);
  }

  // TODO: Refactor so do not repeat the code!
  renderComment (comment) {
    let commentComponent;
    let isMe = this.props.user.username === comment.author.username;
    let createdAt = moment(comment.createdAt);

    if (isMe) {
      commentComponent = (
        <div className="media" key={comment._id}>
          <div className="media-body text-right">
            <div className="message">{comment.content}</div>
            <p className="meta">
              By
              <strong> You</strong> at
              <strong> {createdAt.format('DD/MMM/YYYY')} </strong> at
              <strong> {createdAt.format('hh:mm a')}</strong>
            </p>
          </div>
          <div className="media-right">
            <a href="#">
              <img
                src={'/' + comment.author.photo}
                style={{width: 50, height: 59}}
                className="media-object"
              />
            </a>
          </div>
        </div>
      );
    } else {
      commentComponent = (
        <div className="media" key={comment._id}>
          <div className="media-left">
            <a href="#">
              <img
                src={'/' + comment.author.photo}
                style={{width: 50, height: 59}}
                className="media-object"
              />
            </a>
          </div>

          <div className="media-body">
            <div className="message">{comment.content}</div>
            <p className="meta">
              By
              <strong> {comment.author.username}</strong> at
            <strong> {createdAt.format('DD/MMM/YYYY')} </strong> at
            <strong> {createdAt.format('hh:mm a')}</strong>
            </p>
          </div>
        </div>
      );
    }

    return commentComponent;
  }

  render () {
    let header;

    if (this.props.isPrinter) {
      header = "Conversation with order owner:";
    } else {
      header = "Conversation with printer:";
    }

    return (
      <div className="row">
        <div className="page-subheader">
          <h3>{header}</h3>
        </div>

        <div className="row">
          <div className="col-md-8">
            <div className="conversation">
              {() => {
                  let commentsComponent = this;
                  return this.props.comments.map(function (comment) {
                    return commentsComponent.renderComment(comment);
                  });
                }()}
              <CommentForm/>
            </div>
          </div>
        </div>
      </div>
    );
  }

}
