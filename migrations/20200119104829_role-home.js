
exports.up = function(knex) {
	return knex.schema.table('roles', table => {
		table.string('home').defaultTo('/').notNullable()
	})
}

exports.down = function(knex) {
	return knex.schema.table('roles', table => {
		table.dropColumn('home')
	})
}
