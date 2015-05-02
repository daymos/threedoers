data = {
    "object_state": "VALID", 
    "object_status": "SUCCESS", 
    "object_created": "2015-03-27T09:56:34.748Z", 
    "object_updated": "2015-03-30T12:17:50.835Z", 
    "object_id": "ee66d88746434b48b02ff04a9eb7f671",
    "object_owner": "mattia.spinelli@zoho.com", 
    "was_test": False, 
    "rate": "fc277298a6f2411e91263878eb477932", 
    "pickup_date": 'null', 
    "notification_email_from": False,
    "notification_email_to": False, 
    "notification_email_other": "", 
    "tracking_number": "JD014600001676096788", 
    "tracking_status": {
        "object_created": "2015-03-27T09:56:37.386Z", 
        "object_updated": "2015-03-30T12:17:50.827Z", 
        "object_id": "7521818e9bd240b8985f5a4afea9440d", 
        "status": "TRANSIT", 
        "status_details": "With delivery courier", 
        "status_date": 'null'
    }, 
        "tracking_url_provider": "http://www.dhl-usa.com/content/us/en/express/tracking.shtml?brand=DHL&AWB=JD014600001676096788", 
        "label_url": "https://shippo-delivery-east.s3.amazonaws.com/ee66d88746434b48b02ff04a9eb7f671.pdf?Signature=JF6%2BFs9B%2FKCtPKFx6tclsLebXw0%3D&Expires=1458986197&AWSAccessKeyId=AKIAJTHP3LLFMYAWALIA", 
        "messages": [], 
        "customs_note": "", 
        "submission_note": "", 
        "metadata": ""
}

import json
import urllib, urllib2

request = urllib2.Request('http://www.3doers.it/goshippo-webhook/') # Manual encoding required
request.add_header('Content-Type', 'application/json')
handler = urllib2.urlopen(request, json.dumps(data))

print handler.read()