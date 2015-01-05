import json
import time
import uuid

from bson import json_util


_json = lambda x: json.dumps(x, default=json_util.default)


class MessageIsInvalid(Exception):
    def __init__(self, msg):
        self.msg = msg

    def __str__(self):
        if isinstance(self.msg, list):
            return u'''Message length should be 2''' \
                    '''([msg_id, payload]), got {}'''.format(len(self.msg))

        return u'''Message should be a list, ''' \
                '''got '{}' '''.format(type(self.msg))


class MBMessage(object):
    """Motherbrain Message.

    Args:
        msg_id  -- message ID
        action  -- Motherbrain worker action name
        target  -- entity affected by the action
        payload -- Incoming Message: Action arguments
                   Outgoing Message: Action result
        context -- a dictionary of variables which represent an
                   external context, e.g. website session data

    Usage:
        msg = MBMessage()
        MBMessage.encode('0001', 'fetch_list', {'list_hash': 'Yyc'},
                        {'hide_private': True}, {'current_user': 'adp'})
        msg.to_json()

        > ["0001", "fetch_list", {"list_hash": Yyc"},
        > {"hide_private": true}, {"current_user": "adp"}, 1354807427]

        MBMessage.decode('["joe", "be-awesome",
                          {"foo": "bar"}, {"weather": "hot"}, 1354807]')
        msg.msg_id

        > '0001'
    """

    def __init__(self, *args, **kwargs):
        self._json_encode = _json
        self._json_decode = json.loads

        if len(args) > 1:
            self.encode(*args, **kwargs)
        elif len(args) == 1:
            self.decode(args[0])

    def encode(self, msg_id, action, target,
               payload, context, merge_target=True):
        payload = payload or {}
        target = target or {}

        self.msg_id = msg_id or self.__class__.msg_id()
        self.action = action.replace('-', '_')
        self.target = target or {}

        if isinstance(payload, dict) and merge_target:
            self.payload = dict(target, **payload)
        else:
            self.payload = payload

        self.timestamp = int(time.time())
        self.context = context or {}

    def decode(self, json_data):
        data = self._json_decode(json_data)

        if len(data) == 6:
            msg_id, action, target, payload, context, timestamp = data
        else:
            msg_id, action, target, payload, context, = data

            timestamp = None

        self.timestamp = timestamp
        self.msg_id = msg_id
        self.action = action.replace('-', '_')
        self.target = target or {}
        self.payload = payload or {}
        self.context = context or {}

    @property
    def sender(self):
        if not hasattr(self, 'context') and isinstance(self.context, dict):
            return None

        return self.context.get('current_user_id')

    def __repr__(self):
        fargs = [self.sender, self.action, self._payload_str()]

        return u"MBMessage from {}: {}({})".format(*fargs)

    def _payload_str(self):
        if not self.payload:
            return ''

        _payload = dict(self.target, **self.payload)

        return u','.join([u'{}={}'.format(k, v)
                         for k, v in _payload.iteritems()
                         if not k == 'password'])

    def to_json(self):
        msg = [self.msg_id, self.action, self.target,
               self.payload, self.context, self.timestamp,]

        return self._json_encode(msg)

    @staticmethod
    def msg_id(prefix='*'):
        return '.'.join([prefix, str(uuid.uuid4())])


class MBMessageMixin(object):
    def decode_stream_msg(self, zmq_msg):
        if not isinstance(zmq_msg, list):
            raise self.MessageIsInvalid(zmq_msg)

        if not len(zmq_msg) == 2:
            raise self.MessageIsInvalid(zmq_msg)

        _, msg_data = zmq_msg

        msg = MBMessage(msg_data)

        return msg

    def decode_msg(self, zmq_msg, **kwargs):
        msg = MBMessage(zmq_msg, **kwargs)

        return msg

    def encode_msg(self, *args, **kwargs):
        msg = MBMessage(*args, **kwargs)

        return msg
