#!/bin/bash

export GOPATH=$URLIST/go

cd $URLIST

cd go

go get labix.org/v2/mgo
go get labix.org/v2/mgo/bson
go get code.google.com/p/go.net/html

go install urlist/fetch
go install urlist/seo
go install urlist/widget
go install urlist/embed
go install urlist/favicon
go install urlist/cloudsync
go install urlist/avatar
go install urlist/directory/listdir
go install urlist/directory/userdir
