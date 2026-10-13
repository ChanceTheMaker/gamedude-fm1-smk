import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {validateStockPackage,logicalImage} from '../web/vendor/fm1pkg.js';
import {restoreOriginal} from '../web/restore-firmware.js';
if(!process.argv[2])throw Error('Usage: node tests/restore.mjs <official FM-1 V15 .fwsc>');
const bytes=new Uint8Array(await fs.readFile(process.argv[2])),calls=[];
class FakeUpdater{
 async install(image,product){calls.push('install');assert.equal(product,'FM-1_015');assert.deepEqual(image,logicalImage(bytes));}
 async resume(image,step,product){calls.push('resume');assert.equal(product,'FM-1_015');assert.deepEqual(image,logicalImage(bytes));return true;}
}
assert.equal((await validateStockPackage(bytes)).product,'FM-1_015');
for(const model of ['FM-1','ota-FM-1'])assert.equal(await restoreOriginal({}, {id:{model}},bytes,()=>{},FakeUpdater),'FM-1_015');
assert.deepEqual(calls,['install','resume']);calls.length=0;
for(const model of ['SMK-37 Pro','SMK-37 Elite','ota-SMK-37 Pro'])await assert.rejects(restoreOriginal({}, {id:{model}},bytes,()=>{},FakeUpdater),/target FM-1/);
const changed=bytes.slice();changed[2000]^=1;
for(const invalid of [changed,bytes.subarray(0,100),new Uint8Array(await fs.readFile(new URL('../web/firmware/fm1-template.fwsc',import.meta.url)))])await assert.rejects(restoreOriginal({}, {id:{model:'FM-1'}},invalid,()=>{},FakeUpdater),/unmodified official/);
assert.equal(calls.length,0,'Rejected files/models must never reach the updater');
class Interrupted extends FakeUpdater{async resume(){return false;}}
await assert.rejects(restoreOriginal({}, {id:{model:'ota-FM-1'}},bytes,()=>{},Interrupted),/Could not resume/);
console.log('PASS: original package, exact transferred image, install/resume, wrong model, corrupt/custom/truncated files, failed resume. No device accessed.');
