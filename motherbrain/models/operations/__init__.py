from itertools import chain


class MBPipe(object):
    """Pipe functions
    Collect results from a function and pass it to next function in pipe
    as first argument.

    @data -> initial data
    @functions -> functions to apply

    Return the result of the last function
    """
    def __init__(self, data, *functions):
        self.data = data
        self.initial_data = data
        self.functions = functions

    def __call__(self, *args, **kwargs):
        [setattr(self, 'data', f(self.data, *args, **kwargs))
         for f in self.functions]

        return self.data
