/** A host-side decision example, not persistence, a lock, or authorization. */
import assert from 'node:assert/strict';
import {createChangeSet, applyChangeSet, applyExactInverse, stableJson} from '../index.mjs';

const document = {note: {duration: 4, velocity: 80}, memo: 'synthetic example'};
const envelope = createChangeSet(document, {
  change_id: 'duration-example', axis: 'note.duration', from: 4, to: 3,
  untouched_axes: ['note.velocity', 'memo'],
}, 'example.change.v1');

// A stored JSON envelope is checked by the core again at the apply boundary.
const parsed = JSON.parse(JSON.stringify(envelope));
const preview = applyChangeSet(document, parsed);
assert.equal(document.note.duration, 4);
assert.equal(preview.note.duration, 3);
assert.equal(stableJson(applyExactInverse(preview, parsed)), stableJson(document));
const tampered = JSON.parse(JSON.stringify(parsed));
tampered.inverse.to = 999;
assert.throws(() => applyExactInverse(preview, tampered));

// The core does not know which document/revision is current in your application.
const currentRecord = {sourceId: 'demo-document', revision: 8,
  document: {...document, memo: 'a newer unrelated edit'}};
const fieldOnly = applyChangeSet(currentRecord.document, parsed);
assert.equal(fieldOnly.note.duration, 3);
assert.equal(fieldOnly.memo, 'a newer unrelated edit');

// expectedBinding must come from trusted host state at proposal creation, not
// from the untrusted submitted envelope. currentRecord must be freshly read.
// This synchronous function prepares a result; it DOES NOT commit to storage.
function prepareForHost(current, expectedBinding, change) {
  if (current.sourceId !== expectedBinding.sourceId ||
      current.revision !== expectedBinding.revision) {
    throw new Error('host_source_or_revision_mismatch');
  }
  return applyChangeSet(current.document, change);
}

assert.throws(() => prepareForHost(currentRecord,
  {sourceId: 'demo-document', revision: 7}, parsed), /host_source_or_revision_mismatch/);
assert.throws(() => prepareForHost(currentRecord,
  {sourceId: 'another-document', revision: 8}, parsed), /host_source_or_revision_mismatch/);
const hostPreview = prepareForHost(currentRecord,
  {sourceId: 'demo-document', revision: 8}, parsed);
assert.equal(hostPreview.note.duration, 3);
assert.equal(currentRecord.document.note.duration, 4);

// For an asynchronous commit, a fresh read followed by an ordinary write is not
// atomic. Use the host's existing CAS/transaction under the same expected binding.
// Undo is a new host-authorized operation; it is not a stale whole-record restore.
console.log(JSON.stringify({
  source_unchanged: document.note.duration === 4,
  deserialized_round_trip: true,
  tampered_inverse_rejected: true,
  core_preserves_newer_unrelated_data: fieldOnly.memo,
  stale_host_revision_rejected: true,
  wrong_host_source_rejected: true,
  storage_written: false,
  boundary: 'field preimage is core behavior; source, revision, rights and atomic commit are host behavior',
}, null, 2));
