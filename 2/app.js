(() => {
 const $=id=>document.getElementById(id);
 const room=$('room'), status=$('status'), msg=$('callstate'), start=$('start'), end=$('end'), mute=$('mute'), camera=$('camera'), flip=$('flip');
 let peer=null, stream=null, call=null, muted=false, cameraOff=false, facing='user', connected=false, retry=null, roomPeerId='';
 const say=t=>msg.textContent=t, state=t=>status.textContent=t;
 function key(){return 'erfan-video-'+room.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g,'-').replace(/-+/g,'-').slice(0,32)}
 function boot(){
  if(peer)return;
  if(!room.value.trim()){say('اول اسم اتاق را وارد کن. هر دو نفر باید یک اسم یکسان بنویسند.');room.focus();return}
  if(!navigator.mediaDevices?.getUserMedia){say('دوربین نیاز به HTTPS دارد؛ سایت را از GitHub Pages یا HTTPS باز کن.');return}
  if(!window.Peer){say('کتابخانه تماس بارگذاری نشد؛ اینترنت را بررسی و صفحه را تازه کن.');return}
  start.disabled=true;state('در حال آماده‌سازی');say('در حال درخواست دسترسی به دوربین و میکروفون…');
  navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:{facingMode:facing,width:{ideal:1280},height:{ideal:720}}}).then(s=>{
   stream=s;$('local').srcObject=s;roomPeerId=key();
   peer=new Peer(roomPeerId,{host:'0.peerjs.com',port:443,path:'/',secure:true,debug:1});
   peer.on('open',()=>{setControls();state('منتظر نفر دوم');say('اتاق آماده است. نفر دوم همین اسم را وارد کند و شروع را بزند.')});
   peer.on('call',c=>{if(call){c.close();return}c.answer(stream);attach(c)});
   peer.on('error',e=>{
    console.error(e);
    if(e.type==='unavailable-id'&&!connected){try{peer.destroy()}catch{}peer=null;joinRoom(0);return}
    state('خطای اتصال');say(e.type==='network'?'سرور سیگنال‌دهی در دسترس نیست؛ ممکن است شبکه آن را مسدود کرده باشد.':'خطا: '+(e.message||e.type||'نامشخص'));
    if(e.type==='network'&&peer&&!peer.destroyed)setTimeout(()=>{try{peer&&peer.disconnected&&peer.reconnect()}catch{}},2000);
   });
   peer.on('disconnected',()=>{state('اتصال مجدد…');try{peer.reconnect()}catch{}});
  }).catch(e=>{start.disabled=false;state('آماده');say(e.name==='NotAllowedError'?'اجازه دوربین یا میکروفون داده نشد. مجوز سایت را در مرورگر فعال کن.':'دوربین/میکروفون در دسترس نیست: '+e.message)});
 }
 function joinRoom(n){
  if(!stream)return;
  peer=new Peer(undefined,{host:'0.peerjs.com',port:443,path:'/',secure:true,debug:1});
  peer.on('open',()=>{setControls();state('در حال اتصال');say('در حال تلاش برای اتصال به اتاق…');dial(n)});
  peer.on('call',c=>{if(call){c.close();return}c.answer(stream);attach(c)});
  peer.on('error',e=>{console.error(e);state('خطای اتصال');say('اتصال برقرار نشد: '+(e.message||e.type||'نامشخص'))});
  peer.on('disconnected',()=>{try{peer.reconnect()}catch{}});
 }
 function dial(n){
  if(!peer||peer.destroyed||connected)return;
  const c=peer.call(roomPeerId,stream);
  if(!c){again(n+1);return}
  let received=false;
  c.on('stream',s=>{received=true;attach(c,s)});
  c.on('error',e=>{console.error(e);if(!received)again(n+1)});
  c.on('close',()=>{if(!received&&!connected)again(n+1)});
  if(n<15)retry=setTimeout(()=>{if(!received&&!connected){try{c.close()}catch{}dial(n+1)}},1500);
  else if(!connected)say('هنوز وصل نشد. مطمئن شوید نفر اول همان اسم اتاق را وارد کرده و صفحه را باز نگه داشته است.');
 }
 function again(n){if(retry)clearTimeout(retry);if(n<15&&!connected)retry=setTimeout(()=>dial(n),1500)}
 function setControls(){end.disabled=false;mute.disabled=false;camera.disabled=false;flip.disabled=false;start.textContent='🎥 شروع / ورود به تماس'}
 function attach(c,initial){
  call=c;c.on('stream',s=>show(s));if(initial)show(initial);
  c.on('close',()=>{if(call===c)call=null;connected=false;state('تماس پایان یافت');say('تماس قطع شد. برای شروع دوباره، هر دو نفر دوباره دکمه شروع را بزنند.')});
  c.on('error',e=>{console.error(e);say('خطای تماس: '+(e.message||'ارتباط برقرار نشد'))});
 }
 function show(s){connected=true;if(retry)clearTimeout(retry);$('remote').srcObject=s;$('remote').play().catch(()=>{});state('تماس تصویری برقرار است');say('وصل شدید! می‌توانید تصویر و صدا داشته باشید.')}
 function stop(){
  if(retry)clearTimeout(retry);if(call){call.close();call=null}if(peer){peer.destroy();peer=null}if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
  $('local').srcObject=null;$('remote').srcObject=null;start.disabled=false;start.textContent='🎥 شروع / ورود به تماس';end.disabled=mute.disabled=camera.disabled=flip.disabled=true;muted=cameraOff=connected=false;mute.textContent='🎤 قطع میکروفون';camera.textContent='📷 خاموش‌کردن دوربین';state('آماده');say('تماس پایان یافت.');
 }
 start.addEventListener('click',boot);end.addEventListener('click',stop);
 mute.addEventListener('click',()=>{if(!stream)return;muted=!muted;stream.getAudioTracks().forEach(t=>t.enabled=!muted);mute.textContent=muted?'🎤 روشن‌کردن میکروفون':'🎤 قطع میکروفون'});
 camera.addEventListener('click',()=>{if(!stream)return;cameraOff=!cameraOff;stream.getVideoTracks().forEach(t=>t.enabled=!cameraOff);camera.textContent=cameraOff?'📷 روشن‌کردن دوربین':'📷 خاموش‌کردن دوربین'});
 flip.addEventListener('click',async()=>{if(!stream)return;const old=stream;try{const next=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:facing==='user'?'environment':'user'}});const track=next.getVideoTracks()[0],sender=call?.peerConnection?.getSenders().find(s=>s.track?.kind==='video');if(sender)await sender.replaceTrack(track);old.getVideoTracks().forEach(t=>t.stop());old.removeTrack(old.getVideoTracks()[0]);stream.addTrack(track);$('local').srcObject=stream;facing=facing==='user'?'environment':'user'}catch(e){say('تعویض دوربین در این دستگاه پشتیبانی نشد.')}});
 $('copy').addEventListener('click',async()=>{if(!room.value.trim()){say('اول اسم اتاق را بنویس.');return}try{await navigator.clipboard.writeText(room.value.trim());say('اسم اتاق کپی شد.')}catch{$('room').select();document.execCommand('copy')}});
 window.addEventListener('beforeunload',()=>{if(peer)peer.destroy()});
})();