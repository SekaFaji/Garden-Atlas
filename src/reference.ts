import type { Garden, ReferenceImage } from './model';

/** Downsize and strip metadata on-device before saving locally; no server upload. */
export async function imageToReference(file:File,garden:Garden):Promise<ReferenceImage> {
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPG, PNG or WebP image.');
 if(file.size>15_000_000)throw new Error('Image is over 15 MB. Choose a smaller image.');
 const bitmap=await createImageBitmap(file);
 try {
   if(!bitmap.width||!bitmap.height)throw new Error('This image could not be decoded.');
   let maxSide=1300,quality=.76;
   for(let attempt=0;attempt<8;attempt++){
     const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
     const canvas=document.createElement('canvas');
     canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
     const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas is not available in this browser.');
     ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
     ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
     const dataUrl=canvas.toDataURL('image/jpeg',quality);
     if(dataUrl.startsWith('data:image/jpeg;base64,')&&dataUrl.length<=335_000){
       const widthM=Math.min(garden.width*.8, Math.max(.2,garden.height*.8*bitmap.width/bitmap.height));
       const heightM=widthM*bitmap.height/bitmap.width;
       return {dataUrl,name:file.name.slice(0,140),x:(garden.width-widthM)/2,y:(garden.height-heightM)/2,widthM,heightM,opacity:.55};
     }
     maxSide=Math.max(350,Math.floor(maxSide*.78));quality=Math.max(.4,quality-.075);
   }
   throw new Error('Could not compress this image for local browser storage.');
 } finally {bitmap.close();}
}
