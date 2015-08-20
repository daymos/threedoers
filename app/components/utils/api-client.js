/**
 *  @copyright 2015 [3Doers]
 *
 *  @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *  @version 0.1.0
 */

import restful from 'restful.js';

let api;

export default function getAPIClient () {
  if (!api) {
    api = restful(`${location.hostname}`)
    .header('X-Requested-With', 'XMLHttpRequest')
    .protocol(`${location.protocol.split(':')[0]}`)
    .prefixUrl('api/v1');

    if (location.port) {
      api.port(`${location.port}`);
    }
  }

  return api;
}
