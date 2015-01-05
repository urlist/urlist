import sys
import inspect
import subprocess
import json
import logging
import time
import datetime
import hashlib
import traceback
import zmq

from collections import deque

from zmq.eventloop import ioloop, zmqstream

from urllib2 import HTTPError

from motherbrain.com import ZmqObject
from motherbrain.workers import clusters
from motherbrain.com.messages import MBMessage, MBMessageMixin
from motherbrain.workers.monitor import MBMonitorMixin


from motherbrain import conf


WORKER_NICKNAMES = {'tcp://*:5555': 'The Guv',
                    'tcp://*:5556': 'The Doctor',
                    'tcp://*:5557': 'Heisenberg',
                    'tcp://*:5558': 'Dr.Bishop',
                    'tcp://*:5559': 'Stark',
                    'tcp://*:5560': 'Lannister',
                    'tcp://*:5561': 'Baratheon',
                    'tcp://*:5655': 'The Duke',
                    'tcp://*:5656': 'DarkPassenger',
                    'tcp://*:6555': 'The Hound',
                    'tcp://*:6556': 'The Imp',
                    'tcp://*:6565': 'Mordecay',
                    'tcp://*:6566': 'Thelonious'
                    }

try:
    HOSTNAME = subprocess.check_output(['hostname'])
except:
    HOSTNAME = 'N/A'

try:
    REVISION = subprocess.check_output(
            ['git', 'log', '--oneline', '-n 1']).replace('\n', '')
except:
    REVISION = 'N/A'


START_TIME = time.time()


class ActionDoesNotExist(Exception):
    def __init__(self, action):
        self.action = action

    def __str__(self):
        return "Action '{}' does not exist".format(self.action)


class DispatcherDoesNotExist(Exception):
    def __init__(self, namespace):
        self.namespace = namespace

    def __str__(self):
        return "Dispatcher '{}' does not exist".format(self.namespace)


class OperationalError(Exception):
    pass


class MBWorker(ZmqObject, MBMonitorMixin, MBMessageMixin):
    """Motherbrain Worker Wrapper.

    Wrap a python module and expose methods having 'is_action' attribute
    through a dispatcher.

    Args:
    module  -- a python module to wrap
    addr    -- a zmq_socket address
    cluster -- an MBActionCluster instance

    Usage:
        from myproject import mymod

        worker = MBWorker(mymod, 'tcp://*:5555')

        worker.start()

    If @cluster argument is passed only action belonging to the cluster
    are exposed.

    """
    socket_type = zmq.REP

    def __init__(self, module, addr, cluster=None, nickname=None):
        super(MBWorker, self).__init__([addr])

        if not nickname:
            self.nickname = WORKER_NICKNAMES.get(addr, 'Nameless')

        self.addr = addr
        self.module = module
        self.cluster = cluster

        self.actions = [x for x in dir(self.module) if self._is_action(x)]

        self.ioloop = ioloop.IOLoop.instance()
        self.stream = zmqstream.ZMQStream(self.socket, self.ioloop)

        self._settings = conf.get_settings()

        self._queue = None

    def _is_action(self, propname):
        """Check for 'is_action' method property."""
        prop = getattr(self.module, propname)
        has_action_attr = hasattr(prop, 'is_action')

        if not has_action_attr:
            return False

        action_attr = getattr(prop, 'is_action')

        if self.cluster and hasattr(prop, 'action_cluster'):
            cluster = getattr(prop, 'action_cluster')

            if not cluster == self.cluster:
                return False

        return action_attr is True

    @property
    def queue(self):
        if not self._queue:
            self._queue = conf.get_queue(self._settings)
            self._queue.connect()

        return self._queue

    def start(self):
        """Start the IOLoop."""
        logging.info('MBWORKER::START --- {}'.format(repr(self)))

        self.zmq_bind()
        self.stream.on_recv(self._on_recv)
        self.ioloop.start()

        return

    def _on_recv(self, zmq_msg):
        msg = MBMessage(zmq_msg[0])

        logging.info(u'[{}] {}'.format(self.addr, unicode(msg)))

        try:
            action, result = self._dispatch(msg)
        except ActionDoesNotExist as e:
            self.track('exception:action-does-not-exist')

            logging.error('Action Does Not Exist')
            logging.exception(e)

            action, result = ('Exception', str(e))

        resp = self.encode_msg(msg.msg_id, action,
                               msg.target, result, msg.context,
                               merge_target=False)

        self._on_recv_complete(resp)

    def _on_recv_complete(self, response):
        self.stream.send(response.to_json())

    def _dispatch(self, msg):
        """Dispatch message to the correct namespace."""
        namespace, has_namespace, action = msg.action.partition(':')

        if has_namespace == '':
            namespace = 'action'

        named_disp = '_{}_dispatch'.format(namespace)

        if not hasattr(self, named_disp):
            raise DispatcherDoesNotExist(named_disp)

        disp = getattr(self, named_disp)

        return disp(msg)

    def _admin_dispatch(self, msg):
        """Dispatch a message to action in admin namespace.

        Example:
            admin:status  -> self._admin_status

        """

        _, _, action = msg.action.partition(':')

        action_name = '_admin_{}'.format(action)

        f = getattr(self, action_name)

        return f(**msg.payload)

    def _action_dispatch(self, msg):
        evt = self.start_event('dispatch')

        if not self.has_action(msg.action):
            raise ActionDoesNotExist(msg.action)

        f = getattr(self.module, msg.action)

        evt2 = self.start_event('{}-dispatch'.format(msg.action),
                                group='actions')

        try:
            _action_args = dict(msg.target, **msg.payload)
            _action_result = f(msg.context, **_action_args)

            if callable(_action_result):
                action_result = _action_result(self)
            else:
                action_result = _action_result

            result = (msg.action, action_result)
        except OperationalError as e:
            logging.error("Action '{}' cannot continue: {}".format(msg.action, e))

            result = ('OperationalError', str(e))
        except Exception as e:
            logging.error("Action '{}' Abend".format(msg.action))
            logging.exception(e)

            result = ('Exception', str(e))

        logging.debug('[{}] Response to {}'.format(self.addr, msg.msg_id))

        self.end_event(evt)
        self.end_event(evt2)

        return result

    def has_action(self, action):
        x = action.lower().replace('-', '_')

        return x in self.actions

    def signature(self):
        """Create an unique signature for this worker."""
        m = hashlib.md5()

        key = ''.join(REVISION)

        m.update(key)

        return m.hexdigest()

    def __repr__(self):
        repr_data = {'name': 'MBWorker',
                     'nickname': self.nickname or 'nameless',
                     'addr': self.addresses[0],
                     'modname': self.module.__name__}

        if self.cluster:
            repr_data['cluster'] = self.cluster.name

            return '[{addr}] *{nickname}* {cluster}.{name} => {modname}'\
                   ''.format(**repr_data)

        return '[{addr}] *{nickname}* {name} => {modname}'.format(**repr_data)

    def _admin_status(self):
        """Return a JSON representation of events and metrics."""
        uptime_tm = datetime.datetime.fromtimestamp(time.time() - START_TIME)
        uptime = '{}d {}h {}m {}s'.format(uptime_tm.day - 1,
                                          uptime_tm.hour,
                                          uptime_tm.minute,
                                          uptime_tm.second)

        cluster_data = None

        if self.cluster:
            cluster_data = self.cluster.__dict__()

        actions = {x: {'kwargs': self._action_args(x),
                       'doc': getattr(self.module, x).__doc__}
                   for x in self.actions}

        stats = {'events': self.events,
                 'metrics': self.metrics}

        data = {'object': repr(self),
                'nickname': self.nickname,
                'cluster': cluster_data,
                'signature': self.signature(),
                'revision': REVISION,
                'actions': actions,
                'performance': stats}

        return ('', data)

    def _action_args(self, action):
        """Return action argument list."""
        if not callable(action):
            action = getattr(self.module, action)

        if hasattr(action, 'argspec'):
            argspec = action.argspec()
        else:
            argspec = inspect.getargspec(action)

        args = argspec.args

        if argspec.keywords:
            args.append('**{}'.format(argspec.keywords))

        if len(args):
            args.pop(0)

        return args

    @staticmethod
    def spawn(module, port, cluster=None):
        """Instantiate a new MBWorker by module name and port name,
        start and return the instance.
        """
        inst = MBWorker(module, 'tcp://*:{}'.format(port), cluster=cluster)
        inst.start()

        return inst


