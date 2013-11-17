__author__ = 'nampnq'

import logging
from main import Item
from google.appengine.ext import deferred
from google.appengine.ext import ndb

BATCH_SIZE = 100  # ideal batch size may vary based on entity size.

def UpdateSchema(cursor=None, num_updated=0):
    query = Item.query()

    to_put = []
    res, cursor, more = query.fetch_page(BATCH_SIZE, start_cursor=cursor)
    for p in res:
        # In this example, the default values of 0 for num_votes and avg_rating
        # are acceptable, so we don't need this loop.  If we wanted to manually
        # manipulate property values, it might go something like this:
        p.create_by = 'Anonymous'
        to_put.append(p)

    if to_put:
        ndb.put_multi(to_put)
        num_updated += len(to_put)
        logging.debug(
            'Put %d entities to Datastore for a total of %d',
            len(to_put), num_updated)
        deferred.defer(
            UpdateSchema, cursor=cursor, num_updated=num_updated)
    else:
        logging.debug(
            'UpdateSchema complete with %d updates!', num_updated)