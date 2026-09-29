import assert from 'node:assert/strict';
import {createChangeSet, applyChangeSet, applyExactInverse, stableJson} from '../index.mjs';
const original={note:{duration:4,velocity:80},label:'合成サンプル'};
const change=createChangeSet(original,{change_id:'example-1',axis:'note.duration',
  from:4,to:3,untouched_axes:['note.velocity','label']},'example.change.v1');
const candidate=applyChangeSet(original,change);
const restored=applyExactInverse(candidate,change);
assert.equal(original.note.duration,4);
assert.equal(candidate.note.duration,3);
assert.equal(stableJson(restored),stableJson(original));
console.log(JSON.stringify({original,candidate,restored,source_mutated:false}));
