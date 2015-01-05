import unittest
import json

from motherbrain.models.operations import MBPipe


class TestMBPipe(unittest.TestCase):
    def setUp(self):
        self.data = {'first_name': 'Walter',
                     'last_name':  'Bishop'}

        display_name = lambda x: ','.join([x.get('last_name'),
                                           x.get('first_name')])

        uppercase_str = lambda x: {k:v.upper() for k,v in x.iteritems()
                                   if isinstance(v, str)}
        add_initials = lambda x: '{}, {}{}'.format(x,
                                                   x[0],
                                                   x.split(',')[1][0])

        self.display_name = display_name
        self.add_initials = add_initials
        self.uppercase_str = uppercase_str

    def testSingleFun(self):
        """Testing Pipe with single function"""
        pipe = MBPipe(self.data, self.display_name)

        self.assertEqual('Bishop,Walter', pipe())

    def testMultiFun(self):
        """Testing Pipe with multiple function"""
        pipe = MBPipe(self.data, self.uppercase_str,
                                 self.display_name,
                                 self.add_initials)

        self.assertEqual('BISHOP,WALTER, BW', pipe())


if __name__ == '__main__':
    unittest.main()
