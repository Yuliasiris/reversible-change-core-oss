// Immutable JSON change algebra. Caller owns authorization and wire version.
export function createChangeSet(projectState, request, schemaVersion) {
  if (!nonEmpty(schemaVersion)) throw new TypeError("missing caller wire version");
  assertCanonicalJsonValue(projectState, "projectState");
  assertPlainRecord(projectState, "projectState");
  assertCanonicalJsonValue(request, "change request");
  assertPlainRecord(request, "change request");
  if (!nonEmpty(request?.change_id) || !nonEmpty(request?.axis)
    || !Array.isArray(request?.untouched_axes) || !request.untouched_axes.every(nonEmpty)) {
    throw new TypeError("invalid change request");
  }
  parseAxis(request.axis);
  for (const untouchedAxis of request.untouched_axes) parseAxis(untouchedAxis);
  assertCanonicalJsonValue(request.from, "change request from");
  assertCanonicalJsonValue(request.to, "change request to");
  if (request.untouched_axes.some((axis) => pathsOverlap(axis, request.axis))) {
    throw new TypeError("changed axis conflicts with untouched axis");
  }
  const current = readAxis(projectState, request.axis);
  if (!sameValue(current, request.from)) throw new RangeError("change preimage mismatch");
  const changeSet = {
    schema_version: schemaVersion,
    change_id: request.change_id,
    changed_axis: request.axis,
    untouched_axes: [...request.untouched_axes],
    forward: { axis: request.axis, from: cloneJsonValue(request.from), to: cloneJsonValue(request.to) },
    inverse: { axis: request.axis, from: cloneJsonValue(request.to), to: cloneJsonValue(request.from) },
  };
  return deepFreeze(changeSet);
}

/** @param {Record<string, unknown>} projectState @param {ReturnType<typeof createChangeSet>} changeSet */
export function applyChangeSet(projectState, changeSet) {
  assertChangeSet(changeSet);
  return applyAxisTransition(projectState, changeSet.forward);
}

/** @param {Record<string, unknown>} projectState @param {ReturnType<typeof createChangeSet>} changeSet */
export function applyExactInverse(projectState, changeSet) {
  assertChangeSet(changeSet);
  return applyAxisTransition(projectState, changeSet.inverse);
}

/** @param {Record<string, unknown>} projectState @param {{axis:string,from:unknown,to:unknown}} transition */
function applyAxisTransition(projectState, transition) {
  assertCanonicalJsonValue(projectState, "projectState");
  assertPlainRecord(projectState, "projectState");
  const output = cloneJsonValue(projectState);
  const current = readAxis(output, transition.axis);
  if (!sameValue(current, transition.from)) throw new RangeError("change preimage mismatch");
  writeAxis(output, transition.axis, cloneJsonValue(transition.to));
  return deepFreeze(output);
}

/** Validate data, not provenance: approval still belongs to the caller. */
function assertChangeSet(changeSet) {
  assertCanonicalJsonValue(changeSet, "ChangeSet");
  assertPlainRecord(changeSet, "ChangeSet");
  if (!nonEmpty(changeSet.schema_version) || !nonEmpty(changeSet.change_id)
    || !nonEmpty(changeSet.changed_axis) || !Array.isArray(changeSet.untouched_axes)
    || !changeSet.untouched_axes.every(nonEmpty)) {
    throw new TypeError("invalid ChangeSet envelope");
  }
  parseAxis(changeSet.changed_axis);
  for (const axis of changeSet.untouched_axes) {
    parseAxis(axis);
    if (pathsOverlap(axis, changeSet.changed_axis)) {
      throw new TypeError("changed axis conflicts with untouched axis");
    }
  }
  for (const transition of [changeSet.forward, changeSet.inverse]) {
    assertPlainRecord(transition, "ChangeSet transition");
    if (transition.axis !== changeSet.changed_axis
      || !Object.hasOwn(transition, "from") || !Object.hasOwn(transition, "to")) {
      throw new TypeError("transition does not match changed axis");
    }
  }
  if (!sameValue(changeSet.forward.from, changeSet.inverse.to)
    || !sameValue(changeSet.forward.to, changeSet.inverse.from)) {
    throw new TypeError("forward and inverse are not symmetric");
  }
}

/** @param {Record<string, unknown>} object @param {string} axis */
function readAxis(object, axis) {
  return parseAxis(axis).reduce((value, key) => {
    if (!isPlainRecord(value) || !Object.hasOwn(value, key)) throw new TypeError(`unknown change axis: ${axis}`);
    return value[key];
  }, object);
}

