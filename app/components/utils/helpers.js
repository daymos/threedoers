/**
 *  @copyright 2015 [3Doers]
 *
 *  @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *  @version 0.1.0
 */

import Decimal from 'decimal.js';
import _ from 'lodash';
import { PRINTING_PERCENTAGE, EURO_TAXES } from '../../utils/constants';

export function getItemPrice (item, isPrinter) {
  let price = new Decimal(item.totalPrice);
  let taxes = price.times(EURO_TAXES).toDecimalPlaces(2);
  price = price.minus(taxes).toDecimalPlaces(2);

  if (isPrinter) {
    price = price.times(PRINTING_PERCENTAGE);
  }

  return price.toDecimalPlaces(2).toString();
}


export function getItemPolishingPrice (item, isPrinter) {
  if (item.needsAdditionalProcessing) {
    let price = new Decimal(item.additionalProcessing);
    let taxes = price.times(EURO_TAXES).toDecimalPlaces(2);
    price = price.minus(taxes).toDecimalPlaces(2);

    if (isPrinter) {
      price = price.times(PRINTING_PERCENTAGE);
    }

    return price.toDecimalPlaces(2).toString();
  } else {
    return '-';
  }
}

export function getItemTotalPrice (item, isPrinter) {
  let price = new Decimal(getItemPrice(item, isPrinter));
  if (item.needsAdditionalProcessing) {
    price = price.plus(getItemPolishingPrice(item, isPrinter));
  }
  return price.toDecimalPlaces(2).toString();
}


export function getItemFinalPrice (item, isPrinter) {
  if (isPrinter) {
    return getItemTotalPrice(item, isPrinter);
  }
  let price = new Decimal(item.totalPrice);
  if (item.needsAdditionalProcessing) {
    price = price.plus(item.additionalProcessing);
  }
  return price.toDecimalPlaces(2).toString();
}

export function getItemTaxes (item) {
  let price = new Decimal(item.totalPrice);
  if (item.needsAdditionalProcessing) {
    price = price.plus(item.additionalProcessing);
  }
  return price.times(EURO_TAXES).toDecimalPlaces(2).toString();
}

// REMINDME: This has similar code on accept order controller.
export function calculateTotalTaxes (order) {
    let price = new Decimal(0);

    // we need to collect all values
    _.forEach(order.projects, function(project) {
      price = price.plus(project.totalPrice);
      if (project.needsAdditionalProcessing) {
        price = price.plus(project.additionalProcessing);
      }
    });

    return price.times(EURO_TAXES).toDecimalPlaces(2).toString();
}


export function calculateFinalPrice (order) {
    let price = new Decimal(0);

    // we need to collect all values
    _.forEach(order.projects, function(project) {
      price = price.plus(project.totalPrice);
      if (project.needsAdditionalProcessing) {
        price = price.plus(project.additionalProcessing);
      }
    });

    if (order.rate) {
      price = price.plus(order.rate.amount_local);
    }

    return price.toDecimalPlaces(2).toString();
}

export function calculateFinalPrinterPrice (order) {
    let price = new Decimal(0);

    // we need to collect all values
    _.forEach(order.projects, function(project) {
      price = price.plus(project.totalPrice);
      if (project.needsAdditionalProcessing) {
        price = price.plus(project.additionalProcessing);
      }
    });

    let taxes = price.times(EURO_TAXES).toDecimalPlaces(2);
    price = price.minus(taxes).toDecimalPlaces(2);
    price = price.times(PRINTING_PERCENTAGE);
    return price.toDecimalPlaces(2).toString();
}


