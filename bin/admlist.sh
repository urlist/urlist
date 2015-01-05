#!/bin/bash

cd /srv/www/urlist-go
cd bin

./admlist --hash=t13 &> /srv/www/urlist-go/log/admlist-stderr.log
./admlist --hash=091 &>> /srv/www/urlist-go/log/admlist-stderr.log
