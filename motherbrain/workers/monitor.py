import uuid
import time

import logging

from collections import deque


class MBObjectMonitor(object):
    """Monitor an object by tracking events."""
    def __init__(self, max_samples=100):
        self.max_samples = max_samples

        self.timers = {}
        self.events = {}
        self.samples = {}
        self.metrics = {}
        self.event_index = {}
        self.event_groups = {}
        self.meta = {}

    def track(self, event, value=None):
        """Increase event counter by one."""
        logging.debug('MBMON::TRACK --- {}'.format(event))

        self.events.setdefault(event, {'count': 0})
        self.events[event]['count'] += 1

    def count(self, event_name):
        """Return event occurrences."""
        event_data = self.events.get(event_name, {})

        return event_data.get('count', 0)

    def start_event(self, event, group=None):
        """Register an event and return it's event id.

        Keep track of event start time.

        """
        self.track(event)
        logging.debug('MBMON::START_EVENT')

        event_id = uuid.uuid4()

        self.timers.setdefault(event_id, {})
        self.timers[event_id]['start_at'] = time.time()

        self.event_index[event_id] = event

        if group:
            self.event_groups[event_id] = group

        return event_id

    def end_event(self, event_id):
        """Mark an event as completed.

        Calculate elapsed time and update statistics.

        """
        logging.debug('MBMON::END_EVENT')

        self.timers[event_id]['end_at'] = time.time()

        event_name = self.event_index.get(event_id)
        group = self.event_groups.get(event_id)
        stats = self._calculate_event_stat(event_id)


        if not group:
            self.metrics[event_name] = stats
        else:
            if not group in self.metrics:
                self.metrics.setdefault(group, {})

            self.metrics[group][event_name] = stats

    def _calculate_event_stat(self, event_id):
        """Return a dictionary of event statistics."""
        event_data = self.timers.get(event_id)
        event_name = self.event_index.get(event_id, None)

        if not event_data or not event_name:
            return {}

        elapsed_ = (event_data.get('end_at', 0) -
                    event_data.get('start_at', 0))

        self.samples.setdefault(event_name, deque(maxlen=self.max_samples))
        self.samples[event_name].append(elapsed_)

        samples = self.samples.get(event_name, [])

        avg_ = sum(samples) / len(samples)
        min_ = min(samples)
        max_ = max(samples)

        return {'cur': elapsed_,
                'avg': avg_,
                'min': min_,
                'max': max_}

    def event_stat(self, event_name):
        return self.metrics.get(event_name)


class MBMonitorMixin(object):
    """Wrap a MBObjectMonitor instance methods."""
    def __init__(self):
        super(MBMonitorMixin, self).__init__()

        self.monitor = MBObjectMonitor()

    def track(self, *args, **kwargs):
        self.monitor.track(*args, **kwargs)

    def start_event(self, *args, **kwargs):
        return self.monitor.start_event(*args, **kwargs)

    def end_event(self, *args, **kwargs):
        self.monitor.end_event(*args, **kwargs)

    @property
    def metrics(self):
        return self.monitor.metrics

    @property
    def events(self):
        return self.monitor.events
