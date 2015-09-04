/**
 *  @copyright 2015 [3Doers]
 *
 *  @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *  @version 0.1.0
 *
 */

import path from 'path';
import swig from 'swig';
import nodemailer from 'nodemailer';
import nconf from 'nconf';

import getLogger from 'utils/logger';

let logger = getLogger('Mailer');


class Mailer {

  constructor() {
    this.transport = nodemailer.createTransport('SMTP', {
      service: nconf.get('mailer:service'),
      auth: {
        user: nconf.get('mailer:username'),
        pass: nconf.get('mailer:password')
      }
    });

    this.path = path.join(nconf.get('rootDir'), '/app/views');
  }

  send (template, context, options, callback) {
    let _callback = callback || function () {};
    let filePath = path.join(this.path, template);
    let mailer = this;

    swig.renderFile(filePath, context, function (renderError, output) {
      if (renderError) {
        return _callback(renderError);
      }

      if (!options) {
        return _callback(new Error('No options sent to mailer'));
      }

      options.html = output;

      mailer.transport.sendMail(options, function (sendEmailError, response) {
        if (sendEmailError) {
          logger.debug(sendEmailError.message);
          return _callback(sendEmailError);
        }

        logger.info("Message sent: " + response.message + " ");
        _callback(null, response);
      });
    });
  }
}

let mailer = new Mailer();

export default mailer;
