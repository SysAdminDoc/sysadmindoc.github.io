/* ===== PWA SERVICE WORKER ===== */
(function(){
    if(!('serviceWorker' in navigator))return;
    let serviceWorkerRefreshRequested=false;
    function setMessage(container,title,body){
        container.textContent='';
        const strong=document.createElement('strong');
        strong.textContent=title;
        const span=document.createElement('span');
        span.textContent=body;
        container.append(strong,span);
    }
    function showServiceWorkerUpdateToast(worker){
        if(!worker||document.querySelector('.sw-update-toast'))return;
        const toast=document.createElement('div');
        toast.className='sw-update-toast';
        toast.setAttribute('role','status');
        toast.setAttribute('aria-live','polite');
        const message=document.createElement('span');
        message.className='sw-update-message';
        setMessage(message,'Update ready','Refresh to load the newest portfolio build.');
        const actions=document.createElement('div');
        actions.className='sw-update-actions';
        const refresh=document.createElement('button');
        refresh.type='button';
        refresh.textContent='Refresh';
        const dismiss=document.createElement('button');
        dismiss.type='button';
        dismiss.textContent='Later';
        actions.append(refresh,dismiss);
        toast.append(message,actions);
        refresh.addEventListener('click',()=>{
            serviceWorkerRefreshRequested=true;
            refresh.disabled=true;
            setMessage(message,'Refreshing','Loading the newest build now.');
            worker.postMessage({type:'SKIP_WAITING'});
        });
        dismiss.addEventListener('click',()=>{
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
    }).catch(function(){});
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(!serviceWorkerRefreshRequested)return;
        window.location.reload();
    });
    if(document.readyState==='complete')registerServiceWorker();
    else window.addEventListener('load',registerServiceWorker,{once:true});
})();
