(function() {
  var Address, EuropeCountries, ObjectId, Schema, User, crypto, mongoose;

  mongoose = require('mongoose');

  crypto = require('crypto');

  module.exports.EuropeCountries = EuropeCountries = [
    {
      abbr: "AD",
      name: "Andorra",
      ioc: "AND"
    }, {
      abbr: "AL",
      name: "Albania",
      ioc: "ALB"
    }, {
      abbr: "AM",
      name: "Armenia",
      ioc: "ARM"
    }, {
      abbr: "AT",
      name: "Austria",
      ioc: "AUT"
    }, {
      abbr: "AZ",
      name: "Azerbaijan",
      ioc: "AZE"
    }, {
      abbr: "BA",
      name: "Bosnia and Herzegovina",
      ioc: "BIH"
    }, {
      abbr: "BE",
      name: "Belgium",
      ioc: "BEL"
    }, {
      abbr: "BG",
      name: "Bulgaria",
      ioc: "BUL"
    }, {
      abbr: "BY",
      name: "Belarus",
      ioc: "BLR"
    }, {
      abbr: "CH",
      name: "Switzerland",
      ioc: "SUI"
    }, {
      abbr: "CY",
      name: "Cyprus",
      ioc: "CYP"
    }, {
      abbr: "CZ",
      name: "Czech Republic",
      ioc: "CZE"
    }, {
      abbr: "DE",
      name: "Germany",
      ioc: "GER"
    }, {
      abbr: "DK",
      name: "Denmark",
      ioc: "DEN"
    }, {
      abbr: "EE",
      name: "Estonia",
      ioc: "EST"
    }, {
      abbr: "ES",
      name: "Spain",
      ioc: "ESP"
    }, {
      abbr: "FI",
      name: "Finland",
      ioc: "FIN"
    }, {
      abbr: "FR",
      name: "France",
      ioc: "FRA"
    }, {
      abbr: "GE",
      name: "Georgia",
      ioc: "GEO"
    }, {
      abbr: "GR",
      name: "Greece",
      ioc: "GRE"
    }, {
      abbr: "HU",
      name: "Hungary",
      ioc: "HUN"
    }, {
      abbr: "IE",
      name: "Ireland",
      ioc: "IRL"
    }, {
      abbr: "IS",
      name: "Iceland",
      ioc: "ISL"
    }, {
      abbr: "IT",
      name: "Italy",
      ioc: "ITA"
    }, {
      abbr: "LI",
      name: "Liechtenstein",
      ioc: "LIE"
    }, {
      abbr: "LT",
      name: "Lithuania",
      ioc: "LTU"
    }, {
      abbr: "LU",
      name: "Luxembourg",
      ioc: "LUX"
    }, {
      abbr: "LV",
      name: "Latvia",
      ioc: "LAT"
    }, {
      abbr: "MC",
      name: "Monaco",
      ioc: "MON"
    }, {
      abbr: "MD",
      name: "Moldova",
      ioc: "MDA"
    }, {
      abbr: "MK",
      name: "Macedonia",
      ioc: "MKD"
    }, {
      abbr: "MT",
      name: "Malta",
      ioc: "MLT"
    }, {
      abbr: "NL",
      name: "Netherlands",
      ioc: "NED"
    }, {
      abbr: "NO",
      name: "Norway",
      ioc: "NOR"
    }, {
      abbr: "PL",
      name: "Poland",
      ioc: "POL"
    }, {
      abbr: "PT",
      name: "Portugal",
      ioc: "POR"
    }, {
      abbr: "RO",
      name: "Romania",
      ioc: "ROU"
    }, {
      abbr: "SE",
      name: "Sweden",
      ioc: "SWE"
    }, {
      abbr: "SI",
      name: "Slovenia",
      ioc: "SLO"
    }, {
      abbr: "SK",
      name: "Slovakia",
      ioc: "SVK"
    }, {
      abbr: "SM",
      name: "San Marino",
      ioc: "SMR"
    }, {
      abbr: "UA",
      name: "Ukraine",
      ioc: "UKR"
    }, {
      abbr: "UK",
      name: "United Kingdom",
      ioc: "GBR"
    }
  ];

  Schema = mongoose.Schema;

  ObjectId = Schema.ObjectId;

  Address = new Schema({
    contact: {
      type: String,
      required: false
    },
    company: {
      type: String,
      required: false
    },
    line1: {
      type: String,
      required: true
    },
    line2: {
      type: String
    },
    line3: {
      type: String
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zip_code: {
      type: String,
      required: true
    },
    phone_no: {
      type: String,
      required: true
    },
    country: {
      type: String
    }
  });

  User = new Schema({
    photo: {
      type: String,
      required: false
    },
    firstName: {
      type: String
    },
    lastName: {
      type: String
    },
    email: {
      type: String,
      required: true,
      index: {
        unique: true
      }
    },
    username: {
      type: String,
      required: true,
      index: {
        unique: true
      }
    },
    active: {
      type: Boolean,
      "default": false
    },
    city: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    hashedPassword: {
      type: String,
      required: true
    },
    salt: {
      type: String,
      required: true
    },
    location: {
      type: []
    },
    printer: {
      type: String
    },
    filemanager: {
      type: String
    },
    admin: {
      type: Boolean,
      "default": false
    },
    createAt: {
      type: Date,
      "default": Date.now
    },
    shippingAddresses: {
      type: [Address]
    },
    printerAddress: {
      type: Object
    },
    resetPasswordToken: {
      type: String
    },
    resetPasswordExpires: {
      type: Date
    }
  });

  User.index({
    loc: '2d'
  });

  User.virtual('password').set(function(password) {
    this.salt = this.makeSalt();
    return this.hashedPassword = this.encryptPassword(password);
  });

  User.virtual('resetPassword').set(function(flag) {
    var salt;
    if (flag) {
      salt = Math.round(new Date().valueOf() * Math.random()) + '';
      this.resetPasswordToken = crypto.createHmac('sha1', salt).update(this.email).digest('hex');
      return this.resetPasswordExpires = Date.now() + 3600000;
    } else {
      this.resetPasswordToken = void 0;
      return this.resetPasswordExpires = void 0;
    }
  });

  User.method('makeSalt', function() {
    return Math.round(new Date().valueOf() * Math.random()) + '';
  });

  User.method('encryptPassword', function(password) {
    return crypto.createHmac('sha1', this.salt).update(password).digest('hex');
  });

  User.method('authenticate', function(plainText) {
    return this.encryptPassword(plainText) === this.hashedPassword;
  });

  module.exports.User = mongoose.model('User', User);

  module.exports.User.schema.path('printer').validate(function(value) {
    if (value == null) {
      return true;
    }
    return /request|accepted|denied/i.test(value);
  }, 'Invalid Status');

}).call(this);
