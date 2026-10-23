// Shared by local studios only. Native text/number/select/media editing always wins.
export function nativeKeyboardTarget(event) {
  return event.composedPath().some(node=>node?.matches?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],audio,video'));
}
export function bindStudioKeyboard({surface,enabled=()=>true,undo,redo,remove,nudge,play,frame,begin=()=>{},end=()=>{}}) {
  let held=null;
  const release=()=>{held=null;end();};
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||event.isComposing||event.key==='Process'||nativeKeyboardTarget(event)||document.hidden||!enabled())return;
    const key=event.key.toLowerCase(),command=event.ctrlKey||event.metaKey;
    if(command&&!event.altKey&&(key==='z'||key==='y')){
      const action=key==='y'||event.shiftKey?redo:undo;
      if(!action)return;event.preventDefault();event.stopPropagation();release();if(!event.repeat)action();return;
    }
    if(!surface?.contains(document.activeElement))return;
    if(command)return;
    if(event.altKey){if(frame&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();frame(event.key==='ArrowLeft'?-1:1);}return;}
    if(event.key==='Delete'&&remove){event.preventDefault();event.stopPropagation();release();if(!event.repeat)remove();return;}
    if(event.code==='Space'&&play){event.preventDefault();if(!event.repeat)play();return;}
    if(!nudge||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();
    if(held!==event.key){release();begin();held=event.key;}
    nudge(event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0,event.key==='ArrowUp'?-1:event.key==='ArrowDown'?1:0,event.shiftKey?10:1);
  });
  document.addEventListener('keyup',event=>{if(event.key===held)release();});
  window.addEventListener('blur',release);
  document.addEventListener('visibilitychange',release);
  return release;
}

// Post-change snapshots; held arrows/one drag become one undo step. No file writes.
export function createStudioHistory(read,write,changed=()=>{}) {
  let past=[],future=[],current=null,grouped=false,recorded=false;
  const clone=value=>structuredClone(value);
  const reset=()=>{past=[];future=[];current=clone(read());grouped=false;recorded=false;changed();};
  const end=()=>{grouped=false;recorded=false;};
  const record=()=>{
    const next=clone(read());if(current===null){current=next;return;}
    if(JSON.stringify(next)===JSON.stringify(current))return;
    if(!grouped||!recorded){past.push(current);if(past.length>40)past.shift();}
    current=next;future=[];recorded=true;changed();
  };
  return {reset,record,end,begin(){end();grouped=true;},get canUndo(){return past.length>0;},get canRedo(){return future.length>0;},
    undo(){end();if(!past.length)return;future.push(current);current=past.pop();write(clone(current));changed();},
    redo(){end();if(!future.length)return;past.push(current);current=future.pop();write(clone(current));changed();},
  };
}

export function historyButtons(history,container,label='Undo/Redo perubahan') {
  const bar=document.createElement('div');bar.className='studio-history';bar.setAttribute('aria-label',label);
  const undo=document.createElement('button'),redo=document.createElement('button');
  undo.type=redo.type='button';undo.textContent='↶ Undo';redo.textContent='↷ Redo';undo.title='Ctrl/Cmd+Z';redo.title='Ctrl+Y / Ctrl/Cmd+Shift+Z';
  undo.onclick=()=>history.undo();redo.onclick=()=>history.redo();bar.append(undo,redo);
  const legend=container.querySelector(':scope>legend');if(legend)legend.after(bar);else container.prepend(bar);
  return ()=>{undo.disabled=!history.canUndo;redo.disabled=!history.canRedo;};
}
