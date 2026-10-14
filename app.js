(() => {
 const $=id=>document.getElementById(id);
 const targetInput=$('room'), status=$('status'), callstate=$('callstate');
 const join=$('join'), leave=$('leave'), mute=$('mute'), speaker=$('speaker');
 let peer=null, localStream=null, activeCall=null, muted=false, speakerOff=false, outgoingTimer=null;
 const setStatus=t=>status.textContent=t;
 const setMessage=t=>callstate.textContent=t;
 function start(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){setMessage('مرورگر اجازه میکروفون نمی‌دهد؛ سایت را با HTTPS باز کن.');return}
  if(!window.Peer){setMessage('کتابخانه تماس بارگذاری نشد؛ اینترنت را بررسی و صفحه را تازه کن.');return}
  join.disabled=true;setStatus('در حال آماده‌سازی');setMessage('در حال درخواست اجازه میکروفون…');
  navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false})
  .then(stream=>{
   localStream=stream;peer=new Peer(undefined,{host:'0.peerjs.com',port:443,path:'/',secure:true,debug:2});
   peer.on('open',id=>{
    $('myid').textContent=id;$('copyid').disabled=false;
    setStatus('آماده تماس');setMessage('میکروفون آماده است. شناسه سبزرنگ خودت را برای طرف مقابل بفرست. برای تماس با شناسه‌ای که داری، آن را در کادر بالا وارد کن و «تماس با شناسه» را بزن.');
    leave.disabled=false;mute.disabled=false;speaker.disabled=false;join.textContent='📞 تماس با شناسه';
   });
   peer.on('call',call=>{if(activeCall){call.close();return}call.answer(localStream);setupCall(call)});
   peer.on('error',err=>{console.error(err);setStatus('خطای اتصال');setMessage(friendlyError(err));if(err.type==='network' && peer && !peer.destroyed){setTimeout(()=>{try{if(peer&&peer.disconnected)peer.reconnect()}catch(e){console.error(e)}},2000)}if(!localStream)join.disabled=false});
   peer.on('disconnected',()=>{setStatus('در حال اتصال مجدد');setMessage('ارتباط با سرور تماس قطع شد؛ تلاش برای اتصال مجدد…');try{peer.reconnect()}catch(e){console.error(e)}});
  }).catch(e=>{setMessage(e.name==='NotAllowedError'?'اجازه میکروفون داده نشد. در تنظیمات مرورگر اجازه بده.':'میکروفون در دسترس نیست: '+e.message);setStatus('میکروفون ناموفق');join.disabled=false});
 }
 function dial(){
  const target=targetInput.value.trim();
  if(!peer||!localStream){start();return}
  if(!target){setMessage('شناسه‌ای را که طرف مقابل فرستاده وارد کن.');return}
  if(target===peer.id){setMessage('نمی‌توانی با شناسه خودت تماس بگیری!');return}
  if(activeCall){activeCall.close();activeCall=null}
  setStatus('در حال تماس');setMessage('در حال تماس با '+target+' …');
  const call=peer.call(target,localStream);
  if(!call){setMessage('تماس آغاز نشد؛ شناسه را بررسی کن.');setStatus('آماده');return}
  setupCall(call);
 }
 function setupCall(call){
  activeCall=call;
  call.on('stream',stream=>{$('remoteAudio').srcObject=stream;$('remoteAudio').muted=speakerOff;$('remoteAudio').play().catch(()=>{setMessage('برای شنیدن صدا، یک‌بار روی صفحه بزن و اجازه پخش صدا بده.')});setStatus('در تماس صوتی');setMessage('تماس صوتی برقرار است. حالا می‌توانید صحبت کنید.')});
  call.on('close',()=>{if(activeCall===call)activeCall=null;setStatus('تماس پایان یافت');setMessage('تماس قطع شد. برای تماس دوباره شناسه را وارد کن و دکمه تماس را بزن.')});
  call.on('error',e=>{console.error(e);setMessage('خطای تماس: '+(e.message||'ارتباط برقرار نشد'))});
 }
 function friendlyError(e){if(e.type==='peer-unavailable')return 'این شناسه در دسترس نیست. از طرف مقابل بخواه صفحه را باز نگه دارد و شناسه درست را بفرستد.';if(e.type==='network')return 'اتصال به سرور سیگنال‌دهی PeerJS ناموفق است. اینترنت را بررسی کن؛ اگر این سرویس در شبکه‌ات مسدود باشد، باید سرور سیگنال‌دهی دیگری راه‌اندازی شود.';return 'خطای ارتباط: '+(e.message||e.type||'نامشخص')}
 function stop(){
  if(activeCall){activeCall.close();activeCall=null}
  if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null}
  if(peer){peer.destroy();peer=null}
  $('remoteAudio').srcObject=null;join.disabled=false;join.textContent='🎙️ روشن‌کردن میکروفون';$('copyid').disabled=true;$('myid').textContent='بعد از شروع نمایش داده می‌شود';
  leave.disabled=true;mute.disabled=true;speaker.disabled=true;muted=false;speakerOff=false;mute.textContent='🎤 قطع میکروفون';speaker.textContent='🔊 خاموش‌کردن صدا';setStatus('آماده');setMessage('تماس پایان یافت.');
 }
 join.addEventListener('click',()=>{if(!peer)start();else dial()});leave.addEventListener('click',stop);
 mute.addEventListener('click',()=>{if(!localStream)return;muted=!muted;localStream.getAudioTracks().forEach(t=>t.enabled=!muted);mute.textContent=muted?'🎤 روشن‌کردن میکروفون':'🎤 قطع میکروفون'});
 speaker.addEventListener('click',()=>{speakerOff=!speakerOff;$('remoteAudio').muted=speakerOff;speaker.textContent=speakerOff?'🔇 روشن‌کردن صدا':'🔊 خاموش‌کردن صدا'});
 $('copy').addEventListener('click',async()=>{const r=targetInput.value.trim();if(!r){setMessage('اول شناسه طرف مقابل را وارد کن.');return}try{await navigator.clipboard.writeText(r);setMessage('شناسه طرف مقابل کپی شد.')}catch{targetInput.select();document.execCommand('copy')}});
 $('copyid').addEventListener('click',async()=>{const id=$('myid').textContent;if(!peer)return;try{await navigator.clipboard.writeText(id);setMessage('شناسه خودت کپی شد؛ برای طرف مقابل بفرست.')}catch{setMessage('شناسه خودت را انتخاب و کپی کن.')}});
 window.addEventListener('beforeunload',()=>{if(peer)peer.destroy()});
})();