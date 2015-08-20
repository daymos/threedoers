/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';


import {OrderActions} from './actions.jsx';
import {PROJECT_COLORS, PROJECT_MATERIALS} from '../../utils/constants';



export default class ProjectOrderForm extends React.Component {

  constructor (props, context, updater) {
    let amount = props.amount;
    delete props.amount;

    super(props, context, updater);

    // Set current project to first project in order
    this.state = {amount};
  }

  componentWillReceiveProps (nextProps) {
    this.setState({amount: nextProps.amount});
  }

  onChangeColor (event) {
    OrderActions.changeColorProject(event.target.value);
  }

  onChangeMaterial (event) {
    OrderActions.changeMaterialProject(event.target.value);
  }

  onChangeAmount (event) {
    if (!isNaN(event.target.value)) {
      this.setState({amount: event.target.value});
      this._updateAmountDelayed(event.target.value);
    }
  }

  onChangeAdditionalProcessing (event) {
    OrderActions.changeAdditionalProcessingProject(event.target.checked);
  }

  _updateAmountDelayed (value) {
    if (this._timeoutAmountDelay) {
      clearTimeout(this._timeoutAmountDelay);
    }

    if (value.trim() !== '') {
      this._timeoutAmountDelay = setTimeout(function () {
        OrderActions.changeAmountProject(value);
      }, 500);
    }
  }

  getColorOptions () {
    return Object.keys(PROJECT_COLORS).map(function (item) {
      return (
        <option key={item} value={PROJECT_COLORS[item]}>{PROJECT_COLORS[item]}</option>
      );
    });
  }

  getMaterialOptions () {
    return Object.keys(PROJECT_MATERIALS).map(function (item) {
      return (
        <option key={item} value={item}>{PROJECT_MATERIALS[item][1]}</option>
      );
    });
  }

  render () {
    return (
      <form role="form" acceptCharset="utf-8" className="form-3doers">
        <div className="form-group">
          <select
            className="form-control title-case"
            value={this.props.color}
            onChange={this.onChangeColor}
            >
            {this.getColorOptions()}
          </select>
        </div>

        <div className="form-group">
          <select
            className="form-control"
            value={this.props.material}
            onChange={this.onChangeMaterial}
            >
            {this.getMaterialOptions()}
          </select>
        </div>

        <div className="form-group">
          <input
            id="ammount"
            min="1"
            placeholder="How many items?"
            className="form-control"
            type="number"
            value={this.state.amount}
            onChange={this.onChangeAmount.bind(this)}
          />
        </div>

        <div className="checkbox">
          <input
            id="extra-work"
            type="checkbox"
            checked={this.props.needsAdditionalProcessing}
            onChange={this.onChangeAdditionalProcessing.bind(this)}
          />
          <label htmlFor="extra-work" className="checkbox-label">
            I need additional processing*
          </label>
        </div>

        <div className="row">
          <div className="col-xs-11 col-xs-offset-1">
            <p className="text-muted final-price">
              <small>
                Additional processing such as sandblasting, smoothing, etc.
                can be discussed directly with the printer and might influence
                the final price.
              </small>
            </p>
          </div>
        </div>

        <div className="row">
          <div className="col-sm-7">
            <h4 className="job-quotation">Price quotation*:</h4>
          </div>
          <div className="col-sm-5">
            <h3 className="job-price">
              <span>{this.props.totalPrice}</span>
              <span>&nbsp; €</span>
            </h3>
          </div>
        </div>
      </form>
    );
  }
}

