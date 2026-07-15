import{j as r,R as S,r as N}from"./iframe-CRlzrArO.js";import{w as M,a as P}from"./responsive-decorators-Bcu_tUP2.js";import{P as i,S as R,N as C,a as m,M as A,C as D,F as T}from"./StickyHeader-Ks_J71xM.js";import{H as y,S as _}from"./Header-CSbqshjm.js";import{n as O,M as k,g as E,c as H,d as t,e as L,L as B}from"./mocks-21Dvz4uj.js";import"./fromProgramData-DHY4gYOX.js";import"./cluster-zsaKFN-L.js";import{T as G}from"./TransactionHistoryCard-BLZ0fue0.js";import{N as I}from"./NavigationTabs-LwnE9tCN.js";import{U as K}from"./UpgradeableProgramSection-B0syJ6Yz.js";import"./index-Cun1SEai.js";import"./index.browser.esm-Ci1UQyGp.js";import"./index-CKHJf83E.js";import"./verified-builds-h1zNVeSe.js";import"./useCopyToClipboard-BdywpqX_.js";import"./index-DM8-PE0G.js";import"./cluster-CTElM7Kw.js";import"./index-XYy5IKpr.js";import"./tabs-CcRN6Phh.js";import"./check-circle-BWGel2E6.js";import"./index-Bgo6oLpT.js";import"./utils-CA04WxlW.js";import"./button-NvfdiL5w.js";import"./Alert-CDRBvKjb.js";import"./alert-circle-gAOD6ko6.js";import"./TokenVerificationButton-ROPUon0x.js";import"./help-circle-SyiG42nh.js";import"./ErrorCard-DY2MW1Pa.js";import"./popover-C4TBWjH7.js";import"./RawDataField-C5W7Q1Xc.js";import"./x-H8DAF0hF.js";import"./VerifiedBadge-CWqpa7dK.js";import"./skeleton-BHoPdXDp.js";import"./UnknownAccountCard-nuhwEUl-.js";import"./BaseSecurityNotification-CT6OIYfj.js";import"./react-error-boundary.esm-BL25MQbG.js";import"./constants-B4PdqX7Z.js";import"./Slot-5PJ4LnvR.js";import"./transaction-history-DeJ2Z8DF.js";import"./use-refresh-account-HfasQgMc.js";import"./KeyValue-zGVILgze.js";import"./Icon-CP6uJGP8.js";import"./Label-mHEzIVTt.js";import"./constants-C6SyxvEx.js";import"./VerifiedProgramBadge-BbTBXiqD.js";import"./external-link-Ci3g-JLW.js";import"./info-Dh_RPm9j.js";const F=t.parsedData.type==="program"?t.parsedData.info:{programData:t.account.pubkey};function U({children:a}){return r.jsxs("div",{className:"flex min-h-screen flex-col",children:[r.jsxs("div",{className:"min-w-[292px] flex-1 pb-6",children:[r.jsx(C,{children:r.jsx(m,{})}),r.jsx(A,{}),r.jsx(i,{className:"my-3 xl:hidden",children:r.jsx("div",{className:"mx-auto w-full max-w-[960px]",children:r.jsx(m,{})})}),r.jsx(i,{className:"my-3 lg:hidden",children:r.jsx("div",{className:"mx-auto w-full max-w-[960px]",children:r.jsx(D,{})})}),a]}),r.jsx(T,{})]})}const V=[{path:"",title:"History"},{path:"security",title:"Security"},{path:"verified-build",title:"Verified Build"},{path:"tokens",title:"Tokens"},{path:"domains",title:"Domains"},{path:"idl",title:"Program IDL"}];function b({address:a}){const v=S.useCallback(w=>`/address/${a}/${w}`,[a]);return r.jsx(i,{variant:"pulled-up",children:r.jsxs(N.Suspense,{fallback:r.jsx(B,{}),children:[r.jsxs("div",{className:"mx-auto w-full max-w-[960px]",children:[r.jsx(y,{address:a,account:H,isTokenInfoLoading:!1}),r.jsx(K,{account:t.account,programAccount:F,programData:t.programData})]}),r.jsx(_,{parsedData:L,address:a}),r.jsx(R,{className:"mx-auto w-[min(100%,960px)]",children:r.jsx(i,{children:r.jsx("div",{className:"mx-auto w-full max-w-[960px]",children:r.jsx(I,{buildHref:v,tabs:V})})})}),r.jsx(G,{address:a})]})})}const Br={component:b,decorators:[M,a=>r.jsx(E,{children:r.jsx(a,{})}),P],parameters:{...O,layout:"fullscreen"},title:"Design Slices/program-account/program-account@Media"},n=a=>r.jsx(U,{children:r.jsx(b,{...a})}),p={address:k},o={args:p,globals:{viewport:{value:"iphonex"}},render:n},e={args:p,globals:{viewport:{value:"ipad"}},render:n},s={args:p,globals:{viewport:{isRotated:!0,value:"ipad"}},render:n};var c,l,d;o.parameters={...o.parameters,docs:{...(c=o.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args,
  globals: {
    viewport: {
      value: 'iphonex'
    }
  },
  render
}`,...(d=(l=o.parameters)==null?void 0:l.docs)==null?void 0:d.source}}};var u,x,g;e.parameters={...e.parameters,docs:{...(u=e.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args,
  globals: {
    viewport: {
      value: 'ipad'
    }
  },
  render
}`,...(g=(x=e.parameters)==null?void 0:x.docs)==null?void 0:g.source}}};var j,h,f;s.parameters={...s.parameters,docs:{...(j=s.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args,
  globals: {
    viewport: {
      isRotated: true,
      value: 'ipad'
    }
  },
  render
}`,...(f=(h=s.parameters)==null?void 0:h.docs)==null?void 0:f.source}}};const Gr=["Mobile","TabletPortrait","TabletLandscape"];export{o as Mobile,s as TabletLandscape,e as TabletPortrait,Gr as __namedExportsOrder,Br as default};
