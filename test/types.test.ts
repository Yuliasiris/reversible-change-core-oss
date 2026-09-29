import {createChangeSet, deepFreeze, type ChangeRequest, type ChangeSet} from '../index.mjs';
const request: ChangeRequest = {change_id:'fixture',axis:'note.duration',from:4,to:3,untouched_axes:['title']};
const change: ChangeSet = createChangeSet({note:{duration:4},title:'fixture'},request,'v1');
// @ts-expect-error The serialized operation envelope is immutable.
change.forward.axis = 'different';
// @ts-expect-error Declared axes are strings.
const invalid: ChangeRequest = {...request,axis:123};
const frozen = deepFreeze({nested:{value:1}});
// @ts-expect-error Nested values are readonly too.
frozen.nested.value = 2;
void invalid;
