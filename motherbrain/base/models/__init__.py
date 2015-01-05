import inspect
import logging


class UnknownProcessor(Exception):
    def __init__(self, procname):
        self.procname = procname

    def __str__(self):
        return '''Unknown processor '{}' '''.format(self.procname)


class Collection(object):
    is_collection = True

    def __init__(self, model_cls, models_data):
        try:
            self.models = [model_cls(model_cls.fields, m)
                           for m in models_data
                           if hasattr(model_cls, 'fields')]
        except TypeError:
            self.models = [model_cls(m)
                           for m in models_data
                           if hasattr(model_cls, 'fields')]

        self.render_data = []

    def __iter__(self):
        return iter(self.models)

    def __call__(self, context=None):
        if not self.render_data:
            self.render_data = [model(context) for model in self]

        return self.render_data


class Processor(object):
    def __init__(self, processor):
        self.processor = processor

    def __call__(self, model_data=None, value=None, context=None):
        if hasattr(self.processor, '_transform'):
            return self._transform(value)
        elif hasattr(self.processor, 'compose'):
            return self._compose(model_data, context)
        elif hasattr(self.processor, 'is_collection'):
            return self._collection(value, context)

        raise UnknownProcessor(self.processor)

    def _transform(self, value, context=None):
        proc_inst = self.processor()

        return proc_inst(value)

    def _compose(self, data, context=None):
        compose_fun = self.processor.compose

        kwargs = {}

        all_args = inspect.getargspec(compose_fun)[0]
        all_args.pop(0)

        if context:
            kwargs = {k: context.get(k) for k in all_args
                      if context.get(k)}

        if not len(kwargs) == len(all_args):
            return None

        return self.processor(data, kwargs)

    def _collection(self, value, context):
        collection = self.processor(value)

        return collection(context)


class Field(object):
    def __init__(self, name, processors, initial_value):
        self.name = name

        if not (isinstance(processors, tuple) or
                isinstance(processors, list)):
            processors = [processors]

        self.skip = not any(processors)

        self.processors = [Processor(proc) for proc in processors]
        self.applied_processors = []
        self.value = initial_value

    def __call__(self, data=None, context=None):
        for p in self.processors:
            if hasattr(p.processor, 'override') and not self.value is None:
                if p.processor.override is False:
                    continue

            try:
                self.value = p(data, self.value, context)
                self.applied_processors.append(p)
            except UnknownProcessor as e:
                logging.warning(str(e))
                break

        return self.value

    def __repr__(self):
        args = [self.name,
                len(self.processors),
                len(self.applied_processors)]

        return '''Field: '{}' - {} Processors, ''' \
               '''{} applied'''.format(*args)


class Model(object):
    def __init__(self, fields, data):
        self.fields = [Field(name, processors, data.get(name))
                       for name, processors in fields]

        self.initial_data = data
        self.model_data = {x.name: x.value for x in self.fields}

        self.render_data = {}

    def __call__(self, context=None, raw_fields=None):
        if not raw_fields:
            raw_fields = []

        if not self.render_data:
            fields = [x for x in self.fields if not x.skip]
            render_data = self.model_data

            for field in fields:
                field_value = field.value

                if not field.name in raw_fields:
                    field_value = field(render_data, context)

                self.render_data[field.name] = field_value
                # FIXME - use update
                render_data = dict(self.model_data, **self.render_data)

        return self.render_data

    def __repr__(self):
        repr_str = 'Model - {} fields'.format(len(self.fields))

        if len(self.render_data):
            repr_str = '{} {}'.format('Rendered', repr_str)

        return repr_str
