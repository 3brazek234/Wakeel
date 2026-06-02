import { Model } from '../../db/model.js';

export const UserModel = new Model({
  table: 'users',
  schema: {
    id:            { type: 'string', primaryKey: true },
    full_name:     { type: 'string', required: true },
    email:         { type: 'string', required: true },
    phone:         { type: 'string', required: false },
    bar_id:        { type: 'string', required: true },
    password_hash: { type: 'string', required: true },
    status:        { type: 'string', required: false },
    created_at:    { type: 'string', required: false }
  },
  hooks: {
    beforeCreate: async (data, client) => {
      // Example of a hook: hash the password before inserting if it was provided as raw password
      if (data.password) {
        data.password_hash = await Bun.password.hash(data.password, { algorithm: 'bcrypt', cost: 10 });
        delete data.password;
      }
      return data;
    },
    afterCreate: async (record, client) => {
      // Example of an after hook: log the creation or trigger an email
      console.log(`[UserModel Hook] New user created: ${record.email}`);
    }
  }
});
