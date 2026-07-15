import{j as s,R as S}from"./iframe-CRlzrArO.js";import{a as A,L as j}from"./Label-mHEzIVTt.js";import"./index-Cun1SEai.js";import"./utils-CA04WxlW.js";const _={component:A,title:"Design Slices/key-value/Label"},a={args:{children:"Address",size:"s"}},i={args:{children:"Address",size:"m"}},d={args:{children:"Address",size:"l"}},t={args:{children:"Address",size:"xl"}},n={args:{children:"Label"},render:()=>s.jsxs("div",{className:"inline-grid grid-cols-[auto_repeat(6,minmax(0,1fr))] items-center gap-x-8 gap-y-4 text-dk-white",children:[s.jsx("div",{}),[16,20,24,32,36,40].map(e=>s.jsxs("div",{className:"text-sm text-dk-gray-700",children:["line-box ",e]},e)),["s","m","l","xl"].map(e=>s.jsxs(S.Fragment,{children:[s.jsxs("div",{className:"text-sm text-dk-gray-700",children:["size ",e]}),[16,20,24,32,36,40].map(r=>j[e][r]?s.jsx("div",{className:"outline outline-1 outline-dark-border",children:s.jsx(A,{size:e,lineBox:r,children:"Verified Build"})},`${e}-${r}`):s.jsx("div",{className:"text-sm text-dk-gray-700",children:"—"},`${e}-${r}`))]},e))]})};var c,l,o;a.parameters={...a.parameters,docs:{...(c=a.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    children: 'Address',
    size: 's'
  }
}`,...(o=(l=a.parameters)==null?void 0:l.docs)==null?void 0:o.source}}};var m,p,x;i.parameters={...i.parameters,docs:{...(m=i.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    children: 'Address',
    size: 'm'
  }
}`,...(x=(p=i.parameters)==null?void 0:p.docs)==null?void 0:x.source}}};var g,u,h;d.parameters={...d.parameters,docs:{...(g=d.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    children: 'Address',
    size: 'l'
  }
}`,...(h=(u=d.parameters)==null?void 0:u.docs)==null?void 0:h.source}}};var v,L,k;t.parameters={...t.parameters,docs:{...(v=t.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    children: 'Address',
    size: 'xl'
  }
}`,...(k=(L=t.parameters)==null?void 0:L.docs)==null?void 0:k.source}}};var z,b,y;n.parameters={...n.parameters,docs:{...(z=n.parameters)==null?void 0:z.docs,source:{originalSource:`{
  args: {
    children: 'Label'
  },
  render: () => <div className="inline-grid grid-cols-[auto_repeat(6,minmax(0,1fr))] items-center gap-x-8 gap-y-4 text-dk-white">
            <div />
            {([16, 20, 24, 32, 36, 40] as const).map(lb => <div key={lb} className="text-sm text-dk-gray-700">
                    line-box {lb}
                </div>)}
            {(['s', 'm', 'l', 'xl'] as const).map(size => <React.Fragment key={size}>
                    <div className="text-sm text-dk-gray-700">size {size}</div>
                    {([16, 20, 24, 32, 36, 40] as const).map(lb => LABEL_SHIM[size][lb] ? <div key={\`\${size}-\${lb}\`} className="outline outline-1 outline-dark-border">
                                <Label size={size} lineBox={lb}>
                                    Verified Build
                                </Label>
                            </div> : <div key={\`\${size}-\${lb}\`} className="text-sm text-dk-gray-700">
                                —
                            </div>)}
                </React.Fragment>)}
        </div>
}`,...(y=(b=n.parameters)==null?void 0:b.docs)==null?void 0:y.source}}};const R=["Small","Medium","Large","XLarge","SizesAndLineBoxes"];export{d as Large,i as Medium,n as SizesAndLineBoxes,a as Small,t as XLarge,R as __namedExportsOrder,_ as default};
