var Stream = require('stream') // haxx to fix browserify+readable-stream
var gunzip = require('gunzip-maybe')
var path = require('path')
var browser = require('file-browser-widget')
var drop = require('drag-and-drop-files')
var reader = require('filereader-stream')
var concat = require('concat-stream')
var tar = require('tar-stream')

var directories = {}
var files = {}

drop(document.body, function(files) {
  reader(files[0])
    .pipe(gunzip())
    .pipe(tar.extract())
    .on('entry', function(entry, stream, next) {
      var name = path.join('/', entry.name)
      var dir = path.dirname(name)

      if (!directories[dir]) directories[dir] = []
      if (name !== '/') directories[dir].push(entry)

      if (entry.type === 'directory' || entry.size > 100*1024) {
        stream.resume()
        next()
        return
      }

      stream.pipe(concat(function(data) {
        files[name] = data.toString()
        next()
      }))
    })
    .on('finish', function() {
      var br = browser()

      br.on('directory', function(cwd) {
        window.location = '#d'+path.join('/', cwd)
      })

      br.on('file', function(cwd) {
        window.location = '#f'+path.join('/', cwd)
      })

      br.appendTo('#browser')

      window.onhashchange = function() {
        var hash = location.hash.slice(1)
        var type = hash[0] === 'f' ? 'file' : 'directory'
        var cwd = hash.slice(1) || '/'

        if (cwd !== '/') cwd = cwd.replace(/\/$/, '')

        if (hash[0] === 'f') br.file(cwd, files[cwd] || '(file cannot be displayed)')
        else br.directory(cwd, directories[cwd] || [])
      }

      window.onhashchange()
    })
})
