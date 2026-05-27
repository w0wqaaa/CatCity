export function getNpcDialogStage({ npc, dialogs, questStates }) {
  const questId = npc.data.quests?.[0];
  const stage = questId ? questStates[questId] || "none" : "none";
  const dialog = dialogs[npc.data.dialog];
  return dialog.stages[stage] || dialog.stages.none;
}

export function openDialogState(dialogState, { lines, action = null, activeNpc = null, activeInteractable = null }) {
  dialogState.isOpen = true;
  dialogState.activeNpc = activeNpc;
  dialogState.activeInteractable = activeInteractable;
  dialogState.lines = lines || [];
  dialogState.index = 0;
  dialogState.action = action;
  return dialogState;
}

export function advanceDialog(dialogState) {
  dialogState.index++;
  if (dialogState.index < dialogState.lines.length) {
    return {
      done: false,
      line: dialogState.lines[dialogState.index],
      action: null,
    };
  }

  const action = dialogState.action;
  dialogState.isOpen = false;
  dialogState.activeNpc = null;
  dialogState.activeInteractable = null;
  dialogState.lines = [];
  dialogState.index = 0;
  dialogState.action = null;
  return {
    done: true,
    line: null,
    action,
  };
}
