Motherbrain
============

Motherbrain is part of Urlist backend.
It provide actions through the `action` module.

`MBWorker` class provide an ioloop accepting ZMQ messages
and dispatching. During instantiation of MBWorker you have to pass
a module containing action.
Once a ZMQ message is received a function call is performed using 
message parameters.


### Action example

```python
@secure_action(_urlist_auth, clusters.BASE)
def fetch_list(context, list_hash=None):
    """Fetch a document from urlists collection by list hash"""
    user_id = context.get('current_user_id')
    data = db.urlists.find_one({'hash': list_hash})

    if not data:
        raise OperationalError("List with hash '{}' does not exist.".format(list_hash))

    ...

    return {'foo': 'bar'}
```

This actions is a secure action, meaning that before executing it the `current_user_id`
value contained in context will be checked against the mongodb `users` collection.
In case of no-match, a `Unauthorized` exception will be raised.

`context` contains data from the caller, (usually the API Server), `current_user_id` is mandatory.
Other keyword arguments are filled using `MBMessage.payload`.


### Available actions module

There are two actions module currently implemented:

- **urlist**: contains all the actions that perform read/write on urlists data collection
- **mailing**: contains all the actions that perform actions against **mandrill api**

- [TO BE REMOVED] **search**: contains all the actions that perform read/write on **whoosh**


### Action dispatching

Worker dispatcher has two basic namespaces:

- action
- admin

If no namespace is specified, action namespace will be used.
Admin namespace is used for administrative task, mainly to get a list of function
implemented by the action module.

If namespace is specified, a method with name: `_namespace_dispatch' will be searched for
(example: `foobar:foo` will search for `_foobar_dispatch` method) raising `DispatcherDoesNotExist`
exception if does not exist.

### Diagram
[Here](https://github.com/urlist/urlist/blob/master/docs/mbworker_diagram.png)
