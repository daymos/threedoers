mongoose = require 'mongoose'
crypto = require 'crypto'

module.exports.EuropeCountries = EuropeCountries = [
  {
    abbr: "AD"
    name: "Andorra"
    ioc: "AND"
  }
  {
    abbr: "AL"
    name: "Albania"
    ioc: "ALB"
  }
  {
    abbr: "AM"
    name: "Armenia"
    ioc: "ARM"
  }
  {
    abbr: "AT"
    name: "Austria"
    ioc: "AUT"
  }
  {
    abbr: "AZ"
    name: "Azerbaijan"
    ioc: "AZE"
  }
  {
    abbr: "BA"
    name: "Bosnia and Herzegovina"
    ioc: "BIH"
  }
  {
    abbr: "BE"
    name: "Belgium"
    ioc: "BEL"
  }
  {
    abbr: "BG"
    name: "Bulgaria"
    ioc: "BUL"
  }
  {
    abbr: "BY"
    name: "Belarus"
    ioc: "BLR"
  }
  {
    abbr: "CH"
    name: "Switzerland"
    ioc: "SUI"
  }
  {
    abbr: "CY"
    name: "Cyprus"
    ioc: "CYP"
  }
  {
    abbr: "CZ"
    name: "Czech Republic"
    ioc: "CZE"
  }
  {
    abbr: "DE"
    name: "Germany"
    ioc: "DEU"
  }
  {
    abbr: "DK"
    name: "Denmark"
    ioc: "DNK"
  }
  {
    abbr: "EE"
    name: "Estonia"
    ioc: "EST"
  }
  {
    abbr: "ES"
    name: "Spain"
    ioc: "ESP"
  }
  {
    abbr: "FI"
    name: "Finland"
    ioc: "FIN"
  }
  {
    abbr: "FR"
    name: "France"
    ioc: "FRA"
  }
  {
    abbr: "GE"
    name: "Georgia"
    ioc: "GEO"
  }
  {
    abbr: "GR"
    name: "Greece"
    ioc: "GRC"
  }
  {
    abbr: "HU"
    name: "Hungary"
    ioc: "HUN"
  }
  {
    abbr: "IE"
    name: "Ireland"
    ioc: "IRL"
  }
  {
    abbr: "IS"
    name: "Iceland"
    ioc: "ISL"
  }
  {
    abbr: "IT"
    name: "Italy"
    ioc: "ITA"
  }
  {
    abbr: "LI"
    name: "Liechtenstein"
    ioc: "LIE"
  }
  {
    abbr: "LT"
    name: "Lithuania"
    ioc: "LTU"
  }
  {
    abbr: "LU"
    name: "Luxembourg"
    ioc: "LUX"
  }
  {
    abbr: "LV"
    name: "Latvia"
    ioc: "LVA"
  }
  {
    abbr: "MC"
    name: "Monaco"
    ioc: "MCO"
  }
  {
    abbr: "MD"
    name: "Moldova"
    ioc: "MDA"
  }
  {
    abbr: "MK"
    name: "Macedonia"
    ioc: "MKD"
  }
  {
    abbr: "MT"
    name: "Malta"
    ioc: "MLT"
  }
  {
    abbr: "NL"
    name: "Netherlands"
    ioc: "NLD"
  }
  {
    abbr: "NO"
    name: "Norway"
    ioc: "NOR"
  }
  {
    abbr: "PL"
    name: "Poland"
    ioc: "POL"
  }
  {
    abbr: "PT"
    name: "Portugal"
    ioc: "PRT"
  }
  {
    abbr: "RO"
    name: "Romania"
    ioc: "ROM"
  }
  {
    abbr: "SE"
    name: "Sweden"
    ioc: "SWE"
  }
  {
    abbr: "SI"
    name: "Slovenia"
    ioc: "SVN"
  }
  {
    abbr: "SK"
    name: "Slovakia"
    ioc: "SVK"
  }
  {
    abbr: "SM"
    name: "San Marino"
    ioc: "SMR"
  }
  {
    abbr: "UA"
    name: "Ukraine"
    ioc: "UKR"
  }
  {
    abbr: "GB"
    name: "United Kingdom"
    ioc: "GBR"
  }
]