def define_command_line_options():
    """Define and parse command line options."""
    from motherbrain.base.conf import get_config

    _opts = {'module': {'default': 'motherbrain.actions.urlist',
                        'help': 'Module to wrap'},
             'ports':  {'default': '5555,5556',
                        'help': '''A comma separated list of port. A process'''
                                ''' will be spawned for each port'''},
             'cluster': {'default': '',
                        'help': '''If specified, only actions belonging to '''
                                '''the specified cluster where registered'''}}

    _cli_args = {'global': ['module', 'ports', 'cluster']}

    opts = get_config({'global': _opts}, _cli_args)

    return opts


def spawn(module=None, ports=None, cluster=None, spawn_callback=MBWorker.spawn):
    """Spawn worker processes.

    args:
    mod     --- module object or module name
    ports   --- a list of ports
    cluster --- a MBActionCluster object or cluster name

    """
    import signal
    import importlib

    from multiprocessing import Process

    if isinstance(module, str):
        module = importlib.import_module(module)

    if isinstance(cluster, str):
        cluster = getattr(clusters, cluster)

    if not hasattr(ports, '__iter__'):
        ports = [ports]

    procs = [Process(target=spawn_callback,
                     args=(module, port, cluster))
             for port in ports]

    def _clean_shutdown(signum, frame):
        import sys, os

        signame, = [x for x in dir(signal)
                    if getattr(signal, x) == 15 and x.startswith('SIG')]

        logging.info('MBWORKER::PROC::SHUTDOWN --- {}'.format(signame))

        for proc in procs:
            proc.terminate()

            if proc.pid == os.getpid():
                proc.join()

        sys.exit(0)

    [proc.start() for proc in procs]

    signal.signal(signal.SIGTERM, _clean_shutdown)
    signal.signal(signal.SIGINT, _clean_shutdown)


def main(options=None):
    opts = options or define_command_line_options()

    ports = [int(x) for x in
             opts.get('global', 'ports').split(',')]

    module_name = opts.get('global', 'module')
    cluster_name = opts.get('global', 'cluster')

    spawn(module_name, ports, cluster_name)


if __name__ == '__main__':
    """Command Line Usage

    Start a process for each port in @ports cli argument, each process
    is a MBWorker object wrapping @module.

    Example:
        python workers/__init__.py --module=mypackage.mymod
                                   --ports=5555,5556

    """

    main()
