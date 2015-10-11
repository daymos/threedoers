/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import Decimal from 'decimal.js';

import STLViewer from '../utils/stl-viewer.jsx';
import * as helpers from '../utils/helpers.js';


export default class ItemOrderDetail extends React.Component {

  constructor (props, context, updater) {
    super(props, context, updater);
  }

  renderTaxes () {
    if (!this.props.isPrinter) {
      return <p>
        <strong>Taxes: </strong>
        <span className="pull-right">
          {helpers.getItemTaxes(this.props.item)} €
        </span>
      </p>;
    }
  }

  render () {
    return (
      <div className="row" key={this.props.item._id}>

        <div className="col-md-12">
          <h4 className="job-name">{this.props.item.project.title}</h4>
        </div>

        <div className="col-md-8">
          <div className="job-details">
            <div className="row">
              <div className="col-md-5">
                <STLViewer
                  key={this.props.item._id}
                  width="237"
                  height="237"
                  stlURL={'/' + this.props.item.project.design.rel}
                  projectColor={this.props.item.color}
                />
              </div>
              <div className="col-md-7">
                <div className="info">
                  <p>
                    <strong>COLOR:</strong>
                    {this.props.item.color}
                  </p>
                  <p>
                    <strong>MATERIAL:</strong>
                    {this.props.item.material}
                  </p>
                  <p>
                    <strong>AMOUNT:</strong>
                    {this.props.item.amount} pieces
                  </p>
                  <p>
                    <strong>ADDITIONAL PROCESSING:</strong>
                    {this.props.item.needsAdditionalProcessing ? 'required' : 'not required'}
                  </p>
                  <p>
                    <strong>VOLUME:</strong>
                    {this.props.item.volume} cm3
                  </p>
                  <p>
                    <strong>WEIGHT:</strong>
                    {this.props.item.weight} g
                  </p>
                  <p>
                    <strong>DIMENSIONS:</strong>
                    {() => {
                      let attr = '';

                      if (this.props.item.dimension) {
                        attr += this.props.item.dimension.width + ' cm (W) ';
                        attr += this.props.item.dimension.height + ' cm (H) ';
                        attr += this.props.item.dimension.length + ' cm (L) ';
                      }

                      return attr;
                    }()}
                  </p>

                  <p>
                    <a
                      href={this.props.item.project.design.rel}>
                      Download STL file
                    </a>
                  </p>

                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <br />
          <p>
            <strong>Printing: </strong>
            <span className="pull-right">
              {helpers.getItemPrice(this.props.item, this.props.isPrinter)} €
            </span>
          </p>
          <p>
            <strong>Polishing: </strong>
            <span className="pull-right">
              {helpers.getItemPolishingPrice(this.props.item, this.props.isPrinter)} €
            </span>
          </p>

          {this.renderTaxes()}

          <br />
          <br />
          <p>
            <strong className='text-shadow-3doers'>Total per item: </strong>
            <span className="pull-right">
              <strong>
                {helpers.getItemFinalPrice(this.props.item, this.props.isPrinter)} €
              </strong>
            </span>
          </p>
        </div>
      </div>
    );
  }
}
