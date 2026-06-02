import { db } from './pool.js';

/**
 * A lightweight Model abstraction layer on top of raw SQL.
 * Respects the "NO ORM" rule by keeping queries relatively manual when complex,
 * but automates basic CRUD, validation, and lifecycle hooks.
 */
export class Model {
  /**
   * @param {Object} config
   * @param {string} config.table - The name of the table
   * @param {Object} config.schema - Definition of columns: { name: { type: 'string', required: true, primaryKey: true } }
   * @param {Object} [config.hooks] - Lifecycle hooks: { beforeCreate, afterCreate, beforeUpdate, afterUpdate }
   */
  constructor({ table, schema, hooks = {} }) {
    this.table = table;
    this.schema = schema;
    this.hooks = hooks;
  }

  /**
   * Validates data against the schema.
   */
  validate(data, isUpdate = false) {
    const errors = [];
    
    for (const [field, rules] of Object.entries(this.schema)) {
      const value = data[field];
      const isMissing = value === undefined || value === null;

      // Required check (skip if it's an update and field is not provided)
      if (rules.required && isMissing && !isUpdate) {
        errors.push(`Field '${field}' is required`);
        continue;
      }

      if (!isMissing) {
        // Basic type validation
        if (rules.type === 'string' && typeof value !== 'string') {
          errors.push(`Field '${field}' must be a string`);
        } else if (rules.type === 'number' && typeof value !== 'number') {
          errors.push(`Field '${field}' must be a number`);
        } else if (rules.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Field '${field}' must be a boolean`);
        } else if (rules.type === 'array' && !Array.isArray(value)) {
          errors.push(`Field '${field}' must be an array`);
        }
      }
    }

    if (errors.length > 0) {
      const err = new Error(errors.join(', '));
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
  }

  /**
   * Insert a new record into the database.
   */
  async create(data, client = db) {
    let payload = { ...data };

    // ── 1. Hook: beforeCreate ──
    if (this.hooks.beforeCreate) {
      payload = await this.hooks.beforeCreate(payload, client) || payload;
    }

    this.validate(payload, false);

    // Extract only fields that are defined in the schema
    const fields = Object.keys(payload).filter(k => this.schema[k] && payload[k] !== undefined);
    const values = fields.map(k => payload[k]);

    if (fields.length === 0) {
      throw new Error(`No valid fields provided to create ${this.table}`);
    }

    const columnsStr = fields.join(', ');
    const placeholdersStr = fields.map((_, i) => `$${i + 1}`).join(', ');

    // Execute raw SQL
    const sql = `INSERT INTO ${this.table} (${columnsStr}) VALUES (${placeholdersStr}) RETURNING *`;
    const { rows } = await client.query(sql, values);
    let record = rows[0];

    // ── 2. Hook: afterCreate ──
    if (this.hooks.afterCreate) {
      await this.hooks.afterCreate(record, client);
    }

    return record;
  }

  /**
   * Update an existing record.
   */
  async update(id, data, client = db) {
    let payload = { ...data };
    const pk = Object.keys(this.schema).find(k => this.schema[k].primaryKey) || 'id';

    // ── 1. Hook: beforeUpdate ──
    if (this.hooks.beforeUpdate) {
      payload = await this.hooks.beforeUpdate(id, payload, client) || payload;
    }

    this.validate(payload, true);

    const fields = Object.keys(payload).filter(k => this.schema[k] && payload[k] !== undefined);
    if (fields.length === 0) return this.findById(id, client); // Nothing to update

    const values = fields.map(k => payload[k]);
    const setStr = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    
    // Push the ID as the last parameter
    values.push(id);

    const sql = `UPDATE ${this.table} SET ${setStr} WHERE ${pk} = $${values.length} RETURNING *`;
    const { rows } = await client.query(sql, values);
    const record = rows[0];

    if (!record) {
      throw new Error(`Record with ${pk} = ${id} not found in ${this.table}`);
    }

    // ── 2. Hook: afterUpdate ──
    if (this.hooks.afterUpdate) {
      await this.hooks.afterUpdate(record, client);
    }

    return record;
  }

  /**
   * Find a record by its primary key.
   */
  async findById(id, client = db) {
    const pk = Object.keys(this.schema).find(k => this.schema[k].primaryKey) || 'id';
    const { rows } = await client.query(`SELECT * FROM ${this.table} WHERE ${pk} = $1`, [id]);
    return rows[0] || null;
  }
}
