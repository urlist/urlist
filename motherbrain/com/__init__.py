import zmq
import logging


class ZmqObject(object):
    """0MQ Object

    An object which encapsulate the minimum 0MQ logic
    to bind an address or connect to a series of @addresses.

    Child class must define 'socket_type' class variable.
    """
    socket_type = None

    def __init__(self, addresses=None, socket_type=None, *args, **kwargs):
        super(ZmqObject, self).__init__()
        self.addresses = addresses or []

        if socket_type:
            self.socket_type = socket_type

        self.context = zmq.Context()
        self.socket = self._zmq_create_socket()

    def _zmq_create_socket(self):
        if not hasattr(self, 'socket_type'):
            return None

        return self.context.socket(self.socket_type)

    def _zmq_connect(self, addr):
        logging.debug('ZMQSOCK::CONN --- {}'.format(addr))
        self.socket.connect(addr)

    def _zmq_bind(self, addr):
        logging.debug('ZMQSOCK::BIND --- {}'.format(addr))
        self.socket.bind(addr)

    def zmq_connect(self):
        [self._zmq_connect(x) for x in self.addresses]

    def zmq_close(self):
        logging.debug('ZMQSOCK::CLOSE --- {}'.format(self.addresses))

        self.socket.close()

    def zmq_bind(self):
        addr = self.addresses[0]
        self._zmq_bind(addr)

    def zmq_send(self, payload):
        if self.socket_type == zmq.DEALER:
            self.socket.send('', zmq.SNDMORE)

        self.socket.send(payload)

    def zmq_recv(self):
        if self.socket_type == zmq.DEALER:
            self.socket.recv()

        return self.socket.recv()
