import { createChangeSet, applyChangeSet, applyExactInverse, deepFreeze, type ChangeRequest, type ReadonlyChangeRequest } from '../index.mjs';
const state = { note: { duration: 4, velocity: 80 }, title: 'synthetic' };
const request: ChangeRequest = { change_id: 'first', axis: 'note.duration', from: 4, to: 3, untouched_axes: ['note.velocity'] };
const first = createChangeSet(state, request, 'example.v1');
const after = applyChangeSet(state, first);
// Results returned by the public API are valid inputs for the next operation.
const second = createChangeSet(after, { ...request, change_id: 'second', from: 3, to: 2 }, 'example.v1');
const restored = applyExactInverse(after, first);
const third = createChangeSet(restored, { ...request, change_id: 'third' }, 'example.v1');
const arrayState = deepFreeze({ sequence: [1, 2], untouched: { label: 'same' } });
const arrayRequest = { change_id: 'array', axis: 'sequence', from: [1, 2], to: [2, 3], untouched_axes: ['untouched'] } as const;
const fourth = createChangeSet(arrayState, arrayRequest, 'example.v1');
const readonlyRequest: ReadonlyChangeRequest = arrayRequest;
// The legacy mutable request type is unchanged.
request.untouched_axes.push('title');
request.from = 3;
// @ts-expect-error Results remain read-only.
after['title'] = 'mutated';
// @ts-expect-error Operation envelopes remain read-only.
second.inverse.to = 99;
// @ts-expect-error Read-only input view must not be mutated.
readonlyRequest.untouched_axes.push('other');
// @ts-expect-error Functions are not JSON input values.
createChangeSet({ value: () => 1 }, request, 'example.v1');
// @ts-expect-error An axis must still be a string.
createChangeSet(state, { ...request, axis: 123 }, 'example.v1');
void third; void fourth;
