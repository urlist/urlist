# -*- coding: utf-8 -*-

import os
import sys

import unittest

from motherbrain.base.models.processors import Transform as T
from motherbrain.base.models.processors import compose


class TestComposer(unittest.TestCase):
    def test_extract_key(self):
        f = compose.extract_key

        data = [{'foo': 1, 'bar': 'A'},
                {'foo': 5, 'bar': 'E'},
                {'foo': 0, 'bar': 'I'}]

        self.assertEqual(f(data, 'foo'), [1, 5, 0])
        self.assertEqual(f(data, 'bar'), ['A', 'E', 'I'])

        data = {'foo': 1, 'bar': 2}
        self.assertEqual(f(data, 'foo'), 1)

    def test_count(self):
        f = compose.count

        data = [1,2,3,4,5]
        self.assertEqual(f(data), 5)

        data = {'a': 1, 'b': 2, 'c': 3}
        self.assertEqual(f(data), 3)

    def test_wrap_in_list(self):
        f = compose.wrap_in_list

        data = [1,2,3]
        self.assertEqual(f(data), [1,2,3])
        self.assertEqual(f("foo"), ["foo"])


if __name__ == '__main__':
    unittest.main()

