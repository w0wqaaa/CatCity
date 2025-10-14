// questManager.js
let activeQuest = null;
export function startQuest(q){activeQuest=q;console.log("Start quest:",q.name);}
export function getActiveQuest(){return activeQuest;}