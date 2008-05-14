print 'Content-Type: text/plain'
print ''
cur = file("current.xml","r")
print cur.read()
cur.close()

