let searchTypeTimeout
let searchInput
let searchDropdown
let modalCover

// API Search Function
function search(term, cb) {term ? apiGET('find', term, cb) : null}

jQuery(document).ready(function() {
	searchInput = document.getElementById('search')
	searchInput.addEventListener('input', handleSearchInput)
	searchInput.addEventListener('focus', handleSearchInputFocus)
	document.addEventListener('keydown', handleKeyboardInput)
	window.addEventListener('resize', positionSearchDropdown)
})

function handleKeyboardInput(e) {
	// Alt + F - open search
	if (e.altKey && e.which == 70) {
		e.preventDefault()
		searchInput.focus()
	}

	// Alt + K - Go to kiosk
	if (e.altKey && e.which == 75) {
		e.preventDefault()
		window.location = '/checkout'
	}

	// Escape - empty search or close it
	if (document.activeElement === searchInput && e.which == 27) {
		e.preventDefault()

		if (searchInput.value == '') {
			searchInput.blur()
			removeSearchDropdown()
		} else {
			searchInput.value = ''
			clearSearchResults()
			jQuery(modalCover).fadeOut()
		}
	}
}

function handleSearchInputFocus() {
	if (searchInput.value) {
		searchTimer()
		searchInput.setSelectionRange(searchInput.selectionStart, searchInput.selectionEnd)
	}
}

function searchTimer() {
	if (!searchInput || searchInput.value) {
		createSearchDropdown()
	}

	search(searchInput.value, (data) => {
		clearSearchResults()

		// Process items
		if (data.items.length > 0) {
			lazyAddSearchDIV('item', 'Items', 'box')

			for (i in data.items) {
				addSearchResult(data.items[i], 'item', 'items', i > 4 ? 'none' : '')
			}

			if (data.items.length > 4) addOverflow('item')
		}

		// Process users
		if (data.users.length > 0) {
			lazyAddSearchDIV('user', 'Users', 'users')

			for (i in data.users) {
				addSearchResult(data.users[i], 'user', 'users', i > 4 ? 'none' : '')
			}

			if (data.users.length > 4) addOverflow('user')
		}

		if (data.users.length == 0 & data.items.length == 0) {
			addNoResultsFound()
		}
	})
}

function lazyAddSearchDIV(type, title, faclass) {
	if (searchDropdown && !searchDropdown.querySelector(`[data-type='${type}']`)) {
		const div = document.createElement('div')
		div.dataset.type = type

		const heading = document.createElement('h3')

		const span = document.createElement('span')
		span.classList.add('fa')
		span.classList.add('mr-2')
		span.classList.add(`fa-${faclass}`)
		heading.appendChild(span)

		heading.innerHTML += title

		searchDropdown.appendChild(div)
		searchDropdown.insertBefore(heading, div)
	}
}

function handleSearchInput(e) {
	if (searchInput.value == '') removeSearchDropdown()
	clearTimeout(searchTypeTimeout)
	searchTypeTimeout = setTimeout(searchTimer, 100)
}

function clearSearchResults() {
	if (searchDropdown) searchDropdown.innerText = ''
}

function addOverflow(type) {
	const a = document.createElement('a')
	a.classList.add('overflow')

	const span = document.createElement('span')
	span.classList.add('fas')
	span.classList.add('fa-ellipsis-h')
	a.appendChild(span)

	searchDropdown.querySelector(`[data-type=${type}]`).appendChild(a)
	a.addEventListener('click', (e) => {
		jQuery(e.target.parentElement.querySelectorAll('.object')).slideDown()
		jQuery(e.target).slideUp()
	})
}

function addSearchResult(object, type, path, display) {
	const a = document.createElement('a')
	a.classList.add('object')
	a.href = `/${path}/${object.id}`
	a.style.display = display

	if (type == 'item') a.appendChild(createStatusBadge(object.status))
	a.innerHTML += `<strong>${object.name}</strong><br>`
	a.innerHTML += `${object.barcode}`

	searchDropdown.querySelector(`[data-type=${type}]`).appendChild(a)
}

function addNoResultsFound() {
	searchDropdown.innerHTML = '<p>No results</p>'
}

function createStatusBadge(status) {
	const span = document.createElement('span')
	span.classList.add('badge')
	span.classList.add('mr-1')
	span.innerHTML = '&nbsp;'

	let badgeClass = 'default'

	switch (status) {
		case 'unavailable':
			badgeClass = 'success'
			break
		case 'available':
			badgeClass = 'success'
			break
		case 'on-loan':
			badgeClass = 'danger'
			break
		case 'lost':
		case 'broken':
			badgeClass = 'warning'
			break
		case undefined:
			break
		default:
			badgeClass = 'default'
			break
	}

	span.classList.add(`badge-${badgeClass}`)
	return span
}

function createSearchDropdown() {
	document.body.classList.add('noScroll')

	// Make search a modal
	if (!modalCover) {
		modalCover = document.createElement('div')
		modalCover.classList.add('modalCover')
		modalCover.style.display = 'none'
		document.body.appendChild(modalCover)
		modalCover.addEventListener('click', () => {
			removeSearchDropdown()
		})
	}
	jQuery(modalCover).fadeIn()

	// Add search dropdown
	if (!searchDropdown) {
		searchDropdown = document.createElement('div')
		searchDropdown.classList.add('searchList')
		positionSearchDropdown()
		searchDropdown.style.display = 'none'
		document.body.appendChild(searchDropdown)
	}
	jQuery(searchDropdown).slideDown()

}

function positionSearchDropdown() {
	if (searchDropdown) {
		const searchInputPosition = searchInput.getBoundingClientRect()
		searchDropdown.style.top = `${searchInputPosition.bottom}px`
		searchDropdown.style.width = `${searchInputPosition.width}px`
		searchDropdown.style.left = `${searchInputPosition.left}px`
	}
}

function removeSearchDropdown() {
	jQuery(modalCover).fadeOut()
	jQuery(searchDropdown).slideUp()
	document.body.classList.remove('noScroll')
}
