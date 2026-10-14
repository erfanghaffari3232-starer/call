(() => {
 const $ = id => document.getElementById(id);
 const roomInput=$('room'), status=$('status'), callstate=$('callstate');
 const join=$('join'), leave=$('leave'), mute=$('mute'), speaker=$('speaker');
 let peer=null, localStream=null, activeCall=null, muted=false, speakerOff=false, hostMode=false, gotRemote=false, retryTimer=null;
 const setStatus=t=>status.textContent=t, setMessage=t=>callstate.textContent=t;
 function roomKey(){return 'erfan-room-'+roomInput.value.trim().toLowerCase().normalize('NFKC').replace(/[^a-z0-9_-]/g,'-').replace(/-+/g,'-').slice(0,32)}
 function start(){
  if(peer) return;
  if(!roomInput.value.trim()){setMessage('اول یک اسم ساده برای اتاق بنویس؛ هر دو نفر دقیقاً همان اسم را وارد کنند.');roomInput.focus();return}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){setMessage('برای اجازه میکروفون، سایت را با HTTPS باز کن.');return}
  if(!window.Peer){setMessage('کتابخانه تماس بارگذاری نشد؛ اینترنت را بررسی و صفحه را تازه کن.');return}
  join.disabled=true;setStatus('در حال آماده‌سازی');setMessage('در حال روشن کردن میکروفون…');
  navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false}).then(stream=>{
   localStream=stream;
   peer=new Peer(roomKey(),{host:'0.peerjs.com',port:443,path:'/',secure:true,debug:1});
   peer.on('open',()=>{
    hostMode=true;
    $('myid').textContent=roomInput.value.trim();$('copyid').disabled=false;
    controlsOn();setStatus('منتظر نفر دوم');setMessage('اتاق آماده است. دوستت همین اسم را وارد کند و شروع تماس را بزند.');
   });
   peer.on('call',call=>{if(activeCall){call.close();return}call.answer(localStream);setupCall(call)});
   peer.on('error',err=>{
    console.error(err);
    if(err.type==='unavailable-id'&&!hostMode){
     try{peer.destroy()}catch(e){} peer=null;
     joinAsCaller(0);return;
    }
    setStatus('خطای اتصال');
    setMessage(err.type==='network'?'اتصال به سرور سیگنال‌دهی برقرار نشد. ممکن است شبکه دسترسی به PeerJS را مسدود کرده باشد.':'خطای تماس: '+(err.message||err.type||'نامشخص'));
    if(err.type==='network'&&peer&&!peer.destroyed)setTimeout(()=>{try{if(peer&&peer.disconnected)peer.reconnect()}catch(e){}},2000);
   });
   peer.on('disconnected',()=>{setStatus('اتصال مجدد…');setMessage('اتصال سیگنال‌دهی قطع شد؛ در حال تلاش مجدد…');try{peer.reconnect()}catch(e){}});
  }).catch(e=>{setMessage(e.name==='NotAllowedError'?'اجازه میکروفون داده نشد؛ در تنظیمات مرورگر اجازه بده.':'میکروفون در دسترس نیست: '+e.message);setStatus('میکروفون ناموفق');join.disabled=false});
 }
 function joinAsCaller(attempt){
  if(!localStream)return;
  peer=new Peer(undefined,{host:'0.peerjs.com',port:443,path:'/',secure:true,debug:1});
  peer.on('open',()=>{
   hostMode=false;controlsOn();setStatus('در حال تماس');setMessage('در حال وصل شدن به اتاق…');
   dialRoom(attempt);
  });
  peer.on('call',call=>{if(activeCall){call.close();return}call.answer(localStream);setupCall(call)});
  peer.on('error',err=>{console.error(err);setStatus('خطای اتصال');setMessage(err.type==='network'?'سرور سیگنال‌دهی در دسترس نیست؛ ممکن است شبکه آن را مسدود کرده باشد.':'اتصال ناموفق: '+(err.message||err.type||'نامشخص'))});
  peer.on('disconnected',()=>{setStatus('اتصال مجدد…');try{peer.reconnect()}catch(e){}});
 }
 function dialRoom(attempt){
  if(!peer||peer.destroyed||gotRemote)return;
  const call=peer.call(roomKey(),localStream);
  if(!call){retryDial(attempt);return}
  let gotStream=false;
  call.on('stream',stream=>{gotStream=true;setupCall(call,stream)});
  call.on('error',e=>{console.error(e);if(!gotStream)retryDial(attempt+1)});
  call.on('close',()=>{if(!gotStream&&!gotRemote)retryDial(attempt+1)});
  if(attempt<12) retryTimer=setTimeout(()=>{if(!gotRemote&&!gotStream){try{call.close()}catch(e){}dialRoom(attempt+1)}},1800);
 }
 function retryDial(attempt){
  if(retryTimer)clearTimeout(retryTimer);
  if(attempt<12&&!gotRemote)retryTimer=setTimeout(()=>dialRoom(attempt+1),1800);
  else if(!gotRemote){setStatus('اتصال برقرار نشد');setMessage('اتاق پیدا نشد. مطمئن شو نفر اول همان اسم اتاق را وارد کرده و صفحه‌اش باز است.');}
 }
 function controlsOn(){leave.disabled=false;mute.disabled=false;speaker.disabled=false;join.textContent='📞 شروع / ورود به تماس'}
 function setupCall(call,providedStream){
  activeCall=call;
  call.on('stream',stream=>showRemote(stream));
  if(providedStream)showRemote(providedStream);
  call.on('close',()=>{if(activeCall===call)activeCall=null;gotRemote=false;setStatus('تماس پایان یافت');setMessage('تماس قطع شد. برای تماس دوباره، هر دو نفر دوباره شروع کنند.')});
  call.on('error',e=>{console.error(e);setMessage('خطای تماس: '+(e.message||'ارتباط برقرار نشد'))});
 }
 function showRemote(stream){
  gotRemote=true;if(retryTimer)clearTimeout(retryTimer);
  $('remoteAudio').srcObject=stream;$('remoteAudio').muted=speakerOff;
  $('remoteAudio').play().catch(()=>setMessage('برای شنیدن صدا یک‌بار روی صفحه بزن.'));
  setStatus('در تماس صوتی');setMessage('تماس برقرار شد! حالا می‌توانید صحبت کنید.');
 }
 function stop(){
  if(retryTimer)clearTimeout(retryTimer);
  if(activeCall){activeCall.close();activeCall=null}
  if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null}
  if(peer){peer.destroy();peer=null}
  $('remoteAudio').srcObject=null;join.disabled=false;join.textContent='🎙️ شروع تماس';
  $('copyid').disabled=true;$('myid').textContent='بعد از شروع نمایش داده می‌شود';
  leave.disabled=true;mute.disabled=true;speaker.disabled=true;muted=false;speakerOff=false;hostMode=false;gotRemote=false;
  mute.textContent='🎤 قطع میکروفون';speaker.textContent='🔊 خاموش‌کردن صدا';setStatus('آماده');setMessage('تماس پایان یافت.');
 }
 join.addEventListener('click',start);leave.addEventListener('click',stop);
 mute.addEventListener('click',()=>{if(!localStream)return;muted=!muted;localStream.getAudioTracks().forEach(t=>t.enabled=!muted);mute.textContent=muted?'🎤 روشن‌کردن میکروفون':'🎤 قطع میکروفون'});
 speaker.addEventListener('click',()=>{speakerOff=!speakerOff;$('remoteAudio').muted=speakerOff;speaker.textContent=speakerOff?'🔇 روشن‌کردن صدا':'🔊 خاموش‌کردن صدا'});
 $('copy').addEventListener('click',async()=>{const r=roomInput.value.trim();if(!r){setMessage('اول اسم اتاق را وارد کن.');return}try{await navigator.clipboard.writeText(r);setMessage('اسم اتاق کپی شد.')}catch(e){roomInput.select();document.execCommand('copy')}});
 $('copyid').addEventListener('click',async()=>{if(!peer)return;try{await navigator.clipboard.writeText($('myid').textContent);setMessage('اسم اتاق کپی شد؛ برای دوستت بفرست.')}catch(e){setMessage('اسم اتاق را انتخاب و کپی کن.')}});
 window.addEventListener('beforeunload',()=>{if(peer)peer.destroy()});
})();