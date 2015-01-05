import motherbrain.base
import motherbrain.base.db

from motherbrain.base.conf import get_config


_opts = {
    'database': {
        'dbname':  {'default': 'urlist'},
        'dbhost':  {'default': 'mongo1'},
        'dbport':  {'default': 27017, 'type': int},
        'dbusr':   {'default': ''},
        'dbpwd':   {'default': ''},
    }
}

settings = get_config(_opts)
db = motherbrain.base.db.get_db(settings)


def section_names(section_names):
    """Convert legacy section_names

    From this: {
                'section_1': 'Foo',
                'section_2': 'Bar'
               }

    To this:
                [
                 {'id': 1
                  'title': 'Foo',
                  'position': 1
                 },

                 {'id: 2,
                  'title': 'Bar',
                  'position': 2
                 }
                ]
    """
    if not section_names or isinstance(section_names, list):
        return section_names

    sections = []

    for k, title in section_names.iteritems():
        _, _, position = k.partition('_')

        sections.append({'id': int(position),
                         'title': title,
                         'position': int(position)})

    return sorted(sections, key=lambda x: x.get('position'))
