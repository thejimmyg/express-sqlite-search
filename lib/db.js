const sqlite = require('sqlite')
const debug = require('debug')('express-sqlite-search')

async function connect (file) {
  const db = await sqlite.open(file, { Promise })
  await db.migrate() // { force: 'last' })

  async function put (id, title, doc, pub) {
    await remove(id)
    await db.run('INSERT INTO ft VALUES (?, ?)', id, doc)
    await db.run('INSERT INTO visibility(id, title, public) VALUES (?, ?, ?)', id, title, pub)
    debug('Put', id)
  }

  async function remove (id) {
    await db.run('DELETE FROM ft WHERE id=?', id)
    await db.run('DELETE FROM visibility WHERE id=?', id)
    debug('Removed', id)
  }

  async function search (query, publicOnly) {
    let qry = "SELECT ft.id as id, visibility.title as title, snippet(ft, 1, '<strong>', '</strong>', ' ... ', 5) as snippet FROM ft LEFT JOIN visibility on visibility.id = ft.id WHERE ft MATCH ? "
    if (publicOnly) {
      qry += 'AND visibility.public=TRUE'
    }
    debug('Searched for', query, 'public only:', publicOnly)
    return db.all(qry, query)
  }

  return { search, put, remove }
}

module.exports = { connect }
