const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const debug = require('debug')('express-sqlite-search')
const express = require('express')
const path = require('path')
const { prepareMustacheOverlays, setupErrorHandlers } = require('express-mustache-overlays')
const { makeStaticWithUser, setupMiddleware } = require('express-mustache-jwt-signin')
const { connect } = require('../lib/index.js')
const { html2text } = require('../lib/html2text.js')

const port = process.env.PORT || 80
const scriptName = process.env.SCRIPT_NAME || ''
if (scriptName.endsWith('/')) {
  throw new Error('SCRIPT_NAME should not end with /.')
}
const dbDir = process.env.DB_DIR
if (!dbDir) {
  throw new Error('No DB_DIR environment variable set to specify the path of the editable files.')
}
const secret = process.env.SECRET
const signInURL = process.env.SIGN_IN_URL || '/user/signin'
const signOutURL = process.env.SIGN_OUT_URL || '/user/signout'
const disableAuth = ((process.env.DISABLE_AUTH || 'false').toLowerCase() === 'true')
if (!disableAuth) {
  if (!secret || secret.length < 8) {
    throw new Error('No SECRET environment variable set, or the SECRET is too short. Need 8 characters')
  }
  if (!signInURL) {
    throw new Error('No SIGN_IN_URL environment variable set')
  }
} else {
  debug('Disabled auth')
}
const disabledAuthUser = process.env.DISABLED_AUTH_USER
const mustacheDirs = process.env.MUSTACHE_DIRS ? process.env.MUSTACHE_DIRS.split(':') : []
const publicFilesDirs = process.env.PUBLIC_FILES_DIRS ? process.env.PUBLIC_FILES_DIRS.split(':') : []
const publicURLPath = process.env.PUBLIC_URL_PATH || scriptName + '/public'
const searchTitle = process.env.SEARCH_TITLE || 'Search'
const apiToken = process.env.API_TOKEN
if (typeof apiToken === "undefined") {
  throw new Error('No API_TOKEN environment variable set to specify the value that will be accepted for an Authorization header to the /index endpoint')
}
const main = async () => {
  const search = await connect(path.join(dbDir, 'search.db'))
  const app = express()
  app.use(cookieParser())

  const overlays = await prepareMustacheOverlays(app, { scriptName, publicURLPath })

  app.use((req, res, next) => {
    // debug('Setting up locals')
    res.locals = Object.assign({}, res.locals, { publicURLPath, scriptName, title: searchTitle, signOutURL: signOutURL, signInURL: signInURL })
    next()
  })

  let { withUser } = await setupMiddleware(app, secret, { overlays, signOutURL, signInURL })
  if (disableAuth) {
    withUser = makeStaticWithUser(JSON.parse(disabledAuthUser || 'null'))
  }

  app.use(withUser)

  overlays.overlayMustacheDir(path.join(__dirname, '..', 'views'))
  overlays.overlayPublicFilesDir(path.join(__dirname, '..', 'public'))

  // Set up any other overlays directories here
  mustacheDirs.forEach(dir => {
    debug('Adding mustache dir', dir)
    overlays.overlayMustacheDir(dir)
  })
  publicFilesDirs.forEach(dir => {
    debug('Adding publicFiles dir', dir)
    overlays.overlayPublicFilesDir(dir)
  })

  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json())

  app.post(scriptName + '/index', async (req, res, next) => {
    try {
      if (apiToken && req.get('Authorization') !== apiToken) {
        // res.render('403', { } )
        res.status(403).json({ error: '403 Forbidden' })
        return
      }
      debug(req.body)
      const { id, action, html } = req.body
      if (action !== 'put' && action !== 'remove') {
        const msg = 'Invalid action: ' + action
        debug(msg)
        throw new Error(msg)
      }
      if (!id.startsWith('/')) {
        const msg = 'id does not start with /: ' + id
        debug(msg)
        throw new Error(msg)
      }
      if (action === 'put') {
        const { body, title } = html2text(html)
        debug('Putting', id, body)
        const pub = true
        await search.put(id, title, body, pub)
      } else {
        debug('Removing', id)
        await search.remove(id)
      }
      res.json({ ok: 'ok' })
    } catch (e) {
      debug(e)
      next(e)
    }
  })

  app.all(scriptName, async (req, res, next) => {
    try {
      let searchError = ''
      const action = req.path
      let searchTerm = ''
      let results = [] // = [{title: 'Title', link: 'Link', body: 'Body'}]
      if (req.method === 'POST') {
        searchTerm = req.body.search
        if (searchTerm) {
          const a = await search.search(searchTerm)
          for (let result of a) {
            results.push({ link: result.id, title: result.title, body: result.snippet })
          }
          debug(results)
        }
      }
      res.render('search', { results, haveResults: results.length, title: searchTitle, search: searchTerm, searchError, action })
    } catch (e) {
      debug(e)
      next(e)
    }
  })

  overlays.setup()

  setupErrorHandlers(app)

  app.listen(port, () => console.log(`Example app listening on port ${port}`))
}

main()

// Better handling of SIGNIN for docker
process.on('SIGINT', function () {
  console.log('Exiting ...')
  process.exit()
})