Schema = mongoose.Schema
ObjectId = Schema.ObjectId

Address = new Schema
  object_state:
    type: String
    required: false

  object_purpose:
    type: String
    required: false

  object_source:
    type: String
    required: false

  object_created:
    type: String
    required: false

  object_updated:
    type: String
    required: false

  object_id:
    type: String
    required: false

  object_owner:
    type: String
    required: false

  name:
    type: String
    required: false

  company:
    type: String
    required: false

  street1:
    type: String
    required: true

  street2:
    type: String

  street_no:
    type: String

  city:
    type: String
    required: true

  state:
    type: String
    required: true

  zip:
    type: String
    required: true

  phone:
    type: String
    required: true

  country:
    type: String

  email:
    type: String
    required: false

  ip:
    type: String
    required: false

  metadata:
    type: String
    required: false

  messages:
    type: []


User = new Schema

  photo:
    type: String
    required: false

  firstName:
    type: String

  lastName:
    type: String

  token:
    type:String

  email:
    type: String
    required: true
    index:
      unique: true

  username:
    type: String
    required: true
    index:
      unique: true

  active:
    type: Boolean
    default: false

  city:
    type: String
    required: true

  country:
    type: String
    required: true

  address:
    type: String
    required: true

  hashedPassword:
    type: String
    required: true

  salt:
    type: String
    required: true

  location:
    type: []
    # required: true

  printer:
    type: String

  printerJobs:
    type: Number
    default: 1

  filemanager:
    type: String

  admin:
    type: Boolean
    default: false

  createAt:
    type: Date
    default: Date.now

  shippingAddresses:
    type: [Address]

  printerAddress:
    type: Object

  resetPasswordToken:
    type: String

  resetPasswordExpires:
    type: Date


User.index loc: '2d'

User
  .virtual('password')
  .set (password) ->
    @salt = @makeSalt()
    @hashedPassword = @encryptPassword(password)


User
  .virtual('resetPassword')
  .set (flag) ->
    if flag
      salt = Math.round((new Date().valueOf() * Math.random())) + ''
      @resetPasswordToken = crypto.createHmac('sha1', salt).update(@email).digest('hex')
      @resetPasswordExpires = Date.now() + 3600000  # 1hour
    else
      @resetPasswordToken = undefined
      @resetPasswordExpires = undefined

User
  .method 'makeSalt', () ->
    Math.round((new Date().valueOf() * Math.random())) + ''


User
  .method 'encryptPassword', (password) ->
    crypto.createHmac('sha1', @salt).update(password).digest('hex')


User
  .method 'authenticate', (plainText) ->
    return @encryptPassword(plainText) == @hashedPassword


module.exports.User = mongoose.model 'User', User

module.exports.User.schema.path('printer').validate( (value) ->
  return true unless value?  # allowing empty
  return /request|accepted|denied/i.test(value)
, 'Invalid Status')


# User.path('image').set (new_value) ->
#   if new_value isnt @image
#     if @image isnt 'default_user.png'
#       console.log "delete user avatar on change: "
#       @deleteAvatars(@image)
#   return new_value




# User
#   .method 'filter', () ->
#     filtered_user = _.omit(@_doc, ['salt', 'hashed_password', 'provider', 'apn_token'])
#     filtered_user.image = "#{config.media_url}/#{@_doc.image}"
#     return filtered_user

# User.post 'remove', (doc) ->
#   if doc.image isnt 'default_user.png'
#     console.log "delete user avatar on remove: "
#     @deleteAvatars(doc.image)

# User
#   .method 'deleteAvatars', (avatar) ->
#     generate2xname = (path) ->
#       name = path.substr 0, path.lastIndexOf('.')
#       extension = path.substr path.lastIndexOf('.')
#       extension = "@2x#{extension}"
#       return "#{name}#{extension}"

#     fs.unlink "#{config.media_root}/#{avatar}", (err) ->
#       if err then console.error "ERROR deleting user's avatar: ", err
#       else console.log "User's avatar deleted successfully!"
#     fs.unlink "#{config.media_root}/#{generate2xname(avatar)}", (err) ->
#       if err then console.error "ERROR deleting user's avatar: ", err
#       else console.log "User's avatar deleted successfully!"

