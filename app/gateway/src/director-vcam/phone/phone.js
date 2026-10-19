"use strict";(()=>{var hS=Object.create;var Xu=Object.defineProperty;var fS=Object.getOwnPropertyDescriptor;var dS=Object.getOwnPropertyNames;var pS=Object.getPrototypeOf,mS=Object.prototype.hasOwnProperty;var gS=(e,t,n)=>t in e?Xu(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var ui=(e,t)=>()=>{try{return t||e((t={exports:{}}).exports,t),t.exports}catch(n){throw t=0,n}};var _S=(e,t,n,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let a of dS(t))!mS.call(e,a)&&a!==n&&Xu(e,a,{get:()=>t[a],enumerable:!(i=fS(t,a))||i.enumerable});return e};var hi=(e,t,n)=>(n=e!=null?hS(pS(e)):{},_S(t||!e||!e.__esModule?Xu(n,"default",{value:e,enumerable:!0}):n,e));var Ae=(e,t,n)=>gS(e,typeof t!="symbol"?t+"":t,n);var xm=ui(Dt=>{"use strict";var Zu=Symbol.for("react.transitional.element"),vS=Symbol.for("react.portal"),yS=Symbol.for("react.fragment"),xS=Symbol.for("react.strict_mode"),SS=Symbol.for("react.profiler"),bS=Symbol.for("react.consumer"),MS=Symbol.for("react.context"),ES=Symbol.for("react.forward_ref"),TS=Symbol.for("react.suspense"),AS=Symbol.for("react.memo"),pm=Symbol.for("react.lazy"),wS=Symbol.for("react.activity"),um=Symbol.iterator;function RS(e){return e===null||typeof e!="object"?null:(e=um&&e[um]||e["@@iterator"],typeof e=="function"?e:null)}var mm={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},gm=Object.assign,_m={};function ws(e,t,n){this.props=e,this.context=t,this.refs=_m,this.updater=n||mm}ws.prototype.isReactComponent={};ws.prototype.setState=function(e,t){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,t,"setState")};ws.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function vm(){}vm.prototype=ws.prototype;function ju(e,t,n){this.props=e,this.context=t,this.refs=_m,this.updater=n||mm}var Ju=ju.prototype=new vm;Ju.constructor=ju;gm(Ju,ws.prototype);Ju.isPureReactComponent=!0;var hm=Array.isArray;function Yu(){}var fe={H:null,A:null,T:null,S:null},ym=Object.prototype.hasOwnProperty;function Qu(e,t,n){var i=n.ref;return{$$typeof:Zu,type:e,key:t,ref:i!==void 0?i:null,props:n}}function CS(e,t){return Qu(e.type,t,e.props)}function Ku(e){return typeof e=="object"&&e!==null&&e.$$typeof===Zu}function LS(e){var t={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(n){return t[n]})}var fm=/\/+/g;function qu(e,t){return typeof e=="object"&&e!==null&&e.key!=null?LS(""+e.key):t.toString(36)}function DS(e){switch(e.status){case"fulfilled":return e.value;case"rejected":throw e.reason;default:switch(typeof e.status=="string"?e.then(Yu,Yu):(e.status="pending",e.then(function(t){e.status==="pending"&&(e.status="fulfilled",e.value=t)},function(t){e.status==="pending"&&(e.status="rejected",e.reason=t)})),e.status){case"fulfilled":return e.value;case"rejected":throw e.reason}}throw e}function As(e,t,n,i,a){var s=typeof e;(s==="undefined"||s==="boolean")&&(e=null);var r=!1;if(e===null)r=!0;else switch(s){case"bigint":case"string":case"number":r=!0;break;case"object":switch(e.$$typeof){case Zu:case vS:r=!0;break;case pm:return r=e._init,As(r(e._payload),t,n,i,a)}}if(r)return a=a(e),r=i===""?"."+qu(e,0):i,hm(a)?(n="",r!=null&&(n=r.replace(fm,"$&/")+"/"),As(a,t,n,"",function(c){return c})):a!=null&&(Ku(a)&&(a=CS(a,n+(a.key==null||e&&e.key===a.key?"":(""+a.key).replace(fm,"$&/")+"/")+r)),t.push(a)),1;r=0;var o=i===""?".":i+":";if(hm(e))for(var l=0;l<e.length;l++)i=e[l],s=o+qu(i,l),r+=As(i,t,n,s,a);else if(l=RS(e),typeof l=="function")for(e=l.call(e),l=0;!(i=e.next()).done;)i=i.value,s=o+qu(i,l++),r+=As(i,t,n,s,a);else if(s==="object"){if(typeof e.then=="function")return As(DS(e),t,n,i,a);throw t=String(e),Error("Objects are not valid as a React child (found: "+(t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t)+"). If you meant to render a collection of children, use an array instead.")}return r}function pl(e,t,n){if(e==null)return e;var i=[],a=0;return As(e,i,"","",function(s){return t.call(n,s,a++)}),i}function US(e){if(e._status===-1){var t=e._result;t=t(),t.then(function(n){(e._status===0||e._status===-1)&&(e._status=1,e._result=n)},function(n){(e._status===0||e._status===-1)&&(e._status=2,e._result=n)}),e._status===-1&&(e._status=0,e._result=t)}if(e._status===1)return e._result.default;throw e._result}var dm=typeof reportError=="function"?reportError:function(e){if(typeof window=="object"&&typeof window.ErrorEvent=="function"){var t=new window.ErrorEvent("error",{bubbles:!0,cancelable:!0,message:typeof e=="object"&&e!==null&&typeof e.message=="string"?String(e.message):String(e),error:e});if(!window.dispatchEvent(t))return}else if(typeof process=="object"&&typeof process.emit=="function"){process.emit("uncaughtException",e);return}console.error(e)},NS={map:pl,forEach:function(e,t,n){pl(e,function(){t.apply(this,arguments)},n)},count:function(e){var t=0;return pl(e,function(){t++}),t},toArray:function(e){return pl(e,function(t){return t})||[]},only:function(e){if(!Ku(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};Dt.Activity=wS;Dt.Children=NS;Dt.Component=ws;Dt.Fragment=yS;Dt.Profiler=SS;Dt.PureComponent=ju;Dt.StrictMode=xS;Dt.Suspense=TS;Dt.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=fe;Dt.__COMPILER_RUNTIME={__proto__:null,c:function(e){return fe.H.useMemoCache(e)}};Dt.cache=function(e){return function(){return e.apply(null,arguments)}};Dt.cacheSignal=function(){return null};Dt.cloneElement=function(e,t,n){if(e==null)throw Error("The argument must be a React element, but you passed "+e+".");var i=gm({},e.props),a=e.key;if(t!=null)for(s in t.key!==void 0&&(a=""+t.key),t)!ym.call(t,s)||s==="key"||s==="__self"||s==="__source"||s==="ref"&&t.ref===void 0||(i[s]=t[s]);var s=arguments.length-2;if(s===1)i.children=n;else if(1<s){for(var r=Array(s),o=0;o<s;o++)r[o]=arguments[o+2];i.children=r}return Qu(e.type,a,i)};Dt.createContext=function(e){return e={$$typeof:MS,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null},e.Provider=e,e.Consumer={$$typeof:bS,_context:e},e};Dt.createElement=function(e,t,n){var i,a={},s=null;if(t!=null)for(i in t.key!==void 0&&(s=""+t.key),t)ym.call(t,i)&&i!=="key"&&i!=="__self"&&i!=="__source"&&(a[i]=t[i]);var r=arguments.length-2;if(r===1)a.children=n;else if(1<r){for(var o=Array(r),l=0;l<r;l++)o[l]=arguments[l+2];a.children=o}if(e&&e.defaultProps)for(i in r=e.defaultProps,r)a[i]===void 0&&(a[i]=r[i]);return Qu(e,s,a)};Dt.createRef=function(){return{current:null}};Dt.forwardRef=function(e){return{$$typeof:ES,render:e}};Dt.isValidElement=Ku;Dt.lazy=function(e){return{$$typeof:pm,_payload:{_status:-1,_result:e},_init:US}};Dt.memo=function(e,t){return{$$typeof:AS,type:e,compare:t===void 0?null:t}};Dt.startTransition=function(e){var t=fe.T,n={};fe.T=n;try{var i=e(),a=fe.S;a!==null&&a(n,i),typeof i=="object"&&i!==null&&typeof i.then=="function"&&i.then(Yu,dm)}catch(s){dm(s)}finally{t!==null&&n.types!==null&&(t.types=n.types),fe.T=t}};Dt.unstable_useCacheRefresh=function(){return fe.H.useCacheRefresh()};Dt.use=function(e){return fe.H.use(e)};Dt.useActionState=function(e,t,n){return fe.H.useActionState(e,t,n)};Dt.useCallback=function(e,t){return fe.H.useCallback(e,t)};Dt.useContext=function(e){return fe.H.useContext(e)};Dt.useDebugValue=function(){};Dt.useDeferredValue=function(e,t){return fe.H.useDeferredValue(e,t)};Dt.useEffect=function(e,t){return fe.H.useEffect(e,t)};Dt.useEffectEvent=function(e){return fe.H.useEffectEvent(e)};Dt.useId=function(){return fe.H.useId()};Dt.useImperativeHandle=function(e,t,n){return fe.H.useImperativeHandle(e,t,n)};Dt.useInsertionEffect=function(e,t){return fe.H.useInsertionEffect(e,t)};Dt.useLayoutEffect=function(e,t){return fe.H.useLayoutEffect(e,t)};Dt.useMemo=function(e,t){return fe.H.useMemo(e,t)};Dt.useOptimistic=function(e,t){return fe.H.useOptimistic(e,t)};Dt.useReducer=function(e,t,n){return fe.H.useReducer(e,t,n)};Dt.useRef=function(e){return fe.H.useRef(e)};Dt.useState=function(e){return fe.H.useState(e)};Dt.useSyncExternalStore=function(e,t,n){return fe.H.useSyncExternalStore(e,t,n)};Dt.useTransition=function(){return fe.H.useTransition()};Dt.version="19.2.4"});var Rs=ui((wC,Sm)=>{"use strict";Sm.exports=xm()});var Dm=ui(ve=>{"use strict";function nh(e,t){var n=e.length;e.push(t);t:for(;0<n;){var i=n-1>>>1,a=e[i];if(0<ml(a,t))e[i]=t,e[n]=a,n=i;else break t}}function fi(e){return e.length===0?null:e[0]}function _l(e){if(e.length===0)return null;var t=e[0],n=e.pop();if(n!==t){e[0]=n;t:for(var i=0,a=e.length,s=a>>>1;i<s;){var r=2*(i+1)-1,o=e[r],l=r+1,c=e[l];if(0>ml(o,n))l<a&&0>ml(c,o)?(e[i]=c,e[l]=n,i=l):(e[i]=o,e[r]=n,i=r);else if(l<a&&0>ml(c,n))e[i]=c,e[l]=n,i=l;else break t}}return t}function ml(e,t){var n=e.sortIndex-t.sortIndex;return n!==0?n:e.id-t.id}ve.unstable_now=void 0;typeof performance=="object"&&typeof performance.now=="function"?(bm=performance,ve.unstable_now=function(){return bm.now()}):($u=Date,Mm=$u.now(),ve.unstable_now=function(){return $u.now()-Mm});var bm,$u,Mm,Mi=[],na=[],OS=1,Bn=null,tn=3,ih=!1,Jr=!1,Qr=!1,ah=!1,Am=typeof setTimeout=="function"?setTimeout:null,wm=typeof clearTimeout=="function"?clearTimeout:null,Em=typeof setImmediate<"u"?setImmediate:null;function gl(e){for(var t=fi(na);t!==null;){if(t.callback===null)_l(na);else if(t.startTime<=e)_l(na),t.sortIndex=t.expirationTime,nh(Mi,t);else break;t=fi(na)}}function sh(e){if(Qr=!1,gl(e),!Jr)if(fi(Mi)!==null)Jr=!0,Ls||(Ls=!0,Cs());else{var t=fi(na);t!==null&&rh(sh,t.startTime-e)}}var Ls=!1,Kr=-1,Rm=5,Cm=-1;function Lm(){return ah?!0:!(ve.unstable_now()-Cm<Rm)}function th(){if(ah=!1,Ls){var e=ve.unstable_now();Cm=e;var t=!0;try{t:{Jr=!1,Qr&&(Qr=!1,wm(Kr),Kr=-1),ih=!0;var n=tn;try{e:{for(gl(e),Bn=fi(Mi);Bn!==null&&!(Bn.expirationTime>e&&Lm());){var i=Bn.callback;if(typeof i=="function"){Bn.callback=null,tn=Bn.priorityLevel;var a=i(Bn.expirationTime<=e);if(e=ve.unstable_now(),typeof a=="function"){Bn.callback=a,gl(e),t=!0;break e}Bn===fi(Mi)&&_l(Mi),gl(e)}else _l(Mi);Bn=fi(Mi)}if(Bn!==null)t=!0;else{var s=fi(na);s!==null&&rh(sh,s.startTime-e),t=!1}}break t}finally{Bn=null,tn=n,ih=!1}t=void 0}}finally{t?Cs():Ls=!1}}}var Cs;typeof Em=="function"?Cs=function(){Em(th)}:typeof MessageChannel<"u"?(eh=new MessageChannel,Tm=eh.port2,eh.port1.onmessage=th,Cs=function(){Tm.postMessage(null)}):Cs=function(){Am(th,0)};var eh,Tm;function rh(e,t){Kr=Am(function(){e(ve.unstable_now())},t)}ve.unstable_IdlePriority=5;ve.unstable_ImmediatePriority=1;ve.unstable_LowPriority=4;ve.unstable_NormalPriority=3;ve.unstable_Profiling=null;ve.unstable_UserBlockingPriority=2;ve.unstable_cancelCallback=function(e){e.callback=null};ve.unstable_forceFrameRate=function(e){0>e||125<e?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):Rm=0<e?Math.floor(1e3/e):5};ve.unstable_getCurrentPriorityLevel=function(){return tn};ve.unstable_next=function(e){switch(tn){case 1:case 2:case 3:var t=3;break;default:t=tn}var n=tn;tn=t;try{return e()}finally{tn=n}};ve.unstable_requestPaint=function(){ah=!0};ve.unstable_runWithPriority=function(e,t){switch(e){case 1:case 2:case 3:case 4:case 5:break;default:e=3}var n=tn;tn=e;try{return t()}finally{tn=n}};ve.unstable_scheduleCallback=function(e,t,n){var i=ve.unstable_now();switch(typeof n=="object"&&n!==null?(n=n.delay,n=typeof n=="number"&&0<n?i+n:i):n=i,e){case 1:var a=-1;break;case 2:a=250;break;case 5:a=1073741823;break;case 4:a=1e4;break;default:a=5e3}return a=n+a,e={id:OS++,callback:t,priorityLevel:e,startTime:n,expirationTime:a,sortIndex:-1},n>i?(e.sortIndex=n,nh(na,e),fi(Mi)===null&&e===fi(na)&&(Qr?(wm(Kr),Kr=-1):Qr=!0,rh(sh,n-i))):(e.sortIndex=a,nh(Mi,e),Jr||ih||(Jr=!0,Ls||(Ls=!0,Cs()))),e};ve.unstable_shouldYield=Lm;ve.unstable_wrapCallback=function(e){var t=tn;return function(){var n=tn;tn=t;try{return e.apply(this,arguments)}finally{tn=n}}}});var Nm=ui((CC,Um)=>{"use strict";Um.exports=Dm()});var Pm=ui(ln=>{"use strict";var PS=Rs();function Om(e){var t="https://react.dev/errors/"+e;if(1<arguments.length){t+="?args[]="+encodeURIComponent(arguments[1]);for(var n=2;n<arguments.length;n++)t+="&args[]="+encodeURIComponent(arguments[n])}return"Minified React error #"+e+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}function ia(){}var on={d:{f:ia,r:function(){throw Error(Om(522))},D:ia,C:ia,L:ia,m:ia,X:ia,S:ia,M:ia},p:0,findDOMNode:null},zS=Symbol.for("react.portal");function IS(e,t,n){var i=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:zS,key:i==null?null:""+i,children:e,containerInfo:t,implementation:n}}var $r=PS.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;function vl(e,t){if(e==="font")return"";if(typeof t=="string")return t==="use-credentials"?t:""}ln.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=on;ln.createPortal=function(e,t){var n=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!t||t.nodeType!==1&&t.nodeType!==9&&t.nodeType!==11)throw Error(Om(299));return IS(e,t,null,n)};ln.flushSync=function(e){var t=$r.T,n=on.p;try{if($r.T=null,on.p=2,e)return e()}finally{$r.T=t,on.p=n,on.d.f()}};ln.preconnect=function(e,t){typeof e=="string"&&(t?(t=t.crossOrigin,t=typeof t=="string"?t==="use-credentials"?t:"":void 0):t=null,on.d.C(e,t))};ln.prefetchDNS=function(e){typeof e=="string"&&on.d.D(e)};ln.preinit=function(e,t){if(typeof e=="string"&&t&&typeof t.as=="string"){var n=t.as,i=vl(n,t.crossOrigin),a=typeof t.integrity=="string"?t.integrity:void 0,s=typeof t.fetchPriority=="string"?t.fetchPriority:void 0;n==="style"?on.d.S(e,typeof t.precedence=="string"?t.precedence:void 0,{crossOrigin:i,integrity:a,fetchPriority:s}):n==="script"&&on.d.X(e,{crossOrigin:i,integrity:a,fetchPriority:s,nonce:typeof t.nonce=="string"?t.nonce:void 0})}};ln.preinitModule=function(e,t){if(typeof e=="string")if(typeof t=="object"&&t!==null){if(t.as==null||t.as==="script"){var n=vl(t.as,t.crossOrigin);on.d.M(e,{crossOrigin:n,integrity:typeof t.integrity=="string"?t.integrity:void 0,nonce:typeof t.nonce=="string"?t.nonce:void 0})}}else t==null&&on.d.M(e)};ln.preload=function(e,t){if(typeof e=="string"&&typeof t=="object"&&t!==null&&typeof t.as=="string"){var n=t.as,i=vl(n,t.crossOrigin);on.d.L(e,n,{crossOrigin:i,integrity:typeof t.integrity=="string"?t.integrity:void 0,nonce:typeof t.nonce=="string"?t.nonce:void 0,type:typeof t.type=="string"?t.type:void 0,fetchPriority:typeof t.fetchPriority=="string"?t.fetchPriority:void 0,referrerPolicy:typeof t.referrerPolicy=="string"?t.referrerPolicy:void 0,imageSrcSet:typeof t.imageSrcSet=="string"?t.imageSrcSet:void 0,imageSizes:typeof t.imageSizes=="string"?t.imageSizes:void 0,media:typeof t.media=="string"?t.media:void 0})}};ln.preloadModule=function(e,t){if(typeof e=="string")if(t){var n=vl(t.as,t.crossOrigin);on.d.m(e,{as:typeof t.as=="string"&&t.as!=="script"?t.as:void 0,crossOrigin:n,integrity:typeof t.integrity=="string"?t.integrity:void 0})}else on.d.m(e)};ln.requestFormReset=function(e){on.d.r(e)};ln.unstable_batchedUpdates=function(e,t){return e(t)};ln.useFormState=function(e,t,n){return $r.H.useFormState(e,t,n)};ln.useFormStatus=function(){return $r.H.useHostTransitionStatus()};ln.version="19.2.4"});var Bm=ui((DC,Im)=>{"use strict";function zm(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(zm)}catch(e){console.error(e)}}zm(),Im.exports=Pm()});var Jv=ui(kc=>{"use strict";var ze=Nm(),u_=Rs(),BS=Bm();function W(e){var t="https://react.dev/errors/"+e;if(1<arguments.length){t+="?args[]="+encodeURIComponent(arguments[1]);for(var n=2;n<arguments.length;n++)t+="&args[]="+encodeURIComponent(arguments[n])}return"Minified React error #"+e+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}function h_(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function Ho(e){var t=e,n=e;if(e.alternate)for(;t.return;)t=t.return;else{e=t;do t=e,(t.flags&4098)!==0&&(n=t.return),e=t.return;while(e)}return t.tag===3?n:null}function f_(e){if(e.tag===13){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function d_(e){if(e.tag===31){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function Fm(e){if(Ho(e)!==e)throw Error(W(188))}function FS(e){var t=e.alternate;if(!t){if(t=Ho(e),t===null)throw Error(W(188));return t!==e?null:e}for(var n=e,i=t;;){var a=n.return;if(a===null)break;var s=a.alternate;if(s===null){if(i=a.return,i!==null){n=i;continue}break}if(a.child===s.child){for(s=a.child;s;){if(s===n)return Fm(a),e;if(s===i)return Fm(a),t;s=s.sibling}throw Error(W(188))}if(n.return!==i.return)n=a,i=s;else{for(var r=!1,o=a.child;o;){if(o===n){r=!0,n=a,i=s;break}if(o===i){r=!0,i=a,n=s;break}o=o.sibling}if(!r){for(o=s.child;o;){if(o===n){r=!0,n=s,i=a;break}if(o===i){r=!0,i=s,n=a;break}o=o.sibling}if(!r)throw Error(W(189))}}if(n.alternate!==i)throw Error(W(190))}if(n.tag!==3)throw Error(W(188));return n.stateNode.current===n?e:t}function p_(e){var t=e.tag;if(t===5||t===26||t===27||t===6)return e;for(e=e.child;e!==null;){if(t=p_(e),t!==null)return t;e=e.sibling}return null}var me=Object.assign,HS=Symbol.for("react.element"),yl=Symbol.for("react.transitional.element"),oo=Symbol.for("react.portal"),zs=Symbol.for("react.fragment"),m_=Symbol.for("react.strict_mode"),Hh=Symbol.for("react.profiler"),g_=Symbol.for("react.consumer"),Di=Symbol.for("react.context"),zf=Symbol.for("react.forward_ref"),Vh=Symbol.for("react.suspense"),Gh=Symbol.for("react.suspense_list"),If=Symbol.for("react.memo"),aa=Symbol.for("react.lazy"),kh=Symbol.for("react.activity"),VS=Symbol.for("react.memo_cache_sentinel"),Hm=Symbol.iterator;function to(e){return e===null||typeof e!="object"?null:(e=Hm&&e[Hm]||e["@@iterator"],typeof e=="function"?e:null)}var GS=Symbol.for("react.client.reference");function Wh(e){if(e==null)return null;if(typeof e=="function")return e.$$typeof===GS?null:e.displayName||e.name||null;if(typeof e=="string")return e;switch(e){case zs:return"Fragment";case Hh:return"Profiler";case m_:return"StrictMode";case Vh:return"Suspense";case Gh:return"SuspenseList";case kh:return"Activity"}if(typeof e=="object")switch(e.$$typeof){case oo:return"Portal";case Di:return e.displayName||"Context";case g_:return(e._context.displayName||"Context")+".Consumer";case zf:var t=e.render;return e=e.displayName,e||(e=t.displayName||t.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case If:return t=e.displayName||null,t!==null?t:Wh(e.type)||"Memo";case aa:t=e._payload,e=e._init;try{return Wh(e(t))}catch{}}return null}var lo=Array.isArray,Et=u_.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,$t=BS.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,ja={pending:!1,data:null,method:null,action:null},Xh=[],Is=-1;function _i(e){return{current:e}}function We(e){0>Is||(e.current=Xh[Is],Xh[Is]=null,Is--)}function ue(e,t){Is++,Xh[Is]=e.current,e.current=t}var gi=_i(null),Ao=_i(null),ma=_i(null),Kl=_i(null);function $l(e,t){switch(ue(ma,t),ue(Ao,e),ue(gi,null),t.nodeType){case 9:case 11:e=(e=t.documentElement)&&(e=e.namespaceURI)?Yg(e):0;break;default:if(e=t.tagName,t=t.namespaceURI)t=Yg(t),e=zv(t,e);else switch(e){case"svg":e=1;break;case"math":e=2;break;default:e=0}}We(gi),ue(gi,e)}function er(){We(gi),We(Ao),We(ma)}function qh(e){e.memoizedState!==null&&ue(Kl,e);var t=gi.current,n=zv(t,e.type);t!==n&&(ue(Ao,e),ue(gi,n))}function tc(e){Ao.current===e&&(We(gi),We(Ao)),Kl.current===e&&(We(Kl),Io._currentValue=ja)}var oh,Vm;function Xa(e){if(oh===void 0)try{throw Error()}catch(n){var t=n.stack.trim().match(/\n( *(at )?)/);oh=t&&t[1]||"",Vm=-1<n.stack.indexOf(`
    at`)?" (<anonymous>)":-1<n.stack.indexOf("@")?"@unknown:0:0":""}return`
`+oh+e+Vm}var lh=!1;function ch(e,t){if(!e||lh)return"";lh=!0;var n=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{var i={DetermineComponentFrameRoot:function(){try{if(t){var d=function(){throw Error()};if(Object.defineProperty(d.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(d,[])}catch(p){var f=p}Reflect.construct(e,[],d)}else{try{d.call()}catch(p){f=p}e.call(d.prototype)}}else{try{throw Error()}catch(p){f=p}(d=e())&&typeof d.catch=="function"&&d.catch(function(){})}}catch(p){if(p&&f&&typeof p.stack=="string")return[p.stack,f.stack]}return[null,null]}};i.DetermineComponentFrameRoot.displayName="DetermineComponentFrameRoot";var a=Object.getOwnPropertyDescriptor(i.DetermineComponentFrameRoot,"name");a&&a.configurable&&Object.defineProperty(i.DetermineComponentFrameRoot,"name",{value:"DetermineComponentFrameRoot"});var s=i.DetermineComponentFrameRoot(),r=s[0],o=s[1];if(r&&o){var l=r.split(`
`),c=o.split(`
`);for(a=i=0;i<l.length&&!l[i].includes("DetermineComponentFrameRoot");)i++;for(;a<c.length&&!c[a].includes("DetermineComponentFrameRoot");)a++;if(i===l.length||a===c.length)for(i=l.length-1,a=c.length-1;1<=i&&0<=a&&l[i]!==c[a];)a--;for(;1<=i&&0<=a;i--,a--)if(l[i]!==c[a]){if(i!==1||a!==1)do if(i--,a--,0>a||l[i]!==c[a]){var h=`
`+l[i].replace(" at new "," at ");return e.displayName&&h.includes("<anonymous>")&&(h=h.replace("<anonymous>",e.displayName)),h}while(1<=i&&0<=a);break}}}finally{lh=!1,Error.prepareStackTrace=n}return(n=e?e.displayName||e.name:"")?Xa(n):""}function kS(e,t){switch(e.tag){case 26:case 27:case 5:return Xa(e.type);case 16:return Xa("Lazy");case 13:return e.child!==t&&t!==null?Xa("Suspense Fallback"):Xa("Suspense");case 19:return Xa("SuspenseList");case 0:case 15:return ch(e.type,!1);case 11:return ch(e.type.render,!1);case 1:return ch(e.type,!0);case 31:return Xa("Activity");default:return""}}function Gm(e){try{var t="",n=null;do t+=kS(e,n),n=e,e=e.return;while(e);return t}catch(i){return`
Error generating stack: `+i.message+`
`+i.stack}}var Yh=Object.prototype.hasOwnProperty,Bf=ze.unstable_scheduleCallback,uh=ze.unstable_cancelCallback,WS=ze.unstable_shouldYield,XS=ze.unstable_requestPaint,wn=ze.unstable_now,qS=ze.unstable_getCurrentPriorityLevel,__=ze.unstable_ImmediatePriority,v_=ze.unstable_UserBlockingPriority,ec=ze.unstable_NormalPriority,YS=ze.unstable_LowPriority,y_=ze.unstable_IdlePriority,ZS=ze.log,jS=ze.unstable_setDisableYieldValue,Vo=null,Rn=null;function ua(e){if(typeof ZS=="function"&&jS(e),Rn&&typeof Rn.setStrictMode=="function")try{Rn.setStrictMode(Vo,e)}catch{}}var Cn=Math.clz32?Math.clz32:KS,JS=Math.log,QS=Math.LN2;function KS(e){return e>>>=0,e===0?32:31-(JS(e)/QS|0)|0}var xl=256,Sl=262144,bl=4194304;function qa(e){var t=e&42;if(t!==0)return t;switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:return 64;case 128:return 128;case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:return e&261888;case 262144:case 524288:case 1048576:case 2097152:return e&3932160;case 4194304:case 8388608:case 16777216:case 33554432:return e&62914560;case 67108864:return 67108864;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 0;default:return e}}function wc(e,t,n){var i=e.pendingLanes;if(i===0)return 0;var a=0,s=e.suspendedLanes,r=e.pingedLanes;e=e.warmLanes;var o=i&134217727;return o!==0?(i=o&~s,i!==0?a=qa(i):(r&=o,r!==0?a=qa(r):n||(n=o&~e,n!==0&&(a=qa(n))))):(o=i&~s,o!==0?a=qa(o):r!==0?a=qa(r):n||(n=i&~e,n!==0&&(a=qa(n)))),a===0?0:t!==0&&t!==a&&(t&s)===0&&(s=a&-a,n=t&-t,s>=n||s===32&&(n&4194048)!==0)?t:a}function Go(e,t){return(e.pendingLanes&~(e.suspendedLanes&~e.pingedLanes)&t)===0}function $S(e,t){switch(e){case 1:case 2:case 4:case 8:case 64:return t+250;case 16:case 32:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t+5e3;case 4194304:case 8388608:case 16777216:case 33554432:return-1;case 67108864:case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function x_(){var e=bl;return bl<<=1,(bl&62914560)===0&&(bl=4194304),e}function hh(e){for(var t=[],n=0;31>n;n++)t.push(e);return t}function ko(e,t){e.pendingLanes|=t,t!==268435456&&(e.suspendedLanes=0,e.pingedLanes=0,e.warmLanes=0)}function tb(e,t,n,i,a,s){var r=e.pendingLanes;e.pendingLanes=n,e.suspendedLanes=0,e.pingedLanes=0,e.warmLanes=0,e.expiredLanes&=n,e.entangledLanes&=n,e.errorRecoveryDisabledLanes&=n,e.shellSuspendCounter=0;var o=e.entanglements,l=e.expirationTimes,c=e.hiddenUpdates;for(n=r&~n;0<n;){var h=31-Cn(n),d=1<<h;o[h]=0,l[h]=-1;var f=c[h];if(f!==null)for(c[h]=null,h=0;h<f.length;h++){var p=f[h];p!==null&&(p.lane&=-536870913)}n&=~d}i!==0&&S_(e,i,0),s!==0&&a===0&&e.tag!==0&&(e.suspendedLanes|=s&~(r&~t))}function S_(e,t,n){e.pendingLanes|=t,e.suspendedLanes&=~t;var i=31-Cn(t);e.entangledLanes|=t,e.entanglements[i]=e.entanglements[i]|1073741824|n&261930}function b_(e,t){var n=e.entangledLanes|=t;for(e=e.entanglements;n;){var i=31-Cn(n),a=1<<i;a&t|e[i]&t&&(e[i]|=t),n&=~a}}function M_(e,t){var n=t&-t;return n=(n&42)!==0?1:Ff(n),(n&(e.suspendedLanes|t))!==0?0:n}function Ff(e){switch(e){case 2:e=1;break;case 8:e=4;break;case 32:e=16;break;case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:e=128;break;case 268435456:e=134217728;break;default:e=0}return e}function Hf(e){return e&=-e,2<e?8<e?(e&134217727)!==0?32:268435456:8:2}function E_(){var e=$t.p;return e!==0?e:(e=window.event,e===void 0?32:Yv(e.type))}function km(e,t){var n=$t.p;try{return $t.p=e,t()}finally{$t.p=n}}var Ra=Math.random().toString(36).slice(2),Ye="__reactFiber$"+Ra,_n="__reactProps$"+Ra,fr="__reactContainer$"+Ra,Zh="__reactEvents$"+Ra,eb="__reactListeners$"+Ra,nb="__reactHandles$"+Ra,Wm="__reactResources$"+Ra,Wo="__reactMarker$"+Ra;function Vf(e){delete e[Ye],delete e[_n],delete e[Zh],delete e[eb],delete e[nb]}function Bs(e){var t=e[Ye];if(t)return t;for(var n=e.parentNode;n;){if(t=n[fr]||n[Ye]){if(n=t.alternate,t.child!==null||n!==null&&n.child!==null)for(e=Kg(e);e!==null;){if(n=e[Ye])return n;e=Kg(e)}return t}e=n,n=e.parentNode}return null}function dr(e){if(e=e[Ye]||e[fr]){var t=e.tag;if(t===5||t===6||t===13||t===31||t===26||t===27||t===3)return e}return null}function co(e){var t=e.tag;if(t===5||t===26||t===27||t===6)return e.stateNode;throw Error(W(33))}function Zs(e){var t=e[Wm];return t||(t=e[Wm]={hoistableStyles:new Map,hoistableScripts:new Map}),t}function ke(e){e[Wo]=!0}var T_=new Set,A_={};function ss(e,t){nr(e,t),nr(e+"Capture",t)}function nr(e,t){for(A_[e]=t,e=0;e<t.length;e++)T_.add(t[e])}var ib=RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"),Xm={},qm={};function ab(e){return Yh.call(qm,e)?!0:Yh.call(Xm,e)?!1:ib.test(e)?qm[e]=!0:(Xm[e]=!0,!1)}function Il(e,t,n){if(ab(t))if(n===null)e.removeAttribute(t);else{switch(typeof n){case"undefined":case"function":case"symbol":e.removeAttribute(t);return;case"boolean":var i=t.toLowerCase().slice(0,5);if(i!=="data-"&&i!=="aria-"){e.removeAttribute(t);return}}e.setAttribute(t,""+n)}}function Ml(e,t,n){if(n===null)e.removeAttribute(t);else{switch(typeof n){case"undefined":case"function":case"symbol":case"boolean":e.removeAttribute(t);return}e.setAttribute(t,""+n)}}function Ei(e,t,n,i){if(i===null)e.removeAttribute(n);else{switch(typeof i){case"undefined":case"function":case"symbol":case"boolean":e.removeAttribute(n);return}e.setAttributeNS(t,n,""+i)}}function Hn(e){switch(typeof e){case"bigint":case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function w_(e){var t=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(t==="checkbox"||t==="radio")}function sb(e,t,n){var i=Object.getOwnPropertyDescriptor(e.constructor.prototype,t);if(!e.hasOwnProperty(t)&&typeof i<"u"&&typeof i.get=="function"&&typeof i.set=="function"){var a=i.get,s=i.set;return Object.defineProperty(e,t,{configurable:!0,get:function(){return a.call(this)},set:function(r){n=""+r,s.call(this,r)}}),Object.defineProperty(e,t,{enumerable:i.enumerable}),{getValue:function(){return n},setValue:function(r){n=""+r},stopTracking:function(){e._valueTracker=null,delete e[t]}}}}function jh(e){if(!e._valueTracker){var t=w_(e)?"checked":"value";e._valueTracker=sb(e,t,""+e[t])}}function R_(e){if(!e)return!1;var t=e._valueTracker;if(!t)return!0;var n=t.getValue(),i="";return e&&(i=w_(e)?e.checked?"true":"false":e.value),e=i,e!==n?(t.setValue(e),!0):!1}function nc(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch{return e.body}}var rb=/[\n"\\]/g;function kn(e){return e.replace(rb,function(t){return"\\"+t.charCodeAt(0).toString(16)+" "})}function Jh(e,t,n,i,a,s,r,o){e.name="",r!=null&&typeof r!="function"&&typeof r!="symbol"&&typeof r!="boolean"?e.type=r:e.removeAttribute("type"),t!=null?r==="number"?(t===0&&e.value===""||e.value!=t)&&(e.value=""+Hn(t)):e.value!==""+Hn(t)&&(e.value=""+Hn(t)):r!=="submit"&&r!=="reset"||e.removeAttribute("value"),t!=null?Qh(e,r,Hn(t)):n!=null?Qh(e,r,Hn(n)):i!=null&&e.removeAttribute("value"),a==null&&s!=null&&(e.defaultChecked=!!s),a!=null&&(e.checked=a&&typeof a!="function"&&typeof a!="symbol"),o!=null&&typeof o!="function"&&typeof o!="symbol"&&typeof o!="boolean"?e.name=""+Hn(o):e.removeAttribute("name")}function C_(e,t,n,i,a,s,r,o){if(s!=null&&typeof s!="function"&&typeof s!="symbol"&&typeof s!="boolean"&&(e.type=s),t!=null||n!=null){if(!(s!=="submit"&&s!=="reset"||t!=null)){jh(e);return}n=n!=null?""+Hn(n):"",t=t!=null?""+Hn(t):n,o||t===e.value||(e.value=t),e.defaultValue=t}i=i??a,i=typeof i!="function"&&typeof i!="symbol"&&!!i,e.checked=o?e.checked:!!i,e.defaultChecked=!!i,r!=null&&typeof r!="function"&&typeof r!="symbol"&&typeof r!="boolean"&&(e.name=r),jh(e)}function Qh(e,t,n){t==="number"&&nc(e.ownerDocument)===e||e.defaultValue===""+n||(e.defaultValue=""+n)}function js(e,t,n,i){if(e=e.options,t){t={};for(var a=0;a<n.length;a++)t["$"+n[a]]=!0;for(n=0;n<e.length;n++)a=t.hasOwnProperty("$"+e[n].value),e[n].selected!==a&&(e[n].selected=a),a&&i&&(e[n].defaultSelected=!0)}else{for(n=""+Hn(n),t=null,a=0;a<e.length;a++){if(e[a].value===n){e[a].selected=!0,i&&(e[a].defaultSelected=!0);return}t!==null||e[a].disabled||(t=e[a])}t!==null&&(t.selected=!0)}}function L_(e,t,n){if(t!=null&&(t=""+Hn(t),t!==e.value&&(e.value=t),n==null)){e.defaultValue!==t&&(e.defaultValue=t);return}e.defaultValue=n!=null?""+Hn(n):""}function D_(e,t,n,i){if(t==null){if(i!=null){if(n!=null)throw Error(W(92));if(lo(i)){if(1<i.length)throw Error(W(93));i=i[0]}n=i}n==null&&(n=""),t=n}n=Hn(t),e.defaultValue=n,i=e.textContent,i===n&&i!==""&&i!==null&&(e.value=i),jh(e)}function ir(e,t){if(t){var n=e.firstChild;if(n&&n===e.lastChild&&n.nodeType===3){n.nodeValue=t;return}}e.textContent=t}var ob=new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));function Ym(e,t,n){var i=t.indexOf("--")===0;n==null||typeof n=="boolean"||n===""?i?e.setProperty(t,""):t==="float"?e.cssFloat="":e[t]="":i?e.setProperty(t,n):typeof n!="number"||n===0||ob.has(t)?t==="float"?e.cssFloat=n:e[t]=(""+n).trim():e[t]=n+"px"}function U_(e,t,n){if(t!=null&&typeof t!="object")throw Error(W(62));if(e=e.style,n!=null){for(var i in n)!n.hasOwnProperty(i)||t!=null&&t.hasOwnProperty(i)||(i.indexOf("--")===0?e.setProperty(i,""):i==="float"?e.cssFloat="":e[i]="");for(var a in t)i=t[a],t.hasOwnProperty(a)&&n[a]!==i&&Ym(e,a,i)}else for(var s in t)t.hasOwnProperty(s)&&Ym(e,s,t[s])}function Gf(e){if(e.indexOf("-")===-1)return!1;switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var lb=new Map([["acceptCharset","accept-charset"],["htmlFor","for"],["httpEquiv","http-equiv"],["crossOrigin","crossorigin"],["accentHeight","accent-height"],["alignmentBaseline","alignment-baseline"],["arabicForm","arabic-form"],["baselineShift","baseline-shift"],["capHeight","cap-height"],["clipPath","clip-path"],["clipRule","clip-rule"],["colorInterpolation","color-interpolation"],["colorInterpolationFilters","color-interpolation-filters"],["colorProfile","color-profile"],["colorRendering","color-rendering"],["dominantBaseline","dominant-baseline"],["enableBackground","enable-background"],["fillOpacity","fill-opacity"],["fillRule","fill-rule"],["floodColor","flood-color"],["floodOpacity","flood-opacity"],["fontFamily","font-family"],["fontSize","font-size"],["fontSizeAdjust","font-size-adjust"],["fontStretch","font-stretch"],["fontStyle","font-style"],["fontVariant","font-variant"],["fontWeight","font-weight"],["glyphName","glyph-name"],["glyphOrientationHorizontal","glyph-orientation-horizontal"],["glyphOrientationVertical","glyph-orientation-vertical"],["horizAdvX","horiz-adv-x"],["horizOriginX","horiz-origin-x"],["imageRendering","image-rendering"],["letterSpacing","letter-spacing"],["lightingColor","lighting-color"],["markerEnd","marker-end"],["markerMid","marker-mid"],["markerStart","marker-start"],["overlinePosition","overline-position"],["overlineThickness","overline-thickness"],["paintOrder","paint-order"],["panose-1","panose-1"],["pointerEvents","pointer-events"],["renderingIntent","rendering-intent"],["shapeRendering","shape-rendering"],["stopColor","stop-color"],["stopOpacity","stop-opacity"],["strikethroughPosition","strikethrough-position"],["strikethroughThickness","strikethrough-thickness"],["strokeDasharray","stroke-dasharray"],["strokeDashoffset","stroke-dashoffset"],["strokeLinecap","stroke-linecap"],["strokeLinejoin","stroke-linejoin"],["strokeMiterlimit","stroke-miterlimit"],["strokeOpacity","stroke-opacity"],["strokeWidth","stroke-width"],["textAnchor","text-anchor"],["textDecoration","text-decoration"],["textRendering","text-rendering"],["transformOrigin","transform-origin"],["underlinePosition","underline-position"],["underlineThickness","underline-thickness"],["unicodeBidi","unicode-bidi"],["unicodeRange","unicode-range"],["unitsPerEm","units-per-em"],["vAlphabetic","v-alphabetic"],["vHanging","v-hanging"],["vIdeographic","v-ideographic"],["vMathematical","v-mathematical"],["vectorEffect","vector-effect"],["vertAdvY","vert-adv-y"],["vertOriginX","vert-origin-x"],["vertOriginY","vert-origin-y"],["wordSpacing","word-spacing"],["writingMode","writing-mode"],["xmlnsXlink","xmlns:xlink"],["xHeight","x-height"]]),cb=/^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;function Bl(e){return cb.test(""+e)?"javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')":e}function Ui(){}var Kh=null;function kf(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var Fs=null,Js=null;function Zm(e){var t=dr(e);if(t&&(e=t.stateNode)){var n=e[_n]||null;t:switch(e=t.stateNode,t.type){case"input":if(Jh(e,n.value,n.defaultValue,n.defaultValue,n.checked,n.defaultChecked,n.type,n.name),t=n.name,n.type==="radio"&&t!=null){for(n=e;n.parentNode;)n=n.parentNode;for(n=n.querySelectorAll('input[name="'+kn(""+t)+'"][type="radio"]'),t=0;t<n.length;t++){var i=n[t];if(i!==e&&i.form===e.form){var a=i[_n]||null;if(!a)throw Error(W(90));Jh(i,a.value,a.defaultValue,a.defaultValue,a.checked,a.defaultChecked,a.type,a.name)}}for(t=0;t<n.length;t++)i=n[t],i.form===e.form&&R_(i)}break t;case"textarea":L_(e,n.value,n.defaultValue);break t;case"select":t=n.value,t!=null&&js(e,!!n.multiple,t,!1)}}}var fh=!1;function N_(e,t,n){if(fh)return e(t,n);fh=!0;try{var i=e(t);return i}finally{if(fh=!1,(Fs!==null||Js!==null)&&(Fc(),Fs&&(t=Fs,e=Js,Js=Fs=null,Zm(t),e)))for(t=0;t<e.length;t++)Zm(e[t])}}function wo(e,t){var n=e.stateNode;if(n===null)return null;var i=n[_n]||null;if(i===null)return null;n=i[t];t:switch(t){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(i=!i.disabled)||(e=e.type,i=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!i;break t;default:e=!1}if(e)return null;if(n&&typeof n!="function")throw Error(W(231,t,typeof n));return n}var Ii=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),$h=!1;if(Ii)try{Ds={},Object.defineProperty(Ds,"passive",{get:function(){$h=!0}}),window.addEventListener("test",Ds,Ds),window.removeEventListener("test",Ds,Ds)}catch{$h=!1}var Ds,ha=null,Wf=null,Fl=null;function O_(){if(Fl)return Fl;var e,t=Wf,n=t.length,i,a="value"in ha?ha.value:ha.textContent,s=a.length;for(e=0;e<n&&t[e]===a[e];e++);var r=n-e;for(i=1;i<=r&&t[n-i]===a[s-i];i++);return Fl=a.slice(e,1<i?1-i:void 0)}function Hl(e){var t=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&t===13&&(e=13)):e=t,e===10&&(e=13),32<=e||e===13?e:0}function El(){return!0}function jm(){return!1}function vn(e){function t(n,i,a,s,r){this._reactName=n,this._targetInst=a,this.type=i,this.nativeEvent=s,this.target=r,this.currentTarget=null;for(var o in e)e.hasOwnProperty(o)&&(n=e[o],this[o]=n?n(s):s[o]);return this.isDefaultPrevented=(s.defaultPrevented!=null?s.defaultPrevented:s.returnValue===!1)?El:jm,this.isPropagationStopped=jm,this}return me(t.prototype,{preventDefault:function(){this.defaultPrevented=!0;var n=this.nativeEvent;n&&(n.preventDefault?n.preventDefault():typeof n.returnValue!="unknown"&&(n.returnValue=!1),this.isDefaultPrevented=El)},stopPropagation:function(){var n=this.nativeEvent;n&&(n.stopPropagation?n.stopPropagation():typeof n.cancelBubble!="unknown"&&(n.cancelBubble=!0),this.isPropagationStopped=El)},persist:function(){},isPersistent:El}),t}var rs={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Rc=vn(rs),Xo=me({},rs,{view:0,detail:0}),ub=vn(Xo),dh,ph,eo,Cc=me({},Xo,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Xf,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return"movementX"in e?e.movementX:(e!==eo&&(eo&&e.type==="mousemove"?(dh=e.screenX-eo.screenX,ph=e.screenY-eo.screenY):ph=dh=0,eo=e),dh)},movementY:function(e){return"movementY"in e?e.movementY:ph}}),Jm=vn(Cc),hb=me({},Cc,{dataTransfer:0}),fb=vn(hb),db=me({},Xo,{relatedTarget:0}),mh=vn(db),pb=me({},rs,{animationName:0,elapsedTime:0,pseudoElement:0}),mb=vn(pb),gb=me({},rs,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),_b=vn(gb),vb=me({},rs,{data:0}),Qm=vn(vb),yb={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},xb={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},Sb={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function bb(e){var t=this.nativeEvent;return t.getModifierState?t.getModifierState(e):(e=Sb[e])?!!t[e]:!1}function Xf(){return bb}var Mb=me({},Xo,{key:function(e){if(e.key){var t=yb[e.key]||e.key;if(t!=="Unidentified")return t}return e.type==="keypress"?(e=Hl(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?xb[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Xf,charCode:function(e){return e.type==="keypress"?Hl(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?Hl(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),Eb=vn(Mb),Tb=me({},Cc,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),Km=vn(Tb),Ab=me({},Xo,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Xf}),wb=vn(Ab),Rb=me({},rs,{propertyName:0,elapsedTime:0,pseudoElement:0}),Cb=vn(Rb),Lb=me({},Cc,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),Db=vn(Lb),Ub=me({},rs,{newState:0,oldState:0}),Nb=vn(Ub),Ob=[9,13,27,32],qf=Ii&&"CompositionEvent"in window,fo=null;Ii&&"documentMode"in document&&(fo=document.documentMode);var Pb=Ii&&"TextEvent"in window&&!fo,P_=Ii&&(!qf||fo&&8<fo&&11>=fo),$m=" ",tg=!1;function z_(e,t){switch(e){case"keyup":return Ob.indexOf(t.keyCode)!==-1;case"keydown":return t.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function I_(e){return e=e.detail,typeof e=="object"&&"data"in e?e.data:null}var Hs=!1;function zb(e,t){switch(e){case"compositionend":return I_(t);case"keypress":return t.which!==32?null:(tg=!0,$m);case"textInput":return e=t.data,e===$m&&tg?null:e;default:return null}}function Ib(e,t){if(Hs)return e==="compositionend"||!qf&&z_(e,t)?(e=O_(),Fl=Wf=ha=null,Hs=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(t.ctrlKey||t.altKey||t.metaKey)||t.ctrlKey&&t.altKey){if(t.char&&1<t.char.length)return t.char;if(t.which)return String.fromCharCode(t.which)}return null;case"compositionend":return P_&&t.locale!=="ko"?null:t.data;default:return null}}var Bb={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function eg(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t==="input"?!!Bb[e.type]:t==="textarea"}function B_(e,t,n,i){Fs?Js?Js.push(i):Js=[i]:Fs=i,t=xc(t,"onChange"),0<t.length&&(n=new Rc("onChange","change",null,n,i),e.push({event:n,listeners:t}))}var po=null,Ro=null;function Fb(e){Nv(e,0)}function Lc(e){var t=co(e);if(R_(t))return e}function ng(e,t){if(e==="change")return t}var F_=!1;Ii&&(Ii?(Al="oninput"in document,Al||(gh=document.createElement("div"),gh.setAttribute("oninput","return;"),Al=typeof gh.oninput=="function"),Tl=Al):Tl=!1,F_=Tl&&(!document.documentMode||9<document.documentMode));var Tl,Al,gh;function ig(){po&&(po.detachEvent("onpropertychange",H_),Ro=po=null)}function H_(e){if(e.propertyName==="value"&&Lc(Ro)){var t=[];B_(t,Ro,e,kf(e)),N_(Fb,t)}}function Hb(e,t,n){e==="focusin"?(ig(),po=t,Ro=n,po.attachEvent("onpropertychange",H_)):e==="focusout"&&ig()}function Vb(e){if(e==="selectionchange"||e==="keyup"||e==="keydown")return Lc(Ro)}function Gb(e,t){if(e==="click")return Lc(t)}function kb(e,t){if(e==="input"||e==="change")return Lc(t)}function Wb(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var Dn=typeof Object.is=="function"?Object.is:Wb;function Co(e,t){if(Dn(e,t))return!0;if(typeof e!="object"||e===null||typeof t!="object"||t===null)return!1;var n=Object.keys(e),i=Object.keys(t);if(n.length!==i.length)return!1;for(i=0;i<n.length;i++){var a=n[i];if(!Yh.call(t,a)||!Dn(e[a],t[a]))return!1}return!0}function ag(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function sg(e,t){var n=ag(e);e=0;for(var i;n;){if(n.nodeType===3){if(i=e+n.textContent.length,e<=t&&i>=t)return{node:n,offset:t-e};e=i}t:{for(;n;){if(n.nextSibling){n=n.nextSibling;break t}n=n.parentNode}n=void 0}n=ag(n)}}function V_(e,t){return e&&t?e===t?!0:e&&e.nodeType===3?!1:t&&t.nodeType===3?V_(e,t.parentNode):"contains"in e?e.contains(t):e.compareDocumentPosition?!!(e.compareDocumentPosition(t)&16):!1:!1}function G_(e){e=e!=null&&e.ownerDocument!=null&&e.ownerDocument.defaultView!=null?e.ownerDocument.defaultView:window;for(var t=nc(e.document);t instanceof e.HTMLIFrameElement;){try{var n=typeof t.contentWindow.location.href=="string"}catch{n=!1}if(n)e=t.contentWindow;else break;t=nc(e.document)}return t}function Yf(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t&&(t==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||t==="textarea"||e.contentEditable==="true")}var Xb=Ii&&"documentMode"in document&&11>=document.documentMode,Vs=null,tf=null,mo=null,ef=!1;function rg(e,t,n){var i=n.window===n?n.document:n.nodeType===9?n:n.ownerDocument;ef||Vs==null||Vs!==nc(i)||(i=Vs,"selectionStart"in i&&Yf(i)?i={start:i.selectionStart,end:i.selectionEnd}:(i=(i.ownerDocument&&i.ownerDocument.defaultView||window).getSelection(),i={anchorNode:i.anchorNode,anchorOffset:i.anchorOffset,focusNode:i.focusNode,focusOffset:i.focusOffset}),mo&&Co(mo,i)||(mo=i,i=xc(tf,"onSelect"),0<i.length&&(t=new Rc("onSelect","select",null,t,n),e.push({event:t,listeners:i}),t.target=Vs)))}function Wa(e,t){var n={};return n[e.toLowerCase()]=t.toLowerCase(),n["Webkit"+e]="webkit"+t,n["Moz"+e]="moz"+t,n}var Gs={animationend:Wa("Animation","AnimationEnd"),animationiteration:Wa("Animation","AnimationIteration"),animationstart:Wa("Animation","AnimationStart"),transitionrun:Wa("Transition","TransitionRun"),transitionstart:Wa("Transition","TransitionStart"),transitioncancel:Wa("Transition","TransitionCancel"),transitionend:Wa("Transition","TransitionEnd")},_h={},k_={};Ii&&(k_=document.createElement("div").style,"AnimationEvent"in window||(delete Gs.animationend.animation,delete Gs.animationiteration.animation,delete Gs.animationstart.animation),"TransitionEvent"in window||delete Gs.transitionend.transition);function os(e){if(_h[e])return _h[e];if(!Gs[e])return e;var t=Gs[e],n;for(n in t)if(t.hasOwnProperty(n)&&n in k_)return _h[e]=t[n];return e}var W_=os("animationend"),X_=os("animationiteration"),q_=os("animationstart"),qb=os("transitionrun"),Yb=os("transitionstart"),Zb=os("transitioncancel"),Y_=os("transitionend"),Z_=new Map,nf="abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");nf.push("scrollEnd");function ei(e,t){Z_.set(e,t),ss(t,[e])}var ic=typeof reportError=="function"?reportError:function(e){if(typeof window=="object"&&typeof window.ErrorEvent=="function"){var t=new window.ErrorEvent("error",{bubbles:!0,cancelable:!0,message:typeof e=="object"&&e!==null&&typeof e.message=="string"?String(e.message):String(e),error:e});if(!window.dispatchEvent(t))return}else if(typeof process=="object"&&typeof process.emit=="function"){process.emit("uncaughtException",e);return}console.error(e)},Fn=[],ks=0,Zf=0;function Dc(){for(var e=ks,t=Zf=ks=0;t<e;){var n=Fn[t];Fn[t++]=null;var i=Fn[t];Fn[t++]=null;var a=Fn[t];Fn[t++]=null;var s=Fn[t];if(Fn[t++]=null,i!==null&&a!==null){var r=i.pending;r===null?a.next=a:(a.next=r.next,r.next=a),i.pending=a}s!==0&&j_(n,a,s)}}function Uc(e,t,n,i){Fn[ks++]=e,Fn[ks++]=t,Fn[ks++]=n,Fn[ks++]=i,Zf|=i,e.lanes|=i,e=e.alternate,e!==null&&(e.lanes|=i)}function jf(e,t,n,i){return Uc(e,t,n,i),ac(e)}function ls(e,t){return Uc(e,null,null,t),ac(e)}function j_(e,t,n){e.lanes|=n;var i=e.alternate;i!==null&&(i.lanes|=n);for(var a=!1,s=e.return;s!==null;)s.childLanes|=n,i=s.alternate,i!==null&&(i.childLanes|=n),s.tag===22&&(e=s.stateNode,e===null||e._visibility&1||(a=!0)),e=s,s=s.return;return e.tag===3?(s=e.stateNode,a&&t!==null&&(a=31-Cn(n),e=s.hiddenUpdates,i=e[a],i===null?e[a]=[t]:i.push(t),t.lane=n|536870912),s):null}function ac(e){if(50<Eo)throw Eo=0,Ef=null,Error(W(185));for(var t=e.return;t!==null;)e=t,t=e.return;return e.tag===3?e.stateNode:null}var Ws={};function jb(e,t,n,i){this.tag=e,this.key=n,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.refCleanup=this.ref=null,this.pendingProps=t,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=i,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Tn(e,t,n,i){return new jb(e,t,n,i)}function Jf(e){return e=e.prototype,!(!e||!e.isReactComponent)}function Oi(e,t){var n=e.alternate;return n===null?(n=Tn(e.tag,t,e.key,e.mode),n.elementType=e.elementType,n.type=e.type,n.stateNode=e.stateNode,n.alternate=e,e.alternate=n):(n.pendingProps=t,n.type=e.type,n.flags=0,n.subtreeFlags=0,n.deletions=null),n.flags=e.flags&65011712,n.childLanes=e.childLanes,n.lanes=e.lanes,n.child=e.child,n.memoizedProps=e.memoizedProps,n.memoizedState=e.memoizedState,n.updateQueue=e.updateQueue,t=e.dependencies,n.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext},n.sibling=e.sibling,n.index=e.index,n.ref=e.ref,n.refCleanup=e.refCleanup,n}function J_(e,t){e.flags&=65011714;var n=e.alternate;return n===null?(e.childLanes=0,e.lanes=t,e.child=null,e.subtreeFlags=0,e.memoizedProps=null,e.memoizedState=null,e.updateQueue=null,e.dependencies=null,e.stateNode=null):(e.childLanes=n.childLanes,e.lanes=n.lanes,e.child=n.child,e.subtreeFlags=0,e.deletions=null,e.memoizedProps=n.memoizedProps,e.memoizedState=n.memoizedState,e.updateQueue=n.updateQueue,e.type=n.type,t=n.dependencies,e.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext}),e}function Vl(e,t,n,i,a,s){var r=0;if(i=e,typeof e=="function")Jf(e)&&(r=1);else if(typeof e=="string")r=KM(e,n,gi.current)?26:e==="html"||e==="head"||e==="body"?27:5;else t:switch(e){case kh:return e=Tn(31,n,t,a),e.elementType=kh,e.lanes=s,e;case zs:return Ja(n.children,a,s,t);case m_:r=8,a|=24;break;case Hh:return e=Tn(12,n,t,a|2),e.elementType=Hh,e.lanes=s,e;case Vh:return e=Tn(13,n,t,a),e.elementType=Vh,e.lanes=s,e;case Gh:return e=Tn(19,n,t,a),e.elementType=Gh,e.lanes=s,e;default:if(typeof e=="object"&&e!==null)switch(e.$$typeof){case Di:r=10;break t;case g_:r=9;break t;case zf:r=11;break t;case If:r=14;break t;case aa:r=16,i=null;break t}r=29,n=Error(W(130,e===null?"null":typeof e,"")),i=null}return t=Tn(r,n,t,a),t.elementType=e,t.type=i,t.lanes=s,t}function Ja(e,t,n,i){return e=Tn(7,e,i,t),e.lanes=n,e}function vh(e,t,n){return e=Tn(6,e,null,t),e.lanes=n,e}function Q_(e){var t=Tn(18,null,null,0);return t.stateNode=e,t}function yh(e,t,n){return t=Tn(4,e.children!==null?e.children:[],e.key,t),t.lanes=n,t.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},t}var og=new WeakMap;function Wn(e,t){if(typeof e=="object"&&e!==null){var n=og.get(e);return n!==void 0?n:(t={value:e,source:t,stack:Gm(t)},og.set(e,t),t)}return{value:e,source:t,stack:Gm(t)}}var Xs=[],qs=0,sc=null,Lo=0,Vn=[],Gn=0,Ea=null,di=1,pi="";function Ci(e,t){Xs[qs++]=Lo,Xs[qs++]=sc,sc=e,Lo=t}function K_(e,t,n){Vn[Gn++]=di,Vn[Gn++]=pi,Vn[Gn++]=Ea,Ea=e;var i=di;e=pi;var a=32-Cn(i)-1;i&=~(1<<a),n+=1;var s=32-Cn(t)+a;if(30<s){var r=a-a%5;s=(i&(1<<r)-1).toString(32),i>>=r,a-=r,di=1<<32-Cn(t)+a|n<<a|i,pi=s+e}else di=1<<s|n<<a|i,pi=e}function Qf(e){e.return!==null&&(Ci(e,1),K_(e,1,0))}function Kf(e){for(;e===sc;)sc=Xs[--qs],Xs[qs]=null,Lo=Xs[--qs],Xs[qs]=null;for(;e===Ea;)Ea=Vn[--Gn],Vn[Gn]=null,pi=Vn[--Gn],Vn[Gn]=null,di=Vn[--Gn],Vn[Gn]=null}function $_(e,t){Vn[Gn++]=di,Vn[Gn++]=pi,Vn[Gn++]=Ea,di=t.id,pi=t.overflow,Ea=e}var Ze=null,pe=null,Zt=!1,ga=null,Xn=!1,af=Error(W(519));function Ta(e){var t=Error(W(418,1<arguments.length&&arguments[1]!==void 0&&arguments[1]?"text":"HTML",""));throw Do(Wn(t,e)),af}function lg(e){var t=e.stateNode,n=e.type,i=e.memoizedProps;switch(t[Ye]=e,t[_n]=i,n){case"dialog":Wt("cancel",t),Wt("close",t);break;case"iframe":case"object":case"embed":Wt("load",t);break;case"video":case"audio":for(n=0;n<Po.length;n++)Wt(Po[n],t);break;case"source":Wt("error",t);break;case"img":case"image":case"link":Wt("error",t),Wt("load",t);break;case"details":Wt("toggle",t);break;case"input":Wt("invalid",t),C_(t,i.value,i.defaultValue,i.checked,i.defaultChecked,i.type,i.name,!0);break;case"select":Wt("invalid",t);break;case"textarea":Wt("invalid",t),D_(t,i.value,i.defaultValue,i.children)}n=i.children,typeof n!="string"&&typeof n!="number"&&typeof n!="bigint"||t.textContent===""+n||i.suppressHydrationWarning===!0||Pv(t.textContent,n)?(i.popover!=null&&(Wt("beforetoggle",t),Wt("toggle",t)),i.onScroll!=null&&Wt("scroll",t),i.onScrollEnd!=null&&Wt("scrollend",t),i.onClick!=null&&(t.onclick=Ui),t=!0):t=!1,t||Ta(e,!0)}function cg(e){for(Ze=e.return;Ze;)switch(Ze.tag){case 5:case 31:case 13:Xn=!1;return;case 27:case 3:Xn=!0;return;default:Ze=Ze.return}}function Us(e){if(e!==Ze)return!1;if(!Zt)return cg(e),Zt=!0,!1;var t=e.tag,n;if((n=t!==3&&t!==27)&&((n=t===5)&&(n=e.type,n=!(n!=="form"&&n!=="button")||Cf(e.type,e.memoizedProps)),n=!n),n&&pe&&Ta(e),cg(e),t===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(W(317));pe=Qg(e)}else if(t===31){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(W(317));pe=Qg(e)}else t===27?(t=pe,Ca(e.type)?(e=Nf,Nf=null,pe=e):pe=t):pe=Ze?Yn(e.stateNode.nextSibling):null;return!0}function ts(){pe=Ze=null,Zt=!1}function xh(){var e=ga;return e!==null&&(mn===null?mn=e:mn.push.apply(mn,e),ga=null),e}function Do(e){ga===null?ga=[e]:ga.push(e)}var sf=_i(null),cs=null,Ni=null;function ra(e,t,n){ue(sf,t._currentValue),t._currentValue=n}function Pi(e){e._currentValue=sf.current,We(sf)}function rf(e,t,n){for(;e!==null;){var i=e.alternate;if((e.childLanes&t)!==t?(e.childLanes|=t,i!==null&&(i.childLanes|=t)):i!==null&&(i.childLanes&t)!==t&&(i.childLanes|=t),e===n)break;e=e.return}}function of(e,t,n,i){var a=e.child;for(a!==null&&(a.return=e);a!==null;){var s=a.dependencies;if(s!==null){var r=a.child;s=s.firstContext;t:for(;s!==null;){var o=s;s=a;for(var l=0;l<t.length;l++)if(o.context===t[l]){s.lanes|=n,o=s.alternate,o!==null&&(o.lanes|=n),rf(s.return,n,e),i||(r=null);break t}s=o.next}}else if(a.tag===18){if(r=a.return,r===null)throw Error(W(341));r.lanes|=n,s=r.alternate,s!==null&&(s.lanes|=n),rf(r,n,e),r=null}else r=a.child;if(r!==null)r.return=a;else for(r=a;r!==null;){if(r===e){r=null;break}if(a=r.sibling,a!==null){a.return=r.return,r=a;break}r=r.return}a=r}}function pr(e,t,n,i){e=null;for(var a=t,s=!1;a!==null;){if(!s){if((a.flags&524288)!==0)s=!0;else if((a.flags&262144)!==0)break}if(a.tag===10){var r=a.alternate;if(r===null)throw Error(W(387));if(r=r.memoizedProps,r!==null){var o=a.type;Dn(a.pendingProps.value,r.value)||(e!==null?e.push(o):e=[o])}}else if(a===Kl.current){if(r=a.alternate,r===null)throw Error(W(387));r.memoizedState.memoizedState!==a.memoizedState.memoizedState&&(e!==null?e.push(Io):e=[Io])}a=a.return}e!==null&&of(t,e,n,i),t.flags|=262144}function rc(e){for(e=e.firstContext;e!==null;){if(!Dn(e.context._currentValue,e.memoizedValue))return!0;e=e.next}return!1}function es(e){cs=e,Ni=null,e=e.dependencies,e!==null&&(e.firstContext=null)}function je(e){return t0(cs,e)}function wl(e,t){return cs===null&&es(e),t0(e,t)}function t0(e,t){var n=t._currentValue;if(t={context:t,memoizedValue:n,next:null},Ni===null){if(e===null)throw Error(W(308));Ni=t,e.dependencies={lanes:0,firstContext:t},e.flags|=524288}else Ni=Ni.next=t;return n}var Jb=typeof AbortController<"u"?AbortController:function(){var e=[],t=this.signal={aborted:!1,addEventListener:function(n,i){e.push(i)}};this.abort=function(){t.aborted=!0,e.forEach(function(n){return n()})}},Qb=ze.unstable_scheduleCallback,Kb=ze.unstable_NormalPriority,Ue={$$typeof:Di,Consumer:null,Provider:null,_currentValue:null,_currentValue2:null,_threadCount:0};function $f(){return{controller:new Jb,data:new Map,refCount:0}}function qo(e){e.refCount--,e.refCount===0&&Qb(Kb,function(){e.controller.abort()})}var go=null,lf=0,ar=0,Qs=null;function $b(e,t){if(go===null){var n=go=[];lf=0,ar=Ed(),Qs={status:"pending",value:void 0,then:function(i){n.push(i)}}}return lf++,t.then(ug,ug),t}function ug(){if(--lf===0&&go!==null){Qs!==null&&(Qs.status="fulfilled");var e=go;go=null,ar=0,Qs=null;for(var t=0;t<e.length;t++)(0,e[t])()}}function tM(e,t){var n=[],i={status:"pending",value:null,reason:null,then:function(a){n.push(a)}};return e.then(function(){i.status="fulfilled",i.value=t;for(var a=0;a<n.length;a++)(0,n[a])(t)},function(a){for(i.status="rejected",i.reason=a,a=0;a<n.length;a++)(0,n[a])(void 0)}),i}var hg=Et.S;Et.S=function(e,t){pv=wn(),typeof t=="object"&&t!==null&&typeof t.then=="function"&&$b(e,t),hg!==null&&hg(e,t)};var Qa=_i(null);function td(){var e=Qa.current;return e!==null?e:le.pooledCache}function Gl(e,t){t===null?ue(Qa,Qa.current):ue(Qa,t.pool)}function e0(){var e=td();return e===null?null:{parent:Ue._currentValue,pool:e}}var mr=Error(W(460)),ed=Error(W(474)),Nc=Error(W(542)),oc={then:function(){}};function fg(e){return e=e.status,e==="fulfilled"||e==="rejected"}function n0(e,t,n){switch(n=e[n],n===void 0?e.push(t):n!==t&&(t.then(Ui,Ui),t=n),t.status){case"fulfilled":return t.value;case"rejected":throw e=t.reason,pg(e),e;default:if(typeof t.status=="string")t.then(Ui,Ui);else{if(e=le,e!==null&&100<e.shellSuspendCounter)throw Error(W(482));e=t,e.status="pending",e.then(function(i){if(t.status==="pending"){var a=t;a.status="fulfilled",a.value=i}},function(i){if(t.status==="pending"){var a=t;a.status="rejected",a.reason=i}})}switch(t.status){case"fulfilled":return t.value;case"rejected":throw e=t.reason,pg(e),e}throw Ka=t,mr}}function Ya(e){try{var t=e._init;return t(e._payload)}catch(n){throw n!==null&&typeof n=="object"&&typeof n.then=="function"?(Ka=n,mr):n}}var Ka=null;function dg(){if(Ka===null)throw Error(W(459));var e=Ka;return Ka=null,e}function pg(e){if(e===mr||e===Nc)throw Error(W(483))}var Ks=null,Uo=0;function Rl(e){var t=Uo;return Uo+=1,Ks===null&&(Ks=[]),n0(Ks,e,t)}function no(e,t){t=t.props.ref,e.ref=t!==void 0?t:null}function Cl(e,t){throw t.$$typeof===HS?Error(W(525)):(e=Object.prototype.toString.call(t),Error(W(31,e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e)))}function i0(e){function t(u,_){if(e){var g=u.deletions;g===null?(u.deletions=[_],u.flags|=16):g.push(_)}}function n(u,_){if(!e)return null;for(;_!==null;)t(u,_),_=_.sibling;return null}function i(u){for(var _=new Map;u!==null;)u.key!==null?_.set(u.key,u):_.set(u.index,u),u=u.sibling;return _}function a(u,_){return u=Oi(u,_),u.index=0,u.sibling=null,u}function s(u,_,g){return u.index=g,e?(g=u.alternate,g!==null?(g=g.index,g<_?(u.flags|=67108866,_):g):(u.flags|=67108866,_)):(u.flags|=1048576,_)}function r(u){return e&&u.alternate===null&&(u.flags|=67108866),u}function o(u,_,g,b){return _===null||_.tag!==6?(_=vh(g,u.mode,b),_.return=u,_):(_=a(_,g),_.return=u,_)}function l(u,_,g,b){var T=g.type;return T===zs?h(u,_,g.props.children,b,g.key):_!==null&&(_.elementType===T||typeof T=="object"&&T!==null&&T.$$typeof===aa&&Ya(T)===_.type)?(_=a(_,g.props),no(_,g),_.return=u,_):(_=Vl(g.type,g.key,g.props,null,u.mode,b),no(_,g),_.return=u,_)}function c(u,_,g,b){return _===null||_.tag!==4||_.stateNode.containerInfo!==g.containerInfo||_.stateNode.implementation!==g.implementation?(_=yh(g,u.mode,b),_.return=u,_):(_=a(_,g.children||[]),_.return=u,_)}function h(u,_,g,b,T){return _===null||_.tag!==7?(_=Ja(g,u.mode,b,T),_.return=u,_):(_=a(_,g),_.return=u,_)}function d(u,_,g){if(typeof _=="string"&&_!==""||typeof _=="number"||typeof _=="bigint")return _=vh(""+_,u.mode,g),_.return=u,_;if(typeof _=="object"&&_!==null){switch(_.$$typeof){case yl:return g=Vl(_.type,_.key,_.props,null,u.mode,g),no(g,_),g.return=u,g;case oo:return _=yh(_,u.mode,g),_.return=u,_;case aa:return _=Ya(_),d(u,_,g)}if(lo(_)||to(_))return _=Ja(_,u.mode,g,null),_.return=u,_;if(typeof _.then=="function")return d(u,Rl(_),g);if(_.$$typeof===Di)return d(u,wl(u,_),g);Cl(u,_)}return null}function f(u,_,g,b){var T=_!==null?_.key:null;if(typeof g=="string"&&g!==""||typeof g=="number"||typeof g=="bigint")return T!==null?null:o(u,_,""+g,b);if(typeof g=="object"&&g!==null){switch(g.$$typeof){case yl:return g.key===T?l(u,_,g,b):null;case oo:return g.key===T?c(u,_,g,b):null;case aa:return g=Ya(g),f(u,_,g,b)}if(lo(g)||to(g))return T!==null?null:h(u,_,g,b,null);if(typeof g.then=="function")return f(u,_,Rl(g),b);if(g.$$typeof===Di)return f(u,_,wl(u,g),b);Cl(u,g)}return null}function p(u,_,g,b,T){if(typeof b=="string"&&b!==""||typeof b=="number"||typeof b=="bigint")return u=u.get(g)||null,o(_,u,""+b,T);if(typeof b=="object"&&b!==null){switch(b.$$typeof){case yl:return u=u.get(b.key===null?g:b.key)||null,l(_,u,b,T);case oo:return u=u.get(b.key===null?g:b.key)||null,c(_,u,b,T);case aa:return b=Ya(b),p(u,_,g,b,T)}if(lo(b)||to(b))return u=u.get(g)||null,h(_,u,b,T,null);if(typeof b.then=="function")return p(u,_,g,Rl(b),T);if(b.$$typeof===Di)return p(u,_,g,wl(_,b),T);Cl(_,b)}return null}function v(u,_,g,b){for(var T=null,R=null,w=_,U=_=0,x=null;w!==null&&U<g.length;U++){w.index>U?(x=w,w=null):x=w.sibling;var A=f(u,w,g[U],b);if(A===null){w===null&&(w=x);break}e&&w&&A.alternate===null&&t(u,w),_=s(A,_,U),R===null?T=A:R.sibling=A,R=A,w=x}if(U===g.length)return n(u,w),Zt&&Ci(u,U),T;if(w===null){for(;U<g.length;U++)w=d(u,g[U],b),w!==null&&(_=s(w,_,U),R===null?T=w:R.sibling=w,R=w);return Zt&&Ci(u,U),T}for(w=i(w);U<g.length;U++)x=p(w,u,U,g[U],b),x!==null&&(e&&x.alternate!==null&&w.delete(x.key===null?U:x.key),_=s(x,_,U),R===null?T=x:R.sibling=x,R=x);return e&&w.forEach(function(F){return t(u,F)}),Zt&&Ci(u,U),T}function y(u,_,g,b){if(g==null)throw Error(W(151));for(var T=null,R=null,w=_,U=_=0,x=null,A=g.next();w!==null&&!A.done;U++,A=g.next()){w.index>U?(x=w,w=null):x=w.sibling;var F=f(u,w,A.value,b);if(F===null){w===null&&(w=x);break}e&&w&&F.alternate===null&&t(u,w),_=s(F,_,U),R===null?T=F:R.sibling=F,R=F,w=x}if(A.done)return n(u,w),Zt&&Ci(u,U),T;if(w===null){for(;!A.done;U++,A=g.next())A=d(u,A.value,b),A!==null&&(_=s(A,_,U),R===null?T=A:R.sibling=A,R=A);return Zt&&Ci(u,U),T}for(w=i(w);!A.done;U++,A=g.next())A=p(w,u,U,A.value,b),A!==null&&(e&&A.alternate!==null&&w.delete(A.key===null?U:A.key),_=s(A,_,U),R===null?T=A:R.sibling=A,R=A);return e&&w.forEach(function(Y){return t(u,Y)}),Zt&&Ci(u,U),T}function m(u,_,g,b){if(typeof g=="object"&&g!==null&&g.type===zs&&g.key===null&&(g=g.props.children),typeof g=="object"&&g!==null){switch(g.$$typeof){case yl:t:{for(var T=g.key;_!==null;){if(_.key===T){if(T=g.type,T===zs){if(_.tag===7){n(u,_.sibling),b=a(_,g.props.children),b.return=u,u=b;break t}}else if(_.elementType===T||typeof T=="object"&&T!==null&&T.$$typeof===aa&&Ya(T)===_.type){n(u,_.sibling),b=a(_,g.props),no(b,g),b.return=u,u=b;break t}n(u,_);break}else t(u,_);_=_.sibling}g.type===zs?(b=Ja(g.props.children,u.mode,b,g.key),b.return=u,u=b):(b=Vl(g.type,g.key,g.props,null,u.mode,b),no(b,g),b.return=u,u=b)}return r(u);case oo:t:{for(T=g.key;_!==null;){if(_.key===T)if(_.tag===4&&_.stateNode.containerInfo===g.containerInfo&&_.stateNode.implementation===g.implementation){n(u,_.sibling),b=a(_,g.children||[]),b.return=u,u=b;break t}else{n(u,_);break}else t(u,_);_=_.sibling}b=yh(g,u.mode,b),b.return=u,u=b}return r(u);case aa:return g=Ya(g),m(u,_,g,b)}if(lo(g))return v(u,_,g,b);if(to(g)){if(T=to(g),typeof T!="function")throw Error(W(150));return g=T.call(g),y(u,_,g,b)}if(typeof g.then=="function")return m(u,_,Rl(g),b);if(g.$$typeof===Di)return m(u,_,wl(u,g),b);Cl(u,g)}return typeof g=="string"&&g!==""||typeof g=="number"||typeof g=="bigint"?(g=""+g,_!==null&&_.tag===6?(n(u,_.sibling),b=a(_,g),b.return=u,u=b):(n(u,_),b=vh(g,u.mode,b),b.return=u,u=b),r(u)):n(u,_)}return function(u,_,g,b){try{Uo=0;var T=m(u,_,g,b);return Ks=null,T}catch(w){if(w===mr||w===Nc)throw w;var R=Tn(29,w,null,u.mode);return R.lanes=b,R.return=u,R}}}var ns=i0(!0),a0=i0(!1),sa=!1;function nd(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,lanes:0,hiddenCallbacks:null},callbacks:null}}function cf(e,t){e=e.updateQueue,t.updateQueue===e&&(t.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,callbacks:null})}function _a(e){return{lane:e,tag:0,payload:null,callback:null,next:null}}function va(e,t,n){var i=e.updateQueue;if(i===null)return null;if(i=i.shared,(Kt&2)!==0){var a=i.pending;return a===null?t.next=t:(t.next=a.next,a.next=t),i.pending=t,t=ac(e),j_(e,null,n),t}return Uc(e,i,t,n),ac(e)}function _o(e,t,n){if(t=t.updateQueue,t!==null&&(t=t.shared,(n&4194048)!==0)){var i=t.lanes;i&=e.pendingLanes,n|=i,t.lanes=n,b_(e,n)}}function Sh(e,t){var n=e.updateQueue,i=e.alternate;if(i!==null&&(i=i.updateQueue,n===i)){var a=null,s=null;if(n=n.firstBaseUpdate,n!==null){do{var r={lane:n.lane,tag:n.tag,payload:n.payload,callback:null,next:null};s===null?a=s=r:s=s.next=r,n=n.next}while(n!==null);s===null?a=s=t:s=s.next=t}else a=s=t;n={baseState:i.baseState,firstBaseUpdate:a,lastBaseUpdate:s,shared:i.shared,callbacks:i.callbacks},e.updateQueue=n;return}e=n.lastBaseUpdate,e===null?n.firstBaseUpdate=t:e.next=t,n.lastBaseUpdate=t}var uf=!1;function vo(){if(uf){var e=Qs;if(e!==null)throw e}}function yo(e,t,n,i){uf=!1;var a=e.updateQueue;sa=!1;var s=a.firstBaseUpdate,r=a.lastBaseUpdate,o=a.shared.pending;if(o!==null){a.shared.pending=null;var l=o,c=l.next;l.next=null,r===null?s=c:r.next=c,r=l;var h=e.alternate;h!==null&&(h=h.updateQueue,o=h.lastBaseUpdate,o!==r&&(o===null?h.firstBaseUpdate=c:o.next=c,h.lastBaseUpdate=l))}if(s!==null){var d=a.baseState;r=0,h=c=l=null,o=s;do{var f=o.lane&-536870913,p=f!==o.lane;if(p?(Yt&f)===f:(i&f)===f){f!==0&&f===ar&&(uf=!0),h!==null&&(h=h.next={lane:0,tag:o.tag,payload:o.payload,callback:null,next:null});t:{var v=e,y=o;f=t;var m=n;switch(y.tag){case 1:if(v=y.payload,typeof v=="function"){d=v.call(m,d,f);break t}d=v;break t;case 3:v.flags=v.flags&-65537|128;case 0:if(v=y.payload,f=typeof v=="function"?v.call(m,d,f):v,f==null)break t;d=me({},d,f);break t;case 2:sa=!0}}f=o.callback,f!==null&&(e.flags|=64,p&&(e.flags|=8192),p=a.callbacks,p===null?a.callbacks=[f]:p.push(f))}else p={lane:f,tag:o.tag,payload:o.payload,callback:o.callback,next:null},h===null?(c=h=p,l=d):h=h.next=p,r|=f;if(o=o.next,o===null){if(o=a.shared.pending,o===null)break;p=o,o=p.next,p.next=null,a.lastBaseUpdate=p,a.shared.pending=null}}while(!0);h===null&&(l=d),a.baseState=l,a.firstBaseUpdate=c,a.lastBaseUpdate=h,s===null&&(a.shared.lanes=0),wa|=r,e.lanes=r,e.memoizedState=d}}function s0(e,t){if(typeof e!="function")throw Error(W(191,e));e.call(t)}function r0(e,t){var n=e.callbacks;if(n!==null)for(e.callbacks=null,e=0;e<n.length;e++)s0(n[e],t)}var sr=_i(null),lc=_i(0);function mg(e,t){e=Vi,ue(lc,e),ue(sr,t),Vi=e|t.baseLanes}function hf(){ue(lc,Vi),ue(sr,sr.current)}function id(){Vi=lc.current,We(sr),We(lc)}var Un=_i(null),qn=null;function oa(e){var t=e.alternate;ue(we,we.current&1),ue(Un,e),qn===null&&(t===null||sr.current!==null||t.memoizedState!==null)&&(qn=e)}function ff(e){ue(we,we.current),ue(Un,e),qn===null&&(qn=e)}function o0(e){e.tag===22?(ue(we,we.current),ue(Un,e),qn===null&&(qn=e)):la(e)}function la(){ue(we,we.current),ue(Un,Un.current)}function En(e){We(Un),qn===e&&(qn=null),We(we)}var we=_i(0);function cc(e){for(var t=e;t!==null;){if(t.tag===13){var n=t.memoizedState;if(n!==null&&(n=n.dehydrated,n===null||Df(n)||Uf(n)))return t}else if(t.tag===19&&(t.memoizedProps.revealOrder==="forwards"||t.memoizedProps.revealOrder==="backwards"||t.memoizedProps.revealOrder==="unstable_legacy-backwards"||t.memoizedProps.revealOrder==="together")){if((t.flags&128)!==0)return t}else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return null;t=t.return}t.sibling.return=t.return,t=t.sibling}return null}var Bi=0,It=null,se=null,Le=null,uc=!1,$s=!1,is=!1,hc=0,No=0,tr=null,eM=0;function Me(){throw Error(W(321))}function ad(e,t){if(t===null)return!1;for(var n=0;n<t.length&&n<e.length;n++)if(!Dn(e[n],t[n]))return!1;return!0}function sd(e,t,n,i,a,s){return Bi=s,It=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,Et.H=e===null||e.memoizedState===null?B0:gd,is=!1,s=n(i,a),is=!1,$s&&(s=c0(t,n,i,a)),l0(e),s}function l0(e){Et.H=Oo;var t=se!==null&&se.next!==null;if(Bi=0,Le=se=It=null,uc=!1,No=0,tr=null,t)throw Error(W(300));e===null||Ne||(e=e.dependencies,e!==null&&rc(e)&&(Ne=!0))}function c0(e,t,n,i){It=e;var a=0;do{if($s&&(tr=null),No=0,$s=!1,25<=a)throw Error(W(301));if(a+=1,Le=se=null,e.updateQueue!=null){var s=e.updateQueue;s.lastEffect=null,s.events=null,s.stores=null,s.memoCache!=null&&(s.memoCache.index=0)}Et.H=F0,s=t(n,i)}while($s);return s}function nM(){var e=Et.H,t=e.useState()[0];return t=typeof t.then=="function"?Yo(t):t,e=e.useState()[0],(se!==null?se.memoizedState:null)!==e&&(It.flags|=1024),t}function rd(){var e=hc!==0;return hc=0,e}function od(e,t,n){t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~n}function ld(e){if(uc){for(e=e.memoizedState;e!==null;){var t=e.queue;t!==null&&(t.pending=null),e=e.next}uc=!1}Bi=0,Le=se=It=null,$s=!1,No=hc=0,tr=null}function cn(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Le===null?It.memoizedState=Le=e:Le=Le.next=e,Le}function Re(){if(se===null){var e=It.alternate;e=e!==null?e.memoizedState:null}else e=se.next;var t=Le===null?It.memoizedState:Le.next;if(t!==null)Le=t,se=e;else{if(e===null)throw It.alternate===null?Error(W(467)):Error(W(310));se=e,e={memoizedState:se.memoizedState,baseState:se.baseState,baseQueue:se.baseQueue,queue:se.queue,next:null},Le===null?It.memoizedState=Le=e:Le=Le.next=e}return Le}function Oc(){return{lastEffect:null,events:null,stores:null,memoCache:null}}function Yo(e){var t=No;return No+=1,tr===null&&(tr=[]),e=n0(tr,e,t),t=It,(Le===null?t.memoizedState:Le.next)===null&&(t=t.alternate,Et.H=t===null||t.memoizedState===null?B0:gd),e}function Pc(e){if(e!==null&&typeof e=="object"){if(typeof e.then=="function")return Yo(e);if(e.$$typeof===Di)return je(e)}throw Error(W(438,String(e)))}function cd(e){var t=null,n=It.updateQueue;if(n!==null&&(t=n.memoCache),t==null){var i=It.alternate;i!==null&&(i=i.updateQueue,i!==null&&(i=i.memoCache,i!=null&&(t={data:i.data.map(function(a){return a.slice()}),index:0})))}if(t==null&&(t={data:[],index:0}),n===null&&(n=Oc(),It.updateQueue=n),n.memoCache=t,n=t.data[t.index],n===void 0)for(n=t.data[t.index]=Array(e),i=0;i<e;i++)n[i]=VS;return t.index++,n}function Fi(e,t){return typeof t=="function"?t(e):t}function kl(e){var t=Re();return ud(t,se,e)}function ud(e,t,n){var i=e.queue;if(i===null)throw Error(W(311));i.lastRenderedReducer=n;var a=e.baseQueue,s=i.pending;if(s!==null){if(a!==null){var r=a.next;a.next=s.next,s.next=r}t.baseQueue=a=s,i.pending=null}if(s=e.baseState,a===null)e.memoizedState=s;else{t=a.next;var o=r=null,l=null,c=t,h=!1;do{var d=c.lane&-536870913;if(d!==c.lane?(Yt&d)===d:(Bi&d)===d){var f=c.revertLane;if(f===0)l!==null&&(l=l.next={lane:0,revertLane:0,gesture:null,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null}),d===ar&&(h=!0);else if((Bi&f)===f){c=c.next,f===ar&&(h=!0);continue}else d={lane:0,revertLane:c.revertLane,gesture:null,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null},l===null?(o=l=d,r=s):l=l.next=d,It.lanes|=f,wa|=f;d=c.action,is&&n(s,d),s=c.hasEagerState?c.eagerState:n(s,d)}else f={lane:d,revertLane:c.revertLane,gesture:c.gesture,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null},l===null?(o=l=f,r=s):l=l.next=f,It.lanes|=d,wa|=d;c=c.next}while(c!==null&&c!==t);if(l===null?r=s:l.next=o,!Dn(s,e.memoizedState)&&(Ne=!0,h&&(n=Qs,n!==null)))throw n;e.memoizedState=s,e.baseState=r,e.baseQueue=l,i.lastRenderedState=s}return a===null&&(i.lanes=0),[e.memoizedState,i.dispatch]}function bh(e){var t=Re(),n=t.queue;if(n===null)throw Error(W(311));n.lastRenderedReducer=e;var i=n.dispatch,a=n.pending,s=t.memoizedState;if(a!==null){n.pending=null;var r=a=a.next;do s=e(s,r.action),r=r.next;while(r!==a);Dn(s,t.memoizedState)||(Ne=!0),t.memoizedState=s,t.baseQueue===null&&(t.baseState=s),n.lastRenderedState=s}return[s,i]}function u0(e,t,n){var i=It,a=Re(),s=Zt;if(s){if(n===void 0)throw Error(W(407));n=n()}else n=t();var r=!Dn((se||a).memoizedState,n);if(r&&(a.memoizedState=n,Ne=!0),a=a.queue,hd(d0.bind(null,i,a,e),[e]),a.getSnapshot!==t||r||Le!==null&&Le.memoizedState.tag&1){if(i.flags|=2048,rr(9,{destroy:void 0},f0.bind(null,i,a,n,t),null),le===null)throw Error(W(349));s||(Bi&127)!==0||h0(i,t,n)}return n}function h0(e,t,n){e.flags|=16384,e={getSnapshot:t,value:n},t=It.updateQueue,t===null?(t=Oc(),It.updateQueue=t,t.stores=[e]):(n=t.stores,n===null?t.stores=[e]:n.push(e))}function f0(e,t,n,i){t.value=n,t.getSnapshot=i,p0(t)&&m0(e)}function d0(e,t,n){return n(function(){p0(t)&&m0(e)})}function p0(e){var t=e.getSnapshot;e=e.value;try{var n=t();return!Dn(e,n)}catch{return!0}}function m0(e){var t=ls(e,2);t!==null&&gn(t,e,2)}function df(e){var t=cn();if(typeof e=="function"){var n=e;if(e=n(),is){ua(!0);try{n()}finally{ua(!1)}}}return t.memoizedState=t.baseState=e,t.queue={pending:null,lanes:0,dispatch:null,lastRenderedReducer:Fi,lastRenderedState:e},t}function g0(e,t,n,i){return e.baseState=n,ud(e,se,typeof i=="function"?i:Fi)}function iM(e,t,n,i,a){if(Ic(e))throw Error(W(485));if(e=t.action,e!==null){var s={payload:a,action:e,next:null,isTransition:!0,status:"pending",value:null,reason:null,listeners:[],then:function(r){s.listeners.push(r)}};Et.T!==null?n(!0):s.isTransition=!1,i(s),n=t.pending,n===null?(s.next=t.pending=s,_0(t,s)):(s.next=n.next,t.pending=n.next=s)}}function _0(e,t){var n=t.action,i=t.payload,a=e.state;if(t.isTransition){var s=Et.T,r={};Et.T=r;try{var o=n(a,i),l=Et.S;l!==null&&l(r,o),gg(e,t,o)}catch(c){pf(e,t,c)}finally{s!==null&&r.types!==null&&(s.types=r.types),Et.T=s}}else try{s=n(a,i),gg(e,t,s)}catch(c){pf(e,t,c)}}function gg(e,t,n){n!==null&&typeof n=="object"&&typeof n.then=="function"?n.then(function(i){_g(e,t,i)},function(i){return pf(e,t,i)}):_g(e,t,n)}function _g(e,t,n){t.status="fulfilled",t.value=n,v0(t),e.state=n,t=e.pending,t!==null&&(n=t.next,n===t?e.pending=null:(n=n.next,t.next=n,_0(e,n)))}function pf(e,t,n){var i=e.pending;if(e.pending=null,i!==null){i=i.next;do t.status="rejected",t.reason=n,v0(t),t=t.next;while(t!==i)}e.action=null}function v0(e){e=e.listeners;for(var t=0;t<e.length;t++)(0,e[t])()}function y0(e,t){return t}function vg(e,t){if(Zt){var n=le.formState;if(n!==null){t:{var i=It;if(Zt){if(pe){e:{for(var a=pe,s=Xn;a.nodeType!==8;){if(!s){a=null;break e}if(a=Yn(a.nextSibling),a===null){a=null;break e}}s=a.data,a=s==="F!"||s==="F"?a:null}if(a){pe=Yn(a.nextSibling),i=a.data==="F!";break t}}Ta(i)}i=!1}i&&(t=n[0])}}return n=cn(),n.memoizedState=n.baseState=t,i={pending:null,lanes:0,dispatch:null,lastRenderedReducer:y0,lastRenderedState:t},n.queue=i,n=P0.bind(null,It,i),i.dispatch=n,i=df(!1),s=md.bind(null,It,!1,i.queue),i=cn(),a={state:t,dispatch:null,action:e,pending:null},i.queue=a,n=iM.bind(null,It,a,s,n),a.dispatch=n,i.memoizedState=e,[t,n,!1]}function yg(e){var t=Re();return x0(t,se,e)}function x0(e,t,n){if(t=ud(e,t,y0)[0],e=kl(Fi)[0],typeof t=="object"&&t!==null&&typeof t.then=="function")try{var i=Yo(t)}catch(r){throw r===mr?Nc:r}else i=t;t=Re();var a=t.queue,s=a.dispatch;return n!==t.memoizedState&&(It.flags|=2048,rr(9,{destroy:void 0},aM.bind(null,a,n),null)),[i,s,e]}function aM(e,t){e.action=t}function xg(e){var t=Re(),n=se;if(n!==null)return x0(t,n,e);Re(),t=t.memoizedState,n=Re();var i=n.queue.dispatch;return n.memoizedState=e,[t,i,!1]}function rr(e,t,n,i){return e={tag:e,create:n,deps:i,inst:t,next:null},t=It.updateQueue,t===null&&(t=Oc(),It.updateQueue=t),n=t.lastEffect,n===null?t.lastEffect=e.next=e:(i=n.next,n.next=e,e.next=i,t.lastEffect=e),e}function S0(){return Re().memoizedState}function Wl(e,t,n,i){var a=cn();It.flags|=e,a.memoizedState=rr(1|t,{destroy:void 0},n,i===void 0?null:i)}function zc(e,t,n,i){var a=Re();i=i===void 0?null:i;var s=a.memoizedState.inst;se!==null&&i!==null&&ad(i,se.memoizedState.deps)?a.memoizedState=rr(t,s,n,i):(It.flags|=e,a.memoizedState=rr(1|t,s,n,i))}function Sg(e,t){Wl(8390656,8,e,t)}function hd(e,t){zc(2048,8,e,t)}function sM(e){It.flags|=4;var t=It.updateQueue;if(t===null)t=Oc(),It.updateQueue=t,t.events=[e];else{var n=t.events;n===null?t.events=[e]:n.push(e)}}function b0(e){var t=Re().memoizedState;return sM({ref:t,nextImpl:e}),function(){if((Kt&2)!==0)throw Error(W(440));return t.impl.apply(void 0,arguments)}}function M0(e,t){return zc(4,2,e,t)}function E0(e,t){return zc(4,4,e,t)}function T0(e,t){if(typeof t=="function"){e=e();var n=t(e);return function(){typeof n=="function"?n():t(null)}}if(t!=null)return e=e(),t.current=e,function(){t.current=null}}function A0(e,t,n){n=n!=null?n.concat([e]):null,zc(4,4,T0.bind(null,t,e),n)}function fd(){}function w0(e,t){var n=Re();t=t===void 0?null:t;var i=n.memoizedState;return t!==null&&ad(t,i[1])?i[0]:(n.memoizedState=[e,t],e)}function R0(e,t){var n=Re();t=t===void 0?null:t;var i=n.memoizedState;if(t!==null&&ad(t,i[1]))return i[0];if(i=e(),is){ua(!0);try{e()}finally{ua(!1)}}return n.memoizedState=[i,t],i}function dd(e,t,n){return n===void 0||(Bi&1073741824)!==0&&(Yt&261930)===0?e.memoizedState=t:(e.memoizedState=n,e=gv(),It.lanes|=e,wa|=e,n)}function C0(e,t,n,i){return Dn(n,t)?n:sr.current!==null?(e=dd(e,n,i),Dn(e,t)||(Ne=!0),e):(Bi&42)===0||(Bi&1073741824)!==0&&(Yt&261930)===0?(Ne=!0,e.memoizedState=n):(e=gv(),It.lanes|=e,wa|=e,t)}function L0(e,t,n,i,a){var s=$t.p;$t.p=s!==0&&8>s?s:8;var r=Et.T,o={};Et.T=o,md(e,!1,t,n);try{var l=a(),c=Et.S;if(c!==null&&c(o,l),l!==null&&typeof l=="object"&&typeof l.then=="function"){var h=tM(l,i);xo(e,t,h,Ln(e))}else xo(e,t,i,Ln(e))}catch(d){xo(e,t,{then:function(){},status:"rejected",reason:d},Ln())}finally{$t.p=s,r!==null&&o.types!==null&&(r.types=o.types),Et.T=r}}function rM(){}function mf(e,t,n,i){if(e.tag!==5)throw Error(W(476));var a=D0(e).queue;L0(e,a,t,ja,n===null?rM:function(){return U0(e),n(i)})}function D0(e){var t=e.memoizedState;if(t!==null)return t;t={memoizedState:ja,baseState:ja,baseQueue:null,queue:{pending:null,lanes:0,dispatch:null,lastRenderedReducer:Fi,lastRenderedState:ja},next:null};var n={};return t.next={memoizedState:n,baseState:n,baseQueue:null,queue:{pending:null,lanes:0,dispatch:null,lastRenderedReducer:Fi,lastRenderedState:n},next:null},e.memoizedState=t,e=e.alternate,e!==null&&(e.memoizedState=t),t}function U0(e){var t=D0(e);t.next===null&&(t=e.alternate.memoizedState),xo(e,t.next.queue,{},Ln())}function pd(){return je(Io)}function N0(){return Re().memoizedState}function O0(){return Re().memoizedState}function oM(e){for(var t=e.return;t!==null;){switch(t.tag){case 24:case 3:var n=Ln();e=_a(n);var i=va(t,e,n);i!==null&&(gn(i,t,n),_o(i,t,n)),t={cache:$f()},e.payload=t;return}t=t.return}}function lM(e,t,n){var i=Ln();n={lane:i,revertLane:0,gesture:null,action:n,hasEagerState:!1,eagerState:null,next:null},Ic(e)?z0(t,n):(n=jf(e,t,n,i),n!==null&&(gn(n,e,i),I0(n,t,i)))}function P0(e,t,n){var i=Ln();xo(e,t,n,i)}function xo(e,t,n,i){var a={lane:i,revertLane:0,gesture:null,action:n,hasEagerState:!1,eagerState:null,next:null};if(Ic(e))z0(t,a);else{var s=e.alternate;if(e.lanes===0&&(s===null||s.lanes===0)&&(s=t.lastRenderedReducer,s!==null))try{var r=t.lastRenderedState,o=s(r,n);if(a.hasEagerState=!0,a.eagerState=o,Dn(o,r))return Uc(e,t,a,0),le===null&&Dc(),!1}catch{}if(n=jf(e,t,a,i),n!==null)return gn(n,e,i),I0(n,t,i),!0}return!1}function md(e,t,n,i){if(i={lane:2,revertLane:Ed(),gesture:null,action:i,hasEagerState:!1,eagerState:null,next:null},Ic(e)){if(t)throw Error(W(479))}else t=jf(e,n,i,2),t!==null&&gn(t,e,2)}function Ic(e){var t=e.alternate;return e===It||t!==null&&t===It}function z0(e,t){$s=uc=!0;var n=e.pending;n===null?t.next=t:(t.next=n.next,n.next=t),e.pending=t}function I0(e,t,n){if((n&4194048)!==0){var i=t.lanes;i&=e.pendingLanes,n|=i,t.lanes=n,b_(e,n)}}var Oo={readContext:je,use:Pc,useCallback:Me,useContext:Me,useEffect:Me,useImperativeHandle:Me,useLayoutEffect:Me,useInsertionEffect:Me,useMemo:Me,useReducer:Me,useRef:Me,useState:Me,useDebugValue:Me,useDeferredValue:Me,useTransition:Me,useSyncExternalStore:Me,useId:Me,useHostTransitionStatus:Me,useFormState:Me,useActionState:Me,useOptimistic:Me,useMemoCache:Me,useCacheRefresh:Me};Oo.useEffectEvent=Me;var B0={readContext:je,use:Pc,useCallback:function(e,t){return cn().memoizedState=[e,t===void 0?null:t],e},useContext:je,useEffect:Sg,useImperativeHandle:function(e,t,n){n=n!=null?n.concat([e]):null,Wl(4194308,4,T0.bind(null,t,e),n)},useLayoutEffect:function(e,t){return Wl(4194308,4,e,t)},useInsertionEffect:function(e,t){Wl(4,2,e,t)},useMemo:function(e,t){var n=cn();t=t===void 0?null:t;var i=e();if(is){ua(!0);try{e()}finally{ua(!1)}}return n.memoizedState=[i,t],i},useReducer:function(e,t,n){var i=cn();if(n!==void 0){var a=n(t);if(is){ua(!0);try{n(t)}finally{ua(!1)}}}else a=t;return i.memoizedState=i.baseState=a,e={pending:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:a},i.queue=e,e=e.dispatch=lM.bind(null,It,e),[i.memoizedState,e]},useRef:function(e){var t=cn();return e={current:e},t.memoizedState=e},useState:function(e){e=df(e);var t=e.queue,n=P0.bind(null,It,t);return t.dispatch=n,[e.memoizedState,n]},useDebugValue:fd,useDeferredValue:function(e,t){var n=cn();return dd(n,e,t)},useTransition:function(){var e=df(!1);return e=L0.bind(null,It,e.queue,!0,!1),cn().memoizedState=e,[!1,e]},useSyncExternalStore:function(e,t,n){var i=It,a=cn();if(Zt){if(n===void 0)throw Error(W(407));n=n()}else{if(n=t(),le===null)throw Error(W(349));(Yt&127)!==0||h0(i,t,n)}a.memoizedState=n;var s={value:n,getSnapshot:t};return a.queue=s,Sg(d0.bind(null,i,s,e),[e]),i.flags|=2048,rr(9,{destroy:void 0},f0.bind(null,i,s,n,t),null),n},useId:function(){var e=cn(),t=le.identifierPrefix;if(Zt){var n=pi,i=di;n=(i&~(1<<32-Cn(i)-1)).toString(32)+n,t="_"+t+"R_"+n,n=hc++,0<n&&(t+="H"+n.toString(32)),t+="_"}else n=eM++,t="_"+t+"r_"+n.toString(32)+"_";return e.memoizedState=t},useHostTransitionStatus:pd,useFormState:vg,useActionState:vg,useOptimistic:function(e){var t=cn();t.memoizedState=t.baseState=e;var n={pending:null,lanes:0,dispatch:null,lastRenderedReducer:null,lastRenderedState:null};return t.queue=n,t=md.bind(null,It,!0,n),n.dispatch=t,[e,t]},useMemoCache:cd,useCacheRefresh:function(){return cn().memoizedState=oM.bind(null,It)},useEffectEvent:function(e){var t=cn(),n={impl:e};return t.memoizedState=n,function(){if((Kt&2)!==0)throw Error(W(440));return n.impl.apply(void 0,arguments)}}},gd={readContext:je,use:Pc,useCallback:w0,useContext:je,useEffect:hd,useImperativeHandle:A0,useInsertionEffect:M0,useLayoutEffect:E0,useMemo:R0,useReducer:kl,useRef:S0,useState:function(){return kl(Fi)},useDebugValue:fd,useDeferredValue:function(e,t){var n=Re();return C0(n,se.memoizedState,e,t)},useTransition:function(){var e=kl(Fi)[0],t=Re().memoizedState;return[typeof e=="boolean"?e:Yo(e),t]},useSyncExternalStore:u0,useId:N0,useHostTransitionStatus:pd,useFormState:yg,useActionState:yg,useOptimistic:function(e,t){var n=Re();return g0(n,se,e,t)},useMemoCache:cd,useCacheRefresh:O0};gd.useEffectEvent=b0;var F0={readContext:je,use:Pc,useCallback:w0,useContext:je,useEffect:hd,useImperativeHandle:A0,useInsertionEffect:M0,useLayoutEffect:E0,useMemo:R0,useReducer:bh,useRef:S0,useState:function(){return bh(Fi)},useDebugValue:fd,useDeferredValue:function(e,t){var n=Re();return se===null?dd(n,e,t):C0(n,se.memoizedState,e,t)},useTransition:function(){var e=bh(Fi)[0],t=Re().memoizedState;return[typeof e=="boolean"?e:Yo(e),t]},useSyncExternalStore:u0,useId:N0,useHostTransitionStatus:pd,useFormState:xg,useActionState:xg,useOptimistic:function(e,t){var n=Re();return se!==null?g0(n,se,e,t):(n.baseState=e,[e,n.queue.dispatch])},useMemoCache:cd,useCacheRefresh:O0};F0.useEffectEvent=b0;function Mh(e,t,n,i){t=e.memoizedState,n=n(i,t),n=n==null?t:me({},t,n),e.memoizedState=n,e.lanes===0&&(e.updateQueue.baseState=n)}var gf={enqueueSetState:function(e,t,n){e=e._reactInternals;var i=Ln(),a=_a(i);a.payload=t,n!=null&&(a.callback=n),t=va(e,a,i),t!==null&&(gn(t,e,i),_o(t,e,i))},enqueueReplaceState:function(e,t,n){e=e._reactInternals;var i=Ln(),a=_a(i);a.tag=1,a.payload=t,n!=null&&(a.callback=n),t=va(e,a,i),t!==null&&(gn(t,e,i),_o(t,e,i))},enqueueForceUpdate:function(e,t){e=e._reactInternals;var n=Ln(),i=_a(n);i.tag=2,t!=null&&(i.callback=t),t=va(e,i,n),t!==null&&(gn(t,e,n),_o(t,e,n))}};function bg(e,t,n,i,a,s,r){return e=e.stateNode,typeof e.shouldComponentUpdate=="function"?e.shouldComponentUpdate(i,s,r):t.prototype&&t.prototype.isPureReactComponent?!Co(n,i)||!Co(a,s):!0}function Mg(e,t,n,i){e=t.state,typeof t.componentWillReceiveProps=="function"&&t.componentWillReceiveProps(n,i),typeof t.UNSAFE_componentWillReceiveProps=="function"&&t.UNSAFE_componentWillReceiveProps(n,i),t.state!==e&&gf.enqueueReplaceState(t,t.state,null)}function as(e,t){var n=t;if("ref"in t){n={};for(var i in t)i!=="ref"&&(n[i]=t[i])}if(e=e.defaultProps){n===t&&(n=me({},n));for(var a in e)n[a]===void 0&&(n[a]=e[a])}return n}function H0(e){ic(e)}function V0(e){console.error(e)}function G0(e){ic(e)}function fc(e,t){try{var n=e.onUncaughtError;n(t.value,{componentStack:t.stack})}catch(i){setTimeout(function(){throw i})}}function Eg(e,t,n){try{var i=e.onCaughtError;i(n.value,{componentStack:n.stack,errorBoundary:t.tag===1?t.stateNode:null})}catch(a){setTimeout(function(){throw a})}}function _f(e,t,n){return n=_a(n),n.tag=3,n.payload={element:null},n.callback=function(){fc(e,t)},n}function k0(e){return e=_a(e),e.tag=3,e}function W0(e,t,n,i){var a=n.type.getDerivedStateFromError;if(typeof a=="function"){var s=i.value;e.payload=function(){return a(s)},e.callback=function(){Eg(t,n,i)}}var r=n.stateNode;r!==null&&typeof r.componentDidCatch=="function"&&(e.callback=function(){Eg(t,n,i),typeof a!="function"&&(ya===null?ya=new Set([this]):ya.add(this));var o=i.stack;this.componentDidCatch(i.value,{componentStack:o!==null?o:""})})}function cM(e,t,n,i,a){if(n.flags|=32768,i!==null&&typeof i=="object"&&typeof i.then=="function"){if(t=n.alternate,t!==null&&pr(t,n,a,!0),n=Un.current,n!==null){switch(n.tag){case 31:case 13:return qn===null?_c():n.alternate===null&&Ee===0&&(Ee=3),n.flags&=-257,n.flags|=65536,n.lanes=a,i===oc?n.flags|=16384:(t=n.updateQueue,t===null?n.updateQueue=new Set([i]):t.add(i),Oh(e,i,a)),!1;case 22:return n.flags|=65536,i===oc?n.flags|=16384:(t=n.updateQueue,t===null?(t={transitions:null,markerInstances:null,retryQueue:new Set([i])},n.updateQueue=t):(n=t.retryQueue,n===null?t.retryQueue=new Set([i]):n.add(i)),Oh(e,i,a)),!1}throw Error(W(435,n.tag))}return Oh(e,i,a),_c(),!1}if(Zt)return t=Un.current,t!==null?((t.flags&65536)===0&&(t.flags|=256),t.flags|=65536,t.lanes=a,i!==af&&(e=Error(W(422),{cause:i}),Do(Wn(e,n)))):(i!==af&&(t=Error(W(423),{cause:i}),Do(Wn(t,n))),e=e.current.alternate,e.flags|=65536,a&=-a,e.lanes|=a,i=Wn(i,n),a=_f(e.stateNode,i,a),Sh(e,a),Ee!==4&&(Ee=2)),!1;var s=Error(W(520),{cause:i});if(s=Wn(s,n),Mo===null?Mo=[s]:Mo.push(s),Ee!==4&&(Ee=2),t===null)return!0;i=Wn(i,n),n=t;do{switch(n.tag){case 3:return n.flags|=65536,e=a&-a,n.lanes|=e,e=_f(n.stateNode,i,e),Sh(n,e),!1;case 1:if(t=n.type,s=n.stateNode,(n.flags&128)===0&&(typeof t.getDerivedStateFromError=="function"||s!==null&&typeof s.componentDidCatch=="function"&&(ya===null||!ya.has(s))))return n.flags|=65536,a&=-a,n.lanes|=a,a=k0(a),W0(a,e,n,i),Sh(n,a),!1}n=n.return}while(n!==null);return!1}var _d=Error(W(461)),Ne=!1;function qe(e,t,n,i){t.child=e===null?a0(t,null,n,i):ns(t,e.child,n,i)}function Tg(e,t,n,i,a){n=n.render;var s=t.ref;if("ref"in i){var r={};for(var o in i)o!=="ref"&&(r[o]=i[o])}else r=i;return es(t),i=sd(e,t,n,r,s,a),o=rd(),e!==null&&!Ne?(od(e,t,a),Hi(e,t,a)):(Zt&&o&&Qf(t),t.flags|=1,qe(e,t,i,a),t.child)}function Ag(e,t,n,i,a){if(e===null){var s=n.type;return typeof s=="function"&&!Jf(s)&&s.defaultProps===void 0&&n.compare===null?(t.tag=15,t.type=s,X0(e,t,s,i,a)):(e=Vl(n.type,null,i,t,t.mode,a),e.ref=t.ref,e.return=t,t.child=e)}if(s=e.child,!vd(e,a)){var r=s.memoizedProps;if(n=n.compare,n=n!==null?n:Co,n(r,i)&&e.ref===t.ref)return Hi(e,t,a)}return t.flags|=1,e=Oi(s,i),e.ref=t.ref,e.return=t,t.child=e}function X0(e,t,n,i,a){if(e!==null){var s=e.memoizedProps;if(Co(s,i)&&e.ref===t.ref)if(Ne=!1,t.pendingProps=i=s,vd(e,a))(e.flags&131072)!==0&&(Ne=!0);else return t.lanes=e.lanes,Hi(e,t,a)}return vf(e,t,n,i,a)}function q0(e,t,n,i){var a=i.children,s=e!==null?e.memoizedState:null;if(e===null&&t.stateNode===null&&(t.stateNode={_visibility:1,_pendingMarkers:null,_retryCache:null,_transitions:null}),i.mode==="hidden"){if((t.flags&128)!==0){if(s=s!==null?s.baseLanes|n:n,e!==null){for(i=t.child=e.child,a=0;i!==null;)a=a|i.lanes|i.childLanes,i=i.sibling;i=a&~s}else i=0,t.child=null;return wg(e,t,s,n,i)}if((n&536870912)!==0)t.memoizedState={baseLanes:0,cachePool:null},e!==null&&Gl(t,s!==null?s.cachePool:null),s!==null?mg(t,s):hf(),o0(t);else return i=t.lanes=536870912,wg(e,t,s!==null?s.baseLanes|n:n,n,i)}else s!==null?(Gl(t,s.cachePool),mg(t,s),la(t),t.memoizedState=null):(e!==null&&Gl(t,null),hf(),la(t));return qe(e,t,a,n),t.child}function uo(e,t){return e!==null&&e.tag===22||t.stateNode!==null||(t.stateNode={_visibility:1,_pendingMarkers:null,_retryCache:null,_transitions:null}),t.sibling}function wg(e,t,n,i,a){var s=td();return s=s===null?null:{parent:Ue._currentValue,pool:s},t.memoizedState={baseLanes:n,cachePool:s},e!==null&&Gl(t,null),hf(),o0(t),e!==null&&pr(e,t,i,!0),t.childLanes=a,null}function Xl(e,t){return t=dc({mode:t.mode,children:t.children},e.mode),t.ref=e.ref,e.child=t,t.return=e,t}function Rg(e,t,n){return ns(t,e.child,null,n),e=Xl(t,t.pendingProps),e.flags|=2,En(t),t.memoizedState=null,e}function uM(e,t,n){var i=t.pendingProps,a=(t.flags&128)!==0;if(t.flags&=-129,e===null){if(Zt){if(i.mode==="hidden")return e=Xl(t,i),t.lanes=536870912,uo(null,e);if(ff(t),(e=pe)?(e=Bv(e,Xn),e=e!==null&&e.data==="&"?e:null,e!==null&&(t.memoizedState={dehydrated:e,treeContext:Ea!==null?{id:di,overflow:pi}:null,retryLane:536870912,hydrationErrors:null},n=Q_(e),n.return=t,t.child=n,Ze=t,pe=null)):e=null,e===null)throw Ta(t);return t.lanes=536870912,null}return Xl(t,i)}var s=e.memoizedState;if(s!==null){var r=s.dehydrated;if(ff(t),a)if(t.flags&256)t.flags&=-257,t=Rg(e,t,n);else if(t.memoizedState!==null)t.child=e.child,t.flags|=128,t=null;else throw Error(W(558));else if(Ne||pr(e,t,n,!1),a=(n&e.childLanes)!==0,Ne||a){if(i=le,i!==null&&(r=M_(i,n),r!==0&&r!==s.retryLane))throw s.retryLane=r,ls(e,r),gn(i,e,r),_d;_c(),t=Rg(e,t,n)}else e=s.treeContext,pe=Yn(r.nextSibling),Ze=t,Zt=!0,ga=null,Xn=!1,e!==null&&$_(t,e),t=Xl(t,i),t.flags|=4096;return t}return e=Oi(e.child,{mode:i.mode,children:i.children}),e.ref=t.ref,t.child=e,e.return=t,e}function ql(e,t){var n=t.ref;if(n===null)e!==null&&e.ref!==null&&(t.flags|=4194816);else{if(typeof n!="function"&&typeof n!="object")throw Error(W(284));(e===null||e.ref!==n)&&(t.flags|=4194816)}}function vf(e,t,n,i,a){return es(t),n=sd(e,t,n,i,void 0,a),i=rd(),e!==null&&!Ne?(od(e,t,a),Hi(e,t,a)):(Zt&&i&&Qf(t),t.flags|=1,qe(e,t,n,a),t.child)}function Cg(e,t,n,i,a,s){return es(t),t.updateQueue=null,n=c0(t,i,n,a),l0(e),i=rd(),e!==null&&!Ne?(od(e,t,s),Hi(e,t,s)):(Zt&&i&&Qf(t),t.flags|=1,qe(e,t,n,s),t.child)}function Lg(e,t,n,i,a){if(es(t),t.stateNode===null){var s=Ws,r=n.contextType;typeof r=="object"&&r!==null&&(s=je(r)),s=new n(i,s),t.memoizedState=s.state!==null&&s.state!==void 0?s.state:null,s.updater=gf,t.stateNode=s,s._reactInternals=t,s=t.stateNode,s.props=i,s.state=t.memoizedState,s.refs={},nd(t),r=n.contextType,s.context=typeof r=="object"&&r!==null?je(r):Ws,s.state=t.memoizedState,r=n.getDerivedStateFromProps,typeof r=="function"&&(Mh(t,n,r,i),s.state=t.memoizedState),typeof n.getDerivedStateFromProps=="function"||typeof s.getSnapshotBeforeUpdate=="function"||typeof s.UNSAFE_componentWillMount!="function"&&typeof s.componentWillMount!="function"||(r=s.state,typeof s.componentWillMount=="function"&&s.componentWillMount(),typeof s.UNSAFE_componentWillMount=="function"&&s.UNSAFE_componentWillMount(),r!==s.state&&gf.enqueueReplaceState(s,s.state,null),yo(t,i,s,a),vo(),s.state=t.memoizedState),typeof s.componentDidMount=="function"&&(t.flags|=4194308),i=!0}else if(e===null){s=t.stateNode;var o=t.memoizedProps,l=as(n,o);s.props=l;var c=s.context,h=n.contextType;r=Ws,typeof h=="object"&&h!==null&&(r=je(h));var d=n.getDerivedStateFromProps;h=typeof d=="function"||typeof s.getSnapshotBeforeUpdate=="function",o=t.pendingProps!==o,h||typeof s.UNSAFE_componentWillReceiveProps!="function"&&typeof s.componentWillReceiveProps!="function"||(o||c!==r)&&Mg(t,s,i,r),sa=!1;var f=t.memoizedState;s.state=f,yo(t,i,s,a),vo(),c=t.memoizedState,o||f!==c||sa?(typeof d=="function"&&(Mh(t,n,d,i),c=t.memoizedState),(l=sa||bg(t,n,l,i,f,c,r))?(h||typeof s.UNSAFE_componentWillMount!="function"&&typeof s.componentWillMount!="function"||(typeof s.componentWillMount=="function"&&s.componentWillMount(),typeof s.UNSAFE_componentWillMount=="function"&&s.UNSAFE_componentWillMount()),typeof s.componentDidMount=="function"&&(t.flags|=4194308)):(typeof s.componentDidMount=="function"&&(t.flags|=4194308),t.memoizedProps=i,t.memoizedState=c),s.props=i,s.state=c,s.context=r,i=l):(typeof s.componentDidMount=="function"&&(t.flags|=4194308),i=!1)}else{s=t.stateNode,cf(e,t),r=t.memoizedProps,h=as(n,r),s.props=h,d=t.pendingProps,f=s.context,c=n.contextType,l=Ws,typeof c=="object"&&c!==null&&(l=je(c)),o=n.getDerivedStateFromProps,(c=typeof o=="function"||typeof s.getSnapshotBeforeUpdate=="function")||typeof s.UNSAFE_componentWillReceiveProps!="function"&&typeof s.componentWillReceiveProps!="function"||(r!==d||f!==l)&&Mg(t,s,i,l),sa=!1,f=t.memoizedState,s.state=f,yo(t,i,s,a),vo();var p=t.memoizedState;r!==d||f!==p||sa||e!==null&&e.dependencies!==null&&rc(e.dependencies)?(typeof o=="function"&&(Mh(t,n,o,i),p=t.memoizedState),(h=sa||bg(t,n,h,i,f,p,l)||e!==null&&e.dependencies!==null&&rc(e.dependencies))?(c||typeof s.UNSAFE_componentWillUpdate!="function"&&typeof s.componentWillUpdate!="function"||(typeof s.componentWillUpdate=="function"&&s.componentWillUpdate(i,p,l),typeof s.UNSAFE_componentWillUpdate=="function"&&s.UNSAFE_componentWillUpdate(i,p,l)),typeof s.componentDidUpdate=="function"&&(t.flags|=4),typeof s.getSnapshotBeforeUpdate=="function"&&(t.flags|=1024)):(typeof s.componentDidUpdate!="function"||r===e.memoizedProps&&f===e.memoizedState||(t.flags|=4),typeof s.getSnapshotBeforeUpdate!="function"||r===e.memoizedProps&&f===e.memoizedState||(t.flags|=1024),t.memoizedProps=i,t.memoizedState=p),s.props=i,s.state=p,s.context=l,i=h):(typeof s.componentDidUpdate!="function"||r===e.memoizedProps&&f===e.memoizedState||(t.flags|=4),typeof s.getSnapshotBeforeUpdate!="function"||r===e.memoizedProps&&f===e.memoizedState||(t.flags|=1024),i=!1)}return s=i,ql(e,t),i=(t.flags&128)!==0,s||i?(s=t.stateNode,n=i&&typeof n.getDerivedStateFromError!="function"?null:s.render(),t.flags|=1,e!==null&&i?(t.child=ns(t,e.child,null,a),t.child=ns(t,null,n,a)):qe(e,t,n,a),t.memoizedState=s.state,e=t.child):e=Hi(e,t,a),e}function Dg(e,t,n,i){return ts(),t.flags|=256,qe(e,t,n,i),t.child}var Eh={dehydrated:null,treeContext:null,retryLane:0,hydrationErrors:null};function Th(e){return{baseLanes:e,cachePool:e0()}}function Ah(e,t,n){return e=e!==null?e.childLanes&~n:0,t&&(e|=An),e}function Y0(e,t,n){var i=t.pendingProps,a=!1,s=(t.flags&128)!==0,r;if((r=s)||(r=e!==null&&e.memoizedState===null?!1:(we.current&2)!==0),r&&(a=!0,t.flags&=-129),r=(t.flags&32)!==0,t.flags&=-33,e===null){if(Zt){if(a?oa(t):la(t),(e=pe)?(e=Bv(e,Xn),e=e!==null&&e.data!=="&"?e:null,e!==null&&(t.memoizedState={dehydrated:e,treeContext:Ea!==null?{id:di,overflow:pi}:null,retryLane:536870912,hydrationErrors:null},n=Q_(e),n.return=t,t.child=n,Ze=t,pe=null)):e=null,e===null)throw Ta(t);return Uf(e)?t.lanes=32:t.lanes=536870912,null}var o=i.children;return i=i.fallback,a?(la(t),a=t.mode,o=dc({mode:"hidden",children:o},a),i=Ja(i,a,n,null),o.return=t,i.return=t,o.sibling=i,t.child=o,i=t.child,i.memoizedState=Th(n),i.childLanes=Ah(e,r,n),t.memoizedState=Eh,uo(null,i)):(oa(t),yf(t,o))}var l=e.memoizedState;if(l!==null&&(o=l.dehydrated,o!==null)){if(s)t.flags&256?(oa(t),t.flags&=-257,t=wh(e,t,n)):t.memoizedState!==null?(la(t),t.child=e.child,t.flags|=128,t=null):(la(t),o=i.fallback,a=t.mode,i=dc({mode:"visible",children:i.children},a),o=Ja(o,a,n,null),o.flags|=2,i.return=t,o.return=t,i.sibling=o,t.child=i,ns(t,e.child,null,n),i=t.child,i.memoizedState=Th(n),i.childLanes=Ah(e,r,n),t.memoizedState=Eh,t=uo(null,i));else if(oa(t),Uf(o)){if(r=o.nextSibling&&o.nextSibling.dataset,r)var c=r.dgst;r=c,i=Error(W(419)),i.stack="",i.digest=r,Do({value:i,source:null,stack:null}),t=wh(e,t,n)}else if(Ne||pr(e,t,n,!1),r=(n&e.childLanes)!==0,Ne||r){if(r=le,r!==null&&(i=M_(r,n),i!==0&&i!==l.retryLane))throw l.retryLane=i,ls(e,i),gn(r,e,i),_d;Df(o)||_c(),t=wh(e,t,n)}else Df(o)?(t.flags|=192,t.child=e.child,t=null):(e=l.treeContext,pe=Yn(o.nextSibling),Ze=t,Zt=!0,ga=null,Xn=!1,e!==null&&$_(t,e),t=yf(t,i.children),t.flags|=4096);return t}return a?(la(t),o=i.fallback,a=t.mode,l=e.child,c=l.sibling,i=Oi(l,{mode:"hidden",children:i.children}),i.subtreeFlags=l.subtreeFlags&65011712,c!==null?o=Oi(c,o):(o=Ja(o,a,n,null),o.flags|=2),o.return=t,i.return=t,i.sibling=o,t.child=i,uo(null,i),i=t.child,o=e.child.memoizedState,o===null?o=Th(n):(a=o.cachePool,a!==null?(l=Ue._currentValue,a=a.parent!==l?{parent:l,pool:l}:a):a=e0(),o={baseLanes:o.baseLanes|n,cachePool:a}),i.memoizedState=o,i.childLanes=Ah(e,r,n),t.memoizedState=Eh,uo(e.child,i)):(oa(t),n=e.child,e=n.sibling,n=Oi(n,{mode:"visible",children:i.children}),n.return=t,n.sibling=null,e!==null&&(r=t.deletions,r===null?(t.deletions=[e],t.flags|=16):r.push(e)),t.child=n,t.memoizedState=null,n)}function yf(e,t){return t=dc({mode:"visible",children:t},e.mode),t.return=e,e.child=t}function dc(e,t){return e=Tn(22,e,null,t),e.lanes=0,e}function wh(e,t,n){return ns(t,e.child,null,n),e=yf(t,t.pendingProps.children),e.flags|=2,t.memoizedState=null,e}function Ug(e,t,n){e.lanes|=t;var i=e.alternate;i!==null&&(i.lanes|=t),rf(e.return,t,n)}function Rh(e,t,n,i,a,s){var r=e.memoizedState;r===null?e.memoizedState={isBackwards:t,rendering:null,renderingStartTime:0,last:i,tail:n,tailMode:a,treeForkCount:s}:(r.isBackwards=t,r.rendering=null,r.renderingStartTime=0,r.last=i,r.tail=n,r.tailMode=a,r.treeForkCount=s)}function Z0(e,t,n){var i=t.pendingProps,a=i.revealOrder,s=i.tail;i=i.children;var r=we.current,o=(r&2)!==0;if(o?(r=r&1|2,t.flags|=128):r&=1,ue(we,r),qe(e,t,i,n),i=Zt?Lo:0,!o&&e!==null&&(e.flags&128)!==0)t:for(e=t.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&Ug(e,n,t);else if(e.tag===19)Ug(e,n,t);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break t;for(;e.sibling===null;){if(e.return===null||e.return===t)break t;e=e.return}e.sibling.return=e.return,e=e.sibling}switch(a){case"forwards":for(n=t.child,a=null;n!==null;)e=n.alternate,e!==null&&cc(e)===null&&(a=n),n=n.sibling;n=a,n===null?(a=t.child,t.child=null):(a=n.sibling,n.sibling=null),Rh(t,!1,a,n,s,i);break;case"backwards":case"unstable_legacy-backwards":for(n=null,a=t.child,t.child=null;a!==null;){if(e=a.alternate,e!==null&&cc(e)===null){t.child=a;break}e=a.sibling,a.sibling=n,n=a,a=e}Rh(t,!0,n,null,s,i);break;case"together":Rh(t,!1,null,null,void 0,i);break;default:t.memoizedState=null}return t.child}function Hi(e,t,n){if(e!==null&&(t.dependencies=e.dependencies),wa|=t.lanes,(n&t.childLanes)===0)if(e!==null){if(pr(e,t,n,!1),(n&t.childLanes)===0)return null}else return null;if(e!==null&&t.child!==e.child)throw Error(W(153));if(t.child!==null){for(e=t.child,n=Oi(e,e.pendingProps),t.child=n,n.return=t;e.sibling!==null;)e=e.sibling,n=n.sibling=Oi(e,e.pendingProps),n.return=t;n.sibling=null}return t.child}function vd(e,t){return(e.lanes&t)!==0?!0:(e=e.dependencies,!!(e!==null&&rc(e)))}function hM(e,t,n){switch(t.tag){case 3:$l(t,t.stateNode.containerInfo),ra(t,Ue,e.memoizedState.cache),ts();break;case 27:case 5:qh(t);break;case 4:$l(t,t.stateNode.containerInfo);break;case 10:ra(t,t.type,t.memoizedProps.value);break;case 31:if(t.memoizedState!==null)return t.flags|=128,ff(t),null;break;case 13:var i=t.memoizedState;if(i!==null)return i.dehydrated!==null?(oa(t),t.flags|=128,null):(n&t.child.childLanes)!==0?Y0(e,t,n):(oa(t),e=Hi(e,t,n),e!==null?e.sibling:null);oa(t);break;case 19:var a=(e.flags&128)!==0;if(i=(n&t.childLanes)!==0,i||(pr(e,t,n,!1),i=(n&t.childLanes)!==0),a){if(i)return Z0(e,t,n);t.flags|=128}if(a=t.memoizedState,a!==null&&(a.rendering=null,a.tail=null,a.lastEffect=null),ue(we,we.current),i)break;return null;case 22:return t.lanes=0,q0(e,t,n,t.pendingProps);case 24:ra(t,Ue,e.memoizedState.cache)}return Hi(e,t,n)}function j0(e,t,n){if(e!==null)if(e.memoizedProps!==t.pendingProps)Ne=!0;else{if(!vd(e,n)&&(t.flags&128)===0)return Ne=!1,hM(e,t,n);Ne=(e.flags&131072)!==0}else Ne=!1,Zt&&(t.flags&1048576)!==0&&K_(t,Lo,t.index);switch(t.lanes=0,t.tag){case 16:t:{var i=t.pendingProps;if(e=Ya(t.elementType),t.type=e,typeof e=="function")Jf(e)?(i=as(e,i),t.tag=1,t=Lg(null,t,e,i,n)):(t.tag=0,t=vf(null,t,e,i,n));else{if(e!=null){var a=e.$$typeof;if(a===zf){t.tag=11,t=Tg(null,t,e,i,n);break t}else if(a===If){t.tag=14,t=Ag(null,t,e,i,n);break t}}throw t=Wh(e)||e,Error(W(306,t,""))}}return t;case 0:return vf(e,t,t.type,t.pendingProps,n);case 1:return i=t.type,a=as(i,t.pendingProps),Lg(e,t,i,a,n);case 3:t:{if($l(t,t.stateNode.containerInfo),e===null)throw Error(W(387));i=t.pendingProps;var s=t.memoizedState;a=s.element,cf(e,t),yo(t,i,null,n);var r=t.memoizedState;if(i=r.cache,ra(t,Ue,i),i!==s.cache&&of(t,[Ue],n,!0),vo(),i=r.element,s.isDehydrated)if(s={element:i,isDehydrated:!1,cache:r.cache},t.updateQueue.baseState=s,t.memoizedState=s,t.flags&256){t=Dg(e,t,i,n);break t}else if(i!==a){a=Wn(Error(W(424)),t),Do(a),t=Dg(e,t,i,n);break t}else for(e=t.stateNode.containerInfo,e.nodeType===9?e=e.body:e=e.nodeName==="HTML"?e.ownerDocument.body:e,pe=Yn(e.firstChild),Ze=t,Zt=!0,ga=null,Xn=!0,n=a0(t,null,i,n),t.child=n;n;)n.flags=n.flags&-3|4096,n=n.sibling;else{if(ts(),i===a){t=Hi(e,t,n);break t}qe(e,t,i,n)}t=t.child}return t;case 26:return ql(e,t),e===null?(n=t_(t.type,null,t.pendingProps,null))?t.memoizedState=n:Zt||(n=t.type,e=t.pendingProps,i=Sc(ma.current).createElement(n),i[Ye]=t,i[_n]=e,Je(i,n,e),ke(i),t.stateNode=i):t.memoizedState=t_(t.type,e.memoizedProps,t.pendingProps,e.memoizedState),null;case 27:return qh(t),e===null&&Zt&&(i=t.stateNode=Fv(t.type,t.pendingProps,ma.current),Ze=t,Xn=!0,a=pe,Ca(t.type)?(Nf=a,pe=Yn(i.firstChild)):pe=a),qe(e,t,t.pendingProps.children,n),ql(e,t),e===null&&(t.flags|=4194304),t.child;case 5:return e===null&&Zt&&((a=i=pe)&&(i=FM(i,t.type,t.pendingProps,Xn),i!==null?(t.stateNode=i,Ze=t,pe=Yn(i.firstChild),Xn=!1,a=!0):a=!1),a||Ta(t)),qh(t),a=t.type,s=t.pendingProps,r=e!==null?e.memoizedProps:null,i=s.children,Cf(a,s)?i=null:r!==null&&Cf(a,r)&&(t.flags|=32),t.memoizedState!==null&&(a=sd(e,t,nM,null,null,n),Io._currentValue=a),ql(e,t),qe(e,t,i,n),t.child;case 6:return e===null&&Zt&&((e=n=pe)&&(n=HM(n,t.pendingProps,Xn),n!==null?(t.stateNode=n,Ze=t,pe=null,e=!0):e=!1),e||Ta(t)),null;case 13:return Y0(e,t,n);case 4:return $l(t,t.stateNode.containerInfo),i=t.pendingProps,e===null?t.child=ns(t,null,i,n):qe(e,t,i,n),t.child;case 11:return Tg(e,t,t.type,t.pendingProps,n);case 7:return qe(e,t,t.pendingProps,n),t.child;case 8:return qe(e,t,t.pendingProps.children,n),t.child;case 12:return qe(e,t,t.pendingProps.children,n),t.child;case 10:return i=t.pendingProps,ra(t,t.type,i.value),qe(e,t,i.children,n),t.child;case 9:return a=t.type._context,i=t.pendingProps.children,es(t),a=je(a),i=i(a),t.flags|=1,qe(e,t,i,n),t.child;case 14:return Ag(e,t,t.type,t.pendingProps,n);case 15:return X0(e,t,t.type,t.pendingProps,n);case 19:return Z0(e,t,n);case 31:return uM(e,t,n);case 22:return q0(e,t,n,t.pendingProps);case 24:return es(t),i=je(Ue),e===null?(a=td(),a===null&&(a=le,s=$f(),a.pooledCache=s,s.refCount++,s!==null&&(a.pooledCacheLanes|=n),a=s),t.memoizedState={parent:i,cache:a},nd(t),ra(t,Ue,a)):((e.lanes&n)!==0&&(cf(e,t),yo(t,null,null,n),vo()),a=e.memoizedState,s=t.memoizedState,a.parent!==i?(a={parent:i,cache:i},t.memoizedState=a,t.lanes===0&&(t.memoizedState=t.updateQueue.baseState=a),ra(t,Ue,i)):(i=s.cache,ra(t,Ue,i),i!==a.cache&&of(t,[Ue],n,!0))),qe(e,t,t.pendingProps.children,n),t.child;case 29:throw t.pendingProps}throw Error(W(156,t.tag))}function Ti(e){e.flags|=4}function Ch(e,t,n,i,a){if((t=(e.mode&32)!==0)&&(t=!1),t){if(e.flags|=16777216,(a&335544128)===a)if(e.stateNode.complete)e.flags|=8192;else if(yv())e.flags|=8192;else throw Ka=oc,ed}else e.flags&=-16777217}function Ng(e,t){if(t.type!=="stylesheet"||(t.state.loading&4)!==0)e.flags&=-16777217;else if(e.flags|=16777216,!Gv(t))if(yv())e.flags|=8192;else throw Ka=oc,ed}function Ll(e,t){t!==null&&(e.flags|=4),e.flags&16384&&(t=e.tag!==22?x_():536870912,e.lanes|=t,or|=t)}function io(e,t){if(!Zt)switch(e.tailMode){case"hidden":t=e.tail;for(var n=null;t!==null;)t.alternate!==null&&(n=t),t=t.sibling;n===null?e.tail=null:n.sibling=null;break;case"collapsed":n=e.tail;for(var i=null;n!==null;)n.alternate!==null&&(i=n),n=n.sibling;i===null?t||e.tail===null?e.tail=null:e.tail.sibling=null:i.sibling=null}}function de(e){var t=e.alternate!==null&&e.alternate.child===e.child,n=0,i=0;if(t)for(var a=e.child;a!==null;)n|=a.lanes|a.childLanes,i|=a.subtreeFlags&65011712,i|=a.flags&65011712,a.return=e,a=a.sibling;else for(a=e.child;a!==null;)n|=a.lanes|a.childLanes,i|=a.subtreeFlags,i|=a.flags,a.return=e,a=a.sibling;return e.subtreeFlags|=i,e.childLanes=n,t}function fM(e,t,n){var i=t.pendingProps;switch(Kf(t),t.tag){case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return de(t),null;case 1:return de(t),null;case 3:return n=t.stateNode,i=null,e!==null&&(i=e.memoizedState.cache),t.memoizedState.cache!==i&&(t.flags|=2048),Pi(Ue),er(),n.pendingContext&&(n.context=n.pendingContext,n.pendingContext=null),(e===null||e.child===null)&&(Us(t)?Ti(t):e===null||e.memoizedState.isDehydrated&&(t.flags&256)===0||(t.flags|=1024,xh())),de(t),null;case 26:var a=t.type,s=t.memoizedState;return e===null?(Ti(t),s!==null?(de(t),Ng(t,s)):(de(t),Ch(t,a,null,i,n))):s?s!==e.memoizedState?(Ti(t),de(t),Ng(t,s)):(de(t),t.flags&=-16777217):(e=e.memoizedProps,e!==i&&Ti(t),de(t),Ch(t,a,e,i,n)),null;case 27:if(tc(t),n=ma.current,a=t.type,e!==null&&t.stateNode!=null)e.memoizedProps!==i&&Ti(t);else{if(!i){if(t.stateNode===null)throw Error(W(166));return de(t),null}e=gi.current,Us(t)?lg(t,e):(e=Fv(a,i,n),t.stateNode=e,Ti(t))}return de(t),null;case 5:if(tc(t),a=t.type,e!==null&&t.stateNode!=null)e.memoizedProps!==i&&Ti(t);else{if(!i){if(t.stateNode===null)throw Error(W(166));return de(t),null}if(s=gi.current,Us(t))lg(t,s);else{var r=Sc(ma.current);switch(s){case 1:s=r.createElementNS("http://www.w3.org/2000/svg",a);break;case 2:s=r.createElementNS("http://www.w3.org/1998/Math/MathML",a);break;default:switch(a){case"svg":s=r.createElementNS("http://www.w3.org/2000/svg",a);break;case"math":s=r.createElementNS("http://www.w3.org/1998/Math/MathML",a);break;case"script":s=r.createElement("div"),s.innerHTML="<script><\/script>",s=s.removeChild(s.firstChild);break;case"select":s=typeof i.is=="string"?r.createElement("select",{is:i.is}):r.createElement("select"),i.multiple?s.multiple=!0:i.size&&(s.size=i.size);break;default:s=typeof i.is=="string"?r.createElement(a,{is:i.is}):r.createElement(a)}}s[Ye]=t,s[_n]=i;t:for(r=t.child;r!==null;){if(r.tag===5||r.tag===6)s.appendChild(r.stateNode);else if(r.tag!==4&&r.tag!==27&&r.child!==null){r.child.return=r,r=r.child;continue}if(r===t)break t;for(;r.sibling===null;){if(r.return===null||r.return===t)break t;r=r.return}r.sibling.return=r.return,r=r.sibling}t.stateNode=s;t:switch(Je(s,a,i),a){case"button":case"input":case"select":case"textarea":i=!!i.autoFocus;break t;case"img":i=!0;break t;default:i=!1}i&&Ti(t)}}return de(t),Ch(t,t.type,e===null?null:e.memoizedProps,t.pendingProps,n),null;case 6:if(e&&t.stateNode!=null)e.memoizedProps!==i&&Ti(t);else{if(typeof i!="string"&&t.stateNode===null)throw Error(W(166));if(e=ma.current,Us(t)){if(e=t.stateNode,n=t.memoizedProps,i=null,a=Ze,a!==null)switch(a.tag){case 27:case 5:i=a.memoizedProps}e[Ye]=t,e=!!(e.nodeValue===n||i!==null&&i.suppressHydrationWarning===!0||Pv(e.nodeValue,n)),e||Ta(t,!0)}else e=Sc(e).createTextNode(i),e[Ye]=t,t.stateNode=e}return de(t),null;case 31:if(n=t.memoizedState,e===null||e.memoizedState!==null){if(i=Us(t),n!==null){if(e===null){if(!i)throw Error(W(318));if(e=t.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(W(557));e[Ye]=t}else ts(),(t.flags&128)===0&&(t.memoizedState=null),t.flags|=4;de(t),e=!1}else n=xh(),e!==null&&e.memoizedState!==null&&(e.memoizedState.hydrationErrors=n),e=!0;if(!e)return t.flags&256?(En(t),t):(En(t),null);if((t.flags&128)!==0)throw Error(W(558))}return de(t),null;case 13:if(i=t.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(a=Us(t),i!==null&&i.dehydrated!==null){if(e===null){if(!a)throw Error(W(318));if(a=t.memoizedState,a=a!==null?a.dehydrated:null,!a)throw Error(W(317));a[Ye]=t}else ts(),(t.flags&128)===0&&(t.memoizedState=null),t.flags|=4;de(t),a=!1}else a=xh(),e!==null&&e.memoizedState!==null&&(e.memoizedState.hydrationErrors=a),a=!0;if(!a)return t.flags&256?(En(t),t):(En(t),null)}return En(t),(t.flags&128)!==0?(t.lanes=n,t):(n=i!==null,e=e!==null&&e.memoizedState!==null,n&&(i=t.child,a=null,i.alternate!==null&&i.alternate.memoizedState!==null&&i.alternate.memoizedState.cachePool!==null&&(a=i.alternate.memoizedState.cachePool.pool),s=null,i.memoizedState!==null&&i.memoizedState.cachePool!==null&&(s=i.memoizedState.cachePool.pool),s!==a&&(i.flags|=2048)),n!==e&&n&&(t.child.flags|=8192),Ll(t,t.updateQueue),de(t),null);case 4:return er(),e===null&&Td(t.stateNode.containerInfo),de(t),null;case 10:return Pi(t.type),de(t),null;case 19:if(We(we),i=t.memoizedState,i===null)return de(t),null;if(a=(t.flags&128)!==0,s=i.rendering,s===null)if(a)io(i,!1);else{if(Ee!==0||e!==null&&(e.flags&128)!==0)for(e=t.child;e!==null;){if(s=cc(e),s!==null){for(t.flags|=128,io(i,!1),e=s.updateQueue,t.updateQueue=e,Ll(t,e),t.subtreeFlags=0,e=n,n=t.child;n!==null;)J_(n,e),n=n.sibling;return ue(we,we.current&1|2),Zt&&Ci(t,i.treeForkCount),t.child}e=e.sibling}i.tail!==null&&wn()>mc&&(t.flags|=128,a=!0,io(i,!1),t.lanes=4194304)}else{if(!a)if(e=cc(s),e!==null){if(t.flags|=128,a=!0,e=e.updateQueue,t.updateQueue=e,Ll(t,e),io(i,!0),i.tail===null&&i.tailMode==="hidden"&&!s.alternate&&!Zt)return de(t),null}else 2*wn()-i.renderingStartTime>mc&&n!==536870912&&(t.flags|=128,a=!0,io(i,!1),t.lanes=4194304);i.isBackwards?(s.sibling=t.child,t.child=s):(e=i.last,e!==null?e.sibling=s:t.child=s,i.last=s)}return i.tail!==null?(e=i.tail,i.rendering=e,i.tail=e.sibling,i.renderingStartTime=wn(),e.sibling=null,n=we.current,ue(we,a?n&1|2:n&1),Zt&&Ci(t,i.treeForkCount),e):(de(t),null);case 22:case 23:return En(t),id(),i=t.memoizedState!==null,e!==null?e.memoizedState!==null!==i&&(t.flags|=8192):i&&(t.flags|=8192),i?(n&536870912)!==0&&(t.flags&128)===0&&(de(t),t.subtreeFlags&6&&(t.flags|=8192)):de(t),n=t.updateQueue,n!==null&&Ll(t,n.retryQueue),n=null,e!==null&&e.memoizedState!==null&&e.memoizedState.cachePool!==null&&(n=e.memoizedState.cachePool.pool),i=null,t.memoizedState!==null&&t.memoizedState.cachePool!==null&&(i=t.memoizedState.cachePool.pool),i!==n&&(t.flags|=2048),e!==null&&We(Qa),null;case 24:return n=null,e!==null&&(n=e.memoizedState.cache),t.memoizedState.cache!==n&&(t.flags|=2048),Pi(Ue),de(t),null;case 25:return null;case 30:return null}throw Error(W(156,t.tag))}function dM(e,t){switch(Kf(t),t.tag){case 1:return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 3:return Pi(Ue),er(),e=t.flags,(e&65536)!==0&&(e&128)===0?(t.flags=e&-65537|128,t):null;case 26:case 27:case 5:return tc(t),null;case 31:if(t.memoizedState!==null){if(En(t),t.alternate===null)throw Error(W(340));ts()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 13:if(En(t),e=t.memoizedState,e!==null&&e.dehydrated!==null){if(t.alternate===null)throw Error(W(340));ts()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 19:return We(we),null;case 4:return er(),null;case 10:return Pi(t.type),null;case 22:case 23:return En(t),id(),e!==null&&We(Qa),e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 24:return Pi(Ue),null;case 25:return null;default:return null}}function J0(e,t){switch(Kf(t),t.tag){case 3:Pi(Ue),er();break;case 26:case 27:case 5:tc(t);break;case 4:er();break;case 31:t.memoizedState!==null&&En(t);break;case 13:En(t);break;case 19:We(we);break;case 10:Pi(t.type);break;case 22:case 23:En(t),id(),e!==null&&We(Qa);break;case 24:Pi(Ue)}}function Zo(e,t){try{var n=t.updateQueue,i=n!==null?n.lastEffect:null;if(i!==null){var a=i.next;n=a;do{if((n.tag&e)===e){i=void 0;var s=n.create,r=n.inst;i=s(),r.destroy=i}n=n.next}while(n!==a)}}catch(o){ne(t,t.return,o)}}function Aa(e,t,n){try{var i=t.updateQueue,a=i!==null?i.lastEffect:null;if(a!==null){var s=a.next;i=s;do{if((i.tag&e)===e){var r=i.inst,o=r.destroy;if(o!==void 0){r.destroy=void 0,a=t;var l=n,c=o;try{c()}catch(h){ne(a,l,h)}}}i=i.next}while(i!==s)}}catch(h){ne(t,t.return,h)}}function Q0(e){var t=e.updateQueue;if(t!==null){var n=e.stateNode;try{r0(t,n)}catch(i){ne(e,e.return,i)}}}function K0(e,t,n){n.props=as(e.type,e.memoizedProps),n.state=e.memoizedState;try{n.componentWillUnmount()}catch(i){ne(e,t,i)}}function So(e,t){try{var n=e.ref;if(n!==null){switch(e.tag){case 26:case 27:case 5:var i=e.stateNode;break;case 30:i=e.stateNode;break;default:i=e.stateNode}typeof n=="function"?e.refCleanup=n(i):n.current=i}}catch(a){ne(e,t,a)}}function mi(e,t){var n=e.ref,i=e.refCleanup;if(n!==null)if(typeof i=="function")try{i()}catch(a){ne(e,t,a)}finally{e.refCleanup=null,e=e.alternate,e!=null&&(e.refCleanup=null)}else if(typeof n=="function")try{n(null)}catch(a){ne(e,t,a)}else n.current=null}function $0(e){var t=e.type,n=e.memoizedProps,i=e.stateNode;try{t:switch(t){case"button":case"input":case"select":case"textarea":n.autoFocus&&i.focus();break t;case"img":n.src?i.src=n.src:n.srcSet&&(i.srcset=n.srcSet)}}catch(a){ne(e,e.return,a)}}function Lh(e,t,n){try{var i=e.stateNode;NM(i,e.type,n,t),i[_n]=t}catch(a){ne(e,e.return,a)}}function tv(e){return e.tag===5||e.tag===3||e.tag===26||e.tag===27&&Ca(e.type)||e.tag===4}function Dh(e){t:for(;;){for(;e.sibling===null;){if(e.return===null||tv(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.tag===27&&Ca(e.type)||e.flags&2||e.child===null||e.tag===4)continue t;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function xf(e,t,n){var i=e.tag;if(i===5||i===6)e=e.stateNode,t?(n.nodeType===9?n.body:n.nodeName==="HTML"?n.ownerDocument.body:n).insertBefore(e,t):(t=n.nodeType===9?n.body:n.nodeName==="HTML"?n.ownerDocument.body:n,t.appendChild(e),n=n._reactRootContainer,n!=null||t.onclick!==null||(t.onclick=Ui));else if(i!==4&&(i===27&&Ca(e.type)&&(n=e.stateNode,t=null),e=e.child,e!==null))for(xf(e,t,n),e=e.sibling;e!==null;)xf(e,t,n),e=e.sibling}function pc(e,t,n){var i=e.tag;if(i===5||i===6)e=e.stateNode,t?n.insertBefore(e,t):n.appendChild(e);else if(i!==4&&(i===27&&Ca(e.type)&&(n=e.stateNode),e=e.child,e!==null))for(pc(e,t,n),e=e.sibling;e!==null;)pc(e,t,n),e=e.sibling}function ev(e){var t=e.stateNode,n=e.memoizedProps;try{for(var i=e.type,a=t.attributes;a.length;)t.removeAttributeNode(a[0]);Je(t,i,n),t[Ye]=e,t[_n]=n}catch(s){ne(e,e.return,s)}}var Li=!1,De=!1,Uh=!1,Og=typeof WeakSet=="function"?WeakSet:Set,Ge=null;function pM(e,t){if(e=e.containerInfo,wf=Tc,e=G_(e),Yf(e)){if("selectionStart"in e)var n={start:e.selectionStart,end:e.selectionEnd};else t:{n=(n=e.ownerDocument)&&n.defaultView||window;var i=n.getSelection&&n.getSelection();if(i&&i.rangeCount!==0){n=i.anchorNode;var a=i.anchorOffset,s=i.focusNode;i=i.focusOffset;try{n.nodeType,s.nodeType}catch{n=null;break t}var r=0,o=-1,l=-1,c=0,h=0,d=e,f=null;e:for(;;){for(var p;d!==n||a!==0&&d.nodeType!==3||(o=r+a),d!==s||i!==0&&d.nodeType!==3||(l=r+i),d.nodeType===3&&(r+=d.nodeValue.length),(p=d.firstChild)!==null;)f=d,d=p;for(;;){if(d===e)break e;if(f===n&&++c===a&&(o=r),f===s&&++h===i&&(l=r),(p=d.nextSibling)!==null)break;d=f,f=d.parentNode}d=p}n=o===-1||l===-1?null:{start:o,end:l}}else n=null}n=n||{start:0,end:0}}else n=null;for(Rf={focusedElem:e,selectionRange:n},Tc=!1,Ge=t;Ge!==null;)if(t=Ge,e=t.child,(t.subtreeFlags&1028)!==0&&e!==null)e.return=t,Ge=e;else for(;Ge!==null;){switch(t=Ge,s=t.alternate,e=t.flags,t.tag){case 0:if((e&4)!==0&&(e=t.updateQueue,e=e!==null?e.events:null,e!==null))for(n=0;n<e.length;n++)a=e[n],a.ref.impl=a.nextImpl;break;case 11:case 15:break;case 1:if((e&1024)!==0&&s!==null){e=void 0,n=t,a=s.memoizedProps,s=s.memoizedState,i=n.stateNode;try{var v=as(n.type,a);e=i.getSnapshotBeforeUpdate(v,s),i.__reactInternalSnapshotBeforeUpdate=e}catch(y){ne(n,n.return,y)}}break;case 3:if((e&1024)!==0){if(e=t.stateNode.containerInfo,n=e.nodeType,n===9)Lf(e);else if(n===1)switch(e.nodeName){case"HEAD":case"HTML":case"BODY":Lf(e);break;default:e.textContent=""}}break;case 5:case 26:case 27:case 6:case 4:case 17:break;default:if((e&1024)!==0)throw Error(W(163))}if(e=t.sibling,e!==null){e.return=t.return,Ge=e;break}Ge=t.return}}function nv(e,t,n){var i=n.flags;switch(n.tag){case 0:case 11:case 15:wi(e,n),i&4&&Zo(5,n);break;case 1:if(wi(e,n),i&4)if(e=n.stateNode,t===null)try{e.componentDidMount()}catch(r){ne(n,n.return,r)}else{var a=as(n.type,t.memoizedProps);t=t.memoizedState;try{e.componentDidUpdate(a,t,e.__reactInternalSnapshotBeforeUpdate)}catch(r){ne(n,n.return,r)}}i&64&&Q0(n),i&512&&So(n,n.return);break;case 3:if(wi(e,n),i&64&&(e=n.updateQueue,e!==null)){if(t=null,n.child!==null)switch(n.child.tag){case 27:case 5:t=n.child.stateNode;break;case 1:t=n.child.stateNode}try{r0(e,t)}catch(r){ne(n,n.return,r)}}break;case 27:t===null&&i&4&&ev(n);case 26:case 5:wi(e,n),t===null&&i&4&&$0(n),i&512&&So(n,n.return);break;case 12:wi(e,n);break;case 31:wi(e,n),i&4&&sv(e,n);break;case 13:wi(e,n),i&4&&rv(e,n),i&64&&(e=n.memoizedState,e!==null&&(e=e.dehydrated,e!==null&&(n=MM.bind(null,n),VM(e,n))));break;case 22:if(i=n.memoizedState!==null||Li,!i){t=t!==null&&t.memoizedState!==null||De,a=Li;var s=De;Li=i,(De=t)&&!s?Ri(e,n,(n.subtreeFlags&8772)!==0):wi(e,n),Li=a,De=s}break;case 30:break;default:wi(e,n)}}function iv(e){var t=e.alternate;t!==null&&(e.alternate=null,iv(t)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(t=e.stateNode,t!==null&&Vf(t)),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}var ye=null,pn=!1;function Ai(e,t,n){for(n=n.child;n!==null;)av(e,t,n),n=n.sibling}function av(e,t,n){if(Rn&&typeof Rn.onCommitFiberUnmount=="function")try{Rn.onCommitFiberUnmount(Vo,n)}catch{}switch(n.tag){case 26:De||mi(n,t),Ai(e,t,n),n.memoizedState?n.memoizedState.count--:n.stateNode&&(n=n.stateNode,n.parentNode.removeChild(n));break;case 27:De||mi(n,t);var i=ye,a=pn;Ca(n.type)&&(ye=n.stateNode,pn=!1),Ai(e,t,n),To(n.stateNode),ye=i,pn=a;break;case 5:De||mi(n,t);case 6:if(i=ye,a=pn,ye=null,Ai(e,t,n),ye=i,pn=a,ye!==null)if(pn)try{(ye.nodeType===9?ye.body:ye.nodeName==="HTML"?ye.ownerDocument.body:ye).removeChild(n.stateNode)}catch(s){ne(n,t,s)}else try{ye.removeChild(n.stateNode)}catch(s){ne(n,t,s)}break;case 18:ye!==null&&(pn?(e=ye,jg(e.nodeType===9?e.body:e.nodeName==="HTML"?e.ownerDocument.body:e,n.stateNode),hr(e)):jg(ye,n.stateNode));break;case 4:i=ye,a=pn,ye=n.stateNode.containerInfo,pn=!0,Ai(e,t,n),ye=i,pn=a;break;case 0:case 11:case 14:case 15:Aa(2,n,t),De||Aa(4,n,t),Ai(e,t,n);break;case 1:De||(mi(n,t),i=n.stateNode,typeof i.componentWillUnmount=="function"&&K0(n,t,i)),Ai(e,t,n);break;case 21:Ai(e,t,n);break;case 22:De=(i=De)||n.memoizedState!==null,Ai(e,t,n),De=i;break;default:Ai(e,t,n)}}function sv(e,t){if(t.memoizedState===null&&(e=t.alternate,e!==null&&(e=e.memoizedState,e!==null))){e=e.dehydrated;try{hr(e)}catch(n){ne(t,t.return,n)}}}function rv(e,t){if(t.memoizedState===null&&(e=t.alternate,e!==null&&(e=e.memoizedState,e!==null&&(e=e.dehydrated,e!==null))))try{hr(e)}catch(n){ne(t,t.return,n)}}function mM(e){switch(e.tag){case 31:case 13:case 19:var t=e.stateNode;return t===null&&(t=e.stateNode=new Og),t;case 22:return e=e.stateNode,t=e._retryCache,t===null&&(t=e._retryCache=new Og),t;default:throw Error(W(435,e.tag))}}function Dl(e,t){var n=mM(e);t.forEach(function(i){if(!n.has(i)){n.add(i);var a=EM.bind(null,e,i);i.then(a,a)}})}function fn(e,t){var n=t.deletions;if(n!==null)for(var i=0;i<n.length;i++){var a=n[i],s=e,r=t,o=r;t:for(;o!==null;){switch(o.tag){case 27:if(Ca(o.type)){ye=o.stateNode,pn=!1;break t}break;case 5:ye=o.stateNode,pn=!1;break t;case 3:case 4:ye=o.stateNode.containerInfo,pn=!0;break t}o=o.return}if(ye===null)throw Error(W(160));av(s,r,a),ye=null,pn=!1,s=a.alternate,s!==null&&(s.return=null),a.return=null}if(t.subtreeFlags&13886)for(t=t.child;t!==null;)ov(t,e),t=t.sibling}var ti=null;function ov(e,t){var n=e.alternate,i=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:fn(t,e),dn(e),i&4&&(Aa(3,e,e.return),Zo(3,e),Aa(5,e,e.return));break;case 1:fn(t,e),dn(e),i&512&&(De||n===null||mi(n,n.return)),i&64&&Li&&(e=e.updateQueue,e!==null&&(i=e.callbacks,i!==null&&(n=e.shared.hiddenCallbacks,e.shared.hiddenCallbacks=n===null?i:n.concat(i))));break;case 26:var a=ti;if(fn(t,e),dn(e),i&512&&(De||n===null||mi(n,n.return)),i&4){var s=n!==null?n.memoizedState:null;if(i=e.memoizedState,n===null)if(i===null)if(e.stateNode===null){t:{i=e.type,n=e.memoizedProps,a=a.ownerDocument||a;e:switch(i){case"title":s=a.getElementsByTagName("title")[0],(!s||s[Wo]||s[Ye]||s.namespaceURI==="http://www.w3.org/2000/svg"||s.hasAttribute("itemprop"))&&(s=a.createElement(i),a.head.insertBefore(s,a.querySelector("head > title"))),Je(s,i,n),s[Ye]=e,ke(s),i=s;break t;case"link":var r=n_("link","href",a).get(i+(n.href||""));if(r){for(var o=0;o<r.length;o++)if(s=r[o],s.getAttribute("href")===(n.href==null||n.href===""?null:n.href)&&s.getAttribute("rel")===(n.rel==null?null:n.rel)&&s.getAttribute("title")===(n.title==null?null:n.title)&&s.getAttribute("crossorigin")===(n.crossOrigin==null?null:n.crossOrigin)){r.splice(o,1);break e}}s=a.createElement(i),Je(s,i,n),a.head.appendChild(s);break;case"meta":if(r=n_("meta","content",a).get(i+(n.content||""))){for(o=0;o<r.length;o++)if(s=r[o],s.getAttribute("content")===(n.content==null?null:""+n.content)&&s.getAttribute("name")===(n.name==null?null:n.name)&&s.getAttribute("property")===(n.property==null?null:n.property)&&s.getAttribute("http-equiv")===(n.httpEquiv==null?null:n.httpEquiv)&&s.getAttribute("charset")===(n.charSet==null?null:n.charSet)){r.splice(o,1);break e}}s=a.createElement(i),Je(s,i,n),a.head.appendChild(s);break;default:throw Error(W(468,i))}s[Ye]=e,ke(s),i=s}e.stateNode=i}else i_(a,e.type,e.stateNode);else e.stateNode=e_(a,i,e.memoizedProps);else s!==i?(s===null?n.stateNode!==null&&(n=n.stateNode,n.parentNode.removeChild(n)):s.count--,i===null?i_(a,e.type,e.stateNode):e_(a,i,e.memoizedProps)):i===null&&e.stateNode!==null&&Lh(e,e.memoizedProps,n.memoizedProps)}break;case 27:fn(t,e),dn(e),i&512&&(De||n===null||mi(n,n.return)),n!==null&&i&4&&Lh(e,e.memoizedProps,n.memoizedProps);break;case 5:if(fn(t,e),dn(e),i&512&&(De||n===null||mi(n,n.return)),e.flags&32){a=e.stateNode;try{ir(a,"")}catch(v){ne(e,e.return,v)}}i&4&&e.stateNode!=null&&(a=e.memoizedProps,Lh(e,a,n!==null?n.memoizedProps:a)),i&1024&&(Uh=!0);break;case 6:if(fn(t,e),dn(e),i&4){if(e.stateNode===null)throw Error(W(162));i=e.memoizedProps,n=e.stateNode;try{n.nodeValue=i}catch(v){ne(e,e.return,v)}}break;case 3:if(jl=null,a=ti,ti=bc(t.containerInfo),fn(t,e),ti=a,dn(e),i&4&&n!==null&&n.memoizedState.isDehydrated)try{hr(t.containerInfo)}catch(v){ne(e,e.return,v)}Uh&&(Uh=!1,lv(e));break;case 4:i=ti,ti=bc(e.stateNode.containerInfo),fn(t,e),dn(e),ti=i;break;case 12:fn(t,e),dn(e);break;case 31:fn(t,e),dn(e),i&4&&(i=e.updateQueue,i!==null&&(e.updateQueue=null,Dl(e,i)));break;case 13:fn(t,e),dn(e),e.child.flags&8192&&e.memoizedState!==null!=(n!==null&&n.memoizedState!==null)&&(Bc=wn()),i&4&&(i=e.updateQueue,i!==null&&(e.updateQueue=null,Dl(e,i)));break;case 22:a=e.memoizedState!==null;var l=n!==null&&n.memoizedState!==null,c=Li,h=De;if(Li=c||a,De=h||l,fn(t,e),De=h,Li=c,dn(e),i&8192)t:for(t=e.stateNode,t._visibility=a?t._visibility&-2:t._visibility|1,a&&(n===null||l||Li||De||Za(e)),n=null,t=e;;){if(t.tag===5||t.tag===26){if(n===null){l=n=t;try{if(s=l.stateNode,a)r=s.style,typeof r.setProperty=="function"?r.setProperty("display","none","important"):r.display="none";else{o=l.stateNode;var d=l.memoizedProps.style,f=d!=null&&d.hasOwnProperty("display")?d.display:null;o.style.display=f==null||typeof f=="boolean"?"":(""+f).trim()}}catch(v){ne(l,l.return,v)}}}else if(t.tag===6){if(n===null){l=t;try{l.stateNode.nodeValue=a?"":l.memoizedProps}catch(v){ne(l,l.return,v)}}}else if(t.tag===18){if(n===null){l=t;try{var p=l.stateNode;a?Jg(p,!0):Jg(l.stateNode,!1)}catch(v){ne(l,l.return,v)}}}else if((t.tag!==22&&t.tag!==23||t.memoizedState===null||t===e)&&t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break t;for(;t.sibling===null;){if(t.return===null||t.return===e)break t;n===t&&(n=null),t=t.return}n===t&&(n=null),t.sibling.return=t.return,t=t.sibling}i&4&&(i=e.updateQueue,i!==null&&(n=i.retryQueue,n!==null&&(i.retryQueue=null,Dl(e,n))));break;case 19:fn(t,e),dn(e),i&4&&(i=e.updateQueue,i!==null&&(e.updateQueue=null,Dl(e,i)));break;case 30:break;case 21:break;default:fn(t,e),dn(e)}}function dn(e){var t=e.flags;if(t&2){try{for(var n,i=e.return;i!==null;){if(tv(i)){n=i;break}i=i.return}if(n==null)throw Error(W(160));switch(n.tag){case 27:var a=n.stateNode,s=Dh(e);pc(e,s,a);break;case 5:var r=n.stateNode;n.flags&32&&(ir(r,""),n.flags&=-33);var o=Dh(e);pc(e,o,r);break;case 3:case 4:var l=n.stateNode.containerInfo,c=Dh(e);xf(e,c,l);break;default:throw Error(W(161))}}catch(h){ne(e,e.return,h)}e.flags&=-3}t&4096&&(e.flags&=-4097)}function lv(e){if(e.subtreeFlags&1024)for(e=e.child;e!==null;){var t=e;lv(t),t.tag===5&&t.flags&1024&&t.stateNode.reset(),e=e.sibling}}function wi(e,t){if(t.subtreeFlags&8772)for(t=t.child;t!==null;)nv(e,t.alternate,t),t=t.sibling}function Za(e){for(e=e.child;e!==null;){var t=e;switch(t.tag){case 0:case 11:case 14:case 15:Aa(4,t,t.return),Za(t);break;case 1:mi(t,t.return);var n=t.stateNode;typeof n.componentWillUnmount=="function"&&K0(t,t.return,n),Za(t);break;case 27:To(t.stateNode);case 26:case 5:mi(t,t.return),Za(t);break;case 22:t.memoizedState===null&&Za(t);break;case 30:Za(t);break;default:Za(t)}e=e.sibling}}function Ri(e,t,n){for(n=n&&(t.subtreeFlags&8772)!==0,t=t.child;t!==null;){var i=t.alternate,a=e,s=t,r=s.flags;switch(s.tag){case 0:case 11:case 15:Ri(a,s,n),Zo(4,s);break;case 1:if(Ri(a,s,n),i=s,a=i.stateNode,typeof a.componentDidMount=="function")try{a.componentDidMount()}catch(c){ne(i,i.return,c)}if(i=s,a=i.updateQueue,a!==null){var o=i.stateNode;try{var l=a.shared.hiddenCallbacks;if(l!==null)for(a.shared.hiddenCallbacks=null,a=0;a<l.length;a++)s0(l[a],o)}catch(c){ne(i,i.return,c)}}n&&r&64&&Q0(s),So(s,s.return);break;case 27:ev(s);case 26:case 5:Ri(a,s,n),n&&i===null&&r&4&&$0(s),So(s,s.return);break;case 12:Ri(a,s,n);break;case 31:Ri(a,s,n),n&&r&4&&sv(a,s);break;case 13:Ri(a,s,n),n&&r&4&&rv(a,s);break;case 22:s.memoizedState===null&&Ri(a,s,n),So(s,s.return);break;case 30:break;default:Ri(a,s,n)}t=t.sibling}}function yd(e,t){var n=null;e!==null&&e.memoizedState!==null&&e.memoizedState.cachePool!==null&&(n=e.memoizedState.cachePool.pool),e=null,t.memoizedState!==null&&t.memoizedState.cachePool!==null&&(e=t.memoizedState.cachePool.pool),e!==n&&(e!=null&&e.refCount++,n!=null&&qo(n))}function xd(e,t){e=null,t.alternate!==null&&(e=t.alternate.memoizedState.cache),t=t.memoizedState.cache,t!==e&&(t.refCount++,e!=null&&qo(e))}function $n(e,t,n,i){if(t.subtreeFlags&10256)for(t=t.child;t!==null;)cv(e,t,n,i),t=t.sibling}function cv(e,t,n,i){var a=t.flags;switch(t.tag){case 0:case 11:case 15:$n(e,t,n,i),a&2048&&Zo(9,t);break;case 1:$n(e,t,n,i);break;case 3:$n(e,t,n,i),a&2048&&(e=null,t.alternate!==null&&(e=t.alternate.memoizedState.cache),t=t.memoizedState.cache,t!==e&&(t.refCount++,e!=null&&qo(e)));break;case 12:if(a&2048){$n(e,t,n,i),e=t.stateNode;try{var s=t.memoizedProps,r=s.id,o=s.onPostCommit;typeof o=="function"&&o(r,t.alternate===null?"mount":"update",e.passiveEffectDuration,-0)}catch(l){ne(t,t.return,l)}}else $n(e,t,n,i);break;case 31:$n(e,t,n,i);break;case 13:$n(e,t,n,i);break;case 23:break;case 22:s=t.stateNode,r=t.alternate,t.memoizedState!==null?s._visibility&2?$n(e,t,n,i):bo(e,t):s._visibility&2?$n(e,t,n,i):(s._visibility|=2,Os(e,t,n,i,(t.subtreeFlags&10256)!==0||!1)),a&2048&&yd(r,t);break;case 24:$n(e,t,n,i),a&2048&&xd(t.alternate,t);break;default:$n(e,t,n,i)}}function Os(e,t,n,i,a){for(a=a&&((t.subtreeFlags&10256)!==0||!1),t=t.child;t!==null;){var s=e,r=t,o=n,l=i,c=r.flags;switch(r.tag){case 0:case 11:case 15:Os(s,r,o,l,a),Zo(8,r);break;case 23:break;case 22:var h=r.stateNode;r.memoizedState!==null?h._visibility&2?Os(s,r,o,l,a):bo(s,r):(h._visibility|=2,Os(s,r,o,l,a)),a&&c&2048&&yd(r.alternate,r);break;case 24:Os(s,r,o,l,a),a&&c&2048&&xd(r.alternate,r);break;default:Os(s,r,o,l,a)}t=t.sibling}}function bo(e,t){if(t.subtreeFlags&10256)for(t=t.child;t!==null;){var n=e,i=t,a=i.flags;switch(i.tag){case 22:bo(n,i),a&2048&&yd(i.alternate,i);break;case 24:bo(n,i),a&2048&&xd(i.alternate,i);break;default:bo(n,i)}t=t.sibling}}var ho=8192;function Ns(e,t,n){if(e.subtreeFlags&ho)for(e=e.child;e!==null;)uv(e,t,n),e=e.sibling}function uv(e,t,n){switch(e.tag){case 26:Ns(e,t,n),e.flags&ho&&e.memoizedState!==null&&$M(n,ti,e.memoizedState,e.memoizedProps);break;case 5:Ns(e,t,n);break;case 3:case 4:var i=ti;ti=bc(e.stateNode.containerInfo),Ns(e,t,n),ti=i;break;case 22:e.memoizedState===null&&(i=e.alternate,i!==null&&i.memoizedState!==null?(i=ho,ho=16777216,Ns(e,t,n),ho=i):Ns(e,t,n));break;default:Ns(e,t,n)}}function hv(e){var t=e.alternate;if(t!==null&&(e=t.child,e!==null)){t.child=null;do t=e.sibling,e.sibling=null,e=t;while(e!==null)}}function ao(e){var t=e.deletions;if((e.flags&16)!==0){if(t!==null)for(var n=0;n<t.length;n++){var i=t[n];Ge=i,dv(i,e)}hv(e)}if(e.subtreeFlags&10256)for(e=e.child;e!==null;)fv(e),e=e.sibling}function fv(e){switch(e.tag){case 0:case 11:case 15:ao(e),e.flags&2048&&Aa(9,e,e.return);break;case 3:ao(e);break;case 12:ao(e);break;case 22:var t=e.stateNode;e.memoizedState!==null&&t._visibility&2&&(e.return===null||e.return.tag!==13)?(t._visibility&=-3,Yl(e)):ao(e);break;default:ao(e)}}function Yl(e){var t=e.deletions;if((e.flags&16)!==0){if(t!==null)for(var n=0;n<t.length;n++){var i=t[n];Ge=i,dv(i,e)}hv(e)}for(e=e.child;e!==null;){switch(t=e,t.tag){case 0:case 11:case 15:Aa(8,t,t.return),Yl(t);break;case 22:n=t.stateNode,n._visibility&2&&(n._visibility&=-3,Yl(t));break;default:Yl(t)}e=e.sibling}}function dv(e,t){for(;Ge!==null;){var n=Ge;switch(n.tag){case 0:case 11:case 15:Aa(8,n,t);break;case 23:case 22:if(n.memoizedState!==null&&n.memoizedState.cachePool!==null){var i=n.memoizedState.cachePool.pool;i!=null&&i.refCount++}break;case 24:qo(n.memoizedState.cache)}if(i=n.child,i!==null)i.return=n,Ge=i;else t:for(n=e;Ge!==null;){i=Ge;var a=i.sibling,s=i.return;if(iv(i),i===n){Ge=null;break t}if(a!==null){a.return=s,Ge=a;break t}Ge=s}}}var gM={getCacheForType:function(e){var t=je(Ue),n=t.data.get(e);return n===void 0&&(n=e(),t.data.set(e,n)),n},cacheSignal:function(){return je(Ue).controller.signal}},_M=typeof WeakMap=="function"?WeakMap:Map,Kt=0,le=null,Xt=null,Yt=0,ee=0,Mn=null,fa=!1,gr=!1,Sd=!1,Vi=0,Ee=0,wa=0,$a=0,bd=0,An=0,or=0,Mo=null,mn=null,Sf=!1,Bc=0,pv=0,mc=1/0,gc=null,ya=null,Pe=0,xa=null,lr=null,zi=0,bf=0,Mf=null,mv=null,Eo=0,Ef=null;function Ln(){return(Kt&2)!==0&&Yt!==0?Yt&-Yt:Et.T!==null?Ed():E_()}function gv(){if(An===0)if((Yt&536870912)===0||Zt){var e=Sl;Sl<<=1,(Sl&3932160)===0&&(Sl=262144),An=e}else An=536870912;return e=Un.current,e!==null&&(e.flags|=32),An}function gn(e,t,n){(e===le&&(ee===2||ee===9)||e.cancelPendingCommit!==null)&&(cr(e,0),da(e,Yt,An,!1)),ko(e,n),((Kt&2)===0||e!==le)&&(e===le&&((Kt&2)===0&&($a|=n),Ee===4&&da(e,Yt,An,!1)),vi(e))}function _v(e,t,n){if((Kt&6)!==0)throw Error(W(327));var i=!n&&(t&127)===0&&(t&e.expiredLanes)===0||Go(e,t),a=i?xM(e,t):Nh(e,t,!0),s=i;do{if(a===0){gr&&!i&&da(e,t,0,!1);break}else{if(n=e.current.alternate,s&&!vM(n)){a=Nh(e,t,!1),s=!1;continue}if(a===2){if(s=t,e.errorRecoveryDisabledLanes&s)var r=0;else r=e.pendingLanes&-536870913,r=r!==0?r:r&536870912?536870912:0;if(r!==0){t=r;t:{var o=e;a=Mo;var l=o.current.memoizedState.isDehydrated;if(l&&(cr(o,r).flags|=256),r=Nh(o,r,!1),r!==2){if(Sd&&!l){o.errorRecoveryDisabledLanes|=s,$a|=s,a=4;break t}s=mn,mn=a,s!==null&&(mn===null?mn=s:mn.push.apply(mn,s))}a=r}if(s=!1,a!==2)continue}}if(a===1){cr(e,0),da(e,t,0,!0);break}t:{switch(i=e,s=a,s){case 0:case 1:throw Error(W(345));case 4:if((t&4194048)!==t)break;case 6:da(i,t,An,!fa);break t;case 2:mn=null;break;case 3:case 5:break;default:throw Error(W(329))}if((t&62914560)===t&&(a=Bc+300-wn(),10<a)){if(da(i,t,An,!fa),wc(i,0,!0)!==0)break t;zi=t,i.timeoutHandle=Iv(Pg.bind(null,i,n,mn,gc,Sf,t,An,$a,or,fa,s,"Throttled",-0,0),a);break t}Pg(i,n,mn,gc,Sf,t,An,$a,or,fa,s,null,-0,0)}}break}while(!0);vi(e)}function Pg(e,t,n,i,a,s,r,o,l,c,h,d,f,p){if(e.timeoutHandle=-1,d=t.subtreeFlags,d&8192||(d&16785408)===16785408){d={stylesheets:null,count:0,imgCount:0,imgBytes:0,suspenseyImages:[],waitingForImages:!0,waitingForViewTransition:!1,unsuspend:Ui},uv(t,s,d);var v=(s&62914560)===s?Bc-wn():(s&4194048)===s?pv-wn():0;if(v=t1(d,v),v!==null){zi=s,e.cancelPendingCommit=v(Ig.bind(null,e,t,s,n,i,a,r,o,l,h,d,null,f,p)),da(e,s,r,!c);return}}Ig(e,t,s,n,i,a,r,o,l)}function vM(e){for(var t=e;;){var n=t.tag;if((n===0||n===11||n===15)&&t.flags&16384&&(n=t.updateQueue,n!==null&&(n=n.stores,n!==null)))for(var i=0;i<n.length;i++){var a=n[i],s=a.getSnapshot;a=a.value;try{if(!Dn(s(),a))return!1}catch{return!1}}if(n=t.child,t.subtreeFlags&16384&&n!==null)n.return=t,t=n;else{if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return!0;t=t.return}t.sibling.return=t.return,t=t.sibling}}return!0}function da(e,t,n,i){t&=~bd,t&=~$a,e.suspendedLanes|=t,e.pingedLanes&=~t,i&&(e.warmLanes|=t),i=e.expirationTimes;for(var a=t;0<a;){var s=31-Cn(a),r=1<<s;i[s]=-1,a&=~r}n!==0&&S_(e,n,t)}function Fc(){return(Kt&6)===0?(jo(0,!1),!1):!0}function Md(){if(Xt!==null){if(ee===0)var e=Xt.return;else e=Xt,Ni=cs=null,ld(e),Ks=null,Uo=0,e=Xt;for(;e!==null;)J0(e.alternate,e),e=e.return;Xt=null}}function cr(e,t){var n=e.timeoutHandle;n!==-1&&(e.timeoutHandle=-1,zM(n)),n=e.cancelPendingCommit,n!==null&&(e.cancelPendingCommit=null,n()),zi=0,Md(),le=e,Xt=n=Oi(e.current,null),Yt=t,ee=0,Mn=null,fa=!1,gr=Go(e,t),Sd=!1,or=An=bd=$a=wa=Ee=0,mn=Mo=null,Sf=!1,(t&8)!==0&&(t|=t&32);var i=e.entangledLanes;if(i!==0)for(e=e.entanglements,i&=t;0<i;){var a=31-Cn(i),s=1<<a;t|=e[a],i&=~s}return Vi=t,Dc(),n}function vv(e,t){It=null,Et.H=Oo,t===mr||t===Nc?(t=dg(),ee=3):t===ed?(t=dg(),ee=4):ee=t===_d?8:t!==null&&typeof t=="object"&&typeof t.then=="function"?6:1,Mn=t,Xt===null&&(Ee=1,fc(e,Wn(t,e.current)))}function yv(){var e=Un.current;return e===null?!0:(Yt&4194048)===Yt?qn===null:(Yt&62914560)===Yt||(Yt&536870912)!==0?e===qn:!1}function xv(){var e=Et.H;return Et.H=Oo,e===null?Oo:e}function Sv(){var e=Et.A;return Et.A=gM,e}function _c(){Ee=4,fa||(Yt&4194048)!==Yt&&Un.current!==null||(gr=!0),(wa&134217727)===0&&($a&134217727)===0||le===null||da(le,Yt,An,!1)}function Nh(e,t,n){var i=Kt;Kt|=2;var a=xv(),s=Sv();(le!==e||Yt!==t)&&(gc=null,cr(e,t)),t=!1;var r=Ee;t:do try{if(ee!==0&&Xt!==null){var o=Xt,l=Mn;switch(ee){case 8:Md(),r=6;break t;case 3:case 2:case 9:case 6:Un.current===null&&(t=!0);var c=ee;if(ee=0,Mn=null,Ys(e,o,l,c),n&&gr){r=0;break t}break;default:c=ee,ee=0,Mn=null,Ys(e,o,l,c)}}yM(),r=Ee;break}catch(h){vv(e,h)}while(!0);return t&&e.shellSuspendCounter++,Ni=cs=null,Kt=i,Et.H=a,Et.A=s,Xt===null&&(le=null,Yt=0,Dc()),r}function yM(){for(;Xt!==null;)bv(Xt)}function xM(e,t){var n=Kt;Kt|=2;var i=xv(),a=Sv();le!==e||Yt!==t?(gc=null,mc=wn()+500,cr(e,t)):gr=Go(e,t);t:do try{if(ee!==0&&Xt!==null){t=Xt;var s=Mn;e:switch(ee){case 1:ee=0,Mn=null,Ys(e,t,s,1);break;case 2:case 9:if(fg(s)){ee=0,Mn=null,zg(t);break}t=function(){ee!==2&&ee!==9||le!==e||(ee=7),vi(e)},s.then(t,t);break t;case 3:ee=7;break t;case 4:ee=5;break t;case 7:fg(s)?(ee=0,Mn=null,zg(t)):(ee=0,Mn=null,Ys(e,t,s,7));break;case 5:var r=null;switch(Xt.tag){case 26:r=Xt.memoizedState;case 5:case 27:var o=Xt;if(r?Gv(r):o.stateNode.complete){ee=0,Mn=null;var l=o.sibling;if(l!==null)Xt=l;else{var c=o.return;c!==null?(Xt=c,Hc(c)):Xt=null}break e}}ee=0,Mn=null,Ys(e,t,s,5);break;case 6:ee=0,Mn=null,Ys(e,t,s,6);break;case 8:Md(),Ee=6;break t;default:throw Error(W(462))}}SM();break}catch(h){vv(e,h)}while(!0);return Ni=cs=null,Et.H=i,Et.A=a,Kt=n,Xt!==null?0:(le=null,Yt=0,Dc(),Ee)}function SM(){for(;Xt!==null&&!WS();)bv(Xt)}function bv(e){var t=j0(e.alternate,e,Vi);e.memoizedProps=e.pendingProps,t===null?Hc(e):Xt=t}function zg(e){var t=e,n=t.alternate;switch(t.tag){case 15:case 0:t=Cg(n,t,t.pendingProps,t.type,void 0,Yt);break;case 11:t=Cg(n,t,t.pendingProps,t.type.render,t.ref,Yt);break;case 5:ld(t);default:J0(n,t),t=Xt=J_(t,Vi),t=j0(n,t,Vi)}e.memoizedProps=e.pendingProps,t===null?Hc(e):Xt=t}function Ys(e,t,n,i){Ni=cs=null,ld(t),Ks=null,Uo=0;var a=t.return;try{if(cM(e,a,t,n,Yt)){Ee=1,fc(e,Wn(n,e.current)),Xt=null;return}}catch(s){if(a!==null)throw Xt=a,s;Ee=1,fc(e,Wn(n,e.current)),Xt=null;return}t.flags&32768?(Zt||i===1?e=!0:gr||(Yt&536870912)!==0?e=!1:(fa=e=!0,(i===2||i===9||i===3||i===6)&&(i=Un.current,i!==null&&i.tag===13&&(i.flags|=16384))),Mv(t,e)):Hc(t)}function Hc(e){var t=e;do{if((t.flags&32768)!==0){Mv(t,fa);return}e=t.return;var n=fM(t.alternate,t,Vi);if(n!==null){Xt=n;return}if(t=t.sibling,t!==null){Xt=t;return}Xt=t=e}while(t!==null);Ee===0&&(Ee=5)}function Mv(e,t){do{var n=dM(e.alternate,e);if(n!==null){n.flags&=32767,Xt=n;return}if(n=e.return,n!==null&&(n.flags|=32768,n.subtreeFlags=0,n.deletions=null),!t&&(e=e.sibling,e!==null)){Xt=e;return}Xt=e=n}while(e!==null);Ee=6,Xt=null}function Ig(e,t,n,i,a,s,r,o,l){e.cancelPendingCommit=null;do Vc();while(Pe!==0);if((Kt&6)!==0)throw Error(W(327));if(t!==null){if(t===e.current)throw Error(W(177));if(s=t.lanes|t.childLanes,s|=Zf,tb(e,n,s,r,o,l),e===le&&(Xt=le=null,Yt=0),lr=t,xa=e,zi=n,bf=s,Mf=a,mv=i,(t.subtreeFlags&10256)!==0||(t.flags&10256)!==0?(e.callbackNode=null,e.callbackPriority=0,TM(ec,function(){return Rv(),null})):(e.callbackNode=null,e.callbackPriority=0),i=(t.flags&13878)!==0,(t.subtreeFlags&13878)!==0||i){i=Et.T,Et.T=null,a=$t.p,$t.p=2,r=Kt,Kt|=4;try{pM(e,t,n)}finally{Kt=r,$t.p=a,Et.T=i}}Pe=1,Ev(),Tv(),Av()}}function Ev(){if(Pe===1){Pe=0;var e=xa,t=lr,n=(t.flags&13878)!==0;if((t.subtreeFlags&13878)!==0||n){n=Et.T,Et.T=null;var i=$t.p;$t.p=2;var a=Kt;Kt|=4;try{ov(t,e);var s=Rf,r=G_(e.containerInfo),o=s.focusedElem,l=s.selectionRange;if(r!==o&&o&&o.ownerDocument&&V_(o.ownerDocument.documentElement,o)){if(l!==null&&Yf(o)){var c=l.start,h=l.end;if(h===void 0&&(h=c),"selectionStart"in o)o.selectionStart=c,o.selectionEnd=Math.min(h,o.value.length);else{var d=o.ownerDocument||document,f=d&&d.defaultView||window;if(f.getSelection){var p=f.getSelection(),v=o.textContent.length,y=Math.min(l.start,v),m=l.end===void 0?y:Math.min(l.end,v);!p.extend&&y>m&&(r=m,m=y,y=r);var u=sg(o,y),_=sg(o,m);if(u&&_&&(p.rangeCount!==1||p.anchorNode!==u.node||p.anchorOffset!==u.offset||p.focusNode!==_.node||p.focusOffset!==_.offset)){var g=d.createRange();g.setStart(u.node,u.offset),p.removeAllRanges(),y>m?(p.addRange(g),p.extend(_.node,_.offset)):(g.setEnd(_.node,_.offset),p.addRange(g))}}}}for(d=[],p=o;p=p.parentNode;)p.nodeType===1&&d.push({element:p,left:p.scrollLeft,top:p.scrollTop});for(typeof o.focus=="function"&&o.focus(),o=0;o<d.length;o++){var b=d[o];b.element.scrollLeft=b.left,b.element.scrollTop=b.top}}Tc=!!wf,Rf=wf=null}finally{Kt=a,$t.p=i,Et.T=n}}e.current=t,Pe=2}}function Tv(){if(Pe===2){Pe=0;var e=xa,t=lr,n=(t.flags&8772)!==0;if((t.subtreeFlags&8772)!==0||n){n=Et.T,Et.T=null;var i=$t.p;$t.p=2;var a=Kt;Kt|=4;try{nv(e,t.alternate,t)}finally{Kt=a,$t.p=i,Et.T=n}}Pe=3}}function Av(){if(Pe===4||Pe===3){Pe=0,XS();var e=xa,t=lr,n=zi,i=mv;(t.subtreeFlags&10256)!==0||(t.flags&10256)!==0?Pe=5:(Pe=0,lr=xa=null,wv(e,e.pendingLanes));var a=e.pendingLanes;if(a===0&&(ya=null),Hf(n),t=t.stateNode,Rn&&typeof Rn.onCommitFiberRoot=="function")try{Rn.onCommitFiberRoot(Vo,t,void 0,(t.current.flags&128)===128)}catch{}if(i!==null){t=Et.T,a=$t.p,$t.p=2,Et.T=null;try{for(var s=e.onRecoverableError,r=0;r<i.length;r++){var o=i[r];s(o.value,{componentStack:o.stack})}}finally{Et.T=t,$t.p=a}}(zi&3)!==0&&Vc(),vi(e),a=e.pendingLanes,(n&261930)!==0&&(a&42)!==0?e===Ef?Eo++:(Eo=0,Ef=e):Eo=0,jo(0,!1)}}function wv(e,t){(e.pooledCacheLanes&=t)===0&&(t=e.pooledCache,t!=null&&(e.pooledCache=null,qo(t)))}function Vc(){return Ev(),Tv(),Av(),Rv()}function Rv(){if(Pe!==5)return!1;var e=xa,t=bf;bf=0;var n=Hf(zi),i=Et.T,a=$t.p;try{$t.p=32>n?32:n,Et.T=null,n=Mf,Mf=null;var s=xa,r=zi;if(Pe=0,lr=xa=null,zi=0,(Kt&6)!==0)throw Error(W(331));var o=Kt;if(Kt|=4,fv(s.current),cv(s,s.current,r,n),Kt=o,jo(0,!1),Rn&&typeof Rn.onPostCommitFiberRoot=="function")try{Rn.onPostCommitFiberRoot(Vo,s)}catch{}return!0}finally{$t.p=a,Et.T=i,wv(e,t)}}function Bg(e,t,n){t=Wn(n,t),t=_f(e.stateNode,t,2),e=va(e,t,2),e!==null&&(ko(e,2),vi(e))}function ne(e,t,n){if(e.tag===3)Bg(e,e,n);else for(;t!==null;){if(t.tag===3){Bg(t,e,n);break}else if(t.tag===1){var i=t.stateNode;if(typeof t.type.getDerivedStateFromError=="function"||typeof i.componentDidCatch=="function"&&(ya===null||!ya.has(i))){e=Wn(n,e),n=k0(2),i=va(t,n,2),i!==null&&(W0(n,i,t,e),ko(i,2),vi(i));break}}t=t.return}}function Oh(e,t,n){var i=e.pingCache;if(i===null){i=e.pingCache=new _M;var a=new Set;i.set(t,a)}else a=i.get(t),a===void 0&&(a=new Set,i.set(t,a));a.has(n)||(Sd=!0,a.add(n),e=bM.bind(null,e,t,n),t.then(e,e))}function bM(e,t,n){var i=e.pingCache;i!==null&&i.delete(t),e.pingedLanes|=e.suspendedLanes&n,e.warmLanes&=~n,le===e&&(Yt&n)===n&&(Ee===4||Ee===3&&(Yt&62914560)===Yt&&300>wn()-Bc?(Kt&2)===0&&cr(e,0):bd|=n,or===Yt&&(or=0)),vi(e)}function Cv(e,t){t===0&&(t=x_()),e=ls(e,t),e!==null&&(ko(e,t),vi(e))}function MM(e){var t=e.memoizedState,n=0;t!==null&&(n=t.retryLane),Cv(e,n)}function EM(e,t){var n=0;switch(e.tag){case 31:case 13:var i=e.stateNode,a=e.memoizedState;a!==null&&(n=a.retryLane);break;case 19:i=e.stateNode;break;case 22:i=e.stateNode._retryCache;break;default:throw Error(W(314))}i!==null&&i.delete(t),Cv(e,n)}function TM(e,t){return Bf(e,t)}var vc=null,Ps=null,Tf=!1,yc=!1,Ph=!1,pa=0;function vi(e){e!==Ps&&e.next===null&&(Ps===null?vc=Ps=e:Ps=Ps.next=e),yc=!0,Tf||(Tf=!0,wM())}function jo(e,t){if(!Ph&&yc){Ph=!0;do for(var n=!1,i=vc;i!==null;){if(!t)if(e!==0){var a=i.pendingLanes;if(a===0)var s=0;else{var r=i.suspendedLanes,o=i.pingedLanes;s=(1<<31-Cn(42|e)+1)-1,s&=a&~(r&~o),s=s&201326741?s&201326741|1:s?s|2:0}s!==0&&(n=!0,Fg(i,s))}else s=Yt,s=wc(i,i===le?s:0,i.cancelPendingCommit!==null||i.timeoutHandle!==-1),(s&3)===0||Go(i,s)||(n=!0,Fg(i,s));i=i.next}while(n);Ph=!1}}function AM(){Lv()}function Lv(){yc=Tf=!1;var e=0;pa!==0&&PM()&&(e=pa);for(var t=wn(),n=null,i=vc;i!==null;){var a=i.next,s=Dv(i,t);s===0?(i.next=null,n===null?vc=a:n.next=a,a===null&&(Ps=n)):(n=i,(e!==0||(s&3)!==0)&&(yc=!0)),i=a}Pe!==0&&Pe!==5||jo(e,!1),pa!==0&&(pa=0)}function Dv(e,t){for(var n=e.suspendedLanes,i=e.pingedLanes,a=e.expirationTimes,s=e.pendingLanes&-62914561;0<s;){var r=31-Cn(s),o=1<<r,l=a[r];l===-1?((o&n)===0||(o&i)!==0)&&(a[r]=$S(o,t)):l<=t&&(e.expiredLanes|=o),s&=~o}if(t=le,n=Yt,n=wc(e,e===t?n:0,e.cancelPendingCommit!==null||e.timeoutHandle!==-1),i=e.callbackNode,n===0||e===t&&(ee===2||ee===9)||e.cancelPendingCommit!==null)return i!==null&&i!==null&&uh(i),e.callbackNode=null,e.callbackPriority=0;if((n&3)===0||Go(e,n)){if(t=n&-n,t===e.callbackPriority)return t;switch(i!==null&&uh(i),Hf(n)){case 2:case 8:n=v_;break;case 32:n=ec;break;case 268435456:n=y_;break;default:n=ec}return i=Uv.bind(null,e),n=Bf(n,i),e.callbackPriority=t,e.callbackNode=n,t}return i!==null&&i!==null&&uh(i),e.callbackPriority=2,e.callbackNode=null,2}function Uv(e,t){if(Pe!==0&&Pe!==5)return e.callbackNode=null,e.callbackPriority=0,null;var n=e.callbackNode;if(Vc()&&e.callbackNode!==n)return null;var i=Yt;return i=wc(e,e===le?i:0,e.cancelPendingCommit!==null||e.timeoutHandle!==-1),i===0?null:(_v(e,i,t),Dv(e,wn()),e.callbackNode!=null&&e.callbackNode===n?Uv.bind(null,e):null)}function Fg(e,t){if(Vc())return null;_v(e,t,!0)}function wM(){IM(function(){(Kt&6)!==0?Bf(__,AM):Lv()})}function Ed(){if(pa===0){var e=ar;e===0&&(e=xl,xl<<=1,(xl&261888)===0&&(xl=256)),pa=e}return pa}function Hg(e){return e==null||typeof e=="symbol"||typeof e=="boolean"?null:typeof e=="function"?e:Bl(""+e)}function Vg(e,t){var n=t.ownerDocument.createElement("input");return n.name=t.name,n.value=t.value,e.id&&n.setAttribute("form",e.id),t.parentNode.insertBefore(n,t),e=new FormData(e),n.parentNode.removeChild(n),e}function RM(e,t,n,i,a){if(t==="submit"&&n&&n.stateNode===a){var s=Hg((a[_n]||null).action),r=i.submitter;r&&(t=(t=r[_n]||null)?Hg(t.formAction):r.getAttribute("formAction"),t!==null&&(s=t,r=null));var o=new Rc("action","action",null,i,a);e.push({event:o,listeners:[{instance:null,listener:function(){if(i.defaultPrevented){if(pa!==0){var l=r?Vg(a,r):new FormData(a);mf(n,{pending:!0,data:l,method:a.method,action:s},null,l)}}else typeof s=="function"&&(o.preventDefault(),l=r?Vg(a,r):new FormData(a),mf(n,{pending:!0,data:l,method:a.method,action:s},s,l))},currentTarget:a}]})}}for(Ul=0;Ul<nf.length;Ul++)Nl=nf[Ul],Gg=Nl.toLowerCase(),kg=Nl[0].toUpperCase()+Nl.slice(1),ei(Gg,"on"+kg);var Nl,Gg,kg,Ul;ei(W_,"onAnimationEnd");ei(X_,"onAnimationIteration");ei(q_,"onAnimationStart");ei("dblclick","onDoubleClick");ei("focusin","onFocus");ei("focusout","onBlur");ei(qb,"onTransitionRun");ei(Yb,"onTransitionStart");ei(Zb,"onTransitionCancel");ei(Y_,"onTransitionEnd");nr("onMouseEnter",["mouseout","mouseover"]);nr("onMouseLeave",["mouseout","mouseover"]);nr("onPointerEnter",["pointerout","pointerover"]);nr("onPointerLeave",["pointerout","pointerover"]);ss("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));ss("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));ss("onBeforeInput",["compositionend","keypress","textInput","paste"]);ss("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));ss("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));ss("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var Po="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),CM=new Set("beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(Po));function Nv(e,t){t=(t&4)!==0;for(var n=0;n<e.length;n++){var i=e[n],a=i.event;i=i.listeners;t:{var s=void 0;if(t)for(var r=i.length-1;0<=r;r--){var o=i[r],l=o.instance,c=o.currentTarget;if(o=o.listener,l!==s&&a.isPropagationStopped())break t;s=o,a.currentTarget=c;try{s(a)}catch(h){ic(h)}a.currentTarget=null,s=l}else for(r=0;r<i.length;r++){if(o=i[r],l=o.instance,c=o.currentTarget,o=o.listener,l!==s&&a.isPropagationStopped())break t;s=o,a.currentTarget=c;try{s(a)}catch(h){ic(h)}a.currentTarget=null,s=l}}}}function Wt(e,t){var n=t[Zh];n===void 0&&(n=t[Zh]=new Set);var i=e+"__bubble";n.has(i)||(Ov(t,e,2,!1),n.add(i))}function zh(e,t,n){var i=0;t&&(i|=4),Ov(n,e,i,t)}var Ol="_reactListening"+Math.random().toString(36).slice(2);function Td(e){if(!e[Ol]){e[Ol]=!0,T_.forEach(function(n){n!=="selectionchange"&&(CM.has(n)||zh(n,!1,e),zh(n,!0,e))});var t=e.nodeType===9?e:e.ownerDocument;t===null||t[Ol]||(t[Ol]=!0,zh("selectionchange",!1,t))}}function Ov(e,t,n,i){switch(Yv(t)){case 2:var a=i1;break;case 8:a=a1;break;default:a=Cd}n=a.bind(null,t,n,e),a=void 0,!$h||t!=="touchstart"&&t!=="touchmove"&&t!=="wheel"||(a=!0),i?a!==void 0?e.addEventListener(t,n,{capture:!0,passive:a}):e.addEventListener(t,n,!0):a!==void 0?e.addEventListener(t,n,{passive:a}):e.addEventListener(t,n,!1)}function Ih(e,t,n,i,a){var s=i;if((t&1)===0&&(t&2)===0&&i!==null)t:for(;;){if(i===null)return;var r=i.tag;if(r===3||r===4){var o=i.stateNode.containerInfo;if(o===a)break;if(r===4)for(r=i.return;r!==null;){var l=r.tag;if((l===3||l===4)&&r.stateNode.containerInfo===a)return;r=r.return}for(;o!==null;){if(r=Bs(o),r===null)return;if(l=r.tag,l===5||l===6||l===26||l===27){i=s=r;continue t}o=o.parentNode}}i=i.return}N_(function(){var c=s,h=kf(n),d=[];t:{var f=Z_.get(e);if(f!==void 0){var p=Rc,v=e;switch(e){case"keypress":if(Hl(n)===0)break t;case"keydown":case"keyup":p=Eb;break;case"focusin":v="focus",p=mh;break;case"focusout":v="blur",p=mh;break;case"beforeblur":case"afterblur":p=mh;break;case"click":if(n.button===2)break t;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":p=Jm;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":p=fb;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":p=wb;break;case W_:case X_:case q_:p=mb;break;case Y_:p=Cb;break;case"scroll":case"scrollend":p=ub;break;case"wheel":p=Db;break;case"copy":case"cut":case"paste":p=_b;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":p=Km;break;case"toggle":case"beforetoggle":p=Nb}var y=(t&4)!==0,m=!y&&(e==="scroll"||e==="scrollend"),u=y?f!==null?f+"Capture":null:f;y=[];for(var _=c,g;_!==null;){var b=_;if(g=b.stateNode,b=b.tag,b!==5&&b!==26&&b!==27||g===null||u===null||(b=wo(_,u),b!=null&&y.push(zo(_,b,g))),m)break;_=_.return}0<y.length&&(f=new p(f,v,null,n,h),d.push({event:f,listeners:y}))}}if((t&7)===0){t:{if(f=e==="mouseover"||e==="pointerover",p=e==="mouseout"||e==="pointerout",f&&n!==Kh&&(v=n.relatedTarget||n.fromElement)&&(Bs(v)||v[fr]))break t;if((p||f)&&(f=h.window===h?h:(f=h.ownerDocument)?f.defaultView||f.parentWindow:window,p?(v=n.relatedTarget||n.toElement,p=c,v=v?Bs(v):null,v!==null&&(m=Ho(v),y=v.tag,v!==m||y!==5&&y!==27&&y!==6)&&(v=null)):(p=null,v=c),p!==v)){if(y=Jm,b="onMouseLeave",u="onMouseEnter",_="mouse",(e==="pointerout"||e==="pointerover")&&(y=Km,b="onPointerLeave",u="onPointerEnter",_="pointer"),m=p==null?f:co(p),g=v==null?f:co(v),f=new y(b,_+"leave",p,n,h),f.target=m,f.relatedTarget=g,b=null,Bs(h)===c&&(y=new y(u,_+"enter",v,n,h),y.target=g,y.relatedTarget=m,b=y),m=b,p&&v)e:{for(y=LM,u=p,_=v,g=0,b=u;b;b=y(b))g++;b=0;for(var T=_;T;T=y(T))b++;for(;0<g-b;)u=y(u),g--;for(;0<b-g;)_=y(_),b--;for(;g--;){if(u===_||_!==null&&u===_.alternate){y=u;break e}u=y(u),_=y(_)}y=null}else y=null;p!==null&&Wg(d,f,p,y,!1),v!==null&&m!==null&&Wg(d,m,v,y,!0)}}t:{if(f=c?co(c):window,p=f.nodeName&&f.nodeName.toLowerCase(),p==="select"||p==="input"&&f.type==="file")var R=ng;else if(eg(f))if(F_)R=kb;else{R=Vb;var w=Hb}else p=f.nodeName,!p||p.toLowerCase()!=="input"||f.type!=="checkbox"&&f.type!=="radio"?c&&Gf(c.elementType)&&(R=ng):R=Gb;if(R&&(R=R(e,c))){B_(d,R,n,h);break t}w&&w(e,f,c),e==="focusout"&&c&&f.type==="number"&&c.memoizedProps.value!=null&&Qh(f,"number",f.value)}switch(w=c?co(c):window,e){case"focusin":(eg(w)||w.contentEditable==="true")&&(Vs=w,tf=c,mo=null);break;case"focusout":mo=tf=Vs=null;break;case"mousedown":ef=!0;break;case"contextmenu":case"mouseup":case"dragend":ef=!1,rg(d,n,h);break;case"selectionchange":if(Xb)break;case"keydown":case"keyup":rg(d,n,h)}var U;if(qf)t:{switch(e){case"compositionstart":var x="onCompositionStart";break t;case"compositionend":x="onCompositionEnd";break t;case"compositionupdate":x="onCompositionUpdate";break t}x=void 0}else Hs?z_(e,n)&&(x="onCompositionEnd"):e==="keydown"&&n.keyCode===229&&(x="onCompositionStart");x&&(P_&&n.locale!=="ko"&&(Hs||x!=="onCompositionStart"?x==="onCompositionEnd"&&Hs&&(U=O_()):(ha=h,Wf="value"in ha?ha.value:ha.textContent,Hs=!0)),w=xc(c,x),0<w.length&&(x=new Qm(x,e,null,n,h),d.push({event:x,listeners:w}),U?x.data=U:(U=I_(n),U!==null&&(x.data=U)))),(U=Pb?zb(e,n):Ib(e,n))&&(x=xc(c,"onBeforeInput"),0<x.length&&(w=new Qm("onBeforeInput","beforeinput",null,n,h),d.push({event:w,listeners:x}),w.data=U)),RM(d,e,c,n,h)}Nv(d,t)})}function zo(e,t,n){return{instance:e,listener:t,currentTarget:n}}function xc(e,t){for(var n=t+"Capture",i=[];e!==null;){var a=e,s=a.stateNode;if(a=a.tag,a!==5&&a!==26&&a!==27||s===null||(a=wo(e,n),a!=null&&i.unshift(zo(e,a,s)),a=wo(e,t),a!=null&&i.push(zo(e,a,s))),e.tag===3)return i;e=e.return}return[]}function LM(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5&&e.tag!==27);return e||null}function Wg(e,t,n,i,a){for(var s=t._reactName,r=[];n!==null&&n!==i;){var o=n,l=o.alternate,c=o.stateNode;if(o=o.tag,l!==null&&l===i)break;o!==5&&o!==26&&o!==27||c===null||(l=c,a?(c=wo(n,s),c!=null&&r.unshift(zo(n,c,l))):a||(c=wo(n,s),c!=null&&r.push(zo(n,c,l)))),n=n.return}r.length!==0&&e.push({event:t,listeners:r})}var DM=/\r\n?/g,UM=/\u0000|\uFFFD/g;function Xg(e){return(typeof e=="string"?e:""+e).replace(DM,`
`).replace(UM,"")}function Pv(e,t){return t=Xg(t),Xg(e)===t}function ae(e,t,n,i,a,s){switch(n){case"children":typeof i=="string"?t==="body"||t==="textarea"&&i===""||ir(e,i):(typeof i=="number"||typeof i=="bigint")&&t!=="body"&&ir(e,""+i);break;case"className":Ml(e,"class",i);break;case"tabIndex":Ml(e,"tabindex",i);break;case"dir":case"role":case"viewBox":case"width":case"height":Ml(e,n,i);break;case"style":U_(e,i,s);break;case"data":if(t!=="object"){Ml(e,"data",i);break}case"src":case"href":if(i===""&&(t!=="a"||n!=="href")){e.removeAttribute(n);break}if(i==null||typeof i=="function"||typeof i=="symbol"||typeof i=="boolean"){e.removeAttribute(n);break}i=Bl(""+i),e.setAttribute(n,i);break;case"action":case"formAction":if(typeof i=="function"){e.setAttribute(n,"javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')");break}else typeof s=="function"&&(n==="formAction"?(t!=="input"&&ae(e,t,"name",a.name,a,null),ae(e,t,"formEncType",a.formEncType,a,null),ae(e,t,"formMethod",a.formMethod,a,null),ae(e,t,"formTarget",a.formTarget,a,null)):(ae(e,t,"encType",a.encType,a,null),ae(e,t,"method",a.method,a,null),ae(e,t,"target",a.target,a,null)));if(i==null||typeof i=="symbol"||typeof i=="boolean"){e.removeAttribute(n);break}i=Bl(""+i),e.setAttribute(n,i);break;case"onClick":i!=null&&(e.onclick=Ui);break;case"onScroll":i!=null&&Wt("scroll",e);break;case"onScrollEnd":i!=null&&Wt("scrollend",e);break;case"dangerouslySetInnerHTML":if(i!=null){if(typeof i!="object"||!("__html"in i))throw Error(W(61));if(n=i.__html,n!=null){if(a.children!=null)throw Error(W(60));e.innerHTML=n}}break;case"multiple":e.multiple=i&&typeof i!="function"&&typeof i!="symbol";break;case"muted":e.muted=i&&typeof i!="function"&&typeof i!="symbol";break;case"suppressContentEditableWarning":case"suppressHydrationWarning":case"defaultValue":case"defaultChecked":case"innerHTML":case"ref":break;case"autoFocus":break;case"xlinkHref":if(i==null||typeof i=="function"||typeof i=="boolean"||typeof i=="symbol"){e.removeAttribute("xlink:href");break}n=Bl(""+i),e.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href",n);break;case"contentEditable":case"spellCheck":case"draggable":case"value":case"autoReverse":case"externalResourcesRequired":case"focusable":case"preserveAlpha":i!=null&&typeof i!="function"&&typeof i!="symbol"?e.setAttribute(n,""+i):e.removeAttribute(n);break;case"inert":case"allowFullScreen":case"async":case"autoPlay":case"controls":case"default":case"defer":case"disabled":case"disablePictureInPicture":case"disableRemotePlayback":case"formNoValidate":case"hidden":case"loop":case"noModule":case"noValidate":case"open":case"playsInline":case"readOnly":case"required":case"reversed":case"scoped":case"seamless":case"itemScope":i&&typeof i!="function"&&typeof i!="symbol"?e.setAttribute(n,""):e.removeAttribute(n);break;case"capture":case"download":i===!0?e.setAttribute(n,""):i!==!1&&i!=null&&typeof i!="function"&&typeof i!="symbol"?e.setAttribute(n,i):e.removeAttribute(n);break;case"cols":case"rows":case"size":case"span":i!=null&&typeof i!="function"&&typeof i!="symbol"&&!isNaN(i)&&1<=i?e.setAttribute(n,i):e.removeAttribute(n);break;case"rowSpan":case"start":i==null||typeof i=="function"||typeof i=="symbol"||isNaN(i)?e.removeAttribute(n):e.setAttribute(n,i);break;case"popover":Wt("beforetoggle",e),Wt("toggle",e),Il(e,"popover",i);break;case"xlinkActuate":Ei(e,"http://www.w3.org/1999/xlink","xlink:actuate",i);break;case"xlinkArcrole":Ei(e,"http://www.w3.org/1999/xlink","xlink:arcrole",i);break;case"xlinkRole":Ei(e,"http://www.w3.org/1999/xlink","xlink:role",i);break;case"xlinkShow":Ei(e,"http://www.w3.org/1999/xlink","xlink:show",i);break;case"xlinkTitle":Ei(e,"http://www.w3.org/1999/xlink","xlink:title",i);break;case"xlinkType":Ei(e,"http://www.w3.org/1999/xlink","xlink:type",i);break;case"xmlBase":Ei(e,"http://www.w3.org/XML/1998/namespace","xml:base",i);break;case"xmlLang":Ei(e,"http://www.w3.org/XML/1998/namespace","xml:lang",i);break;case"xmlSpace":Ei(e,"http://www.w3.org/XML/1998/namespace","xml:space",i);break;case"is":Il(e,"is",i);break;case"innerText":case"textContent":break;default:(!(2<n.length)||n[0]!=="o"&&n[0]!=="O"||n[1]!=="n"&&n[1]!=="N")&&(n=lb.get(n)||n,Il(e,n,i))}}function Af(e,t,n,i,a,s){switch(n){case"style":U_(e,i,s);break;case"dangerouslySetInnerHTML":if(i!=null){if(typeof i!="object"||!("__html"in i))throw Error(W(61));if(n=i.__html,n!=null){if(a.children!=null)throw Error(W(60));e.innerHTML=n}}break;case"children":typeof i=="string"?ir(e,i):(typeof i=="number"||typeof i=="bigint")&&ir(e,""+i);break;case"onScroll":i!=null&&Wt("scroll",e);break;case"onScrollEnd":i!=null&&Wt("scrollend",e);break;case"onClick":i!=null&&(e.onclick=Ui);break;case"suppressContentEditableWarning":case"suppressHydrationWarning":case"innerHTML":case"ref":break;case"innerText":case"textContent":break;default:if(!A_.hasOwnProperty(n))t:{if(n[0]==="o"&&n[1]==="n"&&(a=n.endsWith("Capture"),t=n.slice(2,a?n.length-7:void 0),s=e[_n]||null,s=s!=null?s[n]:null,typeof s=="function"&&e.removeEventListener(t,s,a),typeof i=="function")){typeof s!="function"&&s!==null&&(n in e?e[n]=null:e.hasAttribute(n)&&e.removeAttribute(n)),e.addEventListener(t,i,a);break t}n in e?e[n]=i:i===!0?e.setAttribute(n,""):Il(e,n,i)}}}function Je(e,t,n){switch(t){case"div":case"span":case"svg":case"path":case"a":case"g":case"p":case"li":break;case"img":Wt("error",e),Wt("load",e);var i=!1,a=!1,s;for(s in n)if(n.hasOwnProperty(s)){var r=n[s];if(r!=null)switch(s){case"src":i=!0;break;case"srcSet":a=!0;break;case"children":case"dangerouslySetInnerHTML":throw Error(W(137,t));default:ae(e,t,s,r,n,null)}}a&&ae(e,t,"srcSet",n.srcSet,n,null),i&&ae(e,t,"src",n.src,n,null);return;case"input":Wt("invalid",e);var o=s=r=a=null,l=null,c=null;for(i in n)if(n.hasOwnProperty(i)){var h=n[i];if(h!=null)switch(i){case"name":a=h;break;case"type":r=h;break;case"checked":l=h;break;case"defaultChecked":c=h;break;case"value":s=h;break;case"defaultValue":o=h;break;case"children":case"dangerouslySetInnerHTML":if(h!=null)throw Error(W(137,t));break;default:ae(e,t,i,h,n,null)}}C_(e,s,o,l,c,r,a,!1);return;case"select":Wt("invalid",e),i=r=s=null;for(a in n)if(n.hasOwnProperty(a)&&(o=n[a],o!=null))switch(a){case"value":s=o;break;case"defaultValue":r=o;break;case"multiple":i=o;default:ae(e,t,a,o,n,null)}t=s,n=r,e.multiple=!!i,t!=null?js(e,!!i,t,!1):n!=null&&js(e,!!i,n,!0);return;case"textarea":Wt("invalid",e),s=a=i=null;for(r in n)if(n.hasOwnProperty(r)&&(o=n[r],o!=null))switch(r){case"value":i=o;break;case"defaultValue":a=o;break;case"children":s=o;break;case"dangerouslySetInnerHTML":if(o!=null)throw Error(W(91));break;default:ae(e,t,r,o,n,null)}D_(e,i,a,s);return;case"option":for(l in n)n.hasOwnProperty(l)&&(i=n[l],i!=null)&&(l==="selected"?e.selected=i&&typeof i!="function"&&typeof i!="symbol":ae(e,t,l,i,n,null));return;case"dialog":Wt("beforetoggle",e),Wt("toggle",e),Wt("cancel",e),Wt("close",e);break;case"iframe":case"object":Wt("load",e);break;case"video":case"audio":for(i=0;i<Po.length;i++)Wt(Po[i],e);break;case"image":Wt("error",e),Wt("load",e);break;case"details":Wt("toggle",e);break;case"embed":case"source":case"link":Wt("error",e),Wt("load",e);case"area":case"base":case"br":case"col":case"hr":case"keygen":case"meta":case"param":case"track":case"wbr":case"menuitem":for(c in n)if(n.hasOwnProperty(c)&&(i=n[c],i!=null))switch(c){case"children":case"dangerouslySetInnerHTML":throw Error(W(137,t));default:ae(e,t,c,i,n,null)}return;default:if(Gf(t)){for(h in n)n.hasOwnProperty(h)&&(i=n[h],i!==void 0&&Af(e,t,h,i,n,void 0));return}}for(o in n)n.hasOwnProperty(o)&&(i=n[o],i!=null&&ae(e,t,o,i,n,null))}function NM(e,t,n,i){switch(t){case"div":case"span":case"svg":case"path":case"a":case"g":case"p":case"li":break;case"input":var a=null,s=null,r=null,o=null,l=null,c=null,h=null;for(p in n){var d=n[p];if(n.hasOwnProperty(p)&&d!=null)switch(p){case"checked":break;case"value":break;case"defaultValue":l=d;default:i.hasOwnProperty(p)||ae(e,t,p,null,i,d)}}for(var f in i){var p=i[f];if(d=n[f],i.hasOwnProperty(f)&&(p!=null||d!=null))switch(f){case"type":s=p;break;case"name":a=p;break;case"checked":c=p;break;case"defaultChecked":h=p;break;case"value":r=p;break;case"defaultValue":o=p;break;case"children":case"dangerouslySetInnerHTML":if(p!=null)throw Error(W(137,t));break;default:p!==d&&ae(e,t,f,p,i,d)}}Jh(e,r,o,l,c,h,s,a);return;case"select":p=r=o=f=null;for(s in n)if(l=n[s],n.hasOwnProperty(s)&&l!=null)switch(s){case"value":break;case"multiple":p=l;default:i.hasOwnProperty(s)||ae(e,t,s,null,i,l)}for(a in i)if(s=i[a],l=n[a],i.hasOwnProperty(a)&&(s!=null||l!=null))switch(a){case"value":f=s;break;case"defaultValue":o=s;break;case"multiple":r=s;default:s!==l&&ae(e,t,a,s,i,l)}t=o,n=r,i=p,f!=null?js(e,!!n,f,!1):!!i!=!!n&&(t!=null?js(e,!!n,t,!0):js(e,!!n,n?[]:"",!1));return;case"textarea":p=f=null;for(o in n)if(a=n[o],n.hasOwnProperty(o)&&a!=null&&!i.hasOwnProperty(o))switch(o){case"value":break;case"children":break;default:ae(e,t,o,null,i,a)}for(r in i)if(a=i[r],s=n[r],i.hasOwnProperty(r)&&(a!=null||s!=null))switch(r){case"value":f=a;break;case"defaultValue":p=a;break;case"children":break;case"dangerouslySetInnerHTML":if(a!=null)throw Error(W(91));break;default:a!==s&&ae(e,t,r,a,i,s)}L_(e,f,p);return;case"option":for(var v in n)f=n[v],n.hasOwnProperty(v)&&f!=null&&!i.hasOwnProperty(v)&&(v==="selected"?e.selected=!1:ae(e,t,v,null,i,f));for(l in i)f=i[l],p=n[l],i.hasOwnProperty(l)&&f!==p&&(f!=null||p!=null)&&(l==="selected"?e.selected=f&&typeof f!="function"&&typeof f!="symbol":ae(e,t,l,f,i,p));return;case"img":case"link":case"area":case"base":case"br":case"col":case"embed":case"hr":case"keygen":case"meta":case"param":case"source":case"track":case"wbr":case"menuitem":for(var y in n)f=n[y],n.hasOwnProperty(y)&&f!=null&&!i.hasOwnProperty(y)&&ae(e,t,y,null,i,f);for(c in i)if(f=i[c],p=n[c],i.hasOwnProperty(c)&&f!==p&&(f!=null||p!=null))switch(c){case"children":case"dangerouslySetInnerHTML":if(f!=null)throw Error(W(137,t));break;default:ae(e,t,c,f,i,p)}return;default:if(Gf(t)){for(var m in n)f=n[m],n.hasOwnProperty(m)&&f!==void 0&&!i.hasOwnProperty(m)&&Af(e,t,m,void 0,i,f);for(h in i)f=i[h],p=n[h],!i.hasOwnProperty(h)||f===p||f===void 0&&p===void 0||Af(e,t,h,f,i,p);return}}for(var u in n)f=n[u],n.hasOwnProperty(u)&&f!=null&&!i.hasOwnProperty(u)&&ae(e,t,u,null,i,f);for(d in i)f=i[d],p=n[d],!i.hasOwnProperty(d)||f===p||f==null&&p==null||ae(e,t,d,f,i,p)}function qg(e){switch(e){case"css":case"script":case"font":case"img":case"image":case"input":case"link":return!0;default:return!1}}function OM(){if(typeof performance.getEntriesByType=="function"){for(var e=0,t=0,n=performance.getEntriesByType("resource"),i=0;i<n.length;i++){var a=n[i],s=a.transferSize,r=a.initiatorType,o=a.duration;if(s&&o&&qg(r)){for(r=0,o=a.responseEnd,i+=1;i<n.length;i++){var l=n[i],c=l.startTime;if(c>o)break;var h=l.transferSize,d=l.initiatorType;h&&qg(d)&&(l=l.responseEnd,r+=h*(l<o?1:(o-c)/(l-c)))}if(--i,t+=8*(s+r)/(a.duration/1e3),e++,10<e)break}}if(0<e)return t/e/1e6}return navigator.connection&&(e=navigator.connection.downlink,typeof e=="number")?e:5}var wf=null,Rf=null;function Sc(e){return e.nodeType===9?e:e.ownerDocument}function Yg(e){switch(e){case"http://www.w3.org/2000/svg":return 1;case"http://www.w3.org/1998/Math/MathML":return 2;default:return 0}}function zv(e,t){if(e===0)switch(t){case"svg":return 1;case"math":return 2;default:return 0}return e===1&&t==="foreignObject"?0:e}function Cf(e,t){return e==="textarea"||e==="noscript"||typeof t.children=="string"||typeof t.children=="number"||typeof t.children=="bigint"||typeof t.dangerouslySetInnerHTML=="object"&&t.dangerouslySetInnerHTML!==null&&t.dangerouslySetInnerHTML.__html!=null}var Bh=null;function PM(){var e=window.event;return e&&e.type==="popstate"?e===Bh?!1:(Bh=e,!0):(Bh=null,!1)}var Iv=typeof setTimeout=="function"?setTimeout:void 0,zM=typeof clearTimeout=="function"?clearTimeout:void 0,Zg=typeof Promise=="function"?Promise:void 0,IM=typeof queueMicrotask=="function"?queueMicrotask:typeof Zg<"u"?function(e){return Zg.resolve(null).then(e).catch(BM)}:Iv;function BM(e){setTimeout(function(){throw e})}function Ca(e){return e==="head"}function jg(e,t){var n=t,i=0;do{var a=n.nextSibling;if(e.removeChild(n),a&&a.nodeType===8)if(n=a.data,n==="/$"||n==="/&"){if(i===0){e.removeChild(a),hr(t);return}i--}else if(n==="$"||n==="$?"||n==="$~"||n==="$!"||n==="&")i++;else if(n==="html")To(e.ownerDocument.documentElement);else if(n==="head"){n=e.ownerDocument.head,To(n);for(var s=n.firstChild;s;){var r=s.nextSibling,o=s.nodeName;s[Wo]||o==="SCRIPT"||o==="STYLE"||o==="LINK"&&s.rel.toLowerCase()==="stylesheet"||n.removeChild(s),s=r}}else n==="body"&&To(e.ownerDocument.body);n=a}while(n);hr(t)}function Jg(e,t){var n=e;e=0;do{var i=n.nextSibling;if(n.nodeType===1?t?(n._stashedDisplay=n.style.display,n.style.display="none"):(n.style.display=n._stashedDisplay||"",n.getAttribute("style")===""&&n.removeAttribute("style")):n.nodeType===3&&(t?(n._stashedText=n.nodeValue,n.nodeValue=""):n.nodeValue=n._stashedText||""),i&&i.nodeType===8)if(n=i.data,n==="/$"){if(e===0)break;e--}else n!=="$"&&n!=="$?"&&n!=="$~"&&n!=="$!"||e++;n=i}while(n)}function Lf(e){var t=e.firstChild;for(t&&t.nodeType===10&&(t=t.nextSibling);t;){var n=t;switch(t=t.nextSibling,n.nodeName){case"HTML":case"HEAD":case"BODY":Lf(n),Vf(n);continue;case"SCRIPT":case"STYLE":continue;case"LINK":if(n.rel.toLowerCase()==="stylesheet")continue}e.removeChild(n)}}function FM(e,t,n,i){for(;e.nodeType===1;){var a=n;if(e.nodeName.toLowerCase()!==t.toLowerCase()){if(!i&&(e.nodeName!=="INPUT"||e.type!=="hidden"))break}else if(i){if(!e[Wo])switch(t){case"meta":if(!e.hasAttribute("itemprop"))break;return e;case"link":if(s=e.getAttribute("rel"),s==="stylesheet"&&e.hasAttribute("data-precedence"))break;if(s!==a.rel||e.getAttribute("href")!==(a.href==null||a.href===""?null:a.href)||e.getAttribute("crossorigin")!==(a.crossOrigin==null?null:a.crossOrigin)||e.getAttribute("title")!==(a.title==null?null:a.title))break;return e;case"style":if(e.hasAttribute("data-precedence"))break;return e;case"script":if(s=e.getAttribute("src"),(s!==(a.src==null?null:a.src)||e.getAttribute("type")!==(a.type==null?null:a.type)||e.getAttribute("crossorigin")!==(a.crossOrigin==null?null:a.crossOrigin))&&s&&e.hasAttribute("async")&&!e.hasAttribute("itemprop"))break;return e;default:return e}}else if(t==="input"&&e.type==="hidden"){var s=a.name==null?null:""+a.name;if(a.type==="hidden"&&e.getAttribute("name")===s)return e}else return e;if(e=Yn(e.nextSibling),e===null)break}return null}function HM(e,t,n){if(t==="")return null;for(;e.nodeType!==3;)if((e.nodeType!==1||e.nodeName!=="INPUT"||e.type!=="hidden")&&!n||(e=Yn(e.nextSibling),e===null))return null;return e}function Bv(e,t){for(;e.nodeType!==8;)if((e.nodeType!==1||e.nodeName!=="INPUT"||e.type!=="hidden")&&!t||(e=Yn(e.nextSibling),e===null))return null;return e}function Df(e){return e.data==="$?"||e.data==="$~"}function Uf(e){return e.data==="$!"||e.data==="$?"&&e.ownerDocument.readyState!=="loading"}function VM(e,t){var n=e.ownerDocument;if(e.data==="$~")e._reactRetry=t;else if(e.data!=="$?"||n.readyState!=="loading")t();else{var i=function(){t(),n.removeEventListener("DOMContentLoaded",i)};n.addEventListener("DOMContentLoaded",i),e._reactRetry=i}}function Yn(e){for(;e!=null;e=e.nextSibling){var t=e.nodeType;if(t===1||t===3)break;if(t===8){if(t=e.data,t==="$"||t==="$!"||t==="$?"||t==="$~"||t==="&"||t==="F!"||t==="F")break;if(t==="/$"||t==="/&")return null}}return e}var Nf=null;function Qg(e){e=e.nextSibling;for(var t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="/$"||n==="/&"){if(t===0)return Yn(e.nextSibling);t--}else n!=="$"&&n!=="$!"&&n!=="$?"&&n!=="$~"&&n!=="&"||t++}e=e.nextSibling}return null}function Kg(e){e=e.previousSibling;for(var t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="$"||n==="$!"||n==="$?"||n==="$~"||n==="&"){if(t===0)return e;t--}else n!=="/$"&&n!=="/&"||t++}e=e.previousSibling}return null}function Fv(e,t,n){switch(t=Sc(n),e){case"html":if(e=t.documentElement,!e)throw Error(W(452));return e;case"head":if(e=t.head,!e)throw Error(W(453));return e;case"body":if(e=t.body,!e)throw Error(W(454));return e;default:throw Error(W(451))}}function To(e){for(var t=e.attributes;t.length;)e.removeAttributeNode(t[0]);Vf(e)}var Zn=new Map,$g=new Set;function bc(e){return typeof e.getRootNode=="function"?e.getRootNode():e.nodeType===9?e:e.ownerDocument}var Gi=$t.d;$t.d={f:GM,r:kM,D:WM,C:XM,L:qM,m:YM,X:jM,S:ZM,M:JM};function GM(){var e=Gi.f(),t=Fc();return e||t}function kM(e){var t=dr(e);t!==null&&t.tag===5&&t.type==="form"?U0(t):Gi.r(e)}var _r=typeof document>"u"?null:document;function Hv(e,t,n){var i=_r;if(i&&typeof t=="string"&&t){var a=kn(t);a='link[rel="'+e+'"][href="'+a+'"]',typeof n=="string"&&(a+='[crossorigin="'+n+'"]'),$g.has(a)||($g.add(a),e={rel:e,crossOrigin:n,href:t},i.querySelector(a)===null&&(t=i.createElement("link"),Je(t,"link",e),ke(t),i.head.appendChild(t)))}}function WM(e){Gi.D(e),Hv("dns-prefetch",e,null)}function XM(e,t){Gi.C(e,t),Hv("preconnect",e,t)}function qM(e,t,n){Gi.L(e,t,n);var i=_r;if(i&&e&&t){var a='link[rel="preload"][as="'+kn(t)+'"]';t==="image"&&n&&n.imageSrcSet?(a+='[imagesrcset="'+kn(n.imageSrcSet)+'"]',typeof n.imageSizes=="string"&&(a+='[imagesizes="'+kn(n.imageSizes)+'"]')):a+='[href="'+kn(e)+'"]';var s=a;switch(t){case"style":s=ur(e);break;case"script":s=vr(e)}Zn.has(s)||(e=me({rel:"preload",href:t==="image"&&n&&n.imageSrcSet?void 0:e,as:t},n),Zn.set(s,e),i.querySelector(a)!==null||t==="style"&&i.querySelector(Jo(s))||t==="script"&&i.querySelector(Qo(s))||(t=i.createElement("link"),Je(t,"link",e),ke(t),i.head.appendChild(t)))}}function YM(e,t){Gi.m(e,t);var n=_r;if(n&&e){var i=t&&typeof t.as=="string"?t.as:"script",a='link[rel="modulepreload"][as="'+kn(i)+'"][href="'+kn(e)+'"]',s=a;switch(i){case"audioworklet":case"paintworklet":case"serviceworker":case"sharedworker":case"worker":case"script":s=vr(e)}if(!Zn.has(s)&&(e=me({rel:"modulepreload",href:e},t),Zn.set(s,e),n.querySelector(a)===null)){switch(i){case"audioworklet":case"paintworklet":case"serviceworker":case"sharedworker":case"worker":case"script":if(n.querySelector(Qo(s)))return}i=n.createElement("link"),Je(i,"link",e),ke(i),n.head.appendChild(i)}}}function ZM(e,t,n){Gi.S(e,t,n);var i=_r;if(i&&e){var a=Zs(i).hoistableStyles,s=ur(e);t=t||"default";var r=a.get(s);if(!r){var o={loading:0,preload:null};if(r=i.querySelector(Jo(s)))o.loading=5;else{e=me({rel:"stylesheet",href:e,"data-precedence":t},n),(n=Zn.get(s))&&Ad(e,n);var l=r=i.createElement("link");ke(l),Je(l,"link",e),l._p=new Promise(function(c,h){l.onload=c,l.onerror=h}),l.addEventListener("load",function(){o.loading|=1}),l.addEventListener("error",function(){o.loading|=2}),o.loading|=4,Zl(r,t,i)}r={type:"stylesheet",instance:r,count:1,state:o},a.set(s,r)}}}function jM(e,t){Gi.X(e,t);var n=_r;if(n&&e){var i=Zs(n).hoistableScripts,a=vr(e),s=i.get(a);s||(s=n.querySelector(Qo(a)),s||(e=me({src:e,async:!0},t),(t=Zn.get(a))&&wd(e,t),s=n.createElement("script"),ke(s),Je(s,"link",e),n.head.appendChild(s)),s={type:"script",instance:s,count:1,state:null},i.set(a,s))}}function JM(e,t){Gi.M(e,t);var n=_r;if(n&&e){var i=Zs(n).hoistableScripts,a=vr(e),s=i.get(a);s||(s=n.querySelector(Qo(a)),s||(e=me({src:e,async:!0,type:"module"},t),(t=Zn.get(a))&&wd(e,t),s=n.createElement("script"),ke(s),Je(s,"link",e),n.head.appendChild(s)),s={type:"script",instance:s,count:1,state:null},i.set(a,s))}}function t_(e,t,n,i){var a=(a=ma.current)?bc(a):null;if(!a)throw Error(W(446));switch(e){case"meta":case"title":return null;case"style":return typeof n.precedence=="string"&&typeof n.href=="string"?(t=ur(n.href),n=Zs(a).hoistableStyles,i=n.get(t),i||(i={type:"style",instance:null,count:0,state:null},n.set(t,i)),i):{type:"void",instance:null,count:0,state:null};case"link":if(n.rel==="stylesheet"&&typeof n.href=="string"&&typeof n.precedence=="string"){e=ur(n.href);var s=Zs(a).hoistableStyles,r=s.get(e);if(r||(a=a.ownerDocument||a,r={type:"stylesheet",instance:null,count:0,state:{loading:0,preload:null}},s.set(e,r),(s=a.querySelector(Jo(e)))&&!s._p&&(r.instance=s,r.state.loading=5),Zn.has(e)||(n={rel:"preload",as:"style",href:n.href,crossOrigin:n.crossOrigin,integrity:n.integrity,media:n.media,hrefLang:n.hrefLang,referrerPolicy:n.referrerPolicy},Zn.set(e,n),s||QM(a,e,n,r.state))),t&&i===null)throw Error(W(528,""));return r}if(t&&i!==null)throw Error(W(529,""));return null;case"script":return t=n.async,n=n.src,typeof n=="string"&&t&&typeof t!="function"&&typeof t!="symbol"?(t=vr(n),n=Zs(a).hoistableScripts,i=n.get(t),i||(i={type:"script",instance:null,count:0,state:null},n.set(t,i)),i):{type:"void",instance:null,count:0,state:null};default:throw Error(W(444,e))}}function ur(e){return'href="'+kn(e)+'"'}function Jo(e){return'link[rel="stylesheet"]['+e+"]"}function Vv(e){return me({},e,{"data-precedence":e.precedence,precedence:null})}function QM(e,t,n,i){e.querySelector('link[rel="preload"][as="style"]['+t+"]")?i.loading=1:(t=e.createElement("link"),i.preload=t,t.addEventListener("load",function(){return i.loading|=1}),t.addEventListener("error",function(){return i.loading|=2}),Je(t,"link",n),ke(t),e.head.appendChild(t))}function vr(e){return'[src="'+kn(e)+'"]'}function Qo(e){return"script[async]"+e}function e_(e,t,n){if(t.count++,t.instance===null)switch(t.type){case"style":var i=e.querySelector('style[data-href~="'+kn(n.href)+'"]');if(i)return t.instance=i,ke(i),i;var a=me({},n,{"data-href":n.href,"data-precedence":n.precedence,href:null,precedence:null});return i=(e.ownerDocument||e).createElement("style"),ke(i),Je(i,"style",a),Zl(i,n.precedence,e),t.instance=i;case"stylesheet":a=ur(n.href);var s=e.querySelector(Jo(a));if(s)return t.state.loading|=4,t.instance=s,ke(s),s;i=Vv(n),(a=Zn.get(a))&&Ad(i,a),s=(e.ownerDocument||e).createElement("link"),ke(s);var r=s;return r._p=new Promise(function(o,l){r.onload=o,r.onerror=l}),Je(s,"link",i),t.state.loading|=4,Zl(s,n.precedence,e),t.instance=s;case"script":return s=vr(n.src),(a=e.querySelector(Qo(s)))?(t.instance=a,ke(a),a):(i=n,(a=Zn.get(s))&&(i=me({},n),wd(i,a)),e=e.ownerDocument||e,a=e.createElement("script"),ke(a),Je(a,"link",i),e.head.appendChild(a),t.instance=a);case"void":return null;default:throw Error(W(443,t.type))}else t.type==="stylesheet"&&(t.state.loading&4)===0&&(i=t.instance,t.state.loading|=4,Zl(i,n.precedence,e));return t.instance}function Zl(e,t,n){for(var i=n.querySelectorAll('link[rel="stylesheet"][data-precedence],style[data-precedence]'),a=i.length?i[i.length-1]:null,s=a,r=0;r<i.length;r++){var o=i[r];if(o.dataset.precedence===t)s=o;else if(s!==a)break}s?s.parentNode.insertBefore(e,s.nextSibling):(t=n.nodeType===9?n.head:n,t.insertBefore(e,t.firstChild))}function Ad(e,t){e.crossOrigin==null&&(e.crossOrigin=t.crossOrigin),e.referrerPolicy==null&&(e.referrerPolicy=t.referrerPolicy),e.title==null&&(e.title=t.title)}function wd(e,t){e.crossOrigin==null&&(e.crossOrigin=t.crossOrigin),e.referrerPolicy==null&&(e.referrerPolicy=t.referrerPolicy),e.integrity==null&&(e.integrity=t.integrity)}var jl=null;function n_(e,t,n){if(jl===null){var i=new Map,a=jl=new Map;a.set(n,i)}else a=jl,i=a.get(n),i||(i=new Map,a.set(n,i));if(i.has(e))return i;for(i.set(e,null),n=n.getElementsByTagName(e),a=0;a<n.length;a++){var s=n[a];if(!(s[Wo]||s[Ye]||e==="link"&&s.getAttribute("rel")==="stylesheet")&&s.namespaceURI!=="http://www.w3.org/2000/svg"){var r=s.getAttribute(t)||"";r=e+r;var o=i.get(r);o?o.push(s):i.set(r,[s])}}return i}function i_(e,t,n){e=e.ownerDocument||e,e.head.insertBefore(n,t==="title"?e.querySelector("head > title"):null)}function KM(e,t,n){if(n===1||t.itemProp!=null)return!1;switch(e){case"meta":case"title":return!0;case"style":if(typeof t.precedence!="string"||typeof t.href!="string"||t.href==="")break;return!0;case"link":if(typeof t.rel!="string"||typeof t.href!="string"||t.href===""||t.onLoad||t.onError)break;return t.rel==="stylesheet"?(e=t.disabled,typeof t.precedence=="string"&&e==null):!0;case"script":if(t.async&&typeof t.async!="function"&&typeof t.async!="symbol"&&!t.onLoad&&!t.onError&&t.src&&typeof t.src=="string")return!0}return!1}function Gv(e){return!(e.type==="stylesheet"&&(e.state.loading&3)===0)}function $M(e,t,n,i){if(n.type==="stylesheet"&&(typeof i.media!="string"||matchMedia(i.media).matches!==!1)&&(n.state.loading&4)===0){if(n.instance===null){var a=ur(i.href),s=t.querySelector(Jo(a));if(s){t=s._p,t!==null&&typeof t=="object"&&typeof t.then=="function"&&(e.count++,e=Mc.bind(e),t.then(e,e)),n.state.loading|=4,n.instance=s,ke(s);return}s=t.ownerDocument||t,i=Vv(i),(a=Zn.get(a))&&Ad(i,a),s=s.createElement("link"),ke(s);var r=s;r._p=new Promise(function(o,l){r.onload=o,r.onerror=l}),Je(s,"link",i),n.instance=s}e.stylesheets===null&&(e.stylesheets=new Map),e.stylesheets.set(n,t),(t=n.state.preload)&&(n.state.loading&3)===0&&(e.count++,n=Mc.bind(e),t.addEventListener("load",n),t.addEventListener("error",n))}}var Fh=0;function t1(e,t){return e.stylesheets&&e.count===0&&Jl(e,e.stylesheets),0<e.count||0<e.imgCount?function(n){var i=setTimeout(function(){if(e.stylesheets&&Jl(e,e.stylesheets),e.unsuspend){var s=e.unsuspend;e.unsuspend=null,s()}},6e4+t);0<e.imgBytes&&Fh===0&&(Fh=62500*OM());var a=setTimeout(function(){if(e.waitingForImages=!1,e.count===0&&(e.stylesheets&&Jl(e,e.stylesheets),e.unsuspend)){var s=e.unsuspend;e.unsuspend=null,s()}},(e.imgBytes>Fh?50:800)+t);return e.unsuspend=n,function(){e.unsuspend=null,clearTimeout(i),clearTimeout(a)}}:null}function Mc(){if(this.count--,this.count===0&&(this.imgCount===0||!this.waitingForImages)){if(this.stylesheets)Jl(this,this.stylesheets);else if(this.unsuspend){var e=this.unsuspend;this.unsuspend=null,e()}}}var Ec=null;function Jl(e,t){e.stylesheets=null,e.unsuspend!==null&&(e.count++,Ec=new Map,t.forEach(e1,e),Ec=null,Mc.call(e))}function e1(e,t){if(!(t.state.loading&4)){var n=Ec.get(e);if(n)var i=n.get(null);else{n=new Map,Ec.set(e,n);for(var a=e.querySelectorAll("link[data-precedence],style[data-precedence]"),s=0;s<a.length;s++){var r=a[s];(r.nodeName==="LINK"||r.getAttribute("media")!=="not all")&&(n.set(r.dataset.precedence,r),i=r)}i&&n.set(null,i)}a=t.instance,r=a.getAttribute("data-precedence"),s=n.get(r)||i,s===i&&n.set(null,a),n.set(r,a),this.count++,i=Mc.bind(this),a.addEventListener("load",i),a.addEventListener("error",i),s?s.parentNode.insertBefore(a,s.nextSibling):(e=e.nodeType===9?e.head:e,e.insertBefore(a,e.firstChild)),t.state.loading|=4}}var Io={$$typeof:Di,Provider:null,Consumer:null,_currentValue:ja,_currentValue2:ja,_threadCount:0};function n1(e,t,n,i,a,s,r,o,l){this.tag=1,this.containerInfo=e,this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.next=this.pendingContext=this.context=this.cancelPendingCommit=null,this.callbackPriority=0,this.expirationTimes=hh(-1),this.entangledLanes=this.shellSuspendCounter=this.errorRecoveryDisabledLanes=this.expiredLanes=this.warmLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=hh(0),this.hiddenUpdates=hh(null),this.identifierPrefix=i,this.onUncaughtError=a,this.onCaughtError=s,this.onRecoverableError=r,this.pooledCache=null,this.pooledCacheLanes=0,this.formState=l,this.incompleteTransitions=new Map}function kv(e,t,n,i,a,s,r,o,l,c,h,d){return e=new n1(e,t,n,r,l,c,h,d,o),t=1,s===!0&&(t|=24),s=Tn(3,null,null,t),e.current=s,s.stateNode=e,t=$f(),t.refCount++,e.pooledCache=t,t.refCount++,s.memoizedState={element:i,isDehydrated:n,cache:t},nd(s),e}function Wv(e){return e?(e=Ws,e):Ws}function Xv(e,t,n,i,a,s){a=Wv(a),i.context===null?i.context=a:i.pendingContext=a,i=_a(t),i.payload={element:n},s=s===void 0?null:s,s!==null&&(i.callback=s),n=va(e,i,t),n!==null&&(gn(n,e,t),_o(n,e,t))}function a_(e,t){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var n=e.retryLane;e.retryLane=n!==0&&n<t?n:t}}function Rd(e,t){a_(e,t),(e=e.alternate)&&a_(e,t)}function qv(e){if(e.tag===13||e.tag===31){var t=ls(e,67108864);t!==null&&gn(t,e,67108864),Rd(e,67108864)}}function s_(e){if(e.tag===13||e.tag===31){var t=Ln();t=Ff(t);var n=ls(e,t);n!==null&&gn(n,e,t),Rd(e,t)}}var Tc=!0;function i1(e,t,n,i){var a=Et.T;Et.T=null;var s=$t.p;try{$t.p=2,Cd(e,t,n,i)}finally{$t.p=s,Et.T=a}}function a1(e,t,n,i){var a=Et.T;Et.T=null;var s=$t.p;try{$t.p=8,Cd(e,t,n,i)}finally{$t.p=s,Et.T=a}}function Cd(e,t,n,i){if(Tc){var a=Of(i);if(a===null)Ih(e,t,i,Ac,n),r_(e,i);else if(r1(a,e,t,n,i))i.stopPropagation();else if(r_(e,i),t&4&&-1<s1.indexOf(e)){for(;a!==null;){var s=dr(a);if(s!==null)switch(s.tag){case 3:if(s=s.stateNode,s.current.memoizedState.isDehydrated){var r=qa(s.pendingLanes);if(r!==0){var o=s;for(o.pendingLanes|=2,o.entangledLanes|=2;r;){var l=1<<31-Cn(r);o.entanglements[1]|=l,r&=~l}vi(s),(Kt&6)===0&&(mc=wn()+500,jo(0,!1))}}break;case 31:case 13:o=ls(s,2),o!==null&&gn(o,s,2),Fc(),Rd(s,2)}if(s=Of(i),s===null&&Ih(e,t,i,Ac,n),s===a)break;a=s}a!==null&&i.stopPropagation()}else Ih(e,t,i,null,n)}}function Of(e){return e=kf(e),Ld(e)}var Ac=null;function Ld(e){if(Ac=null,e=Bs(e),e!==null){var t=Ho(e);if(t===null)e=null;else{var n=t.tag;if(n===13){if(e=f_(t),e!==null)return e;e=null}else if(n===31){if(e=d_(t),e!==null)return e;e=null}else if(n===3){if(t.stateNode.current.memoizedState.isDehydrated)return t.tag===3?t.stateNode.containerInfo:null;e=null}else t!==e&&(e=null)}}return Ac=e,null}function Yv(e){switch(e){case"beforetoggle":case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"toggle":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 2;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 8;case"message":switch(qS()){case __:return 2;case v_:return 8;case ec:case YS:return 32;case y_:return 268435456;default:return 32}default:return 32}}var Pf=!1,Sa=null,ba=null,Ma=null,Bo=new Map,Fo=new Map,ca=[],s1="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(" ");function r_(e,t){switch(e){case"focusin":case"focusout":Sa=null;break;case"dragenter":case"dragleave":ba=null;break;case"mouseover":case"mouseout":Ma=null;break;case"pointerover":case"pointerout":Bo.delete(t.pointerId);break;case"gotpointercapture":case"lostpointercapture":Fo.delete(t.pointerId)}}function so(e,t,n,i,a,s){return e===null||e.nativeEvent!==s?(e={blockedOn:t,domEventName:n,eventSystemFlags:i,nativeEvent:s,targetContainers:[a]},t!==null&&(t=dr(t),t!==null&&qv(t)),e):(e.eventSystemFlags|=i,t=e.targetContainers,a!==null&&t.indexOf(a)===-1&&t.push(a),e)}function r1(e,t,n,i,a){switch(t){case"focusin":return Sa=so(Sa,e,t,n,i,a),!0;case"dragenter":return ba=so(ba,e,t,n,i,a),!0;case"mouseover":return Ma=so(Ma,e,t,n,i,a),!0;case"pointerover":var s=a.pointerId;return Bo.set(s,so(Bo.get(s)||null,e,t,n,i,a)),!0;case"gotpointercapture":return s=a.pointerId,Fo.set(s,so(Fo.get(s)||null,e,t,n,i,a)),!0}return!1}function Zv(e){var t=Bs(e.target);if(t!==null){var n=Ho(t);if(n!==null){if(t=n.tag,t===13){if(t=f_(n),t!==null){e.blockedOn=t,km(e.priority,function(){s_(n)});return}}else if(t===31){if(t=d_(n),t!==null){e.blockedOn=t,km(e.priority,function(){s_(n)});return}}else if(t===3&&n.stateNode.current.memoizedState.isDehydrated){e.blockedOn=n.tag===3?n.stateNode.containerInfo:null;return}}}e.blockedOn=null}function Ql(e){if(e.blockedOn!==null)return!1;for(var t=e.targetContainers;0<t.length;){var n=Of(e.nativeEvent);if(n===null){n=e.nativeEvent;var i=new n.constructor(n.type,n);Kh=i,n.target.dispatchEvent(i),Kh=null}else return t=dr(n),t!==null&&qv(t),e.blockedOn=n,!1;t.shift()}return!0}function o_(e,t,n){Ql(e)&&n.delete(t)}function o1(){Pf=!1,Sa!==null&&Ql(Sa)&&(Sa=null),ba!==null&&Ql(ba)&&(ba=null),Ma!==null&&Ql(Ma)&&(Ma=null),Bo.forEach(o_),Fo.forEach(o_)}function Pl(e,t){e.blockedOn===t&&(e.blockedOn=null,Pf||(Pf=!0,ze.unstable_scheduleCallback(ze.unstable_NormalPriority,o1)))}var zl=null;function l_(e){zl!==e&&(zl=e,ze.unstable_scheduleCallback(ze.unstable_NormalPriority,function(){zl===e&&(zl=null);for(var t=0;t<e.length;t+=3){var n=e[t],i=e[t+1],a=e[t+2];if(typeof i!="function"){if(Ld(i||n)===null)continue;break}var s=dr(n);s!==null&&(e.splice(t,3),t-=3,mf(s,{pending:!0,data:a,method:n.method,action:i},i,a))}}))}function hr(e){function t(l){return Pl(l,e)}Sa!==null&&Pl(Sa,e),ba!==null&&Pl(ba,e),Ma!==null&&Pl(Ma,e),Bo.forEach(t),Fo.forEach(t);for(var n=0;n<ca.length;n++){var i=ca[n];i.blockedOn===e&&(i.blockedOn=null)}for(;0<ca.length&&(n=ca[0],n.blockedOn===null);)Zv(n),n.blockedOn===null&&ca.shift();if(n=(e.ownerDocument||e).$$reactFormReplay,n!=null)for(i=0;i<n.length;i+=3){var a=n[i],s=n[i+1],r=a[_n]||null;if(typeof s=="function")r||l_(n);else if(r){var o=null;if(s&&s.hasAttribute("formAction")){if(a=s,r=s[_n]||null)o=r.formAction;else if(Ld(a)!==null)continue}else o=r.action;typeof o=="function"?n[i+1]=o:(n.splice(i,3),i-=3),l_(n)}}}function jv(){function e(s){s.canIntercept&&s.info==="react-transition"&&s.intercept({handler:function(){return new Promise(function(r){return a=r})},focusReset:"manual",scroll:"manual"})}function t(){a!==null&&(a(),a=null),i||setTimeout(n,20)}function n(){if(!i&&!navigation.transition){var s=navigation.currentEntry;s&&s.url!=null&&navigation.navigate(s.url,{state:s.getState(),info:"react-transition",history:"replace"})}}if(typeof navigation=="object"){var i=!1,a=null;return navigation.addEventListener("navigate",e),navigation.addEventListener("navigatesuccess",t),navigation.addEventListener("navigateerror",t),setTimeout(n,100),function(){i=!0,navigation.removeEventListener("navigate",e),navigation.removeEventListener("navigatesuccess",t),navigation.removeEventListener("navigateerror",t),a!==null&&(a(),a=null)}}}function Dd(e){this._internalRoot=e}Gc.prototype.render=Dd.prototype.render=function(e){var t=this._internalRoot;if(t===null)throw Error(W(409));var n=t.current,i=Ln();Xv(n,i,e,t,null,null)};Gc.prototype.unmount=Dd.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var t=e.containerInfo;Xv(e.current,2,null,e,null,null),Fc(),t[fr]=null}};function Gc(e){this._internalRoot=e}Gc.prototype.unstable_scheduleHydration=function(e){if(e){var t=E_();e={blockedOn:null,target:e,priority:t};for(var n=0;n<ca.length&&t!==0&&t<ca[n].priority;n++);ca.splice(n,0,e),n===0&&Zv(e)}};var c_=u_.version;if(c_!=="19.2.4")throw Error(W(527,c_,"19.2.4"));$t.findDOMNode=function(e){var t=e._reactInternals;if(t===void 0)throw typeof e.render=="function"?Error(W(188)):(e=Object.keys(e).join(","),Error(W(268,e)));return e=FS(t),e=e!==null?p_(e):null,e=e===null?null:e.stateNode,e};var l1={bundleType:0,version:"19.2.4",rendererPackageName:"react-dom",currentDispatcherRef:Et,reconcilerVersion:"19.2.4"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"&&(ro=__REACT_DEVTOOLS_GLOBAL_HOOK__,!ro.isDisabled&&ro.supportsFiber))try{Vo=ro.inject(l1),Rn=ro}catch{}var ro;kc.createRoot=function(e,t){if(!h_(e))throw Error(W(299));var n=!1,i="",a=H0,s=V0,r=G0;return t!=null&&(t.unstable_strictMode===!0&&(n=!0),t.identifierPrefix!==void 0&&(i=t.identifierPrefix),t.onUncaughtError!==void 0&&(a=t.onUncaughtError),t.onCaughtError!==void 0&&(s=t.onCaughtError),t.onRecoverableError!==void 0&&(r=t.onRecoverableError)),t=kv(e,1,!1,null,null,n,i,null,a,s,r,jv),e[fr]=t.current,Td(e),new Dd(t)};kc.hydrateRoot=function(e,t,n){if(!h_(e))throw Error(W(299));var i=!1,a="",s=H0,r=V0,o=G0,l=null;return n!=null&&(n.unstable_strictMode===!0&&(i=!0),n.identifierPrefix!==void 0&&(a=n.identifierPrefix),n.onUncaughtError!==void 0&&(s=n.onUncaughtError),n.onCaughtError!==void 0&&(r=n.onCaughtError),n.onRecoverableError!==void 0&&(o=n.onRecoverableError),n.formState!==void 0&&(l=n.formState)),t=kv(e,1,!0,t,n??null,i,a,l,s,r,o,jv),t.context=Wv(null),n=t.current,i=Ln(),i=Ff(i),a=_a(i),a.callback=null,va(n,a,i),n=i,t.current.lanes=n,ko(t,n),vi(t),e[fr]=t.current,Td(e),new Gc(t)};kc.version="19.2.4"});var $v=ui((NC,Kv)=>{"use strict";function Qv(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(Qv)}catch(e){console.error(e)}}Qv(),Kv.exports=Jv()});var Qx=ui(Bu=>{"use strict";var gC=Symbol.for("react.transitional.element"),_C=Symbol.for("react.fragment");function Jx(e,t,n){var i=null;if(n!==void 0&&(i=""+n),t.key!==void 0&&(i=""+t.key),"key"in t){n={};for(var a in t)a!=="key"&&(n[a]=t[a])}else n=t;return t=n.ref,{$$typeof:gC,type:e,key:i,ref:t!==void 0?t:null,props:n}}Bu.Fragment=_C;Bu.jsx=Jx;Bu.jsxs=Jx});var Ts=ui((WC,Kx)=>{"use strict";Kx.exports=Qx()});var aS=hi(Rs(),1),sS=hi($v(),1);var Jt=hi(Rs(),1);var c1=0,ty=1,u1=2;var bx=1,h1=2,Zi=3,Ha=0,Sn=1,Ji=2;var Ia=0,Br=1,ey=2,ny=3,iy=4,f1=5,ms=100,d1=101,p1=102,ay=103,sy=104,m1=200,g1=201,_1=202,v1=203,cp=204,up=205,y1=206,x1=207,S1=208,b1=209,M1=210,E1=211,T1=212,A1=213,w1=214,R1=0,C1=1,L1=2,du=3,D1=4,U1=5,N1=6,O1=7,Mx=0,P1=1,z1=2,Ba=0,I1=1,B1=2,F1=3,H1=4,V1=5;var Ex=300,Vr=301,Gr=302,hp=303,fp=304,Nu=306,dp=1e3,si=1001,pp=1002,hn=1003,ry=1004;var Ud=1005;var Jn=1006,G1=1007;var rl=1008;var Fa=1009,k1=1010,W1=1011,Yp=1012,Tx=1013,Pa=1014,za=1015,ol=1016,Ax=1017,wx=1018,_s=1020,X1=1021,ri=1023,q1=1024,Y1=1025,vs=1026,kr=1027,Z1=1028,Rx=1029,j1=1030,Cx=1031,Lx=1033,Nd=33776,Od=33777,Pd=33778,zd=33779,oy=35840,ly=35841,cy=35842,uy=35843,Dx=36196,hy=37492,fy=37496,dy=37808,py=37809,my=37810,gy=37811,_y=37812,vy=37813,yy=37814,xy=37815,Sy=37816,by=37817,My=37818,Ey=37819,Ty=37820,Ay=37821,Id=36492,wy=36494,Ry=36495,J1=36283,Cy=36284,Ly=36285,Dy=36286;var pu=2300,mu=2301,Bd=2302,Uy=2400,Ny=2401,Oy=2402;var Ux=3e3,ys=3001,Q1=3200,K1=3201,$1=0,tE=1,Qn="",Qe="srgb",$i="srgb-linear",Zp="display-p3",Ou="display-p3-linear",gu="linear",ge="srgb",_u="rec709",vu="p3";var yr=7680;var Py=519,eE=512,nE=513,iE=514,Nx=515,aE=516,sE=517,rE=518,oE=519,zy=35044;var Iy="300 es",mp=1035,Qi=2e3,yu=2001,Va=class{addEventListener(t,n){this._listeners===void 0&&(this._listeners={});let i=this._listeners;i[t]===void 0&&(i[t]=[]),i[t].indexOf(n)===-1&&i[t].push(n)}hasEventListener(t,n){if(this._listeners===void 0)return!1;let i=this._listeners;return i[t]!==void 0&&i[t].indexOf(n)!==-1}removeEventListener(t,n){if(this._listeners===void 0)return;let a=this._listeners[t];if(a!==void 0){let s=a.indexOf(n);s!==-1&&a.splice(s,1)}}dispatchEvent(t){if(this._listeners===void 0)return;let i=this._listeners[t.type];if(i!==void 0){t.target=this;let a=i.slice(0);for(let s=0,r=a.length;s<r;s++)a[s].call(this,t);t.target=null}}},en=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];var Fd=Math.PI/180,gp=180/Math.PI;function hl(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(en[e&255]+en[e>>8&255]+en[e>>16&255]+en[e>>24&255]+"-"+en[t&255]+en[t>>8&255]+"-"+en[t>>16&15|64]+en[t>>24&255]+"-"+en[n&63|128]+en[n>>8&255]+"-"+en[n>>16&255]+en[n>>24&255]+en[i&255]+en[i>>8&255]+en[i>>16&255]+en[i>>24&255]).toLowerCase()}function xn(e,t,n){return Math.max(t,Math.min(n,e))}function lE(e,t){return(e%t+t)%t}function Hd(e,t,n){return(1-n)*e+n*t}function By(e){return(e&e-1)===0&&e!==0}function _p(e){return Math.pow(2,Math.floor(Math.log(e)/Math.LN2))}function Ko(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return e/4294967295;case Uint16Array:return e/65535;case Uint8Array:return e/255;case Int32Array:return Math.max(e/2147483647,-1);case Int16Array:return Math.max(e/32767,-1);case Int8Array:return Math.max(e/127,-1);default:throw new Error("Invalid component type.")}}function yn(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return Math.round(e*4294967295);case Uint16Array:return Math.round(e*65535);case Uint8Array:return Math.round(e*255);case Int32Array:return Math.round(e*2147483647);case Int16Array:return Math.round(e*32767);case Int8Array:return Math.round(e*127);default:throw new Error("Invalid component type.")}}var oe=class e{constructor(t=0,n=0){e.prototype.isVector2=!0,this.x=t,this.y=n}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,n){return this.x=t,this.y=n,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,n){switch(t){case 0:this.x=n;break;case 1:this.y=n;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,n){return this.x=t.x+n.x,this.y=t.y+n.y,this}addScaledVector(t,n){return this.x+=t.x*n,this.y+=t.y*n,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,n){return this.x=t.x-n.x,this.y=t.y-n.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let n=this.x,i=this.y,a=t.elements;return this.x=a[0]*n+a[3]*i+a[6],this.y=a[1]*n+a[4]*i+a[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,n){return this.x=Math.max(t.x,Math.min(n.x,this.x)),this.y=Math.max(t.y,Math.min(n.y,this.y)),this}clampScalar(t,n){return this.x=Math.max(t,Math.min(n,this.x)),this.y=Math.max(t,Math.min(n,this.y)),this}clampLength(t,n){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(t,Math.min(n,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let n=Math.sqrt(this.lengthSq()*t.lengthSq());if(n===0)return Math.PI/2;let i=this.dot(t)/n;return Math.acos(xn(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let n=this.x-t.x,i=this.y-t.y;return n*n+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,n){return this.x+=(t.x-this.x)*n,this.y+=(t.y-this.y)*n,this}lerpVectors(t,n,i){return this.x=t.x+(n.x-t.x)*i,this.y=t.y+(n.y-t.y)*i,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,n=0){return this.x=t[n],this.y=t[n+1],this}toArray(t=[],n=0){return t[n]=this.x,t[n+1]=this.y,t}fromBufferAttribute(t,n){return this.x=t.getX(n),this.y=t.getY(n),this}rotateAround(t,n){let i=Math.cos(n),a=Math.sin(n),s=this.x-t.x,r=this.y-t.y;return this.x=s*i-r*a+t.x,this.y=s*a+r*i+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},kt=class e{constructor(t,n,i,a,s,r,o,l,c){e.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,n,i,a,s,r,o,l,c)}set(t,n,i,a,s,r,o,l,c){let h=this.elements;return h[0]=t,h[1]=a,h[2]=o,h[3]=n,h[4]=s,h[5]=l,h[6]=i,h[7]=r,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let n=this.elements,i=t.elements;return n[0]=i[0],n[1]=i[1],n[2]=i[2],n[3]=i[3],n[4]=i[4],n[5]=i[5],n[6]=i[6],n[7]=i[7],n[8]=i[8],this}extractBasis(t,n,i){return t.setFromMatrix3Column(this,0),n.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let n=t.elements;return this.set(n[0],n[4],n[8],n[1],n[5],n[9],n[2],n[6],n[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,n){let i=t.elements,a=n.elements,s=this.elements,r=i[0],o=i[3],l=i[6],c=i[1],h=i[4],d=i[7],f=i[2],p=i[5],v=i[8],y=a[0],m=a[3],u=a[6],_=a[1],g=a[4],b=a[7],T=a[2],R=a[5],w=a[8];return s[0]=r*y+o*_+l*T,s[3]=r*m+o*g+l*R,s[6]=r*u+o*b+l*w,s[1]=c*y+h*_+d*T,s[4]=c*m+h*g+d*R,s[7]=c*u+h*b+d*w,s[2]=f*y+p*_+v*T,s[5]=f*m+p*g+v*R,s[8]=f*u+p*b+v*w,this}multiplyScalar(t){let n=this.elements;return n[0]*=t,n[3]*=t,n[6]*=t,n[1]*=t,n[4]*=t,n[7]*=t,n[2]*=t,n[5]*=t,n[8]*=t,this}determinant(){let t=this.elements,n=t[0],i=t[1],a=t[2],s=t[3],r=t[4],o=t[5],l=t[6],c=t[7],h=t[8];return n*r*h-n*o*c-i*s*h+i*o*l+a*s*c-a*r*l}invert(){let t=this.elements,n=t[0],i=t[1],a=t[2],s=t[3],r=t[4],o=t[5],l=t[6],c=t[7],h=t[8],d=h*r-o*c,f=o*l-h*s,p=c*s-r*l,v=n*d+i*f+a*p;if(v===0)return this.set(0,0,0,0,0,0,0,0,0);let y=1/v;return t[0]=d*y,t[1]=(a*c-h*i)*y,t[2]=(o*i-a*r)*y,t[3]=f*y,t[4]=(h*n-a*l)*y,t[5]=(a*s-o*n)*y,t[6]=p*y,t[7]=(i*l-c*n)*y,t[8]=(r*n-i*s)*y,this}transpose(){let t,n=this.elements;return t=n[1],n[1]=n[3],n[3]=t,t=n[2],n[2]=n[6],n[6]=t,t=n[5],n[5]=n[7],n[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let n=this.elements;return t[0]=n[0],t[1]=n[3],t[2]=n[6],t[3]=n[1],t[4]=n[4],t[5]=n[7],t[6]=n[2],t[7]=n[5],t[8]=n[8],this}setUvTransform(t,n,i,a,s,r,o){let l=Math.cos(s),c=Math.sin(s);return this.set(i*l,i*c,-i*(l*r+c*o)+r+t,-a*c,a*l,-a*(-c*r+l*o)+o+n,0,0,1),this}scale(t,n){return this.premultiply(Vd.makeScale(t,n)),this}rotate(t){return this.premultiply(Vd.makeRotation(-t)),this}translate(t,n){return this.premultiply(Vd.makeTranslation(t,n)),this}makeTranslation(t,n){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,n,0,0,1),this}makeRotation(t){let n=Math.cos(t),i=Math.sin(t);return this.set(n,-i,0,i,n,0,0,0,1),this}makeScale(t,n){return this.set(t,0,0,0,n,0,0,0,1),this}equals(t){let n=this.elements,i=t.elements;for(let a=0;a<9;a++)if(n[a]!==i[a])return!1;return!0}fromArray(t,n=0){for(let i=0;i<9;i++)this.elements[i]=t[i+n];return this}toArray(t=[],n=0){let i=this.elements;return t[n]=i[0],t[n+1]=i[1],t[n+2]=i[2],t[n+3]=i[3],t[n+4]=i[4],t[n+5]=i[5],t[n+6]=i[6],t[n+7]=i[7],t[n+8]=i[8],t}clone(){return new this.constructor().fromArray(this.elements)}},Vd=new kt;function Ox(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}function xu(e){return document.createElementNS("http://www.w3.org/1999/xhtml",e)}function cE(){let e=xu("canvas");return e.style.display="block",e}var Fy={};function al(e){e in Fy||(Fy[e]=!0,console.warn(e))}var Hy=new kt().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),Vy=new kt().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),Wc={[$i]:{transfer:gu,primaries:_u,toReference:e=>e,fromReference:e=>e},[Qe]:{transfer:ge,primaries:_u,toReference:e=>e.convertSRGBToLinear(),fromReference:e=>e.convertLinearToSRGB()},[Ou]:{transfer:gu,primaries:vu,toReference:e=>e.applyMatrix3(Vy),fromReference:e=>e.applyMatrix3(Hy)},[Zp]:{transfer:ge,primaries:vu,toReference:e=>e.convertSRGBToLinear().applyMatrix3(Vy),fromReference:e=>e.applyMatrix3(Hy).convertLinearToSRGB()}},uE=new Set([$i,Ou]),re={enabled:!0,_workingColorSpace:$i,get legacyMode(){return console.warn("THREE.ColorManagement: .legacyMode=false renamed to .enabled=true in r150."),!this.enabled},set legacyMode(e){console.warn("THREE.ColorManagement: .legacyMode=false renamed to .enabled=true in r150."),this.enabled=!e},get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(e){if(!uE.has(e))throw new Error(`Unsupported working color space, "${e}".`);this._workingColorSpace=e},convert:function(e,t,n){if(this.enabled===!1||t===n||!t||!n)return e;let i=Wc[t].toReference,a=Wc[n].fromReference;return a(i(e))},fromWorkingColorSpace:function(e,t){return this.convert(e,this._workingColorSpace,t)},toWorkingColorSpace:function(e,t){return this.convert(e,t,this._workingColorSpace)},getPrimaries:function(e){return Wc[e].primaries},getTransfer:function(e){return e===Qn?gu:Wc[e].transfer}};function Fr(e){return e<.04045?e*.0773993808:Math.pow(e*.9478672986+.0521327014,2.4)}function Gd(e){return e<.0031308?e*12.92:1.055*Math.pow(e,.41666)-.055}var xr,Su=class{static getDataURL(t){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{xr===void 0&&(xr=xu("canvas")),xr.width=t.width,xr.height=t.height;let i=xr.getContext("2d");t instanceof ImageData?i.putImageData(t,0,0):i.drawImage(t,0,0,t.width,t.height),n=xr}return n.width>2048||n.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",t),n.toDataURL("image/jpeg",.6)):n.toDataURL("image/png")}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let n=xu("canvas");n.width=t.width,n.height=t.height;let i=n.getContext("2d");i.drawImage(t,0,0,t.width,t.height);let a=i.getImageData(0,0,t.width,t.height),s=a.data;for(let r=0;r<s.length;r++)s[r]=Fr(s[r]/255)*255;return i.putImageData(a,0,0),n}else if(t.data){let n=t.data.slice(0);for(let i=0;i<n.length;i++)n instanceof Uint8Array||n instanceof Uint8ClampedArray?n[i]=Math.floor(Fr(n[i]/255)*255):n[i]=Fr(n[i]);return{data:n,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},hE=0,bu=class{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:hE++}),this.uuid=hl(),this.data=t,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let n=t===void 0||typeof t=="string";if(!n&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let i={uuid:this.uuid,url:""},a=this.data;if(a!==null){let s;if(Array.isArray(a)){s=[];for(let r=0,o=a.length;r<o;r++)a[r].isDataTexture?s.push(kd(a[r].image)):s.push(kd(a[r]))}else s=kd(a);i.url=s}return n||(t.images[this.uuid]=i),i}};function kd(e){return typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap?Su.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}var fE=0,oi=class e extends Va{constructor(t=e.DEFAULT_IMAGE,n=e.DEFAULT_MAPPING,i=si,a=si,s=Jn,r=rl,o=ri,l=Fa,c=e.DEFAULT_ANISOTROPY,h=Qn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:fE++}),this.uuid=hl(),this.name="",this.source=new bu(t),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=i,this.wrapT=a,this.magFilter=s,this.minFilter=r,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new oe(0,0),this.repeat=new oe(1,1),this.center=new oe(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new kt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,typeof h=="string"?this.colorSpace=h:(al("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=h===ys?Qe:Qn),this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.needsPMREMUpdate=!1}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){let n=t===void 0||typeof t=="string";if(!n&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let i={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),n||(t.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Ex)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case dp:t.x=t.x-Math.floor(t.x);break;case si:t.x=t.x<0?0:1;break;case pp:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case dp:t.y=t.y-Math.floor(t.y);break;case si:t.y=t.y<0?0:1;break;case pp:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}get encoding(){return al("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace===Qe?ys:Ux}set encoding(t){al("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=t===ys?Qe:Qn}};oi.DEFAULT_IMAGE=null;oi.DEFAULT_MAPPING=Ex;oi.DEFAULT_ANISOTROPY=1;var Ke=class e{constructor(t=0,n=0,i=0,a=1){e.prototype.isVector4=!0,this.x=t,this.y=n,this.z=i,this.w=a}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,n,i,a){return this.x=t,this.y=n,this.z=i,this.w=a,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,n){switch(t){case 0:this.x=n;break;case 1:this.y=n;break;case 2:this.z=n;break;case 3:this.w=n;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,n){return this.x=t.x+n.x,this.y=t.y+n.y,this.z=t.z+n.z,this.w=t.w+n.w,this}addScaledVector(t,n){return this.x+=t.x*n,this.y+=t.y*n,this.z+=t.z*n,this.w+=t.w*n,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,n){return this.x=t.x-n.x,this.y=t.y-n.y,this.z=t.z-n.z,this.w=t.w-n.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let n=this.x,i=this.y,a=this.z,s=this.w,r=t.elements;return this.x=r[0]*n+r[4]*i+r[8]*a+r[12]*s,this.y=r[1]*n+r[5]*i+r[9]*a+r[13]*s,this.z=r[2]*n+r[6]*i+r[10]*a+r[14]*s,this.w=r[3]*n+r[7]*i+r[11]*a+r[15]*s,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let n=Math.sqrt(1-t.w*t.w);return n<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/n,this.y=t.y/n,this.z=t.z/n),this}setAxisAngleFromRotationMatrix(t){let n,i,a,s,l=t.elements,c=l[0],h=l[4],d=l[8],f=l[1],p=l[5],v=l[9],y=l[2],m=l[6],u=l[10];if(Math.abs(h-f)<.01&&Math.abs(d-y)<.01&&Math.abs(v-m)<.01){if(Math.abs(h+f)<.1&&Math.abs(d+y)<.1&&Math.abs(v+m)<.1&&Math.abs(c+p+u-3)<.1)return this.set(1,0,0,0),this;n=Math.PI;let g=(c+1)/2,b=(p+1)/2,T=(u+1)/2,R=(h+f)/4,w=(d+y)/4,U=(v+m)/4;return g>b&&g>T?g<.01?(i=0,a=.707106781,s=.707106781):(i=Math.sqrt(g),a=R/i,s=w/i):b>T?b<.01?(i=.707106781,a=0,s=.707106781):(a=Math.sqrt(b),i=R/a,s=U/a):T<.01?(i=.707106781,a=.707106781,s=0):(s=Math.sqrt(T),i=w/s,a=U/s),this.set(i,a,s,n),this}let _=Math.sqrt((m-v)*(m-v)+(d-y)*(d-y)+(f-h)*(f-h));return Math.abs(_)<.001&&(_=1),this.x=(m-v)/_,this.y=(d-y)/_,this.z=(f-h)/_,this.w=Math.acos((c+p+u-1)/2),this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,n){return this.x=Math.max(t.x,Math.min(n.x,this.x)),this.y=Math.max(t.y,Math.min(n.y,this.y)),this.z=Math.max(t.z,Math.min(n.z,this.z)),this.w=Math.max(t.w,Math.min(n.w,this.w)),this}clampScalar(t,n){return this.x=Math.max(t,Math.min(n,this.x)),this.y=Math.max(t,Math.min(n,this.y)),this.z=Math.max(t,Math.min(n,this.z)),this.w=Math.max(t,Math.min(n,this.w)),this}clampLength(t,n){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(t,Math.min(n,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,n){return this.x+=(t.x-this.x)*n,this.y+=(t.y-this.y)*n,this.z+=(t.z-this.z)*n,this.w+=(t.w-this.w)*n,this}lerpVectors(t,n,i){return this.x=t.x+(n.x-t.x)*i,this.y=t.y+(n.y-t.y)*i,this.z=t.z+(n.z-t.z)*i,this.w=t.w+(n.w-t.w)*i,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,n=0){return this.x=t[n],this.y=t[n+1],this.z=t[n+2],this.w=t[n+3],this}toArray(t=[],n=0){return t[n]=this.x,t[n+1]=this.y,t[n+2]=this.z,t[n+3]=this.w,t}fromBufferAttribute(t,n){return this.x=t.getX(n),this.y=t.getY(n),this.z=t.getZ(n),this.w=t.getW(n),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},vp=class extends Va{constructor(t=1,n=1,i={}){super(),this.isRenderTarget=!0,this.width=t,this.height=n,this.depth=1,this.scissor=new Ke(0,0,t,n),this.scissorTest=!1,this.viewport=new Ke(0,0,t,n);let a={width:t,height:n,depth:1};i.encoding!==void 0&&(al("THREE.WebGLRenderTarget: option.encoding has been replaced by option.colorSpace."),i.colorSpace=i.encoding===ys?Qe:Qn),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Jn,depthBuffer:!0,stencilBuffer:!1,depthTexture:null,samples:0},i),this.texture=new oi(a,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.flipY=!1,this.texture.generateMipmaps=i.generateMipmaps,this.texture.internalFormat=i.internalFormat,this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.depthTexture=i.depthTexture,this.samples=i.samples}setSize(t,n,i=1){(this.width!==t||this.height!==n||this.depth!==i)&&(this.width=t,this.height=n,this.depth=i,this.texture.image.width=t,this.texture.image.height=n,this.texture.image.depth=i,this.dispose()),this.viewport.set(0,0,t,n),this.scissor.set(0,0,t,n)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.texture=t.texture.clone(),this.texture.isRenderTargetTexture=!0;let n=Object.assign({},t.texture.image);return this.texture.source=new bu(n),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}},ta=class extends vp{constructor(t=1,n=1,i={}){super(t,n,i),this.isWebGLRenderTarget=!0}},Mu=class extends oi{constructor(t=null,n=1,i=1,a=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:n,height:i,depth:a},this.magFilter=hn,this.minFilter=hn,this.wrapR=si,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var yp=class extends oi{constructor(t=null,n=1,i=1,a=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:n,height:i,depth:a},this.magFilter=hn,this.minFilter=hn,this.wrapR=si,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var zn=class{constructor(t=0,n=0,i=0,a=1){this.isQuaternion=!0,this._x=t,this._y=n,this._z=i,this._w=a}static slerpFlat(t,n,i,a,s,r,o){let l=i[a+0],c=i[a+1],h=i[a+2],d=i[a+3],f=s[r+0],p=s[r+1],v=s[r+2],y=s[r+3];if(o===0){t[n+0]=l,t[n+1]=c,t[n+2]=h,t[n+3]=d;return}if(o===1){t[n+0]=f,t[n+1]=p,t[n+2]=v,t[n+3]=y;return}if(d!==y||l!==f||c!==p||h!==v){let m=1-o,u=l*f+c*p+h*v+d*y,_=u>=0?1:-1,g=1-u*u;if(g>Number.EPSILON){let T=Math.sqrt(g),R=Math.atan2(T,u*_);m=Math.sin(m*R)/T,o=Math.sin(o*R)/T}let b=o*_;if(l=l*m+f*b,c=c*m+p*b,h=h*m+v*b,d=d*m+y*b,m===1-o){let T=1/Math.sqrt(l*l+c*c+h*h+d*d);l*=T,c*=T,h*=T,d*=T}}t[n]=l,t[n+1]=c,t[n+2]=h,t[n+3]=d}static multiplyQuaternionsFlat(t,n,i,a,s,r){let o=i[a],l=i[a+1],c=i[a+2],h=i[a+3],d=s[r],f=s[r+1],p=s[r+2],v=s[r+3];return t[n]=o*v+h*d+l*p-c*f,t[n+1]=l*v+h*f+c*d-o*p,t[n+2]=c*v+h*p+o*f-l*d,t[n+3]=h*v-o*d-l*f-c*p,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,n,i,a){return this._x=t,this._y=n,this._z=i,this._w=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,n){let i=t._x,a=t._y,s=t._z,r=t._order,o=Math.cos,l=Math.sin,c=o(i/2),h=o(a/2),d=o(s/2),f=l(i/2),p=l(a/2),v=l(s/2);switch(r){case"XYZ":this._x=f*h*d+c*p*v,this._y=c*p*d-f*h*v,this._z=c*h*v+f*p*d,this._w=c*h*d-f*p*v;break;case"YXZ":this._x=f*h*d+c*p*v,this._y=c*p*d-f*h*v,this._z=c*h*v-f*p*d,this._w=c*h*d+f*p*v;break;case"ZXY":this._x=f*h*d-c*p*v,this._y=c*p*d+f*h*v,this._z=c*h*v+f*p*d,this._w=c*h*d-f*p*v;break;case"ZYX":this._x=f*h*d-c*p*v,this._y=c*p*d+f*h*v,this._z=c*h*v-f*p*d,this._w=c*h*d+f*p*v;break;case"YZX":this._x=f*h*d+c*p*v,this._y=c*p*d+f*h*v,this._z=c*h*v-f*p*d,this._w=c*h*d-f*p*v;break;case"XZY":this._x=f*h*d-c*p*v,this._y=c*p*d-f*h*v,this._z=c*h*v+f*p*d,this._w=c*h*d+f*p*v;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+r)}return n!==!1&&this._onChangeCallback(),this}setFromAxisAngle(t,n){let i=n/2,a=Math.sin(i);return this._x=t.x*a,this._y=t.y*a,this._z=t.z*a,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(t){let n=t.elements,i=n[0],a=n[4],s=n[8],r=n[1],o=n[5],l=n[9],c=n[2],h=n[6],d=n[10],f=i+o+d;if(f>0){let p=.5/Math.sqrt(f+1);this._w=.25/p,this._x=(h-l)*p,this._y=(s-c)*p,this._z=(r-a)*p}else if(i>o&&i>d){let p=2*Math.sqrt(1+i-o-d);this._w=(h-l)/p,this._x=.25*p,this._y=(a+r)/p,this._z=(s+c)/p}else if(o>d){let p=2*Math.sqrt(1+o-i-d);this._w=(s-c)/p,this._x=(a+r)/p,this._y=.25*p,this._z=(l+h)/p}else{let p=2*Math.sqrt(1+d-i-o);this._w=(r-a)/p,this._x=(s+c)/p,this._y=(l+h)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(t,n){let i=t.dot(n)+1;return i<Number.EPSILON?(i=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=i):(this._x=0,this._y=-t.z,this._z=t.y,this._w=i)):(this._x=t.y*n.z-t.z*n.y,this._y=t.z*n.x-t.x*n.z,this._z=t.x*n.y-t.y*n.x,this._w=i),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(xn(this.dot(t),-1,1)))}rotateTowards(t,n){let i=this.angleTo(t);if(i===0)return this;let a=Math.min(1,n/i);return this.slerp(t,a),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,n){let i=t._x,a=t._y,s=t._z,r=t._w,o=n._x,l=n._y,c=n._z,h=n._w;return this._x=i*h+r*o+a*c-s*l,this._y=a*h+r*l+s*o-i*c,this._z=s*h+r*c+i*l-a*o,this._w=r*h-i*o-a*l-s*c,this._onChangeCallback(),this}slerp(t,n){if(n===0)return this;if(n===1)return this.copy(t);let i=this._x,a=this._y,s=this._z,r=this._w,o=r*t._w+i*t._x+a*t._y+s*t._z;if(o<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,o=-o):this.copy(t),o>=1)return this._w=r,this._x=i,this._y=a,this._z=s,this;let l=1-o*o;if(l<=Number.EPSILON){let p=1-n;return this._w=p*r+n*this._w,this._x=p*i+n*this._x,this._y=p*a+n*this._y,this._z=p*s+n*this._z,this.normalize(),this._onChangeCallback(),this}let c=Math.sqrt(l),h=Math.atan2(c,o),d=Math.sin((1-n)*h)/c,f=Math.sin(n*h)/c;return this._w=r*d+this._w*f,this._x=i*d+this._x*f,this._y=a*d+this._y*f,this._z=s*d+this._z*f,this._onChangeCallback(),this}slerpQuaternions(t,n,i){return this.copy(t).slerp(n,i)}random(){let t=Math.random(),n=Math.sqrt(1-t),i=Math.sqrt(t),a=2*Math.PI*Math.random(),s=2*Math.PI*Math.random();return this.set(n*Math.cos(a),i*Math.sin(s),i*Math.cos(s),n*Math.sin(a))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,n=0){return this._x=t[n],this._y=t[n+1],this._z=t[n+2],this._w=t[n+3],this._onChangeCallback(),this}toArray(t=[],n=0){return t[n]=this._x,t[n+1]=this._y,t[n+2]=this._z,t[n+3]=this._w,t}fromBufferAttribute(t,n){return this._x=t.getX(n),this._y=t.getY(n),this._z=t.getZ(n),this._w=t.getW(n),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},I=class e{constructor(t=0,n=0,i=0){e.prototype.isVector3=!0,this.x=t,this.y=n,this.z=i}set(t,n,i){return i===void 0&&(i=this.z),this.x=t,this.y=n,this.z=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,n){switch(t){case 0:this.x=n;break;case 1:this.y=n;break;case 2:this.z=n;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,n){return this.x=t.x+n.x,this.y=t.y+n.y,this.z=t.z+n.z,this}addScaledVector(t,n){return this.x+=t.x*n,this.y+=t.y*n,this.z+=t.z*n,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,n){return this.x=t.x-n.x,this.y=t.y-n.y,this.z=t.z-n.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,n){return this.x=t.x*n.x,this.y=t.y*n.y,this.z=t.z*n.z,this}applyEuler(t){return this.applyQuaternion(Gy.setFromEuler(t))}applyAxisAngle(t,n){return this.applyQuaternion(Gy.setFromAxisAngle(t,n))}applyMatrix3(t){let n=this.x,i=this.y,a=this.z,s=t.elements;return this.x=s[0]*n+s[3]*i+s[6]*a,this.y=s[1]*n+s[4]*i+s[7]*a,this.z=s[2]*n+s[5]*i+s[8]*a,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let n=this.x,i=this.y,a=this.z,s=t.elements,r=1/(s[3]*n+s[7]*i+s[11]*a+s[15]);return this.x=(s[0]*n+s[4]*i+s[8]*a+s[12])*r,this.y=(s[1]*n+s[5]*i+s[9]*a+s[13])*r,this.z=(s[2]*n+s[6]*i+s[10]*a+s[14])*r,this}applyQuaternion(t){let n=this.x,i=this.y,a=this.z,s=t.x,r=t.y,o=t.z,l=t.w,c=2*(r*a-o*i),h=2*(o*n-s*a),d=2*(s*i-r*n);return this.x=n+l*c+r*d-o*h,this.y=i+l*h+o*c-s*d,this.z=a+l*d+s*h-r*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let n=this.x,i=this.y,a=this.z,s=t.elements;return this.x=s[0]*n+s[4]*i+s[8]*a,this.y=s[1]*n+s[5]*i+s[9]*a,this.z=s[2]*n+s[6]*i+s[10]*a,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,n){return this.x=Math.max(t.x,Math.min(n.x,this.x)),this.y=Math.max(t.y,Math.min(n.y,this.y)),this.z=Math.max(t.z,Math.min(n.z,this.z)),this}clampScalar(t,n){return this.x=Math.max(t,Math.min(n,this.x)),this.y=Math.max(t,Math.min(n,this.y)),this.z=Math.max(t,Math.min(n,this.z)),this}clampLength(t,n){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(t,Math.min(n,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,n){return this.x+=(t.x-this.x)*n,this.y+=(t.y-this.y)*n,this.z+=(t.z-this.z)*n,this}lerpVectors(t,n,i){return this.x=t.x+(n.x-t.x)*i,this.y=t.y+(n.y-t.y)*i,this.z=t.z+(n.z-t.z)*i,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,n){let i=t.x,a=t.y,s=t.z,r=n.x,o=n.y,l=n.z;return this.x=a*l-s*o,this.y=s*r-i*l,this.z=i*o-a*r,this}projectOnVector(t){let n=t.lengthSq();if(n===0)return this.set(0,0,0);let i=t.dot(this)/n;return this.copy(t).multiplyScalar(i)}projectOnPlane(t){return Wd.copy(this).projectOnVector(t),this.sub(Wd)}reflect(t){return this.sub(Wd.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let n=Math.sqrt(this.lengthSq()*t.lengthSq());if(n===0)return Math.PI/2;let i=this.dot(t)/n;return Math.acos(xn(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let n=this.x-t.x,i=this.y-t.y,a=this.z-t.z;return n*n+i*i+a*a}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,n,i){let a=Math.sin(n)*t;return this.x=a*Math.sin(i),this.y=Math.cos(n)*t,this.z=a*Math.cos(i),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,n,i){return this.x=t*Math.sin(n),this.y=i,this.z=t*Math.cos(n),this}setFromMatrixPosition(t){let n=t.elements;return this.x=n[12],this.y=n[13],this.z=n[14],this}setFromMatrixScale(t){let n=this.setFromMatrixColumn(t,0).length(),i=this.setFromMatrixColumn(t,1).length(),a=this.setFromMatrixColumn(t,2).length();return this.x=n,this.y=i,this.z=a,this}setFromMatrixColumn(t,n){return this.fromArray(t.elements,n*4)}setFromMatrix3Column(t,n){return this.fromArray(t.elements,n*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,n=0){return this.x=t[n],this.y=t[n+1],this.z=t[n+2],this}toArray(t=[],n=0){return t[n]=this.x,t[n+1]=this.y,t[n+2]=this.z,t}fromBufferAttribute(t,n){return this.x=t.getX(n),this.y=t.getY(n),this.z=t.getZ(n),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=(Math.random()-.5)*2,n=Math.random()*Math.PI*2,i=Math.sqrt(1-t**2);return this.x=i*Math.cos(n),this.y=i*Math.sin(n),this.z=t,this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Wd=new I,Gy=new zn,xs=class{constructor(t=new I(1/0,1/0,1/0),n=new I(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=n}set(t,n){return this.min.copy(t),this.max.copy(n),this}setFromArray(t){this.makeEmpty();for(let n=0,i=t.length;n<i;n+=3)this.expandByPoint(ni.fromArray(t,n));return this}setFromBufferAttribute(t){this.makeEmpty();for(let n=0,i=t.count;n<i;n++)this.expandByPoint(ni.fromBufferAttribute(t,n));return this}setFromPoints(t){this.makeEmpty();for(let n=0,i=t.length;n<i;n++)this.expandByPoint(t[n]);return this}setFromCenterAndSize(t,n){let i=ni.copy(n).multiplyScalar(.5);return this.min.copy(t).sub(i),this.max.copy(t).add(i),this}setFromObject(t,n=!1){return this.makeEmpty(),this.expandByObject(t,n)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,n=!1){t.updateWorldMatrix(!1,!1);let i=t.geometry;if(i!==void 0){let s=i.getAttribute("position");if(n===!0&&s!==void 0&&t.isInstancedMesh!==!0)for(let r=0,o=s.count;r<o;r++)t.isMesh===!0?t.getVertexPosition(r,ni):ni.fromBufferAttribute(s,r),ni.applyMatrix4(t.matrixWorld),this.expandByPoint(ni);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Xc.copy(t.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Xc.copy(i.boundingBox)),Xc.applyMatrix4(t.matrixWorld),this.union(Xc)}let a=t.children;for(let s=0,r=a.length;s<r;s++)this.expandByObject(a[s],n);return this}containsPoint(t){return!(t.x<this.min.x||t.x>this.max.x||t.y<this.min.y||t.y>this.max.y||t.z<this.min.z||t.z>this.max.z)}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,n){return n.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return!(t.max.x<this.min.x||t.min.x>this.max.x||t.max.y<this.min.y||t.min.y>this.max.y||t.max.z<this.min.z||t.min.z>this.max.z)}intersectsSphere(t){return this.clampPoint(t.center,ni),ni.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let n,i;return t.normal.x>0?(n=t.normal.x*this.min.x,i=t.normal.x*this.max.x):(n=t.normal.x*this.max.x,i=t.normal.x*this.min.x),t.normal.y>0?(n+=t.normal.y*this.min.y,i+=t.normal.y*this.max.y):(n+=t.normal.y*this.max.y,i+=t.normal.y*this.min.y),t.normal.z>0?(n+=t.normal.z*this.min.z,i+=t.normal.z*this.max.z):(n+=t.normal.z*this.max.z,i+=t.normal.z*this.min.z),n<=-t.constant&&i>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter($o),qc.subVectors(this.max,$o),Sr.subVectors(t.a,$o),br.subVectors(t.b,$o),Mr.subVectors(t.c,$o),La.subVectors(br,Sr),Da.subVectors(Mr,br),us.subVectors(Sr,Mr);let n=[0,-La.z,La.y,0,-Da.z,Da.y,0,-us.z,us.y,La.z,0,-La.x,Da.z,0,-Da.x,us.z,0,-us.x,-La.y,La.x,0,-Da.y,Da.x,0,-us.y,us.x,0];return!Xd(n,Sr,br,Mr,qc)||(n=[1,0,0,0,1,0,0,0,1],!Xd(n,Sr,br,Mr,qc))?!1:(Yc.crossVectors(La,Da),n=[Yc.x,Yc.y,Yc.z],Xd(n,Sr,br,Mr,qc))}clampPoint(t,n){return n.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,ni).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(ni).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(ki[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),ki[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),ki[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),ki[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),ki[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),ki[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),ki[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),ki[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(ki),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}},ki=[new I,new I,new I,new I,new I,new I,new I,new I],ni=new I,Xc=new xs,Sr=new I,br=new I,Mr=new I,La=new I,Da=new I,us=new I,$o=new I,qc=new I,Yc=new I,hs=new I;function Xd(e,t,n,i,a){for(let s=0,r=e.length-3;s<=r;s+=3){hs.fromArray(e,s);let o=a.x*Math.abs(hs.x)+a.y*Math.abs(hs.y)+a.z*Math.abs(hs.z),l=t.dot(hs),c=n.dot(hs),h=i.dot(hs);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}var dE=new xs,tl=new I,qd=new I,ll=class{constructor(t=new I,n=-1){this.center=t,this.radius=n}set(t,n){return this.center.copy(t),this.radius=n,this}setFromPoints(t,n){let i=this.center;n!==void 0?i.copy(n):dE.setFromPoints(t).getCenter(i);let a=0;for(let s=0,r=t.length;s<r;s++)a=Math.max(a,i.distanceToSquared(t[s]));return this.radius=Math.sqrt(a),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){let n=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=n*n}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,n){let i=this.center.distanceToSquared(t);return n.copy(t),i>this.radius*this.radius&&(n.sub(this.center).normalize(),n.multiplyScalar(this.radius).add(this.center)),n}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;tl.subVectors(t,this.center);let n=tl.lengthSq();if(n>this.radius*this.radius){let i=Math.sqrt(n),a=(i-this.radius)*.5;this.center.addScaledVector(tl,a/i),this.radius+=a}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(qd.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(tl.copy(t.center).add(qd)),this.expandByPoint(tl.copy(t.center).sub(qd))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}},Wi=new I,Yd=new I,Zc=new I,Ua=new I,Zd=new I,jc=new I,jd=new I,xp=class{constructor(t=new I,n=new I(0,0,-1)){this.origin=t,this.direction=n}set(t,n){return this.origin.copy(t),this.direction.copy(n),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,n){return n.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Wi)),this}closestPointToPoint(t,n){n.subVectors(t,this.origin);let i=n.dot(this.direction);return i<0?n.copy(this.origin):n.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let n=Wi.subVectors(t,this.origin).dot(this.direction);return n<0?this.origin.distanceToSquared(t):(Wi.copy(this.origin).addScaledVector(this.direction,n),Wi.distanceToSquared(t))}distanceSqToSegment(t,n,i,a){Yd.copy(t).add(n).multiplyScalar(.5),Zc.copy(n).sub(t).normalize(),Ua.copy(this.origin).sub(Yd);let s=t.distanceTo(n)*.5,r=-this.direction.dot(Zc),o=Ua.dot(this.direction),l=-Ua.dot(Zc),c=Ua.lengthSq(),h=Math.abs(1-r*r),d,f,p,v;if(h>0)if(d=r*l-o,f=r*o-l,v=s*h,d>=0)if(f>=-v)if(f<=v){let y=1/h;d*=y,f*=y,p=d*(d+r*f+2*o)+f*(r*d+f+2*l)+c}else f=s,d=Math.max(0,-(r*f+o)),p=-d*d+f*(f+2*l)+c;else f=-s,d=Math.max(0,-(r*f+o)),p=-d*d+f*(f+2*l)+c;else f<=-v?(d=Math.max(0,-(-r*s+o)),f=d>0?-s:Math.min(Math.max(-s,-l),s),p=-d*d+f*(f+2*l)+c):f<=v?(d=0,f=Math.min(Math.max(-s,-l),s),p=f*(f+2*l)+c):(d=Math.max(0,-(r*s+o)),f=d>0?s:Math.min(Math.max(-s,-l),s),p=-d*d+f*(f+2*l)+c);else f=r>0?-s:s,d=Math.max(0,-(r*f+o)),p=-d*d+f*(f+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,d),a&&a.copy(Yd).addScaledVector(Zc,f),p}intersectSphere(t,n){Wi.subVectors(t.center,this.origin);let i=Wi.dot(this.direction),a=Wi.dot(Wi)-i*i,s=t.radius*t.radius;if(a>s)return null;let r=Math.sqrt(s-a),o=i-r,l=i+r;return l<0?null:o<0?this.at(l,n):this.at(o,n)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let n=t.normal.dot(this.direction);if(n===0)return t.distanceToPoint(this.origin)===0?0:null;let i=-(this.origin.dot(t.normal)+t.constant)/n;return i>=0?i:null}intersectPlane(t,n){let i=this.distanceToPlane(t);return i===null?null:this.at(i,n)}intersectsPlane(t){let n=t.distanceToPoint(this.origin);return n===0||t.normal.dot(this.direction)*n<0}intersectBox(t,n){let i,a,s,r,o,l,c=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,f=this.origin;return c>=0?(i=(t.min.x-f.x)*c,a=(t.max.x-f.x)*c):(i=(t.max.x-f.x)*c,a=(t.min.x-f.x)*c),h>=0?(s=(t.min.y-f.y)*h,r=(t.max.y-f.y)*h):(s=(t.max.y-f.y)*h,r=(t.min.y-f.y)*h),i>r||s>a||((s>i||isNaN(i))&&(i=s),(r<a||isNaN(a))&&(a=r),d>=0?(o=(t.min.z-f.z)*d,l=(t.max.z-f.z)*d):(o=(t.max.z-f.z)*d,l=(t.min.z-f.z)*d),i>l||o>a)||((o>i||i!==i)&&(i=o),(l<a||a!==a)&&(a=l),a<0)?null:this.at(i>=0?i:a,n)}intersectsBox(t){return this.intersectBox(t,Wi)!==null}intersectTriangle(t,n,i,a,s){Zd.subVectors(n,t),jc.subVectors(i,t),jd.crossVectors(Zd,jc);let r=this.direction.dot(jd),o;if(r>0){if(a)return null;o=1}else if(r<0)o=-1,r=-r;else return null;Ua.subVectors(this.origin,t);let l=o*this.direction.dot(jc.crossVectors(Ua,jc));if(l<0)return null;let c=o*this.direction.dot(Zd.cross(Ua));if(c<0||l+c>r)return null;let h=-o*Ua.dot(jd);return h<0?null:this.at(h/r,s)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},an=class e{constructor(t,n,i,a,s,r,o,l,c,h,d,f,p,v,y,m){e.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,n,i,a,s,r,o,l,c,h,d,f,p,v,y,m)}set(t,n,i,a,s,r,o,l,c,h,d,f,p,v,y,m){let u=this.elements;return u[0]=t,u[4]=n,u[8]=i,u[12]=a,u[1]=s,u[5]=r,u[9]=o,u[13]=l,u[2]=c,u[6]=h,u[10]=d,u[14]=f,u[3]=p,u[7]=v,u[11]=y,u[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new e().fromArray(this.elements)}copy(t){let n=this.elements,i=t.elements;return n[0]=i[0],n[1]=i[1],n[2]=i[2],n[3]=i[3],n[4]=i[4],n[5]=i[5],n[6]=i[6],n[7]=i[7],n[8]=i[8],n[9]=i[9],n[10]=i[10],n[11]=i[11],n[12]=i[12],n[13]=i[13],n[14]=i[14],n[15]=i[15],this}copyPosition(t){let n=this.elements,i=t.elements;return n[12]=i[12],n[13]=i[13],n[14]=i[14],this}setFromMatrix3(t){let n=t.elements;return this.set(n[0],n[3],n[6],0,n[1],n[4],n[7],0,n[2],n[5],n[8],0,0,0,0,1),this}extractBasis(t,n,i){return t.setFromMatrixColumn(this,0),n.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(t,n,i){return this.set(t.x,n.x,i.x,0,t.y,n.y,i.y,0,t.z,n.z,i.z,0,0,0,0,1),this}extractRotation(t){let n=this.elements,i=t.elements,a=1/Er.setFromMatrixColumn(t,0).length(),s=1/Er.setFromMatrixColumn(t,1).length(),r=1/Er.setFromMatrixColumn(t,2).length();return n[0]=i[0]*a,n[1]=i[1]*a,n[2]=i[2]*a,n[3]=0,n[4]=i[4]*s,n[5]=i[5]*s,n[6]=i[6]*s,n[7]=0,n[8]=i[8]*r,n[9]=i[9]*r,n[10]=i[10]*r,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeRotationFromEuler(t){let n=this.elements,i=t.x,a=t.y,s=t.z,r=Math.cos(i),o=Math.sin(i),l=Math.cos(a),c=Math.sin(a),h=Math.cos(s),d=Math.sin(s);if(t.order==="XYZ"){let f=r*h,p=r*d,v=o*h,y=o*d;n[0]=l*h,n[4]=-l*d,n[8]=c,n[1]=p+v*c,n[5]=f-y*c,n[9]=-o*l,n[2]=y-f*c,n[6]=v+p*c,n[10]=r*l}else if(t.order==="YXZ"){let f=l*h,p=l*d,v=c*h,y=c*d;n[0]=f+y*o,n[4]=v*o-p,n[8]=r*c,n[1]=r*d,n[5]=r*h,n[9]=-o,n[2]=p*o-v,n[6]=y+f*o,n[10]=r*l}else if(t.order==="ZXY"){let f=l*h,p=l*d,v=c*h,y=c*d;n[0]=f-y*o,n[4]=-r*d,n[8]=v+p*o,n[1]=p+v*o,n[5]=r*h,n[9]=y-f*o,n[2]=-r*c,n[6]=o,n[10]=r*l}else if(t.order==="ZYX"){let f=r*h,p=r*d,v=o*h,y=o*d;n[0]=l*h,n[4]=v*c-p,n[8]=f*c+y,n[1]=l*d,n[5]=y*c+f,n[9]=p*c-v,n[2]=-c,n[6]=o*l,n[10]=r*l}else if(t.order==="YZX"){let f=r*l,p=r*c,v=o*l,y=o*c;n[0]=l*h,n[4]=y-f*d,n[8]=v*d+p,n[1]=d,n[5]=r*h,n[9]=-o*h,n[2]=-c*h,n[6]=p*d+v,n[10]=f-y*d}else if(t.order==="XZY"){let f=r*l,p=r*c,v=o*l,y=o*c;n[0]=l*h,n[4]=-d,n[8]=c*h,n[1]=f*d+y,n[5]=r*h,n[9]=p*d-v,n[2]=v*d-p,n[6]=o*h,n[10]=y*d+f}return n[3]=0,n[7]=0,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeRotationFromQuaternion(t){return this.compose(pE,t,mE)}lookAt(t,n,i){let a=this.elements;return Nn.subVectors(t,n),Nn.lengthSq()===0&&(Nn.z=1),Nn.normalize(),Na.crossVectors(i,Nn),Na.lengthSq()===0&&(Math.abs(i.z)===1?Nn.x+=1e-4:Nn.z+=1e-4,Nn.normalize(),Na.crossVectors(i,Nn)),Na.normalize(),Jc.crossVectors(Nn,Na),a[0]=Na.x,a[4]=Jc.x,a[8]=Nn.x,a[1]=Na.y,a[5]=Jc.y,a[9]=Nn.y,a[2]=Na.z,a[6]=Jc.z,a[10]=Nn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,n){let i=t.elements,a=n.elements,s=this.elements,r=i[0],o=i[4],l=i[8],c=i[12],h=i[1],d=i[5],f=i[9],p=i[13],v=i[2],y=i[6],m=i[10],u=i[14],_=i[3],g=i[7],b=i[11],T=i[15],R=a[0],w=a[4],U=a[8],x=a[12],A=a[1],F=a[5],Y=a[9],$=a[13],L=a[2],H=a[6],q=a[10],k=a[14],Q=a[3],X=a[7],j=a[11],tt=a[15];return s[0]=r*R+o*A+l*L+c*Q,s[4]=r*w+o*F+l*H+c*X,s[8]=r*U+o*Y+l*q+c*j,s[12]=r*x+o*$+l*k+c*tt,s[1]=h*R+d*A+f*L+p*Q,s[5]=h*w+d*F+f*H+p*X,s[9]=h*U+d*Y+f*q+p*j,s[13]=h*x+d*$+f*k+p*tt,s[2]=v*R+y*A+m*L+u*Q,s[6]=v*w+y*F+m*H+u*X,s[10]=v*U+y*Y+m*q+u*j,s[14]=v*x+y*$+m*k+u*tt,s[3]=_*R+g*A+b*L+T*Q,s[7]=_*w+g*F+b*H+T*X,s[11]=_*U+g*Y+b*q+T*j,s[15]=_*x+g*$+b*k+T*tt,this}multiplyScalar(t){let n=this.elements;return n[0]*=t,n[4]*=t,n[8]*=t,n[12]*=t,n[1]*=t,n[5]*=t,n[9]*=t,n[13]*=t,n[2]*=t,n[6]*=t,n[10]*=t,n[14]*=t,n[3]*=t,n[7]*=t,n[11]*=t,n[15]*=t,this}determinant(){let t=this.elements,n=t[0],i=t[4],a=t[8],s=t[12],r=t[1],o=t[5],l=t[9],c=t[13],h=t[2],d=t[6],f=t[10],p=t[14],v=t[3],y=t[7],m=t[11],u=t[15];return v*(+s*l*d-a*c*d-s*o*f+i*c*f+a*o*p-i*l*p)+y*(+n*l*p-n*c*f+s*r*f-a*r*p+a*c*h-s*l*h)+m*(+n*c*d-n*o*p-s*r*d+i*r*p+s*o*h-i*c*h)+u*(-a*o*h-n*l*d+n*o*f+a*r*d-i*r*f+i*l*h)}transpose(){let t=this.elements,n;return n=t[1],t[1]=t[4],t[4]=n,n=t[2],t[2]=t[8],t[8]=n,n=t[6],t[6]=t[9],t[9]=n,n=t[3],t[3]=t[12],t[12]=n,n=t[7],t[7]=t[13],t[13]=n,n=t[11],t[11]=t[14],t[14]=n,this}setPosition(t,n,i){let a=this.elements;return t.isVector3?(a[12]=t.x,a[13]=t.y,a[14]=t.z):(a[12]=t,a[13]=n,a[14]=i),this}invert(){let t=this.elements,n=t[0],i=t[1],a=t[2],s=t[3],r=t[4],o=t[5],l=t[6],c=t[7],h=t[8],d=t[9],f=t[10],p=t[11],v=t[12],y=t[13],m=t[14],u=t[15],_=d*m*c-y*f*c+y*l*p-o*m*p-d*l*u+o*f*u,g=v*f*c-h*m*c-v*l*p+r*m*p+h*l*u-r*f*u,b=h*y*c-v*d*c+v*o*p-r*y*p-h*o*u+r*d*u,T=v*d*l-h*y*l-v*o*f+r*y*f+h*o*m-r*d*m,R=n*_+i*g+a*b+s*T;if(R===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let w=1/R;return t[0]=_*w,t[1]=(y*f*s-d*m*s-y*a*p+i*m*p+d*a*u-i*f*u)*w,t[2]=(o*m*s-y*l*s+y*a*c-i*m*c-o*a*u+i*l*u)*w,t[3]=(d*l*s-o*f*s-d*a*c+i*f*c+o*a*p-i*l*p)*w,t[4]=g*w,t[5]=(h*m*s-v*f*s+v*a*p-n*m*p-h*a*u+n*f*u)*w,t[6]=(v*l*s-r*m*s-v*a*c+n*m*c+r*a*u-n*l*u)*w,t[7]=(r*f*s-h*l*s+h*a*c-n*f*c-r*a*p+n*l*p)*w,t[8]=b*w,t[9]=(v*d*s-h*y*s-v*i*p+n*y*p+h*i*u-n*d*u)*w,t[10]=(r*y*s-v*o*s+v*i*c-n*y*c-r*i*u+n*o*u)*w,t[11]=(h*o*s-r*d*s-h*i*c+n*d*c+r*i*p-n*o*p)*w,t[12]=T*w,t[13]=(h*y*a-v*d*a+v*i*f-n*y*f-h*i*m+n*d*m)*w,t[14]=(v*o*a-r*y*a-v*i*l+n*y*l+r*i*m-n*o*m)*w,t[15]=(r*d*a-h*o*a+h*i*l-n*d*l-r*i*f+n*o*f)*w,this}scale(t){let n=this.elements,i=t.x,a=t.y,s=t.z;return n[0]*=i,n[4]*=a,n[8]*=s,n[1]*=i,n[5]*=a,n[9]*=s,n[2]*=i,n[6]*=a,n[10]*=s,n[3]*=i,n[7]*=a,n[11]*=s,this}getMaxScaleOnAxis(){let t=this.elements,n=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],i=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],a=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(n,i,a))}makeTranslation(t,n,i){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,n,0,0,1,i,0,0,0,1),this}makeRotationX(t){let n=Math.cos(t),i=Math.sin(t);return this.set(1,0,0,0,0,n,-i,0,0,i,n,0,0,0,0,1),this}makeRotationY(t){let n=Math.cos(t),i=Math.sin(t);return this.set(n,0,i,0,0,1,0,0,-i,0,n,0,0,0,0,1),this}makeRotationZ(t){let n=Math.cos(t),i=Math.sin(t);return this.set(n,-i,0,0,i,n,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,n){let i=Math.cos(n),a=Math.sin(n),s=1-i,r=t.x,o=t.y,l=t.z,c=s*r,h=s*o;return this.set(c*r+i,c*o-a*l,c*l+a*o,0,c*o+a*l,h*o+i,h*l-a*r,0,c*l-a*o,h*l+a*r,s*l*l+i,0,0,0,0,1),this}makeScale(t,n,i){return this.set(t,0,0,0,0,n,0,0,0,0,i,0,0,0,0,1),this}makeShear(t,n,i,a,s,r){return this.set(1,i,s,0,t,1,r,0,n,a,1,0,0,0,0,1),this}compose(t,n,i){let a=this.elements,s=n._x,r=n._y,o=n._z,l=n._w,c=s+s,h=r+r,d=o+o,f=s*c,p=s*h,v=s*d,y=r*h,m=r*d,u=o*d,_=l*c,g=l*h,b=l*d,T=i.x,R=i.y,w=i.z;return a[0]=(1-(y+u))*T,a[1]=(p+b)*T,a[2]=(v-g)*T,a[3]=0,a[4]=(p-b)*R,a[5]=(1-(f+u))*R,a[6]=(m+_)*R,a[7]=0,a[8]=(v+g)*w,a[9]=(m-_)*w,a[10]=(1-(f+y))*w,a[11]=0,a[12]=t.x,a[13]=t.y,a[14]=t.z,a[15]=1,this}decompose(t,n,i){let a=this.elements,s=Er.set(a[0],a[1],a[2]).length(),r=Er.set(a[4],a[5],a[6]).length(),o=Er.set(a[8],a[9],a[10]).length();this.determinant()<0&&(s=-s),t.x=a[12],t.y=a[13],t.z=a[14],ii.copy(this);let c=1/s,h=1/r,d=1/o;return ii.elements[0]*=c,ii.elements[1]*=c,ii.elements[2]*=c,ii.elements[4]*=h,ii.elements[5]*=h,ii.elements[6]*=h,ii.elements[8]*=d,ii.elements[9]*=d,ii.elements[10]*=d,n.setFromRotationMatrix(ii),i.x=s,i.y=r,i.z=o,this}makePerspective(t,n,i,a,s,r,o=Qi){let l=this.elements,c=2*s/(n-t),h=2*s/(i-a),d=(n+t)/(n-t),f=(i+a)/(i-a),p,v;if(o===Qi)p=-(r+s)/(r-s),v=-2*r*s/(r-s);else if(o===yu)p=-r/(r-s),v=-r*s/(r-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=c,l[4]=0,l[8]=d,l[12]=0,l[1]=0,l[5]=h,l[9]=f,l[13]=0,l[2]=0,l[6]=0,l[10]=p,l[14]=v,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,n,i,a,s,r,o=Qi){let l=this.elements,c=1/(n-t),h=1/(i-a),d=1/(r-s),f=(n+t)*c,p=(i+a)*h,v,y;if(o===Qi)v=(r+s)*d,y=-2*d;else if(o===yu)v=s*d,y=-1*d;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-f,l[1]=0,l[5]=2*h,l[9]=0,l[13]=-p,l[2]=0,l[6]=0,l[10]=y,l[14]=-v,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){let n=this.elements,i=t.elements;for(let a=0;a<16;a++)if(n[a]!==i[a])return!1;return!0}fromArray(t,n=0){for(let i=0;i<16;i++)this.elements[i]=t[i+n];return this}toArray(t=[],n=0){let i=this.elements;return t[n]=i[0],t[n+1]=i[1],t[n+2]=i[2],t[n+3]=i[3],t[n+4]=i[4],t[n+5]=i[5],t[n+6]=i[6],t[n+7]=i[7],t[n+8]=i[8],t[n+9]=i[9],t[n+10]=i[10],t[n+11]=i[11],t[n+12]=i[12],t[n+13]=i[13],t[n+14]=i[14],t[n+15]=i[15],t}},Er=new I,ii=new an,pE=new I(0,0,0),mE=new I(1,1,1),Na=new I,Jc=new I,Nn=new I,ky=new an,Wy=new zn,Wr=class e{constructor(t=0,n=0,i=0,a=e.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=i,this._order=a}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,n,i,a=this._order){return this._x=t,this._y=n,this._z=i,this._order=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,n=this._order,i=!0){let a=t.elements,s=a[0],r=a[4],o=a[8],l=a[1],c=a[5],h=a[9],d=a[2],f=a[6],p=a[10];switch(n){case"XYZ":this._y=Math.asin(xn(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,p),this._z=Math.atan2(-r,s)):(this._x=Math.atan2(f,c),this._z=0);break;case"YXZ":this._x=Math.asin(-xn(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,p),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,s),this._z=0);break;case"ZXY":this._x=Math.asin(xn(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-d,p),this._z=Math.atan2(-r,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-xn(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(f,p),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-r,c));break;case"YZX":this._z=Math.asin(xn(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-d,s)):(this._x=0,this._y=Math.atan2(o,p));break;case"XZY":this._z=Math.asin(-xn(r,-1,1)),Math.abs(r)<.9999999?(this._x=Math.atan2(f,c),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-h,p),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+n)}return this._order=n,i===!0&&this._onChangeCallback(),this}setFromQuaternion(t,n,i){return ky.makeRotationFromQuaternion(t),this.setFromRotationMatrix(ky,n,i)}setFromVector3(t,n=this._order){return this.set(t.x,t.y,t.z,n)}reorder(t){return Wy.setFromEuler(this),this.setFromQuaternion(Wy,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],n=0){return t[n]=this._x,t[n+1]=this._y,t[n+2]=this._z,t[n+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Wr.DEFAULT_ORDER="XYZ";var Eu=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},gE=0,Xy=new I,Tr=new zn,Xi=new an,Qc=new I,el=new I,_E=new I,vE=new zn,qy=new I(1,0,0),Yy=new I(0,1,0),Zy=new I(0,0,1),yE={type:"added"},xE={type:"removed"},Si=class e extends Va{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:gE++}),this.uuid=hl(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=e.DEFAULT_UP.clone();let t=new I,n=new Wr,i=new zn,a=new I(1,1,1);function s(){i.setFromEuler(n,!1)}function r(){n.setFromQuaternion(i,void 0,!1)}n._onChange(s),i._onChange(r),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:a},modelViewMatrix:{value:new an},normalMatrix:{value:new kt}}),this.matrix=new an,this.matrixWorld=new an,this.matrixAutoUpdate=e.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Eu,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,n){this.quaternion.setFromAxisAngle(t,n)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,n){return Tr.setFromAxisAngle(t,n),this.quaternion.multiply(Tr),this}rotateOnWorldAxis(t,n){return Tr.setFromAxisAngle(t,n),this.quaternion.premultiply(Tr),this}rotateX(t){return this.rotateOnAxis(qy,t)}rotateY(t){return this.rotateOnAxis(Yy,t)}rotateZ(t){return this.rotateOnAxis(Zy,t)}translateOnAxis(t,n){return Xy.copy(t).applyQuaternion(this.quaternion),this.position.add(Xy.multiplyScalar(n)),this}translateX(t){return this.translateOnAxis(qy,t)}translateY(t){return this.translateOnAxis(Yy,t)}translateZ(t){return this.translateOnAxis(Zy,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Xi.copy(this.matrixWorld).invert())}lookAt(t,n,i){t.isVector3?Qc.copy(t):Qc.set(t,n,i);let a=this.parent;this.updateWorldMatrix(!0,!1),el.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Xi.lookAt(el,Qc,this.up):Xi.lookAt(Qc,el,this.up),this.quaternion.setFromRotationMatrix(Xi),a&&(Xi.extractRotation(a.matrixWorld),Tr.setFromRotationMatrix(Xi),this.quaternion.premultiply(Tr.invert()))}add(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.add(arguments[n]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.parent!==null&&t.parent.remove(t),t.parent=this,this.children.push(t),t.dispatchEvent(yE)):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}let n=this.children.indexOf(t);return n!==-1&&(t.parent=null,this.children.splice(n,1),t.dispatchEvent(xE)),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Xi.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Xi.multiply(t.parent.matrixWorld)),t.applyMatrix4(Xi),this.add(t),t.updateWorldMatrix(!1,!0),this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,n){if(this[t]===n)return this;for(let i=0,a=this.children.length;i<a;i++){let r=this.children[i].getObjectByProperty(t,n);if(r!==void 0)return r}}getObjectsByProperty(t,n,i=[]){this[t]===n&&i.push(this);let a=this.children;for(let s=0,r=a.length;s<r;s++)a[s].getObjectsByProperty(t,n,i);return i}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(el,t,_E),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(el,vE,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let n=this.matrixWorld.elements;return t.set(n[8],n[9],n[10]).normalize()}raycast(){}traverse(t){t(this);let n=this.children;for(let i=0,a=n.length;i<a;i++)n[i].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let n=this.children;for(let i=0,a=n.length;i<a;i++)n[i].traverseVisible(t)}traverseAncestors(t){let n=this.parent;n!==null&&(t(n),n.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,t=!0);let n=this.children;for(let i=0,a=n.length;i<a;i++){let s=n[i];(s.matrixWorldAutoUpdate===!0||t===!0)&&s.updateMatrixWorld(t)}}updateWorldMatrix(t,n){let i=this.parent;if(t===!0&&i!==null&&i.matrixWorldAutoUpdate===!0&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),n===!0){let a=this.children;for(let s=0,r=a.length;s<r;s++){let o=a[s];o.matrixWorldAutoUpdate===!0&&o.updateWorldMatrix(!1,!0)}}}toJSON(t){let n=t===void 0||typeof t=="string",i={};n&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});let a={};a.uuid=this.uuid,a.type=this.type,this.name!==""&&(a.name=this.name),this.castShadow===!0&&(a.castShadow=!0),this.receiveShadow===!0&&(a.receiveShadow=!0),this.visible===!1&&(a.visible=!1),this.frustumCulled===!1&&(a.frustumCulled=!1),this.renderOrder!==0&&(a.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(a.userData=this.userData),a.layers=this.layers.mask,a.matrix=this.matrix.toArray(),a.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(a.matrixAutoUpdate=!1),this.isInstancedMesh&&(a.type="InstancedMesh",a.count=this.count,a.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(a.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(a.type="BatchedMesh",a.perObjectFrustumCulled=this.perObjectFrustumCulled,a.sortObjects=this.sortObjects,a.drawRanges=this._drawRanges,a.reservedRanges=this._reservedRanges,a.visibility=this._visibility,a.active=this._active,a.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),a.maxGeometryCount=this._maxGeometryCount,a.maxVertexCount=this._maxVertexCount,a.maxIndexCount=this._maxIndexCount,a.geometryInitialized=this._geometryInitialized,a.geometryCount=this._geometryCount,a.matricesTexture=this._matricesTexture.toJSON(t),this.boundingSphere!==null&&(a.boundingSphere={center:a.boundingSphere.center.toArray(),radius:a.boundingSphere.radius}),this.boundingBox!==null&&(a.boundingBox={min:a.boundingBox.min.toArray(),max:a.boundingBox.max.toArray()}));function s(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?a.background=this.background.toJSON():this.background.isTexture&&(a.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(a.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){a.geometry=s(t.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let d=l[c];s(t.shapes,d)}else s(t.shapes,l)}}if(this.isSkinnedMesh&&(a.bindMode=this.bindMode,a.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(t.skeletons,this.skeleton),a.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(s(t.materials,this.material[l]));a.material=o}else a.material=s(t.materials,this.material);if(this.children.length>0){a.children=[];for(let o=0;o<this.children.length;o++)a.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){a.animations=[];for(let o=0;o<this.animations.length;o++){let l=this.animations[o];a.animations.push(s(t.animations,l))}}if(n){let o=r(t.geometries),l=r(t.materials),c=r(t.textures),h=r(t.images),d=r(t.shapes),f=r(t.skeletons),p=r(t.animations),v=r(t.nodes);o.length>0&&(i.geometries=o),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),h.length>0&&(i.images=h),d.length>0&&(i.shapes=d),f.length>0&&(i.skeletons=f),p.length>0&&(i.animations=p),v.length>0&&(i.nodes=v)}return i.object=a,i;function r(o){let l=[];for(let c in o){let h=o[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,n=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),n===!0)for(let i=0;i<t.children.length;i++){let a=t.children[i];this.add(a.clone())}return this}};Si.DEFAULT_UP=new I(0,1,0);Si.DEFAULT_MATRIX_AUTO_UPDATE=!0;Si.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var ai=new I,qi=new I,Jd=new I,Yi=new I,Ar=new I,wr=new I,jy=new I,Qd=new I,Kd=new I,$d=new I,Kc=!1,Pr=class e{constructor(t=new I,n=new I,i=new I){this.a=t,this.b=n,this.c=i}static getNormal(t,n,i,a){a.subVectors(i,n),ai.subVectors(t,n),a.cross(ai);let s=a.lengthSq();return s>0?a.multiplyScalar(1/Math.sqrt(s)):a.set(0,0,0)}static getBarycoord(t,n,i,a,s){ai.subVectors(a,n),qi.subVectors(i,n),Jd.subVectors(t,n);let r=ai.dot(ai),o=ai.dot(qi),l=ai.dot(Jd),c=qi.dot(qi),h=qi.dot(Jd),d=r*c-o*o;if(d===0)return s.set(-2,-1,-1);let f=1/d,p=(c*l-o*h)*f,v=(r*h-o*l)*f;return s.set(1-p-v,v,p)}static containsPoint(t,n,i,a){return this.getBarycoord(t,n,i,a,Yi),Yi.x>=0&&Yi.y>=0&&Yi.x+Yi.y<=1}static getUV(t,n,i,a,s,r,o,l){return Kc===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),Kc=!0),this.getInterpolation(t,n,i,a,s,r,o,l)}static getInterpolation(t,n,i,a,s,r,o,l){return this.getBarycoord(t,n,i,a,Yi),l.setScalar(0),l.addScaledVector(s,Yi.x),l.addScaledVector(r,Yi.y),l.addScaledVector(o,Yi.z),l}static isFrontFacing(t,n,i,a){return ai.subVectors(i,n),qi.subVectors(t,n),ai.cross(qi).dot(a)<0}set(t,n,i){return this.a.copy(t),this.b.copy(n),this.c.copy(i),this}setFromPointsAndIndices(t,n,i,a){return this.a.copy(t[n]),this.b.copy(t[i]),this.c.copy(t[a]),this}setFromAttributeAndIndices(t,n,i,a){return this.a.fromBufferAttribute(t,n),this.b.fromBufferAttribute(t,i),this.c.fromBufferAttribute(t,a),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return ai.subVectors(this.c,this.b),qi.subVectors(this.a,this.b),ai.cross(qi).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return e.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return e.getBarycoord(t,this.a,this.b,this.c,n)}getUV(t,n,i,a,s){return Kc===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),Kc=!0),e.getInterpolation(t,this.a,this.b,this.c,n,i,a,s)}getInterpolation(t,n,i,a,s){return e.getInterpolation(t,this.a,this.b,this.c,n,i,a,s)}containsPoint(t){return e.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return e.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,n){let i=this.a,a=this.b,s=this.c,r,o;Ar.subVectors(a,i),wr.subVectors(s,i),Qd.subVectors(t,i);let l=Ar.dot(Qd),c=wr.dot(Qd);if(l<=0&&c<=0)return n.copy(i);Kd.subVectors(t,a);let h=Ar.dot(Kd),d=wr.dot(Kd);if(h>=0&&d<=h)return n.copy(a);let f=l*d-h*c;if(f<=0&&l>=0&&h<=0)return r=l/(l-h),n.copy(i).addScaledVector(Ar,r);$d.subVectors(t,s);let p=Ar.dot($d),v=wr.dot($d);if(v>=0&&p<=v)return n.copy(s);let y=p*c-l*v;if(y<=0&&c>=0&&v<=0)return o=c/(c-v),n.copy(i).addScaledVector(wr,o);let m=h*v-p*d;if(m<=0&&d-h>=0&&p-v>=0)return jy.subVectors(s,a),o=(d-h)/(d-h+(p-v)),n.copy(a).addScaledVector(jy,o);let u=1/(m+y+f);return r=y*u,o=f*u,n.copy(i).addScaledVector(Ar,r).addScaledVector(wr,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},Px={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Oa={h:0,s:0,l:0},$c={h:0,s:0,l:0};function tp(e,t,n){return n<0&&(n+=1),n>1&&(n-=1),n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*6*(2/3-n):e}var te=class{constructor(t,n,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,n,i)}set(t,n,i){if(n===void 0&&i===void 0){let a=t;a&&a.isColor?this.copy(a):typeof a=="number"?this.setHex(a):typeof a=="string"&&this.setStyle(a)}else this.setRGB(t,n,i);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,n=Qe){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,re.toWorkingColorSpace(this,n),this}setRGB(t,n,i,a=re.workingColorSpace){return this.r=t,this.g=n,this.b=i,re.toWorkingColorSpace(this,a),this}setHSL(t,n,i,a=re.workingColorSpace){if(t=lE(t,1),n=xn(n,0,1),i=xn(i,0,1),n===0)this.r=this.g=this.b=i;else{let s=i<=.5?i*(1+n):i+n-i*n,r=2*i-s;this.r=tp(r,s,t+1/3),this.g=tp(r,s,t),this.b=tp(r,s,t-1/3)}return re.toWorkingColorSpace(this,a),this}setStyle(t,n=Qe){function i(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let a;if(a=/^(\w+)\(([^\)]*)\)/.exec(t)){let s,r=a[1],o=a[2];switch(r){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,n);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,n);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,n);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(a=/^\#([A-Fa-f\d]+)$/.exec(t)){let s=a[1],r=s.length;if(r===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,n);if(r===6)return this.setHex(parseInt(s,16),n);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,n);return this}setColorName(t,n=Qe){let i=Px[t.toLowerCase()];return i!==void 0?this.setHex(i,n):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Fr(t.r),this.g=Fr(t.g),this.b=Fr(t.b),this}copyLinearToSRGB(t){return this.r=Gd(t.r),this.g=Gd(t.g),this.b=Gd(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Qe){return re.fromWorkingColorSpace(nn.copy(this),t),Math.round(xn(nn.r*255,0,255))*65536+Math.round(xn(nn.g*255,0,255))*256+Math.round(xn(nn.b*255,0,255))}getHexString(t=Qe){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,n=re.workingColorSpace){re.fromWorkingColorSpace(nn.copy(this),n);let i=nn.r,a=nn.g,s=nn.b,r=Math.max(i,a,s),o=Math.min(i,a,s),l,c,h=(o+r)/2;if(o===r)l=0,c=0;else{let d=r-o;switch(c=h<=.5?d/(r+o):d/(2-r-o),r){case i:l=(a-s)/d+(a<s?6:0);break;case a:l=(s-i)/d+2;break;case s:l=(i-a)/d+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,n=re.workingColorSpace){return re.fromWorkingColorSpace(nn.copy(this),n),t.r=nn.r,t.g=nn.g,t.b=nn.b,t}getStyle(t=Qe){re.fromWorkingColorSpace(nn.copy(this),t);let n=nn.r,i=nn.g,a=nn.b;return t!==Qe?`color(${t} ${n.toFixed(3)} ${i.toFixed(3)} ${a.toFixed(3)})`:`rgb(${Math.round(n*255)},${Math.round(i*255)},${Math.round(a*255)})`}offsetHSL(t,n,i){return this.getHSL(Oa),this.setHSL(Oa.h+t,Oa.s+n,Oa.l+i)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,n){return this.r=t.r+n.r,this.g=t.g+n.g,this.b=t.b+n.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,n){return this.r+=(t.r-this.r)*n,this.g+=(t.g-this.g)*n,this.b+=(t.b-this.b)*n,this}lerpColors(t,n,i){return this.r=t.r+(n.r-t.r)*i,this.g=t.g+(n.g-t.g)*i,this.b=t.b+(n.b-t.b)*i,this}lerpHSL(t,n){this.getHSL(Oa),t.getHSL($c);let i=Hd(Oa.h,$c.h,n),a=Hd(Oa.s,$c.s,n),s=Hd(Oa.l,$c.l,n);return this.setHSL(i,a,s),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let n=this.r,i=this.g,a=this.b,s=t.elements;return this.r=s[0]*n+s[3]*i+s[6]*a,this.g=s[1]*n+s[4]*i+s[7]*a,this.b=s[2]*n+s[5]*i+s[8]*a,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,n=0){return this.r=t[n],this.g=t[n+1],this.b=t[n+2],this}toArray(t=[],n=0){return t[n]=this.r,t[n+1]=this.g,t[n+2]=this.b,t}fromBufferAttribute(t,n){return this.r=t.getX(n),this.g=t.getY(n),this.b=t.getZ(n),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},nn=new te;te.NAMES=Px;var SE=0,Xr=class extends Va{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:SE++}),this.uuid=hl(),this.name="",this.type="Material",this.blending=Br,this.side=Ha,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=cp,this.blendDst=up,this.blendEquation=ms,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new te(0,0,0),this.blendAlpha=0,this.depthFunc=du,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Py,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=yr,this.stencilZFail=yr,this.stencilZPass=yr,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBuild(){}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(let n in t){let i=t[n];if(i===void 0){console.warn(`THREE.Material: parameter '${n}' has value of undefined.`);continue}let a=this[n];if(a===void 0){console.warn(`THREE.Material: '${n}' is not a property of THREE.${this.type}.`);continue}a&&a.isColor?a.set(i):a&&a.isVector3&&i&&i.isVector3?a.copy(i):this[n]=i}}toJSON(t){let n=t===void 0||typeof t=="string";n&&(t={textures:{},images:{}});let i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(t).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(t).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(t).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(t).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(t).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Br&&(i.blending=this.blending),this.side!==Ha&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==cp&&(i.blendSrc=this.blendSrc),this.blendDst!==up&&(i.blendDst=this.blendDst),this.blendEquation!==ms&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==du&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Py&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==yr&&(i.stencilFail=this.stencilFail),this.stencilZFail!==yr&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==yr&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function a(s){let r=[];for(let o in s){let l=s[o];delete l.metadata,r.push(l)}return r}if(n){let s=a(t.textures),r=a(t.images);s.length>0&&(i.textures=s),r.length>0&&(i.images=r)}return i}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;let n=t.clippingPlanes,i=null;if(n!==null){let a=n.length;i=new Array(a);for(let s=0;s!==a;++s)i[s]=n[s].clone()}return this.clippingPlanes=i,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}},Tu=class extends Xr{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new te(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=Mx,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}};var Oe=new I,tu=new oe,Kn=class{constructor(t,n,i=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=t,this.itemSize=n,this.count=t!==void 0?t.length/n:0,this.normalized=i,this.usage=zy,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.gpuType=za,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}get updateRange(){return console.warn('THREE.BufferAttribute: "updateRange" is deprecated and removed in r169. Use "addUpdateRange()" instead.'),this._updateRange}setUsage(t){return this.usage=t,this}addUpdateRange(t,n){this.updateRanges.push({start:t,count:n})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,n,i){t*=this.itemSize,i*=n.itemSize;for(let a=0,s=this.itemSize;a<s;a++)this.array[t+a]=n.array[i+a];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let n=0,i=this.count;n<i;n++)tu.fromBufferAttribute(this,n),tu.applyMatrix3(t),this.setXY(n,tu.x,tu.y);else if(this.itemSize===3)for(let n=0,i=this.count;n<i;n++)Oe.fromBufferAttribute(this,n),Oe.applyMatrix3(t),this.setXYZ(n,Oe.x,Oe.y,Oe.z);return this}applyMatrix4(t){for(let n=0,i=this.count;n<i;n++)Oe.fromBufferAttribute(this,n),Oe.applyMatrix4(t),this.setXYZ(n,Oe.x,Oe.y,Oe.z);return this}applyNormalMatrix(t){for(let n=0,i=this.count;n<i;n++)Oe.fromBufferAttribute(this,n),Oe.applyNormalMatrix(t),this.setXYZ(n,Oe.x,Oe.y,Oe.z);return this}transformDirection(t){for(let n=0,i=this.count;n<i;n++)Oe.fromBufferAttribute(this,n),Oe.transformDirection(t),this.setXYZ(n,Oe.x,Oe.y,Oe.z);return this}set(t,n=0){return this.array.set(t,n),this}getComponent(t,n){let i=this.array[t*this.itemSize+n];return this.normalized&&(i=Ko(i,this.array)),i}setComponent(t,n,i){return this.normalized&&(i=yn(i,this.array)),this.array[t*this.itemSize+n]=i,this}getX(t){let n=this.array[t*this.itemSize];return this.normalized&&(n=Ko(n,this.array)),n}setX(t,n){return this.normalized&&(n=yn(n,this.array)),this.array[t*this.itemSize]=n,this}getY(t){let n=this.array[t*this.itemSize+1];return this.normalized&&(n=Ko(n,this.array)),n}setY(t,n){return this.normalized&&(n=yn(n,this.array)),this.array[t*this.itemSize+1]=n,this}getZ(t){let n=this.array[t*this.itemSize+2];return this.normalized&&(n=Ko(n,this.array)),n}setZ(t,n){return this.normalized&&(n=yn(n,this.array)),this.array[t*this.itemSize+2]=n,this}getW(t){let n=this.array[t*this.itemSize+3];return this.normalized&&(n=Ko(n,this.array)),n}setW(t,n){return this.normalized&&(n=yn(n,this.array)),this.array[t*this.itemSize+3]=n,this}setXY(t,n,i){return t*=this.itemSize,this.normalized&&(n=yn(n,this.array),i=yn(i,this.array)),this.array[t+0]=n,this.array[t+1]=i,this}setXYZ(t,n,i,a){return t*=this.itemSize,this.normalized&&(n=yn(n,this.array),i=yn(i,this.array),a=yn(a,this.array)),this.array[t+0]=n,this.array[t+1]=i,this.array[t+2]=a,this}setXYZW(t,n,i,a,s){return t*=this.itemSize,this.normalized&&(n=yn(n,this.array),i=yn(i,this.array),a=yn(a,this.array),s=yn(s,this.array)),this.array[t+0]=n,this.array[t+1]=i,this.array[t+2]=a,this.array[t+3]=s,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==zy&&(t.usage=this.usage),t}};var Au=class extends Kn{constructor(t,n,i){super(new Uint16Array(t),n,i)}};var wu=class extends Kn{constructor(t,n,i){super(new Uint32Array(t),n,i)}};var Ki=class extends Kn{constructor(t,n,i){super(new Float32Array(t),n,i)}};var bE=0,jn=new an,ep=new Si,Rr=new I,On=new xs,nl=new xs,Xe=new I,Ss=class e extends Va{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:bE++}),this.uuid=hl(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Ox(t)?wu:Au)(t,1):this.index=t,this}getAttribute(t){return this.attributes[t]}setAttribute(t,n){return this.attributes[t]=n,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,n,i=0){this.groups.push({start:t,count:n,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(t,n){this.drawRange.start=t,this.drawRange.count=n}applyMatrix4(t){let n=this.attributes.position;n!==void 0&&(n.applyMatrix4(t),n.needsUpdate=!0);let i=this.attributes.normal;if(i!==void 0){let s=new kt().getNormalMatrix(t);i.applyNormalMatrix(s),i.needsUpdate=!0}let a=this.attributes.tangent;return a!==void 0&&(a.transformDirection(t),a.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return jn.makeRotationFromQuaternion(t),this.applyMatrix4(jn),this}rotateX(t){return jn.makeRotationX(t),this.applyMatrix4(jn),this}rotateY(t){return jn.makeRotationY(t),this.applyMatrix4(jn),this}rotateZ(t){return jn.makeRotationZ(t),this.applyMatrix4(jn),this}translate(t,n,i){return jn.makeTranslation(t,n,i),this.applyMatrix4(jn),this}scale(t,n,i){return jn.makeScale(t,n,i),this.applyMatrix4(jn),this}lookAt(t){return ep.lookAt(t),ep.updateMatrix(),this.applyMatrix4(ep.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Rr).negate(),this.translate(Rr.x,Rr.y,Rr.z),this}setFromPoints(t){let n=[];for(let i=0,a=t.length;i<a;i++){let s=t[i];n.push(s.x,s.y,s.z||0)}return this.setAttribute("position",new Ki(n,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new xs);let t=this.attributes.position,n=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingBox.set(new I(-1/0,-1/0,-1/0),new I(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),n)for(let i=0,a=n.length;i<a;i++){let s=n[i];On.setFromBufferAttribute(s),this.morphTargetsRelative?(Xe.addVectors(this.boundingBox.min,On.min),this.boundingBox.expandByPoint(Xe),Xe.addVectors(this.boundingBox.max,On.max),this.boundingBox.expandByPoint(Xe)):(this.boundingBox.expandByPoint(On.min),this.boundingBox.expandByPoint(On.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new ll);let t=this.attributes.position,n=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingSphere.set(new I,1/0);return}if(t){let i=this.boundingSphere.center;if(On.setFromBufferAttribute(t),n)for(let s=0,r=n.length;s<r;s++){let o=n[s];nl.setFromBufferAttribute(o),this.morphTargetsRelative?(Xe.addVectors(On.min,nl.min),On.expandByPoint(Xe),Xe.addVectors(On.max,nl.max),On.expandByPoint(Xe)):(On.expandByPoint(nl.min),On.expandByPoint(nl.max))}On.getCenter(i);let a=0;for(let s=0,r=t.count;s<r;s++)Xe.fromBufferAttribute(t,s),a=Math.max(a,i.distanceToSquared(Xe));if(n)for(let s=0,r=n.length;s<r;s++){let o=n[s],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)Xe.fromBufferAttribute(o,c),l&&(Rr.fromBufferAttribute(t,c),Xe.add(Rr)),a=Math.max(a,i.distanceToSquared(Xe))}this.boundingSphere.radius=Math.sqrt(a),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,n=this.attributes;if(t===null||n.position===void 0||n.normal===void 0||n.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let i=t.array,a=n.position.array,s=n.normal.array,r=n.uv.array,o=a.length/3;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Kn(new Float32Array(4*o),4));let l=this.getAttribute("tangent").array,c=[],h=[];for(let A=0;A<o;A++)c[A]=new I,h[A]=new I;let d=new I,f=new I,p=new I,v=new oe,y=new oe,m=new oe,u=new I,_=new I;function g(A,F,Y){d.fromArray(a,A*3),f.fromArray(a,F*3),p.fromArray(a,Y*3),v.fromArray(r,A*2),y.fromArray(r,F*2),m.fromArray(r,Y*2),f.sub(d),p.sub(d),y.sub(v),m.sub(v);let $=1/(y.x*m.y-m.x*y.y);isFinite($)&&(u.copy(f).multiplyScalar(m.y).addScaledVector(p,-y.y).multiplyScalar($),_.copy(p).multiplyScalar(y.x).addScaledVector(f,-m.x).multiplyScalar($),c[A].add(u),c[F].add(u),c[Y].add(u),h[A].add(_),h[F].add(_),h[Y].add(_))}let b=this.groups;b.length===0&&(b=[{start:0,count:i.length}]);for(let A=0,F=b.length;A<F;++A){let Y=b[A],$=Y.start,L=Y.count;for(let H=$,q=$+L;H<q;H+=3)g(i[H+0],i[H+1],i[H+2])}let T=new I,R=new I,w=new I,U=new I;function x(A){w.fromArray(s,A*3),U.copy(w);let F=c[A];T.copy(F),T.sub(w.multiplyScalar(w.dot(F))).normalize(),R.crossVectors(U,F);let $=R.dot(h[A])<0?-1:1;l[A*4]=T.x,l[A*4+1]=T.y,l[A*4+2]=T.z,l[A*4+3]=$}for(let A=0,F=b.length;A<F;++A){let Y=b[A],$=Y.start,L=Y.count;for(let H=$,q=$+L;H<q;H+=3)x(i[H+0]),x(i[H+1]),x(i[H+2])}}computeVertexNormals(){let t=this.index,n=this.getAttribute("position");if(n!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new Kn(new Float32Array(n.count*3),3),this.setAttribute("normal",i);else for(let f=0,p=i.count;f<p;f++)i.setXYZ(f,0,0,0);let a=new I,s=new I,r=new I,o=new I,l=new I,c=new I,h=new I,d=new I;if(t)for(let f=0,p=t.count;f<p;f+=3){let v=t.getX(f+0),y=t.getX(f+1),m=t.getX(f+2);a.fromBufferAttribute(n,v),s.fromBufferAttribute(n,y),r.fromBufferAttribute(n,m),h.subVectors(r,s),d.subVectors(a,s),h.cross(d),o.fromBufferAttribute(i,v),l.fromBufferAttribute(i,y),c.fromBufferAttribute(i,m),o.add(h),l.add(h),c.add(h),i.setXYZ(v,o.x,o.y,o.z),i.setXYZ(y,l.x,l.y,l.z),i.setXYZ(m,c.x,c.y,c.z)}else for(let f=0,p=n.count;f<p;f+=3)a.fromBufferAttribute(n,f+0),s.fromBufferAttribute(n,f+1),r.fromBufferAttribute(n,f+2),h.subVectors(r,s),d.subVectors(a,s),h.cross(d),i.setXYZ(f+0,h.x,h.y,h.z),i.setXYZ(f+1,h.x,h.y,h.z),i.setXYZ(f+2,h.x,h.y,h.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let n=0,i=t.count;n<i;n++)Xe.fromBufferAttribute(t,n),Xe.normalize(),t.setXYZ(n,Xe.x,Xe.y,Xe.z)}toNonIndexed(){function t(o,l){let c=o.array,h=o.itemSize,d=o.normalized,f=new c.constructor(l.length*h),p=0,v=0;for(let y=0,m=l.length;y<m;y++){o.isInterleavedBufferAttribute?p=l[y]*o.data.stride+o.offset:p=l[y]*h;for(let u=0;u<h;u++)f[v++]=c[p++]}return new Kn(f,h,d)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let n=new e,i=this.index.array,a=this.attributes;for(let o in a){let l=a[o],c=t(l,i);n.setAttribute(o,c)}let s=this.morphAttributes;for(let o in s){let l=[],c=s[o];for(let h=0,d=c.length;h<d;h++){let f=c[h],p=t(f,i);l.push(p)}n.morphAttributes[o]=l}n.morphTargetsRelative=this.morphTargetsRelative;let r=this.groups;for(let o=0,l=r.length;o<l;o++){let c=r[o];n.addGroup(c.start,c.count,c.materialIndex)}return n}toJSON(){let t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};let n=this.index;n!==null&&(t.data.index={type:n.array.constructor.name,array:Array.prototype.slice.call(n.array)});let i=this.attributes;for(let l in i){let c=i[l];t.data.attributes[l]=c.toJSON(t.data)}let a={},s=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let d=0,f=c.length;d<f;d++){let p=c[d];h.push(p.toJSON(t.data))}h.length>0&&(a[l]=h,s=!0)}s&&(t.data.morphAttributes=a,t.data.morphTargetsRelative=this.morphTargetsRelative);let r=this.groups;r.length>0&&(t.data.groups=JSON.parse(JSON.stringify(r)));let o=this.boundingSphere;return o!==null&&(t.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let n={};this.name=t.name;let i=t.index;i!==null&&this.setIndex(i.clone(n));let a=t.attributes;for(let c in a){let h=a[c];this.setAttribute(c,h.clone(n))}let s=t.morphAttributes;for(let c in s){let h=[],d=s[c];for(let f=0,p=d.length;f<p;f++)h.push(d[f].clone(n));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;let r=t.groups;for(let c=0,h=r.length;c<h;c++){let d=r[c];this.addGroup(d.start,d.count,d.materialIndex)}let o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());let l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},Jy=new an,fs=new xp,eu=new ll,Qy=new I,Cr=new I,Lr=new I,Dr=new I,np=new I,nu=new I,iu=new oe,au=new oe,su=new oe,Ky=new I,$y=new I,tx=new I,ru=new I,ou=new I,xi=class extends Si{constructor(t=new Ss,n=new Tu){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=n,this.updateMorphTargets()}copy(t,n){return super.copy(t,n),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){let n=this.geometry.morphAttributes,i=Object.keys(n);if(i.length>0){let a=n[i[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,r=a.length;s<r;s++){let o=a[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(t,n){let i=this.geometry,a=i.attributes.position,s=i.morphAttributes.position,r=i.morphTargetsRelative;n.fromBufferAttribute(a,t);let o=this.morphTargetInfluences;if(s&&o){nu.set(0,0,0);for(let l=0,c=s.length;l<c;l++){let h=o[l],d=s[l];h!==0&&(np.fromBufferAttribute(d,t),r?nu.addScaledVector(np,h):nu.addScaledVector(np.sub(n),h))}n.add(nu)}return n}raycast(t,n){let i=this.geometry,a=this.material,s=this.matrixWorld;a!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),eu.copy(i.boundingSphere),eu.applyMatrix4(s),fs.copy(t.ray).recast(t.near),!(eu.containsPoint(fs.origin)===!1&&(fs.intersectSphere(eu,Qy)===null||fs.origin.distanceToSquared(Qy)>(t.far-t.near)**2))&&(Jy.copy(s).invert(),fs.copy(t.ray).applyMatrix4(Jy),!(i.boundingBox!==null&&fs.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(t,n,fs)))}_computeIntersections(t,n,i){let a,s=this.geometry,r=this.material,o=s.index,l=s.attributes.position,c=s.attributes.uv,h=s.attributes.uv1,d=s.attributes.normal,f=s.groups,p=s.drawRange;if(o!==null)if(Array.isArray(r))for(let v=0,y=f.length;v<y;v++){let m=f[v],u=r[m.materialIndex],_=Math.max(m.start,p.start),g=Math.min(o.count,Math.min(m.start+m.count,p.start+p.count));for(let b=_,T=g;b<T;b+=3){let R=o.getX(b),w=o.getX(b+1),U=o.getX(b+2);a=lu(this,u,t,i,c,h,d,R,w,U),a&&(a.faceIndex=Math.floor(b/3),a.face.materialIndex=m.materialIndex,n.push(a))}}else{let v=Math.max(0,p.start),y=Math.min(o.count,p.start+p.count);for(let m=v,u=y;m<u;m+=3){let _=o.getX(m),g=o.getX(m+1),b=o.getX(m+2);a=lu(this,r,t,i,c,h,d,_,g,b),a&&(a.faceIndex=Math.floor(m/3),n.push(a))}}else if(l!==void 0)if(Array.isArray(r))for(let v=0,y=f.length;v<y;v++){let m=f[v],u=r[m.materialIndex],_=Math.max(m.start,p.start),g=Math.min(l.count,Math.min(m.start+m.count,p.start+p.count));for(let b=_,T=g;b<T;b+=3){let R=b,w=b+1,U=b+2;a=lu(this,u,t,i,c,h,d,R,w,U),a&&(a.faceIndex=Math.floor(b/3),a.face.materialIndex=m.materialIndex,n.push(a))}}else{let v=Math.max(0,p.start),y=Math.min(l.count,p.start+p.count);for(let m=v,u=y;m<u;m+=3){let _=m,g=m+1,b=m+2;a=lu(this,r,t,i,c,h,d,_,g,b),a&&(a.faceIndex=Math.floor(m/3),n.push(a))}}}};function ME(e,t,n,i,a,s,r,o){let l;if(t.side===Sn?l=i.intersectTriangle(r,s,a,!0,o):l=i.intersectTriangle(a,s,r,t.side===Ha,o),l===null)return null;ou.copy(o),ou.applyMatrix4(e.matrixWorld);let c=n.ray.origin.distanceTo(ou);return c<n.near||c>n.far?null:{distance:c,point:ou.clone(),object:e}}function lu(e,t,n,i,a,s,r,o,l,c){e.getVertexPosition(o,Cr),e.getVertexPosition(l,Lr),e.getVertexPosition(c,Dr);let h=ME(e,t,n,i,Cr,Lr,Dr,ru);if(h){a&&(iu.fromBufferAttribute(a,o),au.fromBufferAttribute(a,l),su.fromBufferAttribute(a,c),h.uv=Pr.getInterpolation(ru,Cr,Lr,Dr,iu,au,su,new oe)),s&&(iu.fromBufferAttribute(s,o),au.fromBufferAttribute(s,l),su.fromBufferAttribute(s,c),h.uv1=Pr.getInterpolation(ru,Cr,Lr,Dr,iu,au,su,new oe),h.uv2=h.uv1),r&&(Ky.fromBufferAttribute(r,o),$y.fromBufferAttribute(r,l),tx.fromBufferAttribute(r,c),h.normal=Pr.getInterpolation(ru,Cr,Lr,Dr,Ky,$y,tx,new I),h.normal.dot(i.direction)>0&&h.normal.multiplyScalar(-1));let d={a:o,b:l,c,normal:new I,materialIndex:0};Pr.getNormal(Cr,Lr,Dr,d.normal),h.face=d}return h}var cl=class e extends Ss{constructor(t=1,n=1,i=1,a=1,s=1,r=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:n,depth:i,widthSegments:a,heightSegments:s,depthSegments:r};let o=this;a=Math.floor(a),s=Math.floor(s),r=Math.floor(r);let l=[],c=[],h=[],d=[],f=0,p=0;v("z","y","x",-1,-1,i,n,t,r,s,0),v("z","y","x",1,-1,i,n,-t,r,s,1),v("x","z","y",1,1,t,i,n,a,r,2),v("x","z","y",1,-1,t,i,-n,a,r,3),v("x","y","z",1,-1,t,n,i,a,s,4),v("x","y","z",-1,-1,t,n,-i,a,s,5),this.setIndex(l),this.setAttribute("position",new Ki(c,3)),this.setAttribute("normal",new Ki(h,3)),this.setAttribute("uv",new Ki(d,2));function v(y,m,u,_,g,b,T,R,w,U,x){let A=b/w,F=T/U,Y=b/2,$=T/2,L=R/2,H=w+1,q=U+1,k=0,Q=0,X=new I;for(let j=0;j<q;j++){let tt=j*F-$;for(let dt=0;dt<H;dt++){let V=dt*A-Y;X[y]=V*_,X[m]=tt*g,X[u]=L,c.push(X.x,X.y,X.z),X[y]=0,X[m]=0,X[u]=R>0?1:-1,h.push(X.x,X.y,X.z),d.push(dt/w),d.push(1-j/U),k+=1}}for(let j=0;j<U;j++)for(let tt=0;tt<w;tt++){let dt=f+tt+H*j,V=f+tt+H*(j+1),Z=f+(tt+1)+H*(j+1),ct=f+(tt+1)+H*j;l.push(dt,V,ct),l.push(V,Z,ct),Q+=6}o.addGroup(p,Q,x),p+=Q,f+=k}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};function qr(e){let t={};for(let n in e){t[n]={};for(let i in e[n]){let a=e[n][i];a&&(a.isColor||a.isMatrix3||a.isMatrix4||a.isVector2||a.isVector3||a.isVector4||a.isTexture||a.isQuaternion)?a.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[n][i]=null):t[n][i]=a.clone():Array.isArray(a)?t[n][i]=a.slice():t[n][i]=a}}return t}function un(e){let t={};for(let n=0;n<e.length;n++){let i=qr(e[n]);for(let a in i)t[a]=i[a]}return t}function EE(e){let t=[];for(let n=0;n<e.length;n++)t.push(e[n].clone());return t}function zx(e){return e.getRenderTarget()===null?e.outputColorSpace:re.workingColorSpace}var TE={clone:qr,merge:un},AE=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,wE=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,ea=class extends Xr{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=AE,this.fragmentShader=wE,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={derivatives:!1,fragDepth:!1,drawBuffers:!1,shaderTextureLOD:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=qr(t.uniforms),this.uniformsGroups=EE(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){let n=super.toJSON(t);n.glslVersion=this.glslVersion,n.uniforms={};for(let a in this.uniforms){let r=this.uniforms[a].value;r&&r.isTexture?n.uniforms[a]={type:"t",value:r.toJSON(t).uuid}:r&&r.isColor?n.uniforms[a]={type:"c",value:r.getHex()}:r&&r.isVector2?n.uniforms[a]={type:"v2",value:r.toArray()}:r&&r.isVector3?n.uniforms[a]={type:"v3",value:r.toArray()}:r&&r.isVector4?n.uniforms[a]={type:"v4",value:r.toArray()}:r&&r.isMatrix3?n.uniforms[a]={type:"m3",value:r.toArray()}:r&&r.isMatrix4?n.uniforms[a]={type:"m4",value:r.toArray()}:n.uniforms[a]={value:r}}Object.keys(this.defines).length>0&&(n.defines=this.defines),n.vertexShader=this.vertexShader,n.fragmentShader=this.fragmentShader,n.lights=this.lights,n.clipping=this.clipping;let i={};for(let a in this.extensions)this.extensions[a]===!0&&(i[a]=!0);return Object.keys(i).length>0&&(n.extensions=i),n}},Ru=class extends Si{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new an,this.projectionMatrix=new an,this.projectionMatrixInverse=new an,this.coordinateSystem=Qi}copy(t,n){return super.copy(t,n),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,n){super.updateWorldMatrix(t,n),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},Pn=class extends Ru{constructor(t=50,n=1,i=.1,a=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=i,this.far=a,this.focus=10,this.aspect=n,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,n){return super.copy(t,n),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let n=.5*this.getFilmHeight()/t;this.fov=gp*2*Math.atan(n),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(Fd*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return gp*2*Math.atan(Math.tan(Fd*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}setViewOffset(t,n,i,a,s,r){this.aspect=t/n,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=n,this.view.offsetX=i,this.view.offsetY=a,this.view.width=s,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,n=t*Math.tan(Fd*.5*this.fov)/this.zoom,i=2*n,a=this.aspect*i,s=-.5*a,r=this.view;if(this.view!==null&&this.view.enabled){let l=r.fullWidth,c=r.fullHeight;s+=r.offsetX*a/l,n-=r.offsetY*i/c,a*=r.width/l,i*=r.height/c}let o=this.filmOffset;o!==0&&(s+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+a,n,n-i,t,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let n=super.toJSON(t);return n.object.fov=this.fov,n.object.zoom=this.zoom,n.object.near=this.near,n.object.far=this.far,n.object.focus=this.focus,n.object.aspect=this.aspect,this.view!==null&&(n.object.view=Object.assign({},this.view)),n.object.filmGauge=this.filmGauge,n.object.filmOffset=this.filmOffset,n}},Ur=-90,Nr=1,Sp=class extends Si{constructor(t,n,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;let a=new Pn(Ur,Nr,t,n);a.layers=this.layers,this.add(a);let s=new Pn(Ur,Nr,t,n);s.layers=this.layers,this.add(s);let r=new Pn(Ur,Nr,t,n);r.layers=this.layers,this.add(r);let o=new Pn(Ur,Nr,t,n);o.layers=this.layers,this.add(o);let l=new Pn(Ur,Nr,t,n);l.layers=this.layers,this.add(l);let c=new Pn(Ur,Nr,t,n);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let t=this.coordinateSystem,n=this.children.concat(),[i,a,s,r,o,l]=n;for(let c of n)this.remove(c);if(t===Qi)i.up.set(0,1,0),i.lookAt(1,0,0),a.up.set(0,1,0),a.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),r.up.set(0,0,1),r.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===yu)i.up.set(0,-1,0),i.lookAt(-1,0,0),a.up.set(0,-1,0),a.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),r.up.set(0,0,-1),r.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(let c of n)this.add(c),c.updateMatrixWorld()}update(t,n){this.parent===null&&this.updateMatrixWorld();let{renderTarget:i,activeMipmapLevel:a}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());let[s,r,o,l,c,h]=this.children,d=t.getRenderTarget(),f=t.getActiveCubeFace(),p=t.getActiveMipmapLevel(),v=t.xr.enabled;t.xr.enabled=!1;let y=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,t.setRenderTarget(i,0,a),t.render(n,s),t.setRenderTarget(i,1,a),t.render(n,r),t.setRenderTarget(i,2,a),t.render(n,o),t.setRenderTarget(i,3,a),t.render(n,l),t.setRenderTarget(i,4,a),t.render(n,c),i.texture.generateMipmaps=y,t.setRenderTarget(i,5,a),t.render(n,h),t.setRenderTarget(d,f,p),t.xr.enabled=v,i.texture.needsPMREMUpdate=!0}},Cu=class extends oi{constructor(t,n,i,a,s,r,o,l,c,h){t=t!==void 0?t:[],n=n!==void 0?n:Vr,super(t,n,i,a,s,r,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}},bp=class extends ta{constructor(t=1,n={}){super(t,t,n),this.isWebGLCubeRenderTarget=!0;let i={width:t,height:t,depth:1},a=[i,i,i,i,i,i];n.encoding!==void 0&&(al("THREE.WebGLCubeRenderTarget: option.encoding has been replaced by option.colorSpace."),n.colorSpace=n.encoding===ys?Qe:Qn),this.texture=new Cu(a,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=n.generateMipmaps!==void 0?n.generateMipmaps:!1,this.texture.minFilter=n.minFilter!==void 0?n.minFilter:Jn}fromEquirectangularTexture(t,n){this.texture.type=n.type,this.texture.colorSpace=n.colorSpace,this.texture.generateMipmaps=n.generateMipmaps,this.texture.minFilter=n.minFilter,this.texture.magFilter=n.magFilter;let i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},a=new cl(5,5,5),s=new ea({name:"CubemapFromEquirect",uniforms:qr(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Sn,blending:Ia});s.uniforms.tEquirect.value=n;let r=new xi(a,s),o=n.minFilter;return n.minFilter===rl&&(n.minFilter=Jn),new Sp(1,10,this).update(t,r),n.minFilter=o,r.geometry.dispose(),r.material.dispose(),this}clear(t,n,i,a){let s=t.getRenderTarget();for(let r=0;r<6;r++)t.setRenderTarget(this,r),t.clear(n,i,a);t.setRenderTarget(s)}},ip=new I,RE=new I,CE=new kt,ji=class{constructor(t=new I(1,0,0),n=0){this.isPlane=!0,this.normal=t,this.constant=n}set(t,n){return this.normal.copy(t),this.constant=n,this}setComponents(t,n,i,a){return this.normal.set(t,n,i),this.constant=a,this}setFromNormalAndCoplanarPoint(t,n){return this.normal.copy(t),this.constant=-n.dot(this.normal),this}setFromCoplanarPoints(t,n,i){let a=ip.subVectors(i,n).cross(RE.subVectors(t,n)).normalize();return this.setFromNormalAndCoplanarPoint(a,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,n){return n.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,n){let i=t.delta(ip),a=this.normal.dot(i);if(a===0)return this.distanceToPoint(t.start)===0?n.copy(t.start):null;let s=-(t.start.dot(this.normal)+this.constant)/a;return s<0||s>1?null:n.copy(t.start).addScaledVector(i,s)}intersectsLine(t){let n=this.distanceToPoint(t.start),i=this.distanceToPoint(t.end);return n<0&&i>0||i<0&&n>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,n){let i=n||CE.getNormalMatrix(t),a=this.coplanarPoint(ip).applyMatrix4(t),s=this.normal.applyMatrix3(i).normalize();return this.constant=-a.dot(s),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}},ds=new ll,cu=new I,Lu=class{constructor(t=new ji,n=new ji,i=new ji,a=new ji,s=new ji,r=new ji){this.planes=[t,n,i,a,s,r]}set(t,n,i,a,s,r){let o=this.planes;return o[0].copy(t),o[1].copy(n),o[2].copy(i),o[3].copy(a),o[4].copy(s),o[5].copy(r),this}copy(t){let n=this.planes;for(let i=0;i<6;i++)n[i].copy(t.planes[i]);return this}setFromProjectionMatrix(t,n=Qi){let i=this.planes,a=t.elements,s=a[0],r=a[1],o=a[2],l=a[3],c=a[4],h=a[5],d=a[6],f=a[7],p=a[8],v=a[9],y=a[10],m=a[11],u=a[12],_=a[13],g=a[14],b=a[15];if(i[0].setComponents(l-s,f-c,m-p,b-u).normalize(),i[1].setComponents(l+s,f+c,m+p,b+u).normalize(),i[2].setComponents(l+r,f+h,m+v,b+_).normalize(),i[3].setComponents(l-r,f-h,m-v,b-_).normalize(),i[4].setComponents(l-o,f-d,m-y,b-g).normalize(),n===Qi)i[5].setComponents(l+o,f+d,m+y,b+g).normalize();else if(n===yu)i[5].setComponents(o,d,y,g).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+n);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),ds.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{let n=t.geometry;n.boundingSphere===null&&n.computeBoundingSphere(),ds.copy(n.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(ds)}intersectsSprite(t){return ds.center.set(0,0,0),ds.radius=.7071067811865476,ds.applyMatrix4(t.matrixWorld),this.intersectsSphere(ds)}intersectsSphere(t){let n=this.planes,i=t.center,a=-t.radius;for(let s=0;s<6;s++)if(n[s].distanceToPoint(i)<a)return!1;return!0}intersectsBox(t){let n=this.planes;for(let i=0;i<6;i++){let a=n[i];if(cu.x=a.normal.x>0?t.max.x:t.min.x,cu.y=a.normal.y>0?t.max.y:t.min.y,cu.z=a.normal.z>0?t.max.z:t.min.z,a.distanceToPoint(cu)<0)return!1}return!0}containsPoint(t){let n=this.planes;for(let i=0;i<6;i++)if(n[i].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};function Ix(){let e=null,t=!1,n=null,i=null;function a(s,r){n(s,r),i=e.requestAnimationFrame(a)}return{start:function(){t!==!0&&n!==null&&(i=e.requestAnimationFrame(a),t=!0)},stop:function(){e.cancelAnimationFrame(i),t=!1},setAnimationLoop:function(s){n=s},setContext:function(s){e=s}}}function LE(e,t){let n=t.isWebGL2,i=new WeakMap;function a(c,h){let d=c.array,f=c.usage,p=d.byteLength,v=e.createBuffer();e.bindBuffer(h,v),e.bufferData(h,d,f),c.onUploadCallback();let y;if(d instanceof Float32Array)y=e.FLOAT;else if(d instanceof Uint16Array)if(c.isFloat16BufferAttribute)if(n)y=e.HALF_FLOAT;else throw new Error("THREE.WebGLAttributes: Usage of Float16BufferAttribute requires WebGL2.");else y=e.UNSIGNED_SHORT;else if(d instanceof Int16Array)y=e.SHORT;else if(d instanceof Uint32Array)y=e.UNSIGNED_INT;else if(d instanceof Int32Array)y=e.INT;else if(d instanceof Int8Array)y=e.BYTE;else if(d instanceof Uint8Array)y=e.UNSIGNED_BYTE;else if(d instanceof Uint8ClampedArray)y=e.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+d);return{buffer:v,type:y,bytesPerElement:d.BYTES_PER_ELEMENT,version:c.version,size:p}}function s(c,h,d){let f=h.array,p=h._updateRange,v=h.updateRanges;if(e.bindBuffer(d,c),p.count===-1&&v.length===0&&e.bufferSubData(d,0,f),v.length!==0){for(let y=0,m=v.length;y<m;y++){let u=v[y];n?e.bufferSubData(d,u.start*f.BYTES_PER_ELEMENT,f,u.start,u.count):e.bufferSubData(d,u.start*f.BYTES_PER_ELEMENT,f.subarray(u.start,u.start+u.count))}h.clearUpdateRanges()}p.count!==-1&&(n?e.bufferSubData(d,p.offset*f.BYTES_PER_ELEMENT,f,p.offset,p.count):e.bufferSubData(d,p.offset*f.BYTES_PER_ELEMENT,f.subarray(p.offset,p.offset+p.count)),p.count=-1),h.onUploadCallback()}function r(c){return c.isInterleavedBufferAttribute&&(c=c.data),i.get(c)}function o(c){c.isInterleavedBufferAttribute&&(c=c.data);let h=i.get(c);h&&(e.deleteBuffer(h.buffer),i.delete(c))}function l(c,h){if(c.isGLBufferAttribute){let f=i.get(c);(!f||f.version<c.version)&&i.set(c,{buffer:c.buffer,type:c.type,bytesPerElement:c.elementSize,version:c.version});return}c.isInterleavedBufferAttribute&&(c=c.data);let d=i.get(c);if(d===void 0)i.set(c,a(c,h));else if(d.version<c.version){if(d.size!==c.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");s(d.buffer,c,h),d.version=c.version}}return{get:r,remove:o,update:l}}var Mp=class e extends Ss{constructor(t=1,n=1,i=1,a=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:n,widthSegments:i,heightSegments:a};let s=t/2,r=n/2,o=Math.floor(i),l=Math.floor(a),c=o+1,h=l+1,d=t/o,f=n/l,p=[],v=[],y=[],m=[];for(let u=0;u<h;u++){let _=u*f-r;for(let g=0;g<c;g++){let b=g*d-s;v.push(b,-_,0),y.push(0,0,1),m.push(g/o),m.push(1-u/l)}}for(let u=0;u<l;u++)for(let _=0;_<o;_++){let g=_+c*u,b=_+c*(u+1),T=_+1+c*(u+1),R=_+1+c*u;p.push(g,b,R),p.push(b,T,R)}this.setIndex(p),this.setAttribute("position",new Ki(v,3)),this.setAttribute("normal",new Ki(y,3)),this.setAttribute("uv",new Ki(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.widthSegments,t.heightSegments)}},DE=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,UE=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,NE=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,OE=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,PE=`#ifdef USE_ALPHATEST
	if ( diffuseColor.a < alphaTest ) discard;
#endif`,zE=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,IE=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,BE=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,FE=`#ifdef USE_BATCHING
	attribute float batchId;
	uniform highp sampler2D batchingTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,HE=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( batchId );
#endif`,VE=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,GE=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,kE=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,WE=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,XE=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,qE=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#pragma unroll_loop_start
	for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
		plane = clippingPlanes[ i ];
		if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
	}
	#pragma unroll_loop_end
	#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
		bool clipped = true;
		#pragma unroll_loop_start
		for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
		}
		#pragma unroll_loop_end
		if ( clipped ) discard;
	#endif
#endif`,YE=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,ZE=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,jE=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,JE=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,QE=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,KE=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	varying vec3 vColor;
#endif`,$E=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif`,tT=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
float luminance( const in vec3 rgb ) {
	const vec3 weights = vec3( 0.2126729, 0.7151522, 0.0721750 );
	return dot( weights, rgb );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,eT=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_v0 0.339
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_v1 0.276
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_v4 0.046
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_v5 0.016
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_v6 0.0038
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,nT=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,iT=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,aT=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,sT=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,rT=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,oT="gl_FragColor = linearToOutputTexel( gl_FragColor );",lT=`
const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 LinearToLinear( in vec4 value ) {
	return value;
}
vec4 LinearTosRGB( in vec4 value ) {
	return sRGBTransferOETF( value );
}`,cT=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,uT=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,hT=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,fT=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,dT=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,pT=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,mT=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,gT=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,_T=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,vT=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,yT=`#ifdef USE_LIGHTMAP
	vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
	vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
	reflectedLight.indirectDiffuse += lightMapIrradiance;
#endif`,xT=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,ST=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,bT=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,MT=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	#if defined ( LEGACY_LIGHTS )
		if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
			return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );
		}
		return 1.0;
	#else
		float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
		if ( cutoffDistance > 0.0 ) {
			distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
		}
		return distanceFalloff;
	#endif
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,ET=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,TT=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,AT=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,wT=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,RT=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,CT=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,LT=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,DT=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,UT=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,NT=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,OT=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	gl_FragDepthEXT = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,PT=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,zT=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		varying float vFragDepth;
		varying float vIsPerspective;
	#else
		uniform float logDepthBufFC;
	#endif
#endif`,IT=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		vFragDepth = 1.0 + gl_Position.w;
		vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
	#else
		if ( isPerspectiveMatrix( projectionMatrix ) ) {
			gl_Position.z = log2( max( EPSILON, gl_Position.w + 1.0 ) ) * logDepthBufFC - 1.0;
			gl_Position.z *= gl_Position.w;
		}
	#endif
#endif`,BT=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,FT=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,HT=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,VT=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,GT=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,kT=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,WT=`#if defined( USE_MORPHCOLORS ) && defined( MORPHTARGETS_TEXTURE )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,XT=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		objectNormal += morphNormal0 * morphTargetInfluences[ 0 ];
		objectNormal += morphNormal1 * morphTargetInfluences[ 1 ];
		objectNormal += morphNormal2 * morphTargetInfluences[ 2 ];
		objectNormal += morphNormal3 * morphTargetInfluences[ 3 ];
	#endif
#endif`,qT=`#ifdef USE_MORPHTARGETS
	uniform float morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
		uniform sampler2DArray morphTargetsTexture;
		uniform ivec2 morphTargetsTextureSize;
		vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
			int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
			int y = texelIndex / morphTargetsTextureSize.x;
			int x = texelIndex - y * morphTargetsTextureSize.x;
			ivec3 morphUV = ivec3( x, y, morphTargetIndex );
			return texelFetch( morphTargetsTexture, morphUV, 0 );
		}
	#else
		#ifndef USE_MORPHNORMALS
			uniform float morphTargetInfluences[ 8 ];
		#else
			uniform float morphTargetInfluences[ 4 ];
		#endif
	#endif
#endif`,YT=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		transformed += morphTarget0 * morphTargetInfluences[ 0 ];
		transformed += morphTarget1 * morphTargetInfluences[ 1 ];
		transformed += morphTarget2 * morphTargetInfluences[ 2 ];
		transformed += morphTarget3 * morphTargetInfluences[ 3 ];
		#ifndef USE_MORPHNORMALS
			transformed += morphTarget4 * morphTargetInfluences[ 4 ];
			transformed += morphTarget5 * morphTargetInfluences[ 5 ];
			transformed += morphTarget6 * morphTargetInfluences[ 6 ];
			transformed += morphTarget7 * morphTargetInfluences[ 7 ];
		#endif
	#endif
#endif`,ZT=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,jT=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,JT=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,QT=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,KT=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,$T=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,tA=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,eA=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,nA=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iA=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,aA=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,sA=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256., 256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );
const float ShiftRight8 = 1. / 256.;
vec4 packDepthToRGBA( const in float v ) {
	vec4 r = vec4( fract( v * PackFactors ), v );
	r.yzw -= r.xyz * ShiftRight8;	return r * PackUpscale;
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors );
}
vec2 packDepthToRG( in highp float v ) {
	return packDepthToRGBA( v ).yx;
}
float unpackRGToDepth( const in highp vec2 v ) {
	return unpackRGBAToDepth( vec4( v.xy, 0.0, 0.0 ) );
}
vec4 pack2HalfToRGBA( vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,rA=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,oA=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,lA=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,cA=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,uA=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,hA=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,fA=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return shadow;
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
		vec3 lightToPosition = shadowCoord.xyz;
		float dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );		dp += shadowBias;
		vec3 bd3D = normalize( lightToPosition );
		#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
			vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
			return (
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
			) * ( 1.0 / 9.0 );
		#else
			return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
		#endif
	}
#endif`,dA=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,pA=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,mA=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,gA=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,_A=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,vA=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,yA=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,xA=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,SA=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,bA=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,MA=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 OptimizedCineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,EA=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,TA=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
		vec3 refractedRayExit = position + transmissionRay;
		vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
		vec2 refractionCoords = ndcPos.xy / ndcPos.w;
		refractionCoords += 1.0;
		refractionCoords /= 2.0;
		vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
		vec3 transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,AA=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,wA=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,RA=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,CA=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,LA=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,DA=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,UA=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,NA=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,OA=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,PA=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,zA=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,IA=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#endif
}`,BA=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,FA=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,HA=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,VA=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,GA=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,kA=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,WA=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,XA=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,qA=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,YA=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ZA=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,jA=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,JA=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,QA=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), opacity );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,KA=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,$A=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,tw=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,ew=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,nw=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,iw=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,aw=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,sw=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,rw=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,ow=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,lw=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,cw=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Ft={alphahash_fragment:DE,alphahash_pars_fragment:UE,alphamap_fragment:NE,alphamap_pars_fragment:OE,alphatest_fragment:PE,alphatest_pars_fragment:zE,aomap_fragment:IE,aomap_pars_fragment:BE,batching_pars_vertex:FE,batching_vertex:HE,begin_vertex:VE,beginnormal_vertex:GE,bsdfs:kE,iridescence_fragment:WE,bumpmap_pars_fragment:XE,clipping_planes_fragment:qE,clipping_planes_pars_fragment:YE,clipping_planes_pars_vertex:ZE,clipping_planes_vertex:jE,color_fragment:JE,color_pars_fragment:QE,color_pars_vertex:KE,color_vertex:$E,common:tT,cube_uv_reflection_fragment:eT,defaultnormal_vertex:nT,displacementmap_pars_vertex:iT,displacementmap_vertex:aT,emissivemap_fragment:sT,emissivemap_pars_fragment:rT,colorspace_fragment:oT,colorspace_pars_fragment:lT,envmap_fragment:cT,envmap_common_pars_fragment:uT,envmap_pars_fragment:hT,envmap_pars_vertex:fT,envmap_physical_pars_fragment:ET,envmap_vertex:dT,fog_vertex:pT,fog_pars_vertex:mT,fog_fragment:gT,fog_pars_fragment:_T,gradientmap_pars_fragment:vT,lightmap_fragment:yT,lightmap_pars_fragment:xT,lights_lambert_fragment:ST,lights_lambert_pars_fragment:bT,lights_pars_begin:MT,lights_toon_fragment:TT,lights_toon_pars_fragment:AT,lights_phong_fragment:wT,lights_phong_pars_fragment:RT,lights_physical_fragment:CT,lights_physical_pars_fragment:LT,lights_fragment_begin:DT,lights_fragment_maps:UT,lights_fragment_end:NT,logdepthbuf_fragment:OT,logdepthbuf_pars_fragment:PT,logdepthbuf_pars_vertex:zT,logdepthbuf_vertex:IT,map_fragment:BT,map_pars_fragment:FT,map_particle_fragment:HT,map_particle_pars_fragment:VT,metalnessmap_fragment:GT,metalnessmap_pars_fragment:kT,morphcolor_vertex:WT,morphnormal_vertex:XT,morphtarget_pars_vertex:qT,morphtarget_vertex:YT,normal_fragment_begin:ZT,normal_fragment_maps:jT,normal_pars_fragment:JT,normal_pars_vertex:QT,normal_vertex:KT,normalmap_pars_fragment:$T,clearcoat_normal_fragment_begin:tA,clearcoat_normal_fragment_maps:eA,clearcoat_pars_fragment:nA,iridescence_pars_fragment:iA,opaque_fragment:aA,packing:sA,premultiplied_alpha_fragment:rA,project_vertex:oA,dithering_fragment:lA,dithering_pars_fragment:cA,roughnessmap_fragment:uA,roughnessmap_pars_fragment:hA,shadowmap_pars_fragment:fA,shadowmap_pars_vertex:dA,shadowmap_vertex:pA,shadowmask_pars_fragment:mA,skinbase_vertex:gA,skinning_pars_vertex:_A,skinning_vertex:vA,skinnormal_vertex:yA,specularmap_fragment:xA,specularmap_pars_fragment:SA,tonemapping_fragment:bA,tonemapping_pars_fragment:MA,transmission_fragment:EA,transmission_pars_fragment:TA,uv_pars_fragment:AA,uv_pars_vertex:wA,uv_vertex:RA,worldpos_vertex:CA,background_vert:LA,background_frag:DA,backgroundCube_vert:UA,backgroundCube_frag:NA,cube_vert:OA,cube_frag:PA,depth_vert:zA,depth_frag:IA,distanceRGBA_vert:BA,distanceRGBA_frag:FA,equirect_vert:HA,equirect_frag:VA,linedashed_vert:GA,linedashed_frag:kA,meshbasic_vert:WA,meshbasic_frag:XA,meshlambert_vert:qA,meshlambert_frag:YA,meshmatcap_vert:ZA,meshmatcap_frag:jA,meshnormal_vert:JA,meshnormal_frag:QA,meshphong_vert:KA,meshphong_frag:$A,meshphysical_vert:tw,meshphysical_frag:ew,meshtoon_vert:nw,meshtoon_frag:iw,points_vert:aw,points_frag:sw,shadow_vert:rw,shadow_frag:ow,sprite_vert:lw,sprite_frag:cw},lt={common:{diffuse:{value:new te(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new kt},alphaMap:{value:null},alphaMapTransform:{value:new kt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new kt}},envmap:{envMap:{value:null},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new kt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new kt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new kt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new kt},normalScale:{value:new oe(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new kt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new kt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new kt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new kt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new te(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new te(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new kt},alphaTest:{value:0},uvTransform:{value:new kt}},sprite:{diffuse:{value:new te(16777215)},opacity:{value:1},center:{value:new oe(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new kt},alphaMap:{value:null},alphaMapTransform:{value:new kt},alphaTest:{value:0}}},yi={basic:{uniforms:un([lt.common,lt.specularmap,lt.envmap,lt.aomap,lt.lightmap,lt.fog]),vertexShader:Ft.meshbasic_vert,fragmentShader:Ft.meshbasic_frag},lambert:{uniforms:un([lt.common,lt.specularmap,lt.envmap,lt.aomap,lt.lightmap,lt.emissivemap,lt.bumpmap,lt.normalmap,lt.displacementmap,lt.fog,lt.lights,{emissive:{value:new te(0)}}]),vertexShader:Ft.meshlambert_vert,fragmentShader:Ft.meshlambert_frag},phong:{uniforms:un([lt.common,lt.specularmap,lt.envmap,lt.aomap,lt.lightmap,lt.emissivemap,lt.bumpmap,lt.normalmap,lt.displacementmap,lt.fog,lt.lights,{emissive:{value:new te(0)},specular:{value:new te(1118481)},shininess:{value:30}}]),vertexShader:Ft.meshphong_vert,fragmentShader:Ft.meshphong_frag},standard:{uniforms:un([lt.common,lt.envmap,lt.aomap,lt.lightmap,lt.emissivemap,lt.bumpmap,lt.normalmap,lt.displacementmap,lt.roughnessmap,lt.metalnessmap,lt.fog,lt.lights,{emissive:{value:new te(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ft.meshphysical_vert,fragmentShader:Ft.meshphysical_frag},toon:{uniforms:un([lt.common,lt.aomap,lt.lightmap,lt.emissivemap,lt.bumpmap,lt.normalmap,lt.displacementmap,lt.gradientmap,lt.fog,lt.lights,{emissive:{value:new te(0)}}]),vertexShader:Ft.meshtoon_vert,fragmentShader:Ft.meshtoon_frag},matcap:{uniforms:un([lt.common,lt.bumpmap,lt.normalmap,lt.displacementmap,lt.fog,{matcap:{value:null}}]),vertexShader:Ft.meshmatcap_vert,fragmentShader:Ft.meshmatcap_frag},points:{uniforms:un([lt.points,lt.fog]),vertexShader:Ft.points_vert,fragmentShader:Ft.points_frag},dashed:{uniforms:un([lt.common,lt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ft.linedashed_vert,fragmentShader:Ft.linedashed_frag},depth:{uniforms:un([lt.common,lt.displacementmap]),vertexShader:Ft.depth_vert,fragmentShader:Ft.depth_frag},normal:{uniforms:un([lt.common,lt.bumpmap,lt.normalmap,lt.displacementmap,{opacity:{value:1}}]),vertexShader:Ft.meshnormal_vert,fragmentShader:Ft.meshnormal_frag},sprite:{uniforms:un([lt.sprite,lt.fog]),vertexShader:Ft.sprite_vert,fragmentShader:Ft.sprite_frag},background:{uniforms:{uvTransform:{value:new kt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ft.background_vert,fragmentShader:Ft.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1}},vertexShader:Ft.backgroundCube_vert,fragmentShader:Ft.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ft.cube_vert,fragmentShader:Ft.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ft.equirect_vert,fragmentShader:Ft.equirect_frag},distanceRGBA:{uniforms:un([lt.common,lt.displacementmap,{referencePosition:{value:new I},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ft.distanceRGBA_vert,fragmentShader:Ft.distanceRGBA_frag},shadow:{uniforms:un([lt.lights,lt.fog,{color:{value:new te(0)},opacity:{value:1}}]),vertexShader:Ft.shadow_vert,fragmentShader:Ft.shadow_frag}};yi.physical={uniforms:un([yi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new kt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new kt},clearcoatNormalScale:{value:new oe(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new kt},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new kt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new kt},sheen:{value:0},sheenColor:{value:new te(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new kt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new kt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new kt},transmissionSamplerSize:{value:new oe},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new kt},attenuationDistance:{value:0},attenuationColor:{value:new te(0)},specularColor:{value:new te(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new kt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new kt},anisotropyVector:{value:new oe},anisotropyMap:{value:null},anisotropyMapTransform:{value:new kt}}]),vertexShader:Ft.meshphysical_vert,fragmentShader:Ft.meshphysical_frag};var uu={r:0,b:0,g:0};function uw(e,t,n,i,a,s,r){let o=new te(0),l=s===!0?0:1,c,h,d=null,f=0,p=null;function v(m,u){let _=!1,g=u.isScene===!0?u.background:null;g&&g.isTexture&&(g=(u.backgroundBlurriness>0?n:t).get(g)),g===null?y(o,l):g&&g.isColor&&(y(g,1),_=!0);let b=e.xr.getEnvironmentBlendMode();b==="additive"?i.buffers.color.setClear(0,0,0,1,r):b==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,r),(e.autoClear||_)&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),g&&(g.isCubeTexture||g.mapping===Nu)?(h===void 0&&(h=new xi(new cl(1,1,1),new ea({name:"BackgroundCubeMaterial",uniforms:qr(yi.backgroundCube.uniforms),vertexShader:yi.backgroundCube.vertexShader,fragmentShader:yi.backgroundCube.fragmentShader,side:Sn,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(T,R,w){this.matrixWorld.copyPosition(w.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),a.update(h)),h.material.uniforms.envMap.value=g,h.material.uniforms.flipEnvMap.value=g.isCubeTexture&&g.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=u.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=u.backgroundIntensity,h.material.toneMapped=re.getTransfer(g.colorSpace)!==ge,(d!==g||f!==g.version||p!==e.toneMapping)&&(h.material.needsUpdate=!0,d=g,f=g.version,p=e.toneMapping),h.layers.enableAll(),m.unshift(h,h.geometry,h.material,0,0,null)):g&&g.isTexture&&(c===void 0&&(c=new xi(new Mp(2,2),new ea({name:"BackgroundMaterial",uniforms:qr(yi.background.uniforms),vertexShader:yi.background.vertexShader,fragmentShader:yi.background.fragmentShader,side:Ha,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),a.update(c)),c.material.uniforms.t2D.value=g,c.material.uniforms.backgroundIntensity.value=u.backgroundIntensity,c.material.toneMapped=re.getTransfer(g.colorSpace)!==ge,g.matrixAutoUpdate===!0&&g.updateMatrix(),c.material.uniforms.uvTransform.value.copy(g.matrix),(d!==g||f!==g.version||p!==e.toneMapping)&&(c.material.needsUpdate=!0,d=g,f=g.version,p=e.toneMapping),c.layers.enableAll(),m.unshift(c,c.geometry,c.material,0,0,null))}function y(m,u){m.getRGB(uu,zx(e)),i.buffers.color.setClear(uu.r,uu.g,uu.b,u,r)}return{getClearColor:function(){return o},setClearColor:function(m,u=1){o.set(m),l=u,y(o,l)},getClearAlpha:function(){return l},setClearAlpha:function(m){l=m,y(o,l)},render:v}}function hw(e,t,n,i){let a=e.getParameter(e.MAX_VERTEX_ATTRIBS),s=i.isWebGL2?null:t.get("OES_vertex_array_object"),r=i.isWebGL2||s!==null,o={},l=m(null),c=l,h=!1;function d(L,H,q,k,Q){let X=!1;if(r){let j=y(k,q,H);c!==j&&(c=j,p(c.object)),X=u(L,k,q,Q),X&&_(L,k,q,Q)}else{let j=H.wireframe===!0;(c.geometry!==k.id||c.program!==q.id||c.wireframe!==j)&&(c.geometry=k.id,c.program=q.id,c.wireframe=j,X=!0)}Q!==null&&n.update(Q,e.ELEMENT_ARRAY_BUFFER),(X||h)&&(h=!1,U(L,H,q,k),Q!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,n.get(Q).buffer))}function f(){return i.isWebGL2?e.createVertexArray():s.createVertexArrayOES()}function p(L){return i.isWebGL2?e.bindVertexArray(L):s.bindVertexArrayOES(L)}function v(L){return i.isWebGL2?e.deleteVertexArray(L):s.deleteVertexArrayOES(L)}function y(L,H,q){let k=q.wireframe===!0,Q=o[L.id];Q===void 0&&(Q={},o[L.id]=Q);let X=Q[H.id];X===void 0&&(X={},Q[H.id]=X);let j=X[k];return j===void 0&&(j=m(f()),X[k]=j),j}function m(L){let H=[],q=[],k=[];for(let Q=0;Q<a;Q++)H[Q]=0,q[Q]=0,k[Q]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:H,enabledAttributes:q,attributeDivisors:k,object:L,attributes:{},index:null}}function u(L,H,q,k){let Q=c.attributes,X=H.attributes,j=0,tt=q.getAttributes();for(let dt in tt)if(tt[dt].location>=0){let Z=Q[dt],ct=X[dt];if(ct===void 0&&(dt==="instanceMatrix"&&L.instanceMatrix&&(ct=L.instanceMatrix),dt==="instanceColor"&&L.instanceColor&&(ct=L.instanceColor)),Z===void 0||Z.attribute!==ct||ct&&Z.data!==ct.data)return!0;j++}return c.attributesNum!==j||c.index!==k}function _(L,H,q,k){let Q={},X=H.attributes,j=0,tt=q.getAttributes();for(let dt in tt)if(tt[dt].location>=0){let Z=X[dt];Z===void 0&&(dt==="instanceMatrix"&&L.instanceMatrix&&(Z=L.instanceMatrix),dt==="instanceColor"&&L.instanceColor&&(Z=L.instanceColor));let ct={};ct.attribute=Z,Z&&Z.data&&(ct.data=Z.data),Q[dt]=ct,j++}c.attributes=Q,c.attributesNum=j,c.index=k}function g(){let L=c.newAttributes;for(let H=0,q=L.length;H<q;H++)L[H]=0}function b(L){T(L,0)}function T(L,H){let q=c.newAttributes,k=c.enabledAttributes,Q=c.attributeDivisors;q[L]=1,k[L]===0&&(e.enableVertexAttribArray(L),k[L]=1),Q[L]!==H&&((i.isWebGL2?e:t.get("ANGLE_instanced_arrays"))[i.isWebGL2?"vertexAttribDivisor":"vertexAttribDivisorANGLE"](L,H),Q[L]=H)}function R(){let L=c.newAttributes,H=c.enabledAttributes;for(let q=0,k=H.length;q<k;q++)H[q]!==L[q]&&(e.disableVertexAttribArray(q),H[q]=0)}function w(L,H,q,k,Q,X,j){j===!0?e.vertexAttribIPointer(L,H,q,Q,X):e.vertexAttribPointer(L,H,q,k,Q,X)}function U(L,H,q,k){if(i.isWebGL2===!1&&(L.isInstancedMesh||k.isInstancedBufferGeometry)&&t.get("ANGLE_instanced_arrays")===null)return;g();let Q=k.attributes,X=q.getAttributes(),j=H.defaultAttributeValues;for(let tt in X){let dt=X[tt];if(dt.location>=0){let V=Q[tt];if(V===void 0&&(tt==="instanceMatrix"&&L.instanceMatrix&&(V=L.instanceMatrix),tt==="instanceColor"&&L.instanceColor&&(V=L.instanceColor)),V!==void 0){let Z=V.normalized,ct=V.itemSize,gt=n.get(V);if(gt===void 0)continue;let _t=gt.buffer,Ut=gt.type,Lt=gt.bytesPerElement,At=i.isWebGL2===!0&&(Ut===e.INT||Ut===e.UNSIGNED_INT||V.gpuType===Tx);if(V.isInterleavedBufferAttribute){let Nt=V.data,N=Nt.stride,Fe=V.offset;if(Nt.isInstancedInterleavedBuffer){for(let xt=0;xt<dt.locationSize;xt++)T(dt.location+xt,Nt.meshPerAttribute);L.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=Nt.meshPerAttribute*Nt.count)}else for(let xt=0;xt<dt.locationSize;xt++)b(dt.location+xt);e.bindBuffer(e.ARRAY_BUFFER,_t);for(let xt=0;xt<dt.locationSize;xt++)w(dt.location+xt,ct/dt.locationSize,Ut,Z,N*Lt,(Fe+ct/dt.locationSize*xt)*Lt,At)}else{if(V.isInstancedBufferAttribute){for(let Nt=0;Nt<dt.locationSize;Nt++)T(dt.location+Nt,V.meshPerAttribute);L.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=V.meshPerAttribute*V.count)}else for(let Nt=0;Nt<dt.locationSize;Nt++)b(dt.location+Nt);e.bindBuffer(e.ARRAY_BUFFER,_t);for(let Nt=0;Nt<dt.locationSize;Nt++)w(dt.location+Nt,ct/dt.locationSize,Ut,Z,ct*Lt,ct/dt.locationSize*Nt*Lt,At)}}else if(j!==void 0){let Z=j[tt];if(Z!==void 0)switch(Z.length){case 2:e.vertexAttrib2fv(dt.location,Z);break;case 3:e.vertexAttrib3fv(dt.location,Z);break;case 4:e.vertexAttrib4fv(dt.location,Z);break;default:e.vertexAttrib1fv(dt.location,Z)}}}}R()}function x(){Y();for(let L in o){let H=o[L];for(let q in H){let k=H[q];for(let Q in k)v(k[Q].object),delete k[Q];delete H[q]}delete o[L]}}function A(L){if(o[L.id]===void 0)return;let H=o[L.id];for(let q in H){let k=H[q];for(let Q in k)v(k[Q].object),delete k[Q];delete H[q]}delete o[L.id]}function F(L){for(let H in o){let q=o[H];if(q[L.id]===void 0)continue;let k=q[L.id];for(let Q in k)v(k[Q].object),delete k[Q];delete q[L.id]}}function Y(){$(),h=!0,c!==l&&(c=l,p(c.object))}function $(){l.geometry=null,l.program=null,l.wireframe=!1}return{setup:d,reset:Y,resetDefaultState:$,dispose:x,releaseStatesOfGeometry:A,releaseStatesOfProgram:F,initAttributes:g,enableAttribute:b,disableUnusedAttributes:R}}function fw(e,t,n,i){let a=i.isWebGL2,s;function r(h){s=h}function o(h,d){e.drawArrays(s,h,d),n.update(d,s,1)}function l(h,d,f){if(f===0)return;let p,v;if(a)p=e,v="drawArraysInstanced";else if(p=t.get("ANGLE_instanced_arrays"),v="drawArraysInstancedANGLE",p===null){console.error("THREE.WebGLBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}p[v](s,h,d,f),n.update(d,s,f)}function c(h,d,f){if(f===0)return;let p=t.get("WEBGL_multi_draw");if(p===null)for(let v=0;v<f;v++)this.render(h[v],d[v]);else{p.multiDrawArraysWEBGL(s,h,0,d,0,f);let v=0;for(let y=0;y<f;y++)v+=d[y];n.update(v,s,1)}}this.setMode=r,this.render=o,this.renderInstances=l,this.renderMultiDraw=c}function dw(e,t,n){let i;function a(){if(i!==void 0)return i;if(t.has("EXT_texture_filter_anisotropic")===!0){let w=t.get("EXT_texture_filter_anisotropic");i=e.getParameter(w.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function s(w){if(w==="highp"){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return"highp";w="mediump"}return w==="mediump"&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let r=typeof WebGL2RenderingContext<"u"&&e.constructor.name==="WebGL2RenderingContext",o=n.precision!==void 0?n.precision:"highp",l=s(o);l!==o&&(console.warn("THREE.WebGLRenderer:",o,"not supported, using",l,"instead."),o=l);let c=r||t.has("WEBGL_draw_buffers"),h=n.logarithmicDepthBuffer===!0,d=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),f=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),p=e.getParameter(e.MAX_TEXTURE_SIZE),v=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),y=e.getParameter(e.MAX_VERTEX_ATTRIBS),m=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),u=e.getParameter(e.MAX_VARYING_VECTORS),_=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),g=f>0,b=r||t.has("OES_texture_float"),T=g&&b,R=r?e.getParameter(e.MAX_SAMPLES):0;return{isWebGL2:r,drawBuffers:c,getMaxAnisotropy:a,getMaxPrecision:s,precision:o,logarithmicDepthBuffer:h,maxTextures:d,maxVertexTextures:f,maxTextureSize:p,maxCubemapSize:v,maxAttributes:y,maxVertexUniforms:m,maxVaryings:u,maxFragmentUniforms:_,vertexTextures:g,floatFragmentTextures:b,floatVertexTextures:T,maxSamples:R}}function pw(e){let t=this,n=null,i=0,a=!1,s=!1,r=new ji,o=new kt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,f){let p=d.length!==0||f||i!==0||a;return a=f,i=d.length,p},this.beginShadows=function(){s=!0,h(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(d,f){n=h(d,f,0)},this.setState=function(d,f,p){let v=d.clippingPlanes,y=d.clipIntersection,m=d.clipShadows,u=e.get(d);if(!a||v===null||v.length===0||s&&!m)s?h(null):c();else{let _=s?0:i,g=_*4,b=u.clippingState||null;l.value=b,b=h(v,f,g,p);for(let T=0;T!==g;++T)b[T]=n[T];u.clippingState=b,this.numIntersection=y?this.numPlanes:0,this.numPlanes+=_}};function c(){l.value!==n&&(l.value=n,l.needsUpdate=i>0),t.numPlanes=i,t.numIntersection=0}function h(d,f,p,v){let y=d!==null?d.length:0,m=null;if(y!==0){if(m=l.value,v!==!0||m===null){let u=p+y*4,_=f.matrixWorldInverse;o.getNormalMatrix(_),(m===null||m.length<u)&&(m=new Float32Array(u));for(let g=0,b=p;g!==y;++g,b+=4)r.copy(d[g]).applyMatrix4(_,o),r.normal.toArray(m,b),m[b+3]=r.constant}l.value=m,l.needsUpdate=!0}return t.numPlanes=y,t.numIntersection=0,m}}function mw(e){let t=new WeakMap;function n(r,o){return o===hp?r.mapping=Vr:o===fp&&(r.mapping=Gr),r}function i(r){if(r&&r.isTexture){let o=r.mapping;if(o===hp||o===fp)if(t.has(r)){let l=t.get(r).texture;return n(l,r.mapping)}else{let l=r.image;if(l&&l.height>0){let c=new bp(l.height/2);return c.fromEquirectangularTexture(e,r),t.set(r,c),r.addEventListener("dispose",a),n(c.texture,r.mapping)}else return null}}return r}function a(r){let o=r.target;o.removeEventListener("dispose",a);let l=t.get(o);l!==void 0&&(t.delete(o),l.dispose())}function s(){t=new WeakMap}return{get:i,dispose:s}}var Ep=class extends Ru{constructor(t=-1,n=1,i=1,a=-1,s=.1,r=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=n,this.top=i,this.bottom=a,this.near=s,this.far=r,this.updateProjectionMatrix()}copy(t,n){return super.copy(t,n),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,n,i,a,s,r){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=n,this.view.offsetX=i,this.view.offsetY=a,this.view.width=s,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),n=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,a=(this.top+this.bottom)/2,s=i-t,r=i+t,o=a+n,l=a-n;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,r=s+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(s,r,o,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let n=super.toJSON(t);return n.object.zoom=this.zoom,n.object.left=this.left,n.object.right=this.right,n.object.top=this.top,n.object.bottom=this.bottom,n.object.near=this.near,n.object.far=this.far,this.view!==null&&(n.object.view=Object.assign({},this.view)),n}},zr=4,ex=[.125,.215,.35,.446,.526,.582],gs=20,ap=new Ep,nx=new te,sp=null,rp=0,op=0,ps=(1+Math.sqrt(5))/2,Or=1/ps,ix=[new I(1,1,1),new I(-1,1,1),new I(1,1,-1),new I(-1,1,-1),new I(0,ps,Or),new I(0,ps,-Or),new I(Or,0,ps),new I(-Or,0,ps),new I(ps,Or,0),new I(-ps,Or,0)],Du=class{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,n=0,i=.1,a=100){sp=this._renderer.getRenderTarget(),rp=this._renderer.getActiveCubeFace(),op=this._renderer.getActiveMipmapLevel(),this._setSize(256);let s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(t,i,a,s),n>0&&this._blur(s,0,0,n),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(t,n=null){return this._fromTexture(t,n)}fromCubemap(t,n=null){return this._fromTexture(t,n)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=rx(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=sx(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(sp,rp,op),t.scissorTest=!1,hu(t,0,0,t.width,t.height)}_fromTexture(t,n){t.mapping===Vr||t.mapping===Gr?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),sp=this._renderer.getRenderTarget(),rp=this._renderer.getActiveCubeFace(),op=this._renderer.getActiveMipmapLevel();let i=n||this._allocateTargets();return this._textureToCubeUV(t,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){let t=3*Math.max(this._cubeSize,112),n=4*this._cubeSize,i={magFilter:Jn,minFilter:Jn,generateMipmaps:!1,type:ol,format:ri,colorSpace:$i,depthBuffer:!1},a=ax(t,n,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==n){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=ax(t,n,i);let{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=gw(s)),this._blurMaterial=_w(s,t,n)}return a}_compileMaterial(t){let n=new xi(this._lodPlanes[0],t);this._renderer.compile(n,ap)}_sceneToCubeUV(t,n,i,a){let o=new Pn(90,1,n,i),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],h=this._renderer,d=h.autoClear,f=h.toneMapping;h.getClearColor(nx),h.toneMapping=Ba,h.autoClear=!1;let p=new Tu({name:"PMREM.Background",side:Sn,depthWrite:!1,depthTest:!1}),v=new xi(new cl,p),y=!1,m=t.background;m?m.isColor&&(p.color.copy(m),t.background=null,y=!0):(p.color.copy(nx),y=!0);for(let u=0;u<6;u++){let _=u%3;_===0?(o.up.set(0,l[u],0),o.lookAt(c[u],0,0)):_===1?(o.up.set(0,0,l[u]),o.lookAt(0,c[u],0)):(o.up.set(0,l[u],0),o.lookAt(0,0,c[u]));let g=this._cubeSize;hu(a,_*g,u>2?g:0,g,g),h.setRenderTarget(a),y&&h.render(v,o),h.render(t,o)}v.geometry.dispose(),v.material.dispose(),h.toneMapping=f,h.autoClear=d,t.background=m}_textureToCubeUV(t,n){let i=this._renderer,a=t.mapping===Vr||t.mapping===Gr;a?(this._cubemapMaterial===null&&(this._cubemapMaterial=rx()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=sx());let s=a?this._cubemapMaterial:this._equirectMaterial,r=new xi(this._lodPlanes[0],s),o=s.uniforms;o.envMap.value=t;let l=this._cubeSize;hu(n,0,0,3*l,2*l),i.setRenderTarget(n),i.render(r,ap)}_applyPMREM(t){let n=this._renderer,i=n.autoClear;n.autoClear=!1;for(let a=1;a<this._lodPlanes.length;a++){let s=Math.sqrt(this._sigmas[a]*this._sigmas[a]-this._sigmas[a-1]*this._sigmas[a-1]),r=ix[(a-1)%ix.length];this._blur(t,a-1,a,s,r)}n.autoClear=i}_blur(t,n,i,a,s){let r=this._pingPongRenderTarget;this._halfBlur(t,r,n,i,a,"latitudinal",s),this._halfBlur(r,t,i,i,a,"longitudinal",s)}_halfBlur(t,n,i,a,s,r,o){let l=this._renderer,c=this._blurMaterial;r!=="latitudinal"&&r!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");let h=3,d=new xi(this._lodPlanes[a],c),f=c.uniforms,p=this._sizeLods[i]-1,v=isFinite(s)?Math.PI/(2*p):2*Math.PI/(2*gs-1),y=s/v,m=isFinite(s)?1+Math.floor(h*y):gs;m>gs&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${gs}`);let u=[],_=0;for(let w=0;w<gs;++w){let U=w/y,x=Math.exp(-U*U/2);u.push(x),w===0?_+=x:w<m&&(_+=2*x)}for(let w=0;w<u.length;w++)u[w]=u[w]/_;f.envMap.value=t.texture,f.samples.value=m,f.weights.value=u,f.latitudinal.value=r==="latitudinal",o&&(f.poleAxis.value=o);let{_lodMax:g}=this;f.dTheta.value=v,f.mipInt.value=g-i;let b=this._sizeLods[a],T=3*b*(a>g-zr?a-g+zr:0),R=4*(this._cubeSize-b);hu(n,T,R,3*b,2*b),l.setRenderTarget(n),l.render(d,ap)}};function gw(e){let t=[],n=[],i=[],a=e,s=e-zr+1+ex.length;for(let r=0;r<s;r++){let o=Math.pow(2,a);n.push(o);let l=1/o;r>e-zr?l=ex[r-e+zr-1]:r===0&&(l=0),i.push(l);let c=1/(o-2),h=-c,d=1+c,f=[h,h,d,h,d,d,h,h,d,d,h,d],p=6,v=6,y=3,m=2,u=1,_=new Float32Array(y*v*p),g=new Float32Array(m*v*p),b=new Float32Array(u*v*p);for(let R=0;R<p;R++){let w=R%3*2/3-1,U=R>2?0:-1,x=[w,U,0,w+2/3,U,0,w+2/3,U+1,0,w,U,0,w+2/3,U+1,0,w,U+1,0];_.set(x,y*v*R),g.set(f,m*v*R);let A=[R,R,R,R,R,R];b.set(A,u*v*R)}let T=new Ss;T.setAttribute("position",new Kn(_,y)),T.setAttribute("uv",new Kn(g,m)),T.setAttribute("faceIndex",new Kn(b,u)),t.push(T),a>zr&&a--}return{lodPlanes:t,sizeLods:n,sigmas:i}}function ax(e,t,n){let i=new ta(e,t,n);return i.texture.mapping=Nu,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function hu(e,t,n,i,a){e.viewport.set(t,n,i,a),e.scissor.set(t,n,i,a)}function _w(e,t,n){let i=new Float32Array(gs),a=new I(0,1,0);return new ea({name:"SphericalGaussianBlur",defines:{n:gs,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:a}},vertexShader:jp(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Ia,depthTest:!1,depthWrite:!1})}function sx(){return new ea({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:jp(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Ia,depthTest:!1,depthWrite:!1})}function rx(){return new ea({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:jp(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Ia,depthTest:!1,depthWrite:!1})}function jp(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function vw(e){let t=new WeakMap,n=null;function i(o){if(o&&o.isTexture){let l=o.mapping,c=l===hp||l===fp,h=l===Vr||l===Gr;if(c||h)if(o.isRenderTargetTexture&&o.needsPMREMUpdate===!0){o.needsPMREMUpdate=!1;let d=t.get(o);return n===null&&(n=new Du(e)),d=c?n.fromEquirectangular(o,d):n.fromCubemap(o,d),t.set(o,d),d.texture}else{if(t.has(o))return t.get(o).texture;{let d=o.image;if(c&&d&&d.height>0||h&&d&&a(d)){n===null&&(n=new Du(e));let f=c?n.fromEquirectangular(o):n.fromCubemap(o);return t.set(o,f),o.addEventListener("dispose",s),f.texture}else return null}}}return o}function a(o){let l=0,c=6;for(let h=0;h<c;h++)o[h]!==void 0&&l++;return l===c}function s(o){let l=o.target;l.removeEventListener("dispose",s);let c=t.get(l);c!==void 0&&(t.delete(l),c.dispose())}function r(){t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:i,dispose:r}}function yw(e){let t={};function n(i){if(t[i]!==void 0)return t[i];let a;switch(i){case"WEBGL_depth_texture":a=e.getExtension("WEBGL_depth_texture")||e.getExtension("MOZ_WEBGL_depth_texture")||e.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":a=e.getExtension("EXT_texture_filter_anisotropic")||e.getExtension("MOZ_EXT_texture_filter_anisotropic")||e.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":a=e.getExtension("WEBGL_compressed_texture_s3tc")||e.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":a=e.getExtension("WEBGL_compressed_texture_pvrtc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:a=e.getExtension(i)}return t[i]=a,a}return{has:function(i){return n(i)!==null},init:function(i){i.isWebGL2?n("EXT_color_buffer_float"):(n("WEBGL_depth_texture"),n("OES_texture_float"),n("OES_texture_half_float"),n("OES_texture_half_float_linear"),n("OES_standard_derivatives"),n("OES_element_index_uint"),n("OES_vertex_array_object"),n("ANGLE_instanced_arrays")),n("OES_texture_float_linear"),n("EXT_color_buffer_half_float"),n("WEBGL_multisampled_render_to_texture")},get:function(i){let a=n(i);return a===null&&console.warn("THREE.WebGLRenderer: "+i+" extension not supported."),a}}}function xw(e,t,n,i){let a={},s=new WeakMap;function r(d){let f=d.target;f.index!==null&&t.remove(f.index);for(let v in f.attributes)t.remove(f.attributes[v]);for(let v in f.morphAttributes){let y=f.morphAttributes[v];for(let m=0,u=y.length;m<u;m++)t.remove(y[m])}f.removeEventListener("dispose",r),delete a[f.id];let p=s.get(f);p&&(t.remove(p),s.delete(f)),i.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,n.memory.geometries--}function o(d,f){return a[f.id]===!0||(f.addEventListener("dispose",r),a[f.id]=!0,n.memory.geometries++),f}function l(d){let f=d.attributes;for(let v in f)t.update(f[v],e.ARRAY_BUFFER);let p=d.morphAttributes;for(let v in p){let y=p[v];for(let m=0,u=y.length;m<u;m++)t.update(y[m],e.ARRAY_BUFFER)}}function c(d){let f=[],p=d.index,v=d.attributes.position,y=0;if(p!==null){let _=p.array;y=p.version;for(let g=0,b=_.length;g<b;g+=3){let T=_[g+0],R=_[g+1],w=_[g+2];f.push(T,R,R,w,w,T)}}else if(v!==void 0){let _=v.array;y=v.version;for(let g=0,b=_.length/3-1;g<b;g+=3){let T=g+0,R=g+1,w=g+2;f.push(T,R,R,w,w,T)}}else return;let m=new(Ox(f)?wu:Au)(f,1);m.version=y;let u=s.get(d);u&&t.remove(u),s.set(d,m)}function h(d){let f=s.get(d);if(f){let p=d.index;p!==null&&f.version<p.version&&c(d)}else c(d);return s.get(d)}return{get:o,update:l,getWireframeAttribute:h}}function Sw(e,t,n,i){let a=i.isWebGL2,s;function r(p){s=p}let o,l;function c(p){o=p.type,l=p.bytesPerElement}function h(p,v){e.drawElements(s,v,o,p*l),n.update(v,s,1)}function d(p,v,y){if(y===0)return;let m,u;if(a)m=e,u="drawElementsInstanced";else if(m=t.get("ANGLE_instanced_arrays"),u="drawElementsInstancedANGLE",m===null){console.error("THREE.WebGLIndexedBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}m[u](s,v,o,p*l,y),n.update(v,s,y)}function f(p,v,y){if(y===0)return;let m=t.get("WEBGL_multi_draw");if(m===null)for(let u=0;u<y;u++)this.render(p[u]/l,v[u]);else{m.multiDrawElementsWEBGL(s,v,0,o,p,0,y);let u=0;for(let _=0;_<y;_++)u+=v[_];n.update(u,s,1)}}this.setMode=r,this.setIndex=c,this.render=h,this.renderInstances=d,this.renderMultiDraw=f}function bw(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,r,o){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=o*(s/3);break;case e.LINES:n.lines+=o*(s/2);break;case e.LINE_STRIP:n.lines+=o*(s-1);break;case e.LINE_LOOP:n.lines+=o*s;break;case e.POINTS:n.points+=o*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",r);break}}function a(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:a,update:i}}function Mw(e,t){return e[0]-t[0]}function Ew(e,t){return Math.abs(t[1])-Math.abs(e[1])}function Tw(e,t,n){let i={},a=new Float32Array(8),s=new WeakMap,r=new Ke,o=[];for(let c=0;c<8;c++)o[c]=[c,0];function l(c,h,d){let f=c.morphTargetInfluences;if(t.isWebGL2===!0){let p=h.morphAttributes.position||h.morphAttributes.normal||h.morphAttributes.color,v=p!==void 0?p.length:0,y=s.get(h);if(y===void 0||y.count!==v){let L=function(){Y.dispose(),s.delete(h),h.removeEventListener("dispose",L)};y!==void 0&&y.texture.dispose();let _=h.morphAttributes.position!==void 0,g=h.morphAttributes.normal!==void 0,b=h.morphAttributes.color!==void 0,T=h.morphAttributes.position||[],R=h.morphAttributes.normal||[],w=h.morphAttributes.color||[],U=0;_===!0&&(U=1),g===!0&&(U=2),b===!0&&(U=3);let x=h.attributes.position.count*U,A=1;x>t.maxTextureSize&&(A=Math.ceil(x/t.maxTextureSize),x=t.maxTextureSize);let F=new Float32Array(x*A*4*v),Y=new Mu(F,x,A,v);Y.type=za,Y.needsUpdate=!0;let $=U*4;for(let H=0;H<v;H++){let q=T[H],k=R[H],Q=w[H],X=x*A*4*H;for(let j=0;j<q.count;j++){let tt=j*$;_===!0&&(r.fromBufferAttribute(q,j),F[X+tt+0]=r.x,F[X+tt+1]=r.y,F[X+tt+2]=r.z,F[X+tt+3]=0),g===!0&&(r.fromBufferAttribute(k,j),F[X+tt+4]=r.x,F[X+tt+5]=r.y,F[X+tt+6]=r.z,F[X+tt+7]=0),b===!0&&(r.fromBufferAttribute(Q,j),F[X+tt+8]=r.x,F[X+tt+9]=r.y,F[X+tt+10]=r.z,F[X+tt+11]=Q.itemSize===4?r.w:1)}}y={count:v,texture:Y,size:new oe(x,A)},s.set(h,y),h.addEventListener("dispose",L)}let m=0;for(let _=0;_<f.length;_++)m+=f[_];let u=h.morphTargetsRelative?1:1-m;d.getUniforms().setValue(e,"morphTargetBaseInfluence",u),d.getUniforms().setValue(e,"morphTargetInfluences",f),d.getUniforms().setValue(e,"morphTargetsTexture",y.texture,n),d.getUniforms().setValue(e,"morphTargetsTextureSize",y.size)}else{let p=f===void 0?0:f.length,v=i[h.id];if(v===void 0||v.length!==p){v=[];for(let g=0;g<p;g++)v[g]=[g,0];i[h.id]=v}for(let g=0;g<p;g++){let b=v[g];b[0]=g,b[1]=f[g]}v.sort(Ew);for(let g=0;g<8;g++)g<p&&v[g][1]?(o[g][0]=v[g][0],o[g][1]=v[g][1]):(o[g][0]=Number.MAX_SAFE_INTEGER,o[g][1]=0);o.sort(Mw);let y=h.morphAttributes.position,m=h.morphAttributes.normal,u=0;for(let g=0;g<8;g++){let b=o[g],T=b[0],R=b[1];T!==Number.MAX_SAFE_INTEGER&&R?(y&&h.getAttribute("morphTarget"+g)!==y[T]&&h.setAttribute("morphTarget"+g,y[T]),m&&h.getAttribute("morphNormal"+g)!==m[T]&&h.setAttribute("morphNormal"+g,m[T]),a[g]=R,u+=R):(y&&h.hasAttribute("morphTarget"+g)===!0&&h.deleteAttribute("morphTarget"+g),m&&h.hasAttribute("morphNormal"+g)===!0&&h.deleteAttribute("morphNormal"+g),a[g]=0)}let _=h.morphTargetsRelative?1:1-u;d.getUniforms().setValue(e,"morphTargetBaseInfluence",_),d.getUniforms().setValue(e,"morphTargetInfluences",a)}}return{update:l}}function Aw(e,t,n,i){let a=new WeakMap;function s(l){let c=i.render.frame,h=l.geometry,d=t.get(l,h);if(a.get(d)!==c&&(t.update(d),a.set(d,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",o)===!1&&l.addEventListener("dispose",o),a.get(l)!==c&&(n.update(l.instanceMatrix,e.ARRAY_BUFFER),l.instanceColor!==null&&n.update(l.instanceColor,e.ARRAY_BUFFER),a.set(l,c))),l.isSkinnedMesh){let f=l.skeleton;a.get(f)!==c&&(f.update(),a.set(f,c))}return d}function r(){a=new WeakMap}function o(l){let c=l.target;c.removeEventListener("dispose",o),n.remove(c.instanceMatrix),c.instanceColor!==null&&n.remove(c.instanceColor)}return{update:s,dispose:r}}var Uu=class extends oi{constructor(t,n,i,a,s,r,o,l,c,h){if(h=h!==void 0?h:vs,h!==vs&&h!==kr)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");i===void 0&&h===vs&&(i=Pa),i===void 0&&h===kr&&(i=_s),super(null,a,s,r,o,l,h,i,c),this.isDepthTexture=!0,this.image={width:t,height:n},this.magFilter=o!==void 0?o:hn,this.minFilter=l!==void 0?l:hn,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.compareFunction=t.compareFunction,this}toJSON(t){let n=super.toJSON(t);return this.compareFunction!==null&&(n.compareFunction=this.compareFunction),n}},Bx=new oi,Fx=new Uu(1,1);Fx.compareFunction=Nx;var Hx=new Mu,Vx=new yp,Gx=new Cu,ox=[],lx=[],cx=new Float32Array(16),ux=new Float32Array(9),hx=new Float32Array(4);function Zr(e,t,n){let i=e[0];if(i<=0||i>0)return e;let a=t*n,s=ox[a];if(s===void 0&&(s=new Float32Array(a),ox[a]=s),t!==0){i.toArray(s,0);for(let r=1,o=0;r!==t;++r)o+=n,e[r].toArray(s,o)}return s}function Ie(e,t){if(e.length!==t.length)return!1;for(let n=0,i=e.length;n<i;n++)if(e[n]!==t[n])return!1;return!0}function Be(e,t){for(let n=0,i=t.length;n<i;n++)e[n]=t[n]}function Pu(e,t){let n=lx[t];n===void 0&&(n=new Int32Array(t),lx[t]=n);for(let i=0;i!==t;++i)n[i]=e.allocateTextureUnit();return n}function ww(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function Rw(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Ie(n,t))return;e.uniform2fv(this.addr,t),Be(n,t)}}function Cw(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(Ie(n,t))return;e.uniform3fv(this.addr,t),Be(n,t)}}function Lw(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Ie(n,t))return;e.uniform4fv(this.addr,t),Be(n,t)}}function Dw(e,t){let n=this.cache,i=t.elements;if(i===void 0){if(Ie(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),Be(n,t)}else{if(Ie(n,i))return;hx.set(i),e.uniformMatrix2fv(this.addr,!1,hx),Be(n,i)}}function Uw(e,t){let n=this.cache,i=t.elements;if(i===void 0){if(Ie(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),Be(n,t)}else{if(Ie(n,i))return;ux.set(i),e.uniformMatrix3fv(this.addr,!1,ux),Be(n,i)}}function Nw(e,t){let n=this.cache,i=t.elements;if(i===void 0){if(Ie(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),Be(n,t)}else{if(Ie(n,i))return;cx.set(i),e.uniformMatrix4fv(this.addr,!1,cx),Be(n,i)}}function Ow(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function Pw(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Ie(n,t))return;e.uniform2iv(this.addr,t),Be(n,t)}}function zw(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Ie(n,t))return;e.uniform3iv(this.addr,t),Be(n,t)}}function Iw(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Ie(n,t))return;e.uniform4iv(this.addr,t),Be(n,t)}}function Bw(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function Fw(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Ie(n,t))return;e.uniform2uiv(this.addr,t),Be(n,t)}}function Hw(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Ie(n,t))return;e.uniform3uiv(this.addr,t),Be(n,t)}}function Vw(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Ie(n,t))return;e.uniform4uiv(this.addr,t),Be(n,t)}}function Gw(e,t,n){let i=this.cache,a=n.allocateTextureUnit();i[0]!==a&&(e.uniform1i(this.addr,a),i[0]=a);let s=this.type===e.SAMPLER_2D_SHADOW?Fx:Bx;n.setTexture2D(t||s,a)}function kw(e,t,n){let i=this.cache,a=n.allocateTextureUnit();i[0]!==a&&(e.uniform1i(this.addr,a),i[0]=a),n.setTexture3D(t||Vx,a)}function Ww(e,t,n){let i=this.cache,a=n.allocateTextureUnit();i[0]!==a&&(e.uniform1i(this.addr,a),i[0]=a),n.setTextureCube(t||Gx,a)}function Xw(e,t,n){let i=this.cache,a=n.allocateTextureUnit();i[0]!==a&&(e.uniform1i(this.addr,a),i[0]=a),n.setTexture2DArray(t||Hx,a)}function qw(e){switch(e){case 5126:return ww;case 35664:return Rw;case 35665:return Cw;case 35666:return Lw;case 35674:return Dw;case 35675:return Uw;case 35676:return Nw;case 5124:case 35670:return Ow;case 35667:case 35671:return Pw;case 35668:case 35672:return zw;case 35669:case 35673:return Iw;case 5125:return Bw;case 36294:return Fw;case 36295:return Hw;case 36296:return Vw;case 35678:case 36198:case 36298:case 36306:case 35682:return Gw;case 35679:case 36299:case 36307:return kw;case 35680:case 36300:case 36308:case 36293:return Ww;case 36289:case 36303:case 36311:case 36292:return Xw}}function Yw(e,t){e.uniform1fv(this.addr,t)}function Zw(e,t){let n=Zr(t,this.size,2);e.uniform2fv(this.addr,n)}function jw(e,t){let n=Zr(t,this.size,3);e.uniform3fv(this.addr,n)}function Jw(e,t){let n=Zr(t,this.size,4);e.uniform4fv(this.addr,n)}function Qw(e,t){let n=Zr(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function Kw(e,t){let n=Zr(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function $w(e,t){let n=Zr(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function tR(e,t){e.uniform1iv(this.addr,t)}function eR(e,t){e.uniform2iv(this.addr,t)}function nR(e,t){e.uniform3iv(this.addr,t)}function iR(e,t){e.uniform4iv(this.addr,t)}function aR(e,t){e.uniform1uiv(this.addr,t)}function sR(e,t){e.uniform2uiv(this.addr,t)}function rR(e,t){e.uniform3uiv(this.addr,t)}function oR(e,t){e.uniform4uiv(this.addr,t)}function lR(e,t,n){let i=this.cache,a=t.length,s=Pu(n,a);Ie(i,s)||(e.uniform1iv(this.addr,s),Be(i,s));for(let r=0;r!==a;++r)n.setTexture2D(t[r]||Bx,s[r])}function cR(e,t,n){let i=this.cache,a=t.length,s=Pu(n,a);Ie(i,s)||(e.uniform1iv(this.addr,s),Be(i,s));for(let r=0;r!==a;++r)n.setTexture3D(t[r]||Vx,s[r])}function uR(e,t,n){let i=this.cache,a=t.length,s=Pu(n,a);Ie(i,s)||(e.uniform1iv(this.addr,s),Be(i,s));for(let r=0;r!==a;++r)n.setTextureCube(t[r]||Gx,s[r])}function hR(e,t,n){let i=this.cache,a=t.length,s=Pu(n,a);Ie(i,s)||(e.uniform1iv(this.addr,s),Be(i,s));for(let r=0;r!==a;++r)n.setTexture2DArray(t[r]||Hx,s[r])}function fR(e){switch(e){case 5126:return Yw;case 35664:return Zw;case 35665:return jw;case 35666:return Jw;case 35674:return Qw;case 35675:return Kw;case 35676:return $w;case 5124:case 35670:return tR;case 35667:case 35671:return eR;case 35668:case 35672:return nR;case 35669:case 35673:return iR;case 5125:return aR;case 36294:return sR;case 36295:return rR;case 36296:return oR;case 35678:case 36198:case 36298:case 36306:case 35682:return lR;case 35679:case 36299:case 36307:return cR;case 35680:case 36300:case 36308:case 36293:return uR;case 36289:case 36303:case 36311:case 36292:return hR}}var Tp=class{constructor(t,n,i){this.id=t,this.addr=i,this.cache=[],this.type=n.type,this.setValue=qw(n.type)}},Ap=class{constructor(t,n,i){this.id=t,this.addr=i,this.cache=[],this.type=n.type,this.size=n.size,this.setValue=fR(n.type)}},wp=class{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,n,i){let a=this.seq;for(let s=0,r=a.length;s!==r;++s){let o=a[s];o.setValue(t,n[o.id],i)}}},lp=/(\w+)(\])?(\[|\.)?/g;function fx(e,t){e.seq.push(t),e.map[t.id]=t}function dR(e,t,n){let i=e.name,a=i.length;for(lp.lastIndex=0;;){let s=lp.exec(i),r=lp.lastIndex,o=s[1],l=s[2]==="]",c=s[3];if(l&&(o=o|0),c===void 0||c==="["&&r+2===a){fx(n,c===void 0?new Tp(o,e,t):new Ap(o,e,t));break}else{let d=n.map[o];d===void 0&&(d=new wp(o),fx(n,d)),n=d}}}var Hr=class{constructor(t,n){this.seq=[],this.map={};let i=t.getProgramParameter(n,t.ACTIVE_UNIFORMS);for(let a=0;a<i;++a){let s=t.getActiveUniform(n,a),r=t.getUniformLocation(n,s.name);dR(s,r,this)}}setValue(t,n,i,a){let s=this.map[n];s!==void 0&&s.setValue(t,i,a)}setOptional(t,n,i){let a=n[i];a!==void 0&&this.setValue(t,i,a)}static upload(t,n,i,a){for(let s=0,r=n.length;s!==r;++s){let o=n[s],l=i[o.id];l.needsUpdate!==!1&&o.setValue(t,l.value,a)}}static seqWithValue(t,n){let i=[];for(let a=0,s=t.length;a!==s;++a){let r=t[a];r.id in n&&i.push(r)}return i}};function dx(e,t,n){let i=e.createShader(t);return e.shaderSource(i,n),e.compileShader(i),i}var pR=37297,mR=0;function gR(e,t){let n=e.split(`
`),i=[],a=Math.max(t-6,0),s=Math.min(t+6,n.length);for(let r=a;r<s;r++){let o=r+1;i.push(`${o===t?">":" "} ${o}: ${n[r]}`)}return i.join(`
`)}function _R(e){let t=re.getPrimaries(re.workingColorSpace),n=re.getPrimaries(e),i;switch(t===n?i="":t===vu&&n===_u?i="LinearDisplayP3ToLinearSRGB":t===_u&&n===vu&&(i="LinearSRGBToLinearDisplayP3"),e){case $i:case Ou:return[i,"LinearTransferOETF"];case Qe:case Zp:return[i,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space:",e),[i,"LinearTransferOETF"]}}function px(e,t,n){let i=e.getShaderParameter(t,e.COMPILE_STATUS),a=e.getShaderInfoLog(t).trim();if(i&&a==="")return"";let s=/ERROR: 0:(\d+)/.exec(a);if(s){let r=parseInt(s[1]);return n.toUpperCase()+`

`+a+`

`+gR(e.getShaderSource(t),r)}else return a}function vR(e,t){let n=_R(t);return`vec4 ${e}( vec4 value ) { return ${n[0]}( ${n[1]}( value ) ); }`}function yR(e,t){let n;switch(t){case I1:n="Linear";break;case B1:n="Reinhard";break;case F1:n="OptimizedCineon";break;case H1:n="ACESFilmic";break;case V1:n="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),n="Linear"}return"vec3 "+e+"( vec3 color ) { return "+n+"ToneMapping( color ); }"}function xR(e){return[e.extensionDerivatives||e.envMapCubeUVHeight||e.bumpMap||e.normalMapTangentSpace||e.clearcoatNormalMap||e.flatShading||e.shaderID==="physical"?"#extension GL_OES_standard_derivatives : enable":"",(e.extensionFragDepth||e.logarithmicDepthBuffer)&&e.rendererExtensionFragDepth?"#extension GL_EXT_frag_depth : enable":"",e.extensionDrawBuffers&&e.rendererExtensionDrawBuffers?"#extension GL_EXT_draw_buffers : require":"",(e.extensionShaderTextureLOD||e.envMap||e.transmission)&&e.rendererExtensionShaderTextureLod?"#extension GL_EXT_shader_texture_lod : enable":""].filter(il).join(`
`)}function SR(e){let t=[];for(let n in e){let i=e[n];i!==!1&&t.push("#define "+n+" "+i)}return t.join(`
`)}function bR(e,t){let n={},i=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let a=0;a<i;a++){let s=e.getActiveAttrib(t,a),r=s.name,o=1;s.type===e.FLOAT_MAT2&&(o=2),s.type===e.FLOAT_MAT3&&(o=3),s.type===e.FLOAT_MAT4&&(o=4),n[r]={type:s.type,location:e.getAttribLocation(t,r),locationSize:o}}return n}function il(e){return e!==""}function mx(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function gx(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var MR=/^[ \t]*#include +<([\w\d./]+)>/gm;function Rp(e){return e.replace(MR,TR)}var ER=new Map([["encodings_fragment","colorspace_fragment"],["encodings_pars_fragment","colorspace_pars_fragment"],["output_fragment","opaque_fragment"]]);function TR(e,t){let n=Ft[t];if(n===void 0){let i=ER.get(t);if(i!==void 0)n=Ft[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,i);else throw new Error("Can not resolve #include <"+t+">")}return Rp(n)}var AR=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function _x(e){return e.replace(AR,wR)}function wR(e,t,n,i){let a="";for(let s=parseInt(t);s<parseInt(n);s++)a+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return a}function vx(e){let t="precision "+e.precision+` float;
precision `+e.precision+" int;";return e.precision==="highp"?t+=`
#define HIGH_PRECISION`:e.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:e.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function RR(e){let t="SHADOWMAP_TYPE_BASIC";return e.shadowMapType===bx?t="SHADOWMAP_TYPE_PCF":e.shadowMapType===h1?t="SHADOWMAP_TYPE_PCF_SOFT":e.shadowMapType===Zi&&(t="SHADOWMAP_TYPE_VSM"),t}function CR(e){let t="ENVMAP_TYPE_CUBE";if(e.envMap)switch(e.envMapMode){case Vr:case Gr:t="ENVMAP_TYPE_CUBE";break;case Nu:t="ENVMAP_TYPE_CUBE_UV";break}return t}function LR(e){let t="ENVMAP_MODE_REFLECTION";return e.envMap&&e.envMapMode===Gr&&(t="ENVMAP_MODE_REFRACTION"),t}function DR(e){let t="ENVMAP_BLENDING_NONE";if(e.envMap)switch(e.combine){case Mx:t="ENVMAP_BLENDING_MULTIPLY";break;case P1:t="ENVMAP_BLENDING_MIX";break;case z1:t="ENVMAP_BLENDING_ADD";break}return t}function UR(e){let t=e.envMapCubeUVHeight;if(t===null)return null;let n=Math.log2(t)-2,i=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,n),112)),texelHeight:i,maxMip:n}}function NR(e,t,n,i){let a=e.getContext(),s=n.defines,r=n.vertexShader,o=n.fragmentShader,l=RR(n),c=CR(n),h=LR(n),d=DR(n),f=UR(n),p=n.isWebGL2?"":xR(n),v=SR(s),y=a.createProgram(),m,u,_=n.glslVersion?"#version "+n.glslVersion+`
`:"";n.isRawShaderMaterial?(m=["#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,v].filter(il).join(`
`),m.length>0&&(m+=`
`),u=[p,"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,v].filter(il).join(`
`),u.length>0&&(u+=`
`)):(m=[vx(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,v,n.batching?"#define USE_BATCHING":"",n.instancing?"#define USE_INSTANCING":"",n.instancingColor?"#define USE_INSTANCING_COLOR":"",n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.map?"#define USE_MAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+h:"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.displacementMap?"#define USE_DISPLACEMENTMAP":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.mapUv?"#define MAP_UV "+n.mapUv:"",n.alphaMapUv?"#define ALPHAMAP_UV "+n.alphaMapUv:"",n.lightMapUv?"#define LIGHTMAP_UV "+n.lightMapUv:"",n.aoMapUv?"#define AOMAP_UV "+n.aoMapUv:"",n.emissiveMapUv?"#define EMISSIVEMAP_UV "+n.emissiveMapUv:"",n.bumpMapUv?"#define BUMPMAP_UV "+n.bumpMapUv:"",n.normalMapUv?"#define NORMALMAP_UV "+n.normalMapUv:"",n.displacementMapUv?"#define DISPLACEMENTMAP_UV "+n.displacementMapUv:"",n.metalnessMapUv?"#define METALNESSMAP_UV "+n.metalnessMapUv:"",n.roughnessMapUv?"#define ROUGHNESSMAP_UV "+n.roughnessMapUv:"",n.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+n.anisotropyMapUv:"",n.clearcoatMapUv?"#define CLEARCOATMAP_UV "+n.clearcoatMapUv:"",n.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+n.clearcoatNormalMapUv:"",n.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+n.clearcoatRoughnessMapUv:"",n.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+n.iridescenceMapUv:"",n.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+n.iridescenceThicknessMapUv:"",n.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+n.sheenColorMapUv:"",n.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+n.sheenRoughnessMapUv:"",n.specularMapUv?"#define SPECULARMAP_UV "+n.specularMapUv:"",n.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+n.specularColorMapUv:"",n.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+n.specularIntensityMapUv:"",n.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+n.transmissionMapUv:"",n.thicknessMapUv?"#define THICKNESSMAP_UV "+n.thicknessMapUv:"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.flatShading?"#define FLAT_SHADED":"",n.skinning?"#define USE_SKINNING":"",n.morphTargets?"#define USE_MORPHTARGETS":"",n.morphNormals&&n.flatShading===!1?"#define USE_MORPHNORMALS":"",n.morphColors&&n.isWebGL2?"#define USE_MORPHCOLORS":"",n.morphTargetsCount>0&&n.isWebGL2?"#define MORPHTARGETS_TEXTURE":"",n.morphTargetsCount>0&&n.isWebGL2?"#define MORPHTARGETS_TEXTURE_STRIDE "+n.morphTextureStride:"",n.morphTargetsCount>0&&n.isWebGL2?"#define MORPHTARGETS_COUNT "+n.morphTargetsCount:"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+l:"",n.sizeAttenuation?"#define USE_SIZEATTENUATION":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.useLegacyLights?"#define LEGACY_LIGHTS":"",n.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",n.logarithmicDepthBuffer&&n.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )","	attribute vec3 morphTarget0;","	attribute vec3 morphTarget1;","	attribute vec3 morphTarget2;","	attribute vec3 morphTarget3;","	#ifdef USE_MORPHNORMALS","		attribute vec3 morphNormal0;","		attribute vec3 morphNormal1;","		attribute vec3 morphNormal2;","		attribute vec3 morphNormal3;","	#else","		attribute vec3 morphTarget4;","		attribute vec3 morphTarget5;","		attribute vec3 morphTarget6;","		attribute vec3 morphTarget7;","	#endif","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(il).join(`
`),u=[p,vx(n),"#define SHADER_TYPE "+n.shaderType,"#define SHADER_NAME "+n.shaderName,v,n.useFog&&n.fog?"#define USE_FOG":"",n.useFog&&n.fogExp2?"#define FOG_EXP2":"",n.map?"#define USE_MAP":"",n.matcap?"#define USE_MATCAP":"",n.envMap?"#define USE_ENVMAP":"",n.envMap?"#define "+c:"",n.envMap?"#define "+h:"",n.envMap?"#define "+d:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",n.lightMap?"#define USE_LIGHTMAP":"",n.aoMap?"#define USE_AOMAP":"",n.bumpMap?"#define USE_BUMPMAP":"",n.normalMap?"#define USE_NORMALMAP":"",n.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",n.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",n.emissiveMap?"#define USE_EMISSIVEMAP":"",n.anisotropy?"#define USE_ANISOTROPY":"",n.anisotropyMap?"#define USE_ANISOTROPYMAP":"",n.clearcoat?"#define USE_CLEARCOAT":"",n.clearcoatMap?"#define USE_CLEARCOATMAP":"",n.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",n.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",n.iridescence?"#define USE_IRIDESCENCE":"",n.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",n.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",n.specularMap?"#define USE_SPECULARMAP":"",n.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",n.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",n.roughnessMap?"#define USE_ROUGHNESSMAP":"",n.metalnessMap?"#define USE_METALNESSMAP":"",n.alphaMap?"#define USE_ALPHAMAP":"",n.alphaTest?"#define USE_ALPHATEST":"",n.alphaHash?"#define USE_ALPHAHASH":"",n.sheen?"#define USE_SHEEN":"",n.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",n.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",n.transmission?"#define USE_TRANSMISSION":"",n.transmissionMap?"#define USE_TRANSMISSIONMAP":"",n.thicknessMap?"#define USE_THICKNESSMAP":"",n.vertexTangents&&n.flatShading===!1?"#define USE_TANGENT":"",n.vertexColors||n.instancingColor?"#define USE_COLOR":"",n.vertexAlphas?"#define USE_COLOR_ALPHA":"",n.vertexUv1s?"#define USE_UV1":"",n.vertexUv2s?"#define USE_UV2":"",n.vertexUv3s?"#define USE_UV3":"",n.pointsUvs?"#define USE_POINTS_UV":"",n.gradientMap?"#define USE_GRADIENTMAP":"",n.flatShading?"#define FLAT_SHADED":"",n.doubleSided?"#define DOUBLE_SIDED":"",n.flipSided?"#define FLIP_SIDED":"",n.shadowMapEnabled?"#define USE_SHADOWMAP":"",n.shadowMapEnabled?"#define "+l:"",n.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",n.numLightProbes>0?"#define USE_LIGHT_PROBES":"",n.useLegacyLights?"#define LEGACY_LIGHTS":"",n.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",n.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",n.logarithmicDepthBuffer&&n.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",n.toneMapping!==Ba?"#define TONE_MAPPING":"",n.toneMapping!==Ba?Ft.tonemapping_pars_fragment:"",n.toneMapping!==Ba?yR("toneMapping",n.toneMapping):"",n.dithering?"#define DITHERING":"",n.opaque?"#define OPAQUE":"",Ft.colorspace_pars_fragment,vR("linearToOutputTexel",n.outputColorSpace),n.useDepthPacking?"#define DEPTH_PACKING "+n.depthPacking:"",`
`].filter(il).join(`
`)),r=Rp(r),r=mx(r,n),r=gx(r,n),o=Rp(o),o=mx(o,n),o=gx(o,n),r=_x(r),o=_x(o),n.isWebGL2&&n.isRawShaderMaterial!==!0&&(_=`#version 300 es
`,m=["precision mediump sampler2DArray;","#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,u=["precision mediump sampler2DArray;","#define varying in",n.glslVersion===Iy?"":"layout(location = 0) out highp vec4 pc_fragColor;",n.glslVersion===Iy?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+u);let g=_+m+r,b=_+u+o,T=dx(a,a.VERTEX_SHADER,g),R=dx(a,a.FRAGMENT_SHADER,b);a.attachShader(y,T),a.attachShader(y,R),n.index0AttributeName!==void 0?a.bindAttribLocation(y,0,n.index0AttributeName):n.morphTargets===!0&&a.bindAttribLocation(y,0,"position"),a.linkProgram(y);function w(F){if(e.debug.checkShaderErrors){let Y=a.getProgramInfoLog(y).trim(),$=a.getShaderInfoLog(T).trim(),L=a.getShaderInfoLog(R).trim(),H=!0,q=!0;if(a.getProgramParameter(y,a.LINK_STATUS)===!1)if(H=!1,typeof e.debug.onShaderError=="function")e.debug.onShaderError(a,y,T,R);else{let k=px(a,T,"vertex"),Q=px(a,R,"fragment");console.error("THREE.WebGLProgram: Shader Error "+a.getError()+" - VALIDATE_STATUS "+a.getProgramParameter(y,a.VALIDATE_STATUS)+`

Program Info Log: `+Y+`
`+k+`
`+Q)}else Y!==""?console.warn("THREE.WebGLProgram: Program Info Log:",Y):($===""||L==="")&&(q=!1);q&&(F.diagnostics={runnable:H,programLog:Y,vertexShader:{log:$,prefix:m},fragmentShader:{log:L,prefix:u}})}a.deleteShader(T),a.deleteShader(R),U=new Hr(a,y),x=bR(a,y)}let U;this.getUniforms=function(){return U===void 0&&w(this),U};let x;this.getAttributes=function(){return x===void 0&&w(this),x};let A=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return A===!1&&(A=a.getProgramParameter(y,pR)),A},this.destroy=function(){i.releaseStatesOfProgram(this),a.deleteProgram(y),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=mR++,this.cacheKey=t,this.usedTimes=1,this.program=y,this.vertexShader=T,this.fragmentShader=R,this}var OR=0,Cp=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){let n=t.vertexShader,i=t.fragmentShader,a=this._getShaderStage(n),s=this._getShaderStage(i),r=this._getShaderCacheForMaterial(t);return r.has(a)===!1&&(r.add(a),a.usedTimes++),r.has(s)===!1&&(r.add(s),s.usedTimes++),this}remove(t){let n=this.materialCache.get(t);for(let i of n)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){let n=this.materialCache,i=n.get(t);return i===void 0&&(i=new Set,n.set(t,i)),i}_getShaderStage(t){let n=this.shaderCache,i=n.get(t);return i===void 0&&(i=new Lp(t),n.set(t,i)),i}},Lp=class{constructor(t){this.id=OR++,this.code=t,this.usedTimes=0}};function PR(e,t,n,i,a,s,r){let o=new Eu,l=new Cp,c=[],h=a.isWebGL2,d=a.logarithmicDepthBuffer,f=a.vertexTextures,p=a.precision,v={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function y(x){return x===0?"uv":`uv${x}`}function m(x,A,F,Y,$){let L=Y.fog,H=$.geometry,q=x.isMeshStandardMaterial?Y.environment:null,k=(x.isMeshStandardMaterial?n:t).get(x.envMap||q),Q=k&&k.mapping===Nu?k.image.height:null,X=v[x.type];x.precision!==null&&(p=a.getMaxPrecision(x.precision),p!==x.precision&&console.warn("THREE.WebGLProgram.getParameters:",x.precision,"not supported, using",p,"instead."));let j=H.morphAttributes.position||H.morphAttributes.normal||H.morphAttributes.color,tt=j!==void 0?j.length:0,dt=0;H.morphAttributes.position!==void 0&&(dt=1),H.morphAttributes.normal!==void 0&&(dt=2),H.morphAttributes.color!==void 0&&(dt=3);let V,Z,ct,gt;if(X){let sn=yi[X];V=sn.vertexShader,Z=sn.fragmentShader}else V=x.vertexShader,Z=x.fragmentShader,l.update(x),ct=l.getVertexShaderID(x),gt=l.getFragmentShaderID(x);let _t=e.getRenderTarget(),Ut=$.isInstancedMesh===!0,Lt=$.isBatchedMesh===!0,At=!!x.map,Nt=!!x.matcap,N=!!k,Fe=!!x.aoMap,xt=!!x.lightMap,Ht=!!x.bumpMap,bt=!!x.normalMap,_e=!!x.displacementMap,rt=!!x.emissiveMap,pt=!!x.metalnessMap,Ot=!!x.roughnessMap,he=x.anisotropy>0,Ce=x.clearcoat>0,E=x.iridescence>0,S=x.sheen>0,O=x.transmission>0,it=he&&!!x.anisotropyMap,K=Ce&&!!x.clearcoatMap,at=Ce&&!!x.clearcoatNormalMap,vt=Ce&&!!x.clearcoatRoughnessMap,ot=E&&!!x.iridescenceMap,ut=E&&!!x.iridescenceThicknessMap,wt=S&&!!x.sheenColorMap,Qt=S&&!!x.sheenRoughnessMap,nt=!!x.specularMap,ie=!!x.specularColorMap,Pt=!!x.specularIntensityMap,Rt=O&&!!x.transmissionMap,St=O&&!!x.thicknessMap,mt=!!x.gradientMap,qt=!!x.alphaMap,C=x.alphaTest>0,ht=!!x.alphaHash,et=!!x.extensions,G=!!H.attributes.uv1,st=!!H.attributes.uv2,Tt=!!H.attributes.uv3,jt=Ba;return x.toneMapped&&(_t===null||_t.isXRRenderTarget===!0)&&(jt=e.toneMapping),{isWebGL2:h,shaderID:X,shaderType:x.type,shaderName:x.name,vertexShader:V,fragmentShader:Z,defines:x.defines,customVertexShaderID:ct,customFragmentShaderID:gt,isRawShaderMaterial:x.isRawShaderMaterial===!0,glslVersion:x.glslVersion,precision:p,batching:Lt,instancing:Ut,instancingColor:Ut&&$.instanceColor!==null,supportsVertexTextures:f,outputColorSpace:_t===null?e.outputColorSpace:_t.isXRRenderTarget===!0?_t.texture.colorSpace:$i,map:At,matcap:Nt,envMap:N,envMapMode:N&&k.mapping,envMapCubeUVHeight:Q,aoMap:Fe,lightMap:xt,bumpMap:Ht,normalMap:bt,displacementMap:f&&_e,emissiveMap:rt,normalMapObjectSpace:bt&&x.normalMapType===tE,normalMapTangentSpace:bt&&x.normalMapType===$1,metalnessMap:pt,roughnessMap:Ot,anisotropy:he,anisotropyMap:it,clearcoat:Ce,clearcoatMap:K,clearcoatNormalMap:at,clearcoatRoughnessMap:vt,iridescence:E,iridescenceMap:ot,iridescenceThicknessMap:ut,sheen:S,sheenColorMap:wt,sheenRoughnessMap:Qt,specularMap:nt,specularColorMap:ie,specularIntensityMap:Pt,transmission:O,transmissionMap:Rt,thicknessMap:St,gradientMap:mt,opaque:x.transparent===!1&&x.blending===Br,alphaMap:qt,alphaTest:C,alphaHash:ht,combine:x.combine,mapUv:At&&y(x.map.channel),aoMapUv:Fe&&y(x.aoMap.channel),lightMapUv:xt&&y(x.lightMap.channel),bumpMapUv:Ht&&y(x.bumpMap.channel),normalMapUv:bt&&y(x.normalMap.channel),displacementMapUv:_e&&y(x.displacementMap.channel),emissiveMapUv:rt&&y(x.emissiveMap.channel),metalnessMapUv:pt&&y(x.metalnessMap.channel),roughnessMapUv:Ot&&y(x.roughnessMap.channel),anisotropyMapUv:it&&y(x.anisotropyMap.channel),clearcoatMapUv:K&&y(x.clearcoatMap.channel),clearcoatNormalMapUv:at&&y(x.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:vt&&y(x.clearcoatRoughnessMap.channel),iridescenceMapUv:ot&&y(x.iridescenceMap.channel),iridescenceThicknessMapUv:ut&&y(x.iridescenceThicknessMap.channel),sheenColorMapUv:wt&&y(x.sheenColorMap.channel),sheenRoughnessMapUv:Qt&&y(x.sheenRoughnessMap.channel),specularMapUv:nt&&y(x.specularMap.channel),specularColorMapUv:ie&&y(x.specularColorMap.channel),specularIntensityMapUv:Pt&&y(x.specularIntensityMap.channel),transmissionMapUv:Rt&&y(x.transmissionMap.channel),thicknessMapUv:St&&y(x.thicknessMap.channel),alphaMapUv:qt&&y(x.alphaMap.channel),vertexTangents:!!H.attributes.tangent&&(bt||he),vertexColors:x.vertexColors,vertexAlphas:x.vertexColors===!0&&!!H.attributes.color&&H.attributes.color.itemSize===4,vertexUv1s:G,vertexUv2s:st,vertexUv3s:Tt,pointsUvs:$.isPoints===!0&&!!H.attributes.uv&&(At||qt),fog:!!L,useFog:x.fog===!0,fogExp2:L&&L.isFogExp2,flatShading:x.flatShading===!0,sizeAttenuation:x.sizeAttenuation===!0,logarithmicDepthBuffer:d,skinning:$.isSkinnedMesh===!0,morphTargets:H.morphAttributes.position!==void 0,morphNormals:H.morphAttributes.normal!==void 0,morphColors:H.morphAttributes.color!==void 0,morphTargetsCount:tt,morphTextureStride:dt,numDirLights:A.directional.length,numPointLights:A.point.length,numSpotLights:A.spot.length,numSpotLightMaps:A.spotLightMap.length,numRectAreaLights:A.rectArea.length,numHemiLights:A.hemi.length,numDirLightShadows:A.directionalShadowMap.length,numPointLightShadows:A.pointShadowMap.length,numSpotLightShadows:A.spotShadowMap.length,numSpotLightShadowsWithMaps:A.numSpotLightShadowsWithMaps,numLightProbes:A.numLightProbes,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:x.dithering,shadowMapEnabled:e.shadowMap.enabled&&F.length>0,shadowMapType:e.shadowMap.type,toneMapping:jt,useLegacyLights:e._useLegacyLights,decodeVideoTexture:At&&x.map.isVideoTexture===!0&&re.getTransfer(x.map.colorSpace)===ge,premultipliedAlpha:x.premultipliedAlpha,doubleSided:x.side===Ji,flipSided:x.side===Sn,useDepthPacking:x.depthPacking>=0,depthPacking:x.depthPacking||0,index0AttributeName:x.index0AttributeName,extensionDerivatives:et&&x.extensions.derivatives===!0,extensionFragDepth:et&&x.extensions.fragDepth===!0,extensionDrawBuffers:et&&x.extensions.drawBuffers===!0,extensionShaderTextureLOD:et&&x.extensions.shaderTextureLOD===!0,rendererExtensionFragDepth:h||i.has("EXT_frag_depth"),rendererExtensionDrawBuffers:h||i.has("WEBGL_draw_buffers"),rendererExtensionShaderTextureLod:h||i.has("EXT_shader_texture_lod"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:x.customProgramCacheKey()}}function u(x){let A=[];if(x.shaderID?A.push(x.shaderID):(A.push(x.customVertexShaderID),A.push(x.customFragmentShaderID)),x.defines!==void 0)for(let F in x.defines)A.push(F),A.push(x.defines[F]);return x.isRawShaderMaterial===!1&&(_(A,x),g(A,x),A.push(e.outputColorSpace)),A.push(x.customProgramCacheKey),A.join()}function _(x,A){x.push(A.precision),x.push(A.outputColorSpace),x.push(A.envMapMode),x.push(A.envMapCubeUVHeight),x.push(A.mapUv),x.push(A.alphaMapUv),x.push(A.lightMapUv),x.push(A.aoMapUv),x.push(A.bumpMapUv),x.push(A.normalMapUv),x.push(A.displacementMapUv),x.push(A.emissiveMapUv),x.push(A.metalnessMapUv),x.push(A.roughnessMapUv),x.push(A.anisotropyMapUv),x.push(A.clearcoatMapUv),x.push(A.clearcoatNormalMapUv),x.push(A.clearcoatRoughnessMapUv),x.push(A.iridescenceMapUv),x.push(A.iridescenceThicknessMapUv),x.push(A.sheenColorMapUv),x.push(A.sheenRoughnessMapUv),x.push(A.specularMapUv),x.push(A.specularColorMapUv),x.push(A.specularIntensityMapUv),x.push(A.transmissionMapUv),x.push(A.thicknessMapUv),x.push(A.combine),x.push(A.fogExp2),x.push(A.sizeAttenuation),x.push(A.morphTargetsCount),x.push(A.morphAttributeCount),x.push(A.numDirLights),x.push(A.numPointLights),x.push(A.numSpotLights),x.push(A.numSpotLightMaps),x.push(A.numHemiLights),x.push(A.numRectAreaLights),x.push(A.numDirLightShadows),x.push(A.numPointLightShadows),x.push(A.numSpotLightShadows),x.push(A.numSpotLightShadowsWithMaps),x.push(A.numLightProbes),x.push(A.shadowMapType),x.push(A.toneMapping),x.push(A.numClippingPlanes),x.push(A.numClipIntersection),x.push(A.depthPacking)}function g(x,A){o.disableAll(),A.isWebGL2&&o.enable(0),A.supportsVertexTextures&&o.enable(1),A.instancing&&o.enable(2),A.instancingColor&&o.enable(3),A.matcap&&o.enable(4),A.envMap&&o.enable(5),A.normalMapObjectSpace&&o.enable(6),A.normalMapTangentSpace&&o.enable(7),A.clearcoat&&o.enable(8),A.iridescence&&o.enable(9),A.alphaTest&&o.enable(10),A.vertexColors&&o.enable(11),A.vertexAlphas&&o.enable(12),A.vertexUv1s&&o.enable(13),A.vertexUv2s&&o.enable(14),A.vertexUv3s&&o.enable(15),A.vertexTangents&&o.enable(16),A.anisotropy&&o.enable(17),A.alphaHash&&o.enable(18),A.batching&&o.enable(19),x.push(o.mask),o.disableAll(),A.fog&&o.enable(0),A.useFog&&o.enable(1),A.flatShading&&o.enable(2),A.logarithmicDepthBuffer&&o.enable(3),A.skinning&&o.enable(4),A.morphTargets&&o.enable(5),A.morphNormals&&o.enable(6),A.morphColors&&o.enable(7),A.premultipliedAlpha&&o.enable(8),A.shadowMapEnabled&&o.enable(9),A.useLegacyLights&&o.enable(10),A.doubleSided&&o.enable(11),A.flipSided&&o.enable(12),A.useDepthPacking&&o.enable(13),A.dithering&&o.enable(14),A.transmission&&o.enable(15),A.sheen&&o.enable(16),A.opaque&&o.enable(17),A.pointsUvs&&o.enable(18),A.decodeVideoTexture&&o.enable(19),x.push(o.mask)}function b(x){let A=v[x.type],F;if(A){let Y=yi[A];F=TE.clone(Y.uniforms)}else F=x.uniforms;return F}function T(x,A){let F;for(let Y=0,$=c.length;Y<$;Y++){let L=c[Y];if(L.cacheKey===A){F=L,++F.usedTimes;break}}return F===void 0&&(F=new NR(e,A,x,s),c.push(F)),F}function R(x){if(--x.usedTimes===0){let A=c.indexOf(x);c[A]=c[c.length-1],c.pop(),x.destroy()}}function w(x){l.remove(x)}function U(){l.dispose()}return{getParameters:m,getProgramCacheKey:u,getUniforms:b,acquireProgram:T,releaseProgram:R,releaseShaderCache:w,programs:c,dispose:U}}function zR(){let e=new WeakMap;function t(s){let r=e.get(s);return r===void 0&&(r={},e.set(s,r)),r}function n(s){e.delete(s)}function i(s,r,o){e.get(s)[r]=o}function a(){e=new WeakMap}return{get:t,remove:n,update:i,dispose:a}}function IR(e,t){return e.groupOrder!==t.groupOrder?e.groupOrder-t.groupOrder:e.renderOrder!==t.renderOrder?e.renderOrder-t.renderOrder:e.material.id!==t.material.id?e.material.id-t.material.id:e.z!==t.z?e.z-t.z:e.id-t.id}function yx(e,t){return e.groupOrder!==t.groupOrder?e.groupOrder-t.groupOrder:e.renderOrder!==t.renderOrder?e.renderOrder-t.renderOrder:e.z!==t.z?t.z-e.z:e.id-t.id}function xx(){let e=[],t=0,n=[],i=[],a=[];function s(){t=0,n.length=0,i.length=0,a.length=0}function r(d,f,p,v,y,m){let u=e[t];return u===void 0?(u={id:d.id,object:d,geometry:f,material:p,groupOrder:v,renderOrder:d.renderOrder,z:y,group:m},e[t]=u):(u.id=d.id,u.object=d,u.geometry=f,u.material=p,u.groupOrder=v,u.renderOrder=d.renderOrder,u.z=y,u.group=m),t++,u}function o(d,f,p,v,y,m){let u=r(d,f,p,v,y,m);p.transmission>0?i.push(u):p.transparent===!0?a.push(u):n.push(u)}function l(d,f,p,v,y,m){let u=r(d,f,p,v,y,m);p.transmission>0?i.unshift(u):p.transparent===!0?a.unshift(u):n.unshift(u)}function c(d,f){n.length>1&&n.sort(d||IR),i.length>1&&i.sort(f||yx),a.length>1&&a.sort(f||yx)}function h(){for(let d=t,f=e.length;d<f;d++){let p=e[d];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:n,transmissive:i,transparent:a,init:s,push:o,unshift:l,finish:h,sort:c}}function BR(){let e=new WeakMap;function t(i,a){let s=e.get(i),r;return s===void 0?(r=new xx,e.set(i,[r])):a>=s.length?(r=new xx,s.push(r)):r=s[a],r}function n(){e=new WeakMap}return{get:t,dispose:n}}function FR(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case"DirectionalLight":n={direction:new I,color:new te};break;case"SpotLight":n={position:new I,direction:new I,color:new te,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":n={position:new I,color:new te,distance:0,decay:0};break;case"HemisphereLight":n={direction:new I,skyColor:new te,groundColor:new te};break;case"RectAreaLight":n={color:new te,position:new I,halfWidth:new I,halfHeight:new I};break}return e[t.id]=n,n}}}function HR(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case"DirectionalLight":n={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new oe};break;case"SpotLight":n={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new oe};break;case"PointLight":n={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new oe,shadowCameraNear:1,shadowCameraFar:1e3};break}return e[t.id]=n,n}}}var VR=0;function GR(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+(t.map?1:0)-(e.map?1:0)}function kR(e,t){let n=new FR,i=HR(),a={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let h=0;h<9;h++)a.probe.push(new I);let s=new I,r=new an,o=new an;function l(h,d){let f=0,p=0,v=0;for(let Y=0;Y<9;Y++)a.probe[Y].set(0,0,0);let y=0,m=0,u=0,_=0,g=0,b=0,T=0,R=0,w=0,U=0,x=0;h.sort(GR);let A=d===!0?Math.PI:1;for(let Y=0,$=h.length;Y<$;Y++){let L=h[Y],H=L.color,q=L.intensity,k=L.distance,Q=L.shadow&&L.shadow.map?L.shadow.map.texture:null;if(L.isAmbientLight)f+=H.r*q*A,p+=H.g*q*A,v+=H.b*q*A;else if(L.isLightProbe){for(let X=0;X<9;X++)a.probe[X].addScaledVector(L.sh.coefficients[X],q);x++}else if(L.isDirectionalLight){let X=n.get(L);if(X.color.copy(L.color).multiplyScalar(L.intensity*A),L.castShadow){let j=L.shadow,tt=i.get(L);tt.shadowBias=j.bias,tt.shadowNormalBias=j.normalBias,tt.shadowRadius=j.radius,tt.shadowMapSize=j.mapSize,a.directionalShadow[y]=tt,a.directionalShadowMap[y]=Q,a.directionalShadowMatrix[y]=L.shadow.matrix,b++}a.directional[y]=X,y++}else if(L.isSpotLight){let X=n.get(L);X.position.setFromMatrixPosition(L.matrixWorld),X.color.copy(H).multiplyScalar(q*A),X.distance=k,X.coneCos=Math.cos(L.angle),X.penumbraCos=Math.cos(L.angle*(1-L.penumbra)),X.decay=L.decay,a.spot[u]=X;let j=L.shadow;if(L.map&&(a.spotLightMap[w]=L.map,w++,j.updateMatrices(L),L.castShadow&&U++),a.spotLightMatrix[u]=j.matrix,L.castShadow){let tt=i.get(L);tt.shadowBias=j.bias,tt.shadowNormalBias=j.normalBias,tt.shadowRadius=j.radius,tt.shadowMapSize=j.mapSize,a.spotShadow[u]=tt,a.spotShadowMap[u]=Q,R++}u++}else if(L.isRectAreaLight){let X=n.get(L);X.color.copy(H).multiplyScalar(q),X.halfWidth.set(L.width*.5,0,0),X.halfHeight.set(0,L.height*.5,0),a.rectArea[_]=X,_++}else if(L.isPointLight){let X=n.get(L);if(X.color.copy(L.color).multiplyScalar(L.intensity*A),X.distance=L.distance,X.decay=L.decay,L.castShadow){let j=L.shadow,tt=i.get(L);tt.shadowBias=j.bias,tt.shadowNormalBias=j.normalBias,tt.shadowRadius=j.radius,tt.shadowMapSize=j.mapSize,tt.shadowCameraNear=j.camera.near,tt.shadowCameraFar=j.camera.far,a.pointShadow[m]=tt,a.pointShadowMap[m]=Q,a.pointShadowMatrix[m]=L.shadow.matrix,T++}a.point[m]=X,m++}else if(L.isHemisphereLight){let X=n.get(L);X.skyColor.copy(L.color).multiplyScalar(q*A),X.groundColor.copy(L.groundColor).multiplyScalar(q*A),a.hemi[g]=X,g++}}_>0&&(t.isWebGL2||e.has("OES_texture_float_linear")===!0?(a.rectAreaLTC1=lt.LTC_FLOAT_1,a.rectAreaLTC2=lt.LTC_FLOAT_2):e.has("OES_texture_half_float_linear")===!0?(a.rectAreaLTC1=lt.LTC_HALF_1,a.rectAreaLTC2=lt.LTC_HALF_2):console.error("THREE.WebGLRenderer: Unable to use RectAreaLight. Missing WebGL extensions.")),a.ambient[0]=f,a.ambient[1]=p,a.ambient[2]=v;let F=a.hash;(F.directionalLength!==y||F.pointLength!==m||F.spotLength!==u||F.rectAreaLength!==_||F.hemiLength!==g||F.numDirectionalShadows!==b||F.numPointShadows!==T||F.numSpotShadows!==R||F.numSpotMaps!==w||F.numLightProbes!==x)&&(a.directional.length=y,a.spot.length=u,a.rectArea.length=_,a.point.length=m,a.hemi.length=g,a.directionalShadow.length=b,a.directionalShadowMap.length=b,a.pointShadow.length=T,a.pointShadowMap.length=T,a.spotShadow.length=R,a.spotShadowMap.length=R,a.directionalShadowMatrix.length=b,a.pointShadowMatrix.length=T,a.spotLightMatrix.length=R+w-U,a.spotLightMap.length=w,a.numSpotLightShadowsWithMaps=U,a.numLightProbes=x,F.directionalLength=y,F.pointLength=m,F.spotLength=u,F.rectAreaLength=_,F.hemiLength=g,F.numDirectionalShadows=b,F.numPointShadows=T,F.numSpotShadows=R,F.numSpotMaps=w,F.numLightProbes=x,a.version=VR++)}function c(h,d){let f=0,p=0,v=0,y=0,m=0,u=d.matrixWorldInverse;for(let _=0,g=h.length;_<g;_++){let b=h[_];if(b.isDirectionalLight){let T=a.directional[f];T.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),T.direction.sub(s),T.direction.transformDirection(u),f++}else if(b.isSpotLight){let T=a.spot[v];T.position.setFromMatrixPosition(b.matrixWorld),T.position.applyMatrix4(u),T.direction.setFromMatrixPosition(b.matrixWorld),s.setFromMatrixPosition(b.target.matrixWorld),T.direction.sub(s),T.direction.transformDirection(u),v++}else if(b.isRectAreaLight){let T=a.rectArea[y];T.position.setFromMatrixPosition(b.matrixWorld),T.position.applyMatrix4(u),o.identity(),r.copy(b.matrixWorld),r.premultiply(u),o.extractRotation(r),T.halfWidth.set(b.width*.5,0,0),T.halfHeight.set(0,b.height*.5,0),T.halfWidth.applyMatrix4(o),T.halfHeight.applyMatrix4(o),y++}else if(b.isPointLight){let T=a.point[p];T.position.setFromMatrixPosition(b.matrixWorld),T.position.applyMatrix4(u),p++}else if(b.isHemisphereLight){let T=a.hemi[m];T.direction.setFromMatrixPosition(b.matrixWorld),T.direction.transformDirection(u),m++}}}return{setup:l,setupView:c,state:a}}function Sx(e,t){let n=new kR(e,t),i=[],a=[];function s(){i.length=0,a.length=0}function r(d){i.push(d)}function o(d){a.push(d)}function l(d){n.setup(i,d)}function c(d){n.setupView(i,d)}return{init:s,state:{lightsArray:i,shadowsArray:a,lights:n},setupLights:l,setupLightsView:c,pushLight:r,pushShadow:o}}function WR(e,t){let n=new WeakMap;function i(s,r=0){let o=n.get(s),l;return o===void 0?(l=new Sx(e,t),n.set(s,[l])):r>=o.length?(l=new Sx(e,t),o.push(l)):l=o[r],l}function a(){n=new WeakMap}return{get:i,dispose:a}}var Dp=class extends Xr{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Q1,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}},Up=class extends Xr{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}},XR=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,qR=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function YR(e,t,n){let i=new Lu,a=new oe,s=new oe,r=new Ke,o=new Dp({depthPacking:K1}),l=new Up,c={},h=n.maxTextureSize,d={[Ha]:Sn,[Sn]:Ha,[Ji]:Ji},f=new ea({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new oe},radius:{value:4}},vertexShader:XR,fragmentShader:qR}),p=f.clone();p.defines.HORIZONTAL_PASS=1;let v=new Ss;v.setAttribute("position",new Kn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let y=new xi(v,f),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=bx;let u=this.type;this.render=function(T,R,w){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||T.length===0)return;let U=e.getRenderTarget(),x=e.getActiveCubeFace(),A=e.getActiveMipmapLevel(),F=e.state;F.setBlending(Ia),F.buffers.color.setClear(1,1,1,1),F.buffers.depth.setTest(!0),F.setScissorTest(!1);let Y=u!==Zi&&this.type===Zi,$=u===Zi&&this.type!==Zi;for(let L=0,H=T.length;L<H;L++){let q=T[L],k=q.shadow;if(k===void 0){console.warn("THREE.WebGLShadowMap:",q,"has no shadow.");continue}if(k.autoUpdate===!1&&k.needsUpdate===!1)continue;a.copy(k.mapSize);let Q=k.getFrameExtents();if(a.multiply(Q),s.copy(k.mapSize),(a.x>h||a.y>h)&&(a.x>h&&(s.x=Math.floor(h/Q.x),a.x=s.x*Q.x,k.mapSize.x=s.x),a.y>h&&(s.y=Math.floor(h/Q.y),a.y=s.y*Q.y,k.mapSize.y=s.y)),k.map===null||Y===!0||$===!0){let j=this.type!==Zi?{minFilter:hn,magFilter:hn}:{};k.map!==null&&k.map.dispose(),k.map=new ta(a.x,a.y,j),k.map.texture.name=q.name+".shadowMap",k.camera.updateProjectionMatrix()}e.setRenderTarget(k.map),e.clear();let X=k.getViewportCount();for(let j=0;j<X;j++){let tt=k.getViewport(j);r.set(s.x*tt.x,s.y*tt.y,s.x*tt.z,s.y*tt.w),F.viewport(r),k.updateMatrices(q,j),i=k.getFrustum(),b(R,w,k.camera,q,this.type)}k.isPointLightShadow!==!0&&this.type===Zi&&_(k,w),k.needsUpdate=!1}u=this.type,m.needsUpdate=!1,e.setRenderTarget(U,x,A)};function _(T,R){let w=t.update(y);f.defines.VSM_SAMPLES!==T.blurSamples&&(f.defines.VSM_SAMPLES=T.blurSamples,p.defines.VSM_SAMPLES=T.blurSamples,f.needsUpdate=!0,p.needsUpdate=!0),T.mapPass===null&&(T.mapPass=new ta(a.x,a.y)),f.uniforms.shadow_pass.value=T.map.texture,f.uniforms.resolution.value=T.mapSize,f.uniforms.radius.value=T.radius,e.setRenderTarget(T.mapPass),e.clear(),e.renderBufferDirect(R,null,w,f,y,null),p.uniforms.shadow_pass.value=T.mapPass.texture,p.uniforms.resolution.value=T.mapSize,p.uniforms.radius.value=T.radius,e.setRenderTarget(T.map),e.clear(),e.renderBufferDirect(R,null,w,p,y,null)}function g(T,R,w,U){let x=null,A=w.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(A!==void 0)x=A;else if(x=w.isPointLight===!0?l:o,e.localClippingEnabled&&R.clipShadows===!0&&Array.isArray(R.clippingPlanes)&&R.clippingPlanes.length!==0||R.displacementMap&&R.displacementScale!==0||R.alphaMap&&R.alphaTest>0||R.map&&R.alphaTest>0){let F=x.uuid,Y=R.uuid,$=c[F];$===void 0&&($={},c[F]=$);let L=$[Y];L===void 0&&(L=x.clone(),$[Y]=L),x=L}if(x.visible=R.visible,x.wireframe=R.wireframe,U===Zi?x.side=R.shadowSide!==null?R.shadowSide:R.side:x.side=R.shadowSide!==null?R.shadowSide:d[R.side],x.alphaMap=R.alphaMap,x.alphaTest=R.alphaTest,x.map=R.map,x.clipShadows=R.clipShadows,x.clippingPlanes=R.clippingPlanes,x.clipIntersection=R.clipIntersection,x.displacementMap=R.displacementMap,x.displacementScale=R.displacementScale,x.displacementBias=R.displacementBias,x.wireframeLinewidth=R.wireframeLinewidth,x.linewidth=R.linewidth,w.isPointLight===!0&&x.isMeshDistanceMaterial===!0){let F=e.properties.get(x);F.light=w}return x}function b(T,R,w,U,x){if(T.visible===!1)return;if(T.layers.test(R.layers)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&x===Zi)&&(!T.frustumCulled||i.intersectsObject(T))){T.modelViewMatrix.multiplyMatrices(w.matrixWorldInverse,T.matrixWorld);let Y=t.update(T),$=T.material;if(Array.isArray($)){let L=Y.groups;for(let H=0,q=L.length;H<q;H++){let k=L[H],Q=$[k.materialIndex];if(Q&&Q.visible){let X=g(T,Q,U,x);T.onBeforeShadow(e,T,R,w,Y,X,k),e.renderBufferDirect(w,null,Y,X,T,k),T.onAfterShadow(e,T,R,w,Y,X,k)}}}else if($.visible){let L=g(T,$,U,x);T.onBeforeShadow(e,T,R,w,Y,L,null),e.renderBufferDirect(w,null,Y,L,T,null),T.onAfterShadow(e,T,R,w,Y,L,null)}}let F=T.children;for(let Y=0,$=F.length;Y<$;Y++)b(F[Y],R,w,U,x)}}function ZR(e,t,n){let i=n.isWebGL2;function a(){let C=!1,ht=new Ke,et=null,G=new Ke(0,0,0,0);return{setMask:function(st){et!==st&&!C&&(e.colorMask(st,st,st,st),et=st)},setLocked:function(st){C=st},setClear:function(st,Tt,jt,He,sn){sn===!0&&(st*=He,Tt*=He,jt*=He),ht.set(st,Tt,jt,He),G.equals(ht)===!1&&(e.clearColor(st,Tt,jt,He),G.copy(ht))},reset:function(){C=!1,et=null,G.set(-1,0,0,0)}}}function s(){let C=!1,ht=null,et=null,G=null;return{setTest:function(st){st?Lt(e.DEPTH_TEST):At(e.DEPTH_TEST)},setMask:function(st){ht!==st&&!C&&(e.depthMask(st),ht=st)},setFunc:function(st){if(et!==st){switch(st){case R1:e.depthFunc(e.NEVER);break;case C1:e.depthFunc(e.ALWAYS);break;case L1:e.depthFunc(e.LESS);break;case du:e.depthFunc(e.LEQUAL);break;case D1:e.depthFunc(e.EQUAL);break;case U1:e.depthFunc(e.GEQUAL);break;case N1:e.depthFunc(e.GREATER);break;case O1:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}et=st}},setLocked:function(st){C=st},setClear:function(st){G!==st&&(e.clearDepth(st),G=st)},reset:function(){C=!1,ht=null,et=null,G=null}}}function r(){let C=!1,ht=null,et=null,G=null,st=null,Tt=null,jt=null,He=null,sn=null;return{setTest:function(ce){C||(ce?Lt(e.STENCIL_TEST):At(e.STENCIL_TEST))},setMask:function(ce){ht!==ce&&!C&&(e.stencilMask(ce),ht=ce)},setFunc:function(ce,rn,ci){(et!==ce||G!==rn||st!==ci)&&(e.stencilFunc(ce,rn,ci),et=ce,G=rn,st=ci)},setOp:function(ce,rn,ci){(Tt!==ce||jt!==rn||He!==ci)&&(e.stencilOp(ce,rn,ci),Tt=ce,jt=rn,He=ci)},setLocked:function(ce){C=ce},setClear:function(ce){sn!==ce&&(e.clearStencil(ce),sn=ce)},reset:function(){C=!1,ht=null,et=null,G=null,st=null,Tt=null,jt=null,He=null,sn=null}}}let o=new a,l=new s,c=new r,h=new WeakMap,d=new WeakMap,f={},p={},v=new WeakMap,y=[],m=null,u=!1,_=null,g=null,b=null,T=null,R=null,w=null,U=null,x=new te(0,0,0),A=0,F=!1,Y=null,$=null,L=null,H=null,q=null,k=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),Q=!1,X=0,j=e.getParameter(e.VERSION);j.indexOf("WebGL")!==-1?(X=parseFloat(/^WebGL (\d)/.exec(j)[1]),Q=X>=1):j.indexOf("OpenGL ES")!==-1&&(X=parseFloat(/^OpenGL ES (\d)/.exec(j)[1]),Q=X>=2);let tt=null,dt={},V=e.getParameter(e.SCISSOR_BOX),Z=e.getParameter(e.VIEWPORT),ct=new Ke().fromArray(V),gt=new Ke().fromArray(Z);function _t(C,ht,et,G){let st=new Uint8Array(4),Tt=e.createTexture();e.bindTexture(C,Tt),e.texParameteri(C,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(C,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let jt=0;jt<et;jt++)i&&(C===e.TEXTURE_3D||C===e.TEXTURE_2D_ARRAY)?e.texImage3D(ht,0,e.RGBA,1,1,G,0,e.RGBA,e.UNSIGNED_BYTE,st):e.texImage2D(ht+jt,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,st);return Tt}let Ut={};Ut[e.TEXTURE_2D]=_t(e.TEXTURE_2D,e.TEXTURE_2D,1),Ut[e.TEXTURE_CUBE_MAP]=_t(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),i&&(Ut[e.TEXTURE_2D_ARRAY]=_t(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),Ut[e.TEXTURE_3D]=_t(e.TEXTURE_3D,e.TEXTURE_3D,1,1)),o.setClear(0,0,0,1),l.setClear(1),c.setClear(0),Lt(e.DEPTH_TEST),l.setFunc(du),rt(!1),pt(ty),Lt(e.CULL_FACE),bt(Ia);function Lt(C){f[C]!==!0&&(e.enable(C),f[C]=!0)}function At(C){f[C]!==!1&&(e.disable(C),f[C]=!1)}function Nt(C,ht){return p[C]!==ht?(e.bindFramebuffer(C,ht),p[C]=ht,i&&(C===e.DRAW_FRAMEBUFFER&&(p[e.FRAMEBUFFER]=ht),C===e.FRAMEBUFFER&&(p[e.DRAW_FRAMEBUFFER]=ht)),!0):!1}function N(C,ht){let et=y,G=!1;if(C)if(et=v.get(ht),et===void 0&&(et=[],v.set(ht,et)),C.isWebGLMultipleRenderTargets){let st=C.texture;if(et.length!==st.length||et[0]!==e.COLOR_ATTACHMENT0){for(let Tt=0,jt=st.length;Tt<jt;Tt++)et[Tt]=e.COLOR_ATTACHMENT0+Tt;et.length=st.length,G=!0}}else et[0]!==e.COLOR_ATTACHMENT0&&(et[0]=e.COLOR_ATTACHMENT0,G=!0);else et[0]!==e.BACK&&(et[0]=e.BACK,G=!0);G&&(n.isWebGL2?e.drawBuffers(et):t.get("WEBGL_draw_buffers").drawBuffersWEBGL(et))}function Fe(C){return m!==C?(e.useProgram(C),m=C,!0):!1}let xt={[ms]:e.FUNC_ADD,[d1]:e.FUNC_SUBTRACT,[p1]:e.FUNC_REVERSE_SUBTRACT};if(i)xt[ay]=e.MIN,xt[sy]=e.MAX;else{let C=t.get("EXT_blend_minmax");C!==null&&(xt[ay]=C.MIN_EXT,xt[sy]=C.MAX_EXT)}let Ht={[m1]:e.ZERO,[g1]:e.ONE,[_1]:e.SRC_COLOR,[cp]:e.SRC_ALPHA,[M1]:e.SRC_ALPHA_SATURATE,[S1]:e.DST_COLOR,[y1]:e.DST_ALPHA,[v1]:e.ONE_MINUS_SRC_COLOR,[up]:e.ONE_MINUS_SRC_ALPHA,[b1]:e.ONE_MINUS_DST_COLOR,[x1]:e.ONE_MINUS_DST_ALPHA,[E1]:e.CONSTANT_COLOR,[T1]:e.ONE_MINUS_CONSTANT_COLOR,[A1]:e.CONSTANT_ALPHA,[w1]:e.ONE_MINUS_CONSTANT_ALPHA};function bt(C,ht,et,G,st,Tt,jt,He,sn,ce){if(C===Ia){u===!0&&(At(e.BLEND),u=!1);return}if(u===!1&&(Lt(e.BLEND),u=!0),C!==f1){if(C!==_||ce!==F){if((g!==ms||R!==ms)&&(e.blendEquation(e.FUNC_ADD),g=ms,R=ms),ce)switch(C){case Br:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case ey:e.blendFunc(e.ONE,e.ONE);break;case ny:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case iy:e.blendFuncSeparate(e.ZERO,e.SRC_COLOR,e.ZERO,e.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",C);break}else switch(C){case Br:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case ey:e.blendFunc(e.SRC_ALPHA,e.ONE);break;case ny:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case iy:e.blendFunc(e.ZERO,e.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",C);break}b=null,T=null,w=null,U=null,x.set(0,0,0),A=0,_=C,F=ce}return}st=st||ht,Tt=Tt||et,jt=jt||G,(ht!==g||st!==R)&&(e.blendEquationSeparate(xt[ht],xt[st]),g=ht,R=st),(et!==b||G!==T||Tt!==w||jt!==U)&&(e.blendFuncSeparate(Ht[et],Ht[G],Ht[Tt],Ht[jt]),b=et,T=G,w=Tt,U=jt),(He.equals(x)===!1||sn!==A)&&(e.blendColor(He.r,He.g,He.b,sn),x.copy(He),A=sn),_=C,F=!1}function _e(C,ht){C.side===Ji?At(e.CULL_FACE):Lt(e.CULL_FACE);let et=C.side===Sn;ht&&(et=!et),rt(et),C.blending===Br&&C.transparent===!1?bt(Ia):bt(C.blending,C.blendEquation,C.blendSrc,C.blendDst,C.blendEquationAlpha,C.blendSrcAlpha,C.blendDstAlpha,C.blendColor,C.blendAlpha,C.premultipliedAlpha),l.setFunc(C.depthFunc),l.setTest(C.depthTest),l.setMask(C.depthWrite),o.setMask(C.colorWrite);let G=C.stencilWrite;c.setTest(G),G&&(c.setMask(C.stencilWriteMask),c.setFunc(C.stencilFunc,C.stencilRef,C.stencilFuncMask),c.setOp(C.stencilFail,C.stencilZFail,C.stencilZPass)),he(C.polygonOffset,C.polygonOffsetFactor,C.polygonOffsetUnits),C.alphaToCoverage===!0?Lt(e.SAMPLE_ALPHA_TO_COVERAGE):At(e.SAMPLE_ALPHA_TO_COVERAGE)}function rt(C){Y!==C&&(C?e.frontFace(e.CW):e.frontFace(e.CCW),Y=C)}function pt(C){C!==c1?(Lt(e.CULL_FACE),C!==$&&(C===ty?e.cullFace(e.BACK):C===u1?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))):At(e.CULL_FACE),$=C}function Ot(C){C!==L&&(Q&&e.lineWidth(C),L=C)}function he(C,ht,et){C?(Lt(e.POLYGON_OFFSET_FILL),(H!==ht||q!==et)&&(e.polygonOffset(ht,et),H=ht,q=et)):At(e.POLYGON_OFFSET_FILL)}function Ce(C){C?Lt(e.SCISSOR_TEST):At(e.SCISSOR_TEST)}function E(C){C===void 0&&(C=e.TEXTURE0+k-1),tt!==C&&(e.activeTexture(C),tt=C)}function S(C,ht,et){et===void 0&&(tt===null?et=e.TEXTURE0+k-1:et=tt);let G=dt[et];G===void 0&&(G={type:void 0,texture:void 0},dt[et]=G),(G.type!==C||G.texture!==ht)&&(tt!==et&&(e.activeTexture(et),tt=et),e.bindTexture(C,ht||Ut[C]),G.type=C,G.texture=ht)}function O(){let C=dt[tt];C!==void 0&&C.type!==void 0&&(e.bindTexture(C.type,null),C.type=void 0,C.texture=void 0)}function it(){try{e.compressedTexImage2D.apply(e,arguments)}catch(C){console.error("THREE.WebGLState:",C)}}function K(){try{e.compressedTexImage3D.apply(e,arguments)}catch(C){console.error("THREE.WebGLState:",C)}}function at(){try{e.texSubImage2D.apply(e,arguments)}catch(C){console.error("THREE.WebGLState:",C)}}function vt(){try{e.texSubImage3D.apply(e,arguments)}catch(C){console.error("THREE.WebGLState:",C)}}function ot(){try{e.compressedTexSubImage2D.apply(e,arguments)}catch(C){console.error("THREE.WebGLState:",C)}}function ut(){try{e.compressedTexSubImage3D.apply(e,arguments)}catch(C){console.error("THREE.WebGLState:",C)}}function wt(){try{e.texStorage2D.apply(e,arguments)}catch(C){console.error("THREE.WebGLState:",C)}}function Qt(){try{e.texStorage3D.apply(e,arguments)}catch(C){console.error("THREE.WebGLState:",C)}}function nt(){try{e.texImage2D.apply(e,arguments)}catch(C){console.error("THREE.WebGLState:",C)}}function ie(){try{e.texImage3D.apply(e,arguments)}catch(C){console.error("THREE.WebGLState:",C)}}function Pt(C){ct.equals(C)===!1&&(e.scissor(C.x,C.y,C.z,C.w),ct.copy(C))}function Rt(C){gt.equals(C)===!1&&(e.viewport(C.x,C.y,C.z,C.w),gt.copy(C))}function St(C,ht){let et=d.get(ht);et===void 0&&(et=new WeakMap,d.set(ht,et));let G=et.get(C);G===void 0&&(G=e.getUniformBlockIndex(ht,C.name),et.set(C,G))}function mt(C,ht){let G=d.get(ht).get(C);h.get(ht)!==G&&(e.uniformBlockBinding(ht,G,C.__bindingPointIndex),h.set(ht,G))}function qt(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),i===!0&&(e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null)),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),f={},tt=null,dt={},p={},v=new WeakMap,y=[],m=null,u=!1,_=null,g=null,b=null,T=null,R=null,w=null,U=null,x=new te(0,0,0),A=0,F=!1,Y=null,$=null,L=null,H=null,q=null,ct.set(0,0,e.canvas.width,e.canvas.height),gt.set(0,0,e.canvas.width,e.canvas.height),o.reset(),l.reset(),c.reset()}return{buffers:{color:o,depth:l,stencil:c},enable:Lt,disable:At,bindFramebuffer:Nt,drawBuffers:N,useProgram:Fe,setBlending:bt,setMaterial:_e,setFlipSided:rt,setCullFace:pt,setLineWidth:Ot,setPolygonOffset:he,setScissorTest:Ce,activeTexture:E,bindTexture:S,unbindTexture:O,compressedTexImage2D:it,compressedTexImage3D:K,texImage2D:nt,texImage3D:ie,updateUBOMapping:St,uniformBlockBinding:mt,texStorage2D:wt,texStorage3D:Qt,texSubImage2D:at,texSubImage3D:vt,compressedTexSubImage2D:ot,compressedTexSubImage3D:ut,scissor:Pt,viewport:Rt,reset:qt}}function jR(e,t,n,i,a,s,r){let o=a.isWebGL2,l=a.maxTextures,c=a.maxCubemapSize,h=a.maxTextureSize,d=a.maxSamples,f=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,p=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),v=new WeakMap,y,m=new WeakMap,u=!1;try{u=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function _(E,S){return u?new OffscreenCanvas(E,S):xu("canvas")}function g(E,S,O,it){let K=1;if((E.width>it||E.height>it)&&(K=it/Math.max(E.width,E.height)),K<1||S===!0)if(typeof HTMLImageElement<"u"&&E instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&E instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&E instanceof ImageBitmap){let at=S?_p:Math.floor,vt=at(K*E.width),ot=at(K*E.height);y===void 0&&(y=_(vt,ot));let ut=O?_(vt,ot):y;return ut.width=vt,ut.height=ot,ut.getContext("2d").drawImage(E,0,0,vt,ot),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+E.width+"x"+E.height+") to ("+vt+"x"+ot+")."),ut}else return"data"in E&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+E.width+"x"+E.height+")."),E;return E}function b(E){return By(E.width)&&By(E.height)}function T(E){return o?!1:E.wrapS!==si||E.wrapT!==si||E.minFilter!==hn&&E.minFilter!==Jn}function R(E,S){return E.generateMipmaps&&S&&E.minFilter!==hn&&E.minFilter!==Jn}function w(E){e.generateMipmap(E)}function U(E,S,O,it,K=!1){if(o===!1)return S;if(E!==null){if(e[E]!==void 0)return e[E];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+E+"'")}let at=S;if(S===e.RED&&(O===e.FLOAT&&(at=e.R32F),O===e.HALF_FLOAT&&(at=e.R16F),O===e.UNSIGNED_BYTE&&(at=e.R8)),S===e.RED_INTEGER&&(O===e.UNSIGNED_BYTE&&(at=e.R8UI),O===e.UNSIGNED_SHORT&&(at=e.R16UI),O===e.UNSIGNED_INT&&(at=e.R32UI),O===e.BYTE&&(at=e.R8I),O===e.SHORT&&(at=e.R16I),O===e.INT&&(at=e.R32I)),S===e.RG&&(O===e.FLOAT&&(at=e.RG32F),O===e.HALF_FLOAT&&(at=e.RG16F),O===e.UNSIGNED_BYTE&&(at=e.RG8)),S===e.RGBA){let vt=K?gu:re.getTransfer(it);O===e.FLOAT&&(at=e.RGBA32F),O===e.HALF_FLOAT&&(at=e.RGBA16F),O===e.UNSIGNED_BYTE&&(at=vt===ge?e.SRGB8_ALPHA8:e.RGBA8),O===e.UNSIGNED_SHORT_4_4_4_4&&(at=e.RGBA4),O===e.UNSIGNED_SHORT_5_5_5_1&&(at=e.RGB5_A1)}return(at===e.R16F||at===e.R32F||at===e.RG16F||at===e.RG32F||at===e.RGBA16F||at===e.RGBA32F)&&t.get("EXT_color_buffer_float"),at}function x(E,S,O){return R(E,O)===!0||E.isFramebufferTexture&&E.minFilter!==hn&&E.minFilter!==Jn?Math.log2(Math.max(S.width,S.height))+1:E.mipmaps!==void 0&&E.mipmaps.length>0?E.mipmaps.length:E.isCompressedTexture&&Array.isArray(E.image)?S.mipmaps.length:1}function A(E){return E===hn||E===ry||E===Ud?e.NEAREST:e.LINEAR}function F(E){let S=E.target;S.removeEventListener("dispose",F),$(S),S.isVideoTexture&&v.delete(S)}function Y(E){let S=E.target;S.removeEventListener("dispose",Y),H(S)}function $(E){let S=i.get(E);if(S.__webglInit===void 0)return;let O=E.source,it=m.get(O);if(it){let K=it[S.__cacheKey];K.usedTimes--,K.usedTimes===0&&L(E),Object.keys(it).length===0&&m.delete(O)}i.remove(E)}function L(E){let S=i.get(E);e.deleteTexture(S.__webglTexture);let O=E.source,it=m.get(O);delete it[S.__cacheKey],r.memory.textures--}function H(E){let S=E.texture,O=i.get(E),it=i.get(S);if(it.__webglTexture!==void 0&&(e.deleteTexture(it.__webglTexture),r.memory.textures--),E.depthTexture&&E.depthTexture.dispose(),E.isWebGLCubeRenderTarget)for(let K=0;K<6;K++){if(Array.isArray(O.__webglFramebuffer[K]))for(let at=0;at<O.__webglFramebuffer[K].length;at++)e.deleteFramebuffer(O.__webglFramebuffer[K][at]);else e.deleteFramebuffer(O.__webglFramebuffer[K]);O.__webglDepthbuffer&&e.deleteRenderbuffer(O.__webglDepthbuffer[K])}else{if(Array.isArray(O.__webglFramebuffer))for(let K=0;K<O.__webglFramebuffer.length;K++)e.deleteFramebuffer(O.__webglFramebuffer[K]);else e.deleteFramebuffer(O.__webglFramebuffer);if(O.__webglDepthbuffer&&e.deleteRenderbuffer(O.__webglDepthbuffer),O.__webglMultisampledFramebuffer&&e.deleteFramebuffer(O.__webglMultisampledFramebuffer),O.__webglColorRenderbuffer)for(let K=0;K<O.__webglColorRenderbuffer.length;K++)O.__webglColorRenderbuffer[K]&&e.deleteRenderbuffer(O.__webglColorRenderbuffer[K]);O.__webglDepthRenderbuffer&&e.deleteRenderbuffer(O.__webglDepthRenderbuffer)}if(E.isWebGLMultipleRenderTargets)for(let K=0,at=S.length;K<at;K++){let vt=i.get(S[K]);vt.__webglTexture&&(e.deleteTexture(vt.__webglTexture),r.memory.textures--),i.remove(S[K])}i.remove(S),i.remove(E)}let q=0;function k(){q=0}function Q(){let E=q;return E>=l&&console.warn("THREE.WebGLTextures: Trying to use "+E+" texture units while this GPU supports only "+l),q+=1,E}function X(E){let S=[];return S.push(E.wrapS),S.push(E.wrapT),S.push(E.wrapR||0),S.push(E.magFilter),S.push(E.minFilter),S.push(E.anisotropy),S.push(E.internalFormat),S.push(E.format),S.push(E.type),S.push(E.generateMipmaps),S.push(E.premultiplyAlpha),S.push(E.flipY),S.push(E.unpackAlignment),S.push(E.colorSpace),S.join()}function j(E,S){let O=i.get(E);if(E.isVideoTexture&&he(E),E.isRenderTargetTexture===!1&&E.version>0&&O.__version!==E.version){let it=E.image;if(it===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(it.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{Lt(O,E,S);return}}n.bindTexture(e.TEXTURE_2D,O.__webglTexture,e.TEXTURE0+S)}function tt(E,S){let O=i.get(E);if(E.version>0&&O.__version!==E.version){Lt(O,E,S);return}n.bindTexture(e.TEXTURE_2D_ARRAY,O.__webglTexture,e.TEXTURE0+S)}function dt(E,S){let O=i.get(E);if(E.version>0&&O.__version!==E.version){Lt(O,E,S);return}n.bindTexture(e.TEXTURE_3D,O.__webglTexture,e.TEXTURE0+S)}function V(E,S){let O=i.get(E);if(E.version>0&&O.__version!==E.version){At(O,E,S);return}n.bindTexture(e.TEXTURE_CUBE_MAP,O.__webglTexture,e.TEXTURE0+S)}let Z={[dp]:e.REPEAT,[si]:e.CLAMP_TO_EDGE,[pp]:e.MIRRORED_REPEAT},ct={[hn]:e.NEAREST,[ry]:e.NEAREST_MIPMAP_NEAREST,[Ud]:e.NEAREST_MIPMAP_LINEAR,[Jn]:e.LINEAR,[G1]:e.LINEAR_MIPMAP_NEAREST,[rl]:e.LINEAR_MIPMAP_LINEAR},gt={[eE]:e.NEVER,[oE]:e.ALWAYS,[nE]:e.LESS,[Nx]:e.LEQUAL,[iE]:e.EQUAL,[rE]:e.GEQUAL,[aE]:e.GREATER,[sE]:e.NOTEQUAL};function _t(E,S,O){if(O?(e.texParameteri(E,e.TEXTURE_WRAP_S,Z[S.wrapS]),e.texParameteri(E,e.TEXTURE_WRAP_T,Z[S.wrapT]),(E===e.TEXTURE_3D||E===e.TEXTURE_2D_ARRAY)&&e.texParameteri(E,e.TEXTURE_WRAP_R,Z[S.wrapR]),e.texParameteri(E,e.TEXTURE_MAG_FILTER,ct[S.magFilter]),e.texParameteri(E,e.TEXTURE_MIN_FILTER,ct[S.minFilter])):(e.texParameteri(E,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(E,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),(E===e.TEXTURE_3D||E===e.TEXTURE_2D_ARRAY)&&e.texParameteri(E,e.TEXTURE_WRAP_R,e.CLAMP_TO_EDGE),(S.wrapS!==si||S.wrapT!==si)&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.wrapS and Texture.wrapT should be set to THREE.ClampToEdgeWrapping."),e.texParameteri(E,e.TEXTURE_MAG_FILTER,A(S.magFilter)),e.texParameteri(E,e.TEXTURE_MIN_FILTER,A(S.minFilter)),S.minFilter!==hn&&S.minFilter!==Jn&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.minFilter should be set to THREE.NearestFilter or THREE.LinearFilter.")),S.compareFunction&&(e.texParameteri(E,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(E,e.TEXTURE_COMPARE_FUNC,gt[S.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){let it=t.get("EXT_texture_filter_anisotropic");if(S.magFilter===hn||S.minFilter!==Ud&&S.minFilter!==rl||S.type===za&&t.has("OES_texture_float_linear")===!1||o===!1&&S.type===ol&&t.has("OES_texture_half_float_linear")===!1)return;(S.anisotropy>1||i.get(S).__currentAnisotropy)&&(e.texParameterf(E,it.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(S.anisotropy,a.getMaxAnisotropy())),i.get(S).__currentAnisotropy=S.anisotropy)}}function Ut(E,S){let O=!1;E.__webglInit===void 0&&(E.__webglInit=!0,S.addEventListener("dispose",F));let it=S.source,K=m.get(it);K===void 0&&(K={},m.set(it,K));let at=X(S);if(at!==E.__cacheKey){K[at]===void 0&&(K[at]={texture:e.createTexture(),usedTimes:0},r.memory.textures++,O=!0),K[at].usedTimes++;let vt=K[E.__cacheKey];vt!==void 0&&(K[E.__cacheKey].usedTimes--,vt.usedTimes===0&&L(S)),E.__cacheKey=at,E.__webglTexture=K[at].texture}return O}function Lt(E,S,O){let it=e.TEXTURE_2D;(S.isDataArrayTexture||S.isCompressedArrayTexture)&&(it=e.TEXTURE_2D_ARRAY),S.isData3DTexture&&(it=e.TEXTURE_3D);let K=Ut(E,S),at=S.source;n.bindTexture(it,E.__webglTexture,e.TEXTURE0+O);let vt=i.get(at);if(at.version!==vt.__version||K===!0){n.activeTexture(e.TEXTURE0+O);let ot=re.getPrimaries(re.workingColorSpace),ut=S.colorSpace===Qn?null:re.getPrimaries(S.colorSpace),wt=S.colorSpace===Qn||ot===ut?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,S.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,S.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,wt);let Qt=T(S)&&b(S.image)===!1,nt=g(S.image,Qt,!1,h);nt=Ce(S,nt);let ie=b(nt)||o,Pt=s.convert(S.format,S.colorSpace),Rt=s.convert(S.type),St=U(S.internalFormat,Pt,Rt,S.colorSpace,S.isVideoTexture);_t(it,S,ie);let mt,qt=S.mipmaps,C=o&&S.isVideoTexture!==!0&&St!==Dx,ht=vt.__version===void 0||K===!0,et=x(S,nt,ie);if(S.isDepthTexture)St=e.DEPTH_COMPONENT,o?S.type===za?St=e.DEPTH_COMPONENT32F:S.type===Pa?St=e.DEPTH_COMPONENT24:S.type===_s?St=e.DEPTH24_STENCIL8:St=e.DEPTH_COMPONENT16:S.type===za&&console.error("WebGLRenderer: Floating point depth texture requires WebGL2."),S.format===vs&&St===e.DEPTH_COMPONENT&&S.type!==Yp&&S.type!==Pa&&(console.warn("THREE.WebGLRenderer: Use UnsignedShortType or UnsignedIntType for DepthFormat DepthTexture."),S.type=Pa,Rt=s.convert(S.type)),S.format===kr&&St===e.DEPTH_COMPONENT&&(St=e.DEPTH_STENCIL,S.type!==_s&&(console.warn("THREE.WebGLRenderer: Use UnsignedInt248Type for DepthStencilFormat DepthTexture."),S.type=_s,Rt=s.convert(S.type))),ht&&(C?n.texStorage2D(e.TEXTURE_2D,1,St,nt.width,nt.height):n.texImage2D(e.TEXTURE_2D,0,St,nt.width,nt.height,0,Pt,Rt,null));else if(S.isDataTexture)if(qt.length>0&&ie){C&&ht&&n.texStorage2D(e.TEXTURE_2D,et,St,qt[0].width,qt[0].height);for(let G=0,st=qt.length;G<st;G++)mt=qt[G],C?n.texSubImage2D(e.TEXTURE_2D,G,0,0,mt.width,mt.height,Pt,Rt,mt.data):n.texImage2D(e.TEXTURE_2D,G,St,mt.width,mt.height,0,Pt,Rt,mt.data);S.generateMipmaps=!1}else C?(ht&&n.texStorage2D(e.TEXTURE_2D,et,St,nt.width,nt.height),n.texSubImage2D(e.TEXTURE_2D,0,0,0,nt.width,nt.height,Pt,Rt,nt.data)):n.texImage2D(e.TEXTURE_2D,0,St,nt.width,nt.height,0,Pt,Rt,nt.data);else if(S.isCompressedTexture)if(S.isCompressedArrayTexture){C&&ht&&n.texStorage3D(e.TEXTURE_2D_ARRAY,et,St,qt[0].width,qt[0].height,nt.depth);for(let G=0,st=qt.length;G<st;G++)mt=qt[G],S.format!==ri?Pt!==null?C?n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,G,0,0,0,mt.width,mt.height,nt.depth,Pt,mt.data,0,0):n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,G,St,mt.width,mt.height,nt.depth,0,mt.data,0,0):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):C?n.texSubImage3D(e.TEXTURE_2D_ARRAY,G,0,0,0,mt.width,mt.height,nt.depth,Pt,Rt,mt.data):n.texImage3D(e.TEXTURE_2D_ARRAY,G,St,mt.width,mt.height,nt.depth,0,Pt,Rt,mt.data)}else{C&&ht&&n.texStorage2D(e.TEXTURE_2D,et,St,qt[0].width,qt[0].height);for(let G=0,st=qt.length;G<st;G++)mt=qt[G],S.format!==ri?Pt!==null?C?n.compressedTexSubImage2D(e.TEXTURE_2D,G,0,0,mt.width,mt.height,Pt,mt.data):n.compressedTexImage2D(e.TEXTURE_2D,G,St,mt.width,mt.height,0,mt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):C?n.texSubImage2D(e.TEXTURE_2D,G,0,0,mt.width,mt.height,Pt,Rt,mt.data):n.texImage2D(e.TEXTURE_2D,G,St,mt.width,mt.height,0,Pt,Rt,mt.data)}else if(S.isDataArrayTexture)C?(ht&&n.texStorage3D(e.TEXTURE_2D_ARRAY,et,St,nt.width,nt.height,nt.depth),n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,nt.width,nt.height,nt.depth,Pt,Rt,nt.data)):n.texImage3D(e.TEXTURE_2D_ARRAY,0,St,nt.width,nt.height,nt.depth,0,Pt,Rt,nt.data);else if(S.isData3DTexture)C?(ht&&n.texStorage3D(e.TEXTURE_3D,et,St,nt.width,nt.height,nt.depth),n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,nt.width,nt.height,nt.depth,Pt,Rt,nt.data)):n.texImage3D(e.TEXTURE_3D,0,St,nt.width,nt.height,nt.depth,0,Pt,Rt,nt.data);else if(S.isFramebufferTexture){if(ht)if(C)n.texStorage2D(e.TEXTURE_2D,et,St,nt.width,nt.height);else{let G=nt.width,st=nt.height;for(let Tt=0;Tt<et;Tt++)n.texImage2D(e.TEXTURE_2D,Tt,St,G,st,0,Pt,Rt,null),G>>=1,st>>=1}}else if(qt.length>0&&ie){C&&ht&&n.texStorage2D(e.TEXTURE_2D,et,St,qt[0].width,qt[0].height);for(let G=0,st=qt.length;G<st;G++)mt=qt[G],C?n.texSubImage2D(e.TEXTURE_2D,G,0,0,Pt,Rt,mt):n.texImage2D(e.TEXTURE_2D,G,St,Pt,Rt,mt);S.generateMipmaps=!1}else C?(ht&&n.texStorage2D(e.TEXTURE_2D,et,St,nt.width,nt.height),n.texSubImage2D(e.TEXTURE_2D,0,0,0,Pt,Rt,nt)):n.texImage2D(e.TEXTURE_2D,0,St,Pt,Rt,nt);R(S,ie)&&w(it),vt.__version=at.version,S.onUpdate&&S.onUpdate(S)}E.__version=S.version}function At(E,S,O){if(S.image.length!==6)return;let it=Ut(E,S),K=S.source;n.bindTexture(e.TEXTURE_CUBE_MAP,E.__webglTexture,e.TEXTURE0+O);let at=i.get(K);if(K.version!==at.__version||it===!0){n.activeTexture(e.TEXTURE0+O);let vt=re.getPrimaries(re.workingColorSpace),ot=S.colorSpace===Qn?null:re.getPrimaries(S.colorSpace),ut=S.colorSpace===Qn||vt===ot?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,S.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,S.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,ut);let wt=S.isCompressedTexture||S.image[0].isCompressedTexture,Qt=S.image[0]&&S.image[0].isDataTexture,nt=[];for(let G=0;G<6;G++)!wt&&!Qt?nt[G]=g(S.image[G],!1,!0,c):nt[G]=Qt?S.image[G].image:S.image[G],nt[G]=Ce(S,nt[G]);let ie=nt[0],Pt=b(ie)||o,Rt=s.convert(S.format,S.colorSpace),St=s.convert(S.type),mt=U(S.internalFormat,Rt,St,S.colorSpace),qt=o&&S.isVideoTexture!==!0,C=at.__version===void 0||it===!0,ht=x(S,ie,Pt);_t(e.TEXTURE_CUBE_MAP,S,Pt);let et;if(wt){qt&&C&&n.texStorage2D(e.TEXTURE_CUBE_MAP,ht,mt,ie.width,ie.height);for(let G=0;G<6;G++){et=nt[G].mipmaps;for(let st=0;st<et.length;st++){let Tt=et[st];S.format!==ri?Rt!==null?qt?n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+G,st,0,0,Tt.width,Tt.height,Rt,Tt.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+G,st,mt,Tt.width,Tt.height,0,Tt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):qt?n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+G,st,0,0,Tt.width,Tt.height,Rt,St,Tt.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+G,st,mt,Tt.width,Tt.height,0,Rt,St,Tt.data)}}}else{et=S.mipmaps,qt&&C&&(et.length>0&&ht++,n.texStorage2D(e.TEXTURE_CUBE_MAP,ht,mt,nt[0].width,nt[0].height));for(let G=0;G<6;G++)if(Qt){qt?n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+G,0,0,0,nt[G].width,nt[G].height,Rt,St,nt[G].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+G,0,mt,nt[G].width,nt[G].height,0,Rt,St,nt[G].data);for(let st=0;st<et.length;st++){let jt=et[st].image[G].image;qt?n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+G,st+1,0,0,jt.width,jt.height,Rt,St,jt.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+G,st+1,mt,jt.width,jt.height,0,Rt,St,jt.data)}}else{qt?n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+G,0,0,0,Rt,St,nt[G]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+G,0,mt,Rt,St,nt[G]);for(let st=0;st<et.length;st++){let Tt=et[st];qt?n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+G,st+1,0,0,Rt,St,Tt.image[G]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+G,st+1,mt,Rt,St,Tt.image[G])}}}R(S,Pt)&&w(e.TEXTURE_CUBE_MAP),at.__version=K.version,S.onUpdate&&S.onUpdate(S)}E.__version=S.version}function Nt(E,S,O,it,K,at){let vt=s.convert(O.format,O.colorSpace),ot=s.convert(O.type),ut=U(O.internalFormat,vt,ot,O.colorSpace);if(!i.get(S).__hasExternalTextures){let Qt=Math.max(1,S.width>>at),nt=Math.max(1,S.height>>at);K===e.TEXTURE_3D||K===e.TEXTURE_2D_ARRAY?n.texImage3D(K,at,ut,Qt,nt,S.depth,0,vt,ot,null):n.texImage2D(K,at,ut,Qt,nt,0,vt,ot,null)}n.bindFramebuffer(e.FRAMEBUFFER,E),Ot(S)?f.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,it,K,i.get(O).__webglTexture,0,pt(S)):(K===e.TEXTURE_2D||K>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&K<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,it,K,i.get(O).__webglTexture,at),n.bindFramebuffer(e.FRAMEBUFFER,null)}function N(E,S,O){if(e.bindRenderbuffer(e.RENDERBUFFER,E),S.depthBuffer&&!S.stencilBuffer){let it=o===!0?e.DEPTH_COMPONENT24:e.DEPTH_COMPONENT16;if(O||Ot(S)){let K=S.depthTexture;K&&K.isDepthTexture&&(K.type===za?it=e.DEPTH_COMPONENT32F:K.type===Pa&&(it=e.DEPTH_COMPONENT24));let at=pt(S);Ot(S)?f.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,at,it,S.width,S.height):e.renderbufferStorageMultisample(e.RENDERBUFFER,at,it,S.width,S.height)}else e.renderbufferStorage(e.RENDERBUFFER,it,S.width,S.height);e.framebufferRenderbuffer(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.RENDERBUFFER,E)}else if(S.depthBuffer&&S.stencilBuffer){let it=pt(S);O&&Ot(S)===!1?e.renderbufferStorageMultisample(e.RENDERBUFFER,it,e.DEPTH24_STENCIL8,S.width,S.height):Ot(S)?f.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,it,e.DEPTH24_STENCIL8,S.width,S.height):e.renderbufferStorage(e.RENDERBUFFER,e.DEPTH_STENCIL,S.width,S.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.RENDERBUFFER,E)}else{let it=S.isWebGLMultipleRenderTargets===!0?S.texture:[S.texture];for(let K=0;K<it.length;K++){let at=it[K],vt=s.convert(at.format,at.colorSpace),ot=s.convert(at.type),ut=U(at.internalFormat,vt,ot,at.colorSpace),wt=pt(S);O&&Ot(S)===!1?e.renderbufferStorageMultisample(e.RENDERBUFFER,wt,ut,S.width,S.height):Ot(S)?f.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,wt,ut,S.width,S.height):e.renderbufferStorage(e.RENDERBUFFER,ut,S.width,S.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function Fe(E,S){if(S&&S.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(n.bindFramebuffer(e.FRAMEBUFFER,E),!(S.depthTexture&&S.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!i.get(S.depthTexture).__webglTexture||S.depthTexture.image.width!==S.width||S.depthTexture.image.height!==S.height)&&(S.depthTexture.image.width=S.width,S.depthTexture.image.height=S.height,S.depthTexture.needsUpdate=!0),j(S.depthTexture,0);let it=i.get(S.depthTexture).__webglTexture,K=pt(S);if(S.depthTexture.format===vs)Ot(S)?f.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,it,0,K):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,it,0);else if(S.depthTexture.format===kr)Ot(S)?f.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,it,0,K):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,it,0);else throw new Error("Unknown depthTexture format")}function xt(E){let S=i.get(E),O=E.isWebGLCubeRenderTarget===!0;if(E.depthTexture&&!S.__autoAllocateDepthBuffer){if(O)throw new Error("target.depthTexture not supported in Cube render targets");Fe(S.__webglFramebuffer,E)}else if(O){S.__webglDepthbuffer=[];for(let it=0;it<6;it++)n.bindFramebuffer(e.FRAMEBUFFER,S.__webglFramebuffer[it]),S.__webglDepthbuffer[it]=e.createRenderbuffer(),N(S.__webglDepthbuffer[it],E,!1)}else n.bindFramebuffer(e.FRAMEBUFFER,S.__webglFramebuffer),S.__webglDepthbuffer=e.createRenderbuffer(),N(S.__webglDepthbuffer,E,!1);n.bindFramebuffer(e.FRAMEBUFFER,null)}function Ht(E,S,O){let it=i.get(E);S!==void 0&&Nt(it.__webglFramebuffer,E,E.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),O!==void 0&&xt(E)}function bt(E){let S=E.texture,O=i.get(E),it=i.get(S);E.addEventListener("dispose",Y),E.isWebGLMultipleRenderTargets!==!0&&(it.__webglTexture===void 0&&(it.__webglTexture=e.createTexture()),it.__version=S.version,r.memory.textures++);let K=E.isWebGLCubeRenderTarget===!0,at=E.isWebGLMultipleRenderTargets===!0,vt=b(E)||o;if(K){O.__webglFramebuffer=[];for(let ot=0;ot<6;ot++)if(o&&S.mipmaps&&S.mipmaps.length>0){O.__webglFramebuffer[ot]=[];for(let ut=0;ut<S.mipmaps.length;ut++)O.__webglFramebuffer[ot][ut]=e.createFramebuffer()}else O.__webglFramebuffer[ot]=e.createFramebuffer()}else{if(o&&S.mipmaps&&S.mipmaps.length>0){O.__webglFramebuffer=[];for(let ot=0;ot<S.mipmaps.length;ot++)O.__webglFramebuffer[ot]=e.createFramebuffer()}else O.__webglFramebuffer=e.createFramebuffer();if(at)if(a.drawBuffers){let ot=E.texture;for(let ut=0,wt=ot.length;ut<wt;ut++){let Qt=i.get(ot[ut]);Qt.__webglTexture===void 0&&(Qt.__webglTexture=e.createTexture(),r.memory.textures++)}}else console.warn("THREE.WebGLRenderer: WebGLMultipleRenderTargets can only be used with WebGL2 or WEBGL_draw_buffers extension.");if(o&&E.samples>0&&Ot(E)===!1){let ot=at?S:[S];O.__webglMultisampledFramebuffer=e.createFramebuffer(),O.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,O.__webglMultisampledFramebuffer);for(let ut=0;ut<ot.length;ut++){let wt=ot[ut];O.__webglColorRenderbuffer[ut]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,O.__webglColorRenderbuffer[ut]);let Qt=s.convert(wt.format,wt.colorSpace),nt=s.convert(wt.type),ie=U(wt.internalFormat,Qt,nt,wt.colorSpace,E.isXRRenderTarget===!0),Pt=pt(E);e.renderbufferStorageMultisample(e.RENDERBUFFER,Pt,ie,E.width,E.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+ut,e.RENDERBUFFER,O.__webglColorRenderbuffer[ut])}e.bindRenderbuffer(e.RENDERBUFFER,null),E.depthBuffer&&(O.__webglDepthRenderbuffer=e.createRenderbuffer(),N(O.__webglDepthRenderbuffer,E,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(K){n.bindTexture(e.TEXTURE_CUBE_MAP,it.__webglTexture),_t(e.TEXTURE_CUBE_MAP,S,vt);for(let ot=0;ot<6;ot++)if(o&&S.mipmaps&&S.mipmaps.length>0)for(let ut=0;ut<S.mipmaps.length;ut++)Nt(O.__webglFramebuffer[ot][ut],E,S,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+ot,ut);else Nt(O.__webglFramebuffer[ot],E,S,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+ot,0);R(S,vt)&&w(e.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(at){let ot=E.texture;for(let ut=0,wt=ot.length;ut<wt;ut++){let Qt=ot[ut],nt=i.get(Qt);n.bindTexture(e.TEXTURE_2D,nt.__webglTexture),_t(e.TEXTURE_2D,Qt,vt),Nt(O.__webglFramebuffer,E,Qt,e.COLOR_ATTACHMENT0+ut,e.TEXTURE_2D,0),R(Qt,vt)&&w(e.TEXTURE_2D)}n.unbindTexture()}else{let ot=e.TEXTURE_2D;if((E.isWebGL3DRenderTarget||E.isWebGLArrayRenderTarget)&&(o?ot=E.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY:console.error("THREE.WebGLTextures: THREE.Data3DTexture and THREE.DataArrayTexture only supported with WebGL2.")),n.bindTexture(ot,it.__webglTexture),_t(ot,S,vt),o&&S.mipmaps&&S.mipmaps.length>0)for(let ut=0;ut<S.mipmaps.length;ut++)Nt(O.__webglFramebuffer[ut],E,S,e.COLOR_ATTACHMENT0,ot,ut);else Nt(O.__webglFramebuffer,E,S,e.COLOR_ATTACHMENT0,ot,0);R(S,vt)&&w(ot),n.unbindTexture()}E.depthBuffer&&xt(E)}function _e(E){let S=b(E)||o,O=E.isWebGLMultipleRenderTargets===!0?E.texture:[E.texture];for(let it=0,K=O.length;it<K;it++){let at=O[it];if(R(at,S)){let vt=E.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:e.TEXTURE_2D,ot=i.get(at).__webglTexture;n.bindTexture(vt,ot),w(vt),n.unbindTexture()}}}function rt(E){if(o&&E.samples>0&&Ot(E)===!1){let S=E.isWebGLMultipleRenderTargets?E.texture:[E.texture],O=E.width,it=E.height,K=e.COLOR_BUFFER_BIT,at=[],vt=E.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,ot=i.get(E),ut=E.isWebGLMultipleRenderTargets===!0;if(ut)for(let wt=0;wt<S.length;wt++)n.bindFramebuffer(e.FRAMEBUFFER,ot.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+wt,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,ot.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+wt,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,ot.__webglMultisampledFramebuffer),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,ot.__webglFramebuffer);for(let wt=0;wt<S.length;wt++){at.push(e.COLOR_ATTACHMENT0+wt),E.depthBuffer&&at.push(vt);let Qt=ot.__ignoreDepthValues!==void 0?ot.__ignoreDepthValues:!1;if(Qt===!1&&(E.depthBuffer&&(K|=e.DEPTH_BUFFER_BIT),E.stencilBuffer&&(K|=e.STENCIL_BUFFER_BIT)),ut&&e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,ot.__webglColorRenderbuffer[wt]),Qt===!0&&(e.invalidateFramebuffer(e.READ_FRAMEBUFFER,[vt]),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[vt])),ut){let nt=i.get(S[wt]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,nt,0)}e.blitFramebuffer(0,0,O,it,0,0,O,it,K,e.NEAREST),p&&e.invalidateFramebuffer(e.READ_FRAMEBUFFER,at)}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),ut)for(let wt=0;wt<S.length;wt++){n.bindFramebuffer(e.FRAMEBUFFER,ot.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+wt,e.RENDERBUFFER,ot.__webglColorRenderbuffer[wt]);let Qt=i.get(S[wt]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,ot.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+wt,e.TEXTURE_2D,Qt,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,ot.__webglMultisampledFramebuffer)}}function pt(E){return Math.min(d,E.samples)}function Ot(E){let S=i.get(E);return o&&E.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&S.__useRenderToTexture!==!1}function he(E){let S=r.render.frame;v.get(E)!==S&&(v.set(E,S),E.update())}function Ce(E,S){let O=E.colorSpace,it=E.format,K=E.type;return E.isCompressedTexture===!0||E.isVideoTexture===!0||E.format===mp||O!==$i&&O!==Qn&&(re.getTransfer(O)===ge?o===!1?t.has("EXT_sRGB")===!0&&it===ri?(E.format=mp,E.minFilter=Jn,E.generateMipmaps=!1):S=Su.sRGBToLinear(S):(it!==ri||K!==Fa)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",O)),S}this.allocateTextureUnit=Q,this.resetTextureUnits=k,this.setTexture2D=j,this.setTexture2DArray=tt,this.setTexture3D=dt,this.setTextureCube=V,this.rebindTextures=Ht,this.setupRenderTarget=bt,this.updateRenderTargetMipmap=_e,this.updateMultisampleRenderTarget=rt,this.setupDepthRenderbuffer=xt,this.setupFrameBufferTexture=Nt,this.useMultisampledRTT=Ot}function JR(e,t,n){let i=n.isWebGL2;function a(s,r=Qn){let o,l=re.getTransfer(r);if(s===Fa)return e.UNSIGNED_BYTE;if(s===Ax)return e.UNSIGNED_SHORT_4_4_4_4;if(s===wx)return e.UNSIGNED_SHORT_5_5_5_1;if(s===k1)return e.BYTE;if(s===W1)return e.SHORT;if(s===Yp)return e.UNSIGNED_SHORT;if(s===Tx)return e.INT;if(s===Pa)return e.UNSIGNED_INT;if(s===za)return e.FLOAT;if(s===ol)return i?e.HALF_FLOAT:(o=t.get("OES_texture_half_float"),o!==null?o.HALF_FLOAT_OES:null);if(s===X1)return e.ALPHA;if(s===ri)return e.RGBA;if(s===q1)return e.LUMINANCE;if(s===Y1)return e.LUMINANCE_ALPHA;if(s===vs)return e.DEPTH_COMPONENT;if(s===kr)return e.DEPTH_STENCIL;if(s===mp)return o=t.get("EXT_sRGB"),o!==null?o.SRGB_ALPHA_EXT:null;if(s===Z1)return e.RED;if(s===Rx)return e.RED_INTEGER;if(s===j1)return e.RG;if(s===Cx)return e.RG_INTEGER;if(s===Lx)return e.RGBA_INTEGER;if(s===Nd||s===Od||s===Pd||s===zd)if(l===ge)if(o=t.get("WEBGL_compressed_texture_s3tc_srgb"),o!==null){if(s===Nd)return o.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(s===Od)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(s===Pd)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(s===zd)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(o=t.get("WEBGL_compressed_texture_s3tc"),o!==null){if(s===Nd)return o.COMPRESSED_RGB_S3TC_DXT1_EXT;if(s===Od)return o.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(s===Pd)return o.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(s===zd)return o.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(s===oy||s===ly||s===cy||s===uy)if(o=t.get("WEBGL_compressed_texture_pvrtc"),o!==null){if(s===oy)return o.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(s===ly)return o.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(s===cy)return o.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(s===uy)return o.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(s===Dx)return o=t.get("WEBGL_compressed_texture_etc1"),o!==null?o.COMPRESSED_RGB_ETC1_WEBGL:null;if(s===hy||s===fy)if(o=t.get("WEBGL_compressed_texture_etc"),o!==null){if(s===hy)return l===ge?o.COMPRESSED_SRGB8_ETC2:o.COMPRESSED_RGB8_ETC2;if(s===fy)return l===ge?o.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:o.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(s===dy||s===py||s===my||s===gy||s===_y||s===vy||s===yy||s===xy||s===Sy||s===by||s===My||s===Ey||s===Ty||s===Ay)if(o=t.get("WEBGL_compressed_texture_astc"),o!==null){if(s===dy)return l===ge?o.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:o.COMPRESSED_RGBA_ASTC_4x4_KHR;if(s===py)return l===ge?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:o.COMPRESSED_RGBA_ASTC_5x4_KHR;if(s===my)return l===ge?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:o.COMPRESSED_RGBA_ASTC_5x5_KHR;if(s===gy)return l===ge?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:o.COMPRESSED_RGBA_ASTC_6x5_KHR;if(s===_y)return l===ge?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:o.COMPRESSED_RGBA_ASTC_6x6_KHR;if(s===vy)return l===ge?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:o.COMPRESSED_RGBA_ASTC_8x5_KHR;if(s===yy)return l===ge?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:o.COMPRESSED_RGBA_ASTC_8x6_KHR;if(s===xy)return l===ge?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:o.COMPRESSED_RGBA_ASTC_8x8_KHR;if(s===Sy)return l===ge?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:o.COMPRESSED_RGBA_ASTC_10x5_KHR;if(s===by)return l===ge?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:o.COMPRESSED_RGBA_ASTC_10x6_KHR;if(s===My)return l===ge?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:o.COMPRESSED_RGBA_ASTC_10x8_KHR;if(s===Ey)return l===ge?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:o.COMPRESSED_RGBA_ASTC_10x10_KHR;if(s===Ty)return l===ge?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:o.COMPRESSED_RGBA_ASTC_12x10_KHR;if(s===Ay)return l===ge?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:o.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(s===Id||s===wy||s===Ry)if(o=t.get("EXT_texture_compression_bptc"),o!==null){if(s===Id)return l===ge?o.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:o.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(s===wy)return o.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(s===Ry)return o.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(s===J1||s===Cy||s===Ly||s===Dy)if(o=t.get("EXT_texture_compression_rgtc"),o!==null){if(s===Id)return o.COMPRESSED_RED_RGTC1_EXT;if(s===Cy)return o.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(s===Ly)return o.COMPRESSED_RED_GREEN_RGTC2_EXT;if(s===Dy)return o.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return s===_s?i?e.UNSIGNED_INT_24_8:(o=t.get("WEBGL_depth_texture"),o!==null?o.UNSIGNED_INT_24_8_WEBGL:null):e[s]!==void 0?e[s]:null}return{convert:a}}var Np=class extends Pn{constructor(t=[]){super(),this.isArrayCamera=!0,this.cameras=t}},Ir=class extends Si{constructor(){super(),this.isGroup=!0,this.type="Group"}},QR={type:"move"},sl=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ir,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ir,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new I,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new I),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ir,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new I,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new I),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){let n=this._hand;if(n)for(let i of t.hand.values())this._getHandJoint(n,i)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,n,i){let a=null,s=null,r=null,o=this._targetRay,l=this._grip,c=this._hand;if(t&&n.session.visibilityState!=="visible-blurred"){if(c&&t.hand){r=!0;for(let y of t.hand.values()){let m=n.getJointPose(y,i),u=this._getHandJoint(c,y);m!==null&&(u.matrix.fromArray(m.transform.matrix),u.matrix.decompose(u.position,u.rotation,u.scale),u.matrixWorldNeedsUpdate=!0,u.jointRadius=m.radius),u.visible=m!==null}let h=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],f=h.position.distanceTo(d.position),p=.02,v=.005;c.inputState.pinching&&f>p+v?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&f<=p-v&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(s=n.getPose(t.gripSpace,i),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));o!==null&&(a=n.getPose(t.targetRaySpace,i),a===null&&s!==null&&(a=s),a!==null&&(o.matrix.fromArray(a.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,a.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(a.linearVelocity)):o.hasLinearVelocity=!1,a.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(a.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(QR)))}return o!==null&&(o.visible=a!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=r!==null),this}_getHandJoint(t,n){if(t.joints[n.jointName]===void 0){let i=new Ir;i.matrixAutoUpdate=!1,i.visible=!1,t.joints[n.jointName]=i,t.add(i)}return t.joints[n.jointName]}},Op=class extends Va{constructor(t,n){super();let i=this,a=null,s=1,r=null,o="local-floor",l=1,c=null,h=null,d=null,f=null,p=null,v=null,y=n.getContextAttributes(),m=null,u=null,_=[],g=[],b=new oe,T=null,R=new Pn;R.layers.enable(1),R.viewport=new Ke;let w=new Pn;w.layers.enable(2),w.viewport=new Ke;let U=[R,w],x=new Np;x.layers.enable(1),x.layers.enable(2);let A=null,F=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(V){let Z=_[V];return Z===void 0&&(Z=new sl,_[V]=Z),Z.getTargetRaySpace()},this.getControllerGrip=function(V){let Z=_[V];return Z===void 0&&(Z=new sl,_[V]=Z),Z.getGripSpace()},this.getHand=function(V){let Z=_[V];return Z===void 0&&(Z=new sl,_[V]=Z),Z.getHandSpace()};function Y(V){let Z=g.indexOf(V.inputSource);if(Z===-1)return;let ct=_[Z];ct!==void 0&&(ct.update(V.inputSource,V.frame,c||r),ct.dispatchEvent({type:V.type,data:V.inputSource}))}function $(){a.removeEventListener("select",Y),a.removeEventListener("selectstart",Y),a.removeEventListener("selectend",Y),a.removeEventListener("squeeze",Y),a.removeEventListener("squeezestart",Y),a.removeEventListener("squeezeend",Y),a.removeEventListener("end",$),a.removeEventListener("inputsourceschange",L);for(let V=0;V<_.length;V++){let Z=g[V];Z!==null&&(g[V]=null,_[V].disconnect(Z))}A=null,F=null,t.setRenderTarget(m),p=null,f=null,d=null,a=null,u=null,dt.stop(),i.isPresenting=!1,t.setPixelRatio(T),t.setSize(b.width,b.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(V){s=V,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(V){o=V,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||r},this.setReferenceSpace=function(V){c=V},this.getBaseLayer=function(){return f!==null?f:p},this.getBinding=function(){return d},this.getFrame=function(){return v},this.getSession=function(){return a},this.setSession=async function(V){if(a=V,a!==null){if(m=t.getRenderTarget(),a.addEventListener("select",Y),a.addEventListener("selectstart",Y),a.addEventListener("selectend",Y),a.addEventListener("squeeze",Y),a.addEventListener("squeezestart",Y),a.addEventListener("squeezeend",Y),a.addEventListener("end",$),a.addEventListener("inputsourceschange",L),y.xrCompatible!==!0&&await n.makeXRCompatible(),T=t.getPixelRatio(),t.getSize(b),a.renderState.layers===void 0||t.capabilities.isWebGL2===!1){let Z={antialias:a.renderState.layers===void 0?y.antialias:!0,alpha:!0,depth:y.depth,stencil:y.stencil,framebufferScaleFactor:s};p=new XRWebGLLayer(a,n,Z),a.updateRenderState({baseLayer:p}),t.setPixelRatio(1),t.setSize(p.framebufferWidth,p.framebufferHeight,!1),u=new ta(p.framebufferWidth,p.framebufferHeight,{format:ri,type:Fa,colorSpace:t.outputColorSpace,stencilBuffer:y.stencil})}else{let Z=null,ct=null,gt=null;y.depth&&(gt=y.stencil?n.DEPTH24_STENCIL8:n.DEPTH_COMPONENT24,Z=y.stencil?kr:vs,ct=y.stencil?_s:Pa);let _t={colorFormat:n.RGBA8,depthFormat:gt,scaleFactor:s};d=new XRWebGLBinding(a,n),f=d.createProjectionLayer(_t),a.updateRenderState({layers:[f]}),t.setPixelRatio(1),t.setSize(f.textureWidth,f.textureHeight,!1),u=new ta(f.textureWidth,f.textureHeight,{format:ri,type:Fa,depthTexture:new Uu(f.textureWidth,f.textureHeight,ct,void 0,void 0,void 0,void 0,void 0,void 0,Z),stencilBuffer:y.stencil,colorSpace:t.outputColorSpace,samples:y.antialias?4:0});let Ut=t.properties.get(u);Ut.__ignoreDepthValues=f.ignoreDepthValues}u.isXRRenderTarget=!0,this.setFoveation(l),c=null,r=await a.requestReferenceSpace(o),dt.setContext(a),dt.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(a!==null)return a.environmentBlendMode};function L(V){for(let Z=0;Z<V.removed.length;Z++){let ct=V.removed[Z],gt=g.indexOf(ct);gt>=0&&(g[gt]=null,_[gt].disconnect(ct))}for(let Z=0;Z<V.added.length;Z++){let ct=V.added[Z],gt=g.indexOf(ct);if(gt===-1){for(let Ut=0;Ut<_.length;Ut++)if(Ut>=g.length){g.push(ct),gt=Ut;break}else if(g[Ut]===null){g[Ut]=ct,gt=Ut;break}if(gt===-1)break}let _t=_[gt];_t&&_t.connect(ct)}}let H=new I,q=new I;function k(V,Z,ct){H.setFromMatrixPosition(Z.matrixWorld),q.setFromMatrixPosition(ct.matrixWorld);let gt=H.distanceTo(q),_t=Z.projectionMatrix.elements,Ut=ct.projectionMatrix.elements,Lt=_t[14]/(_t[10]-1),At=_t[14]/(_t[10]+1),Nt=(_t[9]+1)/_t[5],N=(_t[9]-1)/_t[5],Fe=(_t[8]-1)/_t[0],xt=(Ut[8]+1)/Ut[0],Ht=Lt*Fe,bt=Lt*xt,_e=gt/(-Fe+xt),rt=_e*-Fe;Z.matrixWorld.decompose(V.position,V.quaternion,V.scale),V.translateX(rt),V.translateZ(_e),V.matrixWorld.compose(V.position,V.quaternion,V.scale),V.matrixWorldInverse.copy(V.matrixWorld).invert();let pt=Lt+_e,Ot=At+_e,he=Ht-rt,Ce=bt+(gt-rt),E=Nt*At/Ot*pt,S=N*At/Ot*pt;V.projectionMatrix.makePerspective(he,Ce,E,S,pt,Ot),V.projectionMatrixInverse.copy(V.projectionMatrix).invert()}function Q(V,Z){Z===null?V.matrixWorld.copy(V.matrix):V.matrixWorld.multiplyMatrices(Z.matrixWorld,V.matrix),V.matrixWorldInverse.copy(V.matrixWorld).invert()}this.updateCamera=function(V){if(a===null)return;x.near=w.near=R.near=V.near,x.far=w.far=R.far=V.far,(A!==x.near||F!==x.far)&&(a.updateRenderState({depthNear:x.near,depthFar:x.far}),A=x.near,F=x.far);let Z=V.parent,ct=x.cameras;Q(x,Z);for(let gt=0;gt<ct.length;gt++)Q(ct[gt],Z);ct.length===2?k(x,R,w):x.projectionMatrix.copy(R.projectionMatrix),X(V,x,Z)};function X(V,Z,ct){ct===null?V.matrix.copy(Z.matrixWorld):(V.matrix.copy(ct.matrixWorld),V.matrix.invert(),V.matrix.multiply(Z.matrixWorld)),V.matrix.decompose(V.position,V.quaternion,V.scale),V.updateMatrixWorld(!0),V.projectionMatrix.copy(Z.projectionMatrix),V.projectionMatrixInverse.copy(Z.projectionMatrixInverse),V.isPerspectiveCamera&&(V.fov=gp*2*Math.atan(1/V.projectionMatrix.elements[5]),V.zoom=1)}this.getCamera=function(){return x},this.getFoveation=function(){if(!(f===null&&p===null))return l},this.setFoveation=function(V){l=V,f!==null&&(f.fixedFoveation=V),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=V)};let j=null;function tt(V,Z){if(h=Z.getViewerPose(c||r),v=Z,h!==null){let ct=h.views;p!==null&&(t.setRenderTargetFramebuffer(u,p.framebuffer),t.setRenderTarget(u));let gt=!1;ct.length!==x.cameras.length&&(x.cameras.length=0,gt=!0);for(let _t=0;_t<ct.length;_t++){let Ut=ct[_t],Lt=null;if(p!==null)Lt=p.getViewport(Ut);else{let Nt=d.getViewSubImage(f,Ut);Lt=Nt.viewport,_t===0&&(t.setRenderTargetTextures(u,Nt.colorTexture,f.ignoreDepthValues?void 0:Nt.depthStencilTexture),t.setRenderTarget(u))}let At=U[_t];At===void 0&&(At=new Pn,At.layers.enable(_t),At.viewport=new Ke,U[_t]=At),At.matrix.fromArray(Ut.transform.matrix),At.matrix.decompose(At.position,At.quaternion,At.scale),At.projectionMatrix.fromArray(Ut.projectionMatrix),At.projectionMatrixInverse.copy(At.projectionMatrix).invert(),At.viewport.set(Lt.x,Lt.y,Lt.width,Lt.height),_t===0&&(x.matrix.copy(At.matrix),x.matrix.decompose(x.position,x.quaternion,x.scale)),gt===!0&&x.cameras.push(At)}}for(let ct=0;ct<_.length;ct++){let gt=g[ct],_t=_[ct];gt!==null&&_t!==void 0&&_t.update(gt,Z,c||r)}j&&j(V,Z),Z.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:Z}),v=null}let dt=new Ix;dt.setAnimationLoop(tt),this.setAnimationLoop=function(V){j=V},this.dispose=function(){}}};function KR(e,t){function n(m,u){m.matrixAutoUpdate===!0&&m.updateMatrix(),u.value.copy(m.matrix)}function i(m,u){u.color.getRGB(m.fogColor.value,zx(e)),u.isFog?(m.fogNear.value=u.near,m.fogFar.value=u.far):u.isFogExp2&&(m.fogDensity.value=u.density)}function a(m,u,_,g,b){u.isMeshBasicMaterial||u.isMeshLambertMaterial?s(m,u):u.isMeshToonMaterial?(s(m,u),d(m,u)):u.isMeshPhongMaterial?(s(m,u),h(m,u)):u.isMeshStandardMaterial?(s(m,u),f(m,u),u.isMeshPhysicalMaterial&&p(m,u,b)):u.isMeshMatcapMaterial?(s(m,u),v(m,u)):u.isMeshDepthMaterial?s(m,u):u.isMeshDistanceMaterial?(s(m,u),y(m,u)):u.isMeshNormalMaterial?s(m,u):u.isLineBasicMaterial?(r(m,u),u.isLineDashedMaterial&&o(m,u)):u.isPointsMaterial?l(m,u,_,g):u.isSpriteMaterial?c(m,u):u.isShadowMaterial?(m.color.value.copy(u.color),m.opacity.value=u.opacity):u.isShaderMaterial&&(u.uniformsNeedUpdate=!1)}function s(m,u){m.opacity.value=u.opacity,u.color&&m.diffuse.value.copy(u.color),u.emissive&&m.emissive.value.copy(u.emissive).multiplyScalar(u.emissiveIntensity),u.map&&(m.map.value=u.map,n(u.map,m.mapTransform)),u.alphaMap&&(m.alphaMap.value=u.alphaMap,n(u.alphaMap,m.alphaMapTransform)),u.bumpMap&&(m.bumpMap.value=u.bumpMap,n(u.bumpMap,m.bumpMapTransform),m.bumpScale.value=u.bumpScale,u.side===Sn&&(m.bumpScale.value*=-1)),u.normalMap&&(m.normalMap.value=u.normalMap,n(u.normalMap,m.normalMapTransform),m.normalScale.value.copy(u.normalScale),u.side===Sn&&m.normalScale.value.negate()),u.displacementMap&&(m.displacementMap.value=u.displacementMap,n(u.displacementMap,m.displacementMapTransform),m.displacementScale.value=u.displacementScale,m.displacementBias.value=u.displacementBias),u.emissiveMap&&(m.emissiveMap.value=u.emissiveMap,n(u.emissiveMap,m.emissiveMapTransform)),u.specularMap&&(m.specularMap.value=u.specularMap,n(u.specularMap,m.specularMapTransform)),u.alphaTest>0&&(m.alphaTest.value=u.alphaTest);let _=t.get(u).envMap;if(_&&(m.envMap.value=_,m.flipEnvMap.value=_.isCubeTexture&&_.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=u.reflectivity,m.ior.value=u.ior,m.refractionRatio.value=u.refractionRatio),u.lightMap){m.lightMap.value=u.lightMap;let g=e._useLegacyLights===!0?Math.PI:1;m.lightMapIntensity.value=u.lightMapIntensity*g,n(u.lightMap,m.lightMapTransform)}u.aoMap&&(m.aoMap.value=u.aoMap,m.aoMapIntensity.value=u.aoMapIntensity,n(u.aoMap,m.aoMapTransform))}function r(m,u){m.diffuse.value.copy(u.color),m.opacity.value=u.opacity,u.map&&(m.map.value=u.map,n(u.map,m.mapTransform))}function o(m,u){m.dashSize.value=u.dashSize,m.totalSize.value=u.dashSize+u.gapSize,m.scale.value=u.scale}function l(m,u,_,g){m.diffuse.value.copy(u.color),m.opacity.value=u.opacity,m.size.value=u.size*_,m.scale.value=g*.5,u.map&&(m.map.value=u.map,n(u.map,m.uvTransform)),u.alphaMap&&(m.alphaMap.value=u.alphaMap,n(u.alphaMap,m.alphaMapTransform)),u.alphaTest>0&&(m.alphaTest.value=u.alphaTest)}function c(m,u){m.diffuse.value.copy(u.color),m.opacity.value=u.opacity,m.rotation.value=u.rotation,u.map&&(m.map.value=u.map,n(u.map,m.mapTransform)),u.alphaMap&&(m.alphaMap.value=u.alphaMap,n(u.alphaMap,m.alphaMapTransform)),u.alphaTest>0&&(m.alphaTest.value=u.alphaTest)}function h(m,u){m.specular.value.copy(u.specular),m.shininess.value=Math.max(u.shininess,1e-4)}function d(m,u){u.gradientMap&&(m.gradientMap.value=u.gradientMap)}function f(m,u){m.metalness.value=u.metalness,u.metalnessMap&&(m.metalnessMap.value=u.metalnessMap,n(u.metalnessMap,m.metalnessMapTransform)),m.roughness.value=u.roughness,u.roughnessMap&&(m.roughnessMap.value=u.roughnessMap,n(u.roughnessMap,m.roughnessMapTransform)),t.get(u).envMap&&(m.envMapIntensity.value=u.envMapIntensity)}function p(m,u,_){m.ior.value=u.ior,u.sheen>0&&(m.sheenColor.value.copy(u.sheenColor).multiplyScalar(u.sheen),m.sheenRoughness.value=u.sheenRoughness,u.sheenColorMap&&(m.sheenColorMap.value=u.sheenColorMap,n(u.sheenColorMap,m.sheenColorMapTransform)),u.sheenRoughnessMap&&(m.sheenRoughnessMap.value=u.sheenRoughnessMap,n(u.sheenRoughnessMap,m.sheenRoughnessMapTransform))),u.clearcoat>0&&(m.clearcoat.value=u.clearcoat,m.clearcoatRoughness.value=u.clearcoatRoughness,u.clearcoatMap&&(m.clearcoatMap.value=u.clearcoatMap,n(u.clearcoatMap,m.clearcoatMapTransform)),u.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=u.clearcoatRoughnessMap,n(u.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),u.clearcoatNormalMap&&(m.clearcoatNormalMap.value=u.clearcoatNormalMap,n(u.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(u.clearcoatNormalScale),u.side===Sn&&m.clearcoatNormalScale.value.negate())),u.iridescence>0&&(m.iridescence.value=u.iridescence,m.iridescenceIOR.value=u.iridescenceIOR,m.iridescenceThicknessMinimum.value=u.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=u.iridescenceThicknessRange[1],u.iridescenceMap&&(m.iridescenceMap.value=u.iridescenceMap,n(u.iridescenceMap,m.iridescenceMapTransform)),u.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=u.iridescenceThicknessMap,n(u.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),u.transmission>0&&(m.transmission.value=u.transmission,m.transmissionSamplerMap.value=_.texture,m.transmissionSamplerSize.value.set(_.width,_.height),u.transmissionMap&&(m.transmissionMap.value=u.transmissionMap,n(u.transmissionMap,m.transmissionMapTransform)),m.thickness.value=u.thickness,u.thicknessMap&&(m.thicknessMap.value=u.thicknessMap,n(u.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=u.attenuationDistance,m.attenuationColor.value.copy(u.attenuationColor)),u.anisotropy>0&&(m.anisotropyVector.value.set(u.anisotropy*Math.cos(u.anisotropyRotation),u.anisotropy*Math.sin(u.anisotropyRotation)),u.anisotropyMap&&(m.anisotropyMap.value=u.anisotropyMap,n(u.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=u.specularIntensity,m.specularColor.value.copy(u.specularColor),u.specularColorMap&&(m.specularColorMap.value=u.specularColorMap,n(u.specularColorMap,m.specularColorMapTransform)),u.specularIntensityMap&&(m.specularIntensityMap.value=u.specularIntensityMap,n(u.specularIntensityMap,m.specularIntensityMapTransform))}function v(m,u){u.matcap&&(m.matcap.value=u.matcap)}function y(m,u){let _=t.get(u).light;m.referencePosition.value.setFromMatrixPosition(_.matrixWorld),m.nearDistance.value=_.shadow.camera.near,m.farDistance.value=_.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:a}}function $R(e,t,n,i){let a={},s={},r=[],o=n.isWebGL2?e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS):0;function l(_,g){let b=g.program;i.uniformBlockBinding(_,b)}function c(_,g){let b=a[_.id];b===void 0&&(v(_),b=h(_),a[_.id]=b,_.addEventListener("dispose",m));let T=g.program;i.updateUBOMapping(_,T);let R=t.render.frame;s[_.id]!==R&&(f(_),s[_.id]=R)}function h(_){let g=d();_.__bindingPointIndex=g;let b=e.createBuffer(),T=_.__size,R=_.usage;return e.bindBuffer(e.UNIFORM_BUFFER,b),e.bufferData(e.UNIFORM_BUFFER,T,R),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,g,b),b}function d(){for(let _=0;_<o;_++)if(r.indexOf(_)===-1)return r.push(_),_;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(_){let g=a[_.id],b=_.uniforms,T=_.__cache;e.bindBuffer(e.UNIFORM_BUFFER,g);for(let R=0,w=b.length;R<w;R++){let U=b[R];if(p(U,R,T)===!0){let x=U.__offset,A=Array.isArray(U.value)?U.value:[U.value],F=0;for(let Y=0;Y<A.length;Y++){let $=A[Y],L=y($);typeof $=="number"?(U.__data[0]=$,e.bufferSubData(e.UNIFORM_BUFFER,x+F,U.__data)):$.isMatrix3?(U.__data[0]=$.elements[0],U.__data[1]=$.elements[1],U.__data[2]=$.elements[2],U.__data[3]=$.elements[0],U.__data[4]=$.elements[3],U.__data[5]=$.elements[4],U.__data[6]=$.elements[5],U.__data[7]=$.elements[0],U.__data[8]=$.elements[6],U.__data[9]=$.elements[7],U.__data[10]=$.elements[8],U.__data[11]=$.elements[0]):($.toArray(U.__data,F),F+=L.storage/Float32Array.BYTES_PER_ELEMENT)}e.bufferSubData(e.UNIFORM_BUFFER,x,U.__data)}}e.bindBuffer(e.UNIFORM_BUFFER,null)}function p(_,g,b){let T=_.value;if(b[g]===void 0){if(typeof T=="number")b[g]=T;else{let R=Array.isArray(T)?T:[T],w=[];for(let U=0;U<R.length;U++)w.push(R[U].clone());b[g]=w}return!0}else if(typeof T=="number"){if(b[g]!==T)return b[g]=T,!0}else{let R=Array.isArray(b[g])?b[g]:[b[g]],w=Array.isArray(T)?T:[T];for(let U=0;U<R.length;U++){let x=R[U];if(x.equals(w[U])===!1)return x.copy(w[U]),!0}}return!1}function v(_){let g=_.uniforms,b=0,T=16,R=0;for(let w=0,U=g.length;w<U;w++){let x=g[w],A={boundary:0,storage:0},F=Array.isArray(x.value)?x.value:[x.value];for(let Y=0,$=F.length;Y<$;Y++){let L=F[Y],H=y(L);A.boundary+=H.boundary,A.storage+=H.storage}if(x.__data=new Float32Array(A.storage/Float32Array.BYTES_PER_ELEMENT),x.__offset=b,w>0){R=b%T;let Y=T-R;R!==0&&Y-A.boundary<0&&(b+=T-R,x.__offset=b)}b+=A.storage}return R=b%T,R>0&&(b+=T-R),_.__size=b,_.__cache={},this}function y(_){let g={boundary:0,storage:0};return typeof _=="number"?(g.boundary=4,g.storage=4):_.isVector2?(g.boundary=8,g.storage=8):_.isVector3||_.isColor?(g.boundary=16,g.storage=12):_.isVector4?(g.boundary=16,g.storage=16):_.isMatrix3?(g.boundary=48,g.storage=48):_.isMatrix4?(g.boundary=64,g.storage=64):_.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",_),g}function m(_){let g=_.target;g.removeEventListener("dispose",m);let b=r.indexOf(g.__bindingPointIndex);r.splice(b,1),e.deleteBuffer(a[g.id]),delete a[g.id],delete s[g.id]}function u(){for(let _ in a)e.deleteBuffer(a[_]);r=[],a={},s={}}return{bind:l,update:c,dispose:u}}var Pp=class{constructor(t={}){let{canvas:n=cE(),context:i=null,depth:a=!0,stencil:s=!0,alpha:r=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1}=t;this.isWebGLRenderer=!0;let f;i!==null?f=i.getContextAttributes().alpha:f=r;let p=new Uint32Array(4),v=new Int32Array(4),y=null,m=null,u=[],_=[];this.domElement=n,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=Qe,this._useLegacyLights=!1,this.toneMapping=Ba,this.toneMappingExposure=1;let g=this,b=!1,T=0,R=0,w=null,U=-1,x=null,A=new Ke,F=new Ke,Y=null,$=new te(0),L=0,H=n.width,q=n.height,k=1,Q=null,X=null,j=new Ke(0,0,H,q),tt=new Ke(0,0,H,q),dt=!1,V=new Lu,Z=!1,ct=!1,gt=null,_t=new an,Ut=new oe,Lt=new I,At={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};function Nt(){return w===null?k:1}let N=i;function Fe(M,D){for(let z=0;z<M.length;z++){let B=M[z],P=n.getContext(B,D);if(P!==null)return P}return null}try{let M={alpha:!0,depth:a,stencil:s,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in n&&n.setAttribute("data-engine","three.js r159"),n.addEventListener("webglcontextlost",qt,!1),n.addEventListener("webglcontextrestored",C,!1),n.addEventListener("webglcontextcreationerror",ht,!1),N===null){let D=["webgl2","webgl","experimental-webgl"];if(g.isWebGL1Renderer===!0&&D.shift(),N=Fe(D,M),N===null)throw Fe(D)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}typeof WebGLRenderingContext<"u"&&N instanceof WebGLRenderingContext&&console.warn("THREE.WebGLRenderer: WebGL 1 support was deprecated in r153 and will be removed in r163."),N.getShaderPrecisionFormat===void 0&&(N.getShaderPrecisionFormat=function(){return{rangeMin:1,rangeMax:1,precision:1}})}catch(M){throw console.error("THREE.WebGLRenderer: "+M.message),M}let xt,Ht,bt,_e,rt,pt,Ot,he,Ce,E,S,O,it,K,at,vt,ot,ut,wt,Qt,nt,ie,Pt,Rt;function St(){xt=new yw(N),Ht=new dw(N,xt,t),xt.init(Ht),ie=new JR(N,xt,Ht),bt=new ZR(N,xt,Ht),_e=new bw(N),rt=new zR,pt=new jR(N,xt,bt,rt,Ht,ie,_e),Ot=new mw(g),he=new vw(g),Ce=new LE(N,Ht),Pt=new hw(N,xt,Ce,Ht),E=new xw(N,Ce,_e,Pt),S=new Aw(N,E,Ce,_e),wt=new Tw(N,Ht,pt),vt=new pw(rt),O=new PR(g,Ot,he,xt,Ht,Pt,vt),it=new KR(g,rt),K=new BR,at=new WR(xt,Ht),ut=new uw(g,Ot,he,bt,S,f,l),ot=new YR(g,S,Ht),Rt=new $R(N,_e,Ht,bt),Qt=new fw(N,xt,_e,Ht),nt=new Sw(N,xt,_e,Ht),_e.programs=O.programs,g.capabilities=Ht,g.extensions=xt,g.properties=rt,g.renderLists=K,g.shadowMap=ot,g.state=bt,g.info=_e}St();let mt=new Op(g,N);this.xr=mt,this.getContext=function(){return N},this.getContextAttributes=function(){return N.getContextAttributes()},this.forceContextLoss=function(){let M=xt.get("WEBGL_lose_context");M&&M.loseContext()},this.forceContextRestore=function(){let M=xt.get("WEBGL_lose_context");M&&M.restoreContext()},this.getPixelRatio=function(){return k},this.setPixelRatio=function(M){M!==void 0&&(k=M,this.setSize(H,q,!1))},this.getSize=function(M){return M.set(H,q)},this.setSize=function(M,D,z=!0){if(mt.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}H=M,q=D,n.width=Math.floor(M*k),n.height=Math.floor(D*k),z===!0&&(n.style.width=M+"px",n.style.height=D+"px"),this.setViewport(0,0,M,D)},this.getDrawingBufferSize=function(M){return M.set(H*k,q*k).floor()},this.setDrawingBufferSize=function(M,D,z){H=M,q=D,k=z,n.width=Math.floor(M*z),n.height=Math.floor(D*z),this.setViewport(0,0,M,D)},this.getCurrentViewport=function(M){return M.copy(A)},this.getViewport=function(M){return M.copy(j)},this.setViewport=function(M,D,z,B){M.isVector4?j.set(M.x,M.y,M.z,M.w):j.set(M,D,z,B),bt.viewport(A.copy(j).multiplyScalar(k).floor())},this.getScissor=function(M){return M.copy(tt)},this.setScissor=function(M,D,z,B){M.isVector4?tt.set(M.x,M.y,M.z,M.w):tt.set(M,D,z,B),bt.scissor(F.copy(tt).multiplyScalar(k).floor())},this.getScissorTest=function(){return dt},this.setScissorTest=function(M){bt.setScissorTest(dt=M)},this.setOpaqueSort=function(M){Q=M},this.setTransparentSort=function(M){X=M},this.getClearColor=function(M){return M.copy(ut.getClearColor())},this.setClearColor=function(){ut.setClearColor.apply(ut,arguments)},this.getClearAlpha=function(){return ut.getClearAlpha()},this.setClearAlpha=function(){ut.setClearAlpha.apply(ut,arguments)},this.clear=function(M=!0,D=!0,z=!0){let B=0;if(M){let P=!1;if(w!==null){let ft=w.texture.format;P=ft===Lx||ft===Cx||ft===Rx}if(P){let ft=w.texture.type,yt=ft===Fa||ft===Pa||ft===Yp||ft===_s||ft===Ax||ft===wx,Mt=ut.getClearColor(),Ct=ut.getClearAlpha(),Vt=Mt.r,zt=Mt.g,Bt=Mt.b;yt?(p[0]=Vt,p[1]=zt,p[2]=Bt,p[3]=Ct,N.clearBufferuiv(N.COLOR,0,p)):(v[0]=Vt,v[1]=zt,v[2]=Bt,v[3]=Ct,N.clearBufferiv(N.COLOR,0,v))}else B|=N.COLOR_BUFFER_BIT}D&&(B|=N.DEPTH_BUFFER_BIT),z&&(B|=N.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),N.clear(B)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){n.removeEventListener("webglcontextlost",qt,!1),n.removeEventListener("webglcontextrestored",C,!1),n.removeEventListener("webglcontextcreationerror",ht,!1),K.dispose(),at.dispose(),rt.dispose(),Ot.dispose(),he.dispose(),S.dispose(),Pt.dispose(),Rt.dispose(),O.dispose(),mt.dispose(),mt.removeEventListener("sessionstart",sn),mt.removeEventListener("sessionend",ce),gt&&(gt.dispose(),gt=null),rn.stop()};function qt(M){M.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),b=!0}function C(){console.log("THREE.WebGLRenderer: Context Restored."),b=!1;let M=_e.autoReset,D=ot.enabled,z=ot.autoUpdate,B=ot.needsUpdate,P=ot.type;St(),_e.autoReset=M,ot.enabled=D,ot.autoUpdate=z,ot.needsUpdate=B,ot.type=P}function ht(M){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",M.statusMessage)}function et(M){let D=M.target;D.removeEventListener("dispose",et),G(D)}function G(M){st(M),rt.remove(M)}function st(M){let D=rt.get(M).programs;D!==void 0&&(D.forEach(function(z){O.releaseProgram(z)}),M.isShaderMaterial&&O.releaseShaderCache(M))}this.renderBufferDirect=function(M,D,z,B,P,ft){D===null&&(D=At);let yt=P.isMesh&&P.matrixWorld.determinant()<0,Mt=oS(M,D,z,B,P);bt.setMaterial(B,yt);let Ct=z.index,Vt=1;if(B.wireframe===!0){if(Ct=E.getWireframeAttribute(z),Ct===void 0)return;Vt=2}let zt=z.drawRange,Bt=z.attributes.position,Te=zt.start*Vt,bn=(zt.start+zt.count)*Vt;ft!==null&&(Te=Math.max(Te,ft.start*Vt),bn=Math.min(bn,(ft.start+ft.count)*Vt)),Ct!==null?(Te=Math.max(Te,0),bn=Math.min(bn,Ct.count)):Bt!=null&&(Te=Math.max(Te,0),bn=Math.min(bn,Bt.count));let Ve=bn-Te;if(Ve<0||Ve===1/0)return;Pt.setup(P,B,Mt,z,Ct);let bi,Se=Qt;if(Ct!==null&&(bi=Ce.get(Ct),Se=nt,Se.setIndex(bi)),P.isMesh)B.wireframe===!0?(bt.setLineWidth(B.wireframeLinewidth*Nt()),Se.setMode(N.LINES)):Se.setMode(N.TRIANGLES);else if(P.isLine){let Gt=B.linewidth;Gt===void 0&&(Gt=1),bt.setLineWidth(Gt*Nt()),P.isLineSegments?Se.setMode(N.LINES):P.isLineLoop?Se.setMode(N.LINE_LOOP):Se.setMode(N.LINE_STRIP)}else P.isPoints?Se.setMode(N.POINTS):P.isSprite&&Se.setMode(N.TRIANGLES);if(P.isBatchedMesh)Se.renderMultiDraw(P._multiDrawStarts,P._multiDrawCounts,P._multiDrawCount);else if(P.isInstancedMesh)Se.renderInstances(Te,Ve,P.count);else if(z.isInstancedBufferGeometry){let Gt=z._maxInstanceCount!==void 0?z._maxInstanceCount:1/0,Vu=Math.min(z.instanceCount,Gt);Se.renderInstances(Te,Ve,Vu)}else Se.render(Te,Ve)};function Tt(M,D,z){M.transparent===!0&&M.side===Ji&&M.forceSinglePass===!1?(M.side=Sn,M.needsUpdate=!0,dl(M,D,z),M.side=Ha,M.needsUpdate=!0,dl(M,D,z),M.side=Ji):dl(M,D,z)}this.compile=function(M,D,z=null){z===null&&(z=M),m=at.get(z),m.init(),_.push(m),z.traverseVisible(function(P){P.isLight&&P.layers.test(D.layers)&&(m.pushLight(P),P.castShadow&&m.pushShadow(P))}),M!==z&&M.traverseVisible(function(P){P.isLight&&P.layers.test(D.layers)&&(m.pushLight(P),P.castShadow&&m.pushShadow(P))}),m.setupLights(g._useLegacyLights);let B=new Set;return M.traverse(function(P){let ft=P.material;if(ft)if(Array.isArray(ft))for(let yt=0;yt<ft.length;yt++){let Mt=ft[yt];Tt(Mt,z,P),B.add(Mt)}else Tt(ft,z,P),B.add(ft)}),_.pop(),m=null,B},this.compileAsync=function(M,D,z=null){let B=this.compile(M,D,z);return new Promise(P=>{function ft(){if(B.forEach(function(yt){rt.get(yt).currentProgram.isReady()&&B.delete(yt)}),B.size===0){P(M);return}setTimeout(ft,10)}xt.get("KHR_parallel_shader_compile")!==null?ft():setTimeout(ft,10)})};let jt=null;function He(M){jt&&jt(M)}function sn(){rn.stop()}function ce(){rn.start()}let rn=new Ix;rn.setAnimationLoop(He),typeof self<"u"&&rn.setContext(self),this.setAnimationLoop=function(M){jt=M,mt.setAnimationLoop(M),M===null?rn.stop():rn.start()},mt.addEventListener("sessionstart",sn),mt.addEventListener("sessionend",ce),this.render=function(M,D){if(D!==void 0&&D.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(b===!0)return;M.matrixWorldAutoUpdate===!0&&M.updateMatrixWorld(),D.parent===null&&D.matrixWorldAutoUpdate===!0&&D.updateMatrixWorld(),mt.enabled===!0&&mt.isPresenting===!0&&(mt.cameraAutoUpdate===!0&&mt.updateCamera(D),D=mt.getCamera()),M.isScene===!0&&M.onBeforeRender(g,M,D,w),m=at.get(M,_.length),m.init(),_.push(m),_t.multiplyMatrices(D.projectionMatrix,D.matrixWorldInverse),V.setFromProjectionMatrix(_t),ct=this.localClippingEnabled,Z=vt.init(this.clippingPlanes,ct),y=K.get(M,u.length),y.init(),u.push(y),ci(M,D,0,g.sortObjects),y.finish(),g.sortObjects===!0&&y.sort(Q,X),this.info.render.frame++,Z===!0&&vt.beginShadows();let z=m.state.shadowsArray;if(ot.render(z,M,D),Z===!0&&vt.endShadows(),this.info.autoReset===!0&&this.info.reset(),ut.render(y,M),m.setupLights(g._useLegacyLights),D.isArrayCamera){let B=D.cameras;for(let P=0,ft=B.length;P<ft;P++){let yt=B[P];am(y,M,yt,yt.viewport)}}else am(y,M,D);w!==null&&(pt.updateMultisampleRenderTarget(w),pt.updateRenderTargetMipmap(w)),M.isScene===!0&&M.onAfterRender(g,M,D),Pt.resetDefaultState(),U=-1,x=null,_.pop(),_.length>0?m=_[_.length-1]:m=null,u.pop(),u.length>0?y=u[u.length-1]:y=null};function ci(M,D,z,B){if(M.visible===!1)return;if(M.layers.test(D.layers)){if(M.isGroup)z=M.renderOrder;else if(M.isLOD)M.autoUpdate===!0&&M.update(D);else if(M.isLight)m.pushLight(M),M.castShadow&&m.pushShadow(M);else if(M.isSprite){if(!M.frustumCulled||V.intersectsSprite(M)){B&&Lt.setFromMatrixPosition(M.matrixWorld).applyMatrix4(_t);let yt=S.update(M),Mt=M.material;Mt.visible&&y.push(M,yt,Mt,z,Lt.z,null)}}else if((M.isMesh||M.isLine||M.isPoints)&&(!M.frustumCulled||V.intersectsObject(M))){let yt=S.update(M),Mt=M.material;if(B&&(M.boundingSphere!==void 0?(M.boundingSphere===null&&M.computeBoundingSphere(),Lt.copy(M.boundingSphere.center)):(yt.boundingSphere===null&&yt.computeBoundingSphere(),Lt.copy(yt.boundingSphere.center)),Lt.applyMatrix4(M.matrixWorld).applyMatrix4(_t)),Array.isArray(Mt)){let Ct=yt.groups;for(let Vt=0,zt=Ct.length;Vt<zt;Vt++){let Bt=Ct[Vt],Te=Mt[Bt.materialIndex];Te&&Te.visible&&y.push(M,yt,Te,z,Lt.z,Bt)}}else Mt.visible&&y.push(M,yt,Mt,z,Lt.z,null)}}let ft=M.children;for(let yt=0,Mt=ft.length;yt<Mt;yt++)ci(ft[yt],D,z,B)}function am(M,D,z,B){let P=M.opaque,ft=M.transmissive,yt=M.transparent;m.setupLightsView(z),Z===!0&&vt.setGlobalState(g.clippingPlanes,z),ft.length>0&&rS(P,ft,D,z),B&&bt.viewport(A.copy(B)),P.length>0&&fl(P,D,z),ft.length>0&&fl(ft,D,z),yt.length>0&&fl(yt,D,z),bt.buffers.depth.setTest(!0),bt.buffers.depth.setMask(!0),bt.buffers.color.setMask(!0),bt.setPolygonOffset(!1)}function rS(M,D,z,B){if((z.isScene===!0?z.overrideMaterial:null)!==null)return;let ft=Ht.isWebGL2;gt===null&&(gt=new ta(1,1,{generateMipmaps:!0,type:xt.has("EXT_color_buffer_half_float")?ol:Fa,minFilter:rl,samples:ft?4:0})),g.getDrawingBufferSize(Ut),ft?gt.setSize(Ut.x,Ut.y):gt.setSize(_p(Ut.x),_p(Ut.y));let yt=g.getRenderTarget();g.setRenderTarget(gt),g.getClearColor($),L=g.getClearAlpha(),L<1&&g.setClearColor(16777215,.5),g.clear();let Mt=g.toneMapping;g.toneMapping=Ba,fl(M,z,B),pt.updateMultisampleRenderTarget(gt),pt.updateRenderTargetMipmap(gt);let Ct=!1;for(let Vt=0,zt=D.length;Vt<zt;Vt++){let Bt=D[Vt],Te=Bt.object,bn=Bt.geometry,Ve=Bt.material,bi=Bt.group;if(Ve.side===Ji&&Te.layers.test(B.layers)){let Se=Ve.side;Ve.side=Sn,Ve.needsUpdate=!0,sm(Te,z,B,bn,Ve,bi),Ve.side=Se,Ve.needsUpdate=!0,Ct=!0}}Ct===!0&&(pt.updateMultisampleRenderTarget(gt),pt.updateRenderTargetMipmap(gt)),g.setRenderTarget(yt),g.setClearColor($,L),g.toneMapping=Mt}function fl(M,D,z){let B=D.isScene===!0?D.overrideMaterial:null;for(let P=0,ft=M.length;P<ft;P++){let yt=M[P],Mt=yt.object,Ct=yt.geometry,Vt=B===null?yt.material:B,zt=yt.group;Mt.layers.test(z.layers)&&sm(Mt,D,z,Ct,Vt,zt)}}function sm(M,D,z,B,P,ft){M.onBeforeRender(g,D,z,B,P,ft),M.modelViewMatrix.multiplyMatrices(z.matrixWorldInverse,M.matrixWorld),M.normalMatrix.getNormalMatrix(M.modelViewMatrix),P.onBeforeRender(g,D,z,B,M,ft),P.transparent===!0&&P.side===Ji&&P.forceSinglePass===!1?(P.side=Sn,P.needsUpdate=!0,g.renderBufferDirect(z,D,B,P,M,ft),P.side=Ha,P.needsUpdate=!0,g.renderBufferDirect(z,D,B,P,M,ft),P.side=Ji):g.renderBufferDirect(z,D,B,P,M,ft),M.onAfterRender(g,D,z,B,P,ft)}function dl(M,D,z){D.isScene!==!0&&(D=At);let B=rt.get(M),P=m.state.lights,ft=m.state.shadowsArray,yt=P.state.version,Mt=O.getParameters(M,P.state,ft,D,z),Ct=O.getProgramCacheKey(Mt),Vt=B.programs;B.environment=M.isMeshStandardMaterial?D.environment:null,B.fog=D.fog,B.envMap=(M.isMeshStandardMaterial?he:Ot).get(M.envMap||B.environment),Vt===void 0&&(M.addEventListener("dispose",et),Vt=new Map,B.programs=Vt);let zt=Vt.get(Ct);if(zt!==void 0){if(B.currentProgram===zt&&B.lightsStateVersion===yt)return om(M,Mt),zt}else Mt.uniforms=O.getUniforms(M),M.onBuild(z,Mt,g),M.onBeforeCompile(Mt,g),zt=O.acquireProgram(Mt,Ct),Vt.set(Ct,zt),B.uniforms=Mt.uniforms;let Bt=B.uniforms;return(!M.isShaderMaterial&&!M.isRawShaderMaterial||M.clipping===!0)&&(Bt.clippingPlanes=vt.uniform),om(M,Mt),B.needsLights=cS(M),B.lightsStateVersion=yt,B.needsLights&&(Bt.ambientLightColor.value=P.state.ambient,Bt.lightProbe.value=P.state.probe,Bt.directionalLights.value=P.state.directional,Bt.directionalLightShadows.value=P.state.directionalShadow,Bt.spotLights.value=P.state.spot,Bt.spotLightShadows.value=P.state.spotShadow,Bt.rectAreaLights.value=P.state.rectArea,Bt.ltc_1.value=P.state.rectAreaLTC1,Bt.ltc_2.value=P.state.rectAreaLTC2,Bt.pointLights.value=P.state.point,Bt.pointLightShadows.value=P.state.pointShadow,Bt.hemisphereLights.value=P.state.hemi,Bt.directionalShadowMap.value=P.state.directionalShadowMap,Bt.directionalShadowMatrix.value=P.state.directionalShadowMatrix,Bt.spotShadowMap.value=P.state.spotShadowMap,Bt.spotLightMatrix.value=P.state.spotLightMatrix,Bt.spotLightMap.value=P.state.spotLightMap,Bt.pointShadowMap.value=P.state.pointShadowMap,Bt.pointShadowMatrix.value=P.state.pointShadowMatrix),B.currentProgram=zt,B.uniformsList=null,zt}function rm(M){if(M.uniformsList===null){let D=M.currentProgram.getUniforms();M.uniformsList=Hr.seqWithValue(D.seq,M.uniforms)}return M.uniformsList}function om(M,D){let z=rt.get(M);z.outputColorSpace=D.outputColorSpace,z.batching=D.batching,z.instancing=D.instancing,z.instancingColor=D.instancingColor,z.skinning=D.skinning,z.morphTargets=D.morphTargets,z.morphNormals=D.morphNormals,z.morphColors=D.morphColors,z.morphTargetsCount=D.morphTargetsCount,z.numClippingPlanes=D.numClippingPlanes,z.numIntersection=D.numClipIntersection,z.vertexAlphas=D.vertexAlphas,z.vertexTangents=D.vertexTangents,z.toneMapping=D.toneMapping}function oS(M,D,z,B,P){D.isScene!==!0&&(D=At),pt.resetTextureUnits();let ft=D.fog,yt=B.isMeshStandardMaterial?D.environment:null,Mt=w===null?g.outputColorSpace:w.isXRRenderTarget===!0?w.texture.colorSpace:$i,Ct=(B.isMeshStandardMaterial?he:Ot).get(B.envMap||yt),Vt=B.vertexColors===!0&&!!z.attributes.color&&z.attributes.color.itemSize===4,zt=!!z.attributes.tangent&&(!!B.normalMap||B.anisotropy>0),Bt=!!z.morphAttributes.position,Te=!!z.morphAttributes.normal,bn=!!z.morphAttributes.color,Ve=Ba;B.toneMapped&&(w===null||w.isXRRenderTarget===!0)&&(Ve=g.toneMapping);let bi=z.morphAttributes.position||z.morphAttributes.normal||z.morphAttributes.color,Se=bi!==void 0?bi.length:0,Gt=rt.get(B),Vu=m.state.lights;if(Z===!0&&(ct===!0||M!==x)){let In=M===x&&B.id===U;vt.setState(B,M,In)}let be=!1;B.version===Gt.__version?(Gt.needsLights&&Gt.lightsStateVersion!==Vu.state.version||Gt.outputColorSpace!==Mt||P.isBatchedMesh&&Gt.batching===!1||!P.isBatchedMesh&&Gt.batching===!0||P.isInstancedMesh&&Gt.instancing===!1||!P.isInstancedMesh&&Gt.instancing===!0||P.isSkinnedMesh&&Gt.skinning===!1||!P.isSkinnedMesh&&Gt.skinning===!0||P.isInstancedMesh&&Gt.instancingColor===!0&&P.instanceColor===null||P.isInstancedMesh&&Gt.instancingColor===!1&&P.instanceColor!==null||Gt.envMap!==Ct||B.fog===!0&&Gt.fog!==ft||Gt.numClippingPlanes!==void 0&&(Gt.numClippingPlanes!==vt.numPlanes||Gt.numIntersection!==vt.numIntersection)||Gt.vertexAlphas!==Vt||Gt.vertexTangents!==zt||Gt.morphTargets!==Bt||Gt.morphNormals!==Te||Gt.morphColors!==bn||Gt.toneMapping!==Ve||Ht.isWebGL2===!0&&Gt.morphTargetsCount!==Se)&&(be=!0):(be=!0,Gt.__version=B.version);let Ga=Gt.currentProgram;be===!0&&(Ga=dl(B,D,P));let lm=!1,jr=!1,Gu=!1,$e=Ga.getUniforms(),ka=Gt.uniforms;if(bt.useProgram(Ga.program)&&(lm=!0,jr=!0,Gu=!0),B.id!==U&&(U=B.id,jr=!0),lm||x!==M){$e.setValue(N,"projectionMatrix",M.projectionMatrix),$e.setValue(N,"viewMatrix",M.matrixWorldInverse);let In=$e.map.cameraPosition;In!==void 0&&In.setValue(N,Lt.setFromMatrixPosition(M.matrixWorld)),Ht.logarithmicDepthBuffer&&$e.setValue(N,"logDepthBufFC",2/(Math.log(M.far+1)/Math.LN2)),(B.isMeshPhongMaterial||B.isMeshToonMaterial||B.isMeshLambertMaterial||B.isMeshBasicMaterial||B.isMeshStandardMaterial||B.isShaderMaterial)&&$e.setValue(N,"isOrthographic",M.isOrthographicCamera===!0),x!==M&&(x=M,jr=!0,Gu=!0)}if(P.isSkinnedMesh){$e.setOptional(N,P,"bindMatrix"),$e.setOptional(N,P,"bindMatrixInverse");let In=P.skeleton;In&&(Ht.floatVertexTextures?(In.boneTexture===null&&In.computeBoneTexture(),$e.setValue(N,"boneTexture",In.boneTexture,pt)):console.warn("THREE.WebGLRenderer: SkinnedMesh can only be used with WebGL 2. With WebGL 1 OES_texture_float and vertex textures support is required."))}P.isBatchedMesh&&($e.setOptional(N,P,"batchingTexture"),$e.setValue(N,"batchingTexture",P._matricesTexture,pt));let ku=z.morphAttributes;if((ku.position!==void 0||ku.normal!==void 0||ku.color!==void 0&&Ht.isWebGL2===!0)&&wt.update(P,z,Ga),(jr||Gt.receiveShadow!==P.receiveShadow)&&(Gt.receiveShadow=P.receiveShadow,$e.setValue(N,"receiveShadow",P.receiveShadow)),B.isMeshGouraudMaterial&&B.envMap!==null&&(ka.envMap.value=Ct,ka.flipEnvMap.value=Ct.isCubeTexture&&Ct.isRenderTargetTexture===!1?-1:1),jr&&($e.setValue(N,"toneMappingExposure",g.toneMappingExposure),Gt.needsLights&&lS(ka,Gu),ft&&B.fog===!0&&it.refreshFogUniforms(ka,ft),it.refreshMaterialUniforms(ka,B,k,q,gt),Hr.upload(N,rm(Gt),ka,pt)),B.isShaderMaterial&&B.uniformsNeedUpdate===!0&&(Hr.upload(N,rm(Gt),ka,pt),B.uniformsNeedUpdate=!1),B.isSpriteMaterial&&$e.setValue(N,"center",P.center),$e.setValue(N,"modelViewMatrix",P.modelViewMatrix),$e.setValue(N,"normalMatrix",P.normalMatrix),$e.setValue(N,"modelMatrix",P.matrixWorld),B.isShaderMaterial||B.isRawShaderMaterial){let In=B.uniformsGroups;for(let Wu=0,uS=In.length;Wu<uS;Wu++)if(Ht.isWebGL2){let cm=In[Wu];Rt.update(cm,Ga),Rt.bind(cm,Ga)}else console.warn("THREE.WebGLRenderer: Uniform Buffer Objects can only be used with WebGL 2.")}return Ga}function lS(M,D){M.ambientLightColor.needsUpdate=D,M.lightProbe.needsUpdate=D,M.directionalLights.needsUpdate=D,M.directionalLightShadows.needsUpdate=D,M.pointLights.needsUpdate=D,M.pointLightShadows.needsUpdate=D,M.spotLights.needsUpdate=D,M.spotLightShadows.needsUpdate=D,M.rectAreaLights.needsUpdate=D,M.hemisphereLights.needsUpdate=D}function cS(M){return M.isMeshLambertMaterial||M.isMeshToonMaterial||M.isMeshPhongMaterial||M.isMeshStandardMaterial||M.isShadowMaterial||M.isShaderMaterial&&M.lights===!0}this.getActiveCubeFace=function(){return T},this.getActiveMipmapLevel=function(){return R},this.getRenderTarget=function(){return w},this.setRenderTargetTextures=function(M,D,z){rt.get(M.texture).__webglTexture=D,rt.get(M.depthTexture).__webglTexture=z;let B=rt.get(M);B.__hasExternalTextures=!0,B.__hasExternalTextures&&(B.__autoAllocateDepthBuffer=z===void 0,B.__autoAllocateDepthBuffer||xt.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),B.__useRenderToTexture=!1))},this.setRenderTargetFramebuffer=function(M,D){let z=rt.get(M);z.__webglFramebuffer=D,z.__useDefaultFramebuffer=D===void 0},this.setRenderTarget=function(M,D=0,z=0){w=M,T=D,R=z;let B=!0,P=null,ft=!1,yt=!1;if(M){let Ct=rt.get(M);Ct.__useDefaultFramebuffer!==void 0?(bt.bindFramebuffer(N.FRAMEBUFFER,null),B=!1):Ct.__webglFramebuffer===void 0?pt.setupRenderTarget(M):Ct.__hasExternalTextures&&pt.rebindTextures(M,rt.get(M.texture).__webglTexture,rt.get(M.depthTexture).__webglTexture);let Vt=M.texture;(Vt.isData3DTexture||Vt.isDataArrayTexture||Vt.isCompressedArrayTexture)&&(yt=!0);let zt=rt.get(M).__webglFramebuffer;M.isWebGLCubeRenderTarget?(Array.isArray(zt[D])?P=zt[D][z]:P=zt[D],ft=!0):Ht.isWebGL2&&M.samples>0&&pt.useMultisampledRTT(M)===!1?P=rt.get(M).__webglMultisampledFramebuffer:Array.isArray(zt)?P=zt[z]:P=zt,A.copy(M.viewport),F.copy(M.scissor),Y=M.scissorTest}else A.copy(j).multiplyScalar(k).floor(),F.copy(tt).multiplyScalar(k).floor(),Y=dt;if(bt.bindFramebuffer(N.FRAMEBUFFER,P)&&Ht.drawBuffers&&B&&bt.drawBuffers(M,P),bt.viewport(A),bt.scissor(F),bt.setScissorTest(Y),ft){let Ct=rt.get(M.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_CUBE_MAP_POSITIVE_X+D,Ct.__webglTexture,z)}else if(yt){let Ct=rt.get(M.texture),Vt=D||0;N.framebufferTextureLayer(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,Ct.__webglTexture,z||0,Vt)}U=-1},this.readRenderTargetPixels=function(M,D,z,B,P,ft,yt){if(!(M&&M.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Mt=rt.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&yt!==void 0&&(Mt=Mt[yt]),Mt){bt.bindFramebuffer(N.FRAMEBUFFER,Mt);try{let Ct=M.texture,Vt=Ct.format,zt=Ct.type;if(Vt!==ri&&ie.convert(Vt)!==N.getParameter(N.IMPLEMENTATION_COLOR_READ_FORMAT)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}let Bt=zt===ol&&(xt.has("EXT_color_buffer_half_float")||Ht.isWebGL2&&xt.has("EXT_color_buffer_float"));if(zt!==Fa&&ie.convert(zt)!==N.getParameter(N.IMPLEMENTATION_COLOR_READ_TYPE)&&!(zt===za&&(Ht.isWebGL2||xt.has("OES_texture_float")||xt.has("WEBGL_color_buffer_float")))&&!Bt){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}D>=0&&D<=M.width-B&&z>=0&&z<=M.height-P&&N.readPixels(D,z,B,P,ie.convert(Vt),ie.convert(zt),ft)}finally{let Ct=w!==null?rt.get(w).__webglFramebuffer:null;bt.bindFramebuffer(N.FRAMEBUFFER,Ct)}}},this.copyFramebufferToTexture=function(M,D,z=0){let B=Math.pow(2,-z),P=Math.floor(D.image.width*B),ft=Math.floor(D.image.height*B);pt.setTexture2D(D,0),N.copyTexSubImage2D(N.TEXTURE_2D,z,0,0,M.x,M.y,P,ft),bt.unbindTexture()},this.copyTextureToTexture=function(M,D,z,B=0){let P=D.image.width,ft=D.image.height,yt=ie.convert(z.format),Mt=ie.convert(z.type);pt.setTexture2D(z,0),N.pixelStorei(N.UNPACK_FLIP_Y_WEBGL,z.flipY),N.pixelStorei(N.UNPACK_PREMULTIPLY_ALPHA_WEBGL,z.premultiplyAlpha),N.pixelStorei(N.UNPACK_ALIGNMENT,z.unpackAlignment),D.isDataTexture?N.texSubImage2D(N.TEXTURE_2D,B,M.x,M.y,P,ft,yt,Mt,D.image.data):D.isCompressedTexture?N.compressedTexSubImage2D(N.TEXTURE_2D,B,M.x,M.y,D.mipmaps[0].width,D.mipmaps[0].height,yt,D.mipmaps[0].data):N.texSubImage2D(N.TEXTURE_2D,B,M.x,M.y,yt,Mt,D.image),B===0&&z.generateMipmaps&&N.generateMipmap(N.TEXTURE_2D),bt.unbindTexture()},this.copyTextureToTexture3D=function(M,D,z,B,P=0){if(g.isWebGL1Renderer){console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: can only be used with WebGL2.");return}let ft=M.max.x-M.min.x+1,yt=M.max.y-M.min.y+1,Mt=M.max.z-M.min.z+1,Ct=ie.convert(B.format),Vt=ie.convert(B.type),zt;if(B.isData3DTexture)pt.setTexture3D(B,0),zt=N.TEXTURE_3D;else if(B.isDataArrayTexture)pt.setTexture2DArray(B,0),zt=N.TEXTURE_2D_ARRAY;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}N.pixelStorei(N.UNPACK_FLIP_Y_WEBGL,B.flipY),N.pixelStorei(N.UNPACK_PREMULTIPLY_ALPHA_WEBGL,B.premultiplyAlpha),N.pixelStorei(N.UNPACK_ALIGNMENT,B.unpackAlignment);let Bt=N.getParameter(N.UNPACK_ROW_LENGTH),Te=N.getParameter(N.UNPACK_IMAGE_HEIGHT),bn=N.getParameter(N.UNPACK_SKIP_PIXELS),Ve=N.getParameter(N.UNPACK_SKIP_ROWS),bi=N.getParameter(N.UNPACK_SKIP_IMAGES),Se=z.isCompressedTexture?z.mipmaps[0]:z.image;N.pixelStorei(N.UNPACK_ROW_LENGTH,Se.width),N.pixelStorei(N.UNPACK_IMAGE_HEIGHT,Se.height),N.pixelStorei(N.UNPACK_SKIP_PIXELS,M.min.x),N.pixelStorei(N.UNPACK_SKIP_ROWS,M.min.y),N.pixelStorei(N.UNPACK_SKIP_IMAGES,M.min.z),z.isDataTexture||z.isData3DTexture?N.texSubImage3D(zt,P,D.x,D.y,D.z,ft,yt,Mt,Ct,Vt,Se.data):z.isCompressedArrayTexture?(console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: untested support for compressed srcTexture."),N.compressedTexSubImage3D(zt,P,D.x,D.y,D.z,ft,yt,Mt,Ct,Se.data)):N.texSubImage3D(zt,P,D.x,D.y,D.z,ft,yt,Mt,Ct,Vt,Se),N.pixelStorei(N.UNPACK_ROW_LENGTH,Bt),N.pixelStorei(N.UNPACK_IMAGE_HEIGHT,Te),N.pixelStorei(N.UNPACK_SKIP_PIXELS,bn),N.pixelStorei(N.UNPACK_SKIP_ROWS,Ve),N.pixelStorei(N.UNPACK_SKIP_IMAGES,bi),P===0&&B.generateMipmaps&&N.generateMipmap(zt),bt.unbindTexture()},this.initTexture=function(M){M.isCubeTexture?pt.setTextureCube(M,0):M.isData3DTexture?pt.setTexture3D(M,0):M.isDataArrayTexture||M.isCompressedArrayTexture?pt.setTexture2DArray(M,0):pt.setTexture2D(M,0),bt.unbindTexture()},this.resetState=function(){T=0,R=0,w=null,bt.reset(),Pt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Qi}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;let n=this.getContext();n.drawingBufferColorSpace=t===Zp?"display-p3":"srgb",n.unpackColorSpace=re.workingColorSpace===Ou?"display-p3":"srgb"}get physicallyCorrectLights(){return console.warn("THREE.WebGLRenderer: The property .physicallyCorrectLights has been removed. Set renderer.useLegacyLights instead."),!this.useLegacyLights}set physicallyCorrectLights(t){console.warn("THREE.WebGLRenderer: The property .physicallyCorrectLights has been removed. Set renderer.useLegacyLights instead."),this.useLegacyLights=!t}get outputEncoding(){return console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace===Qe?ys:Ux}set outputEncoding(t){console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace=t===ys?Qe:$i}get useLegacyLights(){return console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights}set useLegacyLights(t){console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights=t}},zp=class extends Pp{};zp.prototype.isWebGL1Renderer=!0;function fu(e,t,n){return!e||!n&&e.constructor===t?e:typeof t.BYTES_PER_ELEMENT=="number"?new t(e):Array.prototype.slice.call(e)}function tC(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}var Yr=class{constructor(t,n,i,a){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=a!==void 0?a:new n.constructor(i),this.sampleValues=n,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(t){let n=this.parameterPositions,i=this._cachedIndex,a=n[i],s=n[i-1];t:{e:{let r;n:{i:if(!(t<a)){for(let o=i+2;;){if(a===void 0){if(t<s)break i;return i=n.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===o)break;if(s=a,a=n[++i],t<a)break e}r=n.length;break n}if(!(t>=s)){let o=n[1];t<o&&(i=2,s=o);for(let l=i-2;;){if(s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===l)break;if(a=s,s=n[--i-1],t>=s)break e}r=i,i=0;break n}break t}for(;i<r;){let o=i+r>>>1;t<n[o]?r=o:i=o+1}if(a=n[i],s=n[i-1],s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(a===void 0)return i=n.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,s,a)}return this.interpolate_(i,s,t,a)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let n=this.resultBuffer,i=this.sampleValues,a=this.valueSize,s=t*a;for(let r=0;r!==a;++r)n[r]=i[s+r];return n}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},Ip=class extends Yr{constructor(t,n,i,a){super(t,n,i,a),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Uy,endingEnd:Uy}}intervalChanged_(t,n,i){let a=this.parameterPositions,s=t-2,r=t+1,o=a[s],l=a[r];if(o===void 0)switch(this.getSettings_().endingStart){case Ny:s=t,o=2*n-i;break;case Oy:s=a.length-2,o=n+a[s]-a[s+1];break;default:s=t,o=i}if(l===void 0)switch(this.getSettings_().endingEnd){case Ny:r=t,l=2*i-n;break;case Oy:r=1,l=i+a[1]-a[0];break;default:r=t-1,l=n}let c=(i-n)*.5,h=this.valueSize;this._weightPrev=c/(n-o),this._weightNext=c/(l-i),this._offsetPrev=s*h,this._offsetNext=r*h}interpolate_(t,n,i,a){let s=this.resultBuffer,r=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,h=this._offsetPrev,d=this._offsetNext,f=this._weightPrev,p=this._weightNext,v=(i-n)/(a-n),y=v*v,m=y*v,u=-f*m+2*f*y-f*v,_=(1+f)*m+(-1.5-2*f)*y+(-.5+f)*v+1,g=(-1-p)*m+(1.5+p)*y+.5*v,b=p*m-p*y;for(let T=0;T!==o;++T)s[T]=u*r[h+T]+_*r[c+T]+g*r[l+T]+b*r[d+T];return s}},Bp=class extends Yr{constructor(t,n,i,a){super(t,n,i,a)}interpolate_(t,n,i,a){let s=this.resultBuffer,r=this.sampleValues,o=this.valueSize,l=t*o,c=l-o,h=(i-n)/(a-n),d=1-h;for(let f=0;f!==o;++f)s[f]=r[c+f]*d+r[l+f]*h;return s}},Fp=class extends Yr{constructor(t,n,i,a){super(t,n,i,a)}interpolate_(t){return this.copySampleValue_(t-1)}},li=class{constructor(t,n,i,a){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(n===void 0||n.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=fu(n,this.TimeBufferType),this.values=fu(i,this.ValueBufferType),this.setInterpolation(a||this.DefaultInterpolation)}static toJSON(t){let n=t.constructor,i;if(n.toJSON!==this.toJSON)i=n.toJSON(t);else{i={name:t.name,times:fu(t.times,Array),values:fu(t.values,Array)};let a=t.getInterpolation();a!==t.DefaultInterpolation&&(i.interpolation=a)}return i.type=t.ValueTypeName,i}InterpolantFactoryMethodDiscrete(t){return new Fp(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new Bp(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new Ip(this.times,this.values,this.getValueSize(),t)}setInterpolation(t){let n;switch(t){case pu:n=this.InterpolantFactoryMethodDiscrete;break;case mu:n=this.InterpolantFactoryMethodLinear;break;case Bd:n=this.InterpolantFactoryMethodSmooth;break}if(n===void 0){let i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return console.warn("THREE.KeyframeTrack:",i),this}return this.createInterpolant=n,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return pu;case this.InterpolantFactoryMethodLinear:return mu;case this.InterpolantFactoryMethodSmooth:return Bd}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let n=this.times;for(let i=0,a=n.length;i!==a;++i)n[i]+=t}return this}scale(t){if(t!==1){let n=this.times;for(let i=0,a=n.length;i!==a;++i)n[i]*=t}return this}trim(t,n){let i=this.times,a=i.length,s=0,r=a-1;for(;s!==a&&i[s]<t;)++s;for(;r!==-1&&i[r]>n;)--r;if(++r,s!==0||r!==a){s>=r&&(r=Math.max(r,1),s=r-1);let o=this.getValueSize();this.times=i.slice(s,r),this.values=this.values.slice(s*o,r*o)}return this}validate(){let t=!0,n=this.getValueSize();n-Math.floor(n)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),t=!1);let i=this.times,a=this.values,s=i.length;s===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),t=!1);let r=null;for(let o=0;o!==s;o++){let l=i[o];if(typeof l=="number"&&isNaN(l)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,o,l),t=!1;break}if(r!==null&&r>l){console.error("THREE.KeyframeTrack: Out of order keys.",this,o,l,r),t=!1;break}r=l}if(a!==void 0&&tC(a))for(let o=0,l=a.length;o!==l;++o){let c=a[o];if(isNaN(c)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,o,c),t=!1;break}}return t}optimize(){let t=this.times.slice(),n=this.values.slice(),i=this.getValueSize(),a=this.getInterpolation()===Bd,s=t.length-1,r=1;for(let o=1;o<s;++o){let l=!1,c=t[o],h=t[o+1];if(c!==h&&(o!==1||c!==t[0]))if(a)l=!0;else{let d=o*i,f=d-i,p=d+i;for(let v=0;v!==i;++v){let y=n[d+v];if(y!==n[f+v]||y!==n[p+v]){l=!0;break}}}if(l){if(o!==r){t[r]=t[o];let d=o*i,f=r*i;for(let p=0;p!==i;++p)n[f+p]=n[d+p]}++r}}if(s>0){t[r]=t[s];for(let o=s*i,l=r*i,c=0;c!==i;++c)n[l+c]=n[o+c];++r}return r!==t.length?(this.times=t.slice(0,r),this.values=n.slice(0,r*i)):(this.times=t,this.values=n),this}clone(){let t=this.times.slice(),n=this.values.slice(),i=this.constructor,a=new i(this.name,t,n);return a.createInterpolant=this.createInterpolant,a}};li.prototype.TimeBufferType=Float32Array;li.prototype.ValueBufferType=Float32Array;li.prototype.DefaultInterpolation=mu;var bs=class extends li{};bs.prototype.ValueTypeName="bool";bs.prototype.ValueBufferType=Array;bs.prototype.DefaultInterpolation=pu;bs.prototype.InterpolantFactoryMethodLinear=void 0;bs.prototype.InterpolantFactoryMethodSmooth=void 0;var Hp=class extends li{};Hp.prototype.ValueTypeName="color";var Vp=class extends li{};Vp.prototype.ValueTypeName="number";var Gp=class extends Yr{constructor(t,n,i,a){super(t,n,i,a)}interpolate_(t,n,i,a){let s=this.resultBuffer,r=this.sampleValues,o=this.valueSize,l=(i-n)/(a-n),c=t*o;for(let h=c+o;c!==h;c+=4)zn.slerpFlat(s,0,r,c-o,r,c,l);return s}},ul=class extends li{InterpolantFactoryMethodLinear(t){return new Gp(this.times,this.values,this.getValueSize(),t)}};ul.prototype.ValueTypeName="quaternion";ul.prototype.DefaultInterpolation=mu;ul.prototype.InterpolantFactoryMethodSmooth=void 0;var Ms=class extends li{};Ms.prototype.ValueTypeName="string";Ms.prototype.ValueBufferType=Array;Ms.prototype.DefaultInterpolation=pu;Ms.prototype.InterpolantFactoryMethodLinear=void 0;Ms.prototype.InterpolantFactoryMethodSmooth=void 0;var kp=class extends li{};kp.prototype.ValueTypeName="vector";var Wp=class{constructor(t,n,i){let a=this,s=!1,r=0,o=0,l,c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=n,this.onError=i,this.itemStart=function(h){o++,s===!1&&a.onStart!==void 0&&a.onStart(h,r,o),s=!0},this.itemEnd=function(h){r++,a.onProgress!==void 0&&a.onProgress(h,r,o),r===o&&(s=!1,a.onLoad!==void 0&&a.onLoad())},this.itemError=function(h){a.onError!==void 0&&a.onError(h)},this.resolveURL=function(h){return l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,d){return c.push(h,d),this},this.removeHandler=function(h){let d=c.indexOf(h);return d!==-1&&c.splice(d,2),this},this.getHandler=function(h){for(let d=0,f=c.length;d<f;d+=2){let p=c[d],v=c[d+1];if(p.global&&(p.lastIndex=0),p.test(h))return v}return null}}},eC=new Wp,Xp=class{constructor(t){this.manager=t!==void 0?t:eC,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(t,n){let i=this;return new Promise(function(a,s){i.load(t,a,n,s)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}};Xp.DEFAULT_MATERIAL_NAME="__DEFAULT";var Jp="\\[\\]\\.:\\/",nC=new RegExp("["+Jp+"]","g"),Qp="[^"+Jp+"]",iC="[^"+Jp.replace("\\.","")+"]",aC=/((?:WC+[\/:])*)/.source.replace("WC",Qp),sC=/(WCOD+)?/.source.replace("WCOD",iC),rC=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Qp),oC=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Qp),lC=new RegExp("^"+aC+sC+rC+oC+"$"),cC=["material","materials","bones","map"],qp=class{constructor(t,n,i){let a=i||xe.parseTrackName(n);this._targetGroup=t,this._bindings=t.subscribe_(n,a)}getValue(t,n){this.bind();let i=this._targetGroup.nCachedObjects_,a=this._bindings[i];a!==void 0&&a.getValue(t,n)}setValue(t,n){let i=this._bindings;for(let a=this._targetGroup.nCachedObjects_,s=i.length;a!==s;++a)i[a].setValue(t,n)}bind(){let t=this._bindings;for(let n=this._targetGroup.nCachedObjects_,i=t.length;n!==i;++n)t[n].bind()}unbind(){let t=this._bindings;for(let n=this._targetGroup.nCachedObjects_,i=t.length;n!==i;++n)t[n].unbind()}},xe=class e{constructor(t,n,i){this.path=n,this.parsedPath=i||e.parseTrackName(n),this.node=e.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,n,i){return t&&t.isAnimationObjectGroup?new e.Composite(t,n,i):new e(t,n,i)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(nC,"")}static parseTrackName(t){let n=lC.exec(t);if(n===null)throw new Error("PropertyBinding: Cannot parse trackName: "+t);let i={nodeName:n[2],objectName:n[3],objectIndex:n[4],propertyName:n[5],propertyIndex:n[6]},a=i.nodeName&&i.nodeName.lastIndexOf(".");if(a!==void 0&&a!==-1){let s=i.nodeName.substring(a+1);cC.indexOf(s)!==-1&&(i.nodeName=i.nodeName.substring(0,a),i.objectName=s)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+t);return i}static findNode(t,n){if(n===void 0||n===""||n==="."||n===-1||n===t.name||n===t.uuid)return t;if(t.skeleton){let i=t.skeleton.getBoneByName(n);if(i!==void 0)return i}if(t.children){let i=function(s){for(let r=0;r<s.length;r++){let o=s[r];if(o.name===n||o.uuid===n)return o;let l=i(o.children);if(l)return l}return null},a=i(t.children);if(a)return a}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,n){t[n]=this.targetObject[this.propertyName]}_getValue_array(t,n){let i=this.resolvedProperty;for(let a=0,s=i.length;a!==s;++a)t[n++]=i[a]}_getValue_arrayElement(t,n){t[n]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,n){this.resolvedProperty.toArray(t,n)}_setValue_direct(t,n){this.targetObject[this.propertyName]=t[n]}_setValue_direct_setNeedsUpdate(t,n){this.targetObject[this.propertyName]=t[n],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,n){this.targetObject[this.propertyName]=t[n],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,n){let i=this.resolvedProperty;for(let a=0,s=i.length;a!==s;++a)i[a]=t[n++]}_setValue_array_setNeedsUpdate(t,n){let i=this.resolvedProperty;for(let a=0,s=i.length;a!==s;++a)i[a]=t[n++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,n){let i=this.resolvedProperty;for(let a=0,s=i.length;a!==s;++a)i[a]=t[n++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,n){this.resolvedProperty[this.propertyIndex]=t[n]}_setValue_arrayElement_setNeedsUpdate(t,n){this.resolvedProperty[this.propertyIndex]=t[n],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,n){this.resolvedProperty[this.propertyIndex]=t[n],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,n){this.resolvedProperty.fromArray(t,n)}_setValue_fromArray_setNeedsUpdate(t,n){this.resolvedProperty.fromArray(t,n),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,n){this.resolvedProperty.fromArray(t,n),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,n){this.bind(),this.getValue(t,n)}_setValue_unbound(t,n){this.bind(),this.setValue(t,n)}bind(){let t=this.node,n=this.parsedPath,i=n.objectName,a=n.propertyName,s=n.propertyIndex;if(t||(t=e.findNode(this.rootNode,n.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let c=n.objectIndex;switch(i){case"materials":if(!t.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===c){c=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[i]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[i]}if(c!==void 0){if(t[c]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[c]}}let r=t[a];if(r===void 0){let c=n.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+c+"."+a+" but it wasn't found.",t);return}let o=this.Versioning.None;this.targetObject=t,t.needsUpdate!==void 0?o=this.Versioning.NeedsUpdate:t.matrixWorldNeedsUpdate!==void 0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(s!==void 0){if(a==="morphTargetInfluences"){if(!t.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[s]!==void 0&&(s=t.morphTargetDictionary[s])}l=this.BindingType.ArrayElement,this.resolvedProperty=r,this.propertyIndex=s}else r.fromArray!==void 0&&r.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=r):Array.isArray(r)?(l=this.BindingType.EntireArray,this.resolvedProperty=r):this.propertyName=a;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};xe.Composite=qp;xe.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};xe.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};xe.prototype.GetterByBindingType=[xe.prototype._getValue_direct,xe.prototype._getValue_array,xe.prototype._getValue_arrayElement,xe.prototype._getValue_toArray];xe.prototype.SetterByBindingTypeAndVersioning=[[xe.prototype._setValue_direct,xe.prototype._setValue_direct_setNeedsUpdate,xe.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[xe.prototype._setValue_array,xe.prototype._setValue_array_setNeedsUpdate,xe.prototype._setValue_array_setMatrixWorldNeedsUpdate],[xe.prototype._setValue_arrayElement,xe.prototype._setValue_arrayElement_setNeedsUpdate,xe.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[xe.prototype._setValue_fromArray,xe.prototype._setValue_fromArray_setNeedsUpdate,xe.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var OC=new Float32Array(1);typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"159"}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="159");var zu=class{constructor(t,n,i,a){Ae(this,"role",t);Ae(this,"session",n);Ae(this,"token",i);Ae(this,"baseUrl",a);Ae(this,"status","closed");Ae(this,"rejectReason",null);Ae(this,"ws",null);Ae(this,"handlers",new Map);Ae(this,"statusCbs",new Set);Ae(this,"closedByUser",!1);Ae(this,"retry",0);Ae(this,"timer",null)}connect(){this.closedByUser=!1,this.retry=0,this.open()}open(){if(this.ws)return;let n=`${this.baseUrl??`${location.protocol==="https:"?"wss":"ws"}://${location.host}`}/vcam-ws?role=${this.role}&session=${encodeURIComponent(this.session)}&token=${encodeURIComponent(this.token)}`;this.setStatus("connecting");let i=new WebSocket(n);this.ws=i,i.onopen=()=>{this.ws===i&&(this.retry=0,this.setStatus("open"))},i.onmessage=a=>{let s;try{s=JSON.parse(String(a.data))}catch{return}!s||typeof s.type!="string"||this.handlers.get(s.type)?.forEach(r=>r(s))},i.onclose=a=>{if(this.ws===i){if(this.ws=null,a.code===4001||a.code===4002){this.rejectReason=a.code===4001?"unauthorized":"replaced",this.setStatus("rejected");return}if(this.setStatus("closed"),!this.closedByUser){let s=Math.min(8e3,500*2**this.retry++);this.timer=setTimeout(()=>this.open(),s)}}},i.onerror=()=>{}}on(t,n){let i=this.handlers.get(t);i||(i=new Set,this.handlers.set(t,i));let a=n;return i.add(a),()=>i.delete(a)}onStatus(t){return this.statusCbs.add(t),t(this.status),()=>this.statusCbs.delete(t)}get isOpen(){return this.ws?.readyState===WebSocket.OPEN}send(t){this.ws?.readyState===WebSocket.OPEN&&this.ws.send(JSON.stringify(t))}close(){this.closedByUser=!0,this.timer&&(clearTimeout(this.timer),this.timer=null);let t=this.ws;this.ws=null,t?.close(1e3),this.setStatus("closed")}setStatus(t){this.status!==t&&(this.status=t,this.statusCbs.forEach(n=>n(t)))}};function kx(e){let t=e?.candidate??"";if(!t)return"(end-of-candidates)";let n=t.split(" "),i=/typ (\S+)/.exec(t)?.[1]??"?",a=(n[4]??"").endsWith(".local")?" [mDNS]":"";return`typ=${i} ${n[2]??"?"} ${n[4]??"?"}:${n[5]??"?"}${a}`}async function hC(e,t){try{let n=await e.getStats(),i=new Map;n.forEach(s=>{(s.type==="local-candidate"||s.type==="remote-candidate")&&i.set(s.id,s)});let a=0;n.forEach(s=>{if(s.type!=="candidate-pair")return;a++;let r=o=>o?`${o.candidateType}/${o.protocol} ${o.address??o.ip??"?"}:${o.port}`:"?";t(`pair#${a} state=${s.state}${s.nominated?" nominated":""} local=[${r(i.get(s.localCandidateId))}] remote=[${r(i.get(s.remoteCandidateId))}] req-sent=${s.requestsSent??"?"} resp-recv=${s.responsesReceived??"?"}`)}),a||t("candidate-pair: \u65E0\uFF08\u4E24\u7AEF candidate \u6CA1\u914D\u5BF9\u6210\u529F\uFF0C\u591A\u534A\u4FE1\u4EE4\u6CA1\u5230\u6216 candidate \u4E3A\u7A7A\uFF09")}catch(n){t(`getStats \u5931\u8D25: ${String(n)}`)}}function fC(e,t){e.onicegatheringstatechange=()=>t(`iceGatheringState \u2192 ${e.iceGatheringState}`),e.oniceconnectionstatechange=()=>{t(`iceConnectionState \u2192 ${e.iceConnectionState}`),(e.iceConnectionState==="failed"||e.iceConnectionState==="disconnected")&&hC(e,t)},e.onsignalingstatechange=()=>t(`signalingState \u2192 ${e.signalingState}`),e.addEventListener("icecandidateerror",n=>{let i=n;t(`icecandidateerror code=${i.errorCode} "${i.errorText}" ${i.address??""}:${i.port??""} ${i.url??""}`)})}var Iu=class{constructor(t,n=()=>{}){Ae(this,"sendSignal",t);Ae(this,"log",n);Ae(this,"onTrack");Ae(this,"onState");Ae(this,"pc",null);Ae(this,"dc",null);Ae(this,"pending",[])}async handleSignal(t){try{if("candidate"in t){this.log(`remote candidate: ${kx(t.candidate)}${this.pc?.remoteDescription?"":" (\u7F13\u5B58\uFF0C\u7B49 offer)"}`),this.pc?.remoteDescription?await this.pc.addIceCandidate(t.candidate):this.pending.push(t.candidate);return}if(t.type!=="offer")return;this.log("\u6536\u5230 offer\uFF0C\u91CD\u5EFA pc\uFF08iceServers=[]\uFF09"),this.stop();let n=new RTCPeerConnection({iceServers:[]});this.pc=n,fC(n,this.log),n.ontrack=s=>{this.log(`ontrack: streams=${s.streams.length}`);let r=s.receiver;try{"jitterBufferTarget"in r&&(r.jitterBufferTarget=0),r.playoutDelayHint=0}catch{}s.streams[0]&&this.onTrack?.(s.streams[0])},n.ondatachannel=s=>{this.log(`ondatachannel: ${s.channel.label}`),this.dc=s.channel},n.onicecandidate=s=>{this.log(`local candidate: ${kx(s.candidate?.toJSON())}`),s.candidate&&this.sendSignal({candidate:s.candidate.toJSON()})},n.onconnectionstatechange=()=>{this.pc===n&&(this.log(`connectionState \u2192 ${n.connectionState}`),this.onState?.(n.connectionState))},await n.setRemoteDescription(t);let i=await n.createAnswer();if(this.pc!==n)return;await n.setLocalDescription(i),this.sendSignal({type:i.type,sdp:i.sdp}),this.log("answer \u5DF2\u53D1\u9001");let a=this.pending;this.pending=[];for(let s of a)try{await n.addIceCandidate(s)}catch(r){this.log(`\u8865\u52A0\u7F13\u5B58 candidate \u51FA\u9519: ${String(r)}`)}}catch(n){this.log(`handleSignal \u51FA\u9519: ${String(n)}`)}}sendData(t){let n=this.dc;if(!n||n.readyState!=="open"||n.bufferedAmount>0)return!1;try{n.send(t)}catch{return!1}return!0}stop(){this.dc=null,this.pc?.close(),this.pc=null,this.pending=[]}};var Es=Math.PI/180,dC=new I(0,0,1),pC=new zn(-Math.SQRT1_2,0,0,Math.SQRT1_2),Wx=new Wr,mC=new zn;function Xx(e,t,n,i,a){return Wx.set(t*Es,e*Es,-n*Es,"YXZ"),a.setFromEuler(Wx),a.multiply(pC),a.multiply(mC.setFromAxisAngle(dC,-i*Es)),a}function qx(e,t){let n=e*Es,i=t*Es,a=Math.sin(i)*Math.cos(n),s=-Math.sin(n),r=Math.round(Math.atan2(-a,-s)/Es/90)*90;return r===-180?180:r}function Yx(){if(typeof screen<"u"&&screen.orientation)return screen.orientation.angle;let e=window.orientation;return typeof e=="number"?e:0}async function Zx(){try{let e=document.documentElement;!document.fullscreenElement&&e.requestFullscreen&&await e.requestFullscreen({navigationUI:"hide"});let t=screen.orientation;if(t?.lock)return await t.lock("landscape"),!0}catch{}return!1}async function jx(){if(typeof DeviceOrientationEvent>"u")return"unsupported";let e=DeviceOrientationEvent;if(typeof e.requestPermission=="function")try{return await e.requestPermission()==="granted"?"granted":"denied"}catch{return"denied"}return"granted"}var Fu=hi(Rs(),1),$p=hi(Ts(),1),Kp=.12;function tm({size:e=128,rotate:t=0,onChange:n}){let i=(0,Fu.useRef)(null),a=(0,Fu.useRef)(null),s=(0,Fu.useRef)(null),r=e/2,o=e*.42,l=(h,d)=>{let f=i.current,p=a.current;if(!f||!p)return;let v=f.getBoundingClientRect(),y=(h-(v.left+v.width/2))/r,m=(d-(v.top+v.height/2))/r;if(t===90){let b=y;y=m,m=-b}else if(t===-90){let b=y;y=-m,m=b}let u=Math.hypot(y,m);u>1&&(y/=u,m/=u),p.style.transform=`translate(${y*r*.6}px, ${m*r*.6}px)`;let _=Math.hypot(y,m);if(_<Kp){n(0,0);return}let g=(_-Kp)/(1-Kp)/_;n(y*g,-m*g)},c=()=>{s.current=null,a.current&&(a.current.style.transform="translate(0px, 0px)"),n(0,0)};return(0,$p.jsx)("div",{ref:i,className:"relative grid place-items-center rounded-full border border-white/25 bg-black/45 backdrop-blur-sm",style:{width:e,height:e,touchAction:"none"},onPointerDown:h=>{s.current==null&&(s.current=h.pointerId,h.currentTarget.setPointerCapture(h.pointerId),l(h.clientX,h.clientY))},onPointerMove:h=>{s.current===h.pointerId&&l(h.clientX,h.clientY)},onPointerUp:h=>{s.current===h.pointerId&&c()},onPointerCancel:h=>{s.current===h.pointerId&&c()},children:(0,$p.jsx)("div",{ref:a,className:"rounded-full bg-white/25 border border-white/30",style:{width:o,height:o,transition:"transform 60ms linear"}})})}var vC={"camera_view.add_keyframe":"\u6DFB\u52A0\u5173\u952E\u5E27","camera_view.keyframe_added":"\u5DF2\u6DFB\u52A0\u7B2C {n} \u4E2A\u673A\u4F4D\u5173\u952E\u5E27\uFF0C\u65F6\u95F4\u7EBF\u8DEF\u5F84\u5DF2\u66F4\u65B0","camera_view.keyframe_path":"{camera} \xB7 \u5173\u952E\u5E27 {n}","camera_view.navigate":"\u81EA\u7531","camera_view.precise":"\u7CBE\u786E","camera_view.bind_camera":"\u7ED1\u5B9A\u673A\u4F4D","camera_view.create_camera":"\u65B0\u5EFA\u673A\u4F4D","camera_view.format.photography":"\u6444\u5F71","camera_view.format.widescreen":"\u6A2A\u5C4F","camera_view.format.portrait":"\u7AD6\u5C4F","camera_view.format.classic":"\u7ECF\u5178","camera_view.format.square":"\u65B9\u5F62","camera_view.format.ultrawide":"\u8D85\u5BBD\u5C4F","camera_view.fov.ultra_narrow":"\u8D85\u7A84","camera_view.fov.narrow":"\u7A84","camera_view.fov.standard":"\u6807\u51C6","camera_view.fov.wide":"\u5E7F\u89D2","camera_view.fov.ultra_wide":"\u8D85\u5E7F\u89D2","camera_view.fov.extreme":"\u6781\u5E7F\u89D2","common.add":"\u6DFB\u52A0","common.cancel":"\u53D6\u6D88","common.delete":"\u5220\u9664","common.duplicate":"\u526F\u672C","common.none":"\u65E0","common.image":"\u56FE\u7247","common.character_default":"\u89D2\u8272","common.camera_default":"\u673A\u4F4D","common.prop_default":"\u9053\u5177","common.crowd_default":"\u7FA4\u4F17","common.group_default":"\u7F16\u7EC4","common.campath_default":"\u8DEF\u5F84","common.track_default":"\u8F68\u9053","tree.title":"\u573A\u666F","tree.search_placeholder":"\u8BF7\u8F93\u5165\u641C\u7D22\u5185\u5BB9","tree.empty":"\u573A\u666F\u4E3A\u7A7A\uFF0C\u8BF7\u4ECE\u5E95\u90E8\u5DE5\u5177\u680F\u6DFB\u52A0\u5BF9\u8C61","tree.expand":"\u5C55\u5F00\u573A\u666F\u9762\u677F","tree.collapse":"\u7F29\u7565\u573A\u666F\u9762\u677F","tree.section.cameras":"\u76F8\u673A","tree.section.characters":"\u89D2\u8272","tree.section.props":"\u9053\u5177","tree.section.local_assets":"\u672C\u5730\u8D44\u4EA7","tree.section.models":"\u6A21\u578B","tree.section.groups":"\u7F16\u7EC4","tree.group_lock":"\u9501\u5B9A\u7EC4\u9009\u62E9","tree.group_unlock":"\u89E3\u9501\u4EE5\u7F16\u8F91\u5355\u4E2A\u6210\u5458","tree.section.campaths":"\u8FD0\u955C\u8DEF\u5F84","tree.toggle_visible":"\u663E\u793A/\u9690\u85CF","tree.rename":"\u91CD\u547D\u540D","tb.add_character":"\u6DFB\u52A0\u89D2\u8272","tb.local_upload":"\u672C\u5730\u4E0A\u4F20","tb.crowd":"\u7FA4\u4F17 ({rows}x{cols})","tb.crowd_title":"\u6DFB\u52A0\u7FA4\u4F17\u9635\u5217","tb.crowd_count":"\u5171{total}\u4EBA","tb.rows":"\u884C\u6570","tb.cols":"\u5217\u6570","tb.gap":"\u95F4\u8DDD","tb.props":"\u7269\u4F53\u6A21\u578B","tb.add_camera":"\u6DFB\u52A0\u673A\u4F4D","tb.apply_current_view":"\u5E94\u7528\u5F53\u524D\u89C6\u89D2","tb.preset_views":"\u9884\u8BBE\u89C6\u89D2","tb.aspect":"\u9009\u62E9\u753B\u5E45\u6BD4\u4F8B","tb.ratio":"\u6BD4\u4F8B","tb.fullscreen":"\u9690\u85CF\u9762\u677F","tb.exit_fullscreen":"\u663E\u793A\u9762\u677F","tb.panorama":"\u5168\u666F\u56FE","tb.ai_generate":"AI \u751F\u6210","pgen.title":"AI \u751F\u6210\u5168\u666F\u56FE","pgen.reference":"\u53C2\u8003\u56FE\uFF08\u53EF\u9009\uFF09","pgen.upload":"\u4E0A\u4F20\u56FE\u7247","pgen.add_reference":"\u6DFB\u52A0\u53C2\u8003\u56FE","pgen.placeholder":"\u63CF\u8FF0\u4F60\u60F3\u8981\u751F\u6210\u7684\u5185\u5BB9","pgen.generate":"\u751F\u6210","aigen.entry":"AI \u751F\u6210","aigen.entry_hint":"\u6587\u5B57 / \u53C2\u8003\u56FE","aigen.title":"AI \u751F\u6210 3D \u6A21\u578B","aigen.add_reference":"\u6DFB\u52A0\u53C2\u8003\u56FE","aigen.placeholder":"\u63CF\u8FF0\u60F3\u8981\u7684\u6A21\u578B\uFF0C\u5982\uFF1A\u4E00\u628A\u4E2D\u4E16\u7EAA\u957F\u5251\u3001\u4E00\u8F86\u7EA2\u8272\u8DD1\u8F66\u3001\u4E00\u5EA7\u77F3\u62F1\u6865\u2026","aigen.generate":"\u751F\u6210","aigen.sent":"\u5DF2\u53D1\u9001\u5230\u9879\u76EE\u4E3B\u5BF9\u8BDD\uFF0C\u4E3B Agent \u6B63\u5728\u5904\u7406\u573A\u666F\u642D\u5EFA\u8BF7\u6C42\u2026","aigen.no_host":"\u5F53\u524D\u73AF\u5883\u65E0 Hub Agent\uFF0C\u8BF7\u5728 Hub \u5185\u6253\u5F00\u5BFC\u6F14\u53F0\u4F7F\u7528 AI \u751F\u6210","aigen.agent_working":"Agent \u6B63\u5728\u64CD\u4F5C\u573A\u666F\uFF08{method}\uFF09\u2026","aimotion.title":"AI \u751F\u6210\u52A8\u4F5C","aimotion.placeholder":`\u8D85\u7EA7\u82F1\u96C4\u4E09\u70B9\u7740\u9646\uFF08\u4ECE\u7AD9\u7ACB\u5F00\u59CB\uFF0C\u5168\u7A0B\u7EA6 3 \u79D2\uFF0C\u4E0D\u5FAA\u73AF\uFF09
1. \u6DF1\u8E72\u84C4\u529B\uFF0C\u731B\u5730\u8DC3\u8D77\uFF0C\u518D\u5FEB\u901F\u843D\u4E0B
2. \u843D\u5730\u77AC\u95F4\uFF1A\u53F3\u811A\u8E0F\u5730\u6DF1\u8E72\uFF0C\u5DE6\u819D\u548C\u5DE6\u62F3\u91CD\u91CD\u7838\u5730\uFF0C\u4E0A\u8EAB\u524D\u503E\u3001\u4F4E\u5934
3. \u4FDD\u6301\u4E09\u70B9\u652F\u6491\uFF0C\u7A7A\u95F2\u7684\u53F3\u81C2\u7F13\u7F13\u5411\u8EAB\u540E\u6446\u5F00\uFF0C\u5B9A\u683C\u5728\u8FD9\u4E2A\u82F1\u96C4\u59FF\u52BF`,"aimotion.sent":"\u5DF2\u53D1\u9001\u5230\u9879\u76EE\u4E3B\u5BF9\u8BDD\uFF0C\u52A8\u4F5C\u5B8C\u6210\u540E\u4F1A\u6302\u5230\u5BFC\u6F14\u53F0\u65F6\u95F4\u7EBF\u2026","aimotion.entry_hint":"\u6587\u5B57\u63CF\u8FF0\u52A8\u4F5C","aipath.title":"AI \u751F\u6210\u8FD0\u955C","aipath.placeholder":"\u63CF\u8FF0\u60F3\u8981\u7684\u8FD0\u955C\uFF0C\u5982\uFF1A\u4ECE\u4EBA\u7269\u811A\u4E0B\u7684\u4F4E\u89D2\u5EA6\u5F00\u59CB\uFF0C4 \u79D2\u7F13\u7F13\u63A8\u8FD1\u5230\u80F8\u53E3\u9AD8\u5EA6\uFF1B\u505C\u534A\u62CD\uFF1B\u518D\u5411\u53F3\u73AF\u7ED5 120\xB0\uFF0C\u8FB9\u7ED5\u8FB9\u5347\u9AD8 1.5 \u7C73\uFF0C\u6700\u540E\u5B9A\u683C\u5728\u4FA7\u9762\u2026","aipath.sent":"\u5DF2\u53D1\u9001\u5230\u9879\u76EE\u4E3B\u5BF9\u8BDD\uFF0C\u8FD0\u955C\u5B8C\u6210\u540E\u4F1A\u51FA\u73B0\u5728\u5BFC\u6F14\u53F0\u65F6\u95F4\u7EBF\u2026","aipath.history":"\u751F\u6210\u5386\u53F2","aipath.new":"\u751F\u6210\u65B0\u8FD0\u955C","codemodel.build_failed":"AI \u6A21\u578B\u6784\u5EFA\u5931\u8D25\uFF1A{msg}","pp.header_codemodel":"AI \u6A21\u578B","pp.header_codepart":"\u6A21\u578B\u90E8\u4EF6","pp.parts":"\u90E8\u4EF6","pp.part_reset":"\u91CD\u7F6E\u4E3A\u4EE3\u7801\u57FA\u7EBF","pp.visible":"\u663E\u793A","pp.part_of":"\u5C5E\u4E8E {label}","pp.view_code":"\u67E5\u770B\u4EE3\u7801","pp.regen_hint":"\u5728\u53F3\u4FA7 Agent \u5BF9\u8BDD\u4E2D\u63CF\u8FF0\u4FEE\u6539\u9700\u6C42\u53EF\u8FED\u4EE3\u6B64\u6A21\u578B","tree.section.codemodels":"AI \u6A21\u578B","pgen.generating":"\u751F\u6210\u4E2D\u2026","pgen.failed":"\u751F\u6210\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5","pgen.quality_high":"\u9AD8","pgen.resolution":"\u6E05\u6670\u5EA6","pgen.quality":"\u753B\u8D28","pgen.background":"\u80CC\u666F","pgen.count":"\u5F20\u6570","pgen.q_low":"\u4F4E","pgen.q_medium":"\u4E2D","pgen.bg_auto":"\u81EA\u9002\u5E94","pgen.bg_transparent":"\u900F\u660E","pgen.bg_opaque":"\u4E0D\u900F\u660E","pgen.credits":"{n} \u79EF\u5206 \xB7 \u751F\u6210","tool.move":"\u79FB\u52A8","tool.rotate":"\u65CB\u8F6C","tool.scale":"\u7F29\u653E","tool.shortcut_hint":"\u6309 1 / 2 / 3 \u5207\u6362\u79FB\u52A8\u3001\u65CB\u8F6C\u3001\u7F29\u653E","body.mannequin":"\u7537\u6027\u7D20\u4F53","body.female":"\u5973\u6027\u7D20\u4F53","body.child":"\u513F\u7AE5\u7D20\u4F53","propgroup.geo":"\u51E0\u4F55","propgroup.furniture":"\u5BB6\u5177","propgroup.building":"\u5EFA\u7B51","propgroup.nature":"\u81EA\u7136","propgroup.street":"\u8857\u9053","prop.mesh_cube":"\u7ACB\u65B9\u4F53","prop.mesh_sphere":"\u7403\u4F53","prop.mesh_cylinder":"\u5706\u67F1\u4F53","prop.mesh_torus":"\u73AF\u72B6\u4F53","prop.mesh_cone":"\u5706\u9525","prop.mesh_pyramid":"\u68F1\u9525","prop.mesh_rectangle":"\u77E9\u5F62\u7247","prop.mesh_disc":"\u5706\u76D8","prop.mesh_capsule":"\u80F6\u56CA\u4F53","prop.mesh_arc":"\u534A\u5706\u5F27","prop.mesh_half_cylinder":"\u534A\u5706\u67F1","prop.chair":"\u6905\u5B50","prop.sofa":"\u6C99\u53D1","prop.square_table":"\u65B9\u684C","prop.desk":"\u957F\u684C","prop.round_table":"\u5706\u684C","prop.bed":"\u5E8A","prop.bookshelf":"\u4E66\u67B6","prop.stool":"\u5706\u51F3","prop.armchair":"\u6276\u624B\u6905","prop.cabinet":"\u77EE\u67DC","prop.wardrobe":"\u8863\u67DC","prop.tv":"\u7535\u89C6","prop.wall_tv":"\u6302\u5899\u7535\u89C6","prop.floor_lamp":"\u843D\u5730\u706F","prop.table_lamp":"\u53F0\u706F","prop.rug":"\u5730\u6BEF","prop.wall":"\u5899\u6BB5","prop.column":"\u67F1\u5B50","prop.staircase":"\u697C\u68AF\u6BB5","prop.ramp":"\u659C\u5761","prop.platform":"\u5E73\u53F0","prop.arch":"\u62F1\u95E8","prop.ladder":"\u68AF\u5B50","prop.statue":"\u96D5\u50CF","prop.door":"\u95E8","prop.fence":"\u6805\u680F","prop.tree_small":"\u5C0F\u6811","prop.tree_large":"\u5927\u6811","prop.rock":"\u77F3\u5934","prop.bush":"\u704C\u6728","prop.potted_plant":"\u76C6\u683D","prop.stump":"\u6811\u6869","prop.flower_bed":"\u82B1\u575B","prop.car":"\u8F7F\u8F66","prop.truck":"\u5361\u8F66","prop.bicycle":"\u81EA\u884C\u8F66","prop.streetlamp":"\u8DEF\u706F","prop.bench":"\u957F\u6905","prop.trash_bin":"\u5783\u573E\u6876","prop.traffic_cone":"\u8DEF\u9525","prop.road_barrier":"\u6C34\u9A6C\u62A4\u680F","prop.sign":"\u8DEF\u724C","prop.fire_hydrant":"\u6D88\u9632\u6813","prop.barrel":"\u6CB9\u6876","prop.crate":"\u6728\u7BB1","pose.stand":"\u7AD9\u7ACB","pose.tpose":"T\u578B","pose.walk":"\u884C\u8D70","pose.run":"\u8DD1\u6B65","pose.jump":"\u8DF3\u8DC3","pose.sit":"\u5750\u59FF","pose.squat":"\u8E72\u4E0B","pose.kneel":"\u5355\u819D\u8DEA","pose.wave":"\u62DB\u624B","pose.hands_up":"\u4E3E\u624B","pose.bow":"\u97A0\u8EAC","pose.akimbo":"\u53C9\u8170","pose.think":"\u601D\u8003","pose.fight":"\u683C\u6597","pose.lie":"\u8EBA\u5012","pose.drive":"\u9A7E\u9A76","pose.aim":"\u6301\u67AA\u7784\u51C6","pose.sword":"\u6301\u5251","pose.spell":"\u65BD\u6CD5","camera.front_medium":"\u6B63\u9762\u4E2D\u666F","camera.front_closeup":"\u6B63\u9762\u7279\u5199","camera.front_wide":"\u6B63\u9762\u5168\u666F","camera.side_tracking":"\u4FA7\u9762\u8DDF\u62CD","camera.side_close":"\u4FA7\u9762\u8FD1\u666F","camera.back_medium":"\u80CC\u9762\u4E2D\u666F","camera.top_wide":"\u4FEF\u62CD\u5168\u666F","camera.top_45":"45\xB0\u4FEF\u62CD","camera.low_angle":"\u4F4E\u89D2\u5EA6\u4EF0\u62CD","camera.low_wide":"\u4F4E\u89D2\u5EA6\u5E7F\u89D2","camera.over_shoulder_l":"\u8FC7\u80A9\u955C\u5934","camera.over_shoulder_r":"\u8FC7\u80A9\u955C\u5934(\u53F3)","camera.birdseye":"\u9E1F\u77B0","camera.dutch":"\u8377\u5170\u89D2","pp.tab_attr":"\u5C5E\u6027","pp.tab_pose":"\u59FF\u52BF","pp.multi_note":"\u5DF2\u9009\u4E2D {count} \u4E2A\u89D2\u8272\uFF0C\u4FEE\u6539\u5C06\u540C\u6B65\u5E94\u7528\u5230\u5168\u90E8\u9009\u4E2D\u5BF9\u8C61","pp.name":"\u540D\u79F0","pp.position":"\u4F4D\u7F6E","pp.rotation":"\u65CB\u8F6C","pp.scale":"\u7F29\u653E","pp.uniform_scale":"\u7EDF\u4E00\u7F29\u653E","pp.color":"\u989C\u8272","pp.cast_shadow":"\u6295\u5C04\u9634\u5F71","pp.pose_presets":"\u59FF\u52BF\u9884\u8BBE","pp.pose_adjust":"\u59FF\u52BF\u8C03\u8282","pp.pose_user_poses":"\u6211\u7684\u59FF\u52BF","pp.pose_save":"\u4FDD\u5B58\u5F53\u524D\u59FF\u52BF","pp.pose_save_placeholder":"\u4E3A\u8FD9\u4E2A\u59FF\u52BF\u8D77\u4E2A\u540D\u5B57","pp.pose_save_confirm":"\u4FDD\u5B58","pp.pose_user_empty":"\u8FD8\u6CA1\u6709\u81EA\u5B9A\u4E49\u59FF\u52BF\u3002\u8C03\u597D\u59FF\u52BF\u540E\u70B9\u4E0A\u65B9\u300C\u4FDD\u5B58\u5F53\u524D\u59FF\u52BF\u300D\u5373\u53EF\u6DFB\u52A0\u3002","pp.pose_user_apply":"\u5E94\u7528","pp.pose_user_delete":"\u5220\u9664","pp.pose_user_rename":"\u91CD\u547D\u540D","pp.pose_user_saved":"\u5DF2\u4FDD\u5B58\u5230\u6211\u7684\u59FF\u52BF","pp.pose_user_removed":"\u5DF2\u5220\u9664","pp.pose_user_renamed":"\u5DF2\u91CD\u547D\u540D","pp.pose_user_save_failed":"\u4FDD\u5B58\u5931\u8D25","pp.look_target":"\u6CE8\u89C6\u76EE\u6807","pp.manual_coord":"\u624B\u52A8\u5750\u6807","pp.look_coord":"\u6CE8\u89C6\u5750\u6807","pp.look_free":"\u81EA\u7531\uFF08\u624B\u52A8\u5750\u6807\uFF09","pp.fov":"\u89C6\u91CE\u89D2\u5EA6 (FOV)","pp.panorama_hint":"\u8BF7\u5C06\u56FE\u7247\u8282\u70B9\u8FDE\u63A5\u5230\u5BFC\u6F14\u53F0\u5DE6\u4FA7\u8F93\u5165\u53E3","pp.panorama_selected":"\u5DF2\u9009\u62E9\u5168\u666F\u56FE","pp.incoming_images":"\u4E0A\u6E38\u8FDE\u7EBF\u56FE\u7247","pp.pick_from_canvas":"\u4ECE\u753B\u5E03\u9009\u62E9\u2026","pp.header_character":"\u89D2\u8272","pp.header_prop":"\u9053\u5177","pp.header_model":"\u6A21\u578B","pp.header_camera":"\u673A\u4F4D","pp.header_campath":"\u8FD0\u955C\u8DEF\u5F84","pp.model_type":"\u6A21\u578B\u7C7B\u578B","pp.model_file":"\u6587\u4EF6\u540D","pp.point_size":"\u70B9\u5927\u5C0F","pp.point_color":"\u70B9\u989C\u8272","pp.campath_look":"\u6CE8\u89C6\u76EE\u6807","pp.campath_look_tangent":"\u6CBF\u5207\u7EBF","pp.campath_look_recorded":"\u5F55\u5236\u59FF\u6001\uFF08\u9ED8\u8BA4\uFF09","pp.campath_look_fixed":"\u56FA\u5B9A\u6CE8\u89C6\u70B9","pp.campath_look_point":"\u6CE8\u89C6\u70B9","pp.campath_easing":"\u7F13\u52A8","ease.linear":"\u5300\u901F","ease.easeIn":"\u7F13\u5165","ease.easeOut":"\u7F13\u51FA","ease.easeInOut":"\u7F13\u5165\u7F13\u51FA","ease.smoothstep":"\u5E73\u6ED1","pp.campath_closed":"\u95ED\u73AF\u8DEF\u5F84","pp.campath_fov_anim":"FOV \u52A8\u753B","pp.campath_fov_start":"\u8D77\u59CB FOV","pp.campath_fov_end":"\u7ED3\u675F FOV","tb.campath_draw":"\u624B\u52A8\u7ED8\u5236\u8DEF\u5F84","tb.campath_presets":"\u9884\u8BBE\u8FD0\u955C","campath.orbit":"\u73AF\u7ED5","campath.arc":"\u534A\u5F27","campath.dolly_in":"\u63A8\u8FD1","campath.dolly_out":"\u62C9\u8FDC","campath.dolly_zoom":"\u6ED1\u52A8\u53D8\u7126","campath.crane_up":"\u4E0A\u5347","campath.crane_down":"\u4E0B\u964D","campath.truck":"\u6A2A\u79FB","campath.spiral":"\u87BA\u65CB\u4E0A\u5347","dlg.campath_pick_point":"\u70B9\u51FB\u573A\u666F\u5730\u9762\u653E\u7F6E\u8FD0\u955C\u8DEF\u5F84\uFF08Esc \u53D6\u6D88\uFF09","dlg.campath_draw_hint":"\u5355\u51FB\u4F9D\u6B21\u653E\u7F6E\u8DEF\u5F84\u70B9\uFF1BAlt+\u6EDA\u8F6E \u6216 Q/E \u8C03\u6574\u653E\u7F6E\u9AD8\u5EA6\uFF1B\u53CC\u51FB\u6216 Enter \u5B8C\u6210\uFF0CEsc \u53D6\u6D88","pp.campath_point_section":"\u63A7\u5236\u70B9","pp.campath_point_pos":"\u4F4D\u7F6E","pp.campath_tangent_in":"\u5165\u5207\u7EBF","pp.campath_tangent_out":"\u51FA\u5207\u7EBF","pp.campath_tangent_mode":"\u5207\u7EBF\u6A21\u5F0F","tan.aligned":"\u5BF9\u9F50","tan.free":"\u81EA\u7531","pp.campath_roll":"\u6A2A\u6EDA","pp.campath_point_fov":"FOV \u8986\u76D6","pp.campath_fov_overridden":"\u5DF2\u88AB\u63A7\u5236\u70B9 FOV \u8986\u76D6","pp.campath_speed":"\u901F\u5EA6\u6743\u91CD","pp.campath_edit_hint":"\u62D6\u52A8 XYZ \u8F74\u6574\u4F53\u79FB\u52A8\u8DEF\u5F84 \xB7 \u70B9\u9009\u63A7\u5236\u70B9\u62D6\u52A8 \xB7 \u62D6\u5207\u7EBF\u67C4\u8C03\u6574\u66F2\u7387\uFF08Alt \u65AD\u5F00\u8054\u52A8\uFF09\xB7 \u53CC\u51FB\u66F2\u7EBF\u63D2\u5165 \xB7 Delete \u5220\u70B9 \xB7 Esc \u9000\u51FA","pp.campath_no_point_hint":"\u5728\u753B\u5E03\u6216\u5E95\u90E8\u65F6\u95F4\u8F74\u4E2D\u70B9\u9009\u63A7\u5236\u70B9\uFF0C\u7F16\u8F91\u8BE5\u70B9\u5C5E\u6027","tl.play":"\u56DE\u653E","tl.pause":"\u6682\u505C","tl.duration":"\u65F6\u957F","tl.panel_title":"\u8FD0\u955C\u65F6\u95F4\u7EBF","tl.add_path":"\u6DFB\u52A0\u8DEF\u5F84","tl.path_picker_hint":"\u9009\u62E9 AI \u751F\u6210\u3001\u624B\u52A8\u7ED8\u5236\u6216\u9884\u8BBE\u8FD0\u955C\u3002\u9884\u8BBE\u4F1A\u4EE5\u573A\u666F\u843D\u70B9\u4E3A\u4E2D\u5FC3\u521B\u5EFA\u8DEF\u5F84\u3002","tl.preview_hover":"\u60AC\u505C\u9884\u89C8","aipath.entry_hint":"\u63CF\u8FF0\u955C\u5934\u8FD0\u52A8","tl.empty_hint":"\u70B9\u51FB\u300C\u6DFB\u52A0\u8DEF\u5F84\u300D\u521B\u5EFA\u8FD0\u955C\u7247\u6BB5","tl.track_mute":"\u9690\u85CF\u8F68\u9053","tl.track_unmute":"\u663E\u793A\u8F68\u9053","tl.track_delete":"\u5220\u9664\u8F68\u9053","tl.track_up":"\u4E0A\u79FB\uFF08\u63D0\u9AD8\u4F18\u5148\u7EA7\uFF09","tl.track_down":"\u4E0B\u79FB\uFF08\u964D\u4F4E\u4F18\u5148\u7EA7\uFF09","tl.clip_enabled":"\u53C2\u4E0E\u64AD\u653E","tl.clip_start":"\u8D77\u59CB","tl.clip_path":"\u8DEF\u5F84","tl.zoom_in":"\u653E\u5927\u65F6\u95F4\u7EBF","tl.zoom_out":"\u7F29\u5C0F\u65F6\u95F4\u7EBF","tl.zoom_reset":"\u7F29\u653E\u6BD4\u4F8B\uFF08\u70B9\u51FB\u91CD\u7F6E\uFF09","tl.vcam":"\u624B\u673A\u8FD0\u955C","tl.export":"\u5BFC\u51FA\u8FD0\u955C\u89C6\u9891","tl.export_cancel":"\u53D6\u6D88\u5BFC\u51FA","tl.export_done":"\u5DF2\u5BFC\u51FA\u89C6\u9891","tl.export_inserted":"\u5DF2\u8F93\u51FA\u89C6\u9891\u5230\u753B\u5E03","tl.export_failed":"\u5BFC\u51FA\u5931\u8D25","tl.export_unsupported":"\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u89C6\u9891\u5F55\u5236","tl.export_hint":"\u5BFC\u51FA\u4E2D\uFF1A\u8BF7\u4FDD\u6301\u7A97\u53E3\u524D\u53F0\uFF0C\u52FF\u7F29\u653E\u7A97\u53E3","tl.no_clips":"\u65F6\u95F4\u7EBF\u4E3A\u7A7A\uFF0C\u8BF7\u5148\u6DFB\u52A0\u8FD0\u955C\u7247\u6BB5","tl.bind_target":"\u7ED1\u5B9A\u5BF9\u8C61\uFF08\u7269\u4F53\u6CBF\u8DEF\u5F84\u79FB\u52A8\uFF09","tl.bind_camera":"\u4E0D\u7ED1\u5B9A","tl.target_missing":"\u7ED1\u5B9A\u5BF9\u8C61\u5DF2\u5220\u9664\uFF0C\u8BF7\u91CD\u65B0\u7ED1\u5B9A","tl.pick_object":"\u7ED1\u5B9A\u5BF9\u8C61","tl.no_objects":"\u573A\u666F\u4E2D\u6CA1\u6709\u89D2\u8272\u6216\u9053\u5177","tl.orient_follow":"\u671D\u5411\u8FD0\u52A8\u65B9\u5411","tl.orient_keep":"\u4FDD\u6301\u539F\u671D\u5411","tl.orient_label":"\u671D\u5411","tl.add_anim":"\u89D2\u8272\u52A8\u753B","tl.pick_anim":"\u52A8\u753B\u9884\u8BBE","tl.anim_clip":"\u52A8\u753B","tl.no_chars":"\u573A\u666F\u4E2D\u6CA1\u6709\u89D2\u8272\uFF0C\u8BF7\u5148\u6DFB\u52A0\u89D2\u8272","tl.anim_picker_hint":"\u70B9\u51FB\u52A8\u753B\u6DFB\u52A0\u5230\u65F6\u95F4\u7EBF\uFF08\u7ED1\u5B9A\u5F53\u524D\u9009\u4E2D\u89D2\u8272\uFF09","tl.anim_thumbs_baking":"\u52A8\u753B\u7F29\u7565\u56FE\u751F\u6210\u4E2D\u2026","tl.custom_motions":"\u751F\u6210\u52A8\u4F5C","tl.preset_motions":"\u9884\u8BBE\u52A8\u4F5C","tl.delete_motion":"\u5220\u9664\u8BE5\u52A8\u4F5C\uFF08\u5F15\u7528\u5B83\u7684\u65F6\u95F4\u7EBF\u7247\u6BB5\u4E00\u5E76\u5220\u9664\uFF09","tl.delete_campath":"\u5220\u9664\u8BE5\u8FD0\u955C\uFF08\u5F15\u7528\u5B83\u7684\u65F6\u95F4\u7EBF\u7247\u6BB5\u4E00\u5E76\u5220\u9664\uFF09","pp.prop_picker_hint":"\u9009\u62E9\u89D2\u8272\u6216\u9053\u5177\u540E\u5728\u5730\u9762\u70B9\u51FB\u653E\u7F6E\uFF0CEsc \u53D6\u6D88","pp.prop_thumbs_baking":"\u6A21\u578B\u7F29\u7565\u56FE\u751F\u6210\u4E2D\u2026","anim.idle":"\u5F85\u673A\u547C\u5438","anim.walk":"\u884C\u8D70\u5FAA\u73AF","anim.run":"\u8DD1\u6B65\u5FAA\u73AF","anim.jump":"\u8DF3\u8DC3","anim.talk":"\u7AD9\u7ACB\u4EA4\u8C08","anim.wave":"\u6325\u624B\u6253\u62DB\u547C","anim.bow":"\u97A0\u8EAC","anim.cheer":"\u6B22\u547C","anim.dance":"\u821E\u8E48\u5FAA\u73AF","anim.sit_talk":"\u5750\u59FF\u4EA4\u8C08","anim.punch":"\u51FA\u62F3","anim.death":"\u5012\u5730","dlg.place_pick_point":"\u70B9\u51FB\u573A\u666F\u5730\u9762\u653E\u7F6E\uFF08Esc \u53D6\u6D88\uFF09","joint.group.body":"\u8EAB\u4F53","joint.group.torso":"\u8EAF\u5E72","joint.group.head":"\u5934\u90E8","joint.group.l_arm":"\u5DE6\u81C2","joint.group.r_arm":"\u53F3\u81C2","joint.group.l_leg":"\u5DE6\u817F","joint.group.r_leg":"\u53F3\u817F","joint.bend_fwd":"\u524D\u503E","joint.turn_body":"\u8F6C\u8EAB","joint.tilt_side":"\u4FA7\u503E","joint.twist":"\u626D\u8F6C","joint.nod":"\u70B9\u5934","joint.turn_head":"\u8F6C\u5934","joint.tilt_head":"\u6B6A\u5934","joint.raise_fwd":"\u524D\u62AC","joint.straddle":"\u5916\u5C55","joint.elbow_bend":"\u8098\u90E8\u5F2F\u66F2","joint.forearm_twist":"\u5C0F\u81C2\u65CB\u8F6C","joint.wrist_bend":"\u624B\u8155\u5F2F\u66F2","joint.wrist_twist":"\u624B\u8155\u65CB\u8F6C","joint.ankle_bend":"\u811A\u8E1D\u5F2F\u66F2","joint.knee_bend":"\u819D\u90E8\u5F2F\u66F2","env.scene_3d":"3D\u573A\u666F","env.scene_scale":"\u573A\u666F\u7F29\u653E","env.scene_move":"\u573A\u666F\u5E73\u79FB","env.scene_rotate":"\u573A\u666F\u65CB\u8F6C","env.panorama_bg":"\u80CC\u666F\u6A21\u5F0F","env.panorama":"\u5168\u666F\u56FE","env.bg_image":"\u80CC\u666F\u56FE\u7247","env.bg_mode":"\u80CC\u666F\u6A21\u5F0F","env.bg_mode_flat":"\u5E73\u9762","env.bg_mode_panorama":"\u5168\u666F","env.sky_color":"\u5929\u7A7A\u989C\u8272","env.panorama_sphere":"\u5168\u666F\u7403","env.h_rotate":"\u6C34\u5E73\u65CB\u8F6C","env.sphere_radius":"\u7403\u5F62\u534A\u5F84","env.flat_fit":"\u9002\u914D\u65B9\u5F0F","env.flat_fit_contain":"\u5B8C\u6574","env.flat_fit_cover":"\u94FA\u6EE1","env.flat_scale":"\u7F29\u653E","env.flat_offset_x":"\u6C34\u5E73\u504F\u79FB","env.flat_offset_y":"\u5782\u76F4\u504F\u79FB","env.char_labels":"\u89D2\u8272\u6807\u7B7E","env.grid_snap":"\u7F51\u683C\u5438\u9644","env.ground":"\u5730\u9762","env.opacity":"\u900F\u660E\u5EA6","env.height":"\u9AD8\u5EA6","dlg.director_view":"\u81EA\u7531\u6A21\u5F0F","dlg.camera_view":"\u673A\u4F4D\u6A21\u5F0F","dlg.shortcuts":"\u5FEB\u6377\u952E\u4E00\u89C8","dlg.undo":"\u64A4\u9500 (Ctrl+Z)","dlg.redo":"\u91CD\u505A (Ctrl+Shift+Z)","dlg.output":"\u8F93\u51FA","dlg.export_image":"\u5BFC\u51FA\u56FE\u7247","dlg.exit_editing":"\u9000\u51FA\u7F16\u8F91","dlg.select_char_first":"\u8BF7\u5148\u9009\u4E2D\u4E00\u4E2A\u89D2\u8272","dlg.pose_copied":"\u5DF2\u590D\u5236\u89D2\u8272\u59FF\u52BF\u914D\u7F6E\u5230\u526A\u8D34\u677F","dlg.chars_copied":"\u5DF2\u590D\u5236 {n} \u4E2A\u89D2\u8272\uFF0CCtrl+V \u7C98\u8D34","dlg.copy_failed":"\u590D\u5236\u5931\u8D25","dlg.add_camera_first":"\u8BF7\u5148\u6DFB\u52A0\u81F3\u5C11\u4E00\u4E2A\u673A\u4F4D","dlg.capture_failed":"\u51FA\u56FE\u5931\u8D25","dlg.output_done":"\u5DF2\u8F93\u51FA\u62CD\u6444\u56FE\u7247\u5230\u753B\u5E03","dlg.output_failed":"\u8F93\u51FA\u5230\u753B\u5E03\u5931\u8D25","dlg.downloaded":"\u5DF2\u4E0B\u8F7D\u62CD\u6444\u56FE\u7247","dlg.char_model_failed":"\u6A21\u578B\u300C{name}\u300D\u4E0B\u8F7D\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5","dlg.model_upload_failed":"\u6A21\u578B\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5","dlg.unsupported_format":"\u4E0D\u652F\u6301\u7684\u6587\u4EF6\u683C\u5F0F\uFF1A{format}\uFF0C\u8BF7\u4E0A\u4F20 GLB/GLTF/PLY/SPZ \u6587\u4EF6","dlg.gpu_disabled_title":"GPU \u52A0\u901F\u672A\u5F00\u542F","dlg.gpu_disabled_message":"3D \u5BFC\u6F14\u53F0\u9700\u8981 GPU \u52A0\u901F\u624D\u80FD\u6D41\u7545\u8FD0\u884C\u3002\u8BF7\u524D\u5F80\u300C\u8BBE\u7F6E \u2192 \u9AD8\u7EA7\u300D\uFF0C\u5173\u95ED\u201C\u7981\u7528 GPU \u52A0\u901F\u201D\uFF0C\u7136\u540E\u91CD\u542F\u5E94\u7528\u3002","dlg.gpu_disabled_auto":"\u4E3A\u4FDD\u8BC1\u7A33\u5B9A\u6027\uFF0C\u5E94\u7528\u5DF2\u81EA\u52A8\u7981\u7528 GPU \u52A0\u901F\uFF0C3D \u5BFC\u6F14\u53F0\u8FD0\u884C\u53EF\u80FD\u5361\u987F\u3002\u6392\u9664\u663E\u5361\u6216\u663E\u793A\u5F02\u5E38\u540E\uFF0C\u53EF\u524D\u5F80\u300C\u8BBE\u7F6E \u2192 \u9AD8\u7EA7\u300D\u91CD\u65B0\u5F00\u542F GPU \u52A0\u901F\u5E76\u91CD\u542F\u5E94\u7528\u3002","dlg.gpu_disabled_path":"\u5F53\u524D Windows \u5B89\u88C5\u8DEF\u5F84\u5305\u542B\u4E2D\u6587\u6216\u5176\u4ED6\u975E ASCII \u5B57\u7B26\uFF0C\u5E94\u7528\u56E0\u6B64\u7981\u7528\u4E86 GPU \u52A0\u901F\u3002\u8BF7\u5C06\u5E94\u7528\u91CD\u65B0\u5B89\u88C5\u5230\u4EC5\u542B\u82F1\u6587\u5B57\u6BCD\u3001\u6570\u5B57\u548C\u5E38\u7528\u7B26\u53F7\u7684\u8DEF\u5F84\u540E\u518D\u4F7F\u7528 3D \u5BFC\u6F14\u53F0\u3002","dlg.gpu_disabled_unknown":"\u5F53\u524D\u5E94\u7528\u672A\u542F\u7528 GPU \u52A0\u901F\uFF0C3D \u5BFC\u6F14\u53F0\u8FD0\u884C\u53EF\u80FD\u5361\u987F\u3002\u8BF7\u68C0\u67E5\u300C\u8BBE\u7F6E \u2192 \u9AD8\u7EA7\u300D\u4E2D\u7684 GPU \u52A0\u901F\u8BBE\u7F6E\u53CA\u672C\u673A\u663E\u793A\u73AF\u5883\uFF0C\u8C03\u6574\u540E\u91CD\u542F\u5E94\u7528\u3002","dlg.gpu_disabled_ack":"\u8FD4\u56DE\u753B\u5E03","sc.viewport_nav":"\u6CBF\u89C6\u89D2\u79FB\u52A8 / \u5347\u964D\uFF08\u70B9\u51FB\u89C6\u53E3\u540E\uFF09","sc.viewport_look":"\u539F\u5730\u73AF\u89C6\uFF08\u5DE6\u952E\u62D6\u62FD\uFF09","sc.viewport_yaw":"\u5DE6\u53F3\u8F6C\u5411\uFF08\u65E0\u9009\u4E2D\u65F6 Delete\uFF09","sc.viewport_speed":"\u901F\u5EA6\u500D\u7387\uFF08\xD75 / \xD70.2 / \xD710\uFF09","sc.outliner_range":"\u5DE6\u4FA7\u9762\u677F\u8303\u56F4\u9009\u62E9 / \u8FFD\u52A0\u8303\u56F4","sc.marquee":"\u8FFD\u52A0\u6846\u9009 / \u6392\u9664\u6846\u9009","sc.group_create":"\u7F16\u7EC4","sc.group_ungroup":"\u89E3\u7EC4","sc.group_pivot":"\u8BBE\u7F6E\u7EC4 Pivot\uFF08MMB \u4E3A\u9F20\u6807\u4E2D\u952E\uFF09","sc.modes":"\u79FB\u52A8 / \u65CB\u8F6C / \u7F29\u653E\u6A21\u5F0F","sc.snap":"\u7F51\u683C\u5438\u9644\u5F00\u5173","sc.copy_paste":"\u590D\u5236 / \u7C98\u8D34\u9009\u4E2D\u89D2\u8272","sc.delete":"\u5220\u9664\u9009\u4E2D\u5BF9\u8C61","sc.undo_redo":"\u64A4\u9500 / \u91CD\u505A","sc.deselect":"\u53D6\u6D88\u9009\u4E2D","viewcube.reset":"\u91CD\u7F6E\u89C6\u89D2","dlg.vcam_busy":"VCam \u8FD0\u955C\u4E2D\uFF0C\u8BF7\u5148\u5173\u95ED\u865A\u62DF\u6444\u50CF\u673A","dlg.campath_created_hint":"\u62D6\u52A8\u63A7\u5236\u70B9\u7F16\u8F91\u8DEF\u5F84\uFF1B\u53CC\u51FB\u66F2\u7EBF\u63D2\u5165\u70B9","dlg.vcam_open_title":"\u865A\u62DF\u6444\u50CF\u673A\uFF08\u624B\u673A\u626B\u7801\u8FD0\u955C\uFF09","pp.custom_color":"\u81EA\u5B9A\u4E49","pp.pose_untitled":"\u672A\u547D\u540D\u59FF\u52BF","err.img_gen_failed":"\u56FE\u7247\u751F\u6210\u5931\u8D25","err.img_empty":"\u56FE\u7247\u7ED3\u679C\u4E3A\u7A7A","pgen.err_empty":"\u8BF7\u586B\u5199\u63CF\u8FF0\u6216\u9009\u62E9\u53C2\u8003\u56FE","boot.preparing":"\u6B63\u5728\u51C6\u5907\u672C\u673A\u8FD0\u884C\u73AF\u5883\u2026","boot.starting":"\u6B63\u5728\u542F\u52A8\u672C\u673A\u4FE1\u4EE4\u670D\u52A1\u2026","boot.host_unsupported":"\u5F53\u524D\u5BBF\u4E3B\u7248\u672C\u4E0D\u652F\u6301\u672C\u673A\u670D\u52A1\uFF0C\u8BF7\u5347\u7EA7 App","boot.python_failed":"Python \u73AF\u5883\u521D\u59CB\u5316\u5931\u8D25","boot.start_failed":"\u672C\u673A\u4FE1\u4EE4\u670D\u52A1\u542F\u52A8\u5931\u8D25\uFF1A{detail}","vc.path_prefix":"\u8FD0\u955C","vc.title":"\u865A\u62DF\u6444\u50CF\u673A VCam","vc.close_title":"\u5173\u95ED\u5E76\u65AD\u5F00","vc.link_copied":"\u94FE\u63A5\u5DF2\u590D\u5236","vc.copy_failed":"\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u4E2D\u590D\u5236","vc.too_few_samples":"\u6837\u672C\u4E0D\u8DB3\uFF0C\u672A\u751F\u6210\u8FD0\u955C","vc.take_imported":"{label}\uFF08{dur}\uFF09\u5DF2\u5BFC\u5165\u8FD0\u955C\u65F6\u95F4\u7EBF","vc.stop_rec_first":"\u5F55\u5236\u4E2D\uFF0C\u8BF7\u5148\u505C\u6B62\u5F55\u5236\u518D\u9884\u89C8","vc.take_deleted":"\u8BE5\u8FD0\u955C\u5DF2\u88AB\u5220\u9664","vc.rtc_failed_flash":"WebRTC \u76F4\u8FDE\u5931\u8D25\uFF0CVCam \u4E0D\u53EF\u7528\uFF08\u8BF7\u68C0\u67E5 VPN / \u9632\u706B\u5899 / \u8DEF\u7531\u5668\u8BBE\u5907\u9694\u79BB\uFF09","vc.boot_retry_hint":"\u5173\u95ED\u672C\u9762\u677F\u540E\u91CD\u65B0\u6253\u5F00\u53EF\u91CD\u8BD5","vc.qr_alt":"\u626B\u7801\u8FDE\u63A5","vc.generating_qr":"\u751F\u6210\u4E8C\u7EF4\u7801\u2026","vc.connecting_signal":"\u8FDE\u63A5\u4FE1\u4EE4\u670D\u52A1\u2026","vc.scan_hint_1":"\u7528\u624B\u673A\u76F8\u673A\u626B\u7801\u6253\u5F00\u63A7\u5236\u9875","vc.scan_hint_2":"\uFF08\u9700\u4E0E\u7535\u8111\u5728\u540C\u4E00 Wi-Fi\uFF09","vc.copy_link_title":"\u70B9\u51FB\u590D\u5236\u94FE\u63A5","vc.trusted_https_hint":"\u5DF2\u542F\u7528\u53D7\u4FE1\u4EFB HTTPS\uFF0C\u624B\u673A\u626B\u7801\u53EF\u76F4\u63A5\u6253\u5F00","vc.selfsigned_hint":"\u624B\u673A\u9996\u6B21\u6253\u5F00\u9700\u4FE1\u4EFB\u672C\u673A HTTPS \u8BC1\u4E66\u63D0\u793A","vc.use_domain_url":"\u5207\u56DE\u57DF\u540D\u76F4\u8FDE\uFF08\u65E0\u8BC1\u4E66\u8B66\u544A\uFF09","vc.use_ip_url":"\u624B\u673A\u6253\u4E0D\u5F00\u9875\u9762\uFF1F\u6539\u7528 IP \u76F4\u8FDE","vc.phone_connected":"\u624B\u673A\u5DF2\u8FDE\u63A5","vc.viewfinder":"\u53D6\u666F","vc.direct_failed":"\u76F4\u8FDE\u5931\u8D25","vc.rtc_failed_detail":"\u624B\u673A\u4E0E\u7535\u8111\u7684 WebRTC \u76F4\u8FDE\u672A\u6253\u901A\uFF0C\u64CD\u63A7\u4E0E\u53D6\u666F\u5747\u4E0D\u53EF\u7528\uFF08\u59FF\u6001\u6570\u636E\u53EA\u8D70\u76F4\u8FDE\u901A\u9053\uFF09\u3002\u5E38\u89C1\u539F\u56E0\uFF1A\u7535\u8111\u5F00\u7740 VPN / \u4EE3\u7406\uFF08TUN \u6A21\u5F0F\u4F1A\u52AB\u6301 UDP\uFF09\u3001macOS \u9632\u706B\u5899\u672A\u653E\u884C\u6D4F\u89C8\u5668\u4F20\u5165\u8FDE\u63A5\u3001\u8DEF\u7531\u5668\u5F00\u542F\u4E86\u8BBE\u5907\u9694\u79BB\uFF08AP \u9694\u79BB\uFF09\u3002\u6392\u9664\u540E\u91CD\u65B0\u6253\u5F00\u672C\u9762\u677F\u626B\u7801\u8FDE\u63A5\u5373\u53EF\u3002","vc.recording":"\u5F55\u5236\u4E2D","vc.stop_recording":"\u505C\u6B62\u5F55\u5236","vc.start_recording":"\u5F00\u59CB\u5F55\u5236","vc.control_hint":"\u8F6C\u52A8\u624B\u673A\u63A7\u5236\u89C6\u89D2\uFF0C\u6447\u6746\u79FB\u52A8\uFF0C\u4E3B\u753B\u5E03\u5373\u53D6\u666F\u753B\u9762\u3002","vc.imported_hint":"\u5DF2\u5BFC\u5165 {count} \u6761\u8FD0\u955C\uFF0C\u5F55\u5236\u5B8C\u6210\u81EA\u52A8\u8FDB\u5165\u5E95\u90E8\u8FD0\u955C\u9762\u677F\u3002","vc.session_takes":"\u672C\u6B21\u5F55\u5236","vc.stop":"\u505C\u6B62","vc.preview":"\u9884\u89C8","vc.preview_note":"\u9884\u89C8\u671F\u95F4\u624B\u673A\u64CD\u63A7\u6682\u505C\uFF0C\u53D6\u666F\u540C\u6B65\u63A8\u5230\u624B\u673A\uFF1B\u64AD\u5B8C\u6216\u70B9\u505C\u6B62\u5373\u6062\u590D\u3002","ph.no_session_1":"\u94FE\u63A5\u7F3A\u5C11\u4F1A\u8BDD\u53C2\u6570\u3002","ph.no_session_2":"\u8BF7\u5728\u7535\u8111\u7AEF 3D \u5BFC\u6F14\u53F0\u6253\u5F00\u300C\u865A\u62DF\u6444\u50CF\u673A\u300D\u91CD\u65B0\u626B\u7801\u3002","ph.replaced_1":"\u4F1A\u8BDD\u5DF2\u5728\u5176\u4ED6\u8BBE\u5907\u6216\u9875\u9762\u6253\u5F00\uFF0C\u5F53\u524D\u8FDE\u63A5\u88AB\u63A5\u7BA1\u3002","ph.replaced_2":"\u5982\u9700\u5728\u672C\u673A\u7EE7\u7EED\u4F7F\u7528\uFF0C\u8BF7\u5728\u7535\u8111\u7AEF\u91CD\u65B0\u6253\u5F00\u300C\u865A\u62DF\u6444\u50CF\u673A\u300D\u5E76\u626B\u7801\u3002","ph.expired_1":"\u94FE\u63A5\u5DF2\u5931\u6548\uFF08\u4E8C\u7EF4\u7801\u5DF2\u66F4\u65B0\u6216\u4F1A\u8BDD\u5DF2\u7ED3\u675F\uFF09\u3002","ph.expired_2":"\u8BF7\u5728\u7535\u8111\u7AEF\u91CD\u65B0\u6253\u5F00\u300C\u865A\u62DF\u6444\u50CF\u673A\u300D\uFF0C\u626B\u63CF\u6700\u65B0\u4E8C\u7EF4\u7801\u3002","ph.title":"VCam \u865A\u62DF\u6444\u50CF\u673A","ph.intro_1":"\u4E3E\u8D77\u624B\u673A\u5373\u53EF\u63A7\u5236 3D \u573A\u666F\u4E2D\u7684\u76F8\u673A\u8FD0\u955C\u3002","ph.intro_2":"\u70B9\u51FB\u5F00\u59CB\u540E\u8BF7\u5141\u8BB8\u300C\u52A8\u4F5C\u4E0E\u65B9\u5411\u300D\u8BBF\u95EE\u6743\u9650\u3002","ph.landscape_ok":"\u5DF2\u6A2A\u5C4F\uFF0C\u53D6\u666F\u4F53\u9A8C\u6700\u4F73","ph.landscape_suggest":"\u5EFA\u8BAE\u6A2A\u5C4F\u63E1\u6301\u624B\u673A\u4F7F\u7528","ph.landscape_auto":"\u70B9\u51FB\u5F00\u59CB\u540E\u5C06\u81EA\u52A8\u5C1D\u8BD5\u6A2A\u5C4F\uFF1B\u82E5\u672A\u751F\u6548\u8BF7\u89E3\u9664\u7AD6\u6392\u9501\u5B9A\u5E76\u65CB\u8F6C\u624B\u673A","ph.start":"\u5F00\u59CB","ph.cant_connect_1":"\u8FDE\u4E0D\u4E0A\uFF1F\u8BF7\u786E\u8BA4\u624B\u673A\u4E0E\u7535\u8111\u8FDE\u63A5\u540C\u4E00 Wi-Fi \u540E\uFF0C","ph.cant_connect_2":"\u56DE\u5230\u7535\u8111\u7AEF\u91CD\u65B0\u626B\u7801\u3002","ph.connected":"\u5DF2\u8FDE\u63A5","ph.reconnecting":"\u91CD\u8FDE\u4E2D\u2026","ph.connecting":"\u8FDE\u63A5\u4E2D\u2026","ph.no_gyro":"\u65E0\u9640\u87BA\u4EEA\xB7\u6447\u6746\u6A21\u5F0F","ph.pinch_hint":"\u53CC\u6307\u7F29\u653E\u8C03\u8282\u89C6\u91CE","ph.stop":"\u505C\u6B62","ph.record_path":"\u5F55\u5236\u8DEF\u5F84","ph.elevate":"\u5347\u964D","ph.move":"\u79FB\u52A8","ph.hint":"\u5DF2\u5F55 {count} \u6761\u8FD0\u955C \xB7 \u8F6C\u52A8\u624B\u673A\u63A7\u5236\u89C6\u89D2 \xB7 \u53CC\u6307\u7F29\u653E\u8C03\u8282 FOV","ph.waiting_video":"\u7B49\u5F85\u753B\u9762\u2026","ph.not_connected":"\u672A\u8FDE\u63A5","ph.desktop_left":"\u684C\u9762\u7AEF\u5DF2\u65AD\u5F00","ph.rotate_title":"\u8BF7\u5C06\u624B\u673A\u65CB\u8F6C\u81F3\u6A2A\u5C4F","ph.rotate_sub":"\u6A2A\u5C4F\u53D6\u666F\u753B\u9762\u66F4\u5927\uFF0C\u8FD0\u955C\u66F4\u987A\u624B\uFF1B\u5982\u65E0\u53CD\u5E94\u8BF7\u89E3\u9664\u7CFB\u7EDF\u7AD6\u6392\u9501\u5B9A","ph.stay_portrait":"\u7EE7\u7EED\u7AD6\u5C4F\u4F7F\u7528","ph.force_landscape":"\u6211\u5DF2\u6A2A\u5C4F\uFF0C\u76F4\u63A5\u8FDB\u5165","ph.rtc_failed_title":"\u76F4\u8FDE\u5931\u8D25\uFF0CVCam \u5F53\u524D\u4E0D\u53EF\u7528","ph.rtc_failed_desc":"\u624B\u673A\u4E0E\u7535\u8111\u4E4B\u95F4\u7684 WebRTC \u76F4\u8FDE\u672A\u6253\u901A\uFF0C\u64CD\u63A7\u4E0E\u53D6\u666F\u5747\u5DF2\u505C\u7528\u3002","ph.rtc_failed_causes":"\u5E38\u89C1\u539F\u56E0\uFF1A","ph.rtc_cause_vpn":"\xB7 \u7535\u8111\u7AEF\u5F00\u7740 VPN / \u4EE3\u7406\uFF08TUN \u6A21\u5F0F\u4F1A\u52AB\u6301 UDP\uFF09","ph.rtc_cause_firewall":"\xB7 macOS \u9632\u706B\u5899\u672A\u653E\u884C\u6D4F\u89C8\u5668\u4F20\u5165\u8FDE\u63A5","ph.rtc_cause_ap":"\xB7 \u8DEF\u7531\u5668\u5F00\u542F\u4E86\u8BBE\u5907\u9694\u79BB\uFF08AP \u9694\u79BB\uFF09","ph.rtc_failed_footer":"\u6392\u9664\u540E\u8BF7\u5728\u7535\u8111\u7AEF\u91CD\u65B0\u6253\u5F00\u300C\u865A\u62DF\u6444\u50CF\u673A\u300D\u5E76\u626B\u7801","ph.lost_overlay":"\u8FDE\u63A5\u5DF2\u65AD\u5F00\uFF0C\u6B63\u5728\u91CD\u8FDE\u2026","ph.connecting_overlay":"\u6B63\u5728\u8FDE\u63A5\u2026"},yC={"camera_view.add_keyframe":"Add Keyframe","camera_view.keyframe_added":"Camera keyframe {n} added; timeline path updated","camera_view.keyframe_path":"{camera} \xB7 Keyframe {n}","camera_view.navigate":"Free","camera_view.precise":"Precise","camera_view.bind_camera":"Bind Camera","camera_view.create_camera":"New Camera","camera_view.format.photography":"Photography","camera_view.format.widescreen":"Widescreen","camera_view.format.portrait":"Portrait","camera_view.format.classic":"Classic","camera_view.format.square":"Square","camera_view.format.ultrawide":"Ultrawide","camera_view.fov.ultra_narrow":"Ultra Narrow","camera_view.fov.narrow":"Narrow","camera_view.fov.standard":"Standard","camera_view.fov.wide":"Wide","camera_view.fov.ultra_wide":"Ultra Wide","camera_view.fov.extreme":"Extreme","common.add":"Add","common.cancel":"Cancel","common.delete":"Delete","common.duplicate":"Duplicate","common.none":"None","common.image":"Image","common.character_default":"Character","common.camera_default":"Camera","common.prop_default":"Prop","common.crowd_default":"Crowd","common.group_default":"Group","common.campath_default":"Path ","common.track_default":"Track ","tree.title":"Scene","tree.search_placeholder":"Search\u2026","tree.empty":"Scene is empty. Add objects from the toolbar below.","tree.expand":"Expand scene panel","tree.collapse":"Collapse scene panel","tree.section.cameras":"Cameras","tree.section.characters":"Characters","tree.section.props":"Props","tree.section.local_assets":"Local Assets","tree.section.models":"Models","tree.section.groups":"Groups","tree.group_lock":"Lock group selection","tree.group_unlock":"Unlock to edit individual members","tree.section.campaths":"Camera Paths","tree.toggle_visible":"Show / Hide","tree.rename":"Rename","tb.add_character":"Add character","tb.local_upload":"Upload local","tb.crowd":"Crowd ({rows}x{cols})","tb.crowd_title":"Add crowd grid","tb.crowd_count":"{total} total","tb.rows":"Rows","tb.cols":"Cols","tb.gap":"Spacing","tb.props":"Objects","tb.add_camera":"Add camera","tb.apply_current_view":"Use current view","tb.preset_views":"Preset views","tb.aspect":"Aspect ratio","tb.ratio":"Ratio","tb.fullscreen":"Hide panels","tb.exit_fullscreen":"Show panels","tb.panorama":"Panorama","tb.ai_generate":"AI generate","pgen.title":"Generate panorama with AI","pgen.reference":"Reference (optional)","pgen.upload":"Upload image","pgen.add_reference":"Add reference","pgen.placeholder":"Describe what you want to generate","pgen.generate":"Generate","aigen.entry":"AI Generate","aigen.entry_hint":"Text / Reference","aigen.title":"AI Generate 3D Model","aigen.add_reference":"Add reference","aigen.placeholder":"Describe the model you want, e.g. a medieval longsword, a red sports car, a stone arch bridge\u2026","aigen.generate":"Generate","aigen.sent":"Sent to the project's main conversation \u2014 the main Agent is working on the scene\u2026","aigen.no_host":"No Hub Agent in this environment. Open the stage inside Hub to use AI generation.","aigen.agent_working":"Agent is working on the scene ({method})\u2026","aimotion.title":"AI Generate Motion","aimotion.placeholder":`Superhero three-point landing (starts standing, ~3s, no loop)
1. Crouch to load, leap up explosively, then drop fast
2. On impact: right foot planted in a deep squat, left knee and left fist slam the ground, torso leans forward, head down
3. Hold the three contact points while the free right arm sweeps back slowly, freezing in this hero pose`,"aimotion.sent":"Sent to the project's main conversation \u2014 the motion will appear on the director timeline when ready\u2026","aimotion.entry_hint":"Describe the motion","aipath.title":"AI Generate Camera Move","aipath.placeholder":"Describe the camera move, e.g. start low at the character's feet, push in slowly over 4s rising to chest height; hold a beat; then orbit right 120\xB0 while climbing 1.5m, freezing on the profile\u2026","aipath.sent":"Sent to the project's main conversation \u2014 the camera move will appear on the director timeline when ready\u2026","aipath.history":"AI history","aipath.new":"Generate new move","codemodel.build_failed":"AI model build failed: {msg}","pp.header_codemodel":"AI Model","pp.header_codepart":"Model Part","pp.parts":"Parts","pp.part_reset":"Reset to code baseline","pp.visible":"Visible","pp.part_of":"Part of {label}","pp.view_code":"View code","pp.regen_hint":"Describe changes in the Agent chat on the right to iterate on this model","tree.section.codemodels":"AI Models","pgen.generating":"Generating\u2026","pgen.failed":"Generation failed, please retry","pgen.quality_high":"High","pgen.resolution":"Resolution","pgen.quality":"Quality","pgen.background":"Background","pgen.count":"Count","pgen.q_low":"Low","pgen.q_medium":"Medium","pgen.bg_auto":"Auto","pgen.bg_transparent":"Transparent","pgen.bg_opaque":"Opaque","pgen.credits":"{n} credits \xB7 Generate","tool.move":"Move","tool.rotate":"Rotate","tool.scale":"Scale","tool.shortcut_hint":"Press 1 / 2 / 3 to switch Move, Rotate, and Scale","body.mannequin":"Male mannequin","body.female":"Female mannequin","body.child":"Child mannequin","propgroup.geo":"Geometry","propgroup.furniture":"Furniture","propgroup.building":"Building","propgroup.nature":"Nature","propgroup.street":"Street","prop.mesh_cube":"Cube","prop.mesh_sphere":"Sphere","prop.mesh_cylinder":"Cylinder","prop.mesh_torus":"Torus","prop.mesh_cone":"Cone","prop.mesh_pyramid":"Pyramid","prop.mesh_rectangle":"Rectangle","prop.mesh_disc":"Disc","prop.mesh_capsule":"Capsule","prop.mesh_arc":"Arc","prop.mesh_half_cylinder":"Half cylinder","prop.chair":"Chair","prop.sofa":"Sofa","prop.square_table":"Square table","prop.desk":"Desk","prop.round_table":"Round table","prop.bed":"Bed","prop.bookshelf":"Bookshelf","prop.stool":"Stool","prop.armchair":"Armchair","prop.cabinet":"Cabinet","prop.wardrobe":"Wardrobe","prop.tv":"TV","prop.wall_tv":"Wall-mounted TV","prop.floor_lamp":"Floor lamp","prop.table_lamp":"Table lamp","prop.rug":"Rug","prop.wall":"Wall","prop.column":"Column","prop.staircase":"Staircase","prop.ramp":"Ramp","prop.platform":"Platform","prop.arch":"Arch","prop.ladder":"Ladder","prop.statue":"Statue","prop.door":"Door","prop.fence":"Fence","prop.tree_small":"Small tree","prop.tree_large":"Large tree","prop.rock":"Rock","prop.bush":"Bush","prop.potted_plant":"Potted plant","prop.stump":"Stump","prop.flower_bed":"Flower bed","prop.car":"Car","prop.truck":"Truck","prop.bicycle":"Bicycle","prop.streetlamp":"Street lamp","prop.bench":"Bench","prop.trash_bin":"Trash bin","prop.traffic_cone":"Traffic cone","prop.road_barrier":"Road barrier","prop.sign":"Sign","prop.fire_hydrant":"Fire hydrant","prop.barrel":"Barrel","prop.crate":"Crate","pose.stand":"Stand","pose.tpose":"T-pose","pose.walk":"Walk","pose.run":"Run","pose.jump":"Jump","pose.sit":"Sit","pose.squat":"Squat","pose.kneel":"Kneel","pose.wave":"Wave","pose.hands_up":"Hands up","pose.bow":"Bow","pose.akimbo":"Akimbo","pose.think":"Think","pose.fight":"Fight","pose.lie":"Lying","pose.drive":"Driving","pose.aim":"Aim pistol","pose.sword":"Sword ready","pose.spell":"Cast spell","camera.front_medium":"Front medium","camera.front_closeup":"Front close-up","camera.front_wide":"Front wide","camera.side_tracking":"Side tracking","camera.side_close":"Side close","camera.back_medium":"Back medium","camera.top_wide":"Top wide","camera.top_45":"45\xB0 top","camera.low_angle":"Low angle","camera.low_wide":"Low wide","camera.over_shoulder_l":"Over shoulder","camera.over_shoulder_r":"Over shoulder (R)","camera.birdseye":"Bird's eye","camera.dutch":"Dutch angle","pp.tab_attr":"Attributes","pp.tab_pose":"Pose","pp.multi_note":"{count} characters selected \u2014 edits apply to all of them","pp.name":"Name","pp.position":"Position","pp.rotation":"Rotation","pp.scale":"Scale","pp.uniform_scale":"Uniform scale","pp.color":"Color","pp.cast_shadow":"Cast shadow","pp.pose_presets":"Pose presets","pp.pose_adjust":"Pose adjust","pp.pose_user_poses":"My poses","pp.pose_save":"Save current pose","pp.pose_save_placeholder":"Name this pose","pp.pose_save_confirm":"Save","pp.pose_user_empty":"No saved poses yet. Adjust the pose above and click Save to add one.","pp.pose_user_apply":"Apply","pp.pose_user_delete":"Delete","pp.pose_user_rename":"Rename","pp.pose_user_saved":"Saved to My poses","pp.pose_user_removed":"Removed","pp.pose_user_renamed":"Renamed","pp.pose_user_save_failed":"Save failed","pp.look_target":"Look-at target","pp.manual_coord":"Manual coords","pp.look_coord":"Look-at coords","pp.look_free":"Free (manual coords)","pp.fov":"Field of view (FOV)","pp.panorama_hint":"Connect an image node to the left input of the stage","pp.panorama_selected":"Panorama selected","pp.incoming_images":"Connected images","pp.pick_from_canvas":"Pick from canvas\u2026","pp.header_character":"Character","pp.header_prop":"Prop","pp.header_model":"Model","pp.header_camera":"Camera","pp.header_campath":"Camera Path","pp.model_type":"Model Type","pp.model_file":"File Name","pp.point_size":"Point Size","pp.point_color":"Point Color","pp.campath_look":"Look-at target","pp.campath_look_tangent":"Along tangent","pp.campath_look_recorded":"Recorded pose (default)","pp.campath_look_fixed":"Fixed point","pp.campath_look_point":"Look-at","pp.campath_easing":"Easing","ease.linear":"Linear","ease.easeIn":"Ease in","ease.easeOut":"Ease out","ease.easeInOut":"Ease in-out","ease.smoothstep":"Smoothstep","pp.campath_closed":"Closed loop","pp.campath_fov_anim":"FOV animation","pp.campath_fov_start":"Start FOV","pp.campath_fov_end":"End FOV","tb.campath_draw":"Draw path","tb.campath_presets":"Preset moves","campath.orbit":"Orbit","campath.arc":"Arc","campath.dolly_in":"Dolly in","campath.dolly_out":"Dolly out","campath.dolly_zoom":"Dolly zoom","campath.crane_up":"Crane up","campath.crane_down":"Crane down","campath.truck":"Truck","campath.spiral":"Spiral up","dlg.campath_pick_point":"Click the ground to place the camera path (Esc to cancel)","dlg.campath_draw_hint":"Click to place path points; Alt+scroll or Q/E to adjust height; double-click or Enter to finish, Esc to cancel","pp.campath_point_section":"Control point","pp.campath_point_pos":"Position","pp.campath_tangent_in":"In tangent","pp.campath_tangent_out":"Out tangent","pp.campath_tangent_mode":"Tangent mode","tan.aligned":"Aligned","tan.free":"Free","pp.campath_roll":"Roll","pp.campath_point_fov":"FOV override","pp.campath_fov_overridden":"Overridden by point FOV keys","pp.campath_speed":"Speed weight","pp.campath_edit_hint":"Drag XYZ axes to move the whole path \xB7 click a point to drag \xB7 drag tangent handles to shape (Alt to break) \xB7 double-click curve to insert \xB7 Delete to remove \xB7 Esc to exit","pp.campath_no_point_hint":"Select a control point on the canvas or timeline to edit its properties","tl.play":"Play","tl.pause":"Pause","tl.duration":"Duration","tl.panel_title":"Camera timeline","tl.add_path":"Add path","tl.path_picker_hint":"Choose AI generation, draw a path manually, or place a camera preset around a point in the scene.","tl.preview_hover":"Hover to preview","aipath.entry_hint":"Describe the camera move","tl.empty_hint":'Click "Add path" to create a camera clip',"tl.track_mute":"Hide track","tl.track_unmute":"Show track","tl.track_delete":"Delete track","tl.track_up":"Move up (higher priority)","tl.track_down":"Move down (lower priority)","tl.clip_enabled":"Enabled","tl.clip_start":"Start","tl.clip_path":"Path","tl.zoom_in":"Zoom in","tl.zoom_out":"Zoom out","tl.zoom_reset":"Zoom level (click to reset)","tl.vcam":"Phone Camera","tl.export":"Export camera video","tl.export_cancel":"Cancel export","tl.export_done":"Video exported","tl.export_inserted":"Video output to canvas","tl.export_failed":"Export failed","tl.export_unsupported":"This browser cannot record video","tl.export_hint":"Exporting: keep this window in the foreground and do not resize","tl.no_clips":"Timeline is empty \u2014 add a camera clip first","tl.bind_target":"Bind object (moves along path)","tl.bind_camera":"No binding","tl.target_missing":"Bound object deleted \u2014 rebind","tl.pick_object":"Bind object","tl.no_objects":"No characters or props in scene","tl.orient_follow":"Face motion direction","tl.orient_keep":"Keep orientation","tl.orient_label":"Facing","tl.add_anim":"Character anim","tl.pick_anim":"Animation presets","tl.anim_clip":"Animation","tl.no_chars":"No characters in scene \u2014 add one first","tl.anim_picker_hint":"Click an animation to add it to the timeline (bound to the selected character)","tl.anim_thumbs_baking":"Generating animation thumbnails\u2026","tl.custom_motions":"Generated motions","tl.preset_motions":"Preset motions","tl.delete_motion":"Delete this motion (timeline clips using it are removed too)","tl.delete_campath":"Delete this camera move (timeline clips using it are removed too)","pp.prop_picker_hint":"Choose a character or prop, then click the ground to place it. Esc to cancel","pp.prop_thumbs_baking":"Generating model thumbnails\u2026","anim.idle":"Idle","anim.walk":"Walk cycle","anim.run":"Run cycle","anim.jump":"Jump","anim.talk":"Talking","anim.wave":"Wave","anim.bow":"Bow","anim.cheer":"Cheer","anim.dance":"Dance loop","anim.sit_talk":"Sitting talk","anim.punch":"Punch","anim.death":"Death","dlg.place_pick_point":"Click the ground to place (Esc to cancel)","joint.group.body":"Body","joint.group.torso":"Torso","joint.group.head":"Head","joint.group.l_arm":"Left arm","joint.group.r_arm":"Right arm","joint.group.l_leg":"Left leg","joint.group.r_leg":"Right leg","joint.bend_fwd":"Bend","joint.turn_body":"Turn","joint.tilt_side":"Tilt","joint.twist":"Twist","joint.nod":"Nod","joint.turn_head":"Turn","joint.tilt_head":"Tilt","joint.raise_fwd":"Raise","joint.straddle":"Straddle","joint.elbow_bend":"Elbow bend","joint.forearm_twist":"Forearm twist","joint.wrist_bend":"Wrist bend","joint.wrist_twist":"Wrist twist","joint.ankle_bend":"Ankle bend","joint.knee_bend":"Knee bend","env.scene_3d":"3D scene","env.scene_scale":"Scene scale","env.scene_move":"Scene move","env.scene_rotate":"Scene rotate","env.panorama_bg":"Panorama background","env.panorama":"Panorama","env.bg_image":"Background image","env.bg_mode":"Background mode","env.bg_mode_flat":"Flat","env.bg_mode_panorama":"Panorama","env.sky_color":"Sky color","env.panorama_sphere":"Panorama sphere","env.h_rotate":"Horizontal rotation","env.sphere_radius":"Sphere radius","env.flat_fit":"Fit","env.flat_fit_contain":"Contain","env.flat_fit_cover":"Cover","env.flat_scale":"Scale","env.flat_offset_x":"Offset X","env.flat_offset_y":"Offset Y","env.char_labels":"Character labels","env.grid_snap":"Grid snap","env.ground":"Ground","env.opacity":"Opacity","env.height":"Height","dlg.director_view":"Free mode","dlg.camera_view":"Camera mode","dlg.shortcuts":"Shortcuts","dlg.undo":"Undo (Ctrl+Z)","dlg.redo":"Redo (Ctrl+Shift+Z)","dlg.output":"Output","dlg.export_image":"Export image","dlg.exit_editing":"Exit editing","dlg.select_char_first":"Select a character first","dlg.pose_copied":"Pose config copied to clipboard","dlg.chars_copied":"Copied {n} character(s), Ctrl+V to paste","dlg.copy_failed":"Copy failed","dlg.add_camera_first":"Add at least one camera first","dlg.capture_failed":"Capture failed","dlg.output_done":"Image output to canvas","dlg.output_failed":"Failed to output to canvas","dlg.downloaded":"Image downloaded","dlg.char_model_failed":'Failed to download model "{name}". Please check your network and retry.',"dlg.model_upload_failed":"Failed to save the model. Please try again.","dlg.unsupported_format":"Unsupported file format: {format}. Please upload GLB/GLTF/PLY/SPZ files.","dlg.gpu_disabled_title":"GPU acceleration is disabled","dlg.gpu_disabled_message":"3D Director needs GPU acceleration for smooth performance. Go to Settings \u2192 Advanced, turn off \u201CDisable GPU Acceleration\u201D, then restart the app.","dlg.gpu_disabled_auto":"The app automatically disabled GPU acceleration for stability, so 3D Director may run slowly. After resolving any graphics or display issues, re-enable GPU acceleration in Settings \u2192 Advanced and restart the app.","dlg.gpu_disabled_path":"The Windows installation path contains non-ASCII characters, so the app disabled GPU acceleration. Reinstall the app to a path containing only English letters, numbers, and common symbols before using 3D Director.","dlg.gpu_disabled_unknown":"GPU acceleration is unavailable, so 3D Director may run slowly. Check the GPU setting under Settings \u2192 Advanced and your display environment, then restart the app.","dlg.gpu_disabled_ack":"Back to canvas","sc.viewport_nav":"View-relative move / lift (click viewport)","sc.viewport_look":"Look around (left-drag)","sc.viewport_yaw":"Yaw (Delete when nothing selected)","sc.viewport_speed":"Speed (\xD75 / \xD70.2 / \xD710)","sc.outliner_range":"Outliner range / Add range","sc.marquee":"Add marquee / Remove marquee","sc.group_create":"Group","sc.group_ungroup":"Ungroup","sc.group_pivot":"Set group pivot (MMB: middle mouse button)","sc.modes":"Move / Rotate / Scale mode","sc.snap":"Toggle grid snap","sc.copy_paste":"Copy / Paste selected characters","sc.delete":"Delete selected","sc.undo_redo":"Undo / Redo","sc.deselect":"Deselect","viewcube.reset":"Reset view","dlg.vcam_busy":"VCam is active \u2014 close the virtual camera first","dlg.campath_created_hint":"Drag control points to edit the path; double-click the curve to insert a point","dlg.vcam_open_title":"Virtual camera (scan QR with your phone)","pp.custom_color":"Custom","pp.pose_untitled":"Untitled","err.img_gen_failed":"Image generation failed","err.img_empty":"Empty image result","pgen.err_empty":"Enter a description or choose a reference image","boot.preparing":"Preparing local runtime\u2026","boot.starting":"Starting local signaling service\u2026","boot.host_unsupported":"This host version doesn't support local services \u2014 please update the app","boot.python_failed":"Python environment initialization failed","boot.start_failed":"Local signaling service failed to start: {detail}","vc.path_prefix":"Take","vc.title":"Virtual Camera (VCam)","vc.close_title":"Close and disconnect","vc.link_copied":"Link copied","vc.copy_failed":"Copy failed \u2014 please select and copy manually","vc.too_few_samples":"Not enough samples \u2014 no take created","vc.take_imported":"{label} ({dur}) imported to the camera timeline","vc.stop_rec_first":"Recording \u2014 stop recording before previewing","vc.take_deleted":"This take has been deleted","vc.rtc_failed_flash":"WebRTC connection failed \u2014 VCam unavailable (check VPN / firewall / router AP isolation)","vc.boot_retry_hint":"Close this panel and reopen to retry","vc.qr_alt":"Scan to connect","vc.generating_qr":"Generating QR code\u2026","vc.connecting_signal":"Connecting to signaling service\u2026","vc.scan_hint_1":"Scan with your phone camera to open the controller","vc.scan_hint_2":"(phone must be on the same Wi-Fi as this computer)","vc.copy_link_title":"Click to copy link","vc.trusted_https_hint":"Trusted HTTPS enabled \u2014 the page opens directly after scanning","vc.selfsigned_hint":"On first open, accept the local HTTPS certificate prompt on your phone","vc.use_domain_url":"Switch back to domain URL (no certificate warning)","vc.use_ip_url":"Page won't open? Try direct IP instead","vc.phone_connected":"Phone connected","vc.viewfinder":"Viewfinder","vc.direct_failed":"Connection failed","vc.rtc_failed_detail":"The WebRTC connection between phone and computer could not be established, so control and the viewfinder are unavailable (pose data only travels over the direct channel). Common causes: a VPN / proxy on the computer (TUN mode hijacks UDP), the macOS firewall blocking inbound browser connections, or router AP/client isolation. After fixing, reopen this panel and scan again.","vc.recording":"Recording","vc.stop_recording":"Stop recording","vc.start_recording":"Start recording","vc.control_hint":"Rotate your phone to aim, use the joystick to move \u2014 the main canvas is the viewfinder.","vc.imported_hint":"{count} takes imported \u2014 finished recordings go straight to the timeline panel below.","vc.session_takes":"This session","vc.stop":"Stop","vc.preview":"Preview","vc.preview_note":"Phone control pauses during preview while the viewfinder keeps streaming to the phone; control resumes when playback ends or you press stop.","ph.no_session_1":"The link is missing session parameters.","ph.no_session_2":"Open \u201CVirtual Camera\u201D in the 3D Director Stage on your computer and scan again.","ph.replaced_1":"The session was opened on another device or page, taking over this connection.","ph.replaced_2":"To continue on this device, reopen \u201CVirtual Camera\u201D on your computer and scan again.","ph.expired_1":"This link has expired (the QR code was refreshed or the session ended).","ph.expired_2":"Reopen \u201CVirtual Camera\u201D on your computer and scan the latest QR code.","ph.title":"VCam Virtual Camera","ph.intro_1":"Hold up your phone to drive the camera in the 3D scene.","ph.intro_2":"After tapping Start, allow \u201CMotion & Orientation\u201D access.","ph.landscape_ok":"Landscape \u2014 best viewfinder experience","ph.landscape_suggest":"Landscape grip recommended","ph.landscape_auto":"We'll try to lock landscape after Start; if it doesn't work, disable rotation lock and rotate your phone","ph.start":"Start","ph.cant_connect_1":"Can't connect? Make sure your phone and computer are on the same Wi-Fi,","ph.cant_connect_2":"then rescan the QR code on your computer.","ph.connected":"Connected","ph.reconnecting":"Reconnecting\u2026","ph.connecting":"Connecting\u2026","ph.no_gyro":"No gyro \xB7 joystick mode","ph.pinch_hint":"Pinch to zoom FOV","ph.stop":"Stop","ph.record_path":"Record path","ph.elevate":"Elevate","ph.move":"Move","ph.hint":"{count} takes recorded \xB7 rotate phone to aim \xB7 pinch to zoom FOV","ph.waiting_video":"Waiting for video\u2026","ph.not_connected":"Not connected","ph.desktop_left":"Desktop disconnected","ph.rotate_title":"Rotate your phone to landscape","ph.rotate_sub":"Landscape gives a larger viewfinder and smoother moves; if nothing happens, disable the system rotation lock","ph.stay_portrait":"Continue in portrait","ph.force_landscape":"I'm in landscape \u2014 enter now","ph.rtc_failed_title":"Connection failed \u2014 VCam unavailable","ph.rtc_failed_desc":"The WebRTC connection between phone and computer could not be established; control and the viewfinder are disabled.","ph.rtc_failed_causes":"Common causes:","ph.rtc_cause_vpn":"\xB7 VPN / proxy running on the computer (TUN mode hijacks UDP)","ph.rtc_cause_firewall":"\xB7 macOS firewall blocking inbound browser connections","ph.rtc_cause_ap":"\xB7 Router AP/client isolation enabled","ph.rtc_failed_footer":"After fixing, reopen \u201CVirtual Camera\u201D on your computer and rescan","ph.lost_overlay":"Connection lost \u2014 reconnecting\u2026","ph.connecting_overlay":"Connecting\u2026"},xC={zh:vC,en:yC},em=xC;var SC=new URLSearchParams(location.search).get("locale")?.startsWith("en")?"en":"zh";function nm(e,t){return(em[SC][e]??em.en[e]??e).replace(/\{(\w+)\}/g,(n,i)=>t&&i in t?String(t[i]):n)}var $x=()=>nm;function tS({children:e}){return e}var J=hi(Ts(),1);function bC(){let e=new URLSearchParams(location.hash.replace(/^#/,"")),t=e.get("s"),n=e.get("t");return t&&n?{s:t,t:n}:null}function MC(){let e="(orientation: landscape)",[t,n]=(0,Jt.useState)(()=>typeof matchMedia<"u"&&matchMedia(e).matches);return(0,Jt.useEffect)(()=>{if(typeof matchMedia>"u")return;let i=matchMedia(e),a=()=>n(i.matches);return typeof i.addEventListener=="function"?(i.addEventListener("change",a),()=>i.removeEventListener("change",a)):(i.addListener(a),()=>i.removeListener(a))},[]),t}function iS(){let e=$x(),t=(0,Jt.useRef)(bC()).current,[n,i]=(0,Jt.useState)(t?"idle":"no-session"),[a,s]=(0,Jt.useState)(null),[r,o]=(0,Jt.useState)(!1),[l,c]=(0,Jt.useState)(!1),[h,d]=(0,Jt.useState)(!1),[f,p]=(0,Jt.useState)(!1),[v,y]=(0,Jt.useState)(!1),[m,u]=(0,Jt.useState)(0),[_,g]=(0,Jt.useState)(50),[b,T]=(0,Jt.useState)(0),[R,w]=(0,Jt.useState)(null),U=MC(),[x,A]=(0,Jt.useState)(!1),[F,Y]=(0,Jt.useState)(0),$=(0,Jt.useRef)(0),L=U||F!==0;(0,Jt.useEffect)(()=>{U&&$.current!==0&&($.current=0,Y(0))},[U]);let H=(0,Jt.useRef)(null),q=(0,Jt.useRef)(null),k=(0,Jt.useRef)(null),Q=(0,Jt.useRef)({q:new zn,joy:[0,0],elev:0,gyro:!1,lastOri:null}),X=(0,Jt.useRef)(!1);X.current=r;let j=(0,Jt.useRef)(n);j.current=n;let tt=rt=>{w(rt),setTimeout(()=>w(null),1800)};(0,Jt.useEffect)(()=>{let rt=H.current;rt&&q.current&&rt.srcObject!==q.current&&(rt.srcObject=q.current,rt.play().catch(()=>{}))});let dt=(0,Jt.useRef)(0);(0,Jt.useEffect)(()=>{if(!v){u(0);return}dt.current=performance.now();let rt=setInterval(()=>u(performance.now()-dt.current),200);return()=>clearInterval(rt)},[v]);let V=async()=>{if(!t||k.current)return;if(await jx()==="granted"){let E=S=>{S.alpha==null||S.beta==null||S.gamma==null||(Q.current.lastOri=[S.beta,S.gamma],Xx(S.alpha,S.beta,S.gamma,$.current||Yx(),Q.current.q),Q.current.gyro=!0,c(!0))};window.addEventListener("deviceorientation",E,!0)}Zx(),i("connecting");let pt=new zu("phone",t.s,t.t),Ot=new Iu(E=>pt.send({type:"rtc",payload:E}),E=>{console.log(`[vcam-rtc] ${E}`),pt.send({type:"debug-log",text:`${(performance.now()/1e3).toFixed(1)}s ${E}`})});Ot.onTrack=E=>{q.current=E;let S=H.current;S&&(S.srcObject=E,S.play().catch(()=>{})),d(!0)},Ot.onState=E=>{E==="connected"&&p(!1),E==="failed"&&(p(!0),d(!1),q.current=null)},pt.on("rtc",E=>{Ot.handleSignal(E.payload)}),pt.on("paired",()=>{o(!0),p(!1),i("live")}),pt.on("peer-left",()=>{o(!1),d(!1),p(!1),q.current=null,Ot.stop(),tt(nm("ph.desktop_left"))}),pt.on("state",E=>{y(E.recording),g(E.fov),T(E.takeCount)}),pt.on("rtc-failed",()=>{p(!0),d(!1),q.current=null,Ot.stop()}),pt.onStatus(E=>{if(E==="rejected"){s(pt.rejectReason),i("rejected");return}E==="closed"&&j.current!=="idle"&&j.current!=="connecting"&&(o(!1),d(!1),i("lost")),E==="open"&&j.current==="lost"&&i("connecting")}),pt.connect(),k.current={sock:pt,sub:Ot};try{await navigator.wakeLock?.request("screen")}catch{}let he=0,Ce=()=>{if(he=requestAnimationFrame(Ce),document.visibilityState==="hidden"||!X.current)return;let E=Q.current;Ot.sendData(JSON.stringify({type:"pose",q:[E.q.x,E.q.y,E.q.z,E.q.w],joy:E.joy,elev:E.elev,t:performance.now(),gyro:E.gyro}))};he=requestAnimationFrame(Ce),window.addEventListener("pagehide",()=>{cancelAnimationFrame(he),pt.close()})},Z=rt=>k.current?.sock.send(rt),ct=(0,Jt.useRef)(_);ct.current=_;let gt=(0,Jt.useRef)(null),_t=rt=>Math.hypot(rt[0].clientX-rt[1].clientX,rt[0].clientY-rt[1].clientY),Ut={onTouchStart:rt=>{rt.targetTouches.length===2&&(gt.current={dist:_t(rt.targetTouches),fov:ct.current})},onTouchMove:rt=>{let pt=gt.current;if(!pt||rt.targetTouches.length!==2)return;let Ot=_t(rt.targetTouches);if(Ot<=0)return;let he=Math.round(Math.min(120,Math.max(10,pt.fov*(pt.dist/Ot))));he!==ct.current&&(g(he),Z({type:"fov",value:he}))},onTouchEnd:rt=>{rt.targetTouches.length<2&&(gt.current=null)},onTouchCancel:()=>{gt.current=null}};if(n==="no-session")return(0,J.jsx)(im,{children:(0,J.jsxs)("p",{className:"text-center text-[15px] leading-relaxed text-muted-foreground px-8",children:[e("ph.no_session_1"),(0,J.jsx)("br",{}),e("ph.no_session_2")]})});if(n==="rejected")return(0,J.jsx)(im,{children:(0,J.jsx)("p",{className:"text-center text-[15px] leading-relaxed text-muted-foreground px-8",children:a==="replaced"?(0,J.jsxs)(J.Fragment,{children:[e("ph.replaced_1"),(0,J.jsx)("br",{}),e("ph.replaced_2")]}):(0,J.jsxs)(J.Fragment,{children:[e("ph.expired_1"),(0,J.jsx)("br",{}),e("ph.expired_2")]})})});if(n==="idle")return(0,J.jsx)(im,{children:(0,J.jsxs)("div",{className:"flex flex-col items-center gap-5 px-8",children:[(0,J.jsx)("div",{className:"text-[22px] font-semibold text-foreground",children:e("ph.title")}),(0,J.jsxs)("p",{className:"text-center text-[14px] leading-relaxed text-muted-foreground",children:[e("ph.intro_1"),(0,J.jsx)("br",{}),e("ph.intro_2")]}),(0,J.jsxs)("div",{className:"flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3",children:[U?(0,J.jsx)("span",{className:"grid h-10 w-10 shrink-0 place-items-center text-[18px] text-emerald-400",children:"\u2713"}):(0,J.jsx)(eS,{className:"h-10 w-10 shrink-0"}),(0,J.jsx)("div",{className:"text-left text-[13px] leading-relaxed text-muted-foreground",children:U?(0,J.jsx)(J.Fragment,{children:e("ph.landscape_ok")}):(0,J.jsxs)(J.Fragment,{children:[e("ph.landscape_suggest"),(0,J.jsx)("br",{}),(0,J.jsx)("span",{className:"text-[12px] text-muted-foreground/60",children:e("ph.landscape_auto")})]})})]}),(0,J.jsx)("button",{className:"rounded-full bg-foreground px-10 py-3.5 text-[16px] font-medium text-background active:opacity-80","data-action-ui-id":"director.phone-start",onClick:()=>{V()},children:e("ph.start")}),(0,J.jsxs)("p",{className:"text-center text-[12px] text-muted-foreground/70",children:[e("ph.cant_connect_1"),(0,J.jsx)("br",{}),e("ph.cant_connect_2")]})]})});let Lt=n==="connecting"||n==="lost"||!r,At=(0,J.jsx)("span",{className:`rounded bg-black/45 px-1.5 py-0.5 text-[12px] backdrop-blur-sm ${r?"text-white":"text-white/50"}`,children:e(r?"ph.connected":n==="lost"?"ph.reconnecting":"ph.connecting")}),Nt=(0,J.jsxs)("div",{className:"flex flex-col items-start gap-1",children:[At,(0,J.jsx)("span",{className:"rounded bg-black/45 px-1.5 py-0.5 text-[11px] text-white/60 backdrop-blur-sm",children:e("ph.pinch_hint")})]}),N=(0,J.jsxs)("span",{className:"flex items-center gap-2 text-[12px]",children:[!l&&(0,J.jsx)("span",{className:"rounded bg-black/45 px-1.5 py-0.5 text-white/70 backdrop-blur-sm",children:e("ph.no_gyro")}),v&&(0,J.jsxs)("span",{className:"flex items-center gap-1 rounded bg-red-600/80 px-1.5 py-0.5 text-white",children:[(0,J.jsx)("span",{className:"h-1.5 w-1.5 animate-pulse rounded-full bg-white"}),EC(m)]})]}),Fe=rt=>(0,J.jsxs)("button",{className:`flex items-center gap-2 rounded-full font-medium active:opacity-80 ${rt?"h-10 px-4 text-[13px]":"h-12 px-5 text-[14px]"} ${v?"bg-red-600 text-white":"border border-border bg-black/40 text-foreground backdrop-blur-sm"}`,"data-action-ui-id":"director.phone-record",onClick:()=>Z({type:"record",action:v?"stop":"start"}),children:[(0,J.jsx)("span",{className:`h-2.5 w-2.5 rounded-full ${v?"bg-white":"bg-red-500"}`}),e(v?"ph.stop":"ph.record_path")]}),xt=(0,J.jsxs)("div",{className:"flex flex-col items-center gap-2",children:[(0,J.jsx)(nS,{label:"\u25B2",onHold:rt=>{Q.current.elev=rt?1:0}}),(0,J.jsx)(nS,{label:"\u25BC",onHold:rt=>{Q.current.elev=rt?-1:0}}),(0,J.jsx)("span",{className:"mt-1 rounded bg-black/45 px-1.5 py-0.5 text-center text-[11px] text-white/70 backdrop-blur-sm",children:e("ph.elevate")})]}),Ht=e("ph.hint",{count:b}),bt=rt=>(0,J.jsxs)("div",{className:rt,style:{touchAction:"none"},...Ut,children:[(0,J.jsx)("video",{ref:H,autoPlay:!0,playsInline:!0,muted:!0,className:"h-full w-full object-contain"}),!h&&(0,J.jsx)("div",{className:"absolute inset-0 grid place-items-center px-8 text-center text-[13px] leading-relaxed text-muted-foreground",children:e(r?"ph.waiting_video":"ph.not_connected")})]});return(0,J.jsxs)("div",{className:`fixed select-none bg-black text-foreground ${F?"left-0 top-0":"inset-0"}`,style:{touchAction:"none",...F?{width:"100dvh",height:"100dvw",transformOrigin:"top left",transform:F===90?"rotate(90deg) translateY(-100%)":"rotate(-90deg) translateX(-100%)"}:void 0},children:[L?(0,J.jsxs)("div",{className:"relative h-full w-full",children:[bt("absolute inset-0"),(0,J.jsxs)("div",{className:"absolute inset-x-0 top-0 flex items-start justify-between gap-3 py-2",style:{paddingLeft:"max(0.75rem, env(safe-area-inset-left))",paddingRight:"max(0.75rem, env(safe-area-inset-right))"},children:[Nt,(0,J.jsxs)("div",{className:"flex items-center gap-2",children:[N,Fe(!0)]})]}),(0,J.jsx)("div",{className:"absolute bottom-5",style:{left:"max(1.25rem, env(safe-area-inset-left))"},children:xt}),(0,J.jsxs)("div",{className:"absolute bottom-5 flex flex-col items-center gap-1",style:{right:"max(1.25rem, env(safe-area-inset-right))"},children:[(0,J.jsx)(tm,{size:112,rotate:F,onChange:(rt,pt)=>{Q.current.joy=[rt,pt]}}),(0,J.jsx)("span",{className:"rounded bg-black/45 px-1.5 py-0.5 text-[11px] text-white/70 backdrop-blur-sm",children:e("ph.move")})]})]}):(0,J.jsxs)("div",{className:"flex h-full flex-col",children:[(0,J.jsxs)("div",{className:"relative w-full shrink-0 bg-black",style:{aspectRatio:"16/9",maxHeight:"48vh"},children:[bt("relative h-full w-full"),(0,J.jsxs)("div",{className:"absolute left-0 right-0 top-0 flex items-start justify-between px-3 py-2",children:[Nt,N]})]}),(0,J.jsxs)("div",{className:"flex min-h-0 flex-1 flex-col px-4 pb-6 pt-3",style:{paddingBottom:"max(1.5rem, env(safe-area-inset-bottom))"},children:[(0,J.jsx)("div",{className:"flex items-center justify-center gap-3",children:Fe(!1)}),(0,J.jsx)("div",{className:"flex-1"}),(0,J.jsxs)("div",{className:"flex items-end justify-between",children:[xt,(0,J.jsxs)("div",{className:"flex flex-col items-center gap-1",children:[(0,J.jsx)(tm,{onChange:(rt,pt)=>{Q.current.joy=[rt,pt]}}),(0,J.jsx)("span",{className:"rounded bg-black/45 px-1.5 py-0.5 text-[11px] text-white/70 backdrop-blur-sm",children:e("ph.move")})]})]}),(0,J.jsx)("div",{className:"mt-2 text-center text-[11px] text-muted-foreground/60",children:Ht})]})]}),!L&&!x&&(0,J.jsxs)("div",{className:"absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-black/95 px-8",children:[(0,J.jsx)(eS,{className:"h-16 w-16"}),(0,J.jsxs)("p",{className:"text-center text-[16px] leading-relaxed text-white/90",children:[e("ph.rotate_title"),(0,J.jsx)("br",{}),(0,J.jsx)("span",{className:"text-[13px] text-white/50",children:e("ph.rotate_sub")})]}),(0,J.jsx)("button",{className:"rounded-full bg-white/90 px-6 py-2.5 text-[14px] font-medium text-black active:opacity-80",onClick:()=>{let rt=Q.current.lastOri,Ot=(rt?qx(rt[0],rt[1]):90)===-90?-90:90;$.current=Ot,Y(Ot)},children:e("ph.force_landscape")}),(0,J.jsx)("button",{className:"rounded-full border border-white/20 px-5 py-2 text-[13px] text-white/60 active:bg-white/10",onClick:()=>A(!0),children:e("ph.stay_portrait")})]}),f&&n==="live"&&(0,J.jsxs)("div",{className:"absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/95 px-8",children:[(0,J.jsx)("p",{className:"text-center text-[17px] font-medium text-white/90",children:e("ph.rtc_failed_title")}),(0,J.jsxs)("p",{className:"text-center text-[13px] leading-relaxed text-white/60",children:[e("ph.rtc_failed_desc"),(0,J.jsx)("br",{}),e("ph.rtc_failed_causes"),(0,J.jsx)("br",{}),e("ph.rtc_cause_vpn"),(0,J.jsx)("br",{}),e("ph.rtc_cause_firewall"),(0,J.jsx)("br",{}),e("ph.rtc_cause_ap")]}),(0,J.jsx)("p",{className:"text-center text-[12px] text-white/40",children:e("ph.rtc_failed_footer")})]}),Lt&&n!=="live"&&(0,J.jsx)("div",{className:"pointer-events-none absolute inset-0 z-10 grid place-items-center bg-black/50",children:(0,J.jsx)("span",{className:"rounded-lg bg-black/80 px-4 py-2 text-[14px] text-white/85",children:e(n==="lost"?"ph.lost_overlay":"ph.connecting_overlay")})}),R&&(0,J.jsx)("div",{className:"pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white/15 px-3 py-1.5 text-[13px] text-white backdrop-blur",children:R})]})}function eS({className:e}){return(0,J.jsxs)("div",{className:e,children:[(0,J.jsx)("style",{children:"@keyframes vcam-rotate{0%,18%{transform:rotate(0)}50%,82%{transform:rotate(-90deg)}100%{transform:rotate(0)}}"}),(0,J.jsx)("svg",{viewBox:"0 0 64 64",className:"h-full w-full",children:(0,J.jsxs)("g",{style:{transformOrigin:"32px 32px",animation:"vcam-rotate 2.6s ease-in-out infinite"},children:[(0,J.jsx)("rect",{x:"22",y:"12",width:"20",height:"40",rx:"4",fill:"none",stroke:"currentColor",strokeWidth:"2.5",className:"text-white/90"}),(0,J.jsx)("circle",{cx:"32",cy:"46",r:"2",fill:"currentColor",className:"text-white/90"})]})})]})}function nS({label:e,onHold:t}){return(0,J.jsx)("button",{className:"grid h-14 w-14 place-items-center rounded-full border border-white/25 bg-black/45 text-[16px] text-white backdrop-blur-sm active:bg-white/25",style:{touchAction:"none"},onPointerDown:n=>{n.currentTarget.setPointerCapture(n.pointerId),t(!0)},onPointerUp:()=>t(!1),onPointerCancel:()=>t(!1),onContextMenu:n=>n.preventDefault(),children:e})}function im({children:e}){return(0,J.jsx)("div",{className:"fixed inset-0 grid place-items-center overflow-y-auto bg-black text-foreground",children:e})}function EC(e){let t=Math.floor(e/1e3);return`${String(Math.floor(t/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`}var Hu=hi(Ts(),1);document.documentElement.setAttribute("data-theme","dark");sS.default.createRoot(document.getElementById("root")).render((0,Hu.jsx)(aS.default.StrictMode,{children:(0,Hu.jsx)(tS,{children:(0,Hu.jsx)(iS,{})})}));})();
/*! Bundled license information:

react/cjs/react.production.js:
  (**
   * @license React
   * react.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

scheduler/cjs/scheduler.production.js:
  (**
   * @license React
   * scheduler.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react-dom/cjs/react-dom.production.js:
  (**
   * @license React
   * react-dom.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react-dom/cjs/react-dom-client.production.js:
  (**
   * @license React
   * react-dom-client.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react-jsx-runtime.production.js:
  (**
   * @license React
   * react-jsx-runtime.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2023 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
