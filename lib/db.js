const sqlite = require('sqlite')
const debug = require('debug')('express-sqlite-search')

async function connect (file) {
  const db = await sqlite.open(file, { Promise })
  await db.migrate() // { force: 'last' })

  async function put (id, title, doc, pub) {
    await remove(id)
    await db.run('INSERT INTO ft VALUES (?, ?)', id, doc)
    await db.run('INSERT INTO visibility(id, title, pub) VALUES (?, ?, ?)', id, title, pub)
    debug('Put', id)
  }

  async function remove (id) {
    await db.run('DELETE FROM ft WHERE id=?', id)
    await db.run('DELETE FROM visibility WHERE id=?', id)
    debug('Removed', id)
  }

  async function search (query, includePrivate, options) {
    const { limit = 20, offset = 0, ...rest } = options || {}
    if (Object.keys(rest).length > 0) {
      throw new Error('Unknown search options: ' + (Object.keys(rest).join(', ')))
    }
    let qry = "SELECT ft.id as id, visibility.pub as pub, visibility.title as title, snippet(ft, 1, '<strong>', '</strong>', ' ... ', 5) as snippet FROM ft LEFT JOIN visibility on visibility.id = ft.id WHERE ft MATCH ? AND (visibility.pub=1"
    if (includePrivate) {
      qry += ' OR visibility.pub=0'
    }
    qry += ') LIMIT ? OFFSET ?'
    debug('Searched for', query, 'includePrivate:', includePrivate)
    return db.all(qry, query, limit, offset)
  }

  return { search, put, remove }
}

module.exports = { connect }
