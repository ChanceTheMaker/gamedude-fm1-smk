import {validateStockPackage} from './vendor/fm1pkg.js';
import {Updater} from './vendor/fm1ota.js';
export async function restoreOriginal(access,device,bytes,step=()=>{},UpdaterType=Updater){
 // Re-validate at action time; a previously selected file is not authorization
 // to transfer modified bytes or a package for a different instrument.
 const pkg=await validateStockPackage(bytes);
 if(!device||!['FM-1','ota-FM-1'].includes(device.id.model))throw Error('Connect the target FM-1 before restoring.');
 const updater=new UpdaterType(access);
 if(device.id.model==='ota-FM-1'){
  if(!await updater.resume(pkg.image,step,pkg.product))throw Error('Could not resume the original firmware restore.');
 }else await updater.install(pkg.image,pkg.product,step);
 return pkg.product;
}
