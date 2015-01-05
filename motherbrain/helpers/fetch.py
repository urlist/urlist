import sys
import urlparse
import requests

from itertools import chain

from motherbrain.helpers.tlds import tlds


TLD_URL = 'http://data.iana.org/TLD/tlds-alpha-by-domain.txt'


def domain_by_netloc(netloc):
    all_levels = netloc.split('.')

    top_levels = [x for x in all_levels if x.upper() in tlds]
    other_levels = [x for x in all_levels if not x.upper() in tlds]

    if not other_levels:
        return None

    second_level = [other_levels.pop()]

    return '.'.join(list(chain(second_level, top_levels)))

def domain_by_url(url):
    if not url:
        return 'n/a'

    url_parts = urlparse.urlparse(url)

    if not hasattr(url_parts, 'netloc'):
        return None

    return domain_by_netloc(url_parts.netloc)


if __name__ == '__main__':
    url = sys.argv[1]

    print domain_by_url(url.lstrip().rstrip())
