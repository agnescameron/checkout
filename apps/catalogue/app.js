const express = require('express')

const CatalogueController = require('./controller')
const auth = require('../../src/js/authentication')

const app = express()

app.set('views', __dirname + '/views')

app.use((req, res, next) => {
	req.controller = new CatalogueController()
	next()
})

app.get('/', auth.currentUserCanOrOptionOverride('view_catalogue', 'public_catalogue'), (req, res) => {
	req.controller.getRoot(req, res)
})

app.get('/md', auth.currentUserCanOrOptionOverride('view_catalogue'), (req, res) => {
	req.controller.getMarkdown(req, res)
})

module.exports = config => app
