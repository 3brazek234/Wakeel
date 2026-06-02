/**
 * Generic input-validation helper.
 *
 * @param {Object} rules – keyed by field name
 *   Each value is an object with optional keys:
 *     required  : boolean
 *     type      : 'string' | 'number' | 'email' | 'date' | 'array' | 'uuid'
 *     minLength : number  (strings)
 *     maxLength : number  (strings)
 *     min       : number  (numbers)
 *     max       : number  (numbers)
 *
 * @param {Object} data – the request body / params to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validate(rules, data) {
  const errors = [];
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (const [field, opts] of Object.entries(rules)) {
    const value = data[field];

    // Required check
    if (opts.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }

    // Skip further checks if value is absent and not required
    if (value === undefined || value === null) continue;

    // Type checks
    if (opts.type === 'string' && typeof value !== 'string') {
      errors.push(`${field} must be a string`);
    }
    if (opts.type === 'number' && typeof value !== 'number') {
      errors.push(`${field} must be a number`);
    }
    if (opts.type === 'email') {
      if (typeof value !== 'string' || !EMAIL_RE.test(value)) {
        errors.push(`${field} must be a valid email`);
      }
    }
    if (opts.type === 'date') {
      if (isNaN(Date.parse(value))) {
        errors.push(`${field} must be a valid date`);
      }
    }
    if (opts.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push(`${field} must be an array`);
      }
    }
    if (opts.type === 'uuid') {
      if (typeof value !== 'string' || !UUID_RE.test(value)) {
        errors.push(`${field} must be a valid UUID`);
      }
    }

    // String length
    if (typeof value === 'string') {
      if (opts.minLength && value.length < opts.minLength) {
        errors.push(`${field} must be at least ${opts.minLength} characters`);
      }
      if (opts.maxLength && value.length > opts.maxLength) {
        errors.push(`${field} must be at most ${opts.maxLength} characters`);
      }
    }

    // Numeric range
    if (typeof value === 'number') {
      if (opts.min !== undefined && value < opts.min) {
        errors.push(`${field} must be at least ${opts.min}`);
      }
      if (opts.max !== undefined && value > opts.max) {
        errors.push(`${field} must be at most ${opts.max}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Throws a structured 400 error if validation fails.
 * Convenient one-liner for service / route usage.
 */
export function assertValid(rules, data) {
  const result = validate(rules, data);
  if (!result.valid) {
    const err = new Error(result.errors.join('; '));
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
}
