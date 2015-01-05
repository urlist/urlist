import os
import shutil
import logging
import uuid

from zipfile import ZipFile


class MBUserDir(object):
    def __init__(self, datadir, username, exit_callback=None):
        self.username = username
        self.datadir = datadir
        self.exit_callback = exit_callback

        self._id = str(uuid.uuid4())
        self.unique_dir = os.path.join(datadir, self._id)
        self.dirname = os.path.join(self.unique_dir, self.username)

        self.initial_dir = None
        self.callback_result = None

    def __enter__(self):
        if os.path.exists(self.dirname):
            try:
                shutil.rmtree(self.dirname)
            except:
                pass

        os.makedirs(self.dirname)
        self.initial_dir = os.getcwd()
        os.chdir(self.dirname)

        return self

    def __exit__(self, exc_type, exc_value, traceback):
        if self.exit_callback:
            self.exit_callback(self)

        os.chdir(self.initial_dir)

        try:
            shutil.rmtree(self.unique_dir)
        except IOError as e:
            logging.exception(e)

    @property
    def path(self):
        return self.dirname


def zipfile_callback(userdir, filename):
    zipfile_path = os.path.join(userdir.dirname, filename)

    files = os.listdir(userdir.dirname)

    with ZipFile(zipfile_path, 'w') as zipfile:
        [zipfile.write(x) for x in files]

    shutil.move(filename, userdir.datadir)

    return filename
