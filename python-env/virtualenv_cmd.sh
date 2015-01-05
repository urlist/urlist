#!/bin/bash

VIRTUAL_ENV=$1
if [ -z $VIRTUAL_ENV ]; then
    echo "usage: $0 &lt;/path/to/virtualenv&gt; &lt;cmds&gt;"
    exit 1
fi

. $VIRTUAL_ENV/bin/activate
shift 1
export PYTHONPATH=/srv/urlist:$PYTHONPATH
exec "$@"
deactivate
