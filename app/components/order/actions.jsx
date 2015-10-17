/**
 *
 * @copyright 2015 [3Doers]
 * @version 1.0.0
 * @overview This files will store all actions required for the system.
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 * @module components/order/actions
 *
 * @exports {{
 *   OrderActions: Object
 * }}
 */

import Airflux from '../airflux';

export let OrderActions = {
 changeColorProject: new Airflux.Action().asFunction,
 changeMaterialProject: new Airflux.Action().asFunction,
 changeAmountProject: new Airflux.Action().asFunction,
 changeAdditionalProcessingProject: new Airflux.Action().asFunction,
 setAdditionalProcessingProject: new Airflux.Action().asFunction,
 selectCurrentItem: new Airflux.Action().asFunction,
 deleteItem: new Airflux.Action().asFunction,
 deleteOrder: new Airflux.Action().asFunction,
 denyOrder: new Airflux.Action().asFunction,
 payOrder: new Airflux.Action().asFunction,
 orderPrinted: new Airflux.Action().asFunction,
 updateTransaction: new Airflux.Action().asFunction,
 acceptOrder: new Airflux.Action().asFunction,
 requestOrder: new Airflux.Action().asFunction,
 newItemAdded: new Airflux.Action().asFunction,
 createAddress: new Airflux.Action().asFunction,
 validatePaypalEmailAddress: new Airflux.Action().asFunction,
 requestPrinters: new Airflux.Action().asFunction,
 newComment: new Airflux.Action().asFunction
};

export let OrderListActions = {

};
