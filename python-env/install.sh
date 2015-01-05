cd $URLIST
cd python-env

virtualenv env
source env/bin/activate

pip install tornado==2.4
pip install pymongo==2.4.1
pip install pyzmq 
pip install pillow
pip install lxml
pip install Beautifulsoup4
pip install requests
pip install simplejson
pip install slugify
pip install mailsnake

deactivate
