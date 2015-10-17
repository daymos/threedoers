/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import restful from 'restful.js';

import STLViewer from '../utils/stl-viewer.jsx';


export default class ProjectOrder extends React.Component {

  constructor (props, context, updater) {
    // Setup props as empty because now all are state.
    super(props, context, updater);

    this.state = { editingTile: false };
    this.props.item.project = this.props.item.project || {design: {}};
  }

  onChangeTitle () {

  }

  render () {
    return (
      <div>
        <h4 className='job-name'>
          {this.props.item.project.title}
        </h4>

        <h5 className="job-volume">
          <strong>VOLUME:&nbsp;</strong>
          <span className="object-volume"> {this.props.item.volume}</span>
          <span className="object-volume-unit">&nbsp; cm3</span>
        </h5>

        <STLViewer
          stlURL={'/' + this.props.item.project.design.rel}
          projectColor={this.props.item.color}
        />
      </div>
    );
  }
}
