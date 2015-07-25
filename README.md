3Doers
======

Will be based on this style guide: #[airbnb style guide](https://github.com/airbnb/javascript/tree/master/es5)

Don't edit .coffee files... will be replaced!

Development
-----------

To install all dependencies and dev dependencies run this:

```bash
npm install
```

To run local dev server just run

```bash
gulp
```

Deploy on openshift
-------------------

```bash
git push
```

Tools used
----------

* Reactjs used to create very complex UI and create isomorphic application
* Babel to enable es6 to write cleaner code
* Mongodb as backend
* python to process stl files
* Bootstrap as css framework
* Livereload to help on reload page when assets changes (development)

Take in mind when coding
------------------------

* All files except 'app.js' will use es6 for coding
* All imports and requires in backend are relative NODE_PATH is set to app and frontend/scripts
* All imports in frontend are local imports like require('./components/component.jsx')

*Bellow instructions are not used anymore*

Requirements Dev
---------------

```bash
npm install -g coffee-script
npm install -g hotnode
npm install
```

Requirements Prod
-----------------

```bash
npm install
```


Run development
---------------

```bash
hotcoffee src/server.coffee
grunt
```


#[Node-Login](http://node-login.braitsch.io)

####A basic login & account management system built in Node.js with the following features :

* New User Account Creation
* Secure Password Reset via Email
* Ability to Update / Delete Account
* Session Tracking for Logged-In Users
* Local Cookie Storage for Returning Users
* Blowfish-based Scheme Password Encryption

***

####Node-Login is built on top of the following libraries :

* [Node.js](http://nodejs.org/) - Application Server
* [Express.js](http://expressjs.com/) - Node.js Web Framework
* [MongoDb](http://www.mongodb.org/) - Database Storage
* [Jade](http://jade-lang.com/) - HTML Templating Engine
* [Stylus](http://learnboost.github.com/stylus/) - CSS Preprocessor
* [EmailJS](http://github.com/eleith/emailjs) - Node.js > SMTP Server Middleware
* [Moment.js](http://momentjs.com/) - Lightweight Date Library
* [Twitter Bootstrap](http://twitter.github.com/bootstrap/) - UI Component & Layout Library

***

A [Live Demo](http://node-login.braitsch.io) and [some thoughts about the app's architecture.](http://www.quietless.com/kitchen/building-a-login-system-in-node-js-and-mongodb/)

***

####Installation & Setup
This assumes you already have node.js & npm installed.
```
git clone git://github.com/braitsch/node-login.git node-login
cd node-login
npm install -d
node app
```
For testing purposes, I've provided a [database dump of all accounts here.](http://node-login.braitsch.io/print)
Please note this list and the entire database automatically resets every 24 hours.

Questions and suggestions for improvement are welcome.

NOTE:
####

Deploy on OpenShift you need to create virtual env to use python script for calculating volume.

virtualenv ~/app-root/data/3doers-pyenv
. ~/app-root/data/3doers-pyenv/bin/activate
pip install pymongo
