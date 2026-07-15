import{a as E}from"./responsive-decorators-Bcu_tUP2.js";import{R as M}from"./RawDataField-C5W7Q1Xc.js";import{w as f,M as R,c as h}from"./RawDataField.mocks-D7sggNXy.js";import"./iframe-CRlzrArO.js";import"./index-Cun1SEai.js";import"./index.browser.esm-Ci1UQyGp.js";import"./index-CKHJf83E.js";import"./tabs-CcRN6Phh.js";import"./index-DM8-PE0G.js";import"./useCopyToClipboard-BdywpqX_.js";import"./check-circle-BWGel2E6.js";import"./index-Bgo6oLpT.js";import"./utils-CA04WxlW.js";import"./button-NvfdiL5w.js";import"./cluster-CTElM7Kw.js";import"./index-XYy5IKpr.js";import"./x-H8DAF0hF.js";const{userEvent:T,within:F}=__STORYBOOK_MODULE_TEST__,Y={component:M,decorators:[f,E],title:"Design Slices/program-account/RawDataField@Media"},t={data:h,filename:R,variant:"embedded"},a={args:t,globals:{viewport:{value:"iphonex"}}},e={args:t,globals:{viewport:{value:"ipad"}}},r={args:t,globals:{viewport:{isRotated:!0,value:"ipad"}}},o={args:t,globals:{viewport:{value:"iphonex"}},play:async({canvasElement:g})=>{const _=F(g);await T.click(await _.findByRole("button",{name:/full screen/i}))}};var n,s,i;a.parameters={...a.parameters,docs:{...(n=a.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args,
  globals: {
    viewport: {
      value: 'iphonex'
    }
  }
}`,...(i=(s=a.parameters)==null?void 0:s.docs)==null?void 0:i.source}}};var l,p,c;e.parameters={...e.parameters,docs:{...(l=e.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args,
  globals: {
    viewport: {
      value: 'ipad'
    }
  }
}`,...(c=(p=e.parameters)==null?void 0:p.docs)==null?void 0:c.source}}};var m,d,u;r.parameters={...r.parameters,docs:{...(m=r.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args,
  globals: {
    viewport: {
      isRotated: true,
      value: 'ipad'
    }
  }
}`,...(u=(d=r.parameters)==null?void 0:d.docs)==null?void 0:u.source}}};var v,w,b;o.parameters={...o.parameters,docs:{...(v=o.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args,
  globals: {
    viewport: {
      value: 'iphonex'
    }
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', {
      name: /full screen/i
    }));
  }
}`,...(b=(w=o.parameters)==null?void 0:w.docs)==null?void 0:b.source}}};const j=["Mobile","TabletPortrait","TabletLandscape","MobileFullscreen"];export{a as Mobile,o as MobileFullscreen,r as TabletLandscape,e as TabletPortrait,j as __namedExportsOrder,Y as default};
