"""Operations on urlists.urls.url"""

import datetime
import logging
import requests
import urlparse

from motherbrain.base import hash_generator
from motherbrain.helpers import slug
from bson.objectid import ObjectId
from bs4 import BeautifulSoup
from itertools import chain

SECTION_DEFAULT = 999
POSITION_DEFAULT = 0

REQ_TIMEOUT = 5

BINARY_FORMATS = ['pdf', 'png', 'gif', 'jpg', 'jpeg', 'zip', 'gz', 'exe']

slugify = slug.u_slugify

_get = lambda x: requests.get(x, verify=False, timeout=REQ_TIMEOUT)
_head = lambda x: requests.head(x, verify=False, timeout=REQ_TIMEOUT)

def _resource_name(url):
    url_parts = urlparse.urlparse(url)
    resource_name = url_parts.path.split('/')[-1]

    if not resource_name:
        return u'Untitled Link'

    return resource_name

def is_binary(url):
    filename = _resource_name(url)

    check_ext = lambda x: filename.endswith('.{}'.format(x))

    return any([check_ext(fmt) for fmt in BINARY_FORMATS])

def _fallback_title(url):
    return _resource_name(url)


def _url_data(url):
    handle_failure = lambda: {'title': _fallback_title(url),
                              'headers': {}}

    headers = {}

    if not is_binary(url):
        try:
            r = _get(url)
        except requests.exceptions.Timeout:
            return handle_failure()
    else:
        try:
            r = _head(url)
        except requests.exceptions.Timeout:
            return handle_failure()

    if not r.content:
        return handle_failure()

    try:
        content = BeautifulSoup(r.content, 'lxml')
    except:
        return handle_failure()

    if not hasattr(content.title, 'text'):
        return handle_failure()

    title = content.title.text

    if hasattr(r, 'headers'):
        if isinstance(r.headers, dict):
            headers = {k.lower(): v for k, v in r.headers.iteritems()}

    if any([x.attrs.get('content', '').lower() in ['sameorigin', 'deny']
            for x in content.find_all("meta")]):
        headers['x-frame-options'] = 'sameorigin'

    return {'title': title,
            'headers': headers}


def add(urls, list_hash=None, url=None, position=None, section=None,
        user_id=None, title=None, description=None, embed_handler=None,
        from_list_hash=None, from_url_hash=None):
    """Add given url to an urls array.

    If no position is given, the url will be on top of its
    section, or, if section is specified, on top of the section.

    """

    if section is None:
        section = 0

    if not title:
        url_data = _url_data(url)

        title = url_data.get('title')
        headers = url_data.get('headers')
    else:
        headers = {}

    if position is None:
        _positions = [i + 1 for i, x in enumerate(urls)
                      if x.get('section') == section]

        if _positions and len(_positions):
            position = _positions.pop(0)

    position = position or 1

    denied_frame_opts = ["sameorigin", "deny"]
    frame_opts = headers.get("x-frame-options", "")

    if str(frame_opts).lower() in denied_frame_opts:
        embed_handler  = 'unsupported'

    url_hash = hash_generator()

    data = {'title'     : title,
            'slug'      : '-'.join([url_hash, slugify(title or 'untitled link')]),
            'list_hash' : list_hash,
            'hash'      : url_hash,
            'url'       : url,
            'section'   : section,
            'description': description,
            'user_id'   : str(user_id),
            'position'  : position,
            'from_list_hash': from_list_hash,
            'from_url_hash': from_url_hash,
            'embed_handler': embed_handler,
            'creation_time': datetime.datetime.now()}

    urls.insert(position - 1, data)

    return urls


def remove(urls, url_hash=None):
    predicate = lambda x: not x.get('hash') == url_hash
    urls = filter(predicate, urls)

    return urls


def sort_by_position(urls, *args, **kwargs):
    """Sort urlist urls using position as key"""
    return sorted(urls, key=lambda x: x.get('position'))


