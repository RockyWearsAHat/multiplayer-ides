var Cr=Object.defineProperty;var Nc=Object.getOwnPropertyDescriptor;var Bc=Object.getOwnPropertyNames;var Mc=Object.prototype.hasOwnProperty;var k=(t,e)=>()=>(t&&(e=t(t=0)),e);var L=(t,e)=>()=>(e||t((e={exports:{}}).exports,e),e.exports),Rc=(t,e)=>{for(var n in e)Cr(t,n,{get:e[n],enumerable:!0})},Pc=(t,e,n,r)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of Bc(e))!Mc.call(t,s)&&s!==n&&Cr(t,s,{get:()=>e[s],enumerable:!(r=Nc(e,s))||r.enumerable});return t};var Vc=t=>Pc(Cr({},"__esModule",{value:!0}),t);var N,Cn,F,oi,In=k(()=>{N=()=>new Map,Cn=t=>{let e=N();return t.forEach((n,r)=>{e.set(r,n)}),e},F=(t,e,n)=>{let r=t.get(e);return r===void 0&&t.set(e,r=n()),r},oi=(t,e)=>{for(let[n,r]of t)if(e(r,n))return!0;return!1}});var Me,Tr=k(()=>{Me=()=>new Set});var Tn,ci,oe,li,di,qt,Wt=k(()=>{Tn=t=>t[t.length-1],ci=(t,e)=>{for(let n=0;n<e.length;n++)t.push(e[n])},oe=Array.from,li=(t,e)=>{for(let n=0;n<t.length;n++)if(e(t[n],n,t))return!0;return!1},di=(t,e)=>{let n=new Array(t);for(let r=0;r<t;r++)n[r]=e(r,n);return n},qt=Array.isArray});var ct,hi=k(()=>{In();Tr();Wt();ct=class{constructor(){this._observers=N()}on(e,n){return F(this._observers,e,Me).add(n),n}once(e,n){let r=(...s)=>{this.off(e,r),n(...s)};this.on(e,r)}off(e,n){let r=this._observers.get(e);r!==void 0&&(r.delete(n),r.size===0&&this._observers.delete(e))}emit(e,n){return oe((this._observers.get(e)||N()).values()).forEach(r=>r(...n))}destroy(){this._observers=N()}}});var Y,lt,On,pe,mf,Dn,Gt=k(()=>{Y=Math.floor,lt=Math.abs,On=(t,e)=>t<e?t:e,pe=(t,e)=>t>e?t:e,mf=Number.isNaN,Dn=t=>t!==0?t<0:1/t<0});var Ur,yf,wf,ui,xf,_f,Or=k(()=>{Gt();Ur=Number.MAX_SAFE_INTEGER,yf=Number.MIN_SAFE_INTEGER,wf=1<<31,ui=Number.isInteger||(t=>typeof t=="number"&&isFinite(t)&&Y(t)===t),xf=Number.isNaN,_f=Number.parseInt});var Fc,bf,vf,jc,qc,Wc,Gc,Dr,$c,ht,Hc,pi,dt,gi,$t=k(()=>{Wt();Fc=String.fromCharCode,bf=String.fromCodePoint,vf=Fc(65535),jc=t=>t.toLowerCase(),qc=/^\s*/g,Wc=t=>t.replace(qc,""),Gc=/([A-Z])/g,Dr=(t,e)=>Wc(t.replace(Gc,n=>`${e}${jc(n)}`)),$c=t=>{let e=unescape(encodeURIComponent(t)),n=e.length,r=new Uint8Array(n);for(let s=0;s<n;s++)r[s]=e.codePointAt(s);return r},ht=typeof TextEncoder<"u"?new TextEncoder:null,Hc=t=>ht.encode(t),pi=ht?Hc:$c,dt=typeof TextDecoder>"u"?null:new TextDecoder("utf-8",{fatal:!0,ignoreBOM:!0});dt&&dt.decode(new Uint8Array).length===1&&(dt=null);gi=(t,e)=>di(e,()=>t).join("")});var Re,Ve,zc,H,Jc,D,gt,y,zt,Ar,Yc,Kc,Xc,Se,_i,mt,W,Lr,Zc,Qc,el,yi,tl,ft,Ht,wi,Pe,xi,pt,Nn,bi=k(()=>{Gt();Or();$t();Wt();Re=class{constructor(){this.cpos=0,this.cbuf=new Uint8Array(100),this.bufs=[]}},Ve=()=>new Re,zc=t=>{let e=t.cpos;for(let n=0;n<t.bufs.length;n++)e+=t.bufs[n].length;return e},H=t=>{let e=new Uint8Array(zc(t)),n=0;for(let r=0;r<t.bufs.length;r++){let s=t.bufs[r];e.set(s,n),n+=s.length}return e.set(new Uint8Array(t.cbuf.buffer,0,t.cpos),n),e},Jc=(t,e)=>{let n=t.cbuf.length;n-t.cpos<e&&(t.bufs.push(new Uint8Array(t.cbuf.buffer,0,t.cpos)),t.cbuf=new Uint8Array(pe(n,e)*2),t.cpos=0)},D=(t,e)=>{let n=t.cbuf.length;t.cpos===n&&(t.bufs.push(t.cbuf),t.cbuf=new Uint8Array(n*2),t.cpos=0),t.cbuf[t.cpos++]=e},gt=D,y=(t,e)=>{for(;e>127;)D(t,128|127&e),e=Y(e/128);D(t,127&e)},zt=(t,e)=>{let n=Dn(e);for(n&&(e=-e),D(t,(e>63?128:0)|(n?64:0)|63&e),e=Y(e/64);e>0;)D(t,(e>127?128:0)|127&e),e=Y(e/128)},Ar=new Uint8Array(3e4),Yc=Ar.length/3,Kc=(t,e)=>{if(e.length<Yc){let n=ht.encodeInto(e,Ar).written||0;y(t,n);for(let r=0;r<n;r++)D(t,Ar[r])}else W(t,pi(e))},Xc=(t,e)=>{let n=unescape(encodeURIComponent(e)),r=n.length;y(t,r);for(let s=0;s<r;s++)D(t,n.codePointAt(s))},Se=ht&&ht.encodeInto?Kc:Xc,_i=(t,e)=>mt(t,H(e)),mt=(t,e)=>{let n=t.cbuf.length,r=t.cpos,s=On(n-r,e.length),i=e.length-s;t.cbuf.set(e.subarray(0,s),r),t.cpos+=s,i>0&&(t.bufs.push(t.cbuf),t.cbuf=new Uint8Array(pe(n*2,i)),t.cbuf.set(e.subarray(s)),t.cpos=i)},W=(t,e)=>{y(t,e.byteLength),mt(t,e)},Lr=(t,e)=>{Jc(t,e);let n=new DataView(t.cbuf.buffer,t.cpos,e);return t.cpos+=e,n},Zc=(t,e)=>Lr(t,4).setFloat32(0,e,!1),Qc=(t,e)=>Lr(t,8).setFloat64(0,e,!1),el=(t,e)=>Lr(t,8).setBigInt64(0,e,!1),yi=new DataView(new ArrayBuffer(4)),tl=t=>(yi.setFloat32(0,t),yi.getFloat32(0)===t),ft=(t,e)=>{switch(typeof e){case"string":D(t,119),Se(t,e);break;case"number":ui(e)&&lt(e)<=2147483647?(D(t,125),zt(t,e)):tl(e)?(D(t,124),Zc(t,e)):(D(t,123),Qc(t,e));break;case"bigint":D(t,122),el(t,e);break;case"object":if(e===null)D(t,126);else if(qt(e)){D(t,117),y(t,e.length);for(let n=0;n<e.length;n++)ft(t,e[n])}else if(e instanceof Uint8Array)D(t,116),W(t,e);else{D(t,118);let n=Object.keys(e);y(t,n.length);for(let r=0;r<n.length;r++){let s=n[r];Se(t,s),ft(t,e[s])}}break;case"boolean":D(t,e?120:121);break;default:D(t,127)}},Ht=class extends Re{constructor(e){super(),this.w=e,this.s=null,this.count=0}write(e){this.s===e?this.count++:(this.count>0&&y(this,this.count-1),this.count=1,this.w(this,e),this.s=e)}},wi=t=>{t.count>0&&(zt(t.encoder,t.count===1?t.s:-t.s),t.count>1&&y(t.encoder,t.count-2))},Pe=class{constructor(){this.encoder=new Re,this.s=0,this.count=0}write(e){this.s===e?this.count++:(wi(this),this.count=1,this.s=e)}toUint8Array(){return wi(this),H(this.encoder)}},xi=t=>{if(t.count>0){let e=t.diff*2+(t.count===1?0:1);zt(t.encoder,e),t.count>1&&y(t.encoder,t.count-2)}},pt=class{constructor(){this.encoder=new Re,this.s=0,this.count=0,this.diff=0}write(e){this.diff===e-this.s?(this.s=e,this.count++):(xi(this),this.count=1,this.diff=e-this.s,this.s=e)}toUint8Array(){return xi(this),H(this.encoder)}},Nn=class{constructor(){this.sarr=[],this.s="",this.lensE=new Pe}write(e){this.s+=e,this.s.length>19&&(this.sarr.push(this.s),this.s=""),this.lensE.write(e.length)}toUint8Array(){let e=new Re;return this.sarr.push(this.s),this.s="",Se(e,this.sarr.join("")),mt(e,this.lensE.toUint8Array()),H(e)}}});var ae,ne,j,Nr=k(()=>{ae=t=>new Error(t),ne=()=>{throw ae("Method unimplemented")},j=()=>{throw ae("Unexpected case")}});var Si,ki,yt,B,Br,rl,G,Fe,x,Yt,sl,il,Ee,Mr,ol,al,cl,ll,wt,Jt,je,xt,Bn,Ei=k(()=>{Gt();Or();$t();Nr();Si=ae("Unexpected end of array"),ki=ae("Integer out of Range"),yt=class{constructor(e){this.arr=e,this.pos=0}},B=t=>new yt(t),Br=t=>t.pos!==t.arr.length,rl=(t,e)=>{let n=new Uint8Array(t.arr.buffer,t.pos+t.arr.byteOffset,e);return t.pos+=e,n},G=t=>rl(t,x(t)),Fe=t=>t.arr[t.pos++],x=t=>{let e=0,n=1,r=t.arr.length;for(;t.pos<r;){let s=t.arr[t.pos++];if(e=e+(s&127)*n,n*=128,s<128)return e;if(e>Ur)throw ki}throw Si},Yt=t=>{let e=t.arr[t.pos++],n=e&63,r=64,s=(e&64)>0?-1:1;if((e&128)===0)return s*n;let i=t.arr.length;for(;t.pos<i;){if(e=t.arr[t.pos++],n=n+(e&127)*r,r*=128,e<128)return s*n;if(n>Ur)throw ki}throw Si},sl=t=>{let e=x(t);if(e===0)return"";{let n=String.fromCodePoint(Fe(t));if(--e<100)for(;e--;)n+=String.fromCodePoint(Fe(t));else for(;e>0;){let r=e<1e4?e:1e4,s=t.arr.subarray(t.pos,t.pos+r);t.pos+=r,n+=String.fromCodePoint.apply(null,s),e-=r}return decodeURIComponent(escape(n))}},il=t=>dt.decode(G(t)),Ee=dt?il:sl,Mr=(t,e)=>{let n=new DataView(t.arr.buffer,t.arr.byteOffset+t.pos,e);return t.pos+=e,n},ol=t=>Mr(t,4).getFloat32(0,!1),al=t=>Mr(t,8).getFloat64(0,!1),cl=t=>Mr(t,8).getBigInt64(0,!1),ll=[t=>{},t=>null,Yt,ol,al,cl,t=>!1,t=>!0,Ee,t=>{let e=x(t),n={};for(let r=0;r<e;r++){let s=Ee(t);n[s]=wt(t)}return n},t=>{let e=x(t),n=[];for(let r=0;r<e;r++)n.push(wt(t));return n},G],wt=t=>ll[127-Fe(t)](t),Jt=class extends yt{constructor(e,n){super(e),this.reader=n,this.s=null,this.count=0}read(){return this.count===0&&(this.s=this.reader(this),Br(this)?this.count=x(this)+1:this.count=-1),this.count--,this.s}},je=class extends yt{constructor(e){super(e),this.s=0,this.count=0}read(){if(this.count===0){this.s=Yt(this);let e=Dn(this.s);this.count=1,e&&(this.s=-this.s,this.count=x(this)+2)}return this.count--,this.s}},xt=class extends yt{constructor(e){super(e),this.s=0,this.count=0,this.diff=0}read(){if(this.count===0){let e=Yt(this),n=e&1;this.diff=Y(e/2),this.count=1,n&&(this.count=x(this)+2)}return this.s+=this.diff,this.count--,this.s}},Bn=class{constructor(e){this.decoder=new je(e),this.str=Ee(this.decoder),this.spos=0}read(){let e=this.spos+this.decoder.read(),n=this.str.slice(this.spos,e);return this.spos=e,n}}});var Mn,Ef,Ci,Ii=k(()=>{Mn=require("node:crypto"),Ef=Mn.webcrypto.subtle,Ci=Mn.webcrypto.getRandomValues.bind(Mn.webcrypto)});var Rr,hl,Ti,Ui=k(()=>{Ii();Rr=()=>Ci(new Uint32Array(1))[0],hl="10000000-1000-4000-8000"+-1e11,Ti=()=>hl.replace(/[018]/g,t=>(t^Rr()&15>>t/4).toString(16))});var Rn,Pr=k(()=>{Rn=Date.now});var Vr,Tf,Di=k(()=>{Vr=t=>new Promise(t),Tf=Promise.all.bind(Promise)});var Fr,Ai=k(()=>{Fr=t=>t===void 0?null:t});var jr,Li,gl,Ni,Bi=k(()=>{jr=class{constructor(){this.map=new Map}setItem(e,n){this.map.set(e,n)}getItem(e){return this.map.get(e)}},Li=new jr,gl=!0;try{typeof localStorage<"u"&&localStorage&&(Li=localStorage,gl=!1)}catch{}Ni=Li});var yl,Mi,Ri=k(()=>{yl=Symbol("Equality"),Mi=(t,e)=>t===e||!!t?.[yl]?.(e)||!1});var Vi,xl,Fi,Pi,ji,_l,bl,qi,vl,qr,Wi=k(()=>{Ri();Vi=Object.assign,xl=Object.keys,Fi=(t,e)=>{for(let n in t)e(t[n],n)},Pi=t=>xl(t).length,ji=t=>{for(let e in t)return!1;return!0},_l=(t,e)=>{for(let n in t)if(!e(t[n],n))return!1;return!0},bl=(t,e)=>Object.prototype.hasOwnProperty.call(t,e),qi=(t,e)=>t===e||Pi(t)===Pi(e)&&_l(t,(n,r)=>(n!==void 0||bl(e,r))&&Mi(e[r],n)),vl=Object.freeze,qr=t=>{for(let e in t){let n=t[e];(typeof n=="object"||typeof n=="function")&&qr(t[e])}return vl(t)}});var Kt,Wr,Gi,Pn=k(()=>{Kt=(t,e,n=0)=>{try{for(;n<t.length;n++)t[n](...e)}finally{n<t.length&&Kt(t,e,n+1)}},Wr=t=>t,Gi=(t,e)=>e.includes(t)});var Xt,Uf,ce,kl,El,Gr,Zt,Hi,Of,Cl,zi,$r=k(()=>{In();$t();Ai();Bi();Pn();Xt=typeof process<"u"&&process.release&&/node|io\.js/.test(process.release.name)&&Object.prototype.toString.call(typeof process<"u"?process:0)==="[object process]",Uf=typeof navigator<"u"?/Mac/.test(navigator.platform):!1,kl=[],El=()=>{if(ce===void 0)if(Xt){ce=N();let t=process.argv,e=null;for(let n=0;n<t.length;n++){let r=t[n];r[0]==="-"?(e!==null&&ce.set(e,""),e=r):e!==null?(ce.set(e,r),e=null):kl.push(r)}e!==null&&ce.set(e,"")}else typeof location=="object"?(ce=N(),(location.search||"?").slice(1).split("&").forEach(t=>{if(t.length!==0){let[e,n]=t.split("=");ce.set(`--${Dr(e,"-")}`,n),ce.set(`-${Dr(e,"-")}`,n)}})):ce=N();return ce},Gr=t=>El().has(t),Zt=t=>Xt?Fr(process.env[t.toUpperCase().replaceAll("-","_")]):Fr(Ni.getItem(t)),Hi=t=>Gr("--"+t)||Zt(t)!==null,Of=Hi("production"),Cl=Xt&&Gi(process.env.FORCE_COLOR,["true","1","2"]),zi=Cl||!Gr("--no-colors")&&!Hi("no-color")&&(!Xt||process.stdout.isTTY)&&(!Xt||Gr("--color")||Zt("COLORTERM")!==null||(Zt("TERM")||"").includes("color"))});var Il,Yi,Ki=k(()=>{Il=t=>new Uint8Array(t),Yi=t=>{let e=Il(t.byteLength);return e.set(t),e}});var le,Xi=k(()=>{le=Symbol});var Qt,en,Hr,zr,Jr,tn,Yr,nn,Kr,Zi,Df,Xr=k(()=>{Xi();Pr();Qt=le(),en=le(),Hr=le(),zr=le(),Jr=le(),tn=le(),Yr=le(),nn=le(),Kr=le(),Zi=t=>{t.length===1&&t[0]?.constructor===Function&&(t=t[0]());let e=[],n=[],r=0;for(;r<t.length;r++){let s=t[r];if(s===void 0)break;if(s.constructor===String||s.constructor===Number)e.push(s);else if(s.constructor===Object)break}for(r>0&&n.push(e.join(""));r<t.length;r++){let s=t[r];s instanceof Symbol||n.push(s)}return n},Df=Rn()});var Dl,Al,Qi,Vn,Zr,eo=k(()=>{$r();Xr();Xr();Dl={[Qt]:"\x1B[1m",[en]:"\x1B[2m",[Hr]:"\x1B[34m",[Jr]:"\x1B[32m",[zr]:"\x1B[37m",[tn]:"\x1B[31m",[Yr]:"\x1B[35m",[nn]:"\x1B[38;5;208m",[Kr]:"\x1B[0m"},Al=t=>{t.length===1&&t[0]?.constructor===Function&&(t=t[0]());let e=[],n=[],r=0;for(;r<t.length;r++){let s=t[r],i=Dl[s];if(i!==void 0)e.push(i);else{if(s===void 0)break;if(s.constructor===String||s.constructor===Number)e.push(s);else break}}for(r>0&&(e.push("\x1B[0m"),n.push(e.join("")));r<t.length;r++){let s=t[r];s instanceof Symbol||n.push(s)}return n},Qi=zi?Al:Zi,Vn=(...t)=>{console.log(...Qi(t))},Zr=(...t)=>{console.warn(...Qi(t))}});var to,no,Fn,ro=k(()=>{to=t=>({[Symbol.iterator](){return this},next:t}),no=(t,e)=>to(()=>{let n;do n=t.next();while(!n.done&&!e(n.value));return n}),Fn=(t,e)=>to(()=>{let{done:n,value:r}=t.next();return{done:n,value:n?void 0:e(r)}})});var da={};Rc(da,{AbsolutePosition:()=>zn,AbstractConnector:()=>es,AbstractStruct:()=>kt,AbstractType:()=>T,Array:()=>Je,ContentAny:()=>Ae,ContentBinary:()=>Ze,ContentDeleted:()=>Et,ContentDoc:()=>Qe,ContentEmbed:()=>ye,ContentFormat:()=>U,ContentJSON:()=>pn,ContentString:()=>re,ContentType:()=>Z,Doc:()=>Oe,GC:()=>V,ID:()=>ge,Item:()=>S,Map:()=>Ye,PermanentUserData:()=>ns,RelativePosition:()=>vt,Skip:()=>M,Snapshot:()=>an,Text:()=>St,Transaction:()=>Yn,UndoManager:()=>as,UpdateDecoderV1:()=>$,UpdateDecoderV2:()=>q,UpdateEncoderV1:()=>he,UpdateEncoderV2:()=>z,XmlElement:()=>Xe,XmlFragment:()=>Ke,XmlHook:()=>fn,XmlText:()=>nr,YArrayEvent:()=>Zn,YEvent:()=>ze,YMapEvent:()=>Qn,YTextEvent:()=>er,YXmlEvent:()=>tr,applyUpdate:()=>Wl,applyUpdateV2:()=>ir,cleanupYTextFormatting:()=>sa,compareIDs:()=>qe,compareRelativePositions:()=>od,convertUpdateFormatV1ToV2:()=>Id,convertUpdateFormatV2ToV1:()=>jo,createAbsolutePositionFromRelativePosition:()=>id,createDeleteSet:()=>sr,createDeleteSetFromStructStore:()=>us,createDocFromSnapshot:()=>ud,createID:()=>w,createRelativePositionFromJSON:()=>Xl,createRelativePositionFromTypeIndex:()=>Ql,createSnapshot:()=>ws,decodeRelativePosition:()=>rd,decodeSnapshot:()=>ld,decodeSnapshotV2:()=>To,decodeStateVector:()=>gs,decodeUpdate:()=>_d,decodeUpdateV2:()=>Bo,diffUpdate:()=>kd,diffUpdateV2:()=>xs,emptySnapshot:()=>dd,encodeRelativePosition:()=>td,encodeSnapshot:()=>cd,encodeSnapshotV2:()=>Io,encodeStateAsUpdate:()=>$l,encodeStateAsUpdateV2:()=>ko,encodeStateVector:()=>Jl,encodeStateVectorFromUpdate:()=>bd,encodeStateVectorFromUpdateV2:()=>Ro,equalDeleteSets:()=>vo,equalSnapshots:()=>ad,findIndexSS:()=>X,findRootTypeKey:()=>ys,getItem:()=>We,getItemCleanEnd:()=>is,getItemCleanStart:()=>P,getState:()=>C,getTypeChildren:()=>Dd,isDeleted:()=>et,isParentOf:()=>on,iterateDeletedStructs:()=>Ge,logType:()=>Yl,logUpdate:()=>xd,logUpdateV2:()=>No,mergeDeleteSets:()=>$e,mergeUpdates:()=>Mo,mergeUpdatesV2:()=>ln,obfuscateUpdate:()=>Ed,obfuscateUpdateV2:()=>Cd,parseUpdateMeta:()=>vd,parseUpdateMetaV2:()=>Po,readUpdate:()=>ql,readUpdateV2:()=>ps,relativePositionToJSON:()=>Kl,snapshot:()=>hd,snapshotContainsUpdate:()=>pd,transact:()=>v,tryGc:()=>yd,typeListToArraySnapshot:()=>Ad,typeMapGetAllSnapshot:()=>Qo,typeMapGetSnapshot:()=>Bd});function*wd(t){let e=x(t.restDecoder);for(let n=0;n<e;n++){let r=x(t.restDecoder),s=t.readClient(),i=x(t.restDecoder);for(let o=0;o<r;o++){let a=t.readInfo();if(a===10){let c=x(t.restDecoder);yield new M(w(s,i),c),i+=c}else if((31&a)!==0){let c=(a&192)===0,l=new S(w(s,i),null,(a&128)===128?t.readLeftID():null,null,(a&64)===64?t.readRightID():null,c?t.readParentInfo()?t.readString():t.readLeftID():null,c&&(a&32)===32?t.readString():null,aa(t,a));yield l,i+=l.length}else{let c=t.readLen();yield new V(w(s,i),c),i+=c}}}}var es,_t,Ue,Ge,Rl,et,hs,$e,sn,sr,us,de,me,oo,vo,So,Oe,He,$,Hn,q,De,he,bt,z,Pl,fs,Vl,Fl,jl,ps,ql,ir,Wl,Gl,ko,$l,Eo,gs,ms,Hl,zl,Jl,ts,ao,co,lo,Co,ge,qe,w,ho,uo,ys,on,Yl,ns,vt,Kl,Xl,zn,Zl,jn,Ql,ed,td,nd,rd,sd,id,od,an,ad,Io,cd,To,ld,ws,dd,hd,Ce,rs,ud,fd,pd,Jn,gn,C,Uo,X,gd,We,ss,P,is,md,Oo,Yn,fo,po,Gn,Do,Ao,yd,Lo,v,os,go,mo,as,ue,xd,No,_d,Bo,cn,Mo,Ro,bd,Po,vd,Sd,ln,xs,kd,Vo,Ie,_s,or,Fo,Ed,Cd,Id,jo,yo,ze,Td,R,qo,bs,cs,Ud,Wo,Od,ar,dn,Dd,cr,T,Go,$o,Ad,hn,Ho,Ld,zo,Kn,Jo,Yo,Nd,Ko,Xn,vs,Ss,Xo,Zo,Bd,Qo,qn,Zn,Je,Md,Qn,Ye,Rd,Te,un,wo,Wn,ea,Ct,ta,na,Qr,xo,ra,Pd,sa,Vd,_o,er,St,Fd,rn,Ke,jd,Xe,qd,tr,fn,Wd,nr,Gd,kt,$d,V,Ze,Hd,Et,zd,ia,Qe,Jd,ye,Yd,U,Kd,pn,Xd,Zd,Ae,Qd,re,eh,th,nh,rh,sh,ih,oh,ah,ch,Z,lh,ls,ks,rr,bo,oa,S,aa,dh,hh,M,ca,la,ha=k(()=>{hi();Wt();Gt();In();bi();Ei();Ui();Di();Ki();Nr();Pn();Pn();Tr();eo();Pr();$t();ro();Wi();$r();es=class extends ct{constructor(e,n){super(),this.doc=e,this.awareness=n}},_t=class{constructor(e,n){this.clock=e,this.len=n}},Ue=class{constructor(){this.clients=new Map}},Ge=(t,e,n)=>e.clients.forEach((r,s)=>{let i=t.doc.store.clients.get(s);if(i!=null){let o=i[i.length-1],a=o.id.clock+o.length;for(let c=0,l=r[c];c<r.length&&l.clock<a;l=r[++c])Oo(t,i,l.clock,l.len,n)}}),Rl=(t,e)=>{let n=0,r=t.length-1;for(;n<=r;){let s=Y((n+r)/2),i=t[s],o=i.clock;if(o<=e){if(e<o+i.len)return s;n=s+1}else r=s-1}return null},et=(t,e)=>{let n=t.clients.get(e.client);return n!==void 0&&Rl(n,e.clock)!==null},hs=t=>{t.clients.forEach(e=>{e.sort((s,i)=>s.clock-i.clock);let n,r;for(n=1,r=1;n<e.length;n++){let s=e[r-1],i=e[n];s.clock+s.len>=i.clock?e[r-1]=new _t(s.clock,pe(s.len,i.clock+i.len-s.clock)):(r<n&&(e[r]=i),r++)}e.length=r})},$e=t=>{let e=new Ue;for(let n=0;n<t.length;n++)t[n].clients.forEach((r,s)=>{if(!e.clients.has(s)){let i=r.slice();for(let o=n+1;o<t.length;o++)ci(i,t[o].clients.get(s)||[]);e.clients.set(s,i)}});return hs(e),e},sn=(t,e,n,r)=>{F(t.clients,e,()=>[]).push(new _t(n,r))},sr=()=>new Ue,us=t=>{let e=sr();return t.clients.forEach((n,r)=>{let s=[];for(let i=0;i<n.length;i++){let o=n[i];if(o.deleted){let a=o.id.clock,c=o.length;if(i+1<n.length)for(let l=n[i+1];i+1<n.length&&l.deleted;l=n[++i+1])c+=l.length;s.push(new _t(a,c))}}s.length>0&&e.clients.set(r,s)}),e},de=(t,e)=>{y(t.restEncoder,e.clients.size),oe(e.clients.entries()).sort((n,r)=>r[0]-n[0]).forEach(([n,r])=>{t.resetDsCurVal(),y(t.restEncoder,n);let s=r.length;y(t.restEncoder,s);for(let i=0;i<s;i++){let o=r[i];t.writeDsClock(o.clock),t.writeDsLen(o.len)}})},me=t=>{let e=new Ue,n=x(t.restDecoder);for(let r=0;r<n;r++){t.resetDsCurVal();let s=x(t.restDecoder),i=x(t.restDecoder);if(i>0){let o=F(e.clients,s,()=>[]);for(let a=0;a<i;a++)o.push(new _t(t.readDsClock(),t.readDsLen()))}}return e},oo=(t,e,n)=>{let r=new Ue,s=x(t.restDecoder);for(let i=0;i<s;i++){t.resetDsCurVal();let o=x(t.restDecoder),a=x(t.restDecoder),c=n.clients.get(o)||[],l=C(n,o);for(let d=0;d<a;d++){let h=t.readDsClock(),u=h+t.readDsLen();if(h<l){l<u&&sn(r,o,l,u-l);let f=X(c,h),p=c[f];for(!p.deleted&&p.id.clock<h&&(c.splice(f+1,0,rr(e,p,h-p.id.clock)),f++);f<c.length&&(p=c[f++],p.id.clock<u);)p.deleted||(u<p.id.clock+p.length&&c.splice(f,0,rr(e,p,u-p.id.clock)),p.delete(e))}else sn(r,o,h,u-h)}}if(r.clients.size>0){let i=new z;return y(i.restEncoder,0),de(i,r),i.toUint8Array()}return null},vo=(t,e)=>{if(t.clients.size!==e.clients.size)return!1;for(let[n,r]of t.clients.entries()){let s=e.clients.get(n);if(s===void 0||r.length!==s.length)return!1;for(let i=0;i<r.length;i++){let o=r[i],a=s[i];if(o.clock!==a.clock||o.len!==a.len)return!1}}return!0},So=Rr,Oe=class t extends ct{constructor({guid:e=Ti(),collectionid:n=null,gc:r=!0,gcFilter:s=()=>!0,meta:i=null,autoLoad:o=!1,shouldLoad:a=!0}={}){super(),this.gc=r,this.gcFilter=s,this.clientID=So(),this.guid=e,this.collectionid=n,this.share=new Map,this.store=new Jn,this._transaction=null,this._transactionCleanups=[],this.subdocs=new Set,this._item=null,this.shouldLoad=a,this.autoLoad=o,this.meta=i,this.isLoaded=!1,this.isSynced=!1,this.isDestroyed=!1,this.whenLoaded=Vr(l=>{this.on("load",()=>{this.isLoaded=!0,l(this)})});let c=()=>Vr(l=>{let d=h=>{(h===void 0||h===!0)&&(this.off("sync",d),l())};this.on("sync",d)});this.on("sync",l=>{l===!1&&this.isSynced&&(this.whenSynced=c()),this.isSynced=l===void 0||l===!0,this.isSynced&&!this.isLoaded&&this.emit("load",[this])}),this.whenSynced=c()}load(){let e=this._item;e!==null&&!this.shouldLoad&&v(e.parent.doc,n=>{n.subdocsLoaded.add(this)},null,!0),this.shouldLoad=!0}getSubdocs(){return this.subdocs}getSubdocGuids(){return new Set(oe(this.subdocs).map(e=>e.guid))}transact(e,n=null){return v(this,e,n)}get(e,n=T){let r=F(this.share,e,()=>{let i=new n;return i._integrate(this,null),i}),s=r.constructor;if(n!==T&&s!==n)if(s===T){let i=new n;i._map=r._map,r._map.forEach(o=>{for(;o!==null;o=o.left)o.parent=i}),i._start=r._start;for(let o=i._start;o!==null;o=o.right)o.parent=i;return i._length=r._length,this.share.set(e,i),i._integrate(this,null),i}else throw new Error(`Type with the name ${e} has already been defined with a different constructor`);return r}getArray(e=""){return this.get(e,Je)}getText(e=""){return this.get(e,St)}getMap(e=""){return this.get(e,Ye)}getXmlElement(e=""){return this.get(e,Xe)}getXmlFragment(e=""){return this.get(e,Ke)}toJSON(){let e={};return this.share.forEach((n,r)=>{e[r]=n.toJSON()}),e}destroy(){this.isDestroyed=!0,oe(this.subdocs).forEach(n=>n.destroy());let e=this._item;if(e!==null){this._item=null;let n=e.content;n.doc=new t({guid:this.guid,...n.opts,shouldLoad:!1}),n.doc._item=e,v(e.parent.doc,r=>{let s=n.doc;e.deleted||r.subdocsAdded.add(s),r.subdocsRemoved.add(this)},null,!0)}this.emit("destroyed",[!0]),this.emit("destroy",[this]),super.destroy()}},He=class{constructor(e){this.restDecoder=e}resetDsCurVal(){}readDsClock(){return x(this.restDecoder)}readDsLen(){return x(this.restDecoder)}},$=class extends He{readLeftID(){return w(x(this.restDecoder),x(this.restDecoder))}readRightID(){return w(x(this.restDecoder),x(this.restDecoder))}readClient(){return x(this.restDecoder)}readInfo(){return Fe(this.restDecoder)}readString(){return Ee(this.restDecoder)}readParentInfo(){return x(this.restDecoder)===1}readTypeRef(){return x(this.restDecoder)}readLen(){return x(this.restDecoder)}readAny(){return wt(this.restDecoder)}readBuf(){return Yi(G(this.restDecoder))}readJSON(){return JSON.parse(Ee(this.restDecoder))}readKey(){return Ee(this.restDecoder)}},Hn=class{constructor(e){this.dsCurrVal=0,this.restDecoder=e}resetDsCurVal(){this.dsCurrVal=0}readDsClock(){return this.dsCurrVal+=x(this.restDecoder),this.dsCurrVal}readDsLen(){let e=x(this.restDecoder)+1;return this.dsCurrVal+=e,e}},q=class extends Hn{constructor(e){super(e),this.keys=[],x(e),this.keyClockDecoder=new xt(G(e)),this.clientDecoder=new je(G(e)),this.leftClockDecoder=new xt(G(e)),this.rightClockDecoder=new xt(G(e)),this.infoDecoder=new Jt(G(e),Fe),this.stringDecoder=new Bn(G(e)),this.parentInfoDecoder=new Jt(G(e),Fe),this.typeRefDecoder=new je(G(e)),this.lenDecoder=new je(G(e))}readLeftID(){return new ge(this.clientDecoder.read(),this.leftClockDecoder.read())}readRightID(){return new ge(this.clientDecoder.read(),this.rightClockDecoder.read())}readClient(){return this.clientDecoder.read()}readInfo(){return this.infoDecoder.read()}readString(){return this.stringDecoder.read()}readParentInfo(){return this.parentInfoDecoder.read()===1}readTypeRef(){return this.typeRefDecoder.read()}readLen(){return this.lenDecoder.read()}readAny(){return wt(this.restDecoder)}readBuf(){return G(this.restDecoder)}readJSON(){return wt(this.restDecoder)}readKey(){let e=this.keyClockDecoder.read();if(e<this.keys.length)return this.keys[e];{let n=this.stringDecoder.read();return this.keys.push(n),n}}},De=class{constructor(){this.restEncoder=Ve()}toUint8Array(){return H(this.restEncoder)}resetDsCurVal(){}writeDsClock(e){y(this.restEncoder,e)}writeDsLen(e){y(this.restEncoder,e)}},he=class extends De{writeLeftID(e){y(this.restEncoder,e.client),y(this.restEncoder,e.clock)}writeRightID(e){y(this.restEncoder,e.client),y(this.restEncoder,e.clock)}writeClient(e){y(this.restEncoder,e)}writeInfo(e){gt(this.restEncoder,e)}writeString(e){Se(this.restEncoder,e)}writeParentInfo(e){y(this.restEncoder,e?1:0)}writeTypeRef(e){y(this.restEncoder,e)}writeLen(e){y(this.restEncoder,e)}writeAny(e){ft(this.restEncoder,e)}writeBuf(e){W(this.restEncoder,e)}writeJSON(e){Se(this.restEncoder,JSON.stringify(e))}writeKey(e){Se(this.restEncoder,e)}},bt=class{constructor(){this.restEncoder=Ve(),this.dsCurrVal=0}toUint8Array(){return H(this.restEncoder)}resetDsCurVal(){this.dsCurrVal=0}writeDsClock(e){let n=e-this.dsCurrVal;this.dsCurrVal=e,y(this.restEncoder,n)}writeDsLen(e){e===0&&j(),y(this.restEncoder,e-1),this.dsCurrVal+=e}},z=class extends bt{constructor(){super(),this.keyMap=new Map,this.keyClock=0,this.keyClockEncoder=new pt,this.clientEncoder=new Pe,this.leftClockEncoder=new pt,this.rightClockEncoder=new pt,this.infoEncoder=new Ht(gt),this.stringEncoder=new Nn,this.parentInfoEncoder=new Ht(gt),this.typeRefEncoder=new Pe,this.lenEncoder=new Pe}toUint8Array(){let e=Ve();return y(e,0),W(e,this.keyClockEncoder.toUint8Array()),W(e,this.clientEncoder.toUint8Array()),W(e,this.leftClockEncoder.toUint8Array()),W(e,this.rightClockEncoder.toUint8Array()),W(e,H(this.infoEncoder)),W(e,this.stringEncoder.toUint8Array()),W(e,H(this.parentInfoEncoder)),W(e,this.typeRefEncoder.toUint8Array()),W(e,this.lenEncoder.toUint8Array()),mt(e,H(this.restEncoder)),H(e)}writeLeftID(e){this.clientEncoder.write(e.client),this.leftClockEncoder.write(e.clock)}writeRightID(e){this.clientEncoder.write(e.client),this.rightClockEncoder.write(e.clock)}writeClient(e){this.clientEncoder.write(e)}writeInfo(e){this.infoEncoder.write(e)}writeString(e){this.stringEncoder.write(e)}writeParentInfo(e){this.parentInfoEncoder.write(e?1:0)}writeTypeRef(e){this.typeRefEncoder.write(e)}writeLen(e){this.lenEncoder.write(e)}writeAny(e){ft(this.restEncoder,e)}writeBuf(e){W(this.restEncoder,e)}writeJSON(e){ft(this.restEncoder,e)}writeKey(e){let n=this.keyMap.get(e);n===void 0?(this.keyClockEncoder.write(this.keyClock++),this.stringEncoder.write(e)):this.keyClockEncoder.write(n)}},Pl=(t,e,n,r)=>{r=pe(r,e[0].id.clock);let s=X(e,r);y(t.restEncoder,e.length-s),t.writeClient(n),y(t.restEncoder,r);let i=e[s];i.write(t,r-i.id.clock);for(let o=s+1;o<e.length;o++)e[o].write(t,0)},fs=(t,e,n)=>{let r=new Map;n.forEach((s,i)=>{C(e,i)>s&&r.set(i,s)}),gn(e).forEach((s,i)=>{n.has(i)||r.set(i,0)}),y(t.restEncoder,r.size),oe(r.entries()).sort((s,i)=>i[0]-s[0]).forEach(([s,i])=>{Pl(t,e.clients.get(s),s,i)})},Vl=(t,e)=>{let n=N(),r=x(t.restDecoder);for(let s=0;s<r;s++){let i=x(t.restDecoder),o=new Array(i),a=t.readClient(),c=x(t.restDecoder);n.set(a,{i:0,refs:o});for(let l=0;l<i;l++){let d=t.readInfo();switch(31&d){case 0:{let h=t.readLen();o[l]=new V(w(a,c),h),c+=h;break}case 10:{let h=x(t.restDecoder);o[l]=new M(w(a,c),h),c+=h;break}default:{let h=(d&192)===0,u=new S(w(a,c),null,(d&128)===128?t.readLeftID():null,null,(d&64)===64?t.readRightID():null,h?t.readParentInfo()?e.get(t.readString()):t.readLeftID():null,h&&(d&32)===32?t.readString():null,aa(t,d));o[l]=u,c+=u.length}}}}return n},Fl=(t,e,n)=>{let r=[],s=oe(n.keys()).sort((f,p)=>f-p);if(s.length===0)return null;let i=()=>{if(s.length===0)return null;let f=n.get(s[s.length-1]);for(;f.refs.length===f.i;)if(s.pop(),s.length>0)f=n.get(s[s.length-1]);else return null;return f},o=i();if(o===null)return null;let a=new Jn,c=new Map,l=(f,p)=>{let g=c.get(f);(g==null||g>p)&&c.set(f,p)},d=o.refs[o.i++],h=new Map,u=()=>{for(let f of r){let p=f.id.client,g=n.get(p);g?(g.i--,a.clients.set(p,g.refs.slice(g.i)),n.delete(p),g.i=0,g.refs=[]):a.clients.set(p,[f]),s=s.filter(_=>_!==p)}r.length=0};for(;;){if(d.constructor!==M){let p=F(h,d.id.client,()=>C(e,d.id.client))-d.id.clock;if(p<0)r.push(d),l(d.id.client,d.id.clock-1),u();else{let g=d.getMissing(t,e);if(g!==null){r.push(d);let _=n.get(g)||{refs:[],i:0};if(_.refs.length===_.i)l(g,C(e,g)),u();else{d=_.refs[_.i++];continue}}else(p===0||p<d.length)&&(d.integrate(t,p),h.set(d.id.client,d.id.clock+d.length))}}if(r.length>0)d=r.pop();else if(o!==null&&o.i<o.refs.length)d=o.refs[o.i++];else{if(o=i(),o===null)break;d=o.refs[o.i++]}}if(a.clients.size>0){let f=new z;return fs(f,a,new Map),y(f.restEncoder,0),{missing:c,update:f.toUint8Array()}}return null},jl=(t,e)=>fs(t,e.doc.store,e.beforeState),ps=(t,e,n,r=new q(t))=>v(e,s=>{s.local=!1;let i=!1,o=s.doc,a=o.store,c=Vl(r,o),l=Fl(s,a,c),d=a.pendingStructs;if(d){for(let[u,f]of d.missing)if(f<C(a,u)){i=!0;break}if(l){for(let[u,f]of l.missing){let p=d.missing.get(u);(p==null||p>f)&&d.missing.set(u,f)}d.update=ln([d.update,l.update])}}else a.pendingStructs=l;let h=oo(r,s,a);if(a.pendingDs){let u=new q(B(a.pendingDs));x(u.restDecoder);let f=oo(u,s,a);h&&f?a.pendingDs=ln([h,f]):a.pendingDs=h||f}else a.pendingDs=h;if(i){let u=a.pendingStructs.update;a.pendingStructs=null,ir(s.doc,u)}},n,!1),ql=(t,e,n)=>ps(t,e,n,new $(t)),ir=(t,e,n,r=q)=>{let s=B(e);ps(s,t,n,new r(s))},Wl=(t,e,n)=>ir(t,e,n,$),Gl=(t,e,n=new Map)=>{fs(t,e.store,n),de(t,us(e.store))},ko=(t,e=new Uint8Array([0]),n=new z)=>{let r=gs(e);Gl(n,t,r);let s=[n.toUint8Array()];if(t.store.pendingDs&&s.push(t.store.pendingDs),t.store.pendingStructs&&s.push(xs(t.store.pendingStructs.update,e)),s.length>1){if(n.constructor===he)return Mo(s.map((i,o)=>o===0?i:jo(i)));if(n.constructor===z)return ln(s)}return s[0]},$l=(t,e)=>ko(t,e,new he),Eo=t=>{let e=new Map,n=x(t.restDecoder);for(let r=0;r<n;r++){let s=x(t.restDecoder),i=x(t.restDecoder);e.set(s,i)}return e},gs=t=>Eo(new He(B(t))),ms=(t,e)=>(y(t.restEncoder,e.size),oe(e.entries()).sort((n,r)=>r[0]-n[0]).forEach(([n,r])=>{y(t.restEncoder,n),y(t.restEncoder,r)}),t),Hl=(t,e)=>ms(t,gn(e.store)),zl=(t,e=new bt)=>(t instanceof Map?ms(e,t):Hl(e,t),e.toUint8Array()),Jl=t=>zl(t,new De),ts=class{constructor(){this.l=[]}},ao=()=>new ts,co=(t,e)=>t.l.push(e),lo=(t,e)=>{let n=t.l,r=n.length;t.l=n.filter(s=>e!==s),r===t.l.length&&console.error("[yjs] Tried to remove event handler that doesn't exist.")},Co=(t,e,n)=>Kt(t.l,[e,n]),ge=class{constructor(e,n){this.client=e,this.clock=n}},qe=(t,e)=>t===e||t!==null&&e!==null&&t.client===e.client&&t.clock===e.clock,w=(t,e)=>new ge(t,e),ho=(t,e)=>{y(t,e.client),y(t,e.clock)},uo=t=>w(x(t),x(t)),ys=t=>{for(let[e,n]of t.doc.share.entries())if(n===t)return e;throw j()},on=(t,e)=>{for(;e!==null;){if(e.parent===t)return!0;e=e.parent._item}return!1},Yl=t=>{let e=[],n=t._start;for(;n;)e.push(n),n=n.right;console.log("Children: ",e),console.log("Children content: ",e.filter(r=>!r.deleted).map(r=>r.content))},ns=class{constructor(e,n=e.getMap("users")){let r=new Map;this.yusers=n,this.doc=e,this.clients=new Map,this.dss=r;let s=(i,o)=>{let a=i.get("ds"),c=i.get("ids"),l=d=>this.clients.set(d,o);a.observe(d=>{d.changes.added.forEach(h=>{h.content.getContent().forEach(u=>{u instanceof Uint8Array&&this.dss.set(o,$e([this.dss.get(o)||sr(),me(new He(B(u)))]))})})}),this.dss.set(o,$e(a.map(d=>me(new He(B(d)))))),c.observe(d=>d.changes.added.forEach(h=>h.content.getContent().forEach(l))),c.forEach(l)};n.observe(i=>{i.keysChanged.forEach(o=>s(n.get(o),o))}),n.forEach(s)}setUserMapping(e,n,r,{filter:s=()=>!0}={}){let i=this.yusers,o=i.get(r);o||(o=new Ye,o.set("ids",new Je),o.set("ds",new Je),i.set(r,o)),o.get("ids").push([n]),i.observe(a=>{setTimeout(()=>{let c=i.get(r);if(c!==o){o=c,this.clients.forEach((h,u)=>{r===h&&o.get("ids").push([u])});let l=new De,d=this.dss.get(r);d&&(de(l,d),o.get("ds").push([l.toUint8Array()]))}},0)}),e.on("afterTransaction",a=>{setTimeout(()=>{let c=o.get("ds"),l=a.deleteSet;if(a.local&&l.clients.size>0&&s(a,l)){let d=new De;de(d,l),c.push([d.toUint8Array()])}})})}getUserByClientId(e){return this.clients.get(e)||null}getUserByDeletedId(e){for(let[n,r]of this.dss.entries())if(et(r,e))return n;return null}},vt=class{constructor(e,n,r,s=0){this.type=e,this.tname=n,this.item=r,this.assoc=s}},Kl=t=>{let e={};return t.type&&(e.type=t.type),t.tname&&(e.tname=t.tname),t.item&&(e.item=t.item),t.assoc!=null&&(e.assoc=t.assoc),e},Xl=t=>new vt(t.type==null?null:w(t.type.client,t.type.clock),t.tname??null,t.item==null?null:w(t.item.client,t.item.clock),t.assoc==null?0:t.assoc),zn=class{constructor(e,n,r=0){this.type=e,this.index=n,this.assoc=r}},Zl=(t,e,n=0)=>new zn(t,e,n),jn=(t,e,n)=>{let r=null,s=null;return t._item===null?s=ys(t):r=w(t._item.id.client,t._item.id.clock),new vt(r,s,e,n)},Ql=(t,e,n=0)=>{let r=t._start;if(n<0){if(e===0)return jn(t,null,n);e--}for(;r!==null;){if(!r.deleted&&r.countable){if(r.length>e)return jn(t,w(r.id.client,r.id.clock+e),n);e-=r.length}if(r.right===null&&n<0)return jn(t,r.lastId,n);r=r.right}return jn(t,null,n)},ed=(t,e)=>{let{type:n,tname:r,item:s,assoc:i}=e;if(s!==null)y(t,0),ho(t,s);else if(r!==null)gt(t,1),Se(t,r);else if(n!==null)gt(t,2),ho(t,n);else throw j();return zt(t,i),t},td=t=>{let e=Ve();return ed(e,t),H(e)},nd=t=>{let e=null,n=null,r=null;switch(x(t)){case 0:r=uo(t);break;case 1:n=Ee(t);break;case 2:e=uo(t)}let s=Br(t)?Yt(t):0;return new vt(e,n,r,s)},rd=t=>nd(B(t)),sd=(t,e)=>{let n=We(t,e),r=e.clock-n.id.clock;return{item:n,diff:r}},id=(t,e,n=!0)=>{let r=e.store,s=t.item,i=t.type,o=t.tname,a=t.assoc,c=null,l=0;if(s!==null){if(C(r,s.client)<=s.clock)return null;let d=n?ls(r,s):sd(r,s),h=d.item;if(!(h instanceof S))return null;if(c=h.parent,c._item===null||!c._item.deleted){l=h.deleted||!h.countable?0:d.diff+(a>=0?0:1);let u=h.left;for(;u!==null;)!u.deleted&&u.countable&&(l+=u.length),u=u.left}}else{if(o!==null)c=e.get(o);else if(i!==null){if(C(r,i.client)<=i.clock)return null;let{item:d}=n?ls(r,i):{item:We(r,i)};if(d instanceof S&&d.content instanceof Z)c=d.content.type;else return null}else throw j();a>=0?l=c._length:l=0}return Zl(c,l,t.assoc)},od=(t,e)=>t===e||t!==null&&e!==null&&t.tname===e.tname&&qe(t.item,e.item)&&qe(t.type,e.type)&&t.assoc===e.assoc,an=class{constructor(e,n){this.ds=e,this.sv=n}},ad=(t,e)=>{let n=t.ds.clients,r=e.ds.clients,s=t.sv,i=e.sv;if(s.size!==i.size||n.size!==r.size)return!1;for(let[o,a]of s.entries())if(i.get(o)!==a)return!1;for(let[o,a]of n.entries()){let c=r.get(o)||[];if(a.length!==c.length)return!1;for(let l=0;l<a.length;l++){let d=a[l],h=c[l];if(d.clock!==h.clock||d.len!==h.len)return!1}}return!0},Io=(t,e=new bt)=>(de(e,t.ds),ms(e,t.sv),e.toUint8Array()),cd=t=>Io(t,new De),To=(t,e=new Hn(B(t)))=>new an(me(e),Eo(e)),ld=t=>To(t,new He(B(t))),ws=(t,e)=>new an(t,e),dd=ws(sr(),new Map),hd=t=>ws(us(t.store),gn(t.store)),Ce=(t,e)=>e===void 0?!t.deleted:e.sv.has(t.id.client)&&(e.sv.get(t.id.client)||0)>t.id.clock&&!et(e.ds,t.id),rs=(t,e)=>{let n=F(t.meta,rs,Me),r=t.doc.store;n.has(e)||(e.sv.forEach((s,i)=>{s<C(r,i)&&P(t,w(i,s))}),Ge(t,e.ds,s=>{}),n.add(e))},ud=(t,e,n=new Oe)=>{if(t.gc)throw new Error("Garbage-collection must be disabled in `originDoc`!");let{sv:r,ds:s}=e,i=new z;return t.transact(o=>{let a=0;r.forEach(c=>{c>0&&a++}),y(i.restEncoder,a);for(let[c,l]of r){if(l===0)continue;l<C(t.store,c)&&P(o,w(c,l));let d=t.store.clients.get(c)||[],h=X(d,l-1);y(i.restEncoder,h+1),i.writeClient(c),y(i.restEncoder,0);for(let u=0;u<=h;u++)d[u].write(i,0)}de(i,s)}),ir(n,i.toUint8Array(),"snapshot"),n},fd=(t,e,n=q)=>{let r=new n(B(e)),s=new ue(r,!1);for(let o=s.curr;o!==null;o=s.next())if((t.sv.get(o.id.client)||0)<o.id.clock+o.length)return!1;let i=$e([t.ds,me(r)]);return vo(t.ds,i)},pd=(t,e)=>fd(t,e,$),Jn=class{constructor(){this.clients=new Map,this.pendingStructs=null,this.pendingDs=null}},gn=t=>{let e=new Map;return t.clients.forEach((n,r)=>{let s=n[n.length-1];e.set(r,s.id.clock+s.length)}),e},C=(t,e)=>{let n=t.clients.get(e);if(n===void 0)return 0;let r=n[n.length-1];return r.id.clock+r.length},Uo=(t,e)=>{let n=t.clients.get(e.id.client);if(n===void 0)n=[],t.clients.set(e.id.client,n);else{let r=n[n.length-1];if(r.id.clock+r.length!==e.id.clock)throw j()}n.push(e)},X=(t,e)=>{let n=0,r=t.length-1,s=t[r],i=s.id.clock;if(i===e)return r;let o=Y(e/(i+s.length-1)*r);for(;n<=r;){if(s=t[o],i=s.id.clock,i<=e){if(e<i+s.length)return o;n=o+1}else r=o-1;o=Y((n+r)/2)}throw j()},gd=(t,e)=>{let n=t.clients.get(e.client);return n[X(n,e.clock)]},We=gd,ss=(t,e,n)=>{let r=X(e,n),s=e[r];return s.id.clock<n&&s instanceof S?(e.splice(r+1,0,rr(t,s,n-s.id.clock)),r+1):r},P=(t,e)=>{let n=t.doc.store.clients.get(e.client);return n[ss(t,n,e.clock)]},is=(t,e,n)=>{let r=e.clients.get(n.client),s=X(r,n.clock),i=r[s];return n.clock!==i.id.clock+i.length-1&&i.constructor!==V&&r.splice(s+1,0,rr(t,i,n.clock-i.id.clock+1)),i},md=(t,e,n)=>{let r=t.clients.get(e.id.client);r[X(r,e.id.clock)]=n},Oo=(t,e,n,r,s)=>{if(r===0)return;let i=n+r,o=ss(t,e,n),a;do a=e[o++],i<a.id.clock+a.length&&ss(t,e,i),s(a);while(o<e.length&&e[o].id.clock<i)},Yn=class{constructor(e,n,r){this.doc=e,this.deleteSet=new Ue,this.beforeState=gn(e.store),this.afterState=new Map,this.changed=new Map,this.changedParentTypes=new Map,this._mergeStructs=[],this.origin=n,this.meta=new Map,this.local=r,this.subdocsAdded=new Set,this.subdocsRemoved=new Set,this.subdocsLoaded=new Set,this._needFormattingCleanup=!1}},fo=(t,e)=>e.deleteSet.clients.size===0&&!oi(e.afterState,(n,r)=>e.beforeState.get(r)!==n)?!1:(hs(e.deleteSet),jl(t,e),de(t,e.deleteSet),!0),po=(t,e,n)=>{let r=e._item;(r===null||r.id.clock<(t.beforeState.get(r.id.client)||0)&&!r.deleted)&&F(t.changed,e,Me).add(n)},Gn=(t,e)=>{let n=t[e],r=t[e-1],s=e;for(;s>0;n=r,r=t[--s-1]){if(r.deleted===n.deleted&&r.constructor===n.constructor&&r.mergeWith(n)){n instanceof S&&n.parentSub!==null&&n.parent._map.get(n.parentSub)===n&&n.parent._map.set(n.parentSub,r);continue}break}let i=e-s;return i&&t.splice(e+1-i,i),i},Do=(t,e,n)=>{for(let[r,s]of t.clients.entries()){let i=e.clients.get(r);for(let o=s.length-1;o>=0;o--){let a=s[o],c=a.clock+a.len;for(let l=X(i,a.clock),d=i[l];l<i.length&&d.id.clock<c;d=i[++l]){let h=i[l];if(a.clock+a.len<=h.id.clock)break;h instanceof S&&h.deleted&&!h.keep&&n(h)&&h.gc(e,!1)}}}},Ao=(t,e)=>{t.clients.forEach((n,r)=>{let s=e.clients.get(r);for(let i=n.length-1;i>=0;i--){let o=n[i],a=On(s.length-1,1+X(s,o.clock+o.len-1));for(let c=a,l=s[c];c>0&&l.id.clock>=o.clock;l=s[c])c-=1+Gn(s,c)}})},yd=(t,e,n)=>{Do(t,e,n),Ao(t,e)},Lo=(t,e)=>{if(e<t.length){let n=t[e],r=n.doc,s=r.store,i=n.deleteSet,o=n._mergeStructs;try{hs(i),n.afterState=gn(n.doc.store),r.emit("beforeObserverCalls",[n,r]);let a=[];n.changed.forEach((c,l)=>a.push(()=>{(l._item===null||!l._item.deleted)&&l._callObserver(n,c)})),a.push(()=>{n.changedParentTypes.forEach((c,l)=>{l._dEH.l.length>0&&(l._item===null||!l._item.deleted)&&(c=c.filter(d=>d.target._item===null||!d.target._item.deleted),c.forEach(d=>{d.currentTarget=l,d._path=null}),c.sort((d,h)=>d.path.length-h.path.length),a.push(()=>{Co(l._dEH,c,n)}))}),a.push(()=>r.emit("afterTransaction",[n,r])),a.push(()=>{n._needFormattingCleanup&&Vd(n)})}),Kt(a,[])}finally{r.gc&&Do(i,s,r.gcFilter),Ao(i,s),n.afterState.forEach((d,h)=>{let u=n.beforeState.get(h)||0;if(u!==d){let f=s.clients.get(h),p=pe(X(f,u),1);for(let g=f.length-1;g>=p;)g-=1+Gn(f,g)}});for(let d=o.length-1;d>=0;d--){let{client:h,clock:u}=o[d].id,f=s.clients.get(h),p=X(f,u);p+1<f.length&&Gn(f,p+1)>1||p>0&&Gn(f,p)}if(!n.local&&n.afterState.get(r.clientID)!==n.beforeState.get(r.clientID)&&(Vn(nn,Qt,"[yjs] ",en,tn,"Changed the client-id because another client seems to be using it."),r.clientID=So()),r.emit("afterTransactionCleanup",[n,r]),r._observers.has("update")){let d=new he;fo(d,n)&&r.emit("update",[d.toUint8Array(),n.origin,r,n])}if(r._observers.has("updateV2")){let d=new z;fo(d,n)&&r.emit("updateV2",[d.toUint8Array(),n.origin,r,n])}let{subdocsAdded:a,subdocsLoaded:c,subdocsRemoved:l}=n;(a.size>0||l.size>0||c.size>0)&&(a.forEach(d=>{d.clientID=r.clientID,d.collectionid==null&&(d.collectionid=r.collectionid),r.subdocs.add(d)}),l.forEach(d=>r.subdocs.delete(d)),r.emit("subdocs",[{loaded:c,added:a,removed:l},r,n]),l.forEach(d=>d.destroy())),t.length<=e+1?(r._transactionCleanups=[],r.emit("afterAllTransactions",[r,t])):Lo(t,e+1)}}},v=(t,e,n=null,r=!0)=>{let s=t._transactionCleanups,i=!1,o=null;t._transaction===null&&(i=!0,t._transaction=new Yn(t,n,r),s.push(t._transaction),s.length===1&&t.emit("beforeAllTransactions",[t]),t.emit("beforeTransaction",[t._transaction,t]));try{o=e(t._transaction)}finally{if(i){let a=t._transaction===s[0];t._transaction=null,a&&Lo(s,0)}}return o},os=class{constructor(e,n){this.insertions=n,this.deletions=e,this.meta=new Map}},go=(t,e,n)=>{Ge(t,n.deletions,r=>{r instanceof S&&e.scope.some(s=>s===t.doc||on(s,r))&&ks(r,!1)})},mo=(t,e,n)=>{let r=null,s=t.doc,i=t.scope;v(s,a=>{for(;e.length>0&&t.currStackItem===null;){let c=s.store,l=e.pop(),d=new Set,h=[],u=!1;Ge(a,l.insertions,f=>{if(f instanceof S){if(f.redone!==null){let{item:p,diff:g}=ls(c,f.id);g>0&&(p=P(a,w(p.id.client,p.id.clock+g))),f=p}!f.deleted&&i.some(p=>p===a.doc||on(p,f))&&h.push(f)}}),Ge(a,l.deletions,f=>{f instanceof S&&i.some(p=>p===a.doc||on(p,f))&&!et(l.insertions,f.id)&&d.add(f)}),d.forEach(f=>{u=oa(a,f,d,l.insertions,t.ignoreRemoteMapChanges,t)!==null||u});for(let f=h.length-1;f>=0;f--){let p=h[f];t.deleteFilter(p)&&(p.delete(a),u=!0)}t.currStackItem=u?l:null}a.changed.forEach((c,l)=>{c.has(null)&&l._searchMarker&&(l._searchMarker.length=0)}),r=a},t);let o=t.currStackItem;if(o!=null){let a=r.changedParentTypes;t.emit("stack-item-popped",[{stackItem:o,type:n,changedParentTypes:a,origin:t},t]),t.currStackItem=null}return o},as=class extends ct{constructor(e,{captureTimeout:n=500,captureTransaction:r=c=>!0,deleteFilter:s=()=>!0,trackedOrigins:i=new Set([null]),ignoreRemoteMapChanges:o=!1,doc:a=qt(e)?e[0].doc:e instanceof Oe?e:e.doc}={}){super(),this.scope=[],this.doc=a,this.addToScope(e),this.deleteFilter=s,i.add(this),this.trackedOrigins=i,this.captureTransaction=r,this.undoStack=[],this.redoStack=[],this.undoing=!1,this.redoing=!1,this.currStackItem=null,this.lastChange=0,this.ignoreRemoteMapChanges=o,this.captureTimeout=n,this.afterTransactionHandler=c=>{if(!this.captureTransaction(c)||!this.scope.some(_=>c.changedParentTypes.has(_)||_===this.doc)||!this.trackedOrigins.has(c.origin)&&(!c.origin||!this.trackedOrigins.has(c.origin.constructor)))return;let l=this.undoing,d=this.redoing,h=l?this.redoStack:this.undoStack;l?this.stopCapturing():d||this.clear(!1,!0);let u=new Ue;c.afterState.forEach((_,b)=>{let ve=c.beforeState.get(b)||0,Ft=_-ve;Ft>0&&sn(u,b,ve,Ft)});let f=Rn(),p=!1;if(this.lastChange>0&&f-this.lastChange<this.captureTimeout&&h.length>0&&!l&&!d){let _=h[h.length-1];_.deletions=$e([_.deletions,c.deleteSet]),_.insertions=$e([_.insertions,u])}else h.push(new os(c.deleteSet,u)),p=!0;!l&&!d&&(this.lastChange=f),Ge(c,c.deleteSet,_=>{_ instanceof S&&this.scope.some(b=>b===c.doc||on(b,_))&&ks(_,!0)});let g=[{stackItem:h[h.length-1],origin:c.origin,type:l?"redo":"undo",changedParentTypes:c.changedParentTypes},this];p?this.emit("stack-item-added",g):this.emit("stack-item-updated",g)},this.doc.on("afterTransaction",this.afterTransactionHandler),this.doc.on("destroy",()=>{this.destroy()})}addToScope(e){let n=new Set(this.scope);e=qt(e)?e:[e],e.forEach(r=>{n.has(r)||(n.add(r),(r instanceof T?r.doc!==this.doc:r!==this.doc)&&Zr("[yjs#509] Not same Y.Doc"),this.scope.push(r))})}addTrackedOrigin(e){this.trackedOrigins.add(e)}removeTrackedOrigin(e){this.trackedOrigins.delete(e)}clear(e=!0,n=!0){(e&&this.canUndo()||n&&this.canRedo())&&this.doc.transact(r=>{e&&(this.undoStack.forEach(s=>go(r,this,s)),this.undoStack=[]),n&&(this.redoStack.forEach(s=>go(r,this,s)),this.redoStack=[]),this.emit("stack-cleared",[{undoStackCleared:e,redoStackCleared:n}])})}stopCapturing(){this.lastChange=0}undo(){this.undoing=!0;let e;try{e=mo(this,this.undoStack,"undo")}finally{this.undoing=!1}return e}redo(){this.redoing=!0;let e;try{e=mo(this,this.redoStack,"redo")}finally{this.redoing=!1}return e}canUndo(){return this.undoStack.length>0}canRedo(){return this.redoStack.length>0}destroy(){this.trackedOrigins.delete(this),this.doc.off("afterTransaction",this.afterTransactionHandler),super.destroy()}};ue=class{constructor(e,n){this.gen=wd(e),this.curr=null,this.done=!1,this.filterSkips=n,this.next()}next(){do this.curr=this.gen.next().value||null;while(this.filterSkips&&this.curr!==null&&this.curr.constructor===M);return this.curr}},xd=t=>No(t,$),No=(t,e=q)=>{let n=[],r=new e(B(t)),s=new ue(r,!1);for(let o=s.curr;o!==null;o=s.next())n.push(o);Vn("Structs: ",n);let i=me(r);Vn("DeleteSet: ",i)},_d=t=>Bo(t,$),Bo=(t,e=q)=>{let n=[],r=new e(B(t)),s=new ue(r,!1);for(let i=s.curr;i!==null;i=s.next())n.push(i);return{structs:n,ds:me(r)}},cn=class{constructor(e){this.currClient=0,this.startClock=0,this.written=0,this.encoder=e,this.clientStructs=[]}},Mo=t=>ln(t,$,he),Ro=(t,e=bt,n=q)=>{let r=new e,s=new ue(new n(B(t)),!1),i=s.curr;if(i!==null){let o=0,a=i.id.client,c=i.id.clock!==0,l=c?0:i.id.clock+i.length;for(;i!==null;i=s.next())a!==i.id.client&&(l!==0&&(o++,y(r.restEncoder,a),y(r.restEncoder,l)),a=i.id.client,l=0,c=i.id.clock!==0),i.constructor===M&&(c=!0),c||(l=i.id.clock+i.length);l!==0&&(o++,y(r.restEncoder,a),y(r.restEncoder,l));let d=Ve();return y(d,o),_i(d,r.restEncoder),r.restEncoder=d,r.toUint8Array()}else return y(r.restEncoder,0),r.toUint8Array()},bd=t=>Ro(t,De,$),Po=(t,e=q)=>{let n=new Map,r=new Map,s=new ue(new e(B(t)),!1),i=s.curr;if(i!==null){let o=i.id.client,a=i.id.clock;for(n.set(o,a);i!==null;i=s.next())o!==i.id.client&&(r.set(o,a),n.set(i.id.client,i.id.clock),o=i.id.client),a=i.id.clock+i.length;r.set(o,a)}return{from:n,to:r}},vd=t=>Po(t,$),Sd=(t,e)=>{if(t.constructor===V){let{client:n,clock:r}=t.id;return new V(w(n,r+e),t.length-e)}else if(t.constructor===M){let{client:n,clock:r}=t.id;return new M(w(n,r+e),t.length-e)}else{let n=t,{client:r,clock:s}=n.id;return new S(w(r,s+e),null,w(r,s+e-1),null,n.rightOrigin,n.parent,n.parentSub,n.content.splice(e))}},ln=(t,e=q,n=z)=>{if(t.length===1)return t[0];let r=t.map(d=>new e(B(d))),s=r.map(d=>new ue(d,!0)),i=null,o=new n,a=new cn(o);for(;s=s.filter(u=>u.curr!==null),s.sort((u,f)=>{if(u.curr.id.client===f.curr.id.client){let p=u.curr.id.clock-f.curr.id.clock;return p===0?u.curr.constructor===f.curr.constructor?0:u.curr.constructor===M?1:-1:p}else return f.curr.id.client-u.curr.id.client}),s.length!==0;){let d=s[0],h=d.curr.id.client;if(i!==null){let u=d.curr,f=!1;for(;u!==null&&u.id.clock+u.length<=i.struct.id.clock+i.struct.length&&u.id.client>=i.struct.id.client;)u=d.next(),f=!0;if(u===null||u.id.client!==h||f&&u.id.clock>i.struct.id.clock+i.struct.length)continue;if(h!==i.struct.id.client)Ie(a,i.struct,i.offset),i={struct:u,offset:0},d.next();else if(i.struct.id.clock+i.struct.length<u.id.clock)if(i.struct.constructor===M)i.struct.length=u.id.clock+u.length-i.struct.id.clock;else{Ie(a,i.struct,i.offset);let p=u.id.clock-i.struct.id.clock-i.struct.length;i={struct:new M(w(h,i.struct.id.clock+i.struct.length),p),offset:0}}else{let p=i.struct.id.clock+i.struct.length-u.id.clock;p>0&&(i.struct.constructor===M?i.struct.length-=p:u=Sd(u,p)),i.struct.mergeWith(u)||(Ie(a,i.struct,i.offset),i={struct:u,offset:0},d.next())}}else i={struct:d.curr,offset:0},d.next();for(let u=d.curr;u!==null&&u.id.client===h&&u.id.clock===i.struct.id.clock+i.struct.length&&u.constructor!==M;u=d.next())Ie(a,i.struct,i.offset),i={struct:u,offset:0}}i!==null&&(Ie(a,i.struct,i.offset),i=null),_s(a);let c=r.map(d=>me(d)),l=$e(c);return de(o,l),o.toUint8Array()},xs=(t,e,n=q,r=z)=>{let s=gs(e),i=new r,o=new cn(i),a=new n(B(t)),c=new ue(a,!1);for(;c.curr;){let d=c.curr,h=d.id.client,u=s.get(h)||0;if(c.curr.constructor===M){c.next();continue}if(d.id.clock+d.length>u)for(Ie(o,d,pe(u-d.id.clock,0)),c.next();c.curr&&c.curr.id.client===h;)Ie(o,c.curr,0),c.next();else for(;c.curr&&c.curr.id.client===h&&c.curr.id.clock+c.curr.length<=u;)c.next()}_s(o);let l=me(a);return de(i,l),i.toUint8Array()},kd=(t,e)=>xs(t,e,$,he),Vo=t=>{t.written>0&&(t.clientStructs.push({written:t.written,restEncoder:H(t.encoder.restEncoder)}),t.encoder.restEncoder=Ve(),t.written=0)},Ie=(t,e,n)=>{t.written>0&&t.currClient!==e.id.client&&Vo(t),t.written===0&&(t.currClient=e.id.client,t.encoder.writeClient(e.id.client),y(t.encoder.restEncoder,e.id.clock+n)),e.write(t.encoder,n),t.written++},_s=t=>{Vo(t);let e=t.encoder.restEncoder;y(e,t.clientStructs.length);for(let n=0;n<t.clientStructs.length;n++){let r=t.clientStructs[n];y(e,r.written),mt(e,r.restEncoder)}},or=(t,e,n,r)=>{let s=new n(B(t)),i=new ue(s,!1),o=new r,a=new cn(o);for(let l=i.curr;l!==null;l=i.next())Ie(a,e(l),0);_s(a);let c=me(s);return de(o,c),o.toUint8Array()},Fo=({formatting:t=!0,subdocs:e=!0,yxml:n=!0}={})=>{let r=0,s=N(),i=N(),o=N(),a=N();return a.set(null,null),c=>{switch(c.constructor){case V:case M:return c;case S:{let l=c,d=l.content;switch(d.constructor){case Et:break;case Z:{if(n){let h=d.type;h instanceof Xe&&(h.nodeName=F(i,h.nodeName,()=>"node-"+r)),h instanceof fn&&(h.hookName=F(i,h.hookName,()=>"hook-"+r))}break}case Ae:{let h=d;h.arr=h.arr.map(()=>r);break}case Ze:{let h=d;h.content=new Uint8Array([r]);break}case Qe:{let h=d;e&&(h.opts={},h.doc.guid=r+"");break}case ye:{let h=d;h.embed={};break}case U:{let h=d;t&&(h.key=F(o,h.key,()=>r+""),h.value=F(a,h.value,()=>({i:r})));break}case pn:{let h=d;h.arr=h.arr.map(()=>r);break}case re:{let h=d;h.str=gi(r%10+"",h.str.length);break}default:j()}return l.parentSub&&(l.parentSub=F(s,l.parentSub,()=>r+"")),r++,c}default:j()}}},Ed=(t,e)=>or(t,Fo(e),$,he),Cd=(t,e)=>or(t,Fo(e),q,z),Id=t=>or(t,Wr,$,z),jo=t=>or(t,Wr,q,he),yo="You must not compute changes after the event-handler fired.",ze=class{constructor(e,n){this.target=e,this.currentTarget=e,this.transaction=n,this._changes=null,this._keys=null,this._delta=null,this._path=null}get path(){return this._path||(this._path=Td(this.currentTarget,this.target))}deletes(e){return et(this.transaction.deleteSet,e.id)}get keys(){if(this._keys===null){if(this.transaction.doc._transactionCleanups.length===0)throw ae(yo);let e=new Map,n=this.target;this.transaction.changed.get(n).forEach(s=>{if(s!==null){let i=n._map.get(s),o,a;if(this.adds(i)){let c=i.left;for(;c!==null&&this.adds(c);)c=c.left;if(this.deletes(i))if(c!==null&&this.deletes(c))o="delete",a=Tn(c.content.getContent());else return;else c!==null&&this.deletes(c)?(o="update",a=Tn(c.content.getContent())):(o="add",a=void 0)}else if(this.deletes(i))o="delete",a=Tn(i.content.getContent());else return;e.set(s,{action:o,oldValue:a})}}),this._keys=e}return this._keys}get delta(){return this.changes.delta}adds(e){return e.id.clock>=(this.transaction.beforeState.get(e.id.client)||0)}get changes(){let e=this._changes;if(e===null){if(this.transaction.doc._transactionCleanups.length===0)throw ae(yo);let n=this.target,r=Me(),s=Me(),i=[];if(e={added:r,deleted:s,delta:i,keys:this.keys},this.transaction.changed.get(n).has(null)){let a=null,c=()=>{a&&i.push(a)};for(let l=n._start;l!==null;l=l.right)l.deleted?this.deletes(l)&&!this.adds(l)&&((a===null||a.delete===void 0)&&(c(),a={delete:0}),a.delete+=l.length,s.add(l)):this.adds(l)?((a===null||a.insert===void 0)&&(c(),a={insert:[]}),a.insert=a.insert.concat(l.content.getContent()),r.add(l)):((a===null||a.retain===void 0)&&(c(),a={retain:0}),a.retain+=l.length);a!==null&&a.retain===void 0&&c()}this._changes=e}return e}},Td=(t,e)=>{let n=[];for(;e._item!==null&&e!==t;){if(e._item.parentSub!==null)n.unshift(e._item.parentSub);else{let r=0,s=e._item.parent._start;for(;s!==e._item&&s!==null;)!s.deleted&&s.countable&&(r+=s.length),s=s.right;n.unshift(r)}e=e._item.parent}return n},R=()=>{Zr("Invalid access: Add Yjs type to a document before reading data.")},qo=80,bs=0,cs=class{constructor(e,n){e.marker=!0,this.p=e,this.index=n,this.timestamp=bs++}},Ud=t=>{t.timestamp=bs++},Wo=(t,e,n)=>{t.p.marker=!1,t.p=e,e.marker=!0,t.index=n,t.timestamp=bs++},Od=(t,e,n)=>{if(t.length>=qo){let r=t.reduce((s,i)=>s.timestamp<i.timestamp?s:i);return Wo(r,e,n),r}else{let r=new cs(e,n);return t.push(r),r}},ar=(t,e)=>{if(t._start===null||e===0||t._searchMarker===null)return null;let n=t._searchMarker.length===0?null:t._searchMarker.reduce((i,o)=>lt(e-i.index)<lt(e-o.index)?i:o),r=t._start,s=0;for(n!==null&&(r=n.p,s=n.index,Ud(n));r.right!==null&&s<e;){if(!r.deleted&&r.countable){if(e<s+r.length)break;s+=r.length}r=r.right}for(;r.left!==null&&s>e;)r=r.left,!r.deleted&&r.countable&&(s-=r.length);for(;r.left!==null&&r.left.id.client===r.id.client&&r.left.id.clock+r.left.length===r.id.clock;)r=r.left,!r.deleted&&r.countable&&(s-=r.length);return n!==null&&lt(n.index-s)<r.parent.length/qo?(Wo(n,r,s),n):Od(t._searchMarker,r,s)},dn=(t,e,n)=>{for(let r=t.length-1;r>=0;r--){let s=t[r];if(n>0){let i=s.p;for(i.marker=!1;i&&(i.deleted||!i.countable);)i=i.left,i&&!i.deleted&&i.countable&&(s.index-=i.length);if(i===null||i.marker===!0){t.splice(r,1);continue}s.p=i,i.marker=!0}(e<s.index||n>0&&e===s.index)&&(s.index=pe(e,s.index+n))}},Dd=t=>{t.doc??R();let e=t._start,n=[];for(;e;)n.push(e),e=e.right;return n},cr=(t,e,n)=>{let r=t,s=e.changedParentTypes;for(;F(s,t,()=>[]).push(n),t._item!==null;)t=t._item.parent;Co(r._eH,n,e)},T=class{constructor(){this._item=null,this._map=new Map,this._start=null,this.doc=null,this._length=0,this._eH=ao(),this._dEH=ao(),this._searchMarker=null}get parent(){return this._item?this._item.parent:null}_integrate(e,n){this.doc=e,this._item=n}_copy(){throw ne()}clone(){throw ne()}_write(e){}get _first(){let e=this._start;for(;e!==null&&e.deleted;)e=e.right;return e}_callObserver(e,n){!e.local&&this._searchMarker&&(this._searchMarker.length=0)}observe(e){co(this._eH,e)}observeDeep(e){co(this._dEH,e)}unobserve(e){lo(this._eH,e)}unobserveDeep(e){lo(this._dEH,e)}toJSON(){}},Go=(t,e,n)=>{t.doc??R(),e<0&&(e=t._length+e),n<0&&(n=t._length+n);let r=n-e,s=[],i=t._start;for(;i!==null&&r>0;){if(i.countable&&!i.deleted){let o=i.content.getContent();if(o.length<=e)e-=o.length;else{for(let a=e;a<o.length&&r>0;a++)s.push(o[a]),r--;e=0}}i=i.right}return s},$o=t=>{t.doc??R();let e=[],n=t._start;for(;n!==null;){if(n.countable&&!n.deleted){let r=n.content.getContent();for(let s=0;s<r.length;s++)e.push(r[s])}n=n.right}return e},Ad=(t,e)=>{let n=[],r=t._start;for(;r!==null;){if(r.countable&&Ce(r,e)){let s=r.content.getContent();for(let i=0;i<s.length;i++)n.push(s[i])}r=r.right}return n},hn=(t,e)=>{let n=0,r=t._start;for(t.doc??R();r!==null;){if(r.countable&&!r.deleted){let s=r.content.getContent();for(let i=0;i<s.length;i++)e(s[i],n++,t)}r=r.right}},Ho=(t,e)=>{let n=[];return hn(t,(r,s)=>{n.push(e(r,s,t))}),n},Ld=t=>{let e=t._start,n=null,r=0;return{[Symbol.iterator](){return this},next:()=>{if(n===null){for(;e!==null&&e.deleted;)e=e.right;if(e===null)return{done:!0,value:void 0};n=e.content.getContent(),r=0,e=e.right}let s=n[r++];return n.length<=r&&(n=null),{done:!1,value:s}}}},zo=(t,e)=>{t.doc??R();let n=ar(t,e),r=t._start;for(n!==null&&(r=n.p,e-=n.index);r!==null;r=r.right)if(!r.deleted&&r.countable){if(e<r.length)return r.content.getContent()[e];e-=r.length}},Kn=(t,e,n,r)=>{let s=n,i=t.doc,o=i.clientID,a=i.store,c=n===null?e._start:n.right,l=[],d=()=>{l.length>0&&(s=new S(w(o,C(a,o)),s,s&&s.lastId,c,c&&c.id,e,null,new Ae(l)),s.integrate(t,0),l=[])};r.forEach(h=>{if(h===null)l.push(h);else switch(h.constructor){case Number:case Object:case Boolean:case Array:case String:l.push(h);break;default:switch(d(),h.constructor){case Uint8Array:case ArrayBuffer:s=new S(w(o,C(a,o)),s,s&&s.lastId,c,c&&c.id,e,null,new Ze(new Uint8Array(h))),s.integrate(t,0);break;case Oe:s=new S(w(o,C(a,o)),s,s&&s.lastId,c,c&&c.id,e,null,new Qe(h)),s.integrate(t,0);break;default:if(h instanceof T)s=new S(w(o,C(a,o)),s,s&&s.lastId,c,c&&c.id,e,null,new Z(h)),s.integrate(t,0);else throw new Error("Unexpected content type in insert operation")}}}),d()},Jo=()=>ae("Length exceeded!"),Yo=(t,e,n,r)=>{if(n>e._length)throw Jo();if(n===0)return e._searchMarker&&dn(e._searchMarker,n,r.length),Kn(t,e,null,r);let s=n,i=ar(e,n),o=e._start;for(i!==null&&(o=i.p,n-=i.index,n===0&&(o=o.prev,n+=o&&o.countable&&!o.deleted?o.length:0));o!==null;o=o.right)if(!o.deleted&&o.countable){if(n<=o.length){n<o.length&&P(t,w(o.id.client,o.id.clock+n));break}n-=o.length}return e._searchMarker&&dn(e._searchMarker,s,r.length),Kn(t,e,o,r)},Nd=(t,e,n)=>{let s=(e._searchMarker||[]).reduce((i,o)=>o.index>i.index?o:i,{index:0,p:e._start}).p;if(s)for(;s.right;)s=s.right;return Kn(t,e,s,n)},Ko=(t,e,n,r)=>{if(r===0)return;let s=n,i=r,o=ar(e,n),a=e._start;for(o!==null&&(a=o.p,n-=o.index);a!==null&&n>0;a=a.right)!a.deleted&&a.countable&&(n<a.length&&P(t,w(a.id.client,a.id.clock+n)),n-=a.length);for(;r>0&&a!==null;)a.deleted||(r<a.length&&P(t,w(a.id.client,a.id.clock+r)),a.delete(t),r-=a.length),a=a.right;if(r>0)throw Jo();e._searchMarker&&dn(e._searchMarker,s,-i+r)},Xn=(t,e,n)=>{let r=e._map.get(n);r!==void 0&&r.delete(t)},vs=(t,e,n,r)=>{let s=e._map.get(n)||null,i=t.doc,o=i.clientID,a;if(r==null)a=new Ae([r]);else switch(r.constructor){case Number:case Object:case Boolean:case Array:case String:case Date:case BigInt:a=new Ae([r]);break;case Uint8Array:a=new Ze(r);break;case Oe:a=new Qe(r);break;default:if(r instanceof T)a=new Z(r);else throw new Error("Unexpected content type")}new S(w(o,C(i.store,o)),s,s&&s.lastId,null,null,e,n,a).integrate(t,0)},Ss=(t,e)=>{t.doc??R();let n=t._map.get(e);return n!==void 0&&!n.deleted?n.content.getContent()[n.length-1]:void 0},Xo=t=>{let e={};return t.doc??R(),t._map.forEach((n,r)=>{n.deleted||(e[r]=n.content.getContent()[n.length-1])}),e},Zo=(t,e)=>{t.doc??R();let n=t._map.get(e);return n!==void 0&&!n.deleted},Bd=(t,e,n)=>{let r=t._map.get(e)||null;for(;r!==null&&(!n.sv.has(r.id.client)||r.id.clock>=(n.sv.get(r.id.client)||0));)r=r.left;return r!==null&&Ce(r,n)?r.content.getContent()[r.length-1]:void 0},Qo=(t,e)=>{let n={};return t._map.forEach((r,s)=>{let i=r;for(;i!==null&&(!e.sv.has(i.id.client)||i.id.clock>=(e.sv.get(i.id.client)||0));)i=i.left;i!==null&&Ce(i,e)&&(n[s]=i.content.getContent()[i.length-1])}),n},qn=t=>(t.doc??R(),no(t._map.entries(),e=>!e[1].deleted)),Zn=class extends ze{},Je=class t extends T{constructor(){super(),this._prelimContent=[],this._searchMarker=[]}static from(e){let n=new t;return n.push(e),n}_integrate(e,n){super._integrate(e,n),this.insert(0,this._prelimContent),this._prelimContent=null}_copy(){return new t}clone(){let e=new t;return e.insert(0,this.toArray().map(n=>n instanceof T?n.clone():n)),e}get length(){return this.doc??R(),this._length}_callObserver(e,n){super._callObserver(e,n),cr(this,e,new Zn(this,e))}insert(e,n){this.doc!==null?v(this.doc,r=>{Yo(r,this,e,n)}):this._prelimContent.splice(e,0,...n)}push(e){this.doc!==null?v(this.doc,n=>{Nd(n,this,e)}):this._prelimContent.push(...e)}unshift(e){this.insert(0,e)}delete(e,n=1){this.doc!==null?v(this.doc,r=>{Ko(r,this,e,n)}):this._prelimContent.splice(e,n)}get(e){return zo(this,e)}toArray(){return $o(this)}slice(e=0,n=this.length){return Go(this,e,n)}toJSON(){return this.map(e=>e instanceof T?e.toJSON():e)}map(e){return Ho(this,e)}forEach(e){hn(this,e)}[Symbol.iterator](){return Ld(this)}_write(e){e.writeTypeRef(nh)}},Md=t=>new Je,Qn=class extends ze{constructor(e,n,r){super(e,n),this.keysChanged=r}},Ye=class t extends T{constructor(e){super(),this._prelimContent=null,e===void 0?this._prelimContent=new Map:this._prelimContent=new Map(e)}_integrate(e,n){super._integrate(e,n),this._prelimContent.forEach((r,s)=>{this.set(s,r)}),this._prelimContent=null}_copy(){return new t}clone(){let e=new t;return this.forEach((n,r)=>{e.set(r,n instanceof T?n.clone():n)}),e}_callObserver(e,n){cr(this,e,new Qn(this,e,n))}toJSON(){this.doc??R();let e={};return this._map.forEach((n,r)=>{if(!n.deleted){let s=n.content.getContent()[n.length-1];e[r]=s instanceof T?s.toJSON():s}}),e}get size(){return[...qn(this)].length}keys(){return Fn(qn(this),e=>e[0])}values(){return Fn(qn(this),e=>e[1].content.getContent()[e[1].length-1])}entries(){return Fn(qn(this),e=>[e[0],e[1].content.getContent()[e[1].length-1]])}forEach(e){this.doc??R(),this._map.forEach((n,r)=>{n.deleted||e(n.content.getContent()[n.length-1],r,this)})}[Symbol.iterator](){return this.entries()}delete(e){this.doc!==null?v(this.doc,n=>{Xn(n,this,e)}):this._prelimContent.delete(e)}set(e,n){return this.doc!==null?v(this.doc,r=>{vs(r,this,e,n)}):this._prelimContent.set(e,n),n}get(e){return Ss(this,e)}has(e){return Zo(this,e)}clear(){this.doc!==null?v(this.doc,e=>{this.forEach(function(n,r,s){Xn(e,s,r)})}):this._prelimContent.clear()}_write(e){e.writeTypeRef(rh)}},Rd=t=>new Ye,Te=(t,e)=>t===e||typeof t=="object"&&typeof e=="object"&&t&&e&&qi(t,e),un=class{constructor(e,n,r,s){this.left=e,this.right=n,this.index=r,this.currentAttributes=s}forward(){this.right===null&&j(),this.right.content.constructor===U?this.right.deleted||Ct(this.currentAttributes,this.right.content):this.right.deleted||(this.index+=this.right.length),this.left=this.right,this.right=this.right.right}},wo=(t,e,n)=>{for(;e.right!==null&&n>0;)e.right.content.constructor===U?e.right.deleted||Ct(e.currentAttributes,e.right.content):e.right.deleted||(n<e.right.length&&P(t,w(e.right.id.client,e.right.id.clock+n)),e.index+=e.right.length,n-=e.right.length),e.left=e.right,e.right=e.right.right;return e},Wn=(t,e,n,r)=>{let s=new Map,i=r?ar(e,n):null;if(i){let o=new un(i.p.left,i.p,i.index,s);return wo(t,o,n-i.index)}else{let o=new un(null,e._start,0,s);return wo(t,o,n)}},ea=(t,e,n,r)=>{for(;n.right!==null&&(n.right.deleted===!0||n.right.content.constructor===U&&Te(r.get(n.right.content.key),n.right.content.value));)n.right.deleted||r.delete(n.right.content.key),n.forward();let s=t.doc,i=s.clientID;r.forEach((o,a)=>{let c=n.left,l=n.right,d=new S(w(i,C(s.store,i)),c,c&&c.lastId,l,l&&l.id,e,null,new U(a,o));d.integrate(t,0),n.right=d,n.forward()})},Ct=(t,e)=>{let{key:n,value:r}=e;r===null?t.delete(n):t.set(n,r)},ta=(t,e)=>{for(;t.right!==null;){if(!(t.right.deleted||t.right.content.constructor===U&&Te(e[t.right.content.key]??null,t.right.content.value)))break;t.forward()}},na=(t,e,n,r)=>{let s=t.doc,i=s.clientID,o=new Map;for(let a in r){let c=r[a],l=n.currentAttributes.get(a)??null;if(!Te(l,c)){o.set(a,l);let{left:d,right:h}=n;n.right=new S(w(i,C(s.store,i)),d,d&&d.lastId,h,h&&h.id,e,null,new U(a,c)),n.right.integrate(t,0),n.forward()}}return o},Qr=(t,e,n,r,s)=>{n.currentAttributes.forEach((u,f)=>{s[f]===void 0&&(s[f]=null)});let i=t.doc,o=i.clientID;ta(n,s);let a=na(t,e,n,s),c=r.constructor===String?new re(r):r instanceof T?new Z(r):new ye(r),{left:l,right:d,index:h}=n;e._searchMarker&&dn(e._searchMarker,n.index,c.getLength()),d=new S(w(o,C(i.store,o)),l,l&&l.lastId,d,d&&d.id,e,null,c),d.integrate(t,0),n.right=d,n.index=h,n.forward(),ea(t,e,n,a)},xo=(t,e,n,r,s)=>{let i=t.doc,o=i.clientID;ta(n,s);let a=na(t,e,n,s);e:for(;n.right!==null&&(r>0||a.size>0&&(n.right.deleted||n.right.content.constructor===U));){if(!n.right.deleted)switch(n.right.content.constructor){case U:{let{key:c,value:l}=n.right.content,d=s[c];if(d!==void 0){if(Te(d,l))a.delete(c);else{if(r===0)break e;a.set(c,l)}n.right.delete(t)}else n.currentAttributes.set(c,l);break}default:r<n.right.length&&P(t,w(n.right.id.client,n.right.id.clock+r)),r-=n.right.length;break}n.forward()}if(r>0){let c="";for(;r>0;r--)c+=`
`;n.right=new S(w(o,C(i.store,o)),n.left,n.left&&n.left.lastId,n.right,n.right&&n.right.id,e,null,new re(c)),n.right.integrate(t,0),n.forward()}ea(t,e,n,a)},ra=(t,e,n,r,s)=>{let i=e,o=N();for(;i&&(!i.countable||i.deleted);){if(!i.deleted&&i.content.constructor===U){let l=i.content;o.set(l.key,l)}i=i.right}let a=0,c=!1;for(;e!==i;){if(n===e&&(c=!0),!e.deleted){let l=e.content;if(l.constructor===U){let{key:d,value:h}=l,u=r.get(d)??null;(o.get(d)!==l||u===h)&&(e.delete(t),a++,!c&&(s.get(d)??null)===h&&u!==h&&(u===null?s.delete(d):s.set(d,u))),!c&&!e.deleted&&Ct(s,l)}}e=e.right}return a},Pd=(t,e)=>{for(;e&&e.right&&(e.right.deleted||!e.right.countable);)e=e.right;let n=new Set;for(;e&&(e.deleted||!e.countable);){if(!e.deleted&&e.content.constructor===U){let r=e.content.key;n.has(r)?e.delete(t):n.add(r)}e=e.left}},sa=t=>{let e=0;return v(t.doc,n=>{let r=t._start,s=t._start,i=N(),o=Cn(i);for(;s;)s.deleted===!1&&(s.content.constructor===U?Ct(o,s.content):(e+=ra(n,r,s,i,o),i=Cn(o),r=s)),s=s.right}),e},Vd=t=>{let e=new Set,n=t.doc;for(let[r,s]of t.afterState.entries()){let i=t.beforeState.get(r)||0;s!==i&&Oo(t,n.store.clients.get(r),i,s,o=>{!o.deleted&&o.content.constructor===U&&o.constructor!==V&&e.add(o.parent)})}v(n,r=>{Ge(t,t.deleteSet,s=>{if(s instanceof V||!s.parent._hasFormatting||e.has(s.parent))return;let i=s.parent;s.content.constructor===U?e.add(i):Pd(r,s)});for(let s of e)sa(s)})},_o=(t,e,n)=>{let r=n,s=Cn(e.currentAttributes),i=e.right;for(;n>0&&e.right!==null;){if(e.right.deleted===!1)switch(e.right.content.constructor){case Z:case ye:case re:n<e.right.length&&P(t,w(e.right.id.client,e.right.id.clock+n)),n-=e.right.length,e.right.delete(t);break}e.forward()}i&&ra(t,i,e.right,s,e.currentAttributes);let o=(e.left||e.right).parent;return o._searchMarker&&dn(o._searchMarker,e.index,-r+n),e},er=class extends ze{constructor(e,n,r){super(e,n),this.childListChanged=!1,this.keysChanged=new Set,r.forEach(s=>{s===null?this.childListChanged=!0:this.keysChanged.add(s)})}get changes(){if(this._changes===null){let e={keys:this.keys,delta:this.delta,added:new Set,deleted:new Set};this._changes=e}return this._changes}get delta(){if(this._delta===null){let e=this.target.doc,n=[];v(e,r=>{let s=new Map,i=new Map,o=this.target._start,a=null,c={},l="",d=0,h=0,u=()=>{if(a!==null){let f=null;switch(a){case"delete":h>0&&(f={delete:h}),h=0;break;case"insert":(typeof l=="object"||l.length>0)&&(f={insert:l},s.size>0&&(f.attributes={},s.forEach((p,g)=>{p!==null&&(f.attributes[g]=p)}))),l="";break;case"retain":d>0&&(f={retain:d},ji(c)||(f.attributes=Vi({},c))),d=0;break}f&&n.push(f),a=null}};for(;o!==null;){switch(o.content.constructor){case Z:case ye:this.adds(o)?this.deletes(o)||(u(),a="insert",l=o.content.getContent()[0],u()):this.deletes(o)?(a!=="delete"&&(u(),a="delete"),h+=1):o.deleted||(a!=="retain"&&(u(),a="retain"),d+=1);break;case re:this.adds(o)?this.deletes(o)||(a!=="insert"&&(u(),a="insert"),l+=o.content.str):this.deletes(o)?(a!=="delete"&&(u(),a="delete"),h+=o.length):o.deleted||(a!=="retain"&&(u(),a="retain"),d+=o.length);break;case U:{let{key:f,value:p}=o.content;if(this.adds(o)){if(!this.deletes(o)){let g=s.get(f)??null;Te(g,p)?p!==null&&o.delete(r):(a==="retain"&&u(),Te(p,i.get(f)??null)?delete c[f]:c[f]=p)}}else if(this.deletes(o)){i.set(f,p);let g=s.get(f)??null;Te(g,p)||(a==="retain"&&u(),c[f]=g)}else if(!o.deleted){i.set(f,p);let g=c[f];g!==void 0&&(Te(g,p)?g!==null&&o.delete(r):(a==="retain"&&u(),p===null?delete c[f]:c[f]=p))}o.deleted||(a==="insert"&&u(),Ct(s,o.content));break}}o=o.right}for(u();n.length>0;){let f=n[n.length-1];if(f.retain!==void 0&&f.attributes===void 0)n.pop();else break}}),this._delta=n}return this._delta}},St=class t extends T{constructor(e){super(),this._pending=e!==void 0?[()=>this.insert(0,e)]:[],this._searchMarker=[],this._hasFormatting=!1}get length(){return this.doc??R(),this._length}_integrate(e,n){super._integrate(e,n);try{this._pending.forEach(r=>r())}catch(r){console.error(r)}this._pending=null}_copy(){return new t}clone(){let e=new t;return e.applyDelta(this.toDelta()),e}_callObserver(e,n){super._callObserver(e,n);let r=new er(this,e,n);cr(this,e,r),!e.local&&this._hasFormatting&&(e._needFormattingCleanup=!0)}toString(){this.doc??R();let e="",n=this._start;for(;n!==null;)!n.deleted&&n.countable&&n.content.constructor===re&&(e+=n.content.str),n=n.right;return e}toJSON(){return this.toString()}applyDelta(e,{sanitize:n=!0}={}){this.doc!==null?v(this.doc,r=>{let s=new un(null,this._start,0,new Map);for(let i=0;i<e.length;i++){let o=e[i];if(o.insert!==void 0){let a=!n&&typeof o.insert=="string"&&i===e.length-1&&s.right===null&&o.insert.slice(-1)===`
`?o.insert.slice(0,-1):o.insert;(typeof a!="string"||a.length>0)&&Qr(r,this,s,a,o.attributes||{})}else o.retain!==void 0?xo(r,this,s,o.retain,o.attributes||{}):o.delete!==void 0&&_o(r,s,o.delete)}}):this._pending.push(()=>this.applyDelta(e))}toDelta(e,n,r){this.doc??R();let s=[],i=new Map,o=this.doc,a="",c=this._start;function l(){if(a.length>0){let h={},u=!1;i.forEach((p,g)=>{u=!0,h[g]=p});let f={insert:a};u&&(f.attributes=h),s.push(f),a=""}}let d=()=>{for(;c!==null;){if(Ce(c,e)||n!==void 0&&Ce(c,n))switch(c.content.constructor){case re:{let h=i.get("ychange");e!==void 0&&!Ce(c,e)?(h===void 0||h.user!==c.id.client||h.type!=="removed")&&(l(),i.set("ychange",r?r("removed",c.id):{type:"removed"})):n!==void 0&&!Ce(c,n)?(h===void 0||h.user!==c.id.client||h.type!=="added")&&(l(),i.set("ychange",r?r("added",c.id):{type:"added"})):h!==void 0&&(l(),i.delete("ychange")),a+=c.content.str;break}case Z:case ye:{l();let h={insert:c.content.getContent()[0]};if(i.size>0){let u={};h.attributes=u,i.forEach((f,p)=>{u[p]=f})}s.push(h);break}case U:Ce(c,e)&&(l(),Ct(i,c.content));break}c=c.right}l()};return e||n?v(o,h=>{e&&rs(h,e),n&&rs(h,n),d()},"cleanup"):d(),s}insert(e,n,r){if(n.length<=0)return;let s=this.doc;s!==null?v(s,i=>{let o=Wn(i,this,e,!r);r||(r={},o.currentAttributes.forEach((a,c)=>{r[c]=a})),Qr(i,this,o,n,r)}):this._pending.push(()=>this.insert(e,n,r))}insertEmbed(e,n,r){let s=this.doc;s!==null?v(s,i=>{let o=Wn(i,this,e,!r);Qr(i,this,o,n,r||{})}):this._pending.push(()=>this.insertEmbed(e,n,r||{}))}delete(e,n){if(n===0)return;let r=this.doc;r!==null?v(r,s=>{_o(s,Wn(s,this,e,!0),n)}):this._pending.push(()=>this.delete(e,n))}format(e,n,r){if(n===0)return;let s=this.doc;s!==null?v(s,i=>{let o=Wn(i,this,e,!1);o.right!==null&&xo(i,this,o,n,r)}):this._pending.push(()=>this.format(e,n,r))}removeAttribute(e){this.doc!==null?v(this.doc,n=>{Xn(n,this,e)}):this._pending.push(()=>this.removeAttribute(e))}setAttribute(e,n){this.doc!==null?v(this.doc,r=>{vs(r,this,e,n)}):this._pending.push(()=>this.setAttribute(e,n))}getAttribute(e){return Ss(this,e)}getAttributes(){return Xo(this)}_write(e){e.writeTypeRef(sh)}},Fd=t=>new St,rn=class{constructor(e,n=()=>!0){this._filter=n,this._root=e,this._currentNode=e._start,this._firstCall=!0,e.doc??R()}[Symbol.iterator](){return this}next(){let e=this._currentNode,n=e&&e.content&&e.content.type;if(e!==null&&(!this._firstCall||e.deleted||!this._filter(n)))do if(n=e.content.type,!e.deleted&&(n.constructor===Xe||n.constructor===Ke)&&n._start!==null)e=n._start;else for(;e!==null;){let r=e.next;if(r!==null){e=r;break}else e.parent===this._root?e=null:e=e.parent._item}while(e!==null&&(e.deleted||!this._filter(e.content.type)));return this._firstCall=!1,e===null?{value:void 0,done:!0}:(this._currentNode=e,{value:e.content.type,done:!1})}},Ke=class t extends T{constructor(){super(),this._prelimContent=[]}get firstChild(){let e=this._first;return e?e.content.getContent()[0]:null}_integrate(e,n){super._integrate(e,n),this.insert(0,this._prelimContent),this._prelimContent=null}_copy(){return new t}clone(){let e=new t;return e.insert(0,this.toArray().map(n=>n instanceof T?n.clone():n)),e}get length(){return this.doc??R(),this._prelimContent===null?this._length:this._prelimContent.length}createTreeWalker(e){return new rn(this,e)}querySelector(e){e=e.toUpperCase();let r=new rn(this,s=>s.nodeName&&s.nodeName.toUpperCase()===e).next();return r.done?null:r.value}querySelectorAll(e){return e=e.toUpperCase(),oe(new rn(this,n=>n.nodeName&&n.nodeName.toUpperCase()===e))}_callObserver(e,n){cr(this,e,new tr(this,n,e))}toString(){return Ho(this,e=>e.toString()).join("")}toJSON(){return this.toString()}toDOM(e=document,n={},r){let s=e.createDocumentFragment();return r!==void 0&&r._createAssociation(s,this),hn(this,i=>{s.insertBefore(i.toDOM(e,n,r),null)}),s}insert(e,n){this.doc!==null?v(this.doc,r=>{Yo(r,this,e,n)}):this._prelimContent.splice(e,0,...n)}insertAfter(e,n){if(this.doc!==null)v(this.doc,r=>{let s=e&&e instanceof T?e._item:e;Kn(r,this,s,n)});else{let r=this._prelimContent,s=e===null?0:r.findIndex(i=>i===e)+1;if(s===0&&e!==null)throw ae("Reference item not found");r.splice(s,0,...n)}}delete(e,n=1){this.doc!==null?v(this.doc,r=>{Ko(r,this,e,n)}):this._prelimContent.splice(e,n)}toArray(){return $o(this)}push(e){this.insert(this.length,e)}unshift(e){this.insert(0,e)}get(e){return zo(this,e)}slice(e=0,n=this.length){return Go(this,e,n)}forEach(e){hn(this,e)}_write(e){e.writeTypeRef(oh)}},jd=t=>new Ke,Xe=class t extends Ke{constructor(e="UNDEFINED"){super(),this.nodeName=e,this._prelimAttrs=new Map}get nextSibling(){let e=this._item?this._item.next:null;return e?e.content.type:null}get prevSibling(){let e=this._item?this._item.prev:null;return e?e.content.type:null}_integrate(e,n){super._integrate(e,n),this._prelimAttrs.forEach((r,s)=>{this.setAttribute(s,r)}),this._prelimAttrs=null}_copy(){return new t(this.nodeName)}clone(){let e=new t(this.nodeName),n=this.getAttributes();return Fi(n,(r,s)=>{e.setAttribute(s,r)}),e.insert(0,this.toArray().map(r=>r instanceof T?r.clone():r)),e}toString(){let e=this.getAttributes(),n=[],r=[];for(let a in e)r.push(a);r.sort();let s=r.length;for(let a=0;a<s;a++){let c=r[a];n.push(c+'="'+e[c]+'"')}let i=this.nodeName.toLocaleLowerCase(),o=n.length>0?" "+n.join(" "):"";return`<${i}${o}>${super.toString()}</${i}>`}removeAttribute(e){this.doc!==null?v(this.doc,n=>{Xn(n,this,e)}):this._prelimAttrs.delete(e)}setAttribute(e,n){this.doc!==null?v(this.doc,r=>{vs(r,this,e,n)}):this._prelimAttrs.set(e,n)}getAttribute(e){return Ss(this,e)}hasAttribute(e){return Zo(this,e)}getAttributes(e){return e?Qo(this,e):Xo(this)}toDOM(e=document,n={},r){let s=e.createElement(this.nodeName),i=this.getAttributes();for(let o in i){let a=i[o];typeof a=="string"&&s.setAttribute(o,a)}return hn(this,o=>{s.appendChild(o.toDOM(e,n,r))}),r!==void 0&&r._createAssociation(s,this),s}_write(e){e.writeTypeRef(ih),e.writeKey(this.nodeName)}},qd=t=>new Xe(t.readKey()),tr=class extends ze{constructor(e,n,r){super(e,r),this.childListChanged=!1,this.attributesChanged=new Set,n.forEach(s=>{s===null?this.childListChanged=!0:this.attributesChanged.add(s)})}},fn=class t extends Ye{constructor(e){super(),this.hookName=e}_copy(){return new t(this.hookName)}clone(){let e=new t(this.hookName);return this.forEach((n,r)=>{e.set(r,n)}),e}toDOM(e=document,n={},r){let s=n[this.hookName],i;return s!==void 0?i=s.createDom(this):i=document.createElement(this.hookName),i.setAttribute("data-yjs-hook",this.hookName),r!==void 0&&r._createAssociation(i,this),i}_write(e){e.writeTypeRef(ah),e.writeKey(this.hookName)}},Wd=t=>new fn(t.readKey()),nr=class t extends St{get nextSibling(){let e=this._item?this._item.next:null;return e?e.content.type:null}get prevSibling(){let e=this._item?this._item.prev:null;return e?e.content.type:null}_copy(){return new t}clone(){let e=new t;return e.applyDelta(this.toDelta()),e}toDOM(e=document,n,r){let s=e.createTextNode(this.toString());return r!==void 0&&r._createAssociation(s,this),s}toString(){return this.toDelta().map(e=>{let n=[];for(let s in e.attributes){let i=[];for(let o in e.attributes[s])i.push({key:o,value:e.attributes[s][o]});i.sort((o,a)=>o.key<a.key?-1:1),n.push({nodeName:s,attrs:i})}n.sort((s,i)=>s.nodeName<i.nodeName?-1:1);let r="";for(let s=0;s<n.length;s++){let i=n[s];r+=`<${i.nodeName}`;for(let o=0;o<i.attrs.length;o++){let a=i.attrs[o];r+=` ${a.key}="${a.value}"`}r+=">"}r+=e.insert;for(let s=n.length-1;s>=0;s--)r+=`</${n[s].nodeName}>`;return r}).join("")}toJSON(){return this.toString()}_write(e){e.writeTypeRef(ch)}},Gd=t=>new nr,kt=class{constructor(e,n){this.id=e,this.length=n}get deleted(){throw ne()}mergeWith(e){return!1}write(e,n,r){throw ne()}integrate(e,n){throw ne()}},$d=0,V=class extends kt{get deleted(){return!0}delete(){}mergeWith(e){return this.constructor!==e.constructor?!1:(this.length+=e.length,!0)}integrate(e,n){n>0&&(this.id.clock+=n,this.length-=n),Uo(e.doc.store,this)}write(e,n){e.writeInfo($d),e.writeLen(this.length-n)}getMissing(e,n){return null}},Ze=class t{constructor(e){this.content=e}getLength(){return 1}getContent(){return[this.content]}isCountable(){return!0}copy(){return new t(this.content)}splice(e){throw ne()}mergeWith(e){return!1}integrate(e,n){}delete(e){}gc(e){}write(e,n){e.writeBuf(this.content)}getRef(){return 3}},Hd=t=>new Ze(t.readBuf()),Et=class t{constructor(e){this.len=e}getLength(){return this.len}getContent(){return[]}isCountable(){return!1}copy(){return new t(this.len)}splice(e){let n=new t(this.len-e);return this.len=e,n}mergeWith(e){return this.len+=e.len,!0}integrate(e,n){sn(e.deleteSet,n.id.client,n.id.clock,this.len),n.markDeleted()}delete(e){}gc(e){}write(e,n){e.writeLen(this.len-n)}getRef(){return 1}},zd=t=>new Et(t.readLen()),ia=(t,e)=>new Oe({guid:t,...e,shouldLoad:e.shouldLoad||e.autoLoad||!1}),Qe=class t{constructor(e){e._item&&console.error("This document was already integrated as a sub-document. You should create a second instance instead with the same guid."),this.doc=e;let n={};this.opts=n,e.gc||(n.gc=!1),e.autoLoad&&(n.autoLoad=!0),e.meta!==null&&(n.meta=e.meta)}getLength(){return 1}getContent(){return[this.doc]}isCountable(){return!0}copy(){return new t(ia(this.doc.guid,this.opts))}splice(e){throw ne()}mergeWith(e){return!1}integrate(e,n){this.doc._item=n,e.subdocsAdded.add(this.doc),this.doc.shouldLoad&&e.subdocsLoaded.add(this.doc)}delete(e){e.subdocsAdded.has(this.doc)?e.subdocsAdded.delete(this.doc):e.subdocsRemoved.add(this.doc)}gc(e){}write(e,n){e.writeString(this.doc.guid),e.writeAny(this.opts)}getRef(){return 9}},Jd=t=>new Qe(ia(t.readString(),t.readAny())),ye=class t{constructor(e){this.embed=e}getLength(){return 1}getContent(){return[this.embed]}isCountable(){return!0}copy(){return new t(this.embed)}splice(e){throw ne()}mergeWith(e){return!1}integrate(e,n){}delete(e){}gc(e){}write(e,n){e.writeJSON(this.embed)}getRef(){return 5}},Yd=t=>new ye(t.readJSON()),U=class t{constructor(e,n){this.key=e,this.value=n}getLength(){return 1}getContent(){return[]}isCountable(){return!1}copy(){return new t(this.key,this.value)}splice(e){throw ne()}mergeWith(e){return!1}integrate(e,n){let r=n.parent;r._searchMarker=null,r._hasFormatting=!0}delete(e){}gc(e){}write(e,n){e.writeKey(this.key),e.writeJSON(this.value)}getRef(){return 6}},Kd=t=>new U(t.readKey(),t.readJSON()),pn=class t{constructor(e){this.arr=e}getLength(){return this.arr.length}getContent(){return this.arr}isCountable(){return!0}copy(){return new t(this.arr)}splice(e){let n=new t(this.arr.slice(e));return this.arr=this.arr.slice(0,e),n}mergeWith(e){return this.arr=this.arr.concat(e.arr),!0}integrate(e,n){}delete(e){}gc(e){}write(e,n){let r=this.arr.length;e.writeLen(r-n);for(let s=n;s<r;s++){let i=this.arr[s];e.writeString(i===void 0?"undefined":JSON.stringify(i))}}getRef(){return 2}},Xd=t=>{let e=t.readLen(),n=[];for(let r=0;r<e;r++){let s=t.readString();s==="undefined"?n.push(void 0):n.push(JSON.parse(s))}return new pn(n)},Zd=Zt("node_env")==="development",Ae=class t{constructor(e){this.arr=e,Zd&&qr(e)}getLength(){return this.arr.length}getContent(){return this.arr}isCountable(){return!0}copy(){return new t(this.arr)}splice(e){let n=new t(this.arr.slice(e));return this.arr=this.arr.slice(0,e),n}mergeWith(e){return this.arr=this.arr.concat(e.arr),!0}integrate(e,n){}delete(e){}gc(e){}write(e,n){let r=this.arr.length;e.writeLen(r-n);for(let s=n;s<r;s++){let i=this.arr[s];e.writeAny(i)}}getRef(){return 8}},Qd=t=>{let e=t.readLen(),n=[];for(let r=0;r<e;r++)n.push(t.readAny());return new Ae(n)},re=class t{constructor(e){this.str=e}getLength(){return this.str.length}getContent(){return this.str.split("")}isCountable(){return!0}copy(){return new t(this.str)}splice(e){let n=new t(this.str.slice(e));this.str=this.str.slice(0,e);let r=this.str.charCodeAt(e-1);return r>=55296&&r<=56319&&(this.str=this.str.slice(0,e-1)+"\uFFFD",n.str="\uFFFD"+n.str.slice(1)),n}mergeWith(e){return this.str+=e.str,!0}integrate(e,n){}delete(e){}gc(e){}write(e,n){e.writeString(n===0?this.str:this.str.slice(n))}getRef(){return 4}},eh=t=>new re(t.readString()),th=[Md,Rd,Fd,qd,jd,Wd,Gd],nh=0,rh=1,sh=2,ih=3,oh=4,ah=5,ch=6,Z=class t{constructor(e){this.type=e}getLength(){return 1}getContent(){return[this.type]}isCountable(){return!0}copy(){return new t(this.type._copy())}splice(e){throw ne()}mergeWith(e){return!1}integrate(e,n){this.type._integrate(e.doc,n)}delete(e){let n=this.type._start;for(;n!==null;)n.deleted?n.id.clock<(e.beforeState.get(n.id.client)||0)&&e._mergeStructs.push(n):n.delete(e),n=n.right;this.type._map.forEach(r=>{r.deleted?r.id.clock<(e.beforeState.get(r.id.client)||0)&&e._mergeStructs.push(r):r.delete(e)}),e.changed.delete(this.type)}gc(e){let n=this.type._start;for(;n!==null;)n.gc(e,!0),n=n.right;this.type._start=null,this.type._map.forEach(r=>{for(;r!==null;)r.gc(e,!0),r=r.left}),this.type._map=new Map}write(e,n){this.type._write(e)}getRef(){return 7}},lh=t=>new Z(th[t.readTypeRef()](t)),ls=(t,e)=>{let n=e,r=0,s;do r>0&&(n=w(n.client,n.clock+r)),s=We(t,n),r=n.clock-s.id.clock,n=s.redone;while(n!==null&&s instanceof S);return{item:s,diff:r}},ks=(t,e)=>{for(;t!==null&&t.keep!==e;)t.keep=e,t=t.parent._item},rr=(t,e,n)=>{let{client:r,clock:s}=e.id,i=new S(w(r,s+n),e,w(r,s+n-1),e.right,e.rightOrigin,e.parent,e.parentSub,e.content.splice(n));return e.deleted&&i.markDeleted(),e.keep&&(i.keep=!0),e.redone!==null&&(i.redone=w(e.redone.client,e.redone.clock+n)),e.right=i,i.right!==null&&(i.right.left=i),t._mergeStructs.push(i),i.parentSub!==null&&i.right===null&&i.parent._map.set(i.parentSub,i),e.length=n,i},bo=(t,e)=>li(t,n=>et(n.deletions,e)),oa=(t,e,n,r,s,i)=>{let o=t.doc,a=o.store,c=o.clientID,l=e.redone;if(l!==null)return P(t,l);let d=e.parent._item,h=null,u;if(d!==null&&d.deleted===!0){if(d.redone===null&&(!n.has(d)||oa(t,d,n,r,s,i)===null))return null;for(;d.redone!==null;)d=P(t,d.redone)}let f=d===null?e.parent:d.content.type;if(e.parentSub===null){for(h=e.left,u=e;h!==null;){let b=h;for(;b!==null&&b.parent._item!==d;)b=b.redone===null?null:P(t,b.redone);if(b!==null&&b.parent._item===d){h=b;break}h=h.left}for(;u!==null;){let b=u;for(;b!==null&&b.parent._item!==d;)b=b.redone===null?null:P(t,b.redone);if(b!==null&&b.parent._item===d){u=b;break}u=u.right}}else if(u=null,e.right&&!s){for(h=e;h!==null&&h.right!==null&&(h.right.redone||et(r,h.right.id)||bo(i.undoStack,h.right.id)||bo(i.redoStack,h.right.id));)for(h=h.right;h.redone;)h=P(t,h.redone);if(h&&h.right!==null)return null}else h=f._map.get(e.parentSub)||null;let p=C(a,c),g=w(c,p),_=new S(g,h,h&&h.lastId,u,u&&u.id,f,e.parentSub,e.content.copy());return e.redone=g,ks(_,!0),_.integrate(t,0),_},S=class t extends kt{constructor(e,n,r,s,i,o,a,c){super(e,c.getLength()),this.origin=r,this.left=n,this.right=s,this.rightOrigin=i,this.parent=o,this.parentSub=a,this.redone=null,this.content=c,this.info=this.content.isCountable()?2:0}set marker(e){(this.info&8)>0!==e&&(this.info^=8)}get marker(){return(this.info&8)>0}get keep(){return(this.info&1)>0}set keep(e){this.keep!==e&&(this.info^=1)}get countable(){return(this.info&2)>0}get deleted(){return(this.info&4)>0}set deleted(e){this.deleted!==e&&(this.info^=4)}markDeleted(){this.info|=4}getMissing(e,n){if(this.origin&&this.origin.client!==this.id.client&&this.origin.clock>=C(n,this.origin.client))return this.origin.client;if(this.rightOrigin&&this.rightOrigin.client!==this.id.client&&this.rightOrigin.clock>=C(n,this.rightOrigin.client))return this.rightOrigin.client;if(this.parent&&this.parent.constructor===ge&&this.id.client!==this.parent.client&&this.parent.clock>=C(n,this.parent.client))return this.parent.client;if(this.origin&&(this.left=is(e,n,this.origin),this.origin=this.left.lastId),this.rightOrigin&&(this.right=P(e,this.rightOrigin),this.rightOrigin=this.right.id),this.left&&this.left.constructor===V||this.right&&this.right.constructor===V)this.parent=null;else if(!this.parent)this.left&&this.left.constructor===t?(this.parent=this.left.parent,this.parentSub=this.left.parentSub):this.right&&this.right.constructor===t&&(this.parent=this.right.parent,this.parentSub=this.right.parentSub);else if(this.parent.constructor===ge){let r=We(n,this.parent);r.constructor===V?this.parent=null:this.parent=r.content.type}return null}integrate(e,n){if(n>0&&(this.id.clock+=n,this.left=is(e,e.doc.store,w(this.id.client,this.id.clock-1)),this.origin=this.left.lastId,this.content=this.content.splice(n),this.length-=n),this.parent){if(!this.left&&(!this.right||this.right.left!==null)||this.left&&this.left.right!==this.right){let r=this.left,s;if(r!==null)s=r.right;else if(this.parentSub!==null)for(s=this.parent._map.get(this.parentSub)||null;s!==null&&s.left!==null;)s=s.left;else s=this.parent._start;let i=new Set,o=new Set;for(;s!==null&&s!==this.right;){if(o.add(s),i.add(s),qe(this.origin,s.origin)){if(s.id.client<this.id.client)r=s,i.clear();else if(qe(this.rightOrigin,s.rightOrigin))break}else if(s.origin!==null&&o.has(We(e.doc.store,s.origin)))i.has(We(e.doc.store,s.origin))||(r=s,i.clear());else break;s=s.right}this.left=r}if(this.left!==null){let r=this.left.right;this.right=r,this.left.right=this}else{let r;if(this.parentSub!==null)for(r=this.parent._map.get(this.parentSub)||null;r!==null&&r.left!==null;)r=r.left;else r=this.parent._start,this.parent._start=this;this.right=r}this.right!==null?this.right.left=this:this.parentSub!==null&&(this.parent._map.set(this.parentSub,this),this.left!==null&&this.left.delete(e)),this.parentSub===null&&this.countable&&!this.deleted&&(this.parent._length+=this.length),Uo(e.doc.store,this),this.content.integrate(e,this),po(e,this.parent,this.parentSub),(this.parent._item!==null&&this.parent._item.deleted||this.parentSub!==null&&this.right!==null)&&this.delete(e)}else new V(this.id,this.length).integrate(e,0)}get next(){let e=this.right;for(;e!==null&&e.deleted;)e=e.right;return e}get prev(){let e=this.left;for(;e!==null&&e.deleted;)e=e.left;return e}get lastId(){return this.length===1?this.id:w(this.id.client,this.id.clock+this.length-1)}mergeWith(e){if(this.constructor===e.constructor&&qe(e.origin,this.lastId)&&this.right===e&&qe(this.rightOrigin,e.rightOrigin)&&this.id.client===e.id.client&&this.id.clock+this.length===e.id.clock&&this.deleted===e.deleted&&this.redone===null&&e.redone===null&&this.content.constructor===e.content.constructor&&this.content.mergeWith(e.content)){let n=this.parent._searchMarker;return n&&n.forEach(r=>{r.p===e&&(r.p=this,!this.deleted&&this.countable&&(r.index-=this.length))}),e.keep&&(this.keep=!0),this.right=e.right,this.right!==null&&(this.right.left=this),this.length+=e.length,!0}return!1}delete(e){if(!this.deleted){let n=this.parent;this.countable&&this.parentSub===null&&(n._length-=this.length),this.markDeleted(),sn(e.deleteSet,this.id.client,this.id.clock,this.length),po(e,n,this.parentSub),this.content.delete(e)}}gc(e,n){if(!this.deleted)throw j();this.content.gc(e),n?md(e,this,new V(this.id,this.length)):this.content=new Et(this.length)}write(e,n){let r=n>0?w(this.id.client,this.id.clock+n-1):this.origin,s=this.rightOrigin,i=this.parentSub,o=this.content.getRef()&31|(r===null?0:128)|(s===null?0:64)|(i===null?0:32);if(e.writeInfo(o),r!==null&&e.writeLeftID(r),s!==null&&e.writeRightID(s),r===null&&s===null){let a=this.parent;if(a._item!==void 0){let c=a._item;if(c===null){let l=ys(a);e.writeParentInfo(!0),e.writeString(l)}else e.writeParentInfo(!1),e.writeLeftID(c.id)}else a.constructor===String?(e.writeParentInfo(!0),e.writeString(a)):a.constructor===ge?(e.writeParentInfo(!1),e.writeLeftID(a)):j();i!==null&&e.writeString(i)}this.content.write(e,n)}},aa=(t,e)=>dh[e&31](t),dh=[()=>{j()},zd,Xd,Hd,eh,Yd,Kd,lh,Qd,Jd,()=>{j()}],hh=10,M=class extends kt{get deleted(){return!0}delete(){}mergeWith(e){return this.constructor!==e.constructor?!1:(this.length+=e.length,!0)}integrate(e,n){j()}write(e,n){e.writeInfo(hh),y(e.restEncoder,this.length-n)}getMissing(e,n){return null}},ca=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:{},la="__ $YJS$ __";ca[la]===!0&&console.error("Yjs was already imported. This breaks constructor checks and will lead to issues! - https://github.com/yjs/yjs/issues/438");ca[la]=!0});var Es=L((Mf,fa)=>{var{randomUUID:uh,randomBytes:fh}=require("node:crypto"),ph={JOIN_REQUEST:"join-request",JOIN_DECISION:"join-decision",STATUS:"status",IDE_STATUS:"ide-status",FILE_OPEN:"file-open",YJS_UPDATE:"yjs-update",CURSOR_UPDATE:"cursor-update",CHAT_MESSAGE:"chat-message",PARTICIPANTS:"participants",RTC_SIGNAL:"rtc-signal",ERROR:"error"};function gh(){return uh()}function mh(){return fh(16).toString("hex")}function yh(t){return Buffer.from(JSON.stringify(t),"utf8").toString("base64url")}function ua(t){let e=Buffer.from(t,"base64url").toString("utf8");return JSON.parse(e)}function wh(t){return`multiplayercode://join?code=${encodeURIComponent(t)}`}function xh(t){if(!t)return null;let e=t.trim();try{if(e.includes("://")){let r=new URL(e).searchParams.get("code");if(r)return ua(r)}}catch{}try{return ua(e)}catch{return null}}fa.exports={EVENTS:ph,createSessionId:gh,createInviteSecret:mh,toInviteCode:yh,toInviteLink:wh,parseInviteInput:xh}});var we=L((Rf,ma)=>{"use strict";var pa=["nodebuffer","arraybuffer","fragments"],ga=typeof Blob<"u";ga&&pa.push("blob");ma.exports={BINARY_TYPES:pa,CLOSE_TIMEOUT:3e4,EMPTY_BUFFER:Buffer.alloc(0),GUID:"258EAFA5-E914-47DA-95CA-C5AB0DC85B11",hasBlob:ga,kForOnEventAttribute:Symbol("kIsForOnEventAttribute"),kListener:Symbol("kListener"),kStatusCode:Symbol("status-code"),kWebSocket:Symbol("websocket"),NOOP:()=>{}}});var mn=L((Pf,lr)=>{"use strict";var{EMPTY_BUFFER:_h}=we(),Cs=Buffer[Symbol.species];function bh(t,e){if(t.length===0)return _h;if(t.length===1)return t[0];let n=Buffer.allocUnsafe(e),r=0;for(let s=0;s<t.length;s++){let i=t[s];n.set(i,r),r+=i.length}return r<e?new Cs(n.buffer,n.byteOffset,r):n}function ya(t,e,n,r,s){for(let i=0;i<s;i++)n[r+i]=t[i]^e[i&3]}function wa(t,e){for(let n=0;n<t.length;n++)t[n]^=e[n&3]}function vh(t){return t.length===t.buffer.byteLength?t.buffer:t.buffer.slice(t.byteOffset,t.byteOffset+t.length)}function Is(t){if(Is.readOnly=!0,Buffer.isBuffer(t))return t;let e;return t instanceof ArrayBuffer?e=new Cs(t):ArrayBuffer.isView(t)?e=new Cs(t.buffer,t.byteOffset,t.byteLength):(e=Buffer.from(t),Is.readOnly=!1),e}lr.exports={concat:bh,mask:ya,toArrayBuffer:vh,toBuffer:Is,unmask:wa};if(!process.env.WS_NO_BUFFER_UTIL)try{let t=require("bufferutil");lr.exports.mask=function(e,n,r,s,i){i<48?ya(e,n,r,s,i):t.mask(e,n,r,s,i)},lr.exports.unmask=function(e,n){e.length<32?wa(e,n):t.unmask(e,n)}}catch{}});var ba=L((Vf,_a)=>{"use strict";var xa=Symbol("kDone"),Ts=Symbol("kRun"),Us=class{constructor(e){this[xa]=()=>{this.pending--,this[Ts]()},this.concurrency=e||1/0,this.jobs=[],this.pending=0}add(e){this.jobs.push(e),this[Ts]()}[Ts](){if(this.pending!==this.concurrency&&this.jobs.length){let e=this.jobs.shift();this.pending++,e(this[xa])}}};_a.exports=Us});var Ut=L((Ff,Ea)=>{"use strict";var yn=require("zlib"),va=mn(),Sh=ba(),{kStatusCode:Sa}=we(),kh=Buffer[Symbol.species],Eh=Buffer.from([0,0,255,255]),hr=Symbol("permessage-deflate"),xe=Symbol("total-length"),It=Symbol("callback"),Le=Symbol("buffers"),Tt=Symbol("error"),dr,Os=class{constructor(e){if(this._options=e||{},this._threshold=this._options.threshold!==void 0?this._options.threshold:1024,this._maxPayload=this._options.maxPayload|0,this._isServer=!!this._options.isServer,this._deflate=null,this._inflate=null,this.params=null,!dr){let n=this._options.concurrencyLimit!==void 0?this._options.concurrencyLimit:10;dr=new Sh(n)}}static get extensionName(){return"permessage-deflate"}offer(){let e={};return this._options.serverNoContextTakeover&&(e.server_no_context_takeover=!0),this._options.clientNoContextTakeover&&(e.client_no_context_takeover=!0),this._options.serverMaxWindowBits&&(e.server_max_window_bits=this._options.serverMaxWindowBits),this._options.clientMaxWindowBits?e.client_max_window_bits=this._options.clientMaxWindowBits:this._options.clientMaxWindowBits==null&&(e.client_max_window_bits=!0),e}accept(e){return e=this.normalizeParams(e),this.params=this._isServer?this.acceptAsServer(e):this.acceptAsClient(e),this.params}cleanup(){if(this._inflate&&(this._inflate.close(),this._inflate=null),this._deflate){let e=this._deflate[It];this._deflate.close(),this._deflate=null,e&&e(new Error("The deflate stream was closed while data was being processed"))}}acceptAsServer(e){let n=this._options,r=e.find(s=>!(n.serverNoContextTakeover===!1&&s.server_no_context_takeover||s.server_max_window_bits&&(n.serverMaxWindowBits===!1||typeof n.serverMaxWindowBits=="number"&&n.serverMaxWindowBits>s.server_max_window_bits)||typeof n.clientMaxWindowBits=="number"&&!s.client_max_window_bits));if(!r)throw new Error("None of the extension offers can be accepted");return n.serverNoContextTakeover&&(r.server_no_context_takeover=!0),n.clientNoContextTakeover&&(r.client_no_context_takeover=!0),typeof n.serverMaxWindowBits=="number"&&(r.server_max_window_bits=n.serverMaxWindowBits),typeof n.clientMaxWindowBits=="number"?r.client_max_window_bits=n.clientMaxWindowBits:(r.client_max_window_bits===!0||n.clientMaxWindowBits===!1)&&delete r.client_max_window_bits,r}acceptAsClient(e){let n=e[0];if(this._options.clientNoContextTakeover===!1&&n.client_no_context_takeover)throw new Error('Unexpected parameter "client_no_context_takeover"');if(!n.client_max_window_bits)typeof this._options.clientMaxWindowBits=="number"&&(n.client_max_window_bits=this._options.clientMaxWindowBits);else if(this._options.clientMaxWindowBits===!1||typeof this._options.clientMaxWindowBits=="number"&&n.client_max_window_bits>this._options.clientMaxWindowBits)throw new Error('Unexpected or invalid parameter "client_max_window_bits"');return n}normalizeParams(e){return e.forEach(n=>{Object.keys(n).forEach(r=>{let s=n[r];if(s.length>1)throw new Error(`Parameter "${r}" must have only a single value`);if(s=s[0],r==="client_max_window_bits"){if(s!==!0){let i=+s;if(!Number.isInteger(i)||i<8||i>15)throw new TypeError(`Invalid value for parameter "${r}": ${s}`);s=i}else if(!this._isServer)throw new TypeError(`Invalid value for parameter "${r}": ${s}`)}else if(r==="server_max_window_bits"){let i=+s;if(!Number.isInteger(i)||i<8||i>15)throw new TypeError(`Invalid value for parameter "${r}": ${s}`);s=i}else if(r==="client_no_context_takeover"||r==="server_no_context_takeover"){if(s!==!0)throw new TypeError(`Invalid value for parameter "${r}": ${s}`)}else throw new Error(`Unknown parameter "${r}"`);n[r]=s})}),e}decompress(e,n,r){dr.add(s=>{this._decompress(e,n,(i,o)=>{s(),r(i,o)})})}compress(e,n,r){dr.add(s=>{this._compress(e,n,(i,o)=>{s(),r(i,o)})})}_decompress(e,n,r){let s=this._isServer?"client":"server";if(!this._inflate){let i=`${s}_max_window_bits`,o=typeof this.params[i]!="number"?yn.Z_DEFAULT_WINDOWBITS:this.params[i];this._inflate=yn.createInflateRaw({...this._options.zlibInflateOptions,windowBits:o}),this._inflate[hr]=this,this._inflate[xe]=0,this._inflate[Le]=[],this._inflate.on("error",Ih),this._inflate.on("data",ka)}this._inflate[It]=r,this._inflate.write(e),n&&this._inflate.write(Eh),this._inflate.flush(()=>{let i=this._inflate[Tt];if(i){this._inflate.close(),this._inflate=null,r(i);return}let o=va.concat(this._inflate[Le],this._inflate[xe]);this._inflate._readableState.endEmitted?(this._inflate.close(),this._inflate=null):(this._inflate[xe]=0,this._inflate[Le]=[],n&&this.params[`${s}_no_context_takeover`]&&this._inflate.reset()),r(null,o)})}_compress(e,n,r){let s=this._isServer?"server":"client";if(!this._deflate){let i=`${s}_max_window_bits`,o=typeof this.params[i]!="number"?yn.Z_DEFAULT_WINDOWBITS:this.params[i];this._deflate=yn.createDeflateRaw({...this._options.zlibDeflateOptions,windowBits:o}),this._deflate[xe]=0,this._deflate[Le]=[],this._deflate.on("data",Ch)}this._deflate[It]=r,this._deflate.write(e),this._deflate.flush(yn.Z_SYNC_FLUSH,()=>{if(!this._deflate)return;let i=va.concat(this._deflate[Le],this._deflate[xe]);n&&(i=new kh(i.buffer,i.byteOffset,i.length-4)),this._deflate[It]=null,this._deflate[xe]=0,this._deflate[Le]=[],n&&this.params[`${s}_no_context_takeover`]&&this._deflate.reset(),r(null,i)})}};Ea.exports=Os;function Ch(t){this[Le].push(t),this[xe]+=t.length}function ka(t){if(this[xe]+=t.length,this[hr]._maxPayload<1||this[xe]<=this[hr]._maxPayload){this[Le].push(t);return}this[Tt]=new RangeError("Max payload size exceeded"),this[Tt].code="WS_ERR_UNSUPPORTED_MESSAGE_LENGTH",this[Tt][Sa]=1009,this.removeListener("data",ka),this.reset()}function Ih(t){if(this[hr]._inflate=null,this[Tt]){this[It](this[Tt]);return}t[Sa]=1007,this[It](t)}});var Ot=L((jf,ur)=>{"use strict";var{isUtf8:Ca}=require("buffer"),{hasBlob:Th}=we(),Uh=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,1,1,1,1,0,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0];function Oh(t){return t>=1e3&&t<=1014&&t!==1004&&t!==1005&&t!==1006||t>=3e3&&t<=4999}function Ds(t){let e=t.length,n=0;for(;n<e;)if((t[n]&128)===0)n++;else if((t[n]&224)===192){if(n+1===e||(t[n+1]&192)!==128||(t[n]&254)===192)return!1;n+=2}else if((t[n]&240)===224){if(n+2>=e||(t[n+1]&192)!==128||(t[n+2]&192)!==128||t[n]===224&&(t[n+1]&224)===128||t[n]===237&&(t[n+1]&224)===160)return!1;n+=3}else if((t[n]&248)===240){if(n+3>=e||(t[n+1]&192)!==128||(t[n+2]&192)!==128||(t[n+3]&192)!==128||t[n]===240&&(t[n+1]&240)===128||t[n]===244&&t[n+1]>143||t[n]>244)return!1;n+=4}else return!1;return!0}function Dh(t){return Th&&typeof t=="object"&&typeof t.arrayBuffer=="function"&&typeof t.type=="string"&&typeof t.stream=="function"&&(t[Symbol.toStringTag]==="Blob"||t[Symbol.toStringTag]==="File")}ur.exports={isBlob:Dh,isValidStatusCode:Oh,isValidUTF8:Ds,tokenChars:Uh};if(Ca)ur.exports.isValidUTF8=function(t){return t.length<24?Ds(t):Ca(t)};else if(!process.env.WS_NO_UTF_8_VALIDATE)try{let t=require("utf-8-validate");ur.exports.isValidUTF8=function(e){return e.length<32?Ds(e):t(e)}}catch{}});var Ms=L((qf,La)=>{"use strict";var{Writable:Ah}=require("stream"),Ia=Ut(),{BINARY_TYPES:Lh,EMPTY_BUFFER:Ta,kStatusCode:Nh,kWebSocket:Bh}=we(),{concat:As,toArrayBuffer:Mh,unmask:Rh}=mn(),{isValidStatusCode:Ph,isValidUTF8:Ua}=Ot(),fr=Buffer[Symbol.species],Q=0,Oa=1,Da=2,Aa=3,Ls=4,Ns=5,pr=6,Bs=class extends Ah{constructor(e={}){super(),this._allowSynchronousEvents=e.allowSynchronousEvents!==void 0?e.allowSynchronousEvents:!0,this._binaryType=e.binaryType||Lh[0],this._extensions=e.extensions||{},this._isServer=!!e.isServer,this._maxPayload=e.maxPayload|0,this._skipUTF8Validation=!!e.skipUTF8Validation,this[Bh]=void 0,this._bufferedBytes=0,this._buffers=[],this._compressed=!1,this._payloadLength=0,this._mask=void 0,this._fragmented=0,this._masked=!1,this._fin=!1,this._opcode=0,this._totalPayloadLength=0,this._messageLength=0,this._fragments=[],this._errored=!1,this._loop=!1,this._state=Q}_write(e,n,r){if(this._opcode===8&&this._state==Q)return r();this._bufferedBytes+=e.length,this._buffers.push(e),this.startLoop(r)}consume(e){if(this._bufferedBytes-=e,e===this._buffers[0].length)return this._buffers.shift();if(e<this._buffers[0].length){let r=this._buffers[0];return this._buffers[0]=new fr(r.buffer,r.byteOffset+e,r.length-e),new fr(r.buffer,r.byteOffset,e)}let n=Buffer.allocUnsafe(e);do{let r=this._buffers[0],s=n.length-e;e>=r.length?n.set(this._buffers.shift(),s):(n.set(new Uint8Array(r.buffer,r.byteOffset,e),s),this._buffers[0]=new fr(r.buffer,r.byteOffset+e,r.length-e)),e-=r.length}while(e>0);return n}startLoop(e){this._loop=!0;do switch(this._state){case Q:this.getInfo(e);break;case Oa:this.getPayloadLength16(e);break;case Da:this.getPayloadLength64(e);break;case Aa:this.getMask();break;case Ls:this.getData(e);break;case Ns:case pr:this._loop=!1;return}while(this._loop);this._errored||e()}getInfo(e){if(this._bufferedBytes<2){this._loop=!1;return}let n=this.consume(2);if((n[0]&48)!==0){let s=this.createError(RangeError,"RSV2 and RSV3 must be clear",!0,1002,"WS_ERR_UNEXPECTED_RSV_2_3");e(s);return}let r=(n[0]&64)===64;if(r&&!this._extensions[Ia.extensionName]){let s=this.createError(RangeError,"RSV1 must be clear",!0,1002,"WS_ERR_UNEXPECTED_RSV_1");e(s);return}if(this._fin=(n[0]&128)===128,this._opcode=n[0]&15,this._payloadLength=n[1]&127,this._opcode===0){if(r){let s=this.createError(RangeError,"RSV1 must be clear",!0,1002,"WS_ERR_UNEXPECTED_RSV_1");e(s);return}if(!this._fragmented){let s=this.createError(RangeError,"invalid opcode 0",!0,1002,"WS_ERR_INVALID_OPCODE");e(s);return}this._opcode=this._fragmented}else if(this._opcode===1||this._opcode===2){if(this._fragmented){let s=this.createError(RangeError,`invalid opcode ${this._opcode}`,!0,1002,"WS_ERR_INVALID_OPCODE");e(s);return}this._compressed=r}else if(this._opcode>7&&this._opcode<11){if(!this._fin){let s=this.createError(RangeError,"FIN must be set",!0,1002,"WS_ERR_EXPECTED_FIN");e(s);return}if(r){let s=this.createError(RangeError,"RSV1 must be clear",!0,1002,"WS_ERR_UNEXPECTED_RSV_1");e(s);return}if(this._payloadLength>125||this._opcode===8&&this._payloadLength===1){let s=this.createError(RangeError,`invalid payload length ${this._payloadLength}`,!0,1002,"WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH");e(s);return}}else{let s=this.createError(RangeError,`invalid opcode ${this._opcode}`,!0,1002,"WS_ERR_INVALID_OPCODE");e(s);return}if(!this._fin&&!this._fragmented&&(this._fragmented=this._opcode),this._masked=(n[1]&128)===128,this._isServer){if(!this._masked){let s=this.createError(RangeError,"MASK must be set",!0,1002,"WS_ERR_EXPECTED_MASK");e(s);return}}else if(this._masked){let s=this.createError(RangeError,"MASK must be clear",!0,1002,"WS_ERR_UNEXPECTED_MASK");e(s);return}this._payloadLength===126?this._state=Oa:this._payloadLength===127?this._state=Da:this.haveLength(e)}getPayloadLength16(e){if(this._bufferedBytes<2){this._loop=!1;return}this._payloadLength=this.consume(2).readUInt16BE(0),this.haveLength(e)}getPayloadLength64(e){if(this._bufferedBytes<8){this._loop=!1;return}let n=this.consume(8),r=n.readUInt32BE(0);if(r>Math.pow(2,21)-1){let s=this.createError(RangeError,"Unsupported WebSocket frame: payload length > 2^53 - 1",!1,1009,"WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH");e(s);return}this._payloadLength=r*Math.pow(2,32)+n.readUInt32BE(4),this.haveLength(e)}haveLength(e){if(this._payloadLength&&this._opcode<8&&(this._totalPayloadLength+=this._payloadLength,this._totalPayloadLength>this._maxPayload&&this._maxPayload>0)){let n=this.createError(RangeError,"Max payload size exceeded",!1,1009,"WS_ERR_UNSUPPORTED_MESSAGE_LENGTH");e(n);return}this._masked?this._state=Aa:this._state=Ls}getMask(){if(this._bufferedBytes<4){this._loop=!1;return}this._mask=this.consume(4),this._state=Ls}getData(e){let n=Ta;if(this._payloadLength){if(this._bufferedBytes<this._payloadLength){this._loop=!1;return}n=this.consume(this._payloadLength),this._masked&&(this._mask[0]|this._mask[1]|this._mask[2]|this._mask[3])!==0&&Rh(n,this._mask)}if(this._opcode>7){this.controlMessage(n,e);return}if(this._compressed){this._state=Ns,this.decompress(n,e);return}n.length&&(this._messageLength=this._totalPayloadLength,this._fragments.push(n)),this.dataMessage(e)}decompress(e,n){this._extensions[Ia.extensionName].decompress(e,this._fin,(s,i)=>{if(s)return n(s);if(i.length){if(this._messageLength+=i.length,this._messageLength>this._maxPayload&&this._maxPayload>0){let o=this.createError(RangeError,"Max payload size exceeded",!1,1009,"WS_ERR_UNSUPPORTED_MESSAGE_LENGTH");n(o);return}this._fragments.push(i)}this.dataMessage(n),this._state===Q&&this.startLoop(n)})}dataMessage(e){if(!this._fin){this._state=Q;return}let n=this._messageLength,r=this._fragments;if(this._totalPayloadLength=0,this._messageLength=0,this._fragmented=0,this._fragments=[],this._opcode===2){let s;this._binaryType==="nodebuffer"?s=As(r,n):this._binaryType==="arraybuffer"?s=Mh(As(r,n)):this._binaryType==="blob"?s=new Blob(r):s=r,this._allowSynchronousEvents?(this.emit("message",s,!0),this._state=Q):(this._state=pr,setImmediate(()=>{this.emit("message",s,!0),this._state=Q,this.startLoop(e)}))}else{let s=As(r,n);if(!this._skipUTF8Validation&&!Ua(s)){let i=this.createError(Error,"invalid UTF-8 sequence",!0,1007,"WS_ERR_INVALID_UTF8");e(i);return}this._state===Ns||this._allowSynchronousEvents?(this.emit("message",s,!1),this._state=Q):(this._state=pr,setImmediate(()=>{this.emit("message",s,!1),this._state=Q,this.startLoop(e)}))}}controlMessage(e,n){if(this._opcode===8){if(e.length===0)this._loop=!1,this.emit("conclude",1005,Ta),this.end();else{let r=e.readUInt16BE(0);if(!Ph(r)){let i=this.createError(RangeError,`invalid status code ${r}`,!0,1002,"WS_ERR_INVALID_CLOSE_CODE");n(i);return}let s=new fr(e.buffer,e.byteOffset+2,e.length-2);if(!this._skipUTF8Validation&&!Ua(s)){let i=this.createError(Error,"invalid UTF-8 sequence",!0,1007,"WS_ERR_INVALID_UTF8");n(i);return}this._loop=!1,this.emit("conclude",r,s),this.end()}this._state=Q;return}this._allowSynchronousEvents?(this.emit(this._opcode===9?"ping":"pong",e),this._state=Q):(this._state=pr,setImmediate(()=>{this.emit(this._opcode===9?"ping":"pong",e),this._state=Q,this.startLoop(n)}))}createError(e,n,r,s,i){this._loop=!1,this._errored=!0;let o=new e(r?`Invalid WebSocket frame: ${n}`:n);return Error.captureStackTrace(o,this.createError),o.code=i,o[Nh]=s,o}};La.exports=Bs});var Vs=L((Gf,Ma)=>{"use strict";var{Duplex:Wf}=require("stream"),{randomFillSync:Vh}=require("crypto"),Na=Ut(),{EMPTY_BUFFER:Fh,kWebSocket:jh,NOOP:qh}=we(),{isBlob:Dt,isValidStatusCode:Wh}=Ot(),{mask:Ba,toBuffer:tt}=mn(),ee=Symbol("kByteLength"),Gh=Buffer.alloc(4),gr=8*1024,nt,At=gr,se=0,$h=1,Hh=2,Rs=class t{constructor(e,n,r){this._extensions=n||{},r&&(this._generateMask=r,this._maskBuffer=Buffer.alloc(4)),this._socket=e,this._firstFragment=!0,this._compress=!1,this._bufferedBytes=0,this._queue=[],this._state=se,this.onerror=qh,this[jh]=void 0}static frame(e,n){let r,s=!1,i=2,o=!1;n.mask&&(r=n.maskBuffer||Gh,n.generateMask?n.generateMask(r):(At===gr&&(nt===void 0&&(nt=Buffer.alloc(gr)),Vh(nt,0,gr),At=0),r[0]=nt[At++],r[1]=nt[At++],r[2]=nt[At++],r[3]=nt[At++]),o=(r[0]|r[1]|r[2]|r[3])===0,i=6);let a;typeof e=="string"?(!n.mask||o)&&n[ee]!==void 0?a=n[ee]:(e=Buffer.from(e),a=e.length):(a=e.length,s=n.mask&&n.readOnly&&!o);let c=a;a>=65536?(i+=8,c=127):a>125&&(i+=2,c=126);let l=Buffer.allocUnsafe(s?a+i:i);return l[0]=n.fin?n.opcode|128:n.opcode,n.rsv1&&(l[0]|=64),l[1]=c,c===126?l.writeUInt16BE(a,2):c===127&&(l[2]=l[3]=0,l.writeUIntBE(a,4,6)),n.mask?(l[1]|=128,l[i-4]=r[0],l[i-3]=r[1],l[i-2]=r[2],l[i-1]=r[3],o?[l,e]:s?(Ba(e,r,l,i,a),[l]):(Ba(e,r,e,0,a),[l,e])):[l,e]}close(e,n,r,s){let i;if(e===void 0)i=Fh;else{if(typeof e!="number"||!Wh(e))throw new TypeError("First argument must be a valid error code number");if(n===void 0||!n.length)i=Buffer.allocUnsafe(2),i.writeUInt16BE(e,0);else{let a=Buffer.byteLength(n);if(a>123)throw new RangeError("The message must not be greater than 123 bytes");i=Buffer.allocUnsafe(2+a),i.writeUInt16BE(e,0),typeof n=="string"?i.write(n,2):i.set(n,2)}}let o={[ee]:i.length,fin:!0,generateMask:this._generateMask,mask:r,maskBuffer:this._maskBuffer,opcode:8,readOnly:!1,rsv1:!1};this._state!==se?this.enqueue([this.dispatch,i,!1,o,s]):this.sendFrame(t.frame(i,o),s)}ping(e,n,r){let s,i;if(typeof e=="string"?(s=Buffer.byteLength(e),i=!1):Dt(e)?(s=e.size,i=!1):(e=tt(e),s=e.length,i=tt.readOnly),s>125)throw new RangeError("The data size must not be greater than 125 bytes");let o={[ee]:s,fin:!0,generateMask:this._generateMask,mask:n,maskBuffer:this._maskBuffer,opcode:9,readOnly:i,rsv1:!1};Dt(e)?this._state!==se?this.enqueue([this.getBlobData,e,!1,o,r]):this.getBlobData(e,!1,o,r):this._state!==se?this.enqueue([this.dispatch,e,!1,o,r]):this.sendFrame(t.frame(e,o),r)}pong(e,n,r){let s,i;if(typeof e=="string"?(s=Buffer.byteLength(e),i=!1):Dt(e)?(s=e.size,i=!1):(e=tt(e),s=e.length,i=tt.readOnly),s>125)throw new RangeError("The data size must not be greater than 125 bytes");let o={[ee]:s,fin:!0,generateMask:this._generateMask,mask:n,maskBuffer:this._maskBuffer,opcode:10,readOnly:i,rsv1:!1};Dt(e)?this._state!==se?this.enqueue([this.getBlobData,e,!1,o,r]):this.getBlobData(e,!1,o,r):this._state!==se?this.enqueue([this.dispatch,e,!1,o,r]):this.sendFrame(t.frame(e,o),r)}send(e,n,r){let s=this._extensions[Na.extensionName],i=n.binary?2:1,o=n.compress,a,c;typeof e=="string"?(a=Buffer.byteLength(e),c=!1):Dt(e)?(a=e.size,c=!1):(e=tt(e),a=e.length,c=tt.readOnly),this._firstFragment?(this._firstFragment=!1,o&&s&&s.params[s._isServer?"server_no_context_takeover":"client_no_context_takeover"]&&(o=a>=s._threshold),this._compress=o):(o=!1,i=0),n.fin&&(this._firstFragment=!0);let l={[ee]:a,fin:n.fin,generateMask:this._generateMask,mask:n.mask,maskBuffer:this._maskBuffer,opcode:i,readOnly:c,rsv1:o};Dt(e)?this._state!==se?this.enqueue([this.getBlobData,e,this._compress,l,r]):this.getBlobData(e,this._compress,l,r):this._state!==se?this.enqueue([this.dispatch,e,this._compress,l,r]):this.dispatch(e,this._compress,l,r)}getBlobData(e,n,r,s){this._bufferedBytes+=r[ee],this._state=Hh,e.arrayBuffer().then(i=>{if(this._socket.destroyed){let a=new Error("The socket was closed while the blob was being read");process.nextTick(Ps,this,a,s);return}this._bufferedBytes-=r[ee];let o=tt(i);n?this.dispatch(o,n,r,s):(this._state=se,this.sendFrame(t.frame(o,r),s),this.dequeue())}).catch(i=>{process.nextTick(zh,this,i,s)})}dispatch(e,n,r,s){if(!n){this.sendFrame(t.frame(e,r),s);return}let i=this._extensions[Na.extensionName];this._bufferedBytes+=r[ee],this._state=$h,i.compress(e,r.fin,(o,a)=>{if(this._socket.destroyed){let c=new Error("The socket was closed while data was being compressed");Ps(this,c,s);return}this._bufferedBytes-=r[ee],this._state=se,r.readOnly=!1,this.sendFrame(t.frame(a,r),s),this.dequeue()})}dequeue(){for(;this._state===se&&this._queue.length;){let e=this._queue.shift();this._bufferedBytes-=e[3][ee],Reflect.apply(e[0],this,e.slice(1))}}enqueue(e){this._bufferedBytes+=e[3][ee],this._queue.push(e)}sendFrame(e,n){e.length===2?(this._socket.cork(),this._socket.write(e[0]),this._socket.write(e[1],n),this._socket.uncork()):this._socket.write(e[0],n)}};Ma.exports=Rs;function Ps(t,e,n){typeof n=="function"&&n(e);for(let r=0;r<t._queue.length;r++){let s=t._queue[r],i=s[s.length-1];typeof i=="function"&&i(e)}}function zh(t,e,n){Ps(t,e,n),t.onerror(e)}});var $a=L(($f,Ga)=>{"use strict";var{kForOnEventAttribute:wn,kListener:Fs}=we(),Ra=Symbol("kCode"),Pa=Symbol("kData"),Va=Symbol("kError"),Fa=Symbol("kMessage"),ja=Symbol("kReason"),Lt=Symbol("kTarget"),qa=Symbol("kType"),Wa=Symbol("kWasClean"),_e=class{constructor(e){this[Lt]=null,this[qa]=e}get target(){return this[Lt]}get type(){return this[qa]}};Object.defineProperty(_e.prototype,"target",{enumerable:!0});Object.defineProperty(_e.prototype,"type",{enumerable:!0});var rt=class extends _e{constructor(e,n={}){super(e),this[Ra]=n.code===void 0?0:n.code,this[ja]=n.reason===void 0?"":n.reason,this[Wa]=n.wasClean===void 0?!1:n.wasClean}get code(){return this[Ra]}get reason(){return this[ja]}get wasClean(){return this[Wa]}};Object.defineProperty(rt.prototype,"code",{enumerable:!0});Object.defineProperty(rt.prototype,"reason",{enumerable:!0});Object.defineProperty(rt.prototype,"wasClean",{enumerable:!0});var Nt=class extends _e{constructor(e,n={}){super(e),this[Va]=n.error===void 0?null:n.error,this[Fa]=n.message===void 0?"":n.message}get error(){return this[Va]}get message(){return this[Fa]}};Object.defineProperty(Nt.prototype,"error",{enumerable:!0});Object.defineProperty(Nt.prototype,"message",{enumerable:!0});var xn=class extends _e{constructor(e,n={}){super(e),this[Pa]=n.data===void 0?null:n.data}get data(){return this[Pa]}};Object.defineProperty(xn.prototype,"data",{enumerable:!0});var Jh={addEventListener(t,e,n={}){for(let s of this.listeners(t))if(!n[wn]&&s[Fs]===e&&!s[wn])return;let r;if(t==="message")r=function(i,o){let a=new xn("message",{data:o?i:i.toString()});a[Lt]=this,mr(e,this,a)};else if(t==="close")r=function(i,o){let a=new rt("close",{code:i,reason:o.toString(),wasClean:this._closeFrameReceived&&this._closeFrameSent});a[Lt]=this,mr(e,this,a)};else if(t==="error")r=function(i){let o=new Nt("error",{error:i,message:i.message});o[Lt]=this,mr(e,this,o)};else if(t==="open")r=function(){let i=new _e("open");i[Lt]=this,mr(e,this,i)};else return;r[wn]=!!n[wn],r[Fs]=e,n.once?this.once(t,r):this.on(t,r)},removeEventListener(t,e){for(let n of this.listeners(t))if(n[Fs]===e&&!n[wn]){this.removeListener(t,n);break}}};Ga.exports={CloseEvent:rt,ErrorEvent:Nt,Event:_e,EventTarget:Jh,MessageEvent:xn};function mr(t,e,n){typeof t=="object"&&t.handleEvent?t.handleEvent.call(t,n):t.call(e,n)}});var yr=L((Hf,Ha)=>{"use strict";var{tokenChars:_n}=Ot();function fe(t,e,n){t[e]===void 0?t[e]=[n]:t[e].push(n)}function Yh(t){let e=Object.create(null),n=Object.create(null),r=!1,s=!1,i=!1,o,a,c=-1,l=-1,d=-1,h=0;for(;h<t.length;h++)if(l=t.charCodeAt(h),o===void 0)if(d===-1&&_n[l]===1)c===-1&&(c=h);else if(h!==0&&(l===32||l===9))d===-1&&c!==-1&&(d=h);else if(l===59||l===44){if(c===-1)throw new SyntaxError(`Unexpected character at index ${h}`);d===-1&&(d=h);let f=t.slice(c,d);l===44?(fe(e,f,n),n=Object.create(null)):o=f,c=d=-1}else throw new SyntaxError(`Unexpected character at index ${h}`);else if(a===void 0)if(d===-1&&_n[l]===1)c===-1&&(c=h);else if(l===32||l===9)d===-1&&c!==-1&&(d=h);else if(l===59||l===44){if(c===-1)throw new SyntaxError(`Unexpected character at index ${h}`);d===-1&&(d=h),fe(n,t.slice(c,d),!0),l===44&&(fe(e,o,n),n=Object.create(null),o=void 0),c=d=-1}else if(l===61&&c!==-1&&d===-1)a=t.slice(c,h),c=d=-1;else throw new SyntaxError(`Unexpected character at index ${h}`);else if(s){if(_n[l]!==1)throw new SyntaxError(`Unexpected character at index ${h}`);c===-1?c=h:r||(r=!0),s=!1}else if(i)if(_n[l]===1)c===-1&&(c=h);else if(l===34&&c!==-1)i=!1,d=h;else if(l===92)s=!0;else throw new SyntaxError(`Unexpected character at index ${h}`);else if(l===34&&t.charCodeAt(h-1)===61)i=!0;else if(d===-1&&_n[l]===1)c===-1&&(c=h);else if(c!==-1&&(l===32||l===9))d===-1&&(d=h);else if(l===59||l===44){if(c===-1)throw new SyntaxError(`Unexpected character at index ${h}`);d===-1&&(d=h);let f=t.slice(c,d);r&&(f=f.replace(/\\/g,""),r=!1),fe(n,a,f),l===44&&(fe(e,o,n),n=Object.create(null),o=void 0),a=void 0,c=d=-1}else throw new SyntaxError(`Unexpected character at index ${h}`);if(c===-1||i||l===32||l===9)throw new SyntaxError("Unexpected end of input");d===-1&&(d=h);let u=t.slice(c,d);return o===void 0?fe(e,u,n):(a===void 0?fe(n,u,!0):r?fe(n,a,u.replace(/\\/g,"")):fe(n,a,u),fe(e,o,n)),e}function Kh(t){return Object.keys(t).map(e=>{let n=t[e];return Array.isArray(n)||(n=[n]),n.map(r=>[e].concat(Object.keys(r).map(s=>{let i=r[s];return Array.isArray(i)||(i=[i]),i.map(o=>o===!0?s:`${s}=${o}`).join("; ")})).join("; ")).join(", ")}).join(", ")}Ha.exports={format:Kh,parse:Yh}});var br=L((Yf,sc)=>{"use strict";var Xh=require("events"),Zh=require("https"),Qh=require("http"),Ya=require("net"),eu=require("tls"),{randomBytes:tu,createHash:nu}=require("crypto"),{Duplex:zf,Readable:Jf}=require("stream"),{URL:js}=require("url"),Ne=Ut(),ru=Ms(),su=Vs(),{isBlob:iu}=Ot(),{BINARY_TYPES:za,CLOSE_TIMEOUT:ou,EMPTY_BUFFER:wr,GUID:au,kForOnEventAttribute:qs,kListener:cu,kStatusCode:lu,kWebSocket:A,NOOP:Ka}=we(),{EventTarget:{addEventListener:du,removeEventListener:hu}}=$a(),{format:uu,parse:fu}=yr(),{toBuffer:pu}=mn(),Xa=Symbol("kAborted"),Ws=[8,13],be=["CONNECTING","OPEN","CLOSING","CLOSED"],gu=/^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/,E=class t extends Xh{constructor(e,n,r){super(),this._binaryType=za[0],this._closeCode=1006,this._closeFrameReceived=!1,this._closeFrameSent=!1,this._closeMessage=wr,this._closeTimer=null,this._errorEmitted=!1,this._extensions={},this._paused=!1,this._protocol="",this._readyState=t.CONNECTING,this._receiver=null,this._sender=null,this._socket=null,e!==null?(this._bufferedAmount=0,this._isServer=!1,this._redirects=0,n===void 0?n=[]:Array.isArray(n)||(typeof n=="object"&&n!==null?(r=n,n=[]):n=[n]),Za(this,e,n,r)):(this._autoPong=r.autoPong,this._closeTimeout=r.closeTimeout,this._isServer=!0)}get binaryType(){return this._binaryType}set binaryType(e){za.includes(e)&&(this._binaryType=e,this._receiver&&(this._receiver._binaryType=e))}get bufferedAmount(){return this._socket?this._socket._writableState.length+this._sender._bufferedBytes:this._bufferedAmount}get extensions(){return Object.keys(this._extensions).join()}get isPaused(){return this._paused}get onclose(){return null}get onerror(){return null}get onopen(){return null}get onmessage(){return null}get protocol(){return this._protocol}get readyState(){return this._readyState}get url(){return this._url}setSocket(e,n,r){let s=new ru({allowSynchronousEvents:r.allowSynchronousEvents,binaryType:this.binaryType,extensions:this._extensions,isServer:this._isServer,maxPayload:r.maxPayload,skipUTF8Validation:r.skipUTF8Validation}),i=new su(e,this._extensions,r.generateMask);this._receiver=s,this._sender=i,this._socket=e,s[A]=this,i[A]=this,e[A]=this,s.on("conclude",wu),s.on("drain",xu),s.on("error",_u),s.on("message",bu),s.on("ping",vu),s.on("pong",Su),i.onerror=ku,e.setTimeout&&e.setTimeout(0),e.setNoDelay&&e.setNoDelay(),n.length>0&&e.unshift(n),e.on("close",tc),e.on("data",_r),e.on("end",nc),e.on("error",rc),this._readyState=t.OPEN,this.emit("open")}emitClose(){if(!this._socket){this._readyState=t.CLOSED,this.emit("close",this._closeCode,this._closeMessage);return}this._extensions[Ne.extensionName]&&this._extensions[Ne.extensionName].cleanup(),this._receiver.removeAllListeners(),this._readyState=t.CLOSED,this.emit("close",this._closeCode,this._closeMessage)}close(e,n){if(this.readyState!==t.CLOSED){if(this.readyState===t.CONNECTING){J(this,this._req,"WebSocket was closed before the connection was established");return}if(this.readyState===t.CLOSING){this._closeFrameSent&&(this._closeFrameReceived||this._receiver._writableState.errorEmitted)&&this._socket.end();return}this._readyState=t.CLOSING,this._sender.close(e,n,!this._isServer,r=>{r||(this._closeFrameSent=!0,(this._closeFrameReceived||this._receiver._writableState.errorEmitted)&&this._socket.end())}),ec(this)}}pause(){this.readyState===t.CONNECTING||this.readyState===t.CLOSED||(this._paused=!0,this._socket.pause())}ping(e,n,r){if(this.readyState===t.CONNECTING)throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");if(typeof e=="function"?(r=e,e=n=void 0):typeof n=="function"&&(r=n,n=void 0),typeof e=="number"&&(e=e.toString()),this.readyState!==t.OPEN){Gs(this,e,r);return}n===void 0&&(n=!this._isServer),this._sender.ping(e||wr,n,r)}pong(e,n,r){if(this.readyState===t.CONNECTING)throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");if(typeof e=="function"?(r=e,e=n=void 0):typeof n=="function"&&(r=n,n=void 0),typeof e=="number"&&(e=e.toString()),this.readyState!==t.OPEN){Gs(this,e,r);return}n===void 0&&(n=!this._isServer),this._sender.pong(e||wr,n,r)}resume(){this.readyState===t.CONNECTING||this.readyState===t.CLOSED||(this._paused=!1,this._receiver._writableState.needDrain||this._socket.resume())}send(e,n,r){if(this.readyState===t.CONNECTING)throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");if(typeof n=="function"&&(r=n,n={}),typeof e=="number"&&(e=e.toString()),this.readyState!==t.OPEN){Gs(this,e,r);return}let s={binary:typeof e!="string",mask:!this._isServer,compress:!0,fin:!0,...n};this._extensions[Ne.extensionName]||(s.compress=!1),this._sender.send(e||wr,s,r)}terminate(){if(this.readyState!==t.CLOSED){if(this.readyState===t.CONNECTING){J(this,this._req,"WebSocket was closed before the connection was established");return}this._socket&&(this._readyState=t.CLOSING,this._socket.destroy())}}};Object.defineProperty(E,"CONNECTING",{enumerable:!0,value:be.indexOf("CONNECTING")});Object.defineProperty(E.prototype,"CONNECTING",{enumerable:!0,value:be.indexOf("CONNECTING")});Object.defineProperty(E,"OPEN",{enumerable:!0,value:be.indexOf("OPEN")});Object.defineProperty(E.prototype,"OPEN",{enumerable:!0,value:be.indexOf("OPEN")});Object.defineProperty(E,"CLOSING",{enumerable:!0,value:be.indexOf("CLOSING")});Object.defineProperty(E.prototype,"CLOSING",{enumerable:!0,value:be.indexOf("CLOSING")});Object.defineProperty(E,"CLOSED",{enumerable:!0,value:be.indexOf("CLOSED")});Object.defineProperty(E.prototype,"CLOSED",{enumerable:!0,value:be.indexOf("CLOSED")});["binaryType","bufferedAmount","extensions","isPaused","protocol","readyState","url"].forEach(t=>{Object.defineProperty(E.prototype,t,{enumerable:!0})});["open","error","close","message"].forEach(t=>{Object.defineProperty(E.prototype,`on${t}`,{enumerable:!0,get(){for(let e of this.listeners(t))if(e[qs])return e[cu];return null},set(e){for(let n of this.listeners(t))if(n[qs]){this.removeListener(t,n);break}typeof e=="function"&&this.addEventListener(t,e,{[qs]:!0})}})});E.prototype.addEventListener=du;E.prototype.removeEventListener=hu;sc.exports=E;function Za(t,e,n,r){let s={allowSynchronousEvents:!0,autoPong:!0,closeTimeout:ou,protocolVersion:Ws[1],maxPayload:104857600,skipUTF8Validation:!1,perMessageDeflate:!0,followRedirects:!1,maxRedirects:10,...r,socketPath:void 0,hostname:void 0,protocol:void 0,timeout:void 0,method:"GET",host:void 0,path:void 0,port:void 0};if(t._autoPong=s.autoPong,t._closeTimeout=s.closeTimeout,!Ws.includes(s.protocolVersion))throw new RangeError(`Unsupported protocol version: ${s.protocolVersion} (supported versions: ${Ws.join(", ")})`);let i;if(e instanceof js)i=e;else try{i=new js(e)}catch{throw new SyntaxError(`Invalid URL: ${e}`)}i.protocol==="http:"?i.protocol="ws:":i.protocol==="https:"&&(i.protocol="wss:"),t._url=i.href;let o=i.protocol==="wss:",a=i.protocol==="ws+unix:",c;if(i.protocol!=="ws:"&&!o&&!a?c=`The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`:a&&!i.pathname?c="The URL's pathname is empty":i.hash&&(c="The URL contains a fragment identifier"),c){let g=new SyntaxError(c);if(t._redirects===0)throw g;xr(t,g);return}let l=o?443:80,d=tu(16).toString("base64"),h=o?Zh.request:Qh.request,u=new Set,f;if(s.createConnection=s.createConnection||(o?yu:mu),s.defaultPort=s.defaultPort||l,s.port=i.port||l,s.host=i.hostname.startsWith("[")?i.hostname.slice(1,-1):i.hostname,s.headers={...s.headers,"Sec-WebSocket-Version":s.protocolVersion,"Sec-WebSocket-Key":d,Connection:"Upgrade",Upgrade:"websocket"},s.path=i.pathname+i.search,s.timeout=s.handshakeTimeout,s.perMessageDeflate&&(f=new Ne({...s.perMessageDeflate,isServer:!1,maxPayload:s.maxPayload}),s.headers["Sec-WebSocket-Extensions"]=uu({[Ne.extensionName]:f.offer()})),n.length){for(let g of n){if(typeof g!="string"||!gu.test(g)||u.has(g))throw new SyntaxError("An invalid or duplicated subprotocol was specified");u.add(g)}s.headers["Sec-WebSocket-Protocol"]=n.join(",")}if(s.origin&&(s.protocolVersion<13?s.headers["Sec-WebSocket-Origin"]=s.origin:s.headers.Origin=s.origin),(i.username||i.password)&&(s.auth=`${i.username}:${i.password}`),a){let g=s.path.split(":");s.socketPath=g[0],s.path=g[1]}let p;if(s.followRedirects){if(t._redirects===0){t._originalIpc=a,t._originalSecure=o,t._originalHostOrSocketPath=a?s.socketPath:i.host;let g=r&&r.headers;if(r={...r,headers:{}},g)for(let[_,b]of Object.entries(g))r.headers[_.toLowerCase()]=b}else if(t.listenerCount("redirect")===0){let g=a?t._originalIpc?s.socketPath===t._originalHostOrSocketPath:!1:t._originalIpc?!1:i.host===t._originalHostOrSocketPath;(!g||t._originalSecure&&!o)&&(delete s.headers.authorization,delete s.headers.cookie,g||delete s.headers.host,s.auth=void 0)}s.auth&&!r.headers.authorization&&(r.headers.authorization="Basic "+Buffer.from(s.auth).toString("base64")),p=t._req=h(s),t._redirects&&t.emit("redirect",t.url,p)}else p=t._req=h(s);s.timeout&&p.on("timeout",()=>{J(t,p,"Opening handshake has timed out")}),p.on("error",g=>{p===null||p[Xa]||(p=t._req=null,xr(t,g))}),p.on("response",g=>{let _=g.headers.location,b=g.statusCode;if(_&&s.followRedirects&&b>=300&&b<400){if(++t._redirects>s.maxRedirects){J(t,p,"Maximum redirects exceeded");return}p.abort();let ve;try{ve=new js(_,e)}catch{let at=new SyntaxError(`Invalid URL: ${_}`);xr(t,at);return}Za(t,ve,n,r)}else t.emit("unexpected-response",p,g)||J(t,p,`Unexpected server response: ${g.statusCode}`)}),p.on("upgrade",(g,_,b)=>{if(t.emit("upgrade",g),t.readyState!==E.CONNECTING)return;p=t._req=null;let ve=g.headers.upgrade;if(ve===void 0||ve.toLowerCase()!=="websocket"){J(t,_,"Invalid Upgrade header");return}let Ft=nu("sha1").update(d+au).digest("base64");if(g.headers["sec-websocket-accept"]!==Ft){J(t,_,"Invalid Sec-WebSocket-Accept header");return}let at=g.headers["sec-websocket-protocol"],jt;if(at!==void 0?u.size?u.has(at)||(jt="Server sent an invalid subprotocol"):jt="Server sent a subprotocol but none was requested":u.size&&(jt="Server sent no subprotocol"),jt){J(t,_,jt);return}at&&(t._protocol=at);let si=g.headers["sec-websocket-extensions"];if(si!==void 0){if(!f){J(t,_,"Server sent a Sec-WebSocket-Extensions header but no extension was requested");return}let kr;try{kr=fu(si)}catch{J(t,_,"Invalid Sec-WebSocket-Extensions header");return}let ii=Object.keys(kr);if(ii.length!==1||ii[0]!==Ne.extensionName){J(t,_,"Server indicated an extension that was not requested");return}try{f.accept(kr[Ne.extensionName])}catch{J(t,_,"Invalid Sec-WebSocket-Extensions header");return}t._extensions[Ne.extensionName]=f}t.setSocket(_,b,{allowSynchronousEvents:s.allowSynchronousEvents,generateMask:s.generateMask,maxPayload:s.maxPayload,skipUTF8Validation:s.skipUTF8Validation})}),s.finishRequest?s.finishRequest(p,t):p.end()}function xr(t,e){t._readyState=E.CLOSING,t._errorEmitted=!0,t.emit("error",e),t.emitClose()}function mu(t){return t.path=t.socketPath,Ya.connect(t)}function yu(t){return t.path=void 0,!t.servername&&t.servername!==""&&(t.servername=Ya.isIP(t.host)?"":t.host),eu.connect(t)}function J(t,e,n){t._readyState=E.CLOSING;let r=new Error(n);Error.captureStackTrace(r,J),e.setHeader?(e[Xa]=!0,e.abort(),e.socket&&!e.socket.destroyed&&e.socket.destroy(),process.nextTick(xr,t,r)):(e.destroy(r),e.once("error",t.emit.bind(t,"error")),e.once("close",t.emitClose.bind(t)))}function Gs(t,e,n){if(e){let r=iu(e)?e.size:pu(e).length;t._socket?t._sender._bufferedBytes+=r:t._bufferedAmount+=r}if(n){let r=new Error(`WebSocket is not open: readyState ${t.readyState} (${be[t.readyState]})`);process.nextTick(n,r)}}function wu(t,e){let n=this[A];n._closeFrameReceived=!0,n._closeMessage=e,n._closeCode=t,n._socket[A]!==void 0&&(n._socket.removeListener("data",_r),process.nextTick(Qa,n._socket),t===1005?n.close():n.close(t,e))}function xu(){let t=this[A];t.isPaused||t._socket.resume()}function _u(t){let e=this[A];e._socket[A]!==void 0&&(e._socket.removeListener("data",_r),process.nextTick(Qa,e._socket),e.close(t[lu])),e._errorEmitted||(e._errorEmitted=!0,e.emit("error",t))}function Ja(){this[A].emitClose()}function bu(t,e){this[A].emit("message",t,e)}function vu(t){let e=this[A];e._autoPong&&e.pong(t,!this._isServer,Ka),e.emit("ping",t)}function Su(t){this[A].emit("pong",t)}function Qa(t){t.resume()}function ku(t){let e=this[A];e.readyState!==E.CLOSED&&(e.readyState===E.OPEN&&(e._readyState=E.CLOSING,ec(e)),this._socket.end(),e._errorEmitted||(e._errorEmitted=!0,e.emit("error",t)))}function ec(t){t._closeTimer=setTimeout(t._socket.destroy.bind(t._socket),t._closeTimeout)}function tc(){let t=this[A];if(this.removeListener("close",tc),this.removeListener("data",_r),this.removeListener("end",nc),t._readyState=E.CLOSING,!this._readableState.endEmitted&&!t._closeFrameReceived&&!t._receiver._writableState.errorEmitted&&this._readableState.length!==0){let e=this.read(this._readableState.length);t._receiver.write(e)}t._receiver.end(),this[A]=void 0,clearTimeout(t._closeTimer),t._receiver._writableState.finished||t._receiver._writableState.errorEmitted?t.emitClose():(t._receiver.on("error",Ja),t._receiver.on("finish",Ja))}function _r(t){this[A]._receiver.write(t)||this.pause()}function nc(){let t=this[A];t._readyState=E.CLOSING,t._receiver.end(),this.end()}function rc(){let t=this[A];this.removeListener("error",rc),this.on("error",Ka),t&&(t._readyState=E.CLOSING,this.destroy())}});var cc=L((Xf,ac)=>{"use strict";var Kf=br(),{Duplex:Eu}=require("stream");function ic(t){t.emit("close")}function Cu(){!this.destroyed&&this._writableState.finished&&this.destroy()}function oc(t){this.removeListener("error",oc),this.destroy(),this.listenerCount("error")===0&&this.emit("error",t)}function Iu(t,e){let n=!0,r=new Eu({...e,autoDestroy:!1,emitClose:!1,objectMode:!1,writableObjectMode:!1});return t.on("message",function(i,o){let a=!o&&r._readableState.objectMode?i.toString():i;r.push(a)||t.pause()}),t.once("error",function(i){r.destroyed||(n=!1,r.destroy(i))}),t.once("close",function(){r.destroyed||r.push(null)}),r._destroy=function(s,i){if(t.readyState===t.CLOSED){i(s),process.nextTick(ic,r);return}let o=!1;t.once("error",function(c){o=!0,i(c)}),t.once("close",function(){o||i(s),process.nextTick(ic,r)}),n&&t.terminate()},r._final=function(s){if(t.readyState===t.CONNECTING){t.once("open",function(){r._final(s)});return}t._socket!==null&&(t._socket._writableState.finished?(s(),r._readableState.endEmitted&&r.destroy()):(t._socket.once("finish",function(){s()}),t.close()))},r._read=function(){t.isPaused&&t.resume()},r._write=function(s,i,o){if(t.readyState===t.CONNECTING){t.once("open",function(){r._write(s,i,o)});return}t.send(s,o)},r.on("end",Cu),r.on("error",oc),r}ac.exports=Iu});var $s=L((Zf,lc)=>{"use strict";var{tokenChars:Tu}=Ot();function Uu(t){let e=new Set,n=-1,r=-1,s=0;for(s;s<t.length;s++){let o=t.charCodeAt(s);if(r===-1&&Tu[o]===1)n===-1&&(n=s);else if(s!==0&&(o===32||o===9))r===-1&&n!==-1&&(r=s);else if(o===44){if(n===-1)throw new SyntaxError(`Unexpected character at index ${s}`);r===-1&&(r=s);let a=t.slice(n,r);if(e.has(a))throw new SyntaxError(`The "${a}" subprotocol is duplicated`);e.add(a),n=r=-1}else throw new SyntaxError(`Unexpected character at index ${s}`)}if(n===-1||r!==-1)throw new SyntaxError("Unexpected end of input");let i=t.slice(n,s);if(e.has(i))throw new SyntaxError(`The "${i}" subprotocol is duplicated`);return e.add(i),e}lc.exports={parse:Uu}});var mc=L((ep,gc)=>{"use strict";var Ou=require("events"),vr=require("http"),{Duplex:Qf}=require("stream"),{createHash:Du}=require("crypto"),dc=yr(),st=Ut(),Au=$s(),Lu=br(),{CLOSE_TIMEOUT:Nu,GUID:Bu,kWebSocket:Mu}=we(),Ru=/^[+/0-9A-Za-z]{22}==$/,hc=0,uc=1,pc=2,Hs=class extends Ou{constructor(e,n){if(super(),e={allowSynchronousEvents:!0,autoPong:!0,maxPayload:100*1024*1024,skipUTF8Validation:!1,perMessageDeflate:!1,handleProtocols:null,clientTracking:!0,closeTimeout:Nu,verifyClient:null,noServer:!1,backlog:null,server:null,host:null,path:null,port:null,WebSocket:Lu,...e},e.port==null&&!e.server&&!e.noServer||e.port!=null&&(e.server||e.noServer)||e.server&&e.noServer)throw new TypeError('One and only one of the "port", "server", or "noServer" options must be specified');if(e.port!=null?(this._server=vr.createServer((r,s)=>{let i=vr.STATUS_CODES[426];s.writeHead(426,{"Content-Length":i.length,"Content-Type":"text/plain"}),s.end(i)}),this._server.listen(e.port,e.host,e.backlog,n)):e.server&&(this._server=e.server),this._server){let r=this.emit.bind(this,"connection");this._removeListeners=Pu(this._server,{listening:this.emit.bind(this,"listening"),error:this.emit.bind(this,"error"),upgrade:(s,i,o)=>{this.handleUpgrade(s,i,o,r)}})}e.perMessageDeflate===!0&&(e.perMessageDeflate={}),e.clientTracking&&(this.clients=new Set,this._shouldEmitClose=!1),this.options=e,this._state=hc}address(){if(this.options.noServer)throw new Error('The server is operating in "noServer" mode');return this._server?this._server.address():null}close(e){if(this._state===pc){e&&this.once("close",()=>{e(new Error("The server is not running"))}),process.nextTick(bn,this);return}if(e&&this.once("close",e),this._state!==uc)if(this._state=uc,this.options.noServer||this.options.server)this._server&&(this._removeListeners(),this._removeListeners=this._server=null),this.clients?this.clients.size?this._shouldEmitClose=!0:process.nextTick(bn,this):process.nextTick(bn,this);else{let n=this._server;this._removeListeners(),this._removeListeners=this._server=null,n.close(()=>{bn(this)})}}shouldHandle(e){if(this.options.path){let n=e.url.indexOf("?");if((n!==-1?e.url.slice(0,n):e.url)!==this.options.path)return!1}return!0}handleUpgrade(e,n,r,s){n.on("error",fc);let i=e.headers["sec-websocket-key"],o=e.headers.upgrade,a=+e.headers["sec-websocket-version"];if(e.method!=="GET"){it(this,e,n,405,"Invalid HTTP method");return}if(o===void 0||o.toLowerCase()!=="websocket"){it(this,e,n,400,"Invalid Upgrade header");return}if(i===void 0||!Ru.test(i)){it(this,e,n,400,"Missing or invalid Sec-WebSocket-Key header");return}if(a!==13&&a!==8){it(this,e,n,400,"Missing or invalid Sec-WebSocket-Version header",{"Sec-WebSocket-Version":"13, 8"});return}if(!this.shouldHandle(e)){vn(n,400);return}let c=e.headers["sec-websocket-protocol"],l=new Set;if(c!==void 0)try{l=Au.parse(c)}catch{it(this,e,n,400,"Invalid Sec-WebSocket-Protocol header");return}let d=e.headers["sec-websocket-extensions"],h={};if(this.options.perMessageDeflate&&d!==void 0){let u=new st({...this.options.perMessageDeflate,isServer:!0,maxPayload:this.options.maxPayload});try{let f=dc.parse(d);f[st.extensionName]&&(u.accept(f[st.extensionName]),h[st.extensionName]=u)}catch{it(this,e,n,400,"Invalid or unacceptable Sec-WebSocket-Extensions header");return}}if(this.options.verifyClient){let u={origin:e.headers[`${a===8?"sec-websocket-origin":"origin"}`],secure:!!(e.socket.authorized||e.socket.encrypted),req:e};if(this.options.verifyClient.length===2){this.options.verifyClient(u,(f,p,g,_)=>{if(!f)return vn(n,p||401,g,_);this.completeUpgrade(h,i,l,e,n,r,s)});return}if(!this.options.verifyClient(u))return vn(n,401)}this.completeUpgrade(h,i,l,e,n,r,s)}completeUpgrade(e,n,r,s,i,o,a){if(!i.readable||!i.writable)return i.destroy();if(i[Mu])throw new Error("server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration");if(this._state>hc)return vn(i,503);let l=["HTTP/1.1 101 Switching Protocols","Upgrade: websocket","Connection: Upgrade",`Sec-WebSocket-Accept: ${Du("sha1").update(n+Bu).digest("base64")}`],d=new this.options.WebSocket(null,void 0,this.options);if(r.size){let h=this.options.handleProtocols?this.options.handleProtocols(r,s):r.values().next().value;h&&(l.push(`Sec-WebSocket-Protocol: ${h}`),d._protocol=h)}if(e[st.extensionName]){let h=e[st.extensionName].params,u=dc.format({[st.extensionName]:[h]});l.push(`Sec-WebSocket-Extensions: ${u}`),d._extensions=e}this.emit("headers",l,s),i.write(l.concat(`\r
`).join(`\r
`)),i.removeListener("error",fc),d.setSocket(i,o,{allowSynchronousEvents:this.options.allowSynchronousEvents,maxPayload:this.options.maxPayload,skipUTF8Validation:this.options.skipUTF8Validation}),this.clients&&(this.clients.add(d),d.on("close",()=>{this.clients.delete(d),this._shouldEmitClose&&!this.clients.size&&process.nextTick(bn,this)})),a(d,s)}};gc.exports=Hs;function Pu(t,e){for(let n of Object.keys(e))t.on(n,e[n]);return function(){for(let r of Object.keys(e))t.removeListener(r,e[r])}}function bn(t){t._state=pc,t.emit("close")}function fc(){this.destroy()}function vn(t,e,n,r){n=n||vr.STATUS_CODES[e],r={Connection:"close","Content-Type":"text/html","Content-Length":Buffer.byteLength(n),...r},t.once("finish",t.destroy),t.end(`HTTP/1.1 ${e} ${vr.STATUS_CODES[e]}\r
`+Object.keys(r).map(s=>`${s}: ${r[s]}`).join(`\r
`)+`\r
\r
`+n)}function it(t,e,n,r,s,i){if(t.listenerCount("wsClientError")){let o=new Error(s);Error.captureStackTrace(o,it),t.emit("wsClientError",o,n,e)}else vn(n,r,s,i)}});var xc=L((tp,wc)=>{"use strict";var Vu=cc(),Fu=yr(),ju=Ut(),qu=Ms(),Wu=Vs(),Gu=$s(),ie=br(),yc=mc();ie.createWebSocketStream=Vu;ie.extension=Fu;ie.PerMessageDeflate=ju;ie.Receiver=qu;ie.Sender=Wu;ie.Server=yc;ie.subprotocol=Gu;ie.WebSocket=ie;ie.WebSocketServer=yc;wc.exports=ie});var Ec=L((np,kc)=>{var $u=require("node:events"),Sn=require("node:fs"),_c=require("node:os"),Bt=require("node:path"),{execFile:Hu}=require("node:child_process"),{promisify:zu}=require("node:util"),zs=xc(),{EVENTS:te,createSessionId:Js,createInviteSecret:Ju,toInviteCode:bc,toInviteLink:vc,parseInviteInput:Yu}=Es(),Sc=zu(Hu),Ys=class extends $u{constructor(e){super(),this.getWorkspaceRoot=e,this.mode=null,this.sessionId=null,this.displayName="Anonymous",this.hostServer=null,this.hostPort=null,this.inviteOnlyMode=!0,this.inviteSecret=null,this.peerSocket=null,this.pendingRequests=new Map,this.participants=new Map}setDisplayName(e){this.displayName=e||"Anonymous"}async hostSession({port:e=3700,inviteOnlyMode:n=!0}){await this.endSession(),this.mode="host",this.sessionId=Js(),this.hostPort=e,this.inviteOnlyMode=!!n,this.inviteSecret=Ju(),this.hostServer=new zs.Server({port:e}),this.hostServer.on("connection",a=>{a.on("message",c=>this.handleHostMessage(a,c)),a.on("close",()=>{this.peerSocket===a&&(this.peerSocket=null,this.participants.delete("guest"),this.emitParticipants(),this.emitStatus("Guest disconnected"))})});let r=this.getPrimaryHostAddress(),s={host:r,port:e,sessionId:this.sessionId},i=bc(s),o=bc({...s,inviteSecret:this.inviteSecret});return this.participants.set("host",{id:"host",name:this.displayName,role:"host"}),this.emitParticipants(),this.emitStatus(`Hosting on ws://${r}:${e}`),{openInviteLink:vc(i),privateInviteLink:vc(o),sessionId:this.sessionId,inviteOnlyMode:this.inviteOnlyMode}}async joinSession({inviteText:e,cloneIfMissing:n=!0}){await this.endSession();let r=Yu(e);if(!r?.host||!r?.port||!r?.sessionId)throw new Error("Invalid invite link/code");this.mode="guest",this.sessionId=r.sessionId;let s=new zs(`ws://${r.host}:${r.port}`);await new Promise((i,o)=>{s.once("open",i),s.once("error",o)}),this.peerSocket=s,s.on("message",i=>this.handleGuestMessage(i)),s.on("close",()=>{this.emitStatus("Disconnected from host"),this.participants.clear(),this.emitParticipants()}),this.sendToPeer({type:te.JOIN_REQUEST,sessionId:this.sessionId,requestId:Js(),displayName:this.displayName,inviteSecret:r.inviteSecret||null,cloneIfMissing:n}),this.emitStatus("Join request sent")}async endSession(){this.peerSocket&&(this.peerSocket.close(),this.peerSocket=null),this.hostServer&&(await new Promise(e=>this.hostServer.close(e)),this.hostServer=null),this.pendingRequests.clear(),this.participants.clear(),this.emitParticipants(),this.mode=null,this.sessionId=null,this.inviteSecret=null,this.emitStatus("Session stopped")}async decideJoinRequest({requestId:e,accepted:n}){let r=this.pendingRequests.get(e);if(!r)return;this.pendingRequests.delete(e);let s=this.getWorkspaceRoot(),i=null;n&&(i=await this.getGitRemoteUrl(s),this.participants.set("guest",{id:"guest",name:r.displayName,role:"guest"}),this.emitParticipants()),this.sendToSocket(r.socket,{type:te.JOIN_DECISION,accepted:n,sessionId:this.sessionId,workspacePath:s,remoteUrl:i,reason:n?null:"Host rejected request"}),this.emitStatus(n?`Approved ${r.displayName}`:`Rejected ${r.displayName}`)}async sendChat(e){if(!e?.trim())return;let n={type:te.CHAT_MESSAGE,sessionId:this.sessionId,timestamp:new Date().toISOString(),user:this.displayName,text:e.trim(),id:Js()};await this.persistChatMessage(n),this.emit("chat-message",n),this.sendToPeer(n)}sendRtcSignal(e){this.sendToPeer({type:te.RTC_SIGNAL,sessionId:this.sessionId,from:this.displayName,signal:e})}sendSyncMessage(e){this.sendToPeer({...e,sessionId:this.sessionId,role:this.mode})}handleHostMessage(e,n){let r=this.parse(n);if(r){if(r.type===te.JOIN_REQUEST){if(this.inviteOnlyMode&&r.inviteSecret!==this.inviteSecret){this.sendToSocket(e,{type:te.JOIN_DECISION,accepted:!1,reason:"Invite-only is enabled. Ask host for private invite link."});return}this.pendingRequests.set(r.requestId,{socket:e,displayName:r.displayName}),this.emit("join-request",{requestId:r.requestId,displayName:r.displayName});return}this.peerSocket||(this.peerSocket=e),this.handleSharedMessage(r)}}async handleGuestMessage(e){let n=this.parse(e);if(n){if(n.type===te.JOIN_DECISION){if(!n.accepted){this.emit("join-rejected",n.reason||"Host rejected join request");return}this.participants.set("host",{id:"host",name:"Host",role:"host"}),this.participants.set("guest",{id:"guest",name:this.displayName,role:"guest"}),this.emitParticipants(),await this.ensureWorkspaceForGuest(n),this.emit("join-accepted",n.workspacePath||this.getWorkspaceRoot()),this.emitStatus("Connected to host session");return}this.handleSharedMessage(n)}}async ensureWorkspaceForGuest(e){if(this.getWorkspaceRoot()||!e?.remoteUrl)return;let r=Bt.join(_c.homedir(),"Multiplayer Code Sessions");await Sn.promises.mkdir(r,{recursive:!0});let s=Bt.basename(e.remoteUrl).replace(/\.git$/i,"")||"shared-project",i=Bt.join(r,`${s}-${Date.now()}`);await Sc("git",["clone",e.remoteUrl,i]),e.workspacePath=i}async handleSharedMessage(e){if(e.type===te.FILE_OPEN||e.type===te.YJS_UPDATE||e.type===te.CURSOR_UPDATE){this.emit("sync-message",e);return}if(e.type===te.CHAT_MESSAGE){await this.persistChatMessage(e),this.emit("chat-message",e);return}if(e.type===te.RTC_SIGNAL){this.emit("rtc-signal",e);return}}async persistChatMessage(e){let n=this.getWorkspaceRoot();if(!n)return;let r=Bt.join(n,".multiplayer","chat"),s=Bt.join(r,"events.jsonl"),i=Bt.join(r,"latest.md");await Sn.promises.mkdir(r,{recursive:!0}),await Sn.promises.appendFile(s,`${JSON.stringify(e)}
`,"utf8");let o=await this.readLastMessages(s,200),a=["# Multiplayer Chat",""].concat(o.map(c=>`- [${c.timestamp}] **${c.user}**: ${c.text}`));await Sn.promises.writeFile(i,`${a.join(`
`)}
`,"utf8")}async readLastMessages(e,n){return(await Sn.promises.readFile(e,"utf8")).trim().split(`
`).filter(Boolean).slice(-n).map(i=>{try{return JSON.parse(i)}catch{return null}}).filter(Boolean)}emitParticipants(){this.emit("participants",Array.from(this.participants.values()))}emitStatus(e){this.emit("status",{timestamp:new Date().toISOString(),message:e})}sendToPeer(e){this.sendToSocket(this.peerSocket,e)}sendToSocket(e,n){e?.readyState===zs.OPEN&&e.send(JSON.stringify(n))}parse(e){try{let n=Buffer.isBuffer(e)?e.toString("utf8"):String(e);return JSON.parse(n)}catch{return null}}getPrimaryHostAddress(){let e=_c.networkInterfaces();for(let n of Object.values(e))for(let r of n||[])if(r.family==="IPv4"&&!r.internal)return r.address;return"127.0.0.1"}async getGitRemoteUrl(e){if(!e)return null;try{let{stdout:n}=await Sc("git",["-C",e,"config","--get","remote.origin.url"]);return n.trim()||null}catch{return null}}};kc.exports={SessionService:Ys}});var Ic=L((rp,Cc)=>{var Ku=require("vscode"),Ks=class{constructor(e){this._handlers=e,this._view=null}resolveWebviewView(e){try{this._view=e,e.webview.options={enableScripts:!0},e.webview.html=ef(),e.webview.onDidReceiveMessage(async n=>{if(n?.type){if(n.type==="host-session"){await this._handlers.onHostSession();return}if(n.type==="join-session"){await this._handlers.onJoinSession();return}if(n.type==="end-session"){await this._handlers.onEndSession();return}if(n.type==="copy-invite"){await this._handlers.onCopyInvite(n.kind||"private");return}if(n.type==="send-chat"){await this._handlers.onSendChat(n.text||"");return}if(n.type==="rtc-signal"){this._handlers.onRtcSignal(n.signal);return}n.type==="panel-ready"&&this._handlers.onPanelReady()}})}catch(n){let r=n instanceof Error?n.message:String(n);Ku.window.showErrorMessage(`Multiplayer panel failed to load: ${r}`),e.webview.html=Zu(r)}}sendMessage(e){this._view?.webview.postMessage(e)}reveal(){this._view?.show(!0)}};function Xu(t,e){t?.sendMessage(e)}function Zu(t){return`<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        margin: 0;
        padding: 12px;
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size, 13px);
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
      }

      .error-card {
        border-radius: 8px;
        border: 1px solid color-mix(in srgb, var(--vscode-errorForeground) 30%, transparent);
        background: color-mix(in srgb, var(--vscode-errorForeground) 10%, transparent);
        padding: 12px;
      }

      h3 {
        margin: 0 0 6px;
        font-size: 12px;
      }

      p {
        margin: 0;
        font-size: 12px;
        line-height: 1.45;
        color: var(--vscode-descriptionForeground);
      }
    </style>
  </head>
  <body>
    <section class="error-card">
      <h3>Multiplayer Panel Failed To Load</h3>
      <p>${Qu(t)}</p>
    </section>
  </body>
</html>`}function Qu(t){return String(t).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function ef(){return`<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      *, *::before, *::after { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size, 13px);
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
        -webkit-font-smoothing: antialiased;
      }

      /* \u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
      .mp-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 13px 14px 11px;
        border-bottom: 1px solid color-mix(in srgb, var(--vscode-panel-border) 45%, transparent);
      }

      .mp-logo {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        background: var(--vscode-button-background);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 1px 4px color-mix(in srgb, var(--vscode-button-background) 50%, transparent),
                    inset 0 1px 0 color-mix(in srgb, #fff 15%, transparent);
      }

      .mp-logo svg {
        width: 16px;
        height: 16px;
        color: var(--vscode-button-foreground);
      }

      .mp-title {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: -0.1px;
        color: var(--vscode-foreground);
        line-height: 1;
      }

      .mp-sub {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        margin-top: 2px;
        opacity: 0.85;
      }

      /* \u2500\u2500 Layout \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
      .wrap {
        padding: 0 10px;
      }

      .section {
        padding: 11px 0;
        border-bottom: 1px solid color-mix(in srgb, var(--vscode-panel-border) 30%, transparent);
      }

      .section:last-child {
        border-bottom: none;
        padding-bottom: 14px;
      }

      .section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 9px;
      }

      .section-label {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.7px;
        text-transform: uppercase;
        color: var(--vscode-descriptionForeground);
      }

      .section-label svg {
        width: 12px;
        height: 12px;
        opacity: 0.75;
        flex-shrink: 0;
      }

      /* \u2500\u2500 Status block \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
      .status-block {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 11px;
        border-radius: 7px;
        background: color-mix(in srgb, var(--vscode-editor-background) 65%, var(--vscode-sideBar-background) 35%);
        border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 50%, transparent);
        box-shadow: inset 0 1px 0 color-mix(in srgb, var(--vscode-foreground) 4%, transparent);
      }

      .status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: color-mix(in srgb, var(--vscode-descriptionForeground) 55%, transparent);
        flex-shrink: 0;
        transition: background 0.3s, box-shadow 0.3s;
      }

      .status-dot[data-mode="host"] {
        background: var(--vscode-textLink-foreground);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--vscode-textLink-foreground) 20%, transparent);
      }

      .status-dot[data-mode="guest"] {
        background: var(--vscode-charts-orange);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--vscode-charts-orange) 20%, transparent);
      }

      .status-info {
        flex: 1;
        min-width: 0;
      }

      .status-text {
        font-size: 12px;
        font-weight: 600;
        color: var(--vscode-foreground);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .status-sub {
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
        margin-top: 1px;
      }

      .mode-badge {
        display: inline-flex;
        align-items: center;
        height: 19px;
        padding: 0 7px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 65%, transparent);
        color: var(--vscode-descriptionForeground);
        background: color-mix(in srgb, var(--vscode-editor-background) 60%, transparent);
        flex-shrink: 0;
      }

      .mode-badge[data-mode="host"] {
        color: var(--vscode-textLink-foreground);
        border-color: color-mix(in srgb, var(--vscode-textLink-foreground) 35%, transparent);
        background: color-mix(in srgb, var(--vscode-textLink-foreground) 10%, transparent);
      }

      .mode-badge[data-mode="guest"] {
        color: var(--vscode-charts-orange);
        border-color: color-mix(in srgb, var(--vscode-charts-orange) 35%, transparent);
        background: color-mix(in srgb, var(--vscode-charts-orange) 10%, transparent);
      }

      /* \u2500\u2500 Buttons \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
      button {
        font: inherit;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        height: 30px;
        padding: 0 13px;
        border-radius: 5px;
        border: 1px solid transparent;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        transition: background 0.12s, opacity 0.12s;
        white-space: nowrap;
      }

      button svg {
        width: 12px;
        height: 12px;
        flex-shrink: 0;
      }

      button.primary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border-color: transparent;
        box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 12%, transparent);
      }

      button.primary:hover:not(:disabled) {
        background: var(--vscode-button-hoverBackground);
      }

      button.secondary {
        background: color-mix(in srgb, var(--vscode-editor-background) 75%, var(--vscode-sideBar-background) 25%);
        color: var(--vscode-foreground);
        border-color: color-mix(in srgb, var(--vscode-panel-border) 75%, transparent);
      }

      button.secondary:hover:not(:disabled) {
        background: var(--vscode-list-hoverBackground);
      }

      button.warn {
        background: color-mix(in srgb, var(--vscode-errorForeground) 10%, transparent);
        color: var(--vscode-errorForeground);
        border-color: color-mix(in srgb, var(--vscode-errorForeground) 30%, transparent);
      }

      button.warn:hover:not(:disabled) {
        background: color-mix(in srgb, var(--vscode-errorForeground) 18%, transparent);
      }

      button:disabled {
        opacity: 0.38;
        cursor: not-allowed;
      }

      button:focus-visible {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: 1px;
      }

      .btn-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }

      .btn-full {
        width: 100%;
      }

      /* \u2500\u2500 Inputs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
      input {
        font: inherit;
        font-size: 12px;
        width: 100%;
        padding: 5px 8px;
        border-radius: 4px;
        border: 1px solid var(--vscode-input-border, color-mix(in srgb, var(--vscode-panel-border) 90%, transparent));
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        transition: border-color 0.12s;
      }

      input:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
      }

      input::placeholder {
        color: var(--vscode-input-placeholderForeground);
        opacity: 0.7;
      }

      input[readonly] {
        opacity: 0.65;
        cursor: default;
      }

      .field + .field {
        margin-top: 8px;
      }

      .field-label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 4px;
      }

      .field-row {
        display: flex;
        gap: 6px;
        align-items: center;
        margin-top: 5px;
      }

      .field-row button {
        height: 26px;
        padding: 0 9px;
        font-size: 11px;
        flex-shrink: 0;
      }

      /* \u2500\u2500 Participants \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
      .participant-list {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 4px;
      }

      .participant-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 5px 8px;
        border-radius: 5px;
        background: color-mix(in srgb, var(--vscode-editor-background) 55%, transparent);
        border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 40%, transparent);
        font-size: 12px;
      }

      .participant-avatar {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 700;
        flex-shrink: 0;
        text-transform: uppercase;
      }

      .participant-name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12px;
      }

      .participant-role {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        color: var(--vscode-descriptionForeground);
      }

      .participant-role.host {
        color: var(--vscode-textLink-foreground);
      }

      .participant-empty {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        padding: 2px 0;
      }

      /* \u2500\u2500 Chat \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
      #chat {
        max-height: 150px;
        overflow-y: auto;
        display: grid;
        gap: 4px;
        margin-bottom: 7px;
        scrollbar-width: thin;
      }

      #chat:empty { display: none; }

      .chat-line {
        padding: 5px 9px;
        border-radius: 5px;
        background: color-mix(in srgb, var(--vscode-editor-inactiveSelectionBackground) 55%, transparent);
        border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 45%, transparent);
        font-size: 12px;
        line-height: 1.45;
      }

      .chat-meta {
        font-size: 10px;
        font-weight: 700;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 2px;
      }

      .chat-text {
        color: var(--vscode-foreground);
      }

      .chat-row {
        display: flex;
        gap: 6px;
      }

      .chat-row input {
        flex: 1;
        height: 28px;
      }

      .chat-row button {
        height: 28px;
        padding: 0 11px;
        font-size: 11px;
        flex-shrink: 0;
      }

      /* \u2500\u2500 Voice + Video \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
      .call-status-row {
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 8px;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
      }

      .call-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: color-mix(in srgb, var(--vscode-descriptionForeground) 50%, transparent);
        flex-shrink: 0;
        transition: background 0.25s;
      }

      .call-dot.live { background: #4dbb4d; }

      .video-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        margin-top: 9px;
      }

      .video-tile {
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 65%, transparent);
        background: color-mix(in srgb, var(--vscode-editor-background) 85%, #000 15%);
      }

      .video-tile-label {
        padding: 3px 7px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        color: var(--vscode-descriptionForeground);
        border-bottom: 1px solid color-mix(in srgb, var(--vscode-panel-border) 45%, transparent);
      }

      video {
        width: 100%;
        height: 96px;
        display: block;
        background: #000;
        object-fit: cover;
      }

      /* \u2500\u2500 Misc \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
      .hint {
        margin: 7px 0 0;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        line-height: 1.4;
        opacity: 0.9;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        height: 19px;
        padding: 0 7px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        color: var(--vscode-descriptionForeground);
        background: color-mix(in srgb, var(--vscode-editor-background) 60%, transparent);
        border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 60%, transparent);
        white-space: nowrap;
      }
    </style>
  </head>
  <body>
    <header class="mp-header">
      <div class="mp-logo">
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="5.5" cy="5.5" r="2" fill="currentColor"/>
          <path d="M1.5 13c0-2.2 1.8-4 4-4h1c.65 0 1.28.16 1.82.44" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          <circle cx="11.5" cy="4.5" r="2.2" fill="currentColor"/>
          <path d="M7.5 13c0-2.4 2-4.4 4.4-4.4H13c2.4 0 4.4 2 4.4 4.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        </svg>
      </div>
      <div>
        <div class="mp-title">Multiplayer</div>
        <div class="mp-sub">Real-time collaboration</div>
      </div>
    </header>

    <main class="wrap">
      <div class="section">
        <div class="status-block">
          <div id="statusDot" class="status-dot"></div>
          <div class="status-info">
            <div id="sessionStatus" class="status-text">Ready</div>
            <div id="statusSub" class="status-sub">No active session</div>
          </div>
          <span id="modePill" class="mode-badge">Idle</span>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <span class="section-label">
            <svg viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            Actions
          </span>
        </div>
        <div class="btn-row">
          <button id="hostSession" class="primary">
            <svg viewBox="0 0 12 12" fill="none"><circle cx="6" cy="3.5" r="2" fill="currentColor"/><path d="M1.5 10.5c0-2.2 2-4 4.5-4s4.5 1.8 4.5 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/></svg>
            Host
          </button>
          <button id="joinSession" class="secondary">
            <svg viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Join
          </button>
        </div>
        <button id="endSession" class="warn btn-full" style="margin-top:6px">End Session</button>
        <p class="hint">Host and Join open guided prompts so setup stays fast and safe.</p>
      </div>

      <div class="section">
        <div class="section-head">
          <span class="section-label">
            <svg viewBox="0 0 12 12" fill="none"><rect x="1" y="2" width="10" height="8" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M1 4l5 3.5L11 4" stroke="currentColor" stroke-width="1.4"/></svg>
            Invites
          </span>
        </div>
        <div class="field">
          <div class="field-label">Private Link</div>
          <input id="privateInvite" readonly placeholder="Host a session to generate links" />
          <div class="field-row">
            <button id="copyPrivateInvite" class="secondary">Copy Private</button>
          </div>
        </div>
        <div class="field">
          <div class="field-label">Open Link</div>
          <input id="openInvite" readonly placeholder="Optional shareable invite" />
          <div class="field-row">
            <button id="copyOpenInvite" class="secondary">Copy Open</button>
            <span id="invitePolicy" class="badge">Policy: n/a</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <span class="section-label">
            <svg viewBox="0 0 12 12" fill="none"><circle cx="4" cy="4" r="1.8" stroke="currentColor" stroke-width="1.3"/><circle cx="8.5" cy="4" r="1.8" stroke="currentColor" stroke-width="1.3"/><path d="M0.5 10.5c0-2 1.5-3.5 3.5-3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M5.5 10.5c0-2 1.5-3.5 3.5-3.5h.5c2 0 3.5 1.5 3.5 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            Participants
          </span>
          <span id="participantCount" class="badge">0 connected</span>
        </div>
        <ul id="participants" class="participant-list"></ul>
      </div>

      <div class="section">
        <div class="section-head">
          <span class="section-label">
            <svg viewBox="0 0 12 12" fill="none"><path d="M1.5 1.5h9a.5.5 0 0 1 .5.5v6.5a.5.5 0 0 1-.5.5H4l-2.5 2V2a.5.5 0 0 1 .5-.5z" stroke="currentColor" stroke-width="1.3"/></svg>
            Team Chat
          </span>
        </div>
        <div id="chat"></div>
        <div class="chat-row">
          <input id="chatInput" placeholder="Message everyone\u2026" />
          <button id="sendChat" class="primary">Send</button>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <span class="section-label">
            <svg viewBox="0 0 12 12" fill="none"><rect x="1" y="3.5" width="7" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M8 5.5l3-1.5v4l-3-1.5" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
            Voice + Video
          </span>
        </div>
        <div class="btn-row">
          <button id="startCall" class="primary">Start Call</button>
          <button id="toggleAudio" class="secondary">Mute/Unmute</button>
        </div>
        <div style="margin-top:6px">
          <button id="toggleVideo" class="secondary btn-full">Camera On/Off</button>
        </div>
        <div class="call-status-row">
          <span class="call-dot" id="callDot"></span>
          <span id="callStatus">Idle</span>
        </div>
        <div class="video-grid">
          <div class="video-tile">
            <div class="video-tile-label">You</div>
            <video id="localVideo" muted autoplay playsinline></video>
          </div>
          <div class="video-tile">
            <div class="video-tile-label">Remote</div>
            <video id="remoteVideo" autoplay playsinline></video>
          </div>
        </div>
      </div>
    </main>

    <script>
      const vscode = acquireVsCodeApi();
      const sessionStatus = document.getElementById("sessionStatus");
      const statusDot = document.getElementById("statusDot");
      const statusSub = document.getElementById("statusSub");
      const modePill = document.getElementById("modePill");
      const hostSessionButton = document.getElementById("hostSession");
      const joinSessionButton = document.getElementById("joinSession");
      const endSessionButton = document.getElementById("endSession");
      const privateInvite = document.getElementById("privateInvite");
      const openInvite = document.getElementById("openInvite");
      const copyPrivateInviteButton = document.getElementById("copyPrivateInvite");
      const copyOpenInviteButton = document.getElementById("copyOpenInvite");
      const invitePolicy = document.getElementById("invitePolicy");
      const participantCount = document.getElementById("participantCount");
      const chat = document.getElementById("chat");
      const chatInput = document.getElementById("chatInput");
      const sendChat = document.getElementById("sendChat");
      const participants = document.getElementById("participants");
      const localVideo = document.getElementById("localVideo");
      const remoteVideo = document.getElementById("remoteVideo");
      const callStatus = document.getElementById("callStatus");
      const callDot = document.getElementById("callDot");

      const startCallButton = document.getElementById("startCall");
      const toggleAudioButton = document.getElementById("toggleAudio");
      const toggleVideoButton = document.getElementById("toggleVideo");

      let localStream = null;
      let pc = null;
      let audioEnabled = true;
      let videoEnabled = true;
      let sessionState = {
        mode: "idle",
        status: "Ready",
        inviteOnlyMode: null,
        openInviteLink: "",
        privateInviteLink: ""
      };

      function updateSessionState(nextState) {
        sessionState = { ...sessionState, ...(nextState || {}) };
        const mode = sessionState.mode || "idle";

        modePill.dataset.mode = mode;
        statusDot.dataset.mode = mode;
        modePill.textContent = mode === "host" ? "Hosting" : mode === "guest" ? "Guest" : "Idle";
        sessionStatus.textContent = sessionState.status || "Ready";
        statusSub.textContent = mode === "host" ? "Hosting session" : mode === "guest" ? "Joined session" : "No active session";

        privateInvite.value = sessionState.privateInviteLink || "";
        openInvite.value = sessionState.openInviteLink || "";

        invitePolicy.textContent = sessionState.inviteOnlyMode === null
          ? "Policy: n/a"
          : "Policy: " + (sessionState.inviteOnlyMode ? "Invite-only" : "Open");

        const isHost = mode === "host";
        const canEnd = mode !== "idle";

        hostSessionButton.disabled = mode !== "idle";
        joinSessionButton.disabled = mode !== "idle";
        endSessionButton.disabled = !canEnd;
        copyPrivateInviteButton.disabled = !isHost || !sessionState.privateInviteLink;
        copyOpenInviteButton.disabled = !isHost || !sessionState.openInviteLink;
      }

      async function ensurePeerConnection() {
        if (pc) {
          return pc;
        }

        pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            vscode.postMessage({
              type: "rtc-signal",
              signal: { type: "ice", candidate: event.candidate }
            });
          }
        };

        pc.ontrack = (event) => {
          remoteVideo.srcObject = event.streams[0];
          callStatus.textContent = "Connected";
          callDot.classList.add("live");
        };

        if (localStream) {
          localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
        }

        return pc;
      }

      async function ensureMedia() {
        if (localStream) {
          return localStream;
        }

        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        localVideo.srcObject = localStream;
        callStatus.textContent = "Media ready";
        return localStream;
      }

      async function startCall() {
        await ensureMedia();
        const conn = await ensurePeerConnection();

        const offer = await conn.createOffer();
        await conn.setLocalDescription(offer);

        vscode.postMessage({
          type: "rtc-signal",
          signal: { type: "offer", sdp: offer }
        });

        callStatus.textContent = "Calling...";
      }

      async function handleRtcSignal(signal) {
        if (!signal) {
          return;
        }

        await ensureMedia();
        const conn = await ensurePeerConnection();

        if (signal.type === "offer") {
          await conn.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await conn.createAnswer();
          await conn.setLocalDescription(answer);
          vscode.postMessage({
            type: "rtc-signal",
            signal: { type: "answer", sdp: answer }
          });
          callStatus.textContent = "Answering call...";
          return;
        }

        if (signal.type === "answer") {
          await conn.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          callStatus.textContent = "Call connected";
          return;
        }

        if (signal.type === "ice" && signal.candidate) {
          try {
            await conn.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch {
            // Ignore out-of-order ICE errors in prototype.
          }
        }
      }

      function renderParticipants(list) {
        participants.innerHTML = "";

        const items = list || [];
        participantCount.textContent = items.length + " connected";

        if (!items.length) {
          const li = document.createElement("li");
          li.className = "participant-empty";
          li.textContent = "No one connected yet.";
          participants.append(li);
          return;
        }

        for (const item of items) {
          const li = document.createElement("li");
          li.className = "participant-item";
          const initial = (item.name || "?")[0].toUpperCase();
          const isHost = item.role === "host";
          li.innerHTML = "<span class="participant-avatar">" + initial + "</span>"
            + "<span class="participant-name">" + (item.name || "Unknown") + "</span>"
            + "<span class="participant-role" + (isHost ? " host" : "") + "">" + (item.role || "") + "</span>";
          participants.append(li);
        }
      }

      function appendChat(message) {
        const line = document.createElement("div");
        line.className = "chat-line";
        const payload = message || {};
        const timestamp = payload.timestamp ? new Date(payload.timestamp).toLocaleTimeString() : "now";
        line.innerHTML = "<div class="chat-meta">"
          + timestamp
          + " \xB7 "
          + (payload.user || "Unknown")
          + "</div><div class="chat-text">"
          + (payload.text || "")
          + "</div>";
        chat.append(line);
        chat.scrollTop = chat.scrollHeight;
      }

      hostSessionButton.addEventListener("click", () => {
        vscode.postMessage({ type: "host-session" });
      });

      joinSessionButton.addEventListener("click", () => {
        vscode.postMessage({ type: "join-session" });
      });

      endSessionButton.addEventListener("click", () => {
        vscode.postMessage({ type: "end-session" });
      });

      copyPrivateInviteButton.addEventListener("click", () => {
        vscode.postMessage({ type: "copy-invite", kind: "private" });
      });

      copyOpenInviteButton.addEventListener("click", () => {
        vscode.postMessage({ type: "copy-invite", kind: "open" });
      });

      sendChat.addEventListener("click", () => {
        const text = chatInput.value.trim();
        if (!text) {
          return;
        }
        vscode.postMessage({ type: "send-chat", text });
        chatInput.value = "";
      });

      chatInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          sendChat.click();
        }
      });

      startCallButton.addEventListener("click", () => {
        startCall().catch((error) => {
          callStatus.textContent = "Call failed: " + error.message;
        });
      });

      toggleAudioButton.addEventListener("click", async () => {
        await ensureMedia();
        audioEnabled = !audioEnabled;
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = audioEnabled;
        });
      });

      toggleVideoButton.addEventListener("click", async () => {
        await ensureMedia();
        videoEnabled = !videoEnabled;
        localStream.getVideoTracks().forEach((track) => {
          track.enabled = videoEnabled;
        });
      });

      window.addEventListener("message", (event) => {
        const data = event.data;
        if (!data?.type) {
          return;
        }

        if (data.type === "chat-message") {
          appendChat(data.payload);
          return;
        }

        if (data.type === "participants") {
          renderParticipants(data.payload || []);
          return;
        }

        if (data.type === "rtc-signal") {
          handleRtcSignal(data.payload).catch((error) => {
            callStatus.textContent = "RTC error: " + error.message;
          });
          return;
        }

        if (data.type === "session-state") {
          updateSessionState(data.payload || {});
          return;
        }

        if (data.type === "status") {
          const statusText = typeof data.payload === "string"
            ? data.payload
            : (data.payload ? String(data.payload) : "Idle");
          callStatus.textContent = statusText;
          const isLive = statusText.toLowerCase().includes("connect");
          callDot.classList.toggle("live", isLive);
          updateSessionState({ status: statusText || "Ready" });
        }
      });

      updateSessionState({ mode: "idle", status: "Ready" });
      renderParticipants([]);
      vscode.postMessage({ type: "panel-ready" });
    </script>
  </body>
</html>`}Cc.exports={MultiplayerViewProvider:Ks,sendPanelMessage:Xu}});var Sr=require("node:path"),m=require("vscode"),ni=(ha(),Vc(da)),{EVENTS:Pt}=Es(),{SessionService:tf}=Ec(),{MultiplayerViewProvider:nf,sendPanelMessage:Mt}=Ic(),Rt=null,Be=null,I=null,Qs=!1,ei=[],O={mode:"idle",status:"Ready",inviteOnlyMode:null,openInviteLink:"",privateInviteLink:""},Tc=new Map,Oc=m.window.createTextEditorDecorationType({borderWidth:"1px",borderStyle:"solid",borderColor:"#4fc3f7",borderRadius:"2px"});function rf(t){Rt=m.window.createStatusBarItem(m.StatusBarAlignment.Left,100),Rt.text="Multiplayer: idle",Rt.show(),I=new tf(Vt),Be=new nf({onSendChat:async e=>{await I.sendChat(e)},onRtcSignal:e=>{I.sendRtcSignal(e)},onHostSession:async()=>{await Xs(),kn()},onJoinSession:async()=>{await Zs(),kn()},onEndSession:async()=>{await Uc()},onCopyInvite:async e=>{let n=e==="open"?O.openInviteLink:O.privateInviteLink;if(!n){m.window.showWarningMessage("No invite link available yet");return}await m.env.clipboard.writeText(n),m.window.showInformationMessage(`${e==="open"?"Open":"Private"} invite copied`)},onPanelReady:()=>{ot(),Mt(Be,{type:"participants",payload:ei})}}),t.subscriptions.push(Rt,Oc,m.window.registerWebviewViewProvider("multiplayer.sidePanel",Be,{webviewOptions:{retainContextWhenHidden:!0}})),I.on("status",e=>{ti(e.message),O.status=e.message,ot(),Mt(Be,{type:"status",payload:e.message})}),I.on("join-request",async e=>{let n=await m.window.showInformationMessage(`${e.displayName} wants to join your session`,"Approve","Reject");await I.decideJoinRequest({requestId:e.requestId,accepted:n==="Approve"})}),I.on("join-rejected",e=>{O.mode="idle",O.openInviteLink="",O.privateInviteLink="",ot(),m.window.showErrorMessage(e||"Join rejected")}),I.on("join-accepted",async e=>{if(O.mode="guest",ot(),e){let n=m.Uri.file(e);await m.commands.executeCommand("vscode.openFolder",n,!1)}m.window.showInformationMessage("Multiplayer session connected")}),I.on("participants",e=>{ei=e,Mt(Be,{type:"participants",payload:e})}),I.on("chat-message",e=>{Mt(Be,{type:"chat-message",payload:e})}),I.on("rtc-signal",e=>{Mt(Be,{type:"rtc-signal",payload:e.signal})}),I.on("sync-message",async e=>{await cf(e)}),t.subscriptions.push(m.commands.registerCommand("multiplayer.easyStart",async()=>{let e=await m.window.showQuickPick([{label:"Host New Session",value:"host"},{label:"Join Session",value:"join"},{label:"Open Multiplayer Panel",value:"panel"}],{placeHolder:"Start multiplayer collaboration"});e&&(e.value==="host"?await Xs():e.value==="join"?await Zs():kn())}),m.commands.registerCommand("multiplayer.hostSession",Xs),m.commands.registerCommand("multiplayer.joinSession",Zs),m.commands.registerCommand("multiplayer.openPanel",()=>kn()),m.commands.registerCommand("multiplayer.endSession",Uc),m.commands.registerCommand("multiplayer.toggleInviteOnly",async()=>{let e=await m.window.showQuickPick([{label:"Invite-Only On",value:!0},{label:"Invite-Only Off",value:!1}],{placeHolder:"Set invite policy for the next host session"});e&&(await t.workspaceState.update("multiplayer.inviteOnly",e.value),m.window.showInformationMessage(`Invite-only set to ${e.value?"ON":"OFF"}`))}),m.workspace.onDidChangeTextDocument(af),m.window.onDidChangeTextEditorSelection(of),m.workspace.onDidOpenTextDocument(sf)),ti("Ready")}async function Xs(){let t=await m.window.showInputBox({prompt:"Host port",value:"3700"});if(!t)return;let e=await Dc();I.setDisplayName(e);let n=!!m.workspace.getConfiguration("multiplayer").get("inviteOnlyDefault",!0),r=await I.hostSession({port:Number(t)||3700,inviteOnlyMode:n});O.mode="host",O.inviteOnlyMode=r.inviteOnlyMode,O.openInviteLink=r.openInviteLink,O.privateInviteLink=r.privateInviteLink,ot(),await m.env.clipboard.writeText(r.privateInviteLink);let s=await m.window.showInformationMessage(`Hosting started. Private invite copied to clipboard. Invite-only: ${r.inviteOnlyMode?"ON":"OFF"}`,"Copy Open Invite","Open Panel");s==="Copy Open Invite"&&await m.env.clipboard.writeText(r.openInviteLink),s==="Open Panel"&&kn()}async function Zs(){let t=await m.window.showInputBox({prompt:"Paste invite link or code"});if(!t)return;let e=await Dc();I.setDisplayName(e),await I.joinSession({inviteText:t,cloneIfMissing:!0}),O.mode="guest",O.openInviteLink="",O.privateInviteLink="",ot()}async function Uc(){await I.endSession(),ei=[],O.mode="idle",O.status="Session stopped",O.inviteOnlyMode=null,O.openInviteLink="",O.privateInviteLink="",ot(),ti("Session stopped")}async function Dc(){return await m.window.showInputBox({prompt:"Display name",value:m.env.machineId.slice(0,8)})||"Anonymous"}function kn(){m.commands.executeCommand("multiplayer.sidePanel.focus")}function sf(t){if(t.uri.scheme!=="file"||!uf(t.uri.fsPath))return;let e=ri(t.uri.fsPath);e&&(En(e,t.getText()),I.sendSyncMessage({type:Pt.FILE_OPEN,relativePath:e,content:t.getText()}))}function of(t){if(!t?.textEditor?.document||t.textEditor.document.uri.scheme!=="file")return;let e=ri(t.textEditor.document.uri.fsPath);if(!e||!t.selections?.length)return;let n=t.selections[0];I.sendSyncMessage({type:Pt.CURSOR_UPDATE,relativePath:e,user:m.env.machineId,active:{line:n.active.line,character:n.active.character}})}function af(t){if(Qs||t.document.uri.scheme!=="file")return;let e=ri(t.document.uri.fsPath);if(!e)return;let n=En(e,t.document.getText());n.text.delete(0,n.text.length),n.text.insert(0,t.document.getText());let r=ni.encodeStateAsUpdate(n.doc);I.sendSyncMessage({type:Pt.YJS_UPDATE,relativePath:e,update:Buffer.from(r).toString("base64")})}async function cf(t){if(t.type===Pt.FILE_OPEN){await lf(t);return}if(t.type===Pt.YJS_UPDATE){await df(t);return}t.type===Pt.CURSOR_UPDATE&&await hf(t)}async function lf(t){let e=Vt();if(!e||!t.relativePath)return;let n=Sr.join(e,t.relativePath),r=m.Uri.file(n);try{let s=await m.workspace.openTextDocument(r),i=await m.window.showTextDocument(s,{preview:!1,preserveFocus:!0});typeof t.content=="string"&&s.getText()!==t.content&&await Ac(i,t.content),En(t.relativePath,t.content||s.getText())}catch{await m.workspace.fs.writeFile(r,new TextEncoder().encode(t.content||""));let s=await m.workspace.openTextDocument(r);await m.window.showTextDocument(s,{preview:!1,preserveFocus:!0}),En(t.relativePath,t.content||"")}}async function df(t){if(!t.relativePath||!t.update)return;let e=Vt();if(!e)return;let n=m.Uri.file(Sr.join(e,t.relativePath)),r;try{r=await m.workspace.openTextDocument(n)}catch{await m.workspace.fs.writeFile(n,new TextEncoder().encode("")),r=await m.workspace.openTextDocument(n)}let s=En(t.relativePath,r.getText());ni.applyUpdate(s.doc,Buffer.from(t.update,"base64"),"remote");let i=s.text.toString();if(r.getText()===i)return;let o=await m.window.showTextDocument(r,{preview:!1,preserveFocus:!0});await Ac(o,i)}async function hf(t){if(!t.relativePath||!t.active)return;let e=Vt();if(!e)return;let n=m.Uri.file(Sr.join(e,t.relativePath)),r=m.window.visibleTextEditors.find(i=>i.document.uri.fsPath===n.fsPath);if(!r)return;let s=new m.Position(t.active.line||0,t.active.character||0);r.setDecorations(Oc,[new m.Range(s,s)])}async function Ac(t,e){Qs=!0;try{let n=t.document,r=n.lineCount>0?n.lineAt(n.lineCount-1).range.end:new m.Position(0,0);await t.edit(s=>{s.replace(new m.Range(new m.Position(0,0),r),e)})}finally{Qs=!1}}function En(t,e){let n=Tc.get(t);if(n)return n;let r=new ni.Doc,s=r.getText("content");s.insert(0,e||"");let i={doc:r,text:s};return Tc.set(t,i),i}function Vt(){return m.workspace.workspaceFolders?.[0]?.uri?.fsPath||null}function ri(t){let e=Vt();return!e||!t.startsWith(e)?null:Sr.relative(e,t)}function uf(t){let e=Vt();return!!(e&&t.startsWith(e))}function ti(t){Rt&&(Rt.text=`Multiplayer: ${t}`)}function ot(){Mt(Be,{type:"session-state",payload:{...O}})}async function ff(){I&&await I.endSession()}module.exports={activate:rf,deactivate:ff};
