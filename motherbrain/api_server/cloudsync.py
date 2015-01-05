import datetime
import urllib
import logging

from tornado.httpclient import AsyncHTTPClient
from tornado import gen


class CloudSync(object):
    def __init__(self, endpoint=None, callback=None):
        self.endpoint = endpoint or "http://localhost:7250"
        self.callback = callback

    def put(self, folder, filename, prehook=None, fileid=None):
        return self.send("put", folder, filename, prehook, fileid)

    def delete(self, folder, filename):
        return self.send("del", folder, filename)

    def send(self, action, folder, filename, prehook=None, fileid=None):
        prehook = prehook or ""
        fileid = fileid or ""

        client = AsyncHTTPClient()

        qs = urllib.urlencode({'action': action,
                               'bucket': folder,
                               'filename': filename,
                               'prehook': prehook,
                               'fileid': fileid})

        url = "{}?{}".format(self.endpoint, qs)

        logging.info(url)

        if not self.callback:
            return gen.Task(client.fetch, url)
        else:
            return client.fetch(url, self.callback)
