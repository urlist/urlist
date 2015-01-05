from motherbrain.base.models import processors


class DummyMixin(processors.Transform):
    def _transform(self):
        return self.value


class DoNothing(DummyMixin):
    pass


class EnsureList(processors.Transform):
    def _transform(self):
        if isinstance(self.value, list):
            return self.value

        return [self.value]


class Count(processors.Transform):
    def _transform(self):
        if not hasattr(self.value, '__len__'):
            return 0

        return len(self.value)


class MongoOidToStr(processors.Transform):
    def _transform(self):
        from bson.objectid import ObjectId

        unwrap = lambda x: str(ObjectId(x))

        value = self.value

        if isinstance(self.value, dict):
            value = self.value.get('$oid')

        if isinstance(value, list):
            return [unwrap(x) for x in value]

        return unwrap(value)


class RemoveDuplicates(processors.Transform):
    def _transform(self):
        if not self.value:
            return []

        return list(set(self.value))


class MongoDateTimeToStr(processors.Transform):
    def _transform(self):
        try:
            return self.value.isoformat().partition('.')[0]
        except:
            return self.value


class Skip(DummyMixin):
    def _skip(self):
        pass


class Flatten(processors.Transform):
    def _transform(self):
        if isinstance(self.value, list):
            return self.value.pop(0)

        return self.value
