/** Canonical JSON data only. Accessors, symbols, hidden properties, cycles and reserved keys are rejected at runtime. */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type ReadonlyJsonValue = null | boolean | number | string | readonly ReadonlyJsonValue[] | { readonly [key: string]: ReadonlyJsonValue };
export interface ChangeRequest { change_id: string; axis: string; from: JsonValue; to: JsonValue; untouched_axes: string[]; }
export type DeepReadonly<T> = 0 extends (1 & T) ? T
  : [JsonValue] extends [T] ? ([T] extends [JsonValue] ? ReadonlyJsonValue : T)
  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
export interface ChangeSet {
  readonly schema_version: string;
  readonly change_id: string;
  readonly changed_axis: string;
  readonly untouched_axes: readonly string[];
  readonly forward: { readonly axis: string; readonly from: ReadonlyJsonValue; readonly to: ReadonlyJsonValue };
  readonly inverse: { readonly axis: string; readonly from: ReadonlyJsonValue; readonly to: ReadonlyJsonValue };
}
/** Read-only input view; existing mutable ChangeRequest values remain accepted. */
export interface ReadonlyChangeRequest {
  readonly change_id: string;
  readonly axis: string;
  readonly from: ReadonlyJsonValue;
  readonly to: ReadonlyJsonValue;
  readonly untouched_axes: readonly string[];
}
/** Accepts ordinary or deeply frozen JSON without mutating the inputs. */
export function createChangeSet(projectState: { readonly [key: string]: ReadonlyJsonValue }, request: ReadonlyChangeRequest, schemaVersion: string): ChangeSet;
/** Accepts unknown serialized input and validates it in full; provides no authorization. */
export function applyChangeSet(projectState: unknown, changeSet: unknown): { readonly [key: string]: ReadonlyJsonValue };
export function applyExactInverse(projectState: unknown, changeSet: unknown): { readonly [key: string]: ReadonlyJsonValue };
export function stableJson(value: unknown): string;
export function assertCanonicalJsonValue(value: unknown, name: string): asserts value is JsonValue;
export function deepFreeze<T>(value: T): DeepReadonly<T>;
export function isRecord(value: unknown): value is Record<string, unknown>;
export function isPlainRecord(value: unknown): value is Record<string, unknown>;
export function nonEmpty(value: unknown): value is string;
export function finite(value: unknown): value is number;
export function compareCodeUnits(left: string, right: string): -1 | 0 | 1;
export function sameValue(left: unknown, right: unknown): boolean;
