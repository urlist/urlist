import logging

from zmq.eventloop import ioloop

from motherbrain.com import dispatchers as disp


def dispatcher(cls_name, addresses):
    dispatcher_cls = getattr(disp, cls_name)
    dispatchers = addresses.split(' ')

    logging.info("APISRV::DISP --- {}".format(dispatcher_cls.__name__))

    dispatcher = dispatcher_cls(dispatchers, ioloop=ioloop.IOLoop.instance())
    dispatcher.connect()

    return dispatcher
