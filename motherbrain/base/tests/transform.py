# -*- coding: utf-8 -*-

import os
import sys

import unittest

from motherbrain.base.models.processors import transform as T

class TestTransform(unittest.TestCase):
    def testDoNothing(self):
        f = T.DoNothing()
        self.assertEqual(f(2), 2)
        self.assertEqual(f('a'), 'a')
        self.assertEqual(f([1,2,3]), [1,2,3])

    def testCount(self):
        f = T.Count()
        self.assertEqual(f([1,2,3]), 3)
        self.assertEqual(f(None), 0)

    def testRemoveDuplicates(self):
        f = T.RemoveDuplicates()
        self.assertEqual(f([1,1,2]), [1,2])
        self.assertEqual(f([1,2]), [1,2])

    def testFlatten(self):
        f = T.Flatten()
        self.assertEqual(f([1]), 1)


if __name__ == '__main__':
    unittest.main()

