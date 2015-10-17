/**
 * Copyright (c) 2015 [3Doers]
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 */

import React from 'react';
import Route from 'react-router/lib/Route';

import ThreeDoersApp from './App.jsx';

import OrderApp from './order/App.jsx';
import CreateOrder from './order/Create.jsx';
import OrderDetail from './order/Detail.jsx';
import OrderList from './order/List.jsx';


let routes;


export default routes = (
  <Route path='/' component={ThreeDoersApp}>
    <Route path='orders' component={OrderApp}>
      <Route path='list' component={OrderList}/>
      <Route path='marketplace' component={OrderList}/>
      <Route path='on-progress' component={OrderList}/>
      <Route path='completed' component={OrderList}/>
      <Route path='create' component={CreateOrder}/>
      <Route path=':id' component={OrderDetail} />
    </Route>
  </Route>
);
