// utils.js
export function distance(a,b){const dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);}
export async function loadLocation(id){
  const res=await fetch(`js/data/locations/${id}.json`);
  return await res.json();
}