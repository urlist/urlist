#!/bin/bash

supervisor_is_running=`ps -u root | grep supervisord | wc -l`
rand=$RANDOM

if [ $supervisor_is_running -eq 1 ] ; then
    echo "Shutting down supervisord"
    supervisorctl stop all
    supervisorctl shutdown
fi

if [ -f /etc/supervisord.conf ] ; then
    echo "Removing old supervisord files"
    rm -rf /etc/supervisord*
fi

cp -r $URLIST/conf/supervisor* /etc

if [ -d /etc/nginx/conf.d ] ; then
    echo "Moving old nginx conf files to conf.d.$rand"
    mv /etc/nginx/conf.d/ /etc/nginx/conf.d.$rand
fi

cp -r $URLIST/conf/nginx/conf.d /etc/nginx/

cp $URLIST/conf/boto /root/.boto

crontab $URLIST/conf/crontab.txt