/** @param {Record<string, unknown>} object @param {string} axis @param {unknown} value */
function writeAxis(object, axis, value) {
  const keys = parseAxis(axis);
  const finalKey = keys.pop();
  if (!finalKey) throw new TypeError("empty change axis");
  const parent = keys.reduce((current, key) => {
    if (!isPlainRecord(current) || !Object.hasOwn(current, key) || !isPlainRecord(current[key])) {
      throw new TypeError(`unknown change axis: ${axis}`);
    }
    return current[key];
  }, object);
  if (!isPlainRecord(parent) || !Object.hasOwn(parent, finalKey)) {
    throw new TypeError(`unknown change axis: ${axis}`);
  }
  parent[finalKey] = value;
}

/** @param {unknown} value */
export function stableJson(value) {
  assertCanonicalJsonValue(value, "stableJson input");
  return JSON.stringify(sortValue(value));
}

/** @param {unknown} value */
function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => compareCodeUnits(left, right))
      .map(([key, child]) => [key, sortValue(child)]));
  }
  return value;
}

/** @param {unknown} value */
export function deepFreeze(value, seen = new WeakSet()) {
  if ((Array.isArray(value) || isRecord(value)) && !seen.has(value)) {
    seen.add(value);
    if (!Object.isFrozen(value)) Object.freeze(value);
    // Traverse data descriptors even below a frozen parent, without running getters.
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of Reflect.ownKeys(descriptors)) {
      const descriptor = descriptors[key];
      if (Object.hasOwn(descriptor, "value")) deepFreeze(descriptor.value, seen);
    }
  }
  return value;
}

/** @param {unknown} value */
export function isRecord(value) {
  return value !== null && typeof value === "object" && !ArrayBuffer.isView(value);
}

/** @param {unknown} value */
export function isPlainRecord(value) {
  if (!isRecord(value) || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** @param {unknown} value */
export function nonEmpty(value) {
  return typeof value === "string" && value.length > 0;
}

/** @param {unknown} value */
export function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/** @param {unknown} value @param {string} name */
function assertPlainRecord(value, name) {
  if (!isPlainRecord(value)) throw new TypeError(`${name} must be a plain object`);
}

const FORBIDDEN_AXIS_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

/** @param {string} axis */
function parseAxis(axis) {
  if (!nonEmpty(axis)) throw new TypeError("empty change axis");
  const segments = axis.split(".");
  if (segments.some((segment) => !nonEmpty(segment) || FORBIDDEN_AXIS_SEGMENTS.has(segment))) {
    throw new TypeError(`unsafe change axis: ${axis}`);
  }
  return segments;
}

/** @param {unknown} value @param {string} name @param {Set<unknown>} [seen] */
export function assertCanonicalJsonValue(value, name, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${name} must contain only finite JSON numbers`);
    return;
  }
  if (typeof value !== "object") throw new TypeError(`${name} must be a canonical JSON value`);
  if (seen.has(value)) throw new TypeError(`${name} must not contain cycles`);
  seen.add(value);
  // JSON data excludes accessors, symbols and hidden fields. Inspect descriptors
  // without evaluating getters. Hostile Proxy objects are outside this API's contract.
  if (!Array.isArray(value) && !isPlainRecord(value)) {
    throw new TypeError(`${name} must contain only plain objects`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some(key => typeof key === "symbol")) {
    throw new TypeError(`${name} must not contain symbol keys`);
  }
  const dataKeys = Array.isArray(value) ? ownKeys.filter(key => key !== "length") : ownKeys;
  if (Array.isArray(value) && (dataKeys.length !== value.length
    || dataKeys.some((key, index) => key !== String(index)))) {
    throw new TypeError(`${name} must contain only dense array elements`);
  }
  for (const key of dataKeys) {
    const descriptor = descriptors[key];
    if (!Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
      throw new TypeError(`${name} must contain only enumerable data properties`);
    }
    if (FORBIDDEN_AXIS_SEGMENTS.has(key)) throw new TypeError(`${name} contains a forbidden key`);
    assertCanonicalJsonValue(descriptor.value, name, seen);
  }
  seen.delete(value);
}

/** @param {string} left @param {string} right */
export function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** @param {unknown} left @param {unknown} right */
export function sameValue(left, right) {
  return stableJson(left) === stableJson(right);
}

/** @param {string} left @param {string} right */
function pathsOverlap(left, right) {
  return left === right || left.startsWith(`${right}.`) || right.startsWith(`${left}.`);
}

// Called only after JSON validation. JSON has value semantics, so shared input
// references must not make a write to one path change a declared untouched path.
function cloneJsonValue(value) {
  if (Array.isArray(value)) return value.map(cloneJsonValue);
  if (isPlainRecord(value)) return Object.fromEntries(Object.entries(value)
    .map(([key, child]) => [key, cloneJsonValue(child)]));
  return value;
}
