(function() {
  module.exports = function(app, io) {
    var Paypal, STLStats, auth, calculateOrderPrice, decimal, decorators, exec, fs, gridfs, handleDirection, logger, mailer, models, processVolumeWeight, request, requestShippingRate, settings, shippo, utils;
    fs = require('fs');
    exec = require('child_process').exec;
    decimal = require('Deci-mal').decimal;
    Paypal = require('paypal-adaptive');
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
    shippo = require('shippo')('mattia.spinelli@zoho.com', 'mattia13');
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
        res.json({
          errors: {
            thumbnail: {
              msg: "This field is required"
            }
          }
        });
        return;
      }
      if (req.files.thumbnail.type !== 'application/octet-stream' || req.files.thumbnail.path.split('/').pop().split('.').pop().toLowerCase() !== 'stl') {
        res.json({
          errors: {
            thumbnail: {
              msg: "Is not a valid format, you need to upload a STL file."
            }
          }
        });
        fs.unlink(req.files.thumbnail.path);
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
    app.post('/project/:id/image/', decorators.loginRequired, function(req, res) {
      return models.STLProject.findOne({
        _id: req.params.id,
        user: req.user.id
      }).exec().then(function(doc) {
        var filename, matches;
        if (doc) {
          matches = req.body.image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches.length !== 3) {
            return res.send(400);
          } else {
            filename = doc.file.split('.')[0];
            return fs.writeFile("" + (settings.upload.to + filename) + ".png", matches[2], 'base64', function(err) {
              if (err) {
                logger.error(err);
              } else {
                doc.image = "" + filename + ".png";
                doc.save();
              }
              return res.send(200);
            });
          }
        }
      }).fail(function(reason) {
        logger.error(reason);
        return res.send(500);
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
          if (!doc.volume || doc.bad || !doc.dimension) {
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
      }).exec().then(function(printer) {
        var data, shipping;
        if (printer) {
          shipping = function(shipping) {
            return shippo.rate.list({
              object_id: shipping.object_id,
              currency: 'EUR'
            }).then(function(rates) {
              var price, price_tmp, rate, rate_tmp, _i, _len;
              if (rates.length > 0) {
                rate = null;
                price = 9999999999.0;
                for (_i = 0, _len = rates.length; _i < _len; _i++) {
                  rate_tmp = rates[_i];
                  price_tmp = parseFloat(rate_tmp.amount);
                  if (rate_tmp.object_purpose === "PURCHASE" && price > price_tmp) {
                    rate = rate_tmp;
                    price = price_tmp;
                  }
                }
                if (rate) {
                  project.update({
                    'order.rate': rate
                  });
                  return res.json({
                    ok: 'successes',
                    address: address,
                    charge: rate.ammount
                  });
                }
              } else {
                return res.json({
                  message: "There is not rate, use another address"
                });
              }
            });
          };
          if (printer.printerAddress) {
            if (project.order.shipping && project.order.shipping.address_to === address.object_id) {
              logger.debug("Parcel already created");
              return shipping(project.order.shipping);
            } else {
              data = {};
              return shippo.parcel.create({
                length: decimal.fromNumber(project.dimension.length, 4).toString(),
                width: decimal.fromNumber(project.dimension.width, 4).toString(),
                height: decimal.fromNumber(project.dimension.height, 4).toString(),
                distance_unit: project.unit,
                weight: decimal.fromNumber(project.weight, 4).toString(),
                mass_unit: 'g'
              }).then(function(parcel) {
                data['order.parcel'] = parcel;
                return shippo.shipment.create({
                  object_purpose: "PURCHASE",
                  address_from: printer.printerAddress.object_id,
                  address_to: address.object_id,
                  parcel: parcel.object_id,
                  submission_type: 'DROPOFF'
                });
              }).then(function(shipping_tmp) {
                data['order.shipping'] = shipping_tmp;
                project.update(data, function(error) {
                  if (error) {
                    return logger.error(error);
                  }
                });
                return shipping(shipping_tmp);
              });
            }
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
      }).fail(function(reason) {
        logger.error(reason);
        return res.json({
          message: reason.raw.message
        });
      });
    };
    app.get('/validate-address-and-rate/:id', decorators.loginRequired, function(req, res) {
      return models.STLProject.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        var address, errors;
        if (doc) {
          if (req.query.id) {
            address = req.user.shippingAddresses.id(req.query.id);
            requestShippingRate(address, doc, res);
          } else {
            req.assert('name', {
              len: 'This field is required.'
            }).len(2);
            req.assert('street1', {
              len: 'This field is required.'
            }).len(2);
            req.assert('city', {
              len: 'This field is required.'
            }).len(2);
            req.assert('zip_code', {
              len: 'This field is required.'
            }).len(2);
            req.assert('phone_no', {
              len: 'This field is required.'
            }).len(2);
            req.assert('country', {
              len: 'This field is required.'
            }).len(2);
            errors = req.validationErrors(true);
            address = {
              object_purpose: "PURCHASE",
              name: req.query.name,
              company: req.query.company,
              street1: req.query.street1,
              street_no: req.query.street_no,
              street2: req.query.street2,
              city: req.query.city,
              state: req.query.state,
              zip: req.query.zip_code,
              phone: req.query.phone_no,
              country: req.query.country,
              email: req.user.email
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
              return shippo.address.create(address).then(function(address) {
                req.user.shippingAddresses.push(address);
                return req.user.save(function(error, user) {
                  if (error) {
                    logger.error(error);
                    return res.send(500);
                  } else {
                    return requestShippingRate(address, doc, res);
                  }
                });
              }, function(error) {
                logger.error(error);
                res.json({
                  message: error.raw.message
                });
              });
            }
          }
        } else {
          return res.send(400);
        }
      }).fail(function(reason) {
        logger.error(reason);
        return res.send(500);
      });
    });
    handleDirection = function(req, res, title, postURL, callback) {
      var address, errors;
      req.assert('name', {
        len: 'This field is required.'
      }).len(2);
      req.assert('street1', {
        len: 'This field is required.'
      }).len(2);
      req.assert('city', {
        len: 'This field is required.'
      }).len(2);
      req.assert('zip_code', {
        len: 'This field is required.'
      }).len(2);
      req.assert('phone_no', {
        len: 'This field is required.'
      }).len(2);
      req.assert('country', {
        len: 'This field is required.'
      }).len(2);
      errors = req.validationErrors(true);
      address = {
        object_purpose: "PURCHASE",
        name: req.body.name,
        company: req.body.company,
        street1: req.body.street1,
        street_no: req.body.street_no,
        street2: req.body.street2,
        city: req.body.city,
        state: req.body.state,
        zip: req.body.zip_code,
        phone: req.body.phone_no,
        country: req.body.country,
        email: req.user.email
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
        return shippo.address.create(address).then(function(address) {
          return callback(address);
        }, function(error) {
          logger.error(error);
          return res.render('core/profile/address_form', {
            message: error.raw.message,
            title: title,
            address: address,
            postURL: postURL,
            countries: auth.EuropeCountries
          });
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
        req.user.save(function(error, doc) {
          if (error) {
            return logger.error(error);
          }
        });
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
        var ammount, price, printerPayment;
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_REQUESTED[0])) {
          ammount = Math.abs(req.body.ammount && parseInt(req.body.ammount) ? parseInt(req.body.ammount) : 1);
          price = calculateOrderPrice(doc.price, ammount);
          printerPayment = decimal.fromNumber(price * 0.75, 2);
          doc.status = models.PROJECT_STATUSES.PRINT_REQUESTED[0];
          doc.order = {
            ammount: ammount,
            price: price.toString(),
            printerPayment: printerPayment.toString(),
            businessPayment: decimal.fromNumber(price - printerPayment, 2).toString(),
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
        var businessPayment, paypalSdk, printerPayment;
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PAYED[0])) {
          printerPayment = parseFloat(doc.order.printerPayment);
          businessPayment = parseFloat(doc.order.businessPayment);
          if (req.body.shippingMethod === 'shipping' && doc.order.rate) {
            businessPayment = decimal.fromNumber(businessPayment + parseFloat(doc.order.rate.amount), 2).toString();
            businessPayment = parseFloat(businessPayment);
          }
          req.session.deliveryMethod = req.body.shippingMethod;
          paypalSdk = new Paypal({
            userId: settings.paypal.adaptive.user,
            password: settings.paypal.adaptive.password,
            signature: settings.paypal.adaptive.signature,
            appId: settings.paypal.adaptive.appId,
            sandbox: settings.paypal.adaptive.debug
          });
          return auth.User.findOne({
            _id: doc.order.printer
          }).exec().then(function(user) {
            var payload;
            if (user) {
              payload = {
                requestEnvelope: {
                  errorLanguage: 'en_US'
                },
                actionType: 'PAY',
                currencyCode: 'EUR',
                feesPayer: 'EACHRECEIVER',
                memo: 'Payment for 3D printing in 3doers',
                returnUrl: "" + settings.site + "/project/pay/execute/" + doc.id,
                cancelUrl: "" + settings.site + "/project/pay/cancel/" + doc.id,
                receiverList: {
                  receiver: [
                    {
                      email: '3doers@gmail.com',
                      amount: businessPayment,
                      primary: 'false'
                    }, {
                      email: user.email,
                      amount: printerPayment,
                      primary: 'false'
                    }
                  ]
                }
              };
              return paypalSdk.pay(payload, function(err, response) {
                if (err) {
                  logger.error(err);
                  return res.send(500);
                } else {
                  return res.redirect(response.paymentApprovalUrl);
                }
              });
            }
          });
        } else {
          return res.send(400);
        }
      }).fail(function(reason) {
        logger.error(reason);
        return res.send(500);
      });
    });
    app.get('/project/pay/cancel/:id', decorators.loginRequired, function(req, res) {
      return res.redirect("/project/" + req.params.id);
    });
    app.get('/project/pay/execute/:id', decorators.loginRequired, function(req, res) {
      return models.STLProject.findOne({
        _id: req.params.id,
        user: req.user.id
      }).exec().then(function(doc) {
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PAYED[0])) {
          return auth.User.findOne(doc.order.printer).exec(function(err, user) {
            var updatedData;
            if (err) {
              logger.error(err);
              return res.send(500);
            } else {
              updatedData = {
                status: models.PROJECT_STATUSES.PRINTING[0],
                'order.deliveryMethod': req.session.deliveryMethod
              };
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
        doc.status = models.PROJECT_STATUSES.ARCHIVED[0];
        doc.save();
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
            if (printer) {
              if (printer.printerAddress) {
                if (doc.order.deliveryMethod === 'pickup') {
                  doc.status = models.PROJECT_STATUSES.PRINTED[0];
                  return doc.save(function() {
                    return res.redirect("/project/" + req.params.id);
                  });
                } else {
                  return shippo.transaction.create({
                    rate: doc.order.rate.object_id
                  }).then(function(transaction) {
                    var updatedData;
                    updatedData = {
                      status: models.PROJECT_STATUSES.SHIPPING[0],
                      'order.transaction': transaction
                    };
                    return doc.update(updatedData, function(error) {
                      return res.redirect("/project/" + req.params.id);
                    });
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
        status: {
          "$lt": models.PROJECT_STATUSES.ARCHIVED[0],
          "$gt": models.PROJECT_STATUSES.PRINT_REQUESTED[0]
        },
        'order.printer': req.user.id
      }).exec(function(err, docs) {
        if (err) {
          logger.error(err);
          return res.send(500);
        } else {
          if (docs && docs.length > 0) {
            return res.render('core/printing/requests', {
              projects: docs,
              toApply: false
            });
          } else {
            return models.STLProject.find({
              status: models.PROJECT_STATUSES.PRINT_REQUESTED[0]
            }).exec(function(err, docs) {
              if (err) {
                logger.error(err);
                return res.send(500);
              } else {
                return res.render('core/printing/requests', {
                  projects: docs,
                  toApply: true
                });
              }
            });
          }
        }
      });
    });
    app.get('/printing/jobs', decorators.printerRequired, function(req, res) {
      return models.STLProject.find({
        'order.printer': req.user.id,
        status: {
          "$lt": models.PROJECT_STATUSES.ARCHIVED[0],
          "$gt": models.PROJECT_STATUSES.PRINT_REQUESTED[0]
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
                  price: doc.order.price,
                  printerPayment: doc.order.printerPayment,
                  businessPayment: doc.order.businessPayment,
                  placedAt: doc.order.placedAt
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
        _id: req.params.id
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
          var key, response;
          if (doc) {
            socket.join(doc._id.toHexString());
            response = {};
            for (key in doc._doc) {
              response[key] = doc._doc[key];
            }
            response.status = doc.humanizedStatus();
            response.status_image = doc.dasherizedStatus();
            io.of('/project')["in"](doc._id.toHexString()).emit('update', response);
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
        var cloned, density, e, fixed_cost, material_price, p_vi, p_vs, pb, price, result, v_i, v_s;
        if (!err && !stderr) {
          try {
            result = JSON.parse(stdout);
            material_price = 0.5;
            density = doc.density;
            fixed_cost = 8;
            console.log("material_price: " + material_price);
            console.log("density: " + density);
            console.log("fixed_cost: " + fixed_cost);
            v_s = result.surface / 100 * 0.09;
            console.log("v_s: " + v_s);
            p_vs = v_s * density * material_price;
            console.log("p_vs: " + p_vs);
            v_i = result.volume - v_s;
            p_vi = v_i * 0.20 * material_price;
            console.log("v_i: " + v_i);
            console.log("p_vi: " + p_vi);
            pb = p_vs + p_vi;
            console.log("pb: " + pb);
            price = pb + fixed_cost;
            console.log("price: " + price);
            doc.volume = result.volume;
            doc.weight = result.weight;
            doc.unit = result.unit;
            doc.dimension = result.dimension;
            doc.status = models.PROJECT_STATUSES.PROCESSED[0];
            doc.price = decimal.fromNumber(price, 2);
            doc.surface = result.surface / 100;
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
          logger.error(e);
          logger.error(stderr);
        }
        cloned = utils.cloneObject(doc._doc);
        cloned.status = doc.humanizedStatus();
        return io.of('/project')["in"](doc._id.toHexString()).emit('update', cloned);
      });
    };
    return calculateOrderPrice = function(basePrice, ammount) {
      return decimal.fromNumber(basePrice * ammount, 2);
    };
  };

}).call(this);
