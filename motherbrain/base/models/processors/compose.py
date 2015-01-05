from motherbrain.base.models import processors


def extract_key(data, key):
    if isinstance(data, list):
        return [extract_key(x, key) for x in data]
    elif isinstance(data, dict):
        if not key:
            return data.keys()

        return data.get(key)

    return 'Unsupported'


def count(x):
    if not hasattr(x, '__len__'):
        return 0

    return len(x)


def wrap_in_list(x):
    if not isinstance(x, list):
        return [x]

    return x
