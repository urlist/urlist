""" Urlist Configuration Handler

Merge options from command line (require tornado.option module)
and from configuration file (ConfigParser)

Usage example:
    # options
    _opts = {
        'database': {
            'dbhost':  {'default': '127.0.0.1'},
            'dbport':  {'default': 27017, 'type': int},
            'dbusr':   {'default': ''},
            'dbpwd':   {'default': ''},
        },

        'server': {
            'port': {'default': 8888, help='Server Port'}
        }
    }

    _cli_args = {'server': ['port'],
                 'database': ['dbport', 'dbhost']}

    config = get_config(_options, _cli_args)


    The order of evaluation is the following:

    -) Command Line Arguments
    -) Config File (only if 'config' option is defined)
    -) Default values
"""

import os
import sys
import json
import logging
import tornado.options as opt

from ConfigParser import RawConfigParser

def _config_file_exists(path):
    if not path:
        return False

    return os.path.exists(path)

def _cli_args(options, cli_args):
    """ Register Command Line Arguments
    Register command line arguments defined in cli_args within the
    tornado command line parser.

    cli_args example:
        {'section': [arg1, arg2, arg3, ...],
        ...
    """
    for section_name, keys in cli_args.iteritems():
        section_data = options.get(section_name)

        [opt.define(k, **v) for k,v in section_data.iteritems()
         if k in keys]

def _cli_args_get(key):
    """ Get Command Line Argument Value
    Return option value if key exist.
    """
    arg = opt.options.get(key)

    if arg is None:
        return None

    if arg._value is None:
        return None

    return arg._value

def _value(file_opts, cli_opts, section, key):
    """Extract option value
    Option value order of evaluation:

    1. Command Line Argument
    2. File
    3. Default value
    """

    def _default_option():
        if isinstance(cli_opts, dict):
            value = cli_opts.get('default')
        else:
            value = cli_opts

        return value

    def _config_file_option():
        if not file_opts.has_option(section, key):
            return None

        return file_opts.get(section, key)

    find_value = [_cli_args_get(key),
                  _config_file_option(),
                  _default_option()]

    if not any(find_value):
        return None

    return [str(x) for x in find_value if not x is None].pop(0)

def get_config(options, cli_args=None, args=None):
    """Get Urlist Configuration
    Instantiate a ConfigParser object and add section and options
    from options argument.

    options example:
        {'section': {'option': 'value'},
                    {'option': 'value'},
        ...

        or

        {'section': {'option': {'default': 'default_value',
                                'type': 'option type',
                                'help': 'help message'}},
        ...


    """
    if cli_args:
        _cli_args(options, cli_args)

    if not args:
        args = sys.argv

    opt.parse_command_line(args)

    if hasattr(opt.options, 'config'):
        config_file = opt.options.config or None
    else:
        config_file = None

    config_file_exists = _config_file_exists(config_file)
    config = RawConfigParser(allow_no_value=True)

    if config_file_exists:
        logging.debug("""CFGREAD --- """
                      """'{}'""".format(config_file))
        with open(config_file, 'rb') as f:
            config.readfp(f)

    for section_name, section in options.iteritems():
        if not config.has_section(section_name):
            config.add_section(section_name)

        get_value = lambda option: \
                           _value(config, option, section_name, option_name)

        [config.set(section_name, option_name, get_value(option))
         for option_name, option in section.iteritems()]

    if config_file and not config_file_exists:
        logging.debug("""CFGWRITE --- Configuration file does not exist, """
                      """writing '{}'""".format(config_file))
        with open(config_file, 'wb') as f:
            config.write(f)

    return config


def merge_with_dict(source, target):
    """ Merge a ConfigParser object with a dictionary.

    args
    source --- A dictionary
                {'section_name':
                    {'foo': 'bar'}}
    target --- A ConfigParser instance

    """
    for section_name, section_options in source.iteritems():
        target.add_section(section_name)

        [target.set(section_name, option_name, option_value)
         for option_name, option_value in section_options.iteritems()]

    return target


def is_production(base_path='.'):
    flag_path = os.path.join(base_path, 'PRODUCTION')

    return os.path.exists(flag_path)


def guess_root(cwd, mb_dirname='motherbrain', apisrv_dirname='api_server'):
    """
    >>> guess_root('/foo/bar/motherbrain/api_server')
    '..'
    >>> guess_root('/foo/bar/motherbrain')
    '.'
    >>> guess_root('/foo/bar/motherbrain/api_server/foo')
    '../..'
    """
    path_parts = cwd.split('/')

    if not mb_dirname in path_parts:
        return None

    mb_index = path_parts.index(mb_dirname)

    if not apisrv_dirname in path_parts:
        return '.'

    apisrv_index = path_parts.index(apisrv_dirname)

    mb_path_parts = path_parts[mb_index + 1:]

    if len(mb_path_parts):
        return '/'.join(['..' for x in mb_path_parts])
    else:
        return '.'


def site_conf(cwd):
    base_path = guess_root(cwd)

    if is_production(base_path):
        _filename = 'SITE'
    else:
        _filename = 'TEST_SITE'

    filename = os.path.join(base_path, _filename)

    if not os.path.exists(filename):
        return {}

    with open(filename, 'r') as f:
        try:
            return json.load(f)
        except:
            return {}


if __name__ == "__main__":
    import doctest
    doctest.testmod()
