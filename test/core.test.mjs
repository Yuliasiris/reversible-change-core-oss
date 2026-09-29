import test from 'node:test';
import assert from 'node:assert/strict';
import {createChangeSet, applyChangeSet, applyExactInverse, stableJson,
        deepFreeze, assertCanonicalJsonValue} from '../index.mjs';

const state = () => ({note:{duration:4,velocity:80},title:'合成データ'});
const request = () => ({change_id:'test-1',axis:'note.duration',from:4,to:3,untouched_axes:['note.velocity','title']});
const change = () => JSON.parse(JSON.stringify(createChangeSet(state(),request(),'example.change.v1')));

test('serialized roundtrip preserves state and wire format', () => {
  const input=state(); const copy=structuredClone(input); const c=change();
  const after=applyChangeSet(input,c);
  assert.equal(after.note.duration,3); assert.equal(after.note.velocity,80);
  assert.deepEqual(applyExactInverse(after,c),copy); assert.deepEqual(input,copy);
  assert.deepEqual(Object.keys(c),['schema_version','change_id','changed_axis','untouched_axes','forward','inverse']);
  assert.ok(Object.isFrozen(after)); assert.ok(Object.isFrozen(after.note));
});
test('create returns deeply frozen, detached transitions', () => {
  const input={x:{values:[1,2]},safe:true}; const to={values:[3,4]};
  const c=createChangeSet(input,{change_id:'x',axis:'x',from:input.x,to,untouched_axes:['safe']},'v1');
  to.values.push(5); assert.deepEqual(c.forward.to,{values:[3,4]});
  assert.ok(Object.isFrozen(c.forward.to.values)); assert.ok(Object.isFrozen(c.untouched_axes));
});
test('applying a different axis than declared is refused', () => {
  const c=change(); c.forward={axis:'note.velocity',from:80,to:0};
  assert.throws(()=>applyChangeSet(state(),c),/does not match/);
});
test('inverse axis must match the envelope', () => {
  const c=change(); c.inverse.axis='title';
  assert.throws(()=>applyChangeSet(state(),c),/does not match/);
  assert.throws(()=>applyExactInverse({...state(),note:{duration:3,velocity:80}},c),/does not match/);
});
test('a mismatched inverse cannot restore a different original value', () => {
  const c=change(); c.inverse.to=999;
  assert.throws(()=>applyChangeSet(state(),c),/not symmetric/);
  assert.throws(()=>applyExactInverse({...state(),note:{duration:3,velocity:80}},c),/not symmetric/);
});
test('inverse preimage must equal the forward target', () => {
  const c=change(); c.inverse.from=0; assert.throws(()=>applyChangeSet(state(),c),/not symmetric/);
});
test('untouched and changed paths cannot overlap in loaded changes', () => {
  for(const axis of ['note','note.duration','note.duration.extra']) {
    const c=change(); c.untouched_axes.push(axis); assert.throws(()=>applyChangeSet(state(),c),/conflicts/);
  }
});
test('malformed loaded envelopes are rejected', () => {
  for(const mutate of [c=>delete c.schema_version,c=>c.change_id='',c=>c.untouched_axes=null,
      c=>delete c.forward.from,c=>delete c.inverse.to,c=>c.forward=null,c=>c.changed_axis=5]) {
    const c=change(); mutate(c); assert.throws(()=>applyChangeSet(state(),c),TypeError);
  }
});
test('forbidden JSON fields in loaded targets are refused', () => {
  const c=change(); const target=JSON.parse('{"__proto__":{"polluted":true}}');
  c.forward.to=target; c.inverse.from=target;
  assert.throws(()=>applyChangeSet(state(),c),/forbidden/);
  assert.equal(({}).polluted,undefined);
});
test('project state is validated at both apply boundaries', () => {
  const invalid={...state(),extra:new Date('2020-01-01')};
  assert.throws(()=>applyChangeSet(invalid,change()),/plain objects/);
  assert.throws(()=>applyExactInverse(invalid,change()),/plain objects/);
});
test('stale changed-axis preimages are refused', () => {
  assert.throws(()=>applyChangeSet({...state(),note:{duration:8,velocity:80}},change()),RangeError);
  assert.throws(()=>applyExactInverse({...state(),note:{duration:7,velocity:80}},change()),RangeError);
});
test('unrelated later edits are retained rather than treated as a global revision guard', () => {
  const input={...state(),title:'後で変更した題'};
  const after=applyChangeSet(input,change());
  assert.equal(after.title,input.title); assert.deepEqual(applyExactInverse(after,change()),input);
});
test('arrays may be replaced as values; numeric index paths are not editors', () => {
  const input={list:[1,2],keep:'a'};
  const c=createChangeSet(input,{change_id:'list',axis:'list',from:[1,2],to:[2,null,'a'],untouched_axes:['keep']},'v');
  assert.deepEqual(applyExactInverse(applyChangeSet(input,c),c),input);
  assert.throws(()=>createChangeSet(input,{change_id:'bad',axis:'list.0',from:1,to:3,untouched_axes:[]},'v'),/unknown/);
});
test('unknown paths and reserved segments are rejected', () => {
  for(const axis of ['missing','note.missing','note..duration','__proto__.x','note.constructor']) {
    assert.throws(()=>createChangeSet(state(),{...request(),axis},'v'),TypeError);
  }
});
test('symbols are not silently discarded', () => {
  const input={a:1,[Symbol('hidden')]:2}; assert.throws(()=>stableJson(input),/symbol/);
  const c=change(); c[Symbol('hidden')]=1; assert.throws(()=>applyChangeSet(state(),c),/symbol/);
});
test('non-enumerable fields are not silently discarded', () => {
  const input={a:1}; Object.defineProperty(input,'hidden',{value:2});
  assert.throws(()=>stableJson(input),/enumerable/);
});
test('accessors are rejected without evaluating their bodies', () => {
  let reads=0; const input={}; Object.defineProperty(input,'a',{enumerable:true,get(){reads++;return 1;}});
  assert.throws(()=>stableJson(input),/enumerable data/); assert.equal(reads,0);
  const c=change(); Object.defineProperty(c,'forward',{enumerable:true,get(){reads++;return {};}});
  assert.throws(()=>applyChangeSet(state(),c),/enumerable data/); assert.equal(reads,0);
});
test('sparse arrays, auxiliary properties and accessor indices are rejected', () => {
  const extra=[1]; extra.name='x';
  const sparse=Array(2); sparse[1]=4;
  const compensated=Array(2); compensated[1]=4; compensated.extra=5;
  const getter=[1]; Object.defineProperty(getter,'0',{enumerable:true,get(){throw Error('must not evaluate');}});
  for(const value of [extra,sparse,compensated,getter]) assert.throws(()=>stableJson(value),TypeError);
});
test('cycles and non-JSON values are rejected', () => {
  const cycle={}; cycle.self=cycle;
  for(const value of [cycle,NaN,Infinity,undefined,1n,()=>1,new Map(),new Uint8Array(2)])
    assert.throws(()=>stableJson(value),TypeError);
});
test('aliased plain data, null-prototype records and frozen values remain valid', () => {
  const child={a:1}; assert.equal(stableJson({x:child,y:child}),'{"x":{"a":1},"y":{"a":1}}');
  const nullRecord=Object.create(null); nullRecord.a=1;
  assert.equal(stableJson(nullRecord),'{"a":1}');
  assertCanonicalJsonValue(Object.freeze([Object.freeze({a:1})]),'frozen');
});
test('canonical JSON keeps the existing ordering and negative-zero behavior', () => {
  assert.equal(stableJson({b:2,a:1}),' {"a":1,"b":2}'.trim());
  assert.equal(stableJson(-0),'0'); assert.equal(stableJson({text:'e\u0301'}),'{"text":"é"}');
});
test('deepFreeze traverses an already-frozen parent and terminates cycles', () => {
  const child={a:1}; const parent=Object.freeze({child}); deepFreeze(parent);
  assert.ok(Object.isFrozen(child));
  const cycle={}; cycle.self=cycle; deepFreeze(cycle); assert.ok(Object.isFrozen(cycle));
});
test('request accessors and non-JSON fields are rejected on creation', () => {
  const r=request(); let read=0; Object.defineProperty(r,'axis',{enumerable:true,get(){read++;return 'note.duration';}});
  assert.throws(()=>createChangeSet(state(),r,'v'),TypeError); assert.equal(read,0);
  assert.throws(()=>createChangeSet(state(),{...request(),extra:undefined},'v'),TypeError);
});
test('consistent data is not authentication: the caller still owns authorization', () => {
  const c=createChangeSet(state(),{...request(),to:20},'arbitrary.caller.version');
  assert.equal(applyChangeSet(state(),c).note.duration,20);
});

test('deepFreeze never runs accessors and freezes hidden data children', () => {
  let reads=0; const child={value:1}; const input={get computed(){reads++;return {};}};
  Object.defineProperty(input,'hidden',{value:child});
  deepFreeze(input);
  assert.equal(reads,0); assert.ok(Object.isFrozen(child));
});

test('shared input references do not let one path mutate an untouched path', () => {
  const shared={duration:4}; const input={selected:shared,untouched:shared};
  const c=createChangeSet(input,{change_id:'aliases',axis:'selected.duration',from:4,to:3,
    untouched_axes:['untouched.duration']},'v');
  const result=applyChangeSet(input,c);
  assert.equal(result.selected.duration,3); assert.equal(result.untouched.duration,4);
  assert.equal(input.selected.duration,4);
  assert.deepEqual(applyExactInverse(result,c),input);
});
