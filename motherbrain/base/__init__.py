import string
import random
import hmac
import hashlib

from itertools import chain


def hash_generator(size=3):
    """Generate a random hash of lowercase letters and digits of size @size

    >>> len(hash_generator()) == 3
    True
    >>> len(hash_generator(5)) == 5
    True
    """

    choices = list(chain(string.ascii_lowercase, string.digits))
    return ''.join(random.choice(choices) for x in range(size))

def crypt_password(salt, password):
    """

    >>> clear_password = 'Foobar'
    >>> salt = 'fattyFattyNoParent'
    >>> p1 = crypt_password(salt, clear_password)
    >>> p2 = crypt_password(salt, clear_password)
    >>> p3 = crypt_password(salt.upper(), clear_password)
    >>> p1 == p2
    True
    >>> p1 == p3
    False
    """

    return hmac.new(salt, password, hashlib.sha256).hexdigest()


if __name__ == "__main__":
    import doctest
    doctest.testmod()
