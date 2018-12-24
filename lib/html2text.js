const mustache = require('mustache')
const htmlparser = require('htmlparser2')

function html2text (html) {
  let title = ''
  let inTitle = false
  let body = ''
  let inBody = false
  const parser = new htmlparser.Parser({
    onopentag: function (name, attribs) {
      if (!inBody && name === 'title') {
        inTitle = true
      } else if (name === 'body') {
        inBody = true
      }
    },
    ontext: function (text) {
      if (inTitle) {
        title += text
      } else if (inBody) {
        body += text
      }
    },
    onclosetag: function (tagname) {
      if (inTitle && tagname === 'title') {
        inTitle = false
      } else if (inBody && tagname === 'body') {
        inBody = false
      }
    }
  }, { decodeEntities: true })
  parser.write(html)
  parser.end()
  title = mustache.escape(title)
  body = mustache.escape(body)
  return { title, body }
}

module.exports = { html2text }
