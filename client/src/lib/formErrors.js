/**
 * Convert the backend's `error.details` array (`[{ field, message }]`, produced
 * by the Zod validation middleware) into a `{ field: message }` map that forms
 * can render inline next to each input.
 *
 * `fieldMap` translates server field names to the form's local field names,
 * e.g. `{ confirmPassword: 'confirm' }`.
 */
export function mapFieldErrors(details, fieldMap = {}) {
  const errors = {};
  if (!Array.isArray(details)) return errors;
  for (const detail of details) {
    const serverField = detail?.field;
    if (!serverField) continue;
    const field = fieldMap[serverField] || serverField;
    if (!errors[field]) errors[field] = detail.message;
  }
  return errors;
}

/** True when an API error carries field-level validation details. */
export function hasFieldErrors(error) {
  return Array.isArray(error?.details) && error.details.length > 0;
}

export default { mapFieldErrors, hasFieldErrors };
