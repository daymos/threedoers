(function() {
  module.exports = function(app, io) {
    var PostMaster, STLStats, auth, calculateOrderPrice, decimal, decorators, exec, fs, gridfs, handleDirection, logger, mailer, models, paypal, processVolumeWeight, request, requestShippingRate, settings, utils;
    fs = require('fs');
    exec = require('child_process').exec;
    decimal = require('Deci-mal').decimal;
    paypal = require('paypal-rest-sdk');
    request = require('request');
    decorators = require('../decorators');
    logger = require('../logger');
    mailer = require('../mailer').mailer;
    settings = require('../../config');
    STLStats = require('../stlstat').STLStats;
    gridfs = require('../gridfs');
    models = require('./models');
    utils = require('../utils');
    auth = require('../auth/models');
    PostMaster = require('postmaster-shipping');
    paypal.configure(settings.paypal.api);
    app.get('/', function(req, res) {
      if (req.user) {
        return models.STLProject.find().sort({
          createdAt: -1
        }).limit(6).exec(function(err, projects) {
          return auth.User.find().sort({
            createdAt: -1
          }).limit(15).exec(function(err, users) {
            return res.render('core/index', {
              message: null,
              error: false,
              message: false,
              users: users,
              projects: projects
            });
          });
        });
      } else {
        return res.render('core/comming', {
          message: null,
          error: false,
          message: false
        });
      }
    });
    app.get('/home', function(req, res) {
      return models.STLProject.find().sort({
        createdAt: -1
      }).limit(6).exec(function(err, projects) {
        return auth.User.find().sort({
          createdAt: -1
        }).limit(15).exec(function(err, users) {
          return res.render('core/index', {
            message: null,
            error: false,
            message: false,
            users: users,
            projects: projects
          });
        });
      });
    });
    app.post('/', function(req, res) {
      var errors;
      req.assert('email').isEmail();
      errors = req.validationErrors(true);
      if (errors) {
        return res.render('core/comming', {
          message: "OPS! THERE WAS AN ERROR! TRY AGAIN! <br/> " + errors.email.msg,
          email: req.body.email,
          error: true
        });
      } else {
        return models.Subscription.find({
          email: req.body.email
        }).exec().then(function(emails) {
          var s;
          if (emails.length > 0) {
            return res.render('core/index', {
              message: "ALREADY SUBSCRIBED!",
              email: req.body.email,
              error: true
            });
          } else {
            s = new models.Subscription();
            s.email = req.body.email;
            s.save();
            return res.render('core/index', {
              message: "YOUR MAIL WAS SENT! THANK YOU!",
              email: req.body.email,
              error: false
            });
          }
        });
      }
    });
    app.get('/become/filemanager', decorators.loginRequired, function(req, res) {
      return res.render('core/become_filemanager');
    });
    app.post('/become/filemanager', decorators.loginRequired, function(req, res) {
      if (req.user.filemanager) {
        return res.render('core/become_filemanager');
      } else {
        mailer.send('mailer/core/become', {
          user: req.user
        }, {
          from: req.user.email,
          to: settings.admins.emails,
          subject: "New Become a File manager Request"
        }).then(function() {
          req.user.filemanager = 'request';
          return req.user.save();
        });
        return res.render('core/become_filemanager');
      }
    });
    app.get('/become', decorators.loginRequired, function(req, res) {
      return res.render('core/become');
    });
    app.post('/become', decorators.loginRequired, function(req, res) {
      if (req.user.printer) {
        return res.render('core/become');
      } else {
        mailer.send('mailer/core/become', {
          user: req.user
        }, {
          from: req.user.email,
          to: settings.admins.emails,
          subject: "New Become a Printer Request"
        }).then(function() {
          req.user.printer = 'request';
          return req.user.save();
        });
        return res.render('core/become');
      }
    });
    app.get('/project/upload', decorators.loginRequired, function(req, res) {
      return res.render('core/project/upload');
    });
    app.post('/project/upload', decorators.loginRequired, function(req, res) {
      var project, tmp_path;
      if (req.files.thumbnail.size === 0) {
        res.render('core/project/upload', {
          errors: {
            thumbnail: {
              msg: "This field is required"
            }
          }
        });
        return;
      }
      tmp_path = req.files.thumbnail.path;
      project = new models.STLProject;
      project.user = req.user.id;
      project.title = req.files.thumbnail.name;
      project.file = req.files.thumbnail.path.split('/').pop();
      return project.save(function(err, doc) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          return res.send({
            redirectTo: "/project/" + project.id
          });
        }
      });
    });
    app.get('/project/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        $or: [
          {
            user: req.user.id
          }, {
            'order.printer': req.user.id
          }
        ]
      }).exec().then(function(doc) {
        if (doc) {
          if (!(doc.volume && !doc.bad)) {
            processVolumeWeight(doc);
          }
          return res.render('core/project/detail', {
            project: doc,
            colors: models.PROJECT_COLORS,
            densities: models.PROJECT_DENSITIES,
            statuses: models.PROJECT_STATUSES,
            countries: auth.EuropeCountries
          });
        } else {
          return next();
        }
      }).fail(function(reason) {
        logger.error(reason);
        return res.send(500);
      });
    });
    app.get('/profile/projects', decorators.loginRequired, function(req, res) {
      return models.STLProject.find({
        user: req.user._id,
        status: {
          "$ne": models.PROJECT_STATUSES.ARCHIVED[0]
        }
      }).exec().then(function(docs) {
        return res.render('core/profile/list_projects', {
          projects: docs
        });
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.get('/profile/archived', decorators.loginRequired, function(req, res) {
      return models.STLProject.find({
        user: req.user._id,
        status: models.PROJECT_STATUSES.ARCHIVED[0]
      }).exec().then(function(docs) {
        return res.render('core/profile/list_projects', {
          projects: docs
        });
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.get('/profile/settings', decorators.loginRequired, function(req, res) {
      return res.render('core/profile/settings', {
        errors: {}
      });
    });
    app.post('/profile/settings', decorators.loginRequired, function(req, res) {
      if (req.body.city && req.body.country && req.body.location) {
        req.user.city = req.body.city;
        req.user.country = req.body.country;
        req.user.location = req.body.location.split(',');
        req.user.address = req.body.address;
      }
      req.user.firstName = req.body.firstName;
      req.user.lastName = req.body.lastName;
      return req.user.save(function(error, user) {
        return res.render('core/profile/settings');
      });
    });
    requestShippingRate = function(address, project, res) {
      return auth.User.findOne({
        _id: project.order.printer
      }).exec().then(function(doc) {
        var postmaster;
        if (doc) {
          if (doc.printerAddress) {
            postmaster = PostMaster(settings.postmaster, settings.debug);
            return postmaster.v1.rate.list({
              to_zip: address.zip_code,
              from_zip: doc.printerAddress.zip_code,
              weight: project.weight
            }, function(error, response) {
              if (error) {
                return res.json({
                  message: "Something was wrong please try again"
                });
              } else {
                return request("http://rate-exchange.appspot.com/currency?from=USD&to=EUR", function(error, data, json) {
                  var rate;
                  if (error) {
                    logger.error(arguments);
                    return res.send(500);
                  } else {
                    rate = JSON.parse(json);
                    return res.json({
                      ok: 'successes',
                      address: address,
                      charge: decimal.fromNumber(response[response.best].charge * rate.rate, 2).toString()
                    });
                  }
                });
              }
            });
          } else {
            return res.json({
              message: "Printer doesn't have address, please contact support or printer to add address."
            });
          }
        } else {
          logger.warning("printer " + printer + " do not exists");
          return res.json({
            message: "Printer don't exists, please contact support"
          });
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    };
    app.get('/validate-address-and-rate/:id', decorators.loginRequired, function(req, res) {
      return models.STLProject.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        var address, errors, postmaster;
        if (doc) {
          if (req.query.id) {
            address = req.user.shippingAddresses.id(req.query.id);
            return requestShippingRate(address, doc, res);
          } else {
            if (!req.query.contact) {
              req.assert('company', {
                len: 'This field is required.'
              }).len(2);
            }
            if (!req.query.company) {
              req.assert('contact', {
                len: 'This field is required.'
              }).len(2);
            }
            req.assert('line1', {
              len: 'This field is required.'
            }).len(2);
            req.assert('city', {
              len: 'This field is required.'
            }).len(2);
            req.assert('state', {
              len: 'This field is required.'
            }).len(2);
            req.assert('zip_code', {
              len: 'This field is required.'
            }).len(2);
            req.assert('phone_no', {
              len: 'This field is required.'
            }).len(2);
            errors = req.validationErrors(true);
            if (errors) {
              return res.json({
                errors: errors
              });
            } else {
              address = {
                contact: req.query.contact,
                company: req.query.company,
                line1: req.query.line1,
                line2: req.query.line2,
                line3: req.query.line3,
                city: req.query.city,
                state: req.query.state,
                zip_code: req.query.zip_code,
                phone_no: req.query.phone_no,
                country: req.query.country
              };
              postmaster = PostMaster(settings.postmaster, settings.debug);
              return postmaster.v1.address.validate(address, function(error, response) {
                if (error) {
                  if (typeof error === 'string') {
                    error = JSON.parse(error);
                  }
                  return res.json({
                    message: error.message
                  });
                } else {
                  if (response.status === 'OK') {
                    req.user.shippingAddresses.push(address);
                    return req.user.save(function(error, doc) {
                      if (error) {
                        logger.error(error);
                        return res.send(500);
                      } else {
                        return requestShippingRate(address, doc, res);
                      }
                    });
                  } else {
                    return res.json({
                      message: "Something was wrong please try again"
                    });
                  }
                }
              });
            }
          }
        } else {
          return res.send(400);
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    handleDirection = function(req, res, title, postURL, callback) {
      var address, errors, postmaster;
      if (!req.body.contact) {
        req.assert('company', {
          len: 'This field is required.'
        }).len(2);
      }
      if (!req.body.company) {
        req.assert('contact', {
          len: 'This field is required.'
        }).len(2);
      }
      req.assert('line1', {
        len: 'This field is required.'
      }).len(2);
      req.assert('city', {
        len: 'This field is required.'
      }).len(2);
      req.assert('state', {
        len: 'This field is required.'
      }).len(2);
      req.assert('zip_code', {
        len: 'This field is required.'
      }).len(2);
      req.assert('phone_no', {
        len: 'This field is required.'
      }).len(2);
      errors = req.validationErrors(true);
      address = {
        contact: req.body.contact,
        company: req.body.company,
        line1: req.body.line1,
        line2: req.body.line2,
        line3: req.body.line3,
        city: req.body.city,
        state: req.body.state,
        zip_code: req.body.zip_code,
        phone_no: req.body.phone_no,
        country: req.body.country
      };
      if (errors) {
        return res.render('core/profile/address_form', {
          errors: errors,
          title: title,
          address: address,
          postURL: postURL,
          countries: auth.EuropeCountries
        });
      } else {
        postmaster = PostMaster(settings.postmaster, settings.debug);
        return postmaster.v1.address.validate(address, function(error, response) {
          if (error) {
            if (typeof error === 'string') {
              error = JSON.parse(error);
            }
            return res.render('core/profile/address_form', {
              errors: error.details.body.fields,
              message: error.message,
              title: title,
              address: address,
              postURL: postURL,
              countries: auth.EuropeCountries
            });
          } else {
            if (response.status === 'OK') {
              return callback(address);
            } else {
              return res.render('core/profile/address_form', {
                message: "Something was wrong please try again",
                title: title,
                address: address,
                postURL: postURL,
                countries: auth.EuropeCountries
              });
            }
          }
        });
      }
    };
    app.get('/profile/settings/printer-direction', decorators.loginRequired, function(req, res) {
      return res.render('core/profile/address_form', {
        errors: {},
        title: "<h1 class='page-title'><span>Printer</span></h1><h1 class='page-title'><span>Direction</span></h1>",
        address: req.user.printerAddress || {},
        postURL: '/profile/settings/printer-direction',
        countries: auth.EuropeCountries
      });
    });
    app.post('/profile/settings/printer-direction', decorators.loginRequired, function(req, res) {
      return handleDirection(req, res, "<h1 class='page-title'><span>Printer</span></h1><h1 class='page-title'><span>Direction</span></h1>", '/profile/settings/printer-direction', function(address) {
        req.user.printerAddress = address;
        req.user.save();
        return res.redirect('/profile/settings');
      });
    });
    app.get('/profile/settings/new-shipping-direction', decorators.loginRequired, function(req, res) {
      return res.render('core/profile/address_form', {
        errors: {},
        title: "<h1 class='page-title'><span>New</span></h1><h1 class='page-title'><span>Direction</span></h1>",
        address: {},
        postURL: '/profile/settings/new-shipping-direction',
        countries: auth.EuropeCountries
      });
    });
    app.post('/profile/settings/new-shipping-direction', decorators.loginRequired, function(req, res) {
      return handleDirection(req, res, "<h1 class='page-title'><span>New</span></h1><h1 class='page-title'><span>Direction</span></h1>", '/profile/settings/new-shipping-direction', function(address) {
        req.user.shippingAddresses.push(address);
        req.user.save();
        return res.redirect('/profile/settings');
      });
    });
    app.get('/profile/settings/edit-shipping-direction/:id', decorators.loginRequired, function(req, res) {
      var address;
      address = req.user.shippingAddresses.id(req.params.id);
      return res.render('core/profile/address_form', {
        errors: {},
        title: "<h1 class='page-title'><span>Edit</span></h1><h1 class='page-title'><span>Direction</span></h1>",
        address: address,
        postURL: "/profile/settings/edit-shipping-direction/" + req.params.id,
        countries: auth.EuropeCountries
      });
    });
    app.post('/profile/settings/edit-shipping-direction/:id', decorators.loginRequired, function(req, res) {
      var address;
      address = req.user.shippingAddresses.id(req.params.id);
      return handleDirection(req, res, "<h1 class='page-title'><span>Edit</span></h1><h1 class='page-title'><span>Direction</span></h1>", "/profile/settings/edit-shipping-direction/" + req.params.id, function(newAddress) {
        address.contact = newAddress.contact;
        address.company = newAddress.company;
        address.line1 = newAddress.line1;
        address.line2 = newAddress.line2;
        address.line3 = newAddress.line3;
        address.city = newAddress.city;
        address.state = newAddress.state;
        address.zip_code = newAddress.zip_code;
        address.phone_no = newAddress.phone_no;
        address.country = newAddress.country;
        req.user.save();
        return res.redirect('/profile/settings');
      });
    });
    app.post('/profile/settings/delete-shipping-direction/:id', decorators.loginRequired, function(req, res) {
      req.user.shippingAddresses.id(req.params.id).remove();
      return req.user.save(function(error, user) {
        if (error) {
          return res.send(400);
        } else {
          return res.send(200);
        }
      });
    });
    app.post('/project/title/:id', decorators.loginRequired, function(req, res) {
      var errors;
      req.assert('value').len(4);
      errors = req.validationErrors(true);
      if (errors) {
        return res.send(errors.value.msg, 400);
      } else {
        return models.STLProject.findOne({
          _id: req.params.id
        }).exec().then(function(doc) {
          if (doc) {
            if (doc.editable) {
              doc.title = req.body.value;
              doc.save();
              return res.send(req.body.value, 200);
            } else {
              return res.send("Project couldn't be editable at this status.", 400);
            }
          } else {
            return res.send(404);
          }
        }).fail(function() {
          logger.error(arguments);
          return res.send(500);
        });
      }
    });
    app.post('/project/color/:id', decorators.loginRequired, function(req, res) {
      var errors;
      req.assert('value').regex(/red|green|blue|black|white|yellow/);
      errors = req.validationErrors(true);
      if (errors) {
        return res.send(errors.value.msg, 400);
      } else {
        return models.STLProject.findOne({
          _id: req.params.id,
          editable: true
        }).exec().then(function(doc) {
          if (doc) {
            doc.color = req.body.value;
            doc.save();
            return res.send(200);
          } else {
            return res.send(404);
          }
        }).fail(function() {
          logger.error(arguments);
          return res.send(500);
        });
      }
    });
    app.post('/project/density/:id', decorators.loginRequired, function(req, res) {
      var value;
      value = parseFloat(req.body.value);
      if (value !== models.PROJECT_DENSITIES.LOW[0] && value !== models.PROJECT_DENSITIES.MEDIUM[0] && value !== models.PROJECT_DENSITIES.HIGH[0] && value !== models.PROJECT_DENSITIES.COMPLETE[0]) {
        return res.send(400);
      } else {
        return models.STLProject.findOne({
          _id: req.params.id,
          editable: true
        }).exec().then(function(doc) {
          var cloned;
          if (doc) {
            doc.density = value;
            doc.status = models.PROJECT_STATUSES.PROCESSING[0];
            cloned = utils.cloneObject(doc._doc);
            cloned.status = doc.humanizedStatus();
            delete cloned.comments;
            io.of('/project')["in"](doc._id.toHexString()).emit('update', cloned);
            processVolumeWeight(doc);
            return res.send(200);
          } else {
            return res.send(404);
          }
        }).fail(function() {
          logger.error(arguments);
          return res.send(500);
        });
      }
    });
    app.post('/project/order/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        editable: true
      }).exec().then(function(doc) {
        var ammount;
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_REQUESTED[0])) {
          ammount = Math.abs(req.body.ammount && parseInt(req.body.ammount) ? parseInt(req.body.ammount) : 1);
          doc.status = models.PROJECT_STATUSES.PRINT_REQUESTED[0];
          doc.order = {
            ammount: ammount,
            price: calculateOrderPrice(doc.price, ammount).toString(),
            placedAt: new Date()
          };
          doc.save();
        }
        return res.redirect("/project/" + req.params.id);
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.post('/project/comment/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        $or: [
          {
            user: req.user.id
          }, {
            'order.printer': req.user.id
          }
        ]
      }).exec().then(function(doc) {
        var comment;
        if (doc && doc.status >= models.PROJECT_STATUSES.PRINT_REVIEW[0]) {
          if (req.body.message) {
            comment = {
              author: req.user.id,
              username: req.user.username,
              photo: req.user.photo,
              content: req.body.message,
              createdAt: Date.now()
            };
            doc.comments.push(comment);
            doc.save();
            return res.json(comment, 200);
          } else {
            return res.json({
              msg: "The message is required."
            }, 400);
          }
        } else {
          return res.json({
            msg: "Not allowed comments at this moment."
          }, 400);
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.post('/project/pay/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        user: req.user.id
      }).exec().then(function(doc) {
        var payment, totalPrice;
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PAYED[0])) {
          totalPrice = parseFloat(doc.order.price);
          if (req.body.shippingMethod === 'shipping') {
            totalPrice = decimal.fromNumber(totalPrice + parseFloat(req.body.shippingRate), 2).toString();
          }
          payment = {
            intent: "sale",
            payer: {
              payment_method: "paypal"
            },
            redirect_urls: {
              return_url: "" + settings.site + "/project/pay/execute/" + doc.id,
              cancel_url: "" + settings.site + "/project/pay/cancel/" + doc.id
            },
            transactions: [
              {
                amount: {
                  total: totalPrice,
                  currency: "EUR"
                },
                description: "Payment for 3D printing in 3doers"
              }
            ]
          };
          return paypal.payment.create(payment, function(error, payment) {
            var i, link, redirectUrl;
            if (error) {
              logger.error(error);
              return res.send(500);
            } else {
              if (payment.payer.payment_method === "paypal") {
                req.session.paymentId = payment.id;
                req.session.shippingMethod = req.body.shippingMethod;
                if (req.body.shippingMethod === 'shipping') {
                  req.session.shippingRate = req.body.shippingRate;
                  req.session.shippingAddress = JSON.parse(req.body.shippingAddress);
                }
                console.log(req.session);
                redirectUrl = void 0;
                i = 0;
                while (i < payment.links.length) {
                  link = payment.links[i];
                  if (link.method === "REDIRECT") {
                    redirectUrl = link.href;
                  }
                  i++;
                }
                return res.redirect(redirectUrl);
              }
            }
          });
        } else {
          return res.send(400);
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.get('/project/pay/cancel/:id', decorators.loginRequired, function(req, res) {
      delete req.session.paymentId;
      return res.redirect("/project/" + req.params.id);
    });
    app.get('/project/pay/execute/:id', decorators.loginRequired, function(req, res) {
      return models.STLProject.findOne({
        _id: req.params.id,
        user: req.user.id
      }).exec().then(function(doc) {
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PAYED[0])) {
          return auth.User.findOne(doc.order.printer).exec(function(err, user) {
            var details, payerId, paymentId;
            paymentId = req.session.paymentId;
            payerId = req.param("PayerID");
            details = {
              payer_id: payerId
            };
            return paypal.payment.execute(paymentId, details, function(error, payment) {
              var updatedData;
              if (error) {
                return logger.error(error);
              } else {
                updatedData = {
                  status: models.PROJECT_STATUSES.PRINTING[0],
                  'order.paymentId': paymentId,
                  'order.shippingMethod': req.session.shippingMethod
                };
                if (req.session.shippingMethod === 'shipping') {
                  if (req.session.shippingAddress._id) {
                    delete req.session.shippingAddress._id;
                  }
                  updatedData['order.shippingCharge'] = req.session.shippingRate;
                  updatedData['order.shippingAddress'] = req.session.shippingAddress;
                }
                return doc.update(updatedData, function(error) {
                  if (!error) {
                    mailer.send('mailer/project/payed', {
                      project: doc,
                      user: user,
                      site: settings.site
                    }, {
                      from: settings.mailer.noReply,
                      to: [user.email],
                      subject: settings.project.payed.subject
                    });
                  }
                  return res.redirect("/project/" + req.params.id);
                });
              }
            });
          });
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.post('/project/start-printing/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        'order.printer': req.user.id
      }).exec().then(function(doc) {
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PRINTING[0])) {
          doc.status = models.PROJECT_STATUSES.PRINTING[0];
          doc.save();
        }
        return res.redirect("/project/" + req.params.id);
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.post('/project/archive/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        user: req.user.id
      }).exec().then(function(doc) {
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.ARCHIVED[0])) {
          doc.status = models.PROJECT_STATUSES.ARCHIVED[0];
          doc.save();
        }
        return res.redirect("/project/" + req.params.id);
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.post('/project/printed/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        'order.printer': req.user.id
      }).exec().then(function(doc) {
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PRINTED[0])) {
          return auth.User.findOne({
            _id: doc.order.printer
          }).exec().then(function(printer) {
            var postmaster;
            if (printer) {
              if (printer.printerAddress) {
                if (doc.order.shippingMethod === 'pickup') {
                  doc.status = models.PROJECT_STATUSES.PRINTED[0];
                  return doc.save(function() {
                    return res.redirect("/project/" + req.params.id);
                  });
                } else {
                  postmaster = PostMaster(settings.postmaster, settings.debug);
                  return postmaster.v1.shipment.create({
                    to: doc.order.shippingAddress,
                    from: printer.printerAddress,
                    "package": {
                      weight: doc.weight
                    }
                  }, function(error, response) {
                    if (error) {
                      logger.error(error);
                      return res.redirect("/project/" + req.params.id);
                    } else {
                      doc.status = models.PROJECT_STATUSES.SHIPPING[0];
                      return doc.save(function() {
                        return res.redirect("/project/" + req.params.id);
                      });
                    }
                  });
                }
              } else {
                return res.send("Printer doesn't have address, please contact support or printer to add address.");
              }
            } else {
              logger.warning("printer " + printer + " do not exists");
              return res.send("Printer don't exists, please contact support");
            }
          }).fail(function() {
            logger.error(arguments);
            return res.send(500);
          });
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.post('/project/shipping-address/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        user: req.user.id
      }).exec().then(function(doc) {}).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.get('/printing/requests', decorators.printerRequired, function(req, res) {
      return models.STLProject.find({
        status: models.PROJECT_STATUSES.PRINT_REQUESTED[0]
      }).exec(function(err, docs) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          return res.render('core/printing/requests', {
            projects: docs
          });
        }
      });
    });
    app.get('/printing/jobs', decorators.printerRequired, function(req, res) {
      return models.STLProject.find({
        'order.printer': req.user.id,
        status: {
          $in: [models.PROJECT_STATUSES.PRINT_ACCEPTED[0], models.PROJECT_STATUSES.PRINT_REVIEW[0]]
        }
      }).exec(function(err, docs) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          return res.render('core/printing/jobs', {
            projects: docs
          });
        }
      });
    });
    app.get('/printing/archived', decorators.printerRequired, function(req, res) {
      return models.STLProject.find({
        'order.printer': req.user.id,
        status: models.PROJECT_STATUSES.ARCHIVED[0]
      }).exec(function(err, docs) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          return res.render('core/printing/archived', {
            projects: docs
          });
        }
      });
    });
    app.post('/printing/review/:id', decorators.printerRequired, function(req, res) {
      return models.STLProject.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_REVIEW[0])) {
          return auth.User.findOne(doc.user).exec(function(err, user) {
            if (user) {
              return mailer.send('mailer/printing/accept', {
                project: doc,
                user: user,
                site: settings.site
              }, {
                from: settings.mailer.noReply,
                to: [user.email],
                subject: settings.printing.accept.subject
              }).then(function() {
                doc.status = models.PROJECT_STATUSES.PRINT_REVIEW[0];
                doc.order = {
                  printer: req.user.id,
                  ammount: doc.order.ammount,
                  price: doc.order.price
                };
                doc.save();
                return res.json({
                  msg: "Accepted"
                });
              });
            }
          });
        } else {
          return res.json({
            msg: "Looks like someone accepted, try with another"
          }, 400);
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.post('/printing/accept/:id', decorators.printerRequired, function(req, res) {
      return models.STLProject.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_ACCEPTED[0])) {
          return auth.User.findOne(doc.user).exec(function(err, user) {
            if (user) {
              return mailer.send('mailer/printing/accept', {
                project: doc,
                user: user,
                site: settings.site
              }, {
                from: settings.mailer.noReply,
                to: [user.email],
                subject: settings.printing.accept.subject
              }).then(function() {
                doc.status = models.PROJECT_STATUSES.PRINT_ACCEPTED[0];
                doc.order = {
                  printer: req.user.id,
                  ammount: doc.order.ammount,
                  price: doc.order.price
                };
                doc.save();
                return res.json({
                  msg: "Accepted"
                });
              });
            }
          });
        } else {
          return res.json({
            msg: "Looks like someone accepted, try with another"
          }, 400);
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    app.post('/printing/deny/:id', decorators.printerRequired, function(req, res) {
      return models.STLProject.findOne({
        _id: req.params.id,
        editable: false
      }).exec().then(function(doc) {
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_REQUESTED[0])) {
          doc.status -= 1;
          doc.save();
          res.json({
            msg: "Denied"
          });
        }
        if (doc && doc.status === models.PROJECT_STATUSES.PRINT_ACCEPTED[0]) {
          return res.json({
            msg: "Looks like someone accepted, try with another"
          }, 400);
        }
      }).fail(function() {
        logger.error(arguments);
        return res.send(500);
      });
    });
    io.of('/project').on('connection', function(socket) {
      if (socket.handshake.query.project != null) {
        return models.STLProject.findOne({
          _id: socket.handshake.query.project,
          user: socket.handshake.session.passport.user
        }, {
          title: 1,
          volume: 1,
          status: 1,
          editable: 1
        }).exec().then(function(doc) {
          if (doc) {
            socket.join(doc._id.toHexString());
            doc._doc.status = doc.humanizedStatus();
            io.of('/project')["in"](doc._id.toHexString()).emit('update', doc._doc);
            return socket.on('order-price', function(data) {
              return models.STLProject.findOne(doc._id).exec().then(function(doc) {
                var ammount, price;
                ammount = Math.abs(data.ammount && parseInt(data.ammount) ? parseInt(data.ammount) : 1);
                price = calculateOrderPrice(doc.price, ammount);
                return io.of('/project')["in"](doc._id.toHexString()).emit('update-price-order', {
                  price: price.toString()
                });
              });
            });
          } else {
            return socket.emit('error', {
              msg: "Document not found"
            });
          }
        }).fail(function(reason) {
          logger.error(reason);
          return socket.emit('error', {
            msg: "Error searching for project. Mongo Error"
          });
        });
      } else {
        return socket.emit('error', {
          msg: "No project was not sent"
        });
      }
    });
    processVolumeWeight = function(doc) {
      return exec("" + settings.python.bin + " " + settings.python.path + " " + settings.upload.to + doc.file + " -d " + doc.density, function(err, stdout, stderr) {
        var cloned, e, result;
        if (!err && !stderr) {
          try {
            result = JSON.parse(stdout);
            doc.volume = result.volume;
            doc.weight = result.weight;
            doc.unit = result.unit;
            doc.status = models.PROJECT_STATUSES.PROCESSED[0];
            doc.price = decimal.fromNumber((doc.volume * 1.01 * doc.density * 0.03) + 5, 2);
            doc.bad = false;
            doc.save();
          } catch (_error) {
            e = _error;
            logger.error(e);
            logger.error(stderr);
            doc.bad = true;
            doc.save();
          }
        } else {
          doc.bad = true;
          doc.save();
        }
        cloned = utils.cloneObject(doc._doc);
        cloned.status = doc.humanizedStatus();
        return io.of('/project')["in"](doc._id.toHexString()).emit('update', cloned);
      });
    };
    return calculateOrderPrice = function(basePrice, ammount) {
      if (basePrice <= 10) {
        return decimal.fromNumber((3 + 2 * basePrice) * ammount, 2);
      } else {
        return decimal.fromNumber((23 + 10 * Math.log(basePrice - 9)) * ammount, 2);
      }
    };
  };

}).call(this);
