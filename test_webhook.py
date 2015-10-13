data = {
   "object_state":"VALID",
   "object_status":"SUCCESS",
   "object_created":"2015-10-11T22:35:57.374Z",
   "object_updated":"2015-10-11T22:35:58.789Z",
   "object_id":"7cd3a43e08524374a7e61b1fd28e157e",
   "object_owner":"mattia.spinelli@zoho.com",
   "was_test":False,
   "rate":"21832faf608249eebd5a33388d10ac66",
   "pickup_date":None,
   "notification_email_from":False,
   "notification_email_to":False,
   "notification_email_other":"",
   "tracking_number":"JD014600002445449328",
   "tracking_status":{
      "object_created":"2015-10-11T22:35:58.758Z",
      "object_updated":"2015-10-11T22:35:58.758Z",
      "object_id":"b37bf400003a42f4b7ff986205e7eb39",
      "status":"DELIVERED",
      "status_details":"",
      "status_date":None
   },
   "tracking_history":[

   ],
   "tracking_url_provider":"http://www.dhl-usa.com/content/us/en/express/tracking.shtml?brand=DHL&AWB=JD014600002445449328",
   "label_url":"https://shippo-delivery-east.s3.amazonaws.com/7cd3a43e08524374a7e61b1fd28e157e.pdf?Signature=flUb7EpWnIQzNjrz%2BPH3f60Ldnw%3D&Expires=1476138958&AWSAccessKeyId=AKIAJGLCC5MYLLWIG42A",
   "commercial_invoice_url":None,
   "messages":[

   ],
   "customs_note":"",
   "submission_note":"",
   "order":None,
   "metadata":""
}

import json
import urllib, urllib2

# request = urllib2.Request('http://www.3doers.it/goshippo-webhook/') # Manual encoding required
request = urllib2.Request('http://localhost:3000/api/v1/orders/goshippo/') # Manual encoding required
request.add_header('Content-Type', 'application/json')
handler = urllib2.urlopen(request, json.dumps(data))

print handler.read()
