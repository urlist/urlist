import os
import unittest
import time
import threading

import zmq

import motherbrain.tests

from motherbrain.workers import MBWorker, \
                                DispatcherDoesNotExist

from motherbrain.com import ZmqObject
from motherbrain.com.messages import MBMessage


_ACTION_MODULE = """
from motherbrain.workers import OperationalError

def action_foo(context, first_arg=None):
    x = first_arg

    return x * 2
action_foo.is_action = True

def action_bar(context, first_arg=None, second_arg=None):
    x = first_arg
    y = second_arg
    z = context.get('multiplier')

    return (x + y) * z
action_bar.is_action = True

def fail_action(context, foo=None):
    return foo / 0
fail_action.is_action = True

def op_action(context, foo=None):
    raise OperationalError('You are too ugly.')
op_action.is_action = True
"""


class MBTestWorker(MBWorker):
    def _on_recv(self, zmq_msg):
        super(MBTestWorker, self)._on_recv(zmq_msg)

        self.ioloop.add_timeout(time.time() + 1,
                                lambda: self.ioloop.stop())


class TestWorker(unittest.TestCase):
    def setUp(self):
        self.module_filename = 'tests/workers_action.py'

        with open(self.module_filename, 'w') as f:
            f.write(_ACTION_MODULE)

        import motherbrain.tests.workers_action

        self.module = motherbrain.tests.workers_action
        self.addr = 'tcp://*:5555'
        self.worker = MBTestWorker(self.module, self.addr)

    def tearDown(self):
        os.unlink(self.module_filename)

        try:
            os.unlink('{}c'.format(self.module_filename))
        except:
            pass

    def testActionBinding(self):
        worker = self.worker

        self.assertTrue(worker.has_action('action_foo'))
        self.assertTrue(worker.has_action('action_bar'))
        self.assertTrue(worker.has_action('fail_action'))
        self.assertFalse(worker.has_action('baz_action'))

    def testDispatchException(self):
        worker = self.worker

        class FakeMsg(object):
            action = 'foo:bar'

        msg = FakeMsg()

        self.assertRaises(DispatcherDoesNotExist,
                          worker._dispatch, msg)

    def testMessageDispatching(self):
        worker = self.worker

        msg = MBMessage('foo', 'action_foo', None, {'first_arg': 2}, {})

        result = worker._dispatch(msg)

        self.assertEqual(result, ('action_foo', 4))

    def testMessageDispatchingWithContext(self):
        worker = self.worker

        msg = MBMessage('foo', 'action_bar', None,
                        {'first_arg': 2, 'second_arg': 3},
                        {'multiplier': 6})

        result = worker._dispatch(msg)

        self.assertEqual(result, ('action_bar', 30))

    def testActionFailure(self):
        worker = self.worker

        msg = MBMessage('foo', 'fail_action', None, {'foo': 2}, {})

        result = worker._dispatch(msg)

        self.assertEqual(result, ('Exception',
                                  'integer division or modulo by zero'))

    def testActionOperationalError(self):
        worker = self.worker

        msg = MBMessage('foo', 'op_action', None, {'foo': 2}, {})

        result = worker._dispatch(msg)

        self.assertEqual(result, ('OperationalError',
                                  'You are too ugly.'))

    def test__on_recv(self):
        client = ZmqObject(['tcp://localhost:5555'], zmq.REQ)

        msg = MBMessage('foo', 'action_bar', None,
                        {'first_arg': 2, 'second_arg': 3},
                        {'multiplier': 6})

        zmq_msg = msg.to_json()

        worker = self.worker

        worker_thread = threading.Thread(target=worker.start)
        worker_thread.start()

        time.sleep(2)

        client.zmq_connect()
        client.zmq_send(zmq_msg)

        result = worker.decode_msg(client.zmq_recv())

        client.socket.close()

        self.assertEqual(result.payload, 30)


if __name__ == '__main__':
    unittest.main()
