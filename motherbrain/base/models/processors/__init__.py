class Transform(object):
    """ Transform Processor Base Class

    Sub Classes should implement a '_transform' method,
    which handle the transformation, returning the trasformed value.

    Instance attribute 'value' holds the value to be transformed.

    Sub Class example:

    class Square(Transform):
        def _transform(self):
            return self.value * self.value

    >>> square = Square()
    >>> square(2)
    4
    """
    def __call__(self, value):
        self.value = value

        return self._transform()


class Compose(object):
    """ Composition Wrapper Processor

    Apply  a function to model fields values to create a new
    field.

    Usage:
    >>> c = Compose('foo', 'bar', using=lambda x: ', '.join(x))
    >>> data = {'foo': 'Foo', 'bar': 'Bar'}
    >>> c(data)

    'foo', 'bar' -- name of fields to lookup for in model data
    using        -- composing function applied to the fields values
    data         -- a dictionary with model data

    In this case lambda function receive the two argument packed in an array.
    If only a field is specified the argument is unpacked.

    >>> c = Compose('a_number', using=lambda x: x*x)

    As you see in this case there is no need to unpack.
    """
    def __init__(self, *args, **kwargs):
        self.fields = args
        self.compose = kwargs.get('using')
        self.override = kwargs.get('override', True)

    def __call__(self, data, context=None):
        """ Call

        data -- dictionary which should contain fields specified in
                class constructor

        """
        values = [data.get(k) for k in self.fields]

        if len(values) == 1:
            values = values[0]

        if context:
            return self.compose(values, **context)

        return self.compose(values)
