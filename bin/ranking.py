#!/usr/bin/python

import pymongo
import datetime

db = pymongo.Connection("mongo1").urlist

def calculate_list_rank(list_data):
    now = datetime.datetime.now()
    last_action_time = list_data.get('last_action_time', list_data.get('creation_time'))

    bookmarks = float(len(list_data.get('followers')))
    views = float(list_data.get('views_amount', 0))

    oldness = float((now - last_action_time).days)

    rank = ((0.5 * (bookmarks * bookmarks)) + (0.1 * views)) * (1 / (oldness + 1))

    return float(rank)

if __name__ == '__main__':
    xs = db.urlists.find({'hash': {'$ne': None}})

    for x in xs:
        list_hash = x.get('hash')
        list_rank = calculate_list_rank(x)

        if list_rank <= 0:
            continue

        print "{} --- {}".format(x.get('hash'), list_rank)

        db.urlists.update({'hash': list_hash}, {'$set': {'popularity': list_rank}})
