class ClusterDoesNotExist(Exception):
    def __init__(self, cluster_name):
        self.cluster_name = cluster_name

    def __str__(self):
        return u'''Cluster '{}' does not exist'''.format(self.cluster_name)


class MBActionCluster(object):
    CLUSTERS = {'BASE':          {'id': 1},
                'FETCH':         {'id': 2},
                'MAIL_QUEUE':    {'id': 3},
                'SEARCH_QUEUE':  {'id': 4}}

    def __init__(self, name):
        if not name in self.CLUSTERS:
            raise ClusterDoesNotExist(name)

        self.name = name
        self.id = self.CLUSTERS.get(name).get('id')

    def __dict__(self):
        return {'name': self.name,
                'id': self.id}

    def __repr__(self):
        return u"{}".format(self.name)


BASE = MBActionCluster('BASE')
FETCH = MBActionCluster('FETCH')
MAIL_QUEUE = MBActionCluster('MAIL_QUEUE')
SEARCH_QUEUE = MBActionCluster('SEARCH_QUEUE')

