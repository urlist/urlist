import inspect

from functools import wraps

from motherbrain import conf


class Unauthorized(Exception):
    def __init__(self, entity_name, entity_value, detail=None):
        self.entity_name = entity_name
        self.entity_value = entity_value
        self.detail = detail

    def __str__(self):
        msg = 'Authorization Denied for {}: {}'.format(self.entity_name,
                                                       self.entity_value)

        if self.detail:
            msg = ', '.join([msg, self.detail])

        return msg


def action(action_cluster):
    def decorator(f):
        def wrapped(*args, **kwargs):
            # preserve wrapped decorated function argspec
            wrapped.argspec = lambda: inspect.getargspec(f)

            return f(*args, **kwargs)

        wrapped.is_action = True
        wrapped.action_cluster = action_cluster

        return wraps(f)(wrapped)
    return decorator


def secure_action(query_callback, action_cluster):
    """Secure Action Decorator

    query_callback -- a method which should return
                      a tuple (identity, identity_value)

    Identity should be the key used to fetch the result (identity_value)

    query_callback will be invoked as follow:
        query_callback(context)

    query_callback should search for authentication key value
    in @context

    Example:
        def callback_example(context):
            username = context.get('username')

            authorized_users = {'joe': ['Joe', 'White', 'joe@foo.com'],
                                'moe': ['Moe', 'Black', 'moe@bar.com']}

            if username in authorized_users:
                return (username, authorized_users[username])

            return (username, None)
    """
    def decorator(f):
        @action(action_cluster)
        def wrapped(*args, **kwargs):
            context = args[0]

            identity, identity_value = query_callback(context)

            if not identity_value:
                raise Unauthorized('user', identity, 'no match')

            return f(*args, **kwargs)

        # preserve wrapped decorated function argspec
        wrapped.argspec = lambda: inspect.getargspec(f)

        return wraps(f)(wrapped)
    return decorator
