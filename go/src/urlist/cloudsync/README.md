cloudsync
=========

*cloudsync* provide a web interface to *gsutil* google drive command line tool.
Use it to synchronize assets between a local host and Google Drive.

### Usage
This is a hipster tool, so REST is not supported. Once you have started the server, you just send
GET request with a Query String.

Query String support the following key/value pairs:

- action: *put* or *del*
- bucket: Google drive bucket name
- filename: path to the local file

### Examples

Add a file
    http://cloudsync-address.com?action=put&bucket=fabio-images&filename=/srv/statics/fabioh.jpg

Remove a file
    http://cloudsync-address.com?action=del&bucket=fabio-images&filename=/srv/statics/fabioh.jpg
