const mustache = require('mustache')
const htmlparser = require('htmlparser2')

function html2text (html) {
  let title = ''
  let body = ''
  let inTitle = false
  let inArticle = false
  let inAside = false
  const parser = new htmlparser.Parser({
    onopentag: function (name, attribs) {
      if (name === 'title') {
        inTitle = true
      } else if (name === 'article') {
        inArticle = true
      } else if (name === 'aside') {
        inAside = true
      }
    },
    ontext: function (text) {
      if (inTitle) {
        title += text
      } else if (inArticle || inAside) {
        body += text
      }
    },
    onclosetag: function (tagname) {
      if (inTitle && tagname === 'title') {
        inTitle = false
      } else if (inArticle && tagname === 'article') {
        inArticle = false
      } else if (inAside && tagname === 'aside') {
        inAside = false
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
