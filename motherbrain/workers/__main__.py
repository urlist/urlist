import logging

from motherbrain.base import conf
from motherbrain import workers
from motherbrain import conf as mbconf


_WORKER_OPTS = {"_worker_base": {
                    "cluster": "BASE",
                    "module": "motherbrain.workers.actions.urlist",
                    "ports": [5555, 5556, 5557, 5558]
                 },

                "_worker_mail_queue": {
                    "cluster": "MAIL_QUEUE",
                    "module": "motherbrain.workers.actions.mailing",
                    "ports": [6555, 6556]
                 },
               }


def define_command_line_options():
    """Define and parse command line options."""
    from motherbrain.base.conf import get_config

    _opts = {'config': {'default': 'motherbrain.cfg',
                        'help': 'Workers configuration file [JSON]'}}

    _cli_args = {'global': ['config']}
    opts = get_config({'global': _opts}, _cli_args)

    workers_opts = [x for x in opts.sections() if x.startswith('_worker')]

    if not len(workers_opts):
        _all_opts = _WORKER_OPTS

        return conf.merge_with_dict(_all_opts, opts)

    return opts


def main(options=None):
    options = define_command_line_options()
    workers_opts = [x for x in options.sections() if x.startswith('_worker')]

    mbconf.dump()

    def spawn(worker_opt):
        return workers.spawn(spawn_callback=workers.spawn,
                             **dict(options.items(worker_opt)))

    [spawn(x) for x in workers_opts]


if __name__ == '__main__':
    main()
