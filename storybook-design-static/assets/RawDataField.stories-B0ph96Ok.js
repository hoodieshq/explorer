import{R as q}from"./RawDataField-C5W7Q1Xc.js";import{M as a,a as z,b as H,w as e,c as E}from"./RawDataField.mocks-D7sggNXy.js";import"./iframe-CRlzrArO.js";import"./index-Cun1SEai.js";import"./tabs-CcRN6Phh.js";import"./index-DM8-PE0G.js";import"./useCopyToClipboard-BdywpqX_.js";import"./check-circle-BWGel2E6.js";import"./index-Bgo6oLpT.js";import"./utils-CA04WxlW.js";import"./button-NvfdiL5w.js";import"./cluster-CTElM7Kw.js";import"./index-XYy5IKpr.js";import"./index-CKHJf83E.js";import"./x-H8DAF0hF.js";const{userEvent:u,within:v}=__STORYBOOK_MODULE_TEST__,ia={component:q,parameters:{layout:"padded"},title:"Design Slices/program-account/RawDataField"},r={args:{data:z,filename:a,variant:"popover"}},n={args:{data:void 0,filename:a,loading:!0,variant:"popover"}},o={args:{data:new Uint8Array(0),filename:a,variant:"popover"}},t={args:{data:H,filename:a,variant:"popover"}},s={args:{data:E,filename:a,variant:"embedded"},decorators:[e]},d={args:{data:void 0,filename:a,loading:!0,variant:"embedded"},decorators:[e]},i={args:{data:new Uint8Array(0),filename:a,variant:"embedded"},decorators:[e]},c={args:{data:E,filename:a,variant:"embedded"},decorators:[e],play:async({canvasElement:p})=>{const l=await v(p).findByRole("button",{name:/full screen/i});await u.click(l)}},m={args:{data:E,filename:a,variant:"embedded"},decorators:[e],play:async({canvasElement:p})=>{const g=v(p);await u.click(await g.findByRole("button",{name:/full screen/i}));const l=v(document.body);await u.click(await l.findByRole("button",{name:/change format/i}))}};var A,_,f;r.parameters={...r.parameters,docs:{...(A=r.parameters)==null?void 0:A.docs,source:{originalSource:`{
  args: {
    data: MOCK_DATA_SMALL,
    filename: MOCK_FILENAME,
    variant: 'popover'
  }
}`,...(f=(_=r.parameters)==null?void 0:_.docs)==null?void 0:f.source}}};var w,M,b;n.parameters={...n.parameters,docs:{...(w=n.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    data: undefined,
    filename: MOCK_FILENAME,
    loading: true,
    variant: 'popover'
  }
}`,...(b=(M=n.parameters)==null?void 0:M.docs)==null?void 0:b.source}}};var y,L,O;o.parameters={...o.parameters,docs:{...(y=o.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    data: new Uint8Array(0),
    filename: MOCK_FILENAME,
    variant: 'popover'
  }
}`,...(O=(L=o.parameters)==null?void 0:L.docs)==null?void 0:O.source}}};var F,K,C;t.parameters={...t.parameters,docs:{...(F=t.parameters)==null?void 0:F.docs,source:{originalSource:`{
  args: {
    data: MOCK_DATA_TOO_LARGE,
    filename: MOCK_FILENAME,
    variant: 'popover'
  }
}`,...(C=(K=t.parameters)==null?void 0:K.docs)==null?void 0:C.source}}};var D,R,T;s.parameters={...s.parameters,docs:{...(D=s.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    data: MOCK_DATA_LARGE,
    filename: MOCK_FILENAME,
    variant: 'embedded'
  },
  decorators: [withDrawerFrame]
}`,...(T=(R=s.parameters)==null?void 0:R.docs)==null?void 0:T.source}}};var S,h,B;d.parameters={...d.parameters,docs:{...(S=d.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    data: undefined,
    filename: MOCK_FILENAME,
    loading: true,
    variant: 'embedded'
  },
  decorators: [withDrawerFrame]
}`,...(B=(h=d.parameters)==null?void 0:h.docs)==null?void 0:B.source}}};var I,N,P;i.parameters={...i.parameters,docs:{...(I=i.parameters)==null?void 0:I.docs,source:{originalSource:`{
  args: {
    data: new Uint8Array(0),
    filename: MOCK_FILENAME,
    variant: 'embedded'
  },
  decorators: [withDrawerFrame]
}`,...(P=(N=i.parameters)==null?void 0:N.docs)==null?void 0:P.source}}};var k,G,U;c.parameters={...c.parameters,docs:{...(k=c.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    data: MOCK_DATA_LARGE,
    filename: MOCK_FILENAME,
    variant: 'embedded'
  },
  decorators: [withDrawerFrame],
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const openButton = await canvas.findByRole('button', {
      name: /full screen/i
    });
    await userEvent.click(openButton);
  }
}`,...(U=(G=c.parameters)==null?void 0:G.docs)==null?void 0:U.source}}};var x,Y,j;m.parameters={...m.parameters,docs:{...(x=m.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    data: MOCK_DATA_LARGE,
    filename: MOCK_FILENAME,
    variant: 'embedded'
  },
  decorators: [withDrawerFrame],
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', {
      name: /full screen/i
    }));
    // The dialog renders in a portal on document.body, not inside canvasElement.
    const body = within(document.body);
    await userEvent.click(await body.findByRole('button', {
      name: /change format/i
    }));
  }
}`,...(j=(Y=m.parameters)==null?void 0:Y.docs)==null?void 0:j.source}}};const ca=["Popover","PopoverLoading","PopoverEmpty","PopoverTooLarge","Embedded","EmbeddedLoading","EmbeddedEmpty","Fullscreen","FullscreenFormatPicker"];export{s as Embedded,i as EmbeddedEmpty,d as EmbeddedLoading,c as Fullscreen,m as FullscreenFormatPicker,r as Popover,o as PopoverEmpty,n as PopoverLoading,t as PopoverTooLarge,ca as __namedExportsOrder,ia as default};
