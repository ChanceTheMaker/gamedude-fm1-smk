// SPDX-License-Identifier: GPL-3.0-only
import {buildSmkPublicPackage,SMKPackage,smkLogicalImage} from './vendor/smk37-package.js';
import {STOCK_SOURCES} from './vendor/smk37-stock.js';
import {sha256hex} from './vendor/fm1pkg.js?v=20261013';
import {makeSmkPacket} from './smk-format.js';
import {sealSmkInstall} from './smk-install.js';
export const SMK_MODELS=Object.freeze({'smk-pro':'SMK-37 Pro','smk-elite':'SMK-37 Elite'});
const stockHashes=Object.freeze({'SMK-37 Pro':'2d98ce72530e71d617384963423820536f094501299e2cfec0a8d3c3fb6bcfb0','SMK-37 Elite':'b2ee38abfef3ae922e4eecdb8a551e14345300ae6f270265feacd33b6ef99cb6'});
export async function getSmkStock(model,fetcher=fetch){
 if(!stockHashes[model])throw Error('Choose an SMK model.');
 const response=await fetcher(STOCK_SOURCES[model],{signal:AbortSignal.timeout(60000),cache:'force-cache'});
 if(!response.ok)throw Error('The official SMK 016 firmware could not be downloaded. Retry when connected to the internet.');
 const bytes=new Uint8Array(await response.arrayBuffer());
 await checkStock(bytes,model);return bytes;
}
async function checkStock(bytes,model){
 if(!stockHashes[model]||await sha256hex(bytes)!==stockHashes[model])throw Error('Official firmware does not match the selected SMK model. Nothing was prepared.');
}
export async function prepareSmkRestore(stock,model){
 await checkStock(stock,model);const parsed=new SMKPackage(stock);
 if(parsed.appBase!==0x4000||parsed.appOff!==0x4120||parsed.flashSize!==0x9d000||parsed.chipKey!==0x980f)throw Error('Unsupported stock SMK layout.');
 const product='SMK-37_016',bytes=makeSmkPacket(parsed.flash,product,'M-VAVE 016');
 return sealSmkInstall({bytes,image:smkLogicalImage(stock).raw,stockModel:model,format:2,product,expectedProduct:model+'_016'});
}
