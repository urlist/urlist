import time
import zmq
import json

import logging

from zmq.eventloop import zmqstream

from motherbrain.com import ZmqObject
from motherbrain.com.messages import MBMessage, MBMessageMixin


class MBDispatcher(ZmqObject, MBMessageMixin):
    socket_type = zmq.DEALER

    def __init__(self, *args, **kwargs):
        super(MBDispatcher, self).__init__(*args, **kwargs)

    def connect(self):
        self.zmq_connect()

    def close(self):
        self.zmq_close()

    def send_msg(self, *args):
        msg = self.encode_msg(*args)
        self.zmq_send(msg.to_json())

    def recv_msg(self):
        msg = self.decode_msg(self.zmq_recv())

        return msg

    def __repr__(self):
        addresses = ', '.join(self.addresses)

        return u"MBDispatcher@{}".format(addresses)


class MBAsyncDispatcher(MBDispatcher, MBMessageMixin):
    def __init__(self, *args, **kwargs):
        self.ioloop = kwargs.pop('ioloop')
        self._dispatch_table = {}

        super(MBAsyncDispatcher, self).__init__(*args, **kwargs)

        self.iostream = self._setup_stream(self._dispatch_recv)

    def connect(self):
        self.zmq_connect()

    def close(self):
        self._purge_dispatch_table()

        logging.debug('DISP::PENDING --- {} messages'
                      ''.format(len(self._dispatch_table)))

        self.zmq_close()

    def _setup_stream(self, recv_callback):
        self.iostream = zmqstream.ZMQStream(self.socket)
        self.iostream.on_recv(recv_callback)

    def _purge_dispatch_table(self):
        purge_queue = [k for k, v in self._dispatch_table.iteritems()
                       if not len(v)]

        for k in purge_queue:
            del(self._dispatch_table[k])

        logging.debug("DISP::DTABLE --- Purged '{}' items"
                      "".format(len(purge_queue)))

    def _callback(self, msg_id):
        callbacks = self._dispatch_table.get(msg_id, [])

        if not len(callbacks):
            self.remove_msg_handler(msg_id)
            return lambda x: None

        callback = callbacks.pop()

        if not callbacks:
            self.remove_msg_handler(msg_id)

        return callback

    def _dispatch_recv(self, zmq_msg):
        msg = self.decode_stream_msg(zmq_msg)

        msg_id = msg.msg_id
        callback = self._callback(msg_id)

        logging.debug('DISP::RECV --- {} -> {}'.format(msg.msg_id, callback))

        try:
            callback(msg)
        except IOError:
            logging.warning('DISP::DISCARD --- {} -> {}'
                            ''.format(msg.msg_id, callback))

    def add_msg_handler(self, msg_id, callback):
        logging.debug('DISP::REGISTER --- {} -> {}'.format(msg_id, callback))
        self._dispatch_table.setdefault(msg_id, [])
        self._dispatch_table[msg_id].append(callback)

    def remove_msg_handler(self, msg_id):
        logging.debug('DISP:DEREGISTER --- {}'.format(msg_id))
        if not msg_id in self._dispatch_table:
            return

        del self._dispatch_table[msg_id]

    def send_msg(self, *args, **kwargs):
        if 'callback' in kwargs:
            callback = kwargs.pop('callback')
        else:
            callback = None

        msg = self.encode_msg(*args)

        self.zmq_send(msg.to_json())

        if callback:
            self.add_msg_handler(msg.msg_id, callback)


class MBDispatcherCluster(ZmqObject):
    socket_type = zmq.DEALER

    def __init__(self, *args, **kwargs):
        try:
            ioloop = kwargs.pop('ioloop')
        except KeyError:
            ioloop = None

        super(MBDispatcherCluster, self).__init__(*args, **kwargs)

        self.worker_data = self.status()

        self.cluster_addrs, self.action_cluster = self._clusters(
                                                        self.addresses)

        dispatcher_cls = MBDispatcher

        async_args = {'ioloop': ioloop}
        async_cls = lambda addrs: MBAsyncDispatcher(addrs, **async_args)

        if ioloop:
            dispatcher_cls = lambda addrs: async_cls(addrs)

        self.cluster_dispatchers = {cluster_id: dispatcher_cls(addrs)
                                    for cluster_id, addrs
                                    in self.cluster_addrs.iteritems()}

        self.cluster_data = {cid: {addr: self.worker_data.get(addr)
                                   for addr in addrs}
                             for cid, addrs in self.cluster_addrs.iteritems()}

    def connect(self):
        self.dispatchers_connect()

    def dispatchers_connect(self):
        [x.zmq_connect() for x in self.cluster_dispatchers.itervalues()]

    def close(self):
        [x.close() for x in self.cluster_dispatchers.itervalues()]

    def _clusters(self, addresses):
        cluster_addrs = {}
        action_cluster = {}

        for addr, worker_data in self.worker_data.iteritems():
            cluster = worker_data.get('cluster', {})
            cluster_id = cluster.get('id')

            cluster_addrs.setdefault(cluster_id, [])
            cluster_addrs[cluster_id].append(addr)

            actions_data = worker_data.get('actions', {})

            for action_name in actions_data.iterkeys():
                action_cluster[action_name] = cluster_id

        return cluster_addrs, action_cluster

    def _worker_data(self, address):
        logging.debug('DISP::INSPECT --- {}'.format(address))

        worker = MBDispatcher([address], socket_type=zmq.REQ)
        worker.zmq_connect()

        worker.send_msg(None, 'admin:status', None, None, None)
        resp = worker.recv_msg()

        worker.socket.close()

        return resp.payload

    def status(self):
        return {addr: self._worker_data(addr)
                for addr in self.addresses}

    def __repr__(self):
        addresses = ', '.join(self.addresses)

        return u"MBDispatcherCluster@{}".format(addresses)

    def send_msg(self, msg_id, action, *args, **kwargs):
        cluster_id = self.action_cluster.get(action)
        cluster_disp = self.cluster_dispatchers.get(cluster_id)

        if not cluster_disp:
            raise Exception("Action '{}' does not exist".format(action))

        return cluster_disp.send_msg(msg_id, action, *args, **kwargs)

    def push_msg(self, action, *args, **kwargs):
        cluster_id = self.action_cluster.get(action)
        cluster_disp = self.cluster_dispatchers.get(cluster_id)

        cluster_disp.send_msg(None, action, *args, **kwargs)
