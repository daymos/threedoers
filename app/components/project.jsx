/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import InlineEdit from 'react-inline-edit';
import restful from 'restful.js';


class STLViewer extends React.Component {
  render () {
    return (
      <figure>
          <canvas height="315" width="390" id="cv"></canvas>
      </figure>
    );
  }
}


export class ProjectOrder extends React.Component {

  constructor (props, context, updater) {
    let project = props.project || {};
    delete props.project;

    // Setup props as empty because now all are state.
    super(props, context, updater);

    this.state = { project, editingTile: false };
  }

  onChangeTitle () {
    console.log(arguments);
  }

  onClickTitle () {
    this.setState({editingTile: true});
  }

  render () {
    return (
      <div>
        <InlineEdit
          tagName='h4'
          className="job-name"
          placeholder="Enter the Title"
          autofocus={ true }
          maxLength={ 200 }
          text={ this.state.project.title }
          editing={ this.state.editingTile }
          onChange={ this.onChangeTitle }
        />

        <a onClick={ this.onClickTitle.bind(this) } >Edit</a>

        <h5 className="job-volume">
          <strong>VOLUME:&nbsp;</strong>
          <span className="object-volume"> {this.state.project.volume}</span>
          <span className="object-volume-unit">&nbsp; cm3</span>
        </h5>

        <STLViewer />
      </div>
    );
  }
}

