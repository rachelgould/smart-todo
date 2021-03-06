exports.up = function (knex, Promise) {
  return Promise.all([
    knex.schema.createTable('users', function (table) {
      table.increments('id');
      table.string('email');
      table.string('password');
    }),
    knex.schema.createTable('categories', function (table) {
      table.increments('id');
      table.string('name');
      table.string('api');
      table.integer('user_id')
        .references('id')
        .inTable('users')
        .onDelete('cascade');
    }),
    knex.schema.createTable('tasks', function (table) {
      table.increments('id');
      table.string('name');
      table.boolean('completed');
      table.integer('category_id')
        .references('id')
        .inTable('categories')
        .onDelete('cascade');
    })
  ])
};

exports.down = function (knex, Promise) {
  return Promise.all([
    knex.raw('DROP TABLE users CASCADE'),
    knex.raw('DROP TABLE categories CASCADE'),
    knex.raw('DROP TABLE tasks CASCADE'),
  ])
};
