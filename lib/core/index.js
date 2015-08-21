(function() {
  module.exports = function(app, io) {
    var nconf = require('nconf');
    var Paypal, STLStats, auth, calculateOrderPrice, decimal, decorators, designModels, exec, fs, gridfs, handleDirection, logger, mailer, models, notificationModels, processVolumeWeight, request, requestShippingRate, settings, shippo, utils;
    require("datejs");
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
    designModels = require('../design/models');
    notificationModels = require('../notification/models');
    shippo = require('shippo')('mattia.spinelli@zoho.com', 'mattia13');
    app.get('/stampatori', function(req, res) {
      return res.render('core/stampatori');
    });
    app.get('/gadgets3D', function(req, res) {
      return res.render('core/gadgets3D');
    });
    app.get('/utenti', function(req, res) {
      return res.render('core/utenti');
    });
    app.get('/api/printers', function(req, res) {
      var q, query;
      q = req.query.q.split(' ')[0];
      query = {
        printer: 'accepted',
        $or: [
          {
            username: {
              $regex: "" + q,
              $options: 'si'
            }
          }, {
            email: {
              $regex: "" + q,
              $options: 'si'
            }
          }
        ]
      };
      return auth.User.find(query, {
        id: true,
        email: true,
        username: true
      }).limit(10).exec().then(function(data) {
        return res.json(data);
      }).fail(function() {
        console.log(arguments);
        return res.send(500);
      });
    });
    app.get('/', function(req, res) {
      if (req.user) {
        return res.redirect('/profile/projects');
      } else {
        return models.STLProject.find().sort({
          createdAt: -1
        }).limit(6).exec(function(err, projects) {
          return auth.User.find().limit(15).exec(function(err, users) {
            return res.render('core/index', {
              error: false,
              message: false,
              users: users,
              projects: projects
            });
          });
        });
      }
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
      return res.redirect('/profile/settings#upgradeYourProfile');
    });
    app.post('/become/filemanager', decorators.loginRequired, function(req, res) {
      if (req.user.filemanager) {
        return res.redirect('/profile/settings#upgradeYourProfile');
      } else {
        if (req.body.designerType === void 0 || (req.body.fiscalCode === void 0 && req.body.VatNumber === void 0)) {
          return res.send(400);
        }
        return mailer.send('mailer/core/become_designer', {
          user: req.user
        }, {
          from: req.user.email,
          to: settings.admins.emails,
          subject: "New Become a File manager Request"
        }).then(function() {
          req.user.filemanager = 'request';
          req.user.designerType = req.body.designerType;
          console.log(req.body);
          if (req.body.designerType === 'private') {
            req.user.fiscalCode = req.body.fiscalCode;
          } else {
            req.user.VatNumber = req.body.VatNumber;
          }
          return req.user.save(function(error, user) {
            if (error) {
              console.log(arguments);
              return res.send(500);
            } else {
              return res.redirect('/profile/settings');
            }
          });
        });
      }
    });
    app.get('/become', decorators.loginRequired, function(req, res) {
      return res.render('core/become');
    });
    app.post('/become', decorators.loginRequired, function(req, res) {
      var printer_city, printer_howlong, printer_model;
      if (req.user.printer) {
        return res.render('core/profile/settings');
      } else {
        printer_model = req.body.printer_model;
        printer_city = req.body.city;
        printer_howlong = req.body.howlong;
        mailer.send('mailer/core/become', {
          user: req.user,
          printer_model: printer_model,
          printer_city: printer_city,
          printer_howlong: printer_howlong
        }, {
          from: req.user.email,
          to: settings.admins.emails,
          subject: "New Become a Printer Request"
        }).then(function() {
          req.user.printer = 'request';
          return req.user.save();
        });
        return res.redirect('/profile/settings');
      }
    });
    /*app.get('/project/upload', function(req, res) {
      return res.render('core/project/upload');
    });
    app.post('/project/upload', function(req, res) {
      var e, project, tmp_path;
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
      if (req.files.thumbnail.extension.toLowerCase() !== 'stl') {
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
      try {
        project.user = req.user.id;
      } catch (_error) {
        e = _error;
        console.log(e);
      }
      project.title = req.files.thumbnail.originalname;
      project.file = req.files.thumbnail.path.split('/').pop();
      return project.save(function(err, doc) {
        if (err) {
          console.log(arguments);
          return res.send(500);
        } else {
          return res.send({
            redirectTo: "/project/" + project.id
          });
        }
      });
    });*/
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
                console.log(arguments);
              } else {
                doc.image = "" + filename + ".png";
                doc.save();
              }
              return res.send(200);
            });
          }
        }
      }).fail(function(reason) {
        console.log(arguments);
        return res.send(500);
      });
    });
    app.get('/project/:id', function(req, res, next) {
      var e, filterDict;
      if (req.user) {
        notificationModels.Notification.update({
          recipient: req.user.id,
          relatedObject: req.params.id,
          type: 1,
          read: false
        }, {
          read: true
        }).exec();
      }
      filterDict = {
        _id: req.params.id
      };
      try {
        if (!req.user.admin) {
          filterDict.$or = [
            {
              user: req.user.id
            }, {
              'order.printer': req.user.id
            }
          ];
        }
      } catch (_error) {
        e = _error;
        console.log(e);
      }
      return models.STLProject.findOne(filterDict).exec().then(function(doc) {
        if (doc) {
          if (!doc.volume || doc.bad || !doc.dimension) {
            processVolumeWeight(doc);
          }
          if (doc.order && doc.order.printer) {
            return auth.User.findOne({
              _id: doc.order.printer
            }).exec().then(function(printer) {
              return res.render('core/project/detail', {
                project: doc,
                printer: printer,
                colors: models.PROJECT_COLORS,
                materials: models.PROJECT_MATERIALS,
                statuses: models.PROJECT_STATUSES,
                countries: auth.EuropeCountries
              });
            });
          } else {
            return res.render('core/project/detail', {
              project: doc,
              colors: models.PROJECT_COLORS,
              materials: models.PROJECT_MATERIALS,
              statuses: models.PROJECT_STATUSES,
              countries: auth.EuropeCountries
            });
          }
        } else {
          return next();
        }
      }).fail(function(reason) {
        console.log(arguments);
        return res.send(500);
      });
    });
    app.get('/project/feedback/:id', function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        if (doc) {
          console.log(doc);
          return res.render('core/project/feedback', {
            doc: doc
          });
        } else {
          return res.send(404);
        }
      }).fail(function(reason) {
        console.log(arguments);
        return res.send(500);
      });
    });
    app.post('/project/feedback/:id', function(req, res, next) {
      console.log(req.params.id);
      return models.STLProject.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        if (doc) {
          if (doc.rating) {
            return res.send(401);
          }
          doc.rating = {
            quality: parseFloat(req.body.quality),
            comunication: parseFloat(req.body.comunication),
            speed: parseFloat(req.body.speed),
            satisfation: parseFloat(req.body.satisfation)
          };
          doc.save();
          return res.redirect('/project/feedback/' + req.params.id);
        } else {
          return res.send(404);
        }
      }).fail(function(reason) {
        console.log(arguments);
        return res.send(500);
      });
    });
    app.get('/profile/projects', decorators.loginRequired, function(req, res) {
      if (req.user.printer !== "accepted" && req.user.filemanager !== "accepted") {
        return models.STLProject.find({
          user: req.user._id,
          status: {
            "$lte": models.PROJECT_STATUSES.PRINT_REVIEW[0]
          }
        }).sort({
          createdAt: -1
        }).exec().then(function(docs) {
          return res.render('core/profile/list_projects', {
            projects: docs,
            printingProjects: [],
            designProjects: []
          });
        }).fail(function() {
          console.log(arguments);
          return res.send(500);
        });
      } else if (req.user.printer === 'accepted' && req.user.filemanager !== "accepted") {
        return res.redirect("/printing/requests");
      } else if (req.user.printer !== 'accepted' && req.user.filemanager === "accepted") {
        return res.redirect("/design/requests");
      } else if (req.user.printer === 'accepted' && req.user.filemanager === "accepted") {
        return res.redirect("/printing/requests");
      }
    });
    app.get('/profile/onprint', decorators.loginRequired, function(req, res) {
      return models.STLProject.find({
        user: req.user._id,
        status: {
          "$lt": models.PROJECT_STATUSES.ARCHIVED[0],
          "$gt": models.PROJECT_STATUSES.PRINT_REQUESTED[0]
        }
      }).sort({
        createdAt: -1
      }).exec().then(function(docs) {
        return res.render('core/profile/list_projects', {
          projects: docs,
          printingProjects: [],
          designProjects: []
        });
      }).fail(function() {
        console.log(arguments);
        return res.send(500);
      });
    });
    app.get('/profile/archived', decorators.loginRequired, function(req, res) {
      return models.STLProject.find({
        user: req.user._id,
        status: models.PROJECT_STATUSES.ARCHIVED[0]
      }).sort({
        createdAt: -1
      }).exec().then(function(printings) {
        return designModels.STLDesign.find({
          'creator': req.user.id,
          status: {
            "$lt": designModels.DESIGN_STATUSES.ARCHIVED[0]
          }
        }).exec().then(function(design) {
          return res.render('core/profile/list_projects', {
            printingProjects: printings,
            designProjects: design,
            projects: []
          });
        });
      }).fail(function() {
        console.log(arguments);
        return res.send(500);
      });
    });
    app.get('/profile/settings', decorators.loginRequired, function(req, res) {
      return res.render('core/profile/settings', {
        errors: {}
      });
    });
    app.get('/profile/notifications', decorators.loginRequired, function(req, res) {
      return res.render('core/profile/notifications');
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
      if (req.body.mailNotification === 'on') {
        req.user.mailNotification = true;
      } else {
        req.user.mailNotification = false;
      }
      return req.user.save(function(error, user) {
        if (error) {
          console.log(arguments);
        }
        return res.render('core/profile/settings');
      });
    });
    requestShippingRate = function(address, project) {
      return auth.User.findOne({
        _id: project.order.printer
      }).exec().then(function(printer) {
        var data, shipping;
        if (printer) {
          shipping = function(shipping) {
            return shippo.shipment.rates(shipping.object_id, 'EUR').then(function(rates) {
              var price, price_tmp, rate, rate_tmp, _i, _len, _ref;
              if (rates.count && rates.count > 0) {
                rate = null;
                price = 9999999999.0;
                _ref = rates.results;
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                  rate_tmp = _ref[_i];
                  price_tmp = parseFloat(rate_tmp.amount_local);
                  if (rate_tmp.object_purpose === "PURCHASE" && rate_tmp.currency === 'EUR' && price > price_tmp && price_tmp > 0) {
                    rate = rate_tmp;
                    price = price_tmp;
                  }
                }
                if (rate) {
                  return project.update({
                    'order.rate': rate
                  }, function() {
                    console.log(project.title + ": " + rate);
                  });
                }
              }
            });
          };
          if (printer.printerAddress) {
            if (project.order.shipping && project.order.shipping.address_to === address.object_id) {
              logger.debug("Parcel already created");
              console.log("Creating new Shipping for new rates!");
              var data = {};
              var submission_date;
              data['order.parcel'] = parcel;
              submission_date = Date().today().next().friday();
              shippo.shipment.create({
                object_purpose: "PURCHASE",
                address_from: printer.printerAddress.object_id,
                address_to: address.object_id,
                parcel: parcel.object_id,
                submission_type: 'DROPOFF',
                submission_date: submission_date
              }).then(function(shipping_tmp) {
                data['order.shipping'] = shipping_tmp;
                console.log("New shipping created");
                project.update(data, function(error) {
                  if (error) {
                    console.log("Shipping not update!");
                    return console.log(arguments);
                  }
                });
                return shipping(shipping_tmp);
              });
            } else {
              data = {};
              return shippo.parcel.create({
                length: project.dimension.length > 10 ? decimal.fromNumber(project.dimension.length, 4).toString() : 10,
                width: project.dimension.width > 10 ? decimal.fromNumber(project.dimension.width, 4).toString() : 10,
                height: project.dimension.height > 10 ? decimal.fromNumber(project.dimension.height, 4).toString() : 10,
                distance_unit: project.unit,
                weight: decimal.fromNumber(project.weight, 4).toString(),
                mass_unit: 'g'
              }).then(function(parcel) {
                var submission_date;
                data['order.parcel'] = parcel;
                submission_date = new Date();
                submission_date.setDate(submission_date.getDate() + 2);
                return shippo.shipment.create({
                  object_purpose: "PURCHASE",
                  address_from: printer.printerAddress.object_id,
                  address_to: address.object_id,
                  parcel: parcel.object_id,
                  submission_type: 'DROPOFF',
                  submission_date: submission_date
                });
              }).then(function(shipping_tmp) {
                data['order.shipping'] = shipping_tmp;
                project.update(data, function(error) {
                  if (error) {
                    return console.log(arguments);
                  }
                });
                return shipping(shipping_tmp);
              });
            }
          }
        } else {
          return logger.warning("printer " + printer + " do not exists");
        }
      }).fail(function(reason) {
        return console.log(arguments);
      });
    };
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
          console.log(arguments);
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
        if (req.user.shippingAddresses.length === 0) {
          address.active = true;
        }
        req.user.shippingAddresses.push(address);
        req.user.save(function(error, doc) {
          if (error) {
            return console.log(arguments);
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
    app.post('/profile/settings/activate-shipping-direction/:id', decorators.loginRequired, function(req, res) {
      var address, _i, _len, _ref;
      _ref = req.user.shippingAddresses;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        address = _ref[_i];
        if (address._id.equals(req.params.id)) {
          address.active = true;
        } else {
          address.active = false;
        }
      }
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
          console.log(arguments);
          return res.send(500);
        });
      }
    });
    /*app.post('/project/color/:id', decorators.loginRequired, function(req, res) {
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
          console.log(arguments);
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
          console.log(arguments);
          return res.send(500);
        });
      }
    });
    app.post('/project/material/:id', decorators.loginRequired, function(req, res) {
      var value;
      value = req.body.value === models.PROJECT_MATERIALS.ANY[1] ? 'ANY' : req.body.value;
      if (!(value in models.PROJECT_MATERIALS)) {
        return res.send(400);
      } else {
        return models.STLProject.findOne({
          _id: req.params.id,
          editable: true
        }).exec().then(function(doc) {
          var cloned;
          if (doc) {
            doc.density = models.PROJECT_MATERIALS[value][0];
            doc.material = value;
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
          console.log(arguments);
          return res.send(500);
        });
      }
    }); */
    app.get('/project/update/:id', decorators.loginRequired, function(req, res) {
      return models.STLProject.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        if (doc) {
          return shippo.transaction.retrieve(doc.order.transaction.object_id).then(function(data) {
            return doc.update({
              'order.transaction': data
            }, function() {
              return res.redirect("/project/" + req.params.id);
            });
          });
        } else {
          return res.send(404);
        }
      }).fail(function() {
        console.log(arguments);
        return res.send(500);
      });
    });
    app.post('/project/order/:id', decorators.loginRequired, function(req, res, next) {
      var address, _address, _i, _len, _ref;
      address = null;
      _ref = req.user.shippingAddresses;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        _address = _ref[_i];
        if (_address.active) {
          address = _address;
        }
      }
      if (address == null) {
        res.redirect("/project/" + req.params.id + "?msg=You don't have an active address, add and/or activate one it before order.");
        return;
      }
      return models.STLProject.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        var ammount, price, printerPayment, taxes, total_price;
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_REQUESTED[0])) {
          ammount = Math.abs(req.body.ammount && parseInt(req.body.ammount) ? parseInt(req.body.ammount) : 1);
          total_price = calculateOrderPrice(doc.price, ammount);
          taxes = decimal.fromNumber(total_price * 0.0522, 2);
          price = decimal.fromNumber(total_price - taxes, 2);
          printerPayment = decimal.fromNumber(price * 0.7105, 2);
          doc.status = models.PROJECT_STATUSES.PRINT_REQUESTED[0];
          doc.order = {
            ammount: ammount,
            price: price.toString(),
            totalPrice: total_price.toString(),
            taxes: taxes.toString(),
            printerPayment: printerPayment.toString(),
            businessPayment: decimal.fromNumber(price - printerPayment, 2).toString(),
            placedAt: new Date()
          };
          if (req.body.printer && req.body.printer.match(/^[0-9a-fA-F]{24}$/)) {
            auth.User.findOne({
              _id: req.body.printer
            }).exec().then(function(printer) {
              if (printer) {
                doc.order.printer = req.body.printer;
                doc.status = models.PROJECT_STATUSES.PRINT_REVIEW[0];
                doc.order.reviewStartAt = new Date();
                if (printer.mailNotification) {
                  mailer.send('mailer/project/offer', {
                    project: doc,
                    user: printer,
                    site: settings.site
                  }, {
                    from: settings.mailer.noReply,
                    to: [printer.email],
                    subject: settings.project.status.subject
                  });
                }
              }
              return doc.save();
            }).fail(function() {
              return doc.save();
            });
          } else {
            doc.save();
            auth.User.find({
              printer: 'accepted'
            }).exec().then(function(docs) {
              var user, _j, _len1, _results;
              if (docs.length) {
                utils.sendNotification(io, docs, "Project <a href='/project/" + doc.id + "'>" + doc.title + "</a> is waiting for you.", 'New project', 'info');
                _results = [];
                for (_j = 0, _len1 = docs.length; _j < _len1; _j++) {
                  user = docs[_j];
                  if (user.mailNotification) {
                    _results.push(mailer.send('mailer/project/status', {
                      project: doc,
                      user: user,
                      site: settings.site
                    }, {
                      from: settings.mailer.noReply,
                      to: [user.email],
                      subject: settings.project.status.subject
                    }));
                  } else {
                    _results.push(void 0);
                  }
                }
                return _results;
              }
            });
          }
        }
        return res.redirect("/project/" + req.params.id);
      }).fail(function() {
        console.log(arguments);
        return res.send(500);
      });
    });
    app.post('/project/delete/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        status: {
          $lt: models.PROJECT_STATUSES.PRINTING[0]
        }
      }).remove().exec().then(function(doc) {
        return res.redirect("/profile/projects");
      }).fail(function() {
        console.log(arguments);
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
        var comment, recipient;
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
            recipient = req.user._id.equals(doc.user) ? doc.order.printer : doc.user;
            notificationModels.Notification.find({
              recipient: recipient,
              relatedObject: doc.id,
              type: 1,
              read: false
            }).exec().then(function(notifications) {
              var notification;
              if (!notifications.length) {
                notification = new notificationModels.Notification({
                  relatedObject: doc.id,
                  read: false,
                  type: 1,
                  deleted: false,
                  recipient: recipient,
                  creator: req.user.id,
                  title: "New message on project " + doc.title
                });
                notification.save();
                return auth.User.findOne({
                  _id: recipient
                }).exec().then(function(recipient) {
                  var context;
                  if (recipient) {
                    context = {
                      user: recipient,
                      site: settings.site,
                      project: doc
                    };
                    return mailer.send('mailer/project/commented', context, {
                      from: settings.mailer.noReply,
                      to: [recipient.email],
                      subject: "New comment on project"
                    });
                  }
                });
              }
            });
            doc.save();
            res.json(comment, 200);
            return auth.User.where('_id')["in"]([req.user.id, doc.order.printer]).exec().then(function(docs) {
              if (docs.length) {
                return utils.sendNotification(io, docs, "Project <a href='/project/" + doc.id + "'>" + doc.title + "</a> has new comment.", 'New Comment', 'info');
              }
            });
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
        console.log(arguments);
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
          businessPayment = parseFloat(doc.order.totalPrice);
          if (!doc.order.rate) {
            res.redirect("/project/" + doc._id + "?msg=Your project doesn't have a rate, please wait while we are collecting it.");
            return;
          }
          businessPayment = decimal.fromNumber(businessPayment + parseFloat(doc.order.rate.amount), 2).toString();
          businessPayment = parseFloat(businessPayment);
          req.session.deliveryMethod = 'shipping';
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
                actionType: 'PAY_PRIMARY',
                payKeyDuration: 'P29D',
                currencyCode: 'EUR',
                feesPayer: 'EACHRECEIVER',
                memo: 'Payment for 3D printing in 3doers',
                returnUrl: "" + settings.site + "/project/pay/execute/" + doc.id,
                cancelUrl: "" + settings.site + "/project/pay/cancel/" + doc.id,
                receiverList: {
                  receiver: [
                    {
                      email: settings.paypal.primaryReceiver,
                      amount: businessPayment,
                      primary: 'true'
                    }, {
                      email: user.paypal.email,
                      amount: printerPayment,
                      primary: 'false'
                    }
                  ]
                }
              };
              return paypalSdk.pay(payload, function(err, response) {
                if (err) {
                  console.log(response.error);
                  return res.send(500);
                } else {
                  return doc.update({
                    'order.payKey': response.payKey,
                    'order.secundaryPaid': false
                  }, function(error) {
                    if (error) {
                      console.log(error);
                      return console.log(arguments);
                    } else {
                      return res.redirect(response.paymentApprovalUrl);
                    }
                  });
                }
              });
            }
          });
        } else {
          return res.send(400);
        }
      }).fail(function(reason) {
        console.log(arguments);
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
          return auth.User.findOne({
            _id: doc.order.printer
          }).exec(function(err, user) {
            var updatedData;
            if (err) {
              console.log(arguments);
              return res.send(500);
            } else {
              updatedData = {
                status: models.PROJECT_STATUSES.PRINTING[0],
                'order.deliveryMethod': req.session.deliveryMethod,
                'order.printingStartedAt': new Date()
              };
              return doc.update(updatedData, function(error) {
                if (!error) {
                  utils.sendNotification(io, [user, req.user], "Project <a href='/project/" + doc.id + "'>" + doc.title + "</a> was paid.", 'Change Status', 'info');
                  mailer.send('mailer/project/status', {
                    project: doc,
                    user: req.user,
                    site: settings.site
                  }, {
                    from: settings.mailer.noReply,
                    to: [req.user.email],
                    subject: settings.project.status.subject
                  });
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
        console.log(arguments);
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
        console.log(arguments);
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
        res.redirect("/project/" + req.params.id);
        return auth.User.where('_id')["in"]([req.user.id, doc.order.printer]).exec().then(function(docs) {
          var user, _i, _len, _results;
          if (docs.length) {
            utils.sendNotification(io, docs, "Project <a href='/project/" + doc.id + "'>" + doc.title + "</a> was archived.", 'Status changed', 'info');
            _results = [];
            for (_i = 0, _len = docs.length; _i < _len; _i++) {
              user = docs[_i];
              if (user.mailNotification) {
                _results.push(mailer.send('mailer/project/status', {
                  project: doc,
                  user: user,
                  site: settings.site
                }, {
                  from: settings.mailer.noReply,
                  to: [user.email],
                  subject: settings.project.status.subject
                }));
              } else {
                _results.push(void 0);
              }
            }
            return _results;
          }
        });
      }).fail(function() {
        console.log(arguments);
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
                  doc.save(function() {
                    return res.redirect("/project/" + req.params.id);
                  });
                } else {
                  shippo.transaction.create({
                    rate: doc.order.rate.object_id
                  }).then(function(transaction) {
                    doc.transaction = transaction;
                    return doc.update({
                      'order.transaction': transaction,
                      'status': models.PROJECT_STATUSES.PRINTED[0]
                    }, function() {
                      return res.redirect("/project/" + req.params.id);
                    });
                  });
                }
                return auth.User.where('_id')["in"]([req.user.id, doc.order.printer]).exec().then(function(docs) {
                  var user, _i, _len, _results;
                  if (docs.length) {
                    utils.sendNotification(io, docs, "Project <a href='/project/" + doc.id + "'>" + doc.title + "</a> was printed.", 'Status changed', 'info');
                    _results = [];
                    for (_i = 0, _len = docs.length; _i < _len; _i++) {
                      user = docs[_i];
                      if (user.mailNotification) {
                        _results.push(mailer.send('mailer/project/status', {
                          project: doc,
                          user: user,
                          site: settings.site
                        }, {
                          from: settings.mailer.noReply,
                          to: [user.email],
                          subject: settings.project.status.subject
                        }));
                      } else {
                        _results.push(void 0);
                      }
                    }
                    return _results;
                  }
                });
              } else {
                return res.send("Printer doesn't have address, please contact support or printer to add address.");
              }
            } else {
              logger.warning("printer " + printer + " do not exists");
              return res.send("Printer don't exists, please contact support");
            }
          }).fail(function() {
            console.log(arguments);
            return res.send(500);
          });
        } else {
          return res.redirect("/project/" + req.params.id);
        }
      }).fail(function() {
        console.log(arguments);
        return res.send(500);
      });
    });
    app.post('/project/shipping-address/:id', decorators.loginRequired, function(req, res, next) {
      return models.STLProject.findOne({
        _id: req.params.id,
        user: req.user.id
      }).exec().then(function(doc) {}).fail(function() {
        console.log(arguments);
        return res.send(500);
      });
    });
    app.get('/printing/requests', decorators.printerRequired, function(req, res) {
      return models.STLProject.find({
        status: {
          "$lt": models.PROJECT_STATUSES.SHIPPING[0],
          "$gt": models.PROJECT_STATUSES.PRINT_REQUESTED[0]
        },
        'order.printer': req.user.id
      }).sort({
        placedAt: -1
      }).exec(function(err, docs) {
        var printerJobs;
        if (err) {
          console.log(arguments);
          return res.send(500);
        } else {
          printerJobs = req.user.printerJobs || 1;
          return models.STLProject.find({
            status: models.PROJECT_STATUSES.PRINT_REQUESTED[0],
            user: {
              $ne: req.user.id
            }
          }).exec(function(err, available) {
            if (err) {
              console.log(arguments);
              return res.send(500);
            } else {
              if (docs && docs.length > printerJobs) {
                return res.render('core/printing/requests', {
                  projects: available,
                  toApply: false
                });
              } else {
                return res.render('core/printing/requests', {
                  projects: available,
                  toApply: true
                });
              }
            }
          });
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
      }).sort({
        createdAt: -1
      }).exec(function(err, docs) {
        if (err) {
          console.log(arguments);
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
      }).sort({
        createdAt: -1
      }).exec().then(function(printings) {
        return designModels.STLDesign.find({
          'creator': req.user.id,
          status: designModels.DESIGN_STATUSES.ARCHIVED[0]
        }).exec().then(function(design) {
          return res.render('core/printing/archived', {
            printingProjects: printings,
            designProjects: design
          });
        });
      }).fail(function(reason) {
        console.log(reason);
        console.log(arguments);
        return res.send(500);
      });
    });
    app.post('/printing/review/:id', decorators.printerRequired, function(req, res) {
      return models.STLProject.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_REVIEW[0])) {
          return auth.User.findOne({
            _id: doc.user
          }).exec(function(err, user) {
            if (user) {
              if (user.mailNotification) {
                mailer.send('mailer/printing/accept', {
                  project: doc,
                  user: user,
                  site: settings.site
                }, {
                  from: settings.mailer.noReply,
                  to: [user.email],
                  subject: settings.printing.accept.subject
                });
              }
              doc.status = models.PROJECT_STATUSES.PRINT_REVIEW[0];
              doc.order = {
                printer: req.user.id,
                ammount: doc.order.ammount,
                price: doc.order.price,
                totalPrice: doc.order.totalPrice,
                taxes: doc.order.taxes,
                printerPayment: doc.order.printerPayment,
                businessPayment: doc.order.businessPayment,
                placedAt: doc.order.placedAt,
                reviewStartAt: new Date
              };
              doc.save();
              res.json({
                msg: "Accepted"
              });
              return auth.User.where('_id')["in"]([req.user.id, user.id]).exec().then(function(docs) {
                if (docs.length) {
                  return utils.sendNotification(io, docs, "Project <a href='/project/" + doc.id + "'>" + doc.title + "</a> is being reviewed.", 'Status changed', 'info');
                }
              });
            }
          });
        } else {
          return res.json({
            msg: "Looks like someone accepted, try with another"
          }, 400);
        }
      }).fail(function() {
        console.log(arguments);
        return res.send(500);
      });
    });
    app.post('/printing/accept/:id', decorators.printerRequired, function(req, res) {
      return models.STLProject.findOne({
        _id: req.params.id
      }).exec().then(function(doc) {
        if (doc && doc.validateNextStatus(models.PROJECT_STATUSES.PRINT_ACCEPTED[0])) {
          return auth.User.findOne({
            _id: doc.user
          }).exec(function(err, user) {
            var address, _address, _i, _len, _ref;
            if (user) {
              address = null;
              _ref = user.shippingAddresses;
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                _address = _ref[_i];
                if (_address.active) {
                  address = _address;
                }
              }
              if (address == null) {
                res.json({
                  msg: "User doesn't have a shipping address please ask him to add an address and activate it."
                }, 400);
                return;
              }
              if (!(req.user.printerAddress && req.user.printerAddress.object_id)) {
                res.json({
                  msg: "You don't have a shipping address please add an address."
                }, 400);
                return;
              }
              if (!(req.user.paypal && req.user.paypal.email)) {
                res.json({
                  msg: "You don't have a valid paypal account, please go to settings and setup"
                }, 400);
                return;
              }
              if (user.mailNotification) {
                mailer.send('mailer/printing/accept', {
                  project: doc,
                  user: user,
                  site: settings.site
                }, {
                  from: settings.mailer.noReply,
                  to: [user.email],
                  subject: settings.printing.accept.subject
                });
              }
              doc.status = models.PROJECT_STATUSES.PRINT_ACCEPTED[0];
              return doc.save(function(error, project) {
                if (!error) {
                  res.json({
                    msg: "Accepted"
                  });
                  requestShippingRate(address, doc);
                  return auth.User.where('_id')["in"]([req.user.id, user.id]).exec().then(function(docs) {
                    var _j, _len1, _results;
                    if (docs.length) {
                      utils.sendNotification(io, docs, "Project <a href='/project/" + doc.id + "'>" + doc.title + "</a> was accepted.", 'Status changed', 'info');
                      _results = [];
                      for (_j = 0, _len1 = docs.length; _j < _len1; _j++) {
                        user = docs[_j];
                        if (user.mailNotification) {
                          _results.push(mailer.send('mailer/project/status', {
                            project: doc,
                            user: user,
                            site: settings.site
                          }, {
                            from: settings.mailer.noReply,
                            to: [user.email],
                            subject: settings.project.status.subject
                          }));
                        } else {
                          _results.push(void 0);
                        }
                      }
                      return _results;
                    }
                  });
                } else {
                  return res.json("error saving project, please try again.");
                }
              });
            }
          });
        } else {
          return res.json({
            msg: "Looks like someone accepted, try with another"
          }, 400);
        }
      }).fail(function() {
        console.log(arguments);
        return res.send(500);
      });
    });
    app.post('/');
    app.post('/paypal/verify', decorators.printerRequired, function(req, res) {
      var errors, payload, paypalSdk;
      req.assert('email', 'valid email required').isEmail();
      req.assert('firstName', 'First name is required').notEmpty();
      req.assert('lastName', 'Last name is required').notEmpty();
      errors = req.validationErrors();
      if (errors) {
        res.redirect("/profile/settings?msg=" + errors[0]['msg']);
        return;
      }
      paypalSdk = new Paypal({
        userId: settings.paypal.adaptive.user,
        password: settings.paypal.adaptive.password,
        signature: settings.paypal.adaptive.signature,
        appId: settings.paypal.adaptive.appId,
        sandbox: settings.paypal.adaptive.debug
      });
      payload = {
        emailAddress: req.body.email,
        matchCriteria: 'NAME',
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        requestEnvelope: {
          errorLanguage: 'en_US'
        }
      };
      return paypalSdk.getVerifiedStatus(payload, function(message, response) {
        if (response.error) {
          return res.redirect("/profile/settings?msg=" + response.error[0].message);
        } else {
          if (response.accountStatus != null) {
            req.user.paypal.email = req.body.email;
            req.user.paypal.firstName = req.body.firstName;
            req.user.paypal.lastName = req.body.lastName;
            return req.user.save(function(error, doc) {
              return res.redirect("/profile/settings?msg=Email was validated");
            });
          } else {
            return res.redirect("/profile/settings?msg=Your account is not verified");
          }
        }
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
          auth.User.where('_id')["in"]([doc.user]).exec().then(function(docs) {
            if (docs.length) {
              return utils.sendNotification(io, docs, "Project <a href='/project/" + doc.id + "'>" + doc.title + "</a> is denied.", 'Status changed', 'info');
            }
          });
        }
        if (doc && doc.status === models.PROJECT_STATUSES.PRINT_ACCEPTED[0]) {
          return res.json({
            msg: "Looks like someone accepted, try with another"
          }, 400);
        }
      }).fail(function() {
        console.log(arguments);
        return res.send(500);
      });
    });
    app.get('/admin/project/archive/:id', decorators.loginRequired, function(req, res) {
      if (!req.user.admin) {
        res.send(503);
        return;
      }
      return models.STLProject.findOne({
        _id: req.params.id,
        status: models.PROJECT_STATUSES.PRINTED[0]
      }).exec().then(function(doc) {
        if (!doc) {
          res.send(404);
          return;
        }
        doc.status = models.PROJECT_STATUSES.ARCHIVED[0];
        return doc.save(function() {
          return res.redirect('/admin/projects');
        });
      });
    });
    app.get('/admin/project/release-payment/:id', decorators.loginRequired, function(req, res) {
      if (!req.user.admin) {
        res.send(503);
        return;
      }
      return models.STLProject.findOne({
        _id: req.params.id,
        $or: [
          {
            'order.secundaryPaid': false
          }, {
            'order.secundaryPaid': null
          }
        ],
        status: models.PROJECT_STATUSES.PRINTED[0]
      }).exec().then(function(doc) {
        var payload, paypalSdk;
        if (!doc) {
          res.send(404);
          return;
        }
        paypalSdk = new Paypal({
          userId: settings.paypal.adaptive.user,
          password: settings.paypal.adaptive.password,
          signature: settings.paypal.adaptive.signature,
          appId: settings.paypal.adaptive.appId,
          sandbox: settings.paypal.adaptive.debug
        });
        payload = {
          payKey: doc.order.payKey,
          requestEnvelope: {
            errorLanguage: 'en_US'
          }
        };
        return paypalSdk.executePayment(payload, function(message, response) {
          console.log("payment executed");
          if (response.error) {
            console.log(response.error);
          } else {
            doc.update({
              'order.secundaryPaid': true
            });
          }
          return res.redirect('/admin/projects');
        });
      }).fail(function() {
        console.log(arguments);
        return res.redirect('/admin/projects');
      });
    });
    app.all('/goshippo-webhook/', function(req, res) {
      if (req.body.object_id) {
        return models.STLProject.findOne({
          'order.transaction.object_id': req.body.object_id
        }).exec().then(function(doc) {
          var data, payload, paypalSdk;
          console.log("******************** GoShippo **********************");
          console.log(typeof req.body);
          console.log(req.body);
          console.log("******************** GoShippo **********************");
          if (doc) {
            data = {};
            data['order.transaction'] = req.body;
            if (typeof req.body.tracking_status === 'string') {
              req.body = JSON.parse(req.body);
            }
            if ((req.body.tracking_status != null) && req.body.tracking_status.status === "TRANSIT" && !doc.order.secundaryPaid) {
              data['order.secundaryPaid'] = true;
              console.log("Trying to pay");
              paypalSdk = new Paypal({
                userId: settings.paypal.adaptive.user,
                password: settings.paypal.adaptive.password,
                signature: settings.paypal.adaptive.signature,
                appId: settings.paypal.adaptive.appId,
                sandbox: settings.paypal.adaptive.debug
              });
              payload = {
                payKey: doc.order.payKey,
                requestEnvelope: {
                  errorLanguage: 'en_US'
                }
              };
              paypalSdk.executePayment(payload, function() {
                console.log("payment exec uted");
                return console.log(arguments);
              });
            }
            if ((req.body.tracking_status != null) && req.body.tracking_status.status === "DELIVERED") {
              data['status'] = models.PROJECT_STATUSES.ARCHIVED[0];
            }
            return doc.update(data, function(error) {
              if (error) {
                console.log(error);
                return console.log(arguments);
              } else {
                return res.send(200);
              }
            });
          } else {
            return res.send(404);
          }
        }).fail(function() {
          console.log(arguments);
          return res.send(500);
        });
      } else {
        return res.send(400);
      }
    });
    app.post('/cron/update-rates', function(req, res) {
      var current, query;
      current = new Date();
      query = {
        'order.reviewStartAt': {
          $lt: new Date(current.getTime() - 86400000)
        },
        status: {
          $lt: models.PROJECT_STATUSES.PAYED[0]
        }
      };
      models.STLProject.find(query).update({
        $set: {
          comments: [],
          status: models.PROJECT_STATUSES.PRINT_REQUESTED[0]
        }
      });
      return models.STLProject.find({
        status: models.PROJECT_STATUSES.PRINT_ACCEPTED[0],
        'order.rate': {
          "$exists": false
        }
      }).exec().then(function(docs) {
        var project, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = docs.length; _i < _len; _i++) {
          project = docs[_i];
          console.log("Processing project id " + project.id);
          _results.push(auth.User.findOne({
            _id: project.user
          }).exec().then(function(user) {
            var address, _address, _j, _len1, _ref;
            address = null;
            _ref = user.shippingAddresses;
            for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
              _address = _ref[_j];
              if (_address.active) {
                address = _address;
              }
            }
            if (address != null) {
              return requestShippingRate(address, project);
            } else {
              return console.log("Project id " + project._id + " has not address.");
            }
          }));
        }
        return _results;
      });
    });
    app.post('/cron/update-printing-rates', function(req, res) {
      var current, query;
      current = new Date();
      query = {
        $or: [
          {
            'order.printingStartedAt': {
              $lt: new Date(current.getTime() - 86400000 * 6)
            },
            'order.rateLastUpdate': {
              $lt: new Date(current.getTime() - 86400000 * 6)
            }
          }, {
            'order.printingStartedAt': {
              $lt: new Date(current.getTime() - 86400000 * 6)
            },
            'order.rateLastUpdate': {
              $exists: false
            }
          }
        ],
        'order.rate': {
          "$exists": true
        },
        status: models.PROJECT_STATUSES.PRINTING[0]
      };
      models.STLProject.find(query).exec().then(function(docs) {
        var project, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = docs.length; _i < _len; _i++) {
          project = docs[_i];
          auth.User.findOne({
            _id: project.user
          }).exec().then(function(user) {
            var address, _address, _j, _len1, _ref;
            address = null;
            _ref = user.shippingAddresses;
            for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
              _address = _ref[_j];
              if (_address.active) {
                address = _address;
              }
            }
            if (address != null) {
              return requestShippingRate(address, project);
            }
          });
          _results.push(project.update({
            'order.rateLastUpdate': current
          }));
        }
        return _results;
      });
      return res.send(200);
    });
    app.post('/cron/delete-unused-projects', function(req, res) {
      var current;
      current = new Date;
      models.STLProject.find({
        'status': models.PROJECT_STATUSES.PROCESSED[0],
        'startedAt': {
          $lt: new Date(current.getTime() - 86400000 * 7)
        }
      }).exec().then(function(docs) {
        var doc, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = docs.length; _i < _len; _i++) {
          doc = docs[_i];
          _results.push(fs.unlink(settings.upload.to + docs.file));
        }
        return _results;
      }).fail(function() {
        return console.log(arguments);
      });
      return res.send(200);
    });
    app.get('/admin/projects', decorators.loginRequired, function(req, res) {
      var limit, page, skip;
      if (!req.user.admin) {
        res.send(403);
        return;
      }
      page = parseInt(req.query.page || 1);
      limit = parseInt(req.query.limit ||  10);
      page = page > 0 ? page : 1;
      limit = limit > 1 ? limit : 10;
      skip = (page - 1) * limit;
      return models.STLProject.find({
        status: models.PROJECT_STATUSES.PRINTED[0]
      }).count().exec().then(function(count) {
        return models.STLProject.find({
          status: models.PROJECT_STATUSES.PRINTED[0]
        }, null, {
          skip: skip,
          limit: limit
        }).exec().then(function(projects) {
          var pagination;
          pagination = {
            hasPrev: page > 1,
            hasNext: (skip + projects.length) < count,
            page: page,
            pages: Math.floor(count % limit === 0 ? count / limit : (count / limit) + 1)
          };
          return res.render('admin/projects/list', {
            projects: projects,
            pagination: pagination
          });
        });
      }).fail(function() {
        console.log(arguments);
        return res.send(500);
      });
    });
    app.get('/robots.txt', function(req, res) {
      res.set('Content-Type', 'text/plain');
      return res.send('User-agent: *\nDisallow: /docs/pp.pdf\nDisallow: /docs/terms.pdf\nSitemap: /sitemap.xml');
    });
    app.get('/sitemap.xml', function(req, res) {
      return res.render('sitemap.xml');
    });
    io.of('/project').on('connection', function(socket) {
      if (socket.handshake.query.project != null) {
        return models.STLProject.findOne({
          _id: socket.handshake.query.project
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
              return models.STLProject.findOne({
                _id: doc._id
              }).exec().then(function(doc) {
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
    io.of('/notification').on('connection', function(socket) {
      if (socket.handshake.query.user != null) {
        return auth.User.findOne({
          _id: socket.handshake.query.user
        }).exec().then(function(doc) {
          if (doc) {
            return socket.join("notification-" + (doc._id.toHexString()));
          }
        }).fail(function(reason) {
          console.log(arguments);
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
      return exec("" + nconf.get('python:bin') + " " + nconf.get('python:path') + " " + nconf.get('media:upload:to') + doc.file + " -d " + doc.density, function(err, stdout, stderr) {
        var cloned, density, e, fixed_cost, material_price, p_vi, p_vs, pb, price, result, v_i, v_s;
        if (!err && !stderr) {
          try {
            result = JSON.parse(stdout);
            material_price = 0.5;
            density = 1.01;
            fixed_cost = 10;
            v_s = result.surface / 100 * 0.09;
            p_vs = v_s * density * material_price;
            v_i = result.volume - v_s;
            p_vi = v_i * 0.20 * material_price;
            pb = (p_vs + p_vi) * 0.9;
            price = pb + fixed_cost;
            doc.volume = result.volume;
            doc.weight = result.weight;
            doc.unit = result.unit;
            doc.dimension = result.dimension;
            doc.price = decimal.fromNumber(price, 2);
            doc.surface = result.surface / 100;
            doc.bad = false;
            if (result.dimension.width > models.PROJECT_BOUNDARIES.WIDTH[0]) {
              doc.checkWidth = false;
            }
            if (result.dimension.length > models.PROJECT_BOUNDARIES.LENGTH[0]) {
              doc.checkLenght = false;
            }
            if (result.dimension.height > models.PROJECT_BOUNDARIES.HEIGHT[0]) {
              doc.checkHeight = false;
            }
            if (doc.status < models.PROJECT_STATUSES.PROCESSED[0]) {
              doc.status = models.PROJECT_STATUSES.PROCESSED[0];
            }
            doc.save();
          } catch (_error) {
            e = _error;
            console.log(arguments);
            doc.bad = true;
            doc.save();
          }
        } else {
          doc.bad = true;
          doc.save();
          console.log(arguments);
        }
        cloned = utils.cloneObject(doc._doc);
        cloned.status = doc.humanizedStatus();
        return io.of('/project')["in"](doc._id.toHexString()).emit('update', cloned);
      });
    };
    return calculateOrderPrice = function(basePrice, ammount) {
      basePrice = parseFloat(basePrice);
      return decimal.fromNumber((basePrice * ammount) - (10 * (ammount - 1)), 2);
    };
  };

}).call(this);
