import os
import sys

import unittest

from ConfigParser import RawConfigParser
from motherbrain.base.conf import merge_with_dict


def _get_config(*args, **kwargs):
    from motherbrain.base import conf
    import tornado.options

    reload(tornado.options)
    reload(conf)

    return conf.get_config(*args, **kwargs)

class TestConfig(unittest.TestCase):
    def setUp(self):
        self.config_file = 'test.cfg'

        self.opts = {
            'database': {
                'dbname':  {'default': 'urlist'},
                'dbhost':  {'default': '127.0.0.1'},
                'dbport':  {'default': 27017, 'type': int},
                'dbusr':   {'default': ''},
                'foo':     {'default': True, 'type': bool},
                'dbpwd':   {'default': ''}}}

        self.cli_args = {'database': ['dbhost', 'dbport', 'foo']}

    def tearDown(self):
        if os.path.exists(self.config_file):
            os.remove(self.config_file)

    def _write_config(self, override):
        """Write configuration file
        Write self.opts in a Python Config File.
        Use override to change default parameters.
        """

        config = RawConfigParser()

        for section_name in self.opts.iterkeys():
            config.add_section(section_name)

            section = dict(self.opts.get(section_name),
                           **override.get(section_name))

            [config.set(section_name, option_name, option.get('default'))
             for option_name, option in section.iteritems()]

        with open(self.config_file, 'w') as f:
            config.write(f)


    def _get_by_type(self, config, section_name, option_name, type_):
        map_ = {None : lambda: config.get(section_name, option_name),
                str  : lambda: config.getint(section_name, option_name),
                int  : lambda: config.getint(section_name, option_name),
                float: lambda: config.getfloat(section_name, option_name),
                bool : lambda: config.getboolean(section_name, option_name)}

        return map_.get(type_)()

    def _parse_cli_args(self, args):
        _fmt_key = lambda x: x.replace('--', '')

        return {_fmt_key(k):v for k,v in
                    [x.split('=') for x in args[1:]]}

    def testDefaultOnly(self):
        """Test with only options default values"""
        config = _get_config(self.opts)

        expected = {
            'database': {
                'dbname': 'urlist',
                'dbhost': '127.0.0.1',
                'dbport': 27017,
                'dbusr':  None,
                'dbpwd':  None,
                'foo':    True}}

        for section_name, section in self.opts.iteritems():

            for option_name, option in section.iteritems():
                type_ = option.get('type')
                value = self._get_by_type(config,
                                          section_name,
                                          option_name,
                                          type_)

                expected_value = expected.get(section_name, {}).get(option_name)

                self.assertEqual(value, expected_value)

    def testCli(self):
        """Test with command line arguments"""
        args = ['bar', '--dbport=6666', '--foo=False']

        config = _get_config(self.opts, self.cli_args, args=args)

        expected = {
            'database': {
                'dbname': 'urlist',
                'dbhost': '127.0.0.1',
                'dbport': 6666,
                'dbusr':  None,
                'dbpwd':  None,
                'foo':    False}}

        for section_name, section in self.opts.iteritems():

            for option_name, option in section.iteritems():
                type_ = option.get('type')
                value = self._get_by_type(config,
                                          section_name,
                                          option_name,
                                          type_)

                expected_value = expected.get(section_name, {}).get(option_name)

                self.assertEqual(value, expected_value)


    def testEvaluationOrder(self):
        """Test with config file"""

        self._opts = self.opts
        self.opts['database']['config'] = {'default': None}

        self._cli_args = self.cli_args
        self.cli_args['database'].append('config')

        args = ['bar', '--config={}'.format(self.config_file)]

        parsed_args = self._parse_cli_args(args)

        override = {'database':
                    {'dbport': {'default': 666, 'type': int},
                     'dbhost': {'default': '192.168.1.1'}}}

        self._write_config(override)

        config = _get_config(self.opts, self.cli_args, args=args)

        expected = {
            'database': {
                'dbname': 'urlist',
                'dbhost': '192.168.1.1',
                'dbport': 666,
                'config': 'test.cfg',
                'dbusr':  None,
                'dbpwd':  None,
                'foo':    True}}

        for section_name, section in self.opts.iteritems():

            for option_name, option in section.iteritems():
                type_ = option.get('type')
                value = self._get_by_type(config,
                                          section_name,
                                          option_name,
                                          type_)

                expected_value = expected.get(section_name, {}).get(option_name)

                self.assertEqual(value, expected_value)

    def test_merge_with_dict(self):
        config = _get_config(self.opts)

        new_data = {'foo_section': {'foo': 'bar', 'name': 'joe'},
                    'bar_section': {'x': 1, 'y': 2}}

        config = merge_with_dict(new_data, config)

        self.assertEqual(config.get('foo_section', 'foo'), 'bar')
        self.assertEqual(config.getint('bar_section', 'x'), 1)


if __name__ == '__main__':
    unittest.main()
