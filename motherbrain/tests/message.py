import unittest
import json
from itertools import chain

from motherbrain.com.messages import MBMessage


class TestMBMessage(unittest.TestCase):
    def setUp(self):
        self.msg_id = 'joe'
        self.action = 'be-awesome'
        self.target = {'list_hash': 'Yyc'}
        self.payload = {'foo': 'bar',
                        'bar': 'foo'}
        self.context = {}

    def test_init_encode(self):
        msg = MBMessage(
                   self.msg_id,
                   self.action,
                   self.target,
                   self.payload,
                   self.context)

        result = msg.to_json()
        excepted = json.dumps([msg.msg_id,
                               msg.action,
                               self.target,
                               msg.payload,
                               {}, msg.timestamp,])

        self.assertEqual(result, excepted)

    def test_init_decode(self):
        msg = MBMessage(
                   self.msg_id,
                   self.action,
                   self.target,
                   self.payload,
                   self.context)

        result = msg.to_json()
        excepted = json.dumps([msg.msg_id,
                               msg.action,
                               self.target,
                               msg.payload,
                               {}, msg.timestamp,])

        dec_msg = MBMessage(result)

        self.assertEqual(result, dec_msg.to_json())


    def test_encode(self):
        msg = MBMessage()

        msg.encode(self.msg_id,
                   self.action,
                   self.target,
                   self.payload,
                   self.context)

        result = msg.to_json()
        excepted = json.dumps([msg.msg_id,
                               msg.action,
                               self.target,
                               msg.payload,
                               {}, msg.timestamp,])

        self.assertEqual(result, excepted)

    def test_decode(self):
        msg = MBMessage()

        msg.encode(self.msg_id,
                   self.action,
                   self.target,
                   self.payload,
                   self.context)

        json = msg.to_json()

        msg.decode(json)

        self.assertEqual(json, msg.to_json())

    def test_repr(self):
        msg = MBMessage()

        msg.encode(self.msg_id,
                   self.action,
                   self.target,
                   self.payload,
                   self.context)

        repr_ = "MBMessage from joe: be-awesome(foo=bar,bar=foo)"
        self.assertTrue(str(msg), repr_)


if __name__ == '__main__':
    unittest.main()
