/* ===== PWA SERVICE WORKER ===== */
(function(){
    if(!('serviceWorker' in navigator))return;
    let serviceWorkerRefreshRequested=false;
    const DISMISS_KEY='sw-update-dismissed';
    function dismissedVersion(){
        try{return sessionStorage.getItem(DISMISS_KEY);}catch(e){return null;}
    }
    function rememberDismissed(version){
        try{if(version)sessionStorage.setItem(DISMISS_KEY,version);}catch(e){/* storage unavailable */}
    }
    function workerVersion(worker){
        return new Promise(resolve=>{
            if(!worker||typeof MessageChannel==='undefined'){resolve(null);return;}
            let settled=false;
            const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value);};
            const timer=setTimeout(()=>finish(null),1500);
            try{
                const channel=new MessageChannel();
                channel.port1.onmessage=event=>finish(event&&event.data&&event.data.version||null);
                worker.postMessage({type:'GET_VERSION'},[channel.port2]);
            }catch(e){finish(null);}
        });
    }
    function setMessage(container,title,body){
        container.textContent='';
        const strong=document.createElement('strong');
        strong.textContent=title;
        const span=document.createElement('span');
        span.textContent=body;
        container.append(strong,span);
    }
    async function showServiceWorkerUpdateToast(worker){
        if(!worker||document.querySelector('.sw-update-toast'))return;
        const version=await workerVersion(worker);
        // Suppress only if THIS exact build was dismissed this session; a newer
        // waiting worker has a different version and prompts again.
        if(version&&version===dismissedVersion())return;
        if(document.querySelector('.sw-update-toast'))return;
        const toast=document.createElement('div');
        toast.className='sw-update-toast';
        toast.setAttribute('role','region');
        toast.setAttribute('aria-label','Portfolio update');
        const message=document.createElement('span');
        message.className='sw-update-message';
        message.setAttribute('role','status');
        message.setAttribute('aria-live','polite');
        setMessage(message,'Update ready','Refresh to load the newest portfolio build.');
        const actions=document.createElement('div');
        actions.className='sw-update-actions';
        const refresh=document.createElement('button');
        refresh.type='button';
        refresh.textContent='Refresh now';
        const dismiss=document.createElement('button');
        dismiss.type='button';
        dismiss.textContent='Not now';
        actions.append(refresh,dismiss);
        toast.append(message,actions);
        refresh.addEventListener('click',()=>{
            serviceWorkerRefreshRequested=true;
            refresh.disabled=true;
            setMessage(message,'Refreshing','Loading the newest build now.');
            worker.postMessage({type:'SKIP_WAITING'});
        });
        dismiss.addEventListener('click',()=>{
            rememberDismissed(version);
            toast.classList.remove('show');
            setTimeout(()=>toast.remove(),250);
        });
        document.body.appendChild(toast);
        requestAnimationFrame(()=>toast.classList.add('show'));
    }
    const registerServiceWorker=()=>navigator.serviceWorker.register('/sw.js').then(registration=>{
        if(registration.waiting&&navigator.serviceWorker.controller)showServiceWorkerUpdateToast(registration.waiting);
        registration.addEventListener('updatefound',()=>{
            const worker=registration.installing;
            if(!worker)return;
            worker.addEventListener('statechange',()=>{
                if(worker.state==='installed'&&navigator.serviceWorker.controller)showServiceWorkerUpdateToast(worker);
            });
        });
    }).catch(function(error){
        console.warn('Offline support is unavailable in this browser session.',error);
    });
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(!serviceWorkerRefreshRequested)return;
        window.location.reload();
    });
    if(document.readyState==='complete')registerServiceWorker();
    else window.addEventListener('load',registerServiceWorker,{once:true});
})();
