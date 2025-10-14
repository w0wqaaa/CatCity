// dialogManager.js
import { startQuest } from "./questManager.js";
export async function showDialog(id){
  const res=await fetch(`js/data/dialogs/${id}.json`);
  const d=await res.json();
  for(const line of d.lines){console.log(line);}
  if(d.after?.startQuest){startQuest(d.after.startQuest);}
}