import{j as r,R as v,r as M}from"./iframe-CRlzrArO.js";import{P as t,S as R,N as b,a as l,M as _,C as k,F as E}from"./StickyHeader-Ks_J71xM.js";import{H,S as O}from"./Header-CSbqshjm.js";import{n as L,w as T,M as I,a as B,b as G,c as K,d as e,e as U,L as A}from"./mocks-21Dvz4uj.js";import"./fromProgramData-DHY4gYOX.js";import"./cluster-zsaKFN-L.js";import{T as F}from"./TransactionHistoryCard-BLZ0fue0.js";import{N as $}from"./NavigationTabs-LwnE9tCN.js";import{U as V}from"./UpgradeableProgramSection-B0syJ6Yz.js";import{w as q}from"./responsive-decorators-Bcu_tUP2.js";import"./index-Cun1SEai.js";import"./verified-builds-h1zNVeSe.js";import"./index.browser.esm-Ci1UQyGp.js";import"./index-CKHJf83E.js";import"./useCopyToClipboard-BdywpqX_.js";import"./index-DM8-PE0G.js";import"./cluster-CTElM7Kw.js";import"./index-XYy5IKpr.js";import"./tabs-CcRN6Phh.js";import"./check-circle-BWGel2E6.js";import"./index-Bgo6oLpT.js";import"./utils-CA04WxlW.js";import"./button-NvfdiL5w.js";import"./Alert-CDRBvKjb.js";import"./alert-circle-gAOD6ko6.js";import"./TokenVerificationButton-ROPUon0x.js";import"./help-circle-SyiG42nh.js";import"./ErrorCard-DY2MW1Pa.js";import"./popover-C4TBWjH7.js";import"./RawDataField-C5W7Q1Xc.js";import"./x-H8DAF0hF.js";import"./VerifiedBadge-CWqpa7dK.js";import"./skeleton-BHoPdXDp.js";import"./UnknownAccountCard-nuhwEUl-.js";import"./BaseSecurityNotification-CT6OIYfj.js";import"./react-error-boundary.esm-BL25MQbG.js";import"./constants-B4PdqX7Z.js";import"./Slot-5PJ4LnvR.js";import"./transaction-history-DeJ2Z8DF.js";import"./use-refresh-account-HfasQgMc.js";import"./KeyValue-zGVILgze.js";import"./Icon-CP6uJGP8.js";import"./Label-mHEzIVTt.js";import"./constants-C6SyxvEx.js";import"./VerifiedProgramBadge-BbTBXiqD.js";import"./external-link-Ci3g-JLW.js";import"./info-Dh_RPm9j.js";const z=e.parsedData.type==="program"?e.parsedData.info:{programData:e.account.pubkey};function m({children:a}){return r.jsxs("div",{className:"flex min-h-screen flex-col",children:[r.jsxs("div",{className:"min-w-[292px] flex-1 pb-6",children:[r.jsx(b,{children:r.jsx(l,{})}),r.jsx(_,{}),r.jsx(t,{className:"my-3 xl:hidden",children:r.jsx("div",{className:"mx-auto w-full max-w-[960px]",children:r.jsx(l,{})})}),r.jsx(t,{className:"my-3 lg:hidden",children:r.jsx("div",{className:"mx-auto w-full max-w-[960px]",children:r.jsx(k,{})})}),a]}),r.jsx(E,{})]})}const J=[{path:"",title:"History"},{path:"security",title:"Security"},{path:"verified-build",title:"Verified Build"},{path:"tokens",title:"Tokens"},{path:"domains",title:"Domains"},{path:"idl",title:"Program IDL"}];function c({address:a}){const D=v.useCallback(N=>`/address/${a}/${N}`,[a]);return r.jsx(t,{variant:"pulled-up",children:r.jsxs(M.Suspense,{fallback:r.jsx(A,{}),children:[r.jsxs("div",{className:"mx-auto w-full max-w-[960px]",children:[r.jsx(H,{address:a,account:K,isTokenInfoLoading:!1}),r.jsx(V,{account:e.account,programAccount:z,programData:e.programData})]}),r.jsx(O,{parsedData:U,address:a}),r.jsx(R,{className:"mb-10 mx-auto w-[min(100%,960px)]",children:r.jsx(t,{children:r.jsx("div",{className:"mx-auto w-full max-w-[960px]",children:r.jsx($,{buildHref:D,tabs:J,className:"pt-2"})})})}),r.jsx(F,{address:a})]})})}const Ur={component:c,decorators:[q],parameters:{...L,layout:"fullscreen"},title:"Design Slices/program-account"},p={address:I},s={args:p,decorators:[T],render:a=>r.jsx(m,{children:r.jsx(c,{...a})})},o={args:p,decorators:[B],render:a=>r.jsx(m,{children:r.jsx(c,{...a})})},i={args:p,decorators:[G],render:a=>r.jsx(m,{children:r.jsx(c,{...a})})},n={args:p,render:()=>r.jsx(m,{children:r.jsx(t,{variant:"pulled-up",children:r.jsx(A,{})})})};var d,u,x;s.parameters={...s.parameters,docs:{...(d=s.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args,
  decorators: [withInstructionData],
  render: renderArgs => <PageShell>
            <PageContent {...renderArgs} />
        </PageShell>
}`,...(x=(u=s.parameters)==null?void 0:u.docs)==null?void 0:x.source}}};var g,h,j;o.parameters={...o.parameters,docs:{...(g=o.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args,
  decorators: [withMockProviders],
  render: renderArgs => <PageShell>
            <PageContent {...renderArgs} />
        </PageShell>
}`,...(j=(h=o.parameters)==null?void 0:h.docs)==null?void 0:j.source}}};var f,P,S;i.parameters={...i.parameters,docs:{...(f=i.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args,
  decorators: [withEmptyHistoryProviders],
  render: renderArgs => <PageShell>
            <PageContent {...renderArgs} />
        </PageShell>
}`,...(S=(P=i.parameters)==null?void 0:P.docs)==null?void 0:S.source}}};var C,w,y;n.parameters={...n.parameters,docs:{...(C=n.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args,
  render: () => <PageShell>
            <PageContainer variant="pulled-up">
                <LoadingCard />
            </PageContainer>
        </PageShell>
}`,...(y=(w=n.parameters)==null?void 0:w.docs)==null?void 0:y.source}}};const Fr=["Default","ParametersLoading","EmptyHistory","Loading"];export{s as Default,i as EmptyHistory,n as Loading,o as ParametersLoading,Fr as __namedExportsOrder,Ur as default};
