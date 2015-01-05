import unittest
import time

from motherbrain.workers.monitor import MBObjectMonitor, MBMonitorMixin


class TestMBObjectMonitor(unittest.TestCase):
    def test_track(self):
        mon = MBObjectMonitor()

        mon.track('foo-event')
        mon.track('bar-event')
        mon.track('foo-event')

        foo_count = mon.events.get('foo-event').get('count')
        bar_count = mon.events.get('bar-event').get('count')

        self.assertEqual(foo_count, 2)
        self.assertEqual(bar_count, 1)

    def test_count(self):
        mon = MBObjectMonitor()

        mon.track('foo-event')
        mon.track('bar-event')
        mon.track('foo-event')

        foo_count = mon.count('foo-event')
        bar_count = mon.count('bar-event')

        self.assertEqual(foo_count, 2)
        self.assertEqual(bar_count, 1)

    def test_event_avg(self):
        mon = MBObjectMonitor()

        evt = mon.start_event('foo-event')
        time.sleep(1)

        mon.end_event(evt)

        rs = mon.event_stat('foo-event')

        self.assertTrue(rs.get('avg') > 0.8 and rs.get('avg') < 1.2)

    def test_event_min_max(self):
        mon = MBObjectMonitor()

        evt = mon.start_event('foo-event')
        time.sleep(1)
        mon.end_event(evt)

        evt = mon.start_event('foo-event')
        time.sleep(2)
        mon.end_event(evt)

        rs = mon.event_stat('foo-event')

        self.assertTrue(rs.get('max') > 1.1 and rs.get('max') < 2.2)
        self.assertTrue(rs.get('min') < 1.1 and rs.get('min') > 0.8)


class TestMBMonitorMixin(unittest.TestCase):
    def setUp(self):
        class FakeObject(MBMonitorMixin):
            pass

        self.mon = FakeObject()

    def test_track(self):
        mon = self.mon

        mon.track('foo-event')
        mon.track('bar-event')
        mon.track('foo-event')

        foo_count = mon.events.get('foo-event').get('count')
        bar_count = mon.events.get('bar-event').get('count')

        self.assertEqual(foo_count, 2)
        self.assertEqual(bar_count, 1)

    def test_count(self):
        mon = self.mon

        mon.track('foo-event')
        mon.track('bar-event')
        mon.track('foo-event')

        foo_count = mon.monitor.count('foo-event')
        bar_count = mon.monitor.count('bar-event')

        self.assertEqual(foo_count, 2)
        self.assertEqual(bar_count, 1)

    def test_event_avg(self):
        mon = self.mon

        evt = mon.start_event('foo-event')
        time.sleep(1)

        mon.end_event(evt)

        rs = mon.monitor.event_stat('foo-event')

        self.assertTrue(rs.get('avg') > 0.8 and rs.get('avg') < 1.2)

    def test_event_min_max(self):
        mon = self.mon

        evt = mon.start_event('foo-event')
        time.sleep(1)
        mon.end_event(evt)

        evt = mon.start_event('foo-event')
        time.sleep(2)
        mon.end_event(evt)

        rs = mon.monitor.event_stat('foo-event')

        self.assertTrue(rs.get('max') > 1.1 and rs.get('max') < 2.2)
        self.assertTrue(rs.get('min') < 1.1 and rs.get('min') > 0.8)


if __name__ == '__main__':
    unittest.main()
