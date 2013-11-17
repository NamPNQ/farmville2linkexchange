#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
import datetime
import uuid

import webapp2
from google.appengine.ext import ndb
from google.appengine.api import memcache
from google.appengine.api import channel


class Item(ndb.Model):
    create_by = ndb.StringProperty()
    message = ndb.StringProperty()
    picture = ndb.StringProperty()
    link = ndb.StringProperty()
    click = ndb.StringProperty(repeated=True)
    create_at = ndb.StringProperty()

class UserHandler(webapp2.RequestHandler):
    def get(self):
        import json
        self.response.headers['Content-Type'] = "application/json"

        user_id = self.request.get('user_id')
        if user_id and user_id != 'Anonymous':
            self.response.write(json.dumps([item.to_dict() for item in
                                            Item.query(Item.create_by == user_id).fetch(
                                                100)]))
        else:
            self.abort(401)

class ItemHandler(webapp2.RequestHandler):
    def get(self):
        import json

        self.response.headers['Content-Type'] = "application/json"
        user_id = self.request.get('user_id')
        if user_id and user_id != 'Anonymous':
            self.response.write(json.dumps([item.to_dict() for item in
                                             [res for res in Item.query().filter(Item.click != user_id).fetch(100) if res.create_by != user_id]]))
        else:
            self.response.write(json.dumps([item.to_dict() for item in Item.query().fetch(100)]))

    def post(self):
        import json
        import datetime

        request = self.request.body
        info = json.loads(request)
        item = Item.query(Item.link == info.get("link")).fetch()
        if not item:
            item = Item(message=info.get("message"), picture=info.get("picture"),
                        link=info.get("link"), create_at=str(datetime.datetime.now()), create_by=info.get("user_id"))
            item.put()
            self.response.headers['Content-Type'] = "application/json"
            self.response.write(json.dumps({"status": "done"}))

    def put(self):
        import json

        request = self.request.body
        info = json.loads(request)
        item = Item.query(Item.link == info.get("link")).fetch(1)
        if item:
            item = item[0]
            item.click.append(info.get("userid"))
            item.put()
            self.response.headers['Content-Type'] = "application/json"
            self.response.write(json.dumps({"status": "done"}))


class MainHandler(webapp2.RequestHandler):
    def get(self):
        self.response.write('Hello world!')


app = webapp2.WSGIApplication([
                                  ('/', MainHandler),
                                  ('/api/farmville2/item', ItemHandler),
                                  ('/api/farmville2/me', UserHandler)
                              ], debug=True)

