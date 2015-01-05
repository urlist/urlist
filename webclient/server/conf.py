import tornado
from tornado.options import define, options


def get_options(opts, cli_args=False):
    [define(k, **v) for k, v in opts.iteritems()]

    # FIXME command line must override config file
    # ...but config file can be specified in command line
    if cli_args:
        tornado.options.parse_command_line()

    tornado.options.parse_config_file(options.config)

    return options