def sort_by_section(urls, *args, **kwargs):
    """Sort urlist urls by section and position"""
    return sorted(urls, key=lambda x: (x.get('section', SECTION_DEFAULT),
                                       x.get('position')))


def update_position(urls, *args, **kwargs):
    """Add a position key to urlist urls by using index number
    Position is 1-based index"""
    def set_pos(i, x):
        x['position'] = i + 1

        return x

    return [set_pos(i, x) for i, x in enumerate(urls)]


def swap(urls, url_hash=None, position=None, section=None):
    """Taken an url (A) and a @position argument representing the
    new position of the url, this function will swap the element
    occupying it (B) with A.
    """
    items_to_swap = [(i, x) for i, x in enumerate(urls)
                     if x.get('position') == position or
                        x.get('hash') == url_hash]

    if not len(items_to_swap) == 2:
        return urls

    item_a_index, item_b_index = [i for i, x in items_to_swap]
    urls[item_b_index], urls[item_a_index] = [x for i, x in items_to_swap]

    for i, x in enumerate(urls):
        x['position'] = i + 1

    return urls


def move(urls, url_hash=None, new_position=None, new_section=None):
    """Move an url to the specified @position (1-based index),
    does not update other items position attribute"""

    if new_position is None:
        new_position = 1

    url, old_position = [(x, i + 1) for i, x in enumerate(urls)
                         if x.get('hash') == url_hash].pop()

    if new_section is not None:
        url['section'] = new_section

    if abs(old_position - new_position) == 1:
        return swap(urls, url_hash, new_position, new_section)

    urls.remove(url)
    new_position -= 1

    lower_elems = urls[:new_position]
    higher_elems = urls[new_position:len(urls)]

    return list(chain(lower_elems, [url], higher_elems))


def exists(urls, url=None):
    """ Check if a given url exists in a given list. """

    return len([x for x in urls if x.get('url') == url])


def fetch_favicon(url_data):
    """Retrieve URL data by making a request"""
    def _undeclared_favicon(url_addr):
        """ Favicon is not declared in head section.

        Try by searching for:
            schema://netloc/favicon.ico
            (example: http://foo.com/favicon.ico)

        """

        if not url_addr:
            return None

        urldata = urlparse.urlparse(url_addr)

        if not urldata.netloc and urldata.scheme:
            return None

        base_url = '://'.join([urldata.scheme, urldata.netloc])
        favicon_url = urlparse.urljoin(base_url, 'favicon.ico')

        r = requests.head(favicon_url)

        if not r.status_code in [200, 301]:
            return None

        return favicon_url

    def _placeholder(url_addr=None):
        """ Return urlist placeholder favicon. """
        return _undeclared_favicon(url_addr) or \
               'http://urli.st/img-v0.6/favicon-placeholder.png'

    def _fetch(url_addr):
        r = requests.get(url_addr, timeout=REQ_TIMEOUT)
        soup = BeautifulSoup(r.content, 'lxml')

        return soup

    url_addr = url_data.get('url')

    try:
        doc = _fetch(url_addr)
    except:
        # Fetch fail, bailout
        return _placeholder(url_addr)

    favicon = doc.find("link", rel="shortcut icon")

    if not favicon:
        # No favicon, return placeholder
        return _placeholder(url_addr)

    favicon_href = favicon.get('href')

    if not favicon_href:
        # there is a 'shortcut icon' link element, but no href attribute
        return _placeholder()

    favicon_urldata = urlparse.urlparse(favicon_href)
    urldata = urlparse.urlparse(url_addr)

    if not favicon_urldata.scheme:
        # Hipster frontend guys like to omit uri scheme,
        # we get it from the original url
        _base_url = '://'.join([urldata.scheme, urldata.netloc])
        favicon_fullurl = urlparse.urljoin(_base_url, favicon_href)
    else:
        favicon_fullurl = favicon_href

    return favicon_fullurl


