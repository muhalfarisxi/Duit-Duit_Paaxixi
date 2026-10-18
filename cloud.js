// ARUS cloud adapter – Firebase Auth + Firestore, per-month documents.
// This client config is public; security is enforced using firestore.rules.
const cfg = window.ARUS_FIREBASE_CONFIG || {};
const configured = Boolean(cfg.apiKey && cfg.projectId && cfg.authDomain && !cfg.apiKey.includes('ISI_'));
const event = (name, detail) => window.dispatchEvent(new CustomEvent('arus-' + name, { detail }));
if (!configured) {
  event('cloud-state', { configured: false, signedIn: false, ready: false });
} else {
  try {
    const [{initializeApp}, {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut}, {getFirestore,collection,doc,onSnapshot,writeBatch}] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')
    ]);
    const app=initializeApp(cfg), auth=getAuth(app), firestore=getFirestore(app);
    let detach=null,ready=false,currentUID=null,remoteParts={},lastData=null,writePromise=Promise.resolve(),working=false,requestedSeq=0;
    const copy=v=>JSON.parse(JSON.stringify(v));
    const split=data=>{
      const parts={meta:{version:2,accounts:data.accounts,categories:data.categories,budgets:data.budgets,budgetMoves:data.budgetMoves,debts:data.debts}};
      for(const t of data.transactions||[]){const key='month_'+String(t.date).slice(0,7); (parts[key]??={transactions:[]}).transactions.push(t)}
      for(const [m,r] of Object.entries(data.reports||{}))parts['report_'+m]={report:r};
      return parts;
    };
    const assemble=parts=>{
      if(!parts.meta)return null;
      const m=parts.meta,transactions=[],reports={};
      for(const [key,value] of Object.entries(parts)){
        if(key.startsWith('month_') && Array.isArray(value.transactions))transactions.push(...value.transactions);
        if(key.startsWith('report_') && value.report)reports[key.slice(7)]=value.report;
      }
      return {version:2,accounts:m.accounts||[],categories:m.categories||[],transactions,
              budgets:m.budgets||{},budgetMoves:m.budgetMoves||[],debts:m.debts||[],reports};
    };
    function docCol(){return collection(firestore,'users',currentUID,'arus')}
    async function doWrite(data,force){
      if(!auth.currentUser || !currentUID || !ready)throw Error('Login atau pembacaan cloud belum siap');
      const next=split(data),changes=[];
      const keys=new Set([...Object.keys(next),...Object.keys(remoteParts)]);
      for(const key of keys){if(!next[key])changes.push([key,null]);
        else if(force || JSON.stringify(next[key])!==JSON.stringify(remoteParts[key]))changes.push([key,next[key]])}
      for(let i=0;i<changes.length;i+=350){
        const batch=writeBatch(firestore);
        for(const [key,value] of changes.slice(i,i+350)){
          let document=doc(docCol(),key);
          if(value===null)batch.delete(document);else batch.set(document,value);
        }
        await batch.commit();
      }
      // Do not optimistically overwrite new incoming updates. The listener is source of truth.
      event('cloud-state',{configured:true,signedIn:true,ready:true,busy:false,error:''});
    }
    function queued(data,force=false){
      const frozen=copy(data),seq=++requestedSeq;
      writePromise=writePromise.catch(()=>{}).then(async()=>{
        working=true;
        try{await doWrite(frozen,force)}catch(error){event('cloud-error',{message:error.message});throw error}
        finally{working=false;if(seq===requestedSeq && lastData!==null)event('cloud-data',{data:lastData});}
      });
      return writePromise;
    }
    window.ARUS_CLOUD={
      login:()=>signInWithPopup(auth,new GoogleAuthProvider()),
      logout:()=>signOut(auth),
      push:data=>queued(data,false),
      replace:data=>queued(data,true)
    };
    onAuthStateChanged(auth,user=>{
      if(detach){detach();detach=null;}
      currentUID=user?.uid||null;ready=false;remoteParts={};lastData=null;
      event('cloud-state',{configured:true,signedIn:!!user,ready:false,email:user?.email||'',busy:!!user,error:''});
      if(!user)return;
      const uid=user.uid;
      detach=onSnapshot(docCol(),{includeMetadataChanges:true},snap=>{
        if(uid!==currentUID)return;
        if(snap.metadata.hasPendingWrites)return;
        const parts={};snap.docs.forEach(d=>{parts[d.id]=d.data()});
        remoteParts=parts;ready=true;lastData=assemble(parts);
        event('cloud-state',{configured:true,signedIn:true,ready:true,email:user.email||'',busy:working});
        if(!working)event('cloud-data',{data:lastData});
      },error=>event('cloud-error',{message:error.message}));
    },error=>event('cloud-error',{message:error.message}));
    event('cloud-state',{configured:true,signedIn:!!auth.currentUser,ready:false});
  } catch(error) {
    event('cloud-state',{configured:false,signedIn:false,ready:false,error:error.message});
    event('cloud-error',{message:'Firebase gagal dimuat: '+error.message});
  }
}
