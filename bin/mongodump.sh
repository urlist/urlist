#!/bin/bash

DATE=`date +"%Y%m%d"`

cd /root/backups
mongodump --host mongo1

tar czf $DATE.tar.gz dump
rm -rf dump

supervisorctl restart workers
