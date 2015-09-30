/**
 *  @copyright 2015 [3Doers]
 *
 *  @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *  @version 0.1.0
 */

export let EURO_TAXES = 0.0522;

export let PROJECT_COLORS = {
  BLACK: 'black',
  WHITE: 'white',
  YELLOW: 'yellow',
  RED: 'red',
  BLUE: 'blue',
  GREEN: 'green'
};


export let PROJECT_MATERIALS = {
  ANY: [1.01, 'Any Material'],
  ABS: [1.01, 'ABS'],
  PLA: [1.24, 'PLA']
};


export let ORDER_STATUSES = {
  STARTED: [0, 'order started'],
  PRINT_REQUESTED: [1, 'print requested'],
  PRINT_REVIEW: [2, 'print review'],
  PRINT_ACCEPTED: [3, 'print accepted'],
  PRINTING: [4, 'printing'],
  PRINTED: [5, 'printed'],
  SHIPPING: [6, 'shipping'],
  ARCHIVED: [7, 'archived']
};

export let EUROPE_COUNTRIES = [
  {abbr: "AD", name: "Andorra", ioc: "AND"},
  {abbr: "AL", name: "Albania", ioc: "ALB"},
  {abbr: "AM", name: "Armenia", ioc: "ARM"},
  {abbr: "AT", name: "Austria", ioc: "AUT"},
  {abbr: "AZ", name: "Azerbaijan", ioc: "AZE"},
  {abbr: "BA", name: "Bosnia and Herzegovina", ioc: "BIH"},
  {abbr: "BE", name: "Belgium", ioc: "BEL"},
  {abbr: "BG", name: "Bulgaria", ioc: "BUL"},
  {abbr: "BY", name: "Belarus", ioc: "BLR"},
  {abbr: "CH", name: "Switzerland", ioc: "SUI"},
  {abbr: "CY", name: "Cyprus", ioc: "CYP"},
  {abbr: "CZ", name: "Czech Republic", ioc: "CZE"},
  {abbr: "DE", name: "Germany", ioc: "DEU"},
  {abbr: "DK", name: "Denmark", ioc: "DNK"},
  {abbr: "EE", name: "Estonia", ioc: "EST"},
  {abbr: "ES", name: "Spain", ioc: "ESP"},
  {abbr: "FI", name: "Finland", ioc: "FIN"},
  {abbr: "FR", name: "France", ioc: "FRA"},
  {abbr: "GE", name: "Georgia", ioc: "GEO"},
  {abbr: "GR", name: "Greece", ioc: "GRC"},
  {abbr: "HU", name: "Hungary", ioc: "HUN"},
  {abbr: "IE", name: "Ireland", ioc: "IRL"},
  {abbr: "IS", name: "Iceland", ioc: "ISL"},
  {abbr: "IT", name: "Italy", ioc: "ITA"},
  {abbr: "LI", name: "Liechtenstein", ioc: "LIE"},
  {abbr: "LT", name: "Lithuania", ioc: "LTU"},
  {abbr: "LU", name: "Luxembourg", ioc: "LUX"},
  {abbr: "LV", name: "Latvia", ioc: "LVA"},
  {abbr: "MC", name: "Monaco", ioc: "MCO"},
  {abbr: "MD", name: "Moldova", ioc: "MDA"},
  {abbr: "MK", name: "Macedonia", ioc: "MKD"},
  {abbr: "MT", name: "Malta", ioc: "MLT"},
  {abbr: "NL", name: "Netherlands", ioc: "NLD"},
  {abbr: "NO", name: "Norway", ioc: "NOR"},
  {abbr: "PL", name: "Poland", ioc: "POL"},
  {abbr: "PT", name: "Portugal", ioc: "PRT"},
  {abbr: "RO", name: "Romania", ioc: "ROM"},
  {abbr: "SE", name: "Sweden", ioc: "SWE"},
  {abbr: "SI", name: "Slovenia", ioc: "SVN"},
  {abbr: "SK", name: "Slovakia", ioc: "SVK"},
  {abbr: "SM", name: "San Marino", ioc: "SMR"},
  {abbr: "UA", name: "Ukraine", ioc: "UKR"},
  {abbr: "GB", name: "United Kingdom", ioc: "GBR"}
];

export let NOTIFICATION_TYPES = {
  COMMENT: [1, 'order:comment'],
  STATUS_CHANGED: [2, 'order:status_changed']
};

