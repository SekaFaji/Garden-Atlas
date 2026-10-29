import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMetricDraft} from '../src/metricDraft.ts';

test('P017 allows zero where a field supports it, and accepts decimal typing including comma locale',()=>{
 assert.equal(parseMetricDraft('0',0,359,0),0);
 assert.equal(parseMetricDraft('2,75',0.2,12),2.75);
 assert.equal(parseMetricDraft('.5',0,5),0.5);
 assert.equal(parseMetricDraft(' 12 ',0.2,12),12);
});
test('P017 rejects blank / mid-edit states without manufacturing zero',()=>{
 for(const value of ['',' ','.',',','1e3','NaN','Infinity','-1']){
  assert.equal(parseMetricDraft(value,0,359,0),null, value);
 }
 assert.equal(parseMetricDraft('',0,5),null);
 assert.equal(parseMetricDraft('0',0.2,12),null);
});
test('P017 prevents accidental out-of-range or fractional rotation and accepts X/Y boundaries',()=>{
 assert.equal(parseMetricDraft('359',0,359,0),359);
 assert.equal(parseMetricDraft('359.5',0,359,0),null);
 assert.equal(parseMetricDraft('360',0,359,0),null);
 assert.equal(parseMetricDraft('0',0,18),0);
 assert.equal(parseMetricDraft('18.01',0,18),null);
});
test('P017 rounds completed widths consistently with existing garden validation',()=>{
 assert.equal(parseMetricDraft('0.3333',0.2,12),0.33);
 assert.equal(parseMetricDraft('12.0000001',0.2,12),null);
 assert.equal(parseMetricDraft('2.25',0.2,12),2.25);
 assert.equal(parseMetricDraft('1.4',0,100,-1),null);
});
