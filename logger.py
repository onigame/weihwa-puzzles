from datetime import datetime
from datetime import timedelta
from google.appengine.ext import webapp
from google.appengine.ext import db

###############################
# A simple logging API

def LogOneEntry(content):
  entry = LogEntry()
  entry.content = content
  entry.datetime = datetime.now() 
  entry.put()
  return entry

# gets the last "num" log lines.
# we do this by having a window that increases exponentially
# until it is large enough (or too large).
def GetLastLogs(num):
  query = LogEntry.all()
  query.order("-datetime")
  results = query.fetch(num)
  results.reverse()
  return results

class LogEntry(db.Model):
  content = db.StringProperty()
  datetime = db.DateTimeProperty()

class LogWriter(webapp.RequestHandler):
  def get(self):
    self.response.headers['Content-Type'] = 'text/plain'
    if self.request.get('content') == "":
      self.response.out.write("Error: No content")
    else:
      LogOneEntry(self.request.get('content'))
      self.response.out.write("Stored %s" % self.request.get('content'))

class LogReader(webapp.RequestHandler):
  def get(self):
    query = Log.all()
    self.response.headers['Content-Type'] = 'text/plain'
    for result in query:
      self.response.out.write("%s\n" % result.content)

class LogReaderLast(webapp.RequestHandler):
  def get(self):
    entries = GetLastLogs(int(self.request.get('count')))
    self.response.headers['Content-Type'] = 'text/plain'
    for s in entries:
      if s:
        self.response.out.write("%s %s\n" % (s.datetime.isoformat(' '), s.content))

