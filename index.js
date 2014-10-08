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

var sort = function(a, b) {
  return (a.type+'/'+a.name).localeCompare(b.type+'/'+b.name)
}

drop(document.body, function(files) {
  document.getElementById('text').style.display = 'none'
  document.getElementById('spinner').style.display = 'block'

  document.title = 'Processing...'

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
        window.location = '#/d'+path.join('/', cwd)
      })

      br.on('file', function(cwd) {
        window.location = '#/f'+path.join('/', cwd)
      })

      br.appendTo('#browser')

      window.onhashchange = function() {
        var hash = location.hash.slice(1)
        var type = hash[1] === 'f' ? 'file' : 'directory'
        var cwd = hash.slice(2) || '/'

        if (cwd !== '/') cwd = cwd.replace(/\/$/, '')

        document.title = cwd

        if (hash[0] === 'f') br.file(cwd, files[cwd] || '(file cannot be displayed)')
        else br.directory(cwd, (directories[cwd] || []).sort(sort))
      }

      window.onhashchange()
    })
})
