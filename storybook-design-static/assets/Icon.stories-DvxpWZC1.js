import{j as e,R as w}from"./iframe-CRlzrArO.js";import{I as m}from"./Icon-CP6uJGP8.js";import{I as F,b as R,a as O}from"./Label-mHEzIVTt.js";import{H as a}from"./help-circle-SyiG42nh.js";import"./index-Cun1SEai.js";import"./utils-CA04WxlW.js";import"./index-DM8-PE0G.js";const X={component:m,title:"Design Slices/key-value/Icon"},i={args:{children:e.jsx(a,{}),size:"s"}},t={args:{children:e.jsx(a,{}),size:"m"}},n={args:{children:e.jsx(a,{}),size:"l"}},l={args:{children:e.jsx(a,{}),size:"xl"}},c={args:{children:e.jsx(a,{})},render:()=>e.jsxs("div",{className:"inline-grid grid-cols-[auto_repeat(6,minmax(0,1fr))] items-center gap-x-8 gap-y-4 text-dk-white",children:[e.jsx("div",{}),[16,20,24,32,36,40].map(s=>e.jsxs("div",{className:"text-sm text-dk-gray-700",children:["line-box ",s]},s)),["s","m","l","xl"].map(s=>e.jsxs(w.Fragment,{children:[e.jsxs("div",{className:"text-sm text-dk-gray-700",children:["size ",s]}),[16,20,24,32,36,40].map(r=>F[s][r]?e.jsx("div",{className:"outline outline-1 outline-dark-border",children:e.jsx(m,{size:s,lineBox:r,children:e.jsx(a,{})})},`${s}-${r}`):e.jsx("div",{className:"text-sm text-dk-gray-700",children:"—"},`${s}-${r}`))]},s))]})},d={args:{children:e.jsx(a,{})},render:()=>e.jsx("div",{className:"flex flex-col gap-4 text-dk-white",children:["s","m","l","xl"].map(s=>e.jsxs("div",{style:{fontSize:R[s].fontSize},children:["The quick brown fox",e.jsx(m,{inline:!0,size:s,className:"ml-1.5",children:e.jsx(a,{})})]},s))})},o={args:{children:e.jsx(a,{})},render:()=>e.jsxs("div",{className:"inline-grid grid-cols-[auto_repeat(4,auto)] items-center gap-x-10 gap-y-4 text-dk-white",children:[e.jsx("div",{}),["s","m","l","xl"].map(s=>e.jsxs("div",{className:"text-sm text-dk-gray-700",children:["size ",s]},s)),[16,20,24,32,36,40].map(s=>e.jsxs(w.Fragment,{children:[e.jsxs("div",{className:"text-sm text-dk-gray-700",children:["line-box ",s]}),["s","m","l","xl"].map(r=>F[r][s]?e.jsxs("div",{className:"flex items-start gap-1.5 outline outline-1 outline-dark-border",children:[e.jsx(m,{size:r,lineBox:s,children:e.jsx(a,{})}),e.jsx(O,{size:r,lineBox:s,children:"Verified Build"})]},`${r}-${s}`):e.jsx("div",{className:"text-sm text-dk-gray-700",children:"—"},`${r}-${s}`))]},s))]})};var x,p,g;i.parameters={...i.parameters,docs:{...(x=i.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    children: <HelpCircle />,
    size: 's'
  }
}`,...(g=(p=i.parameters)==null?void 0:p.docs)==null?void 0:g.source}}};var u,h,v;t.parameters={...t.parameters,docs:{...(u=t.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    children: <HelpCircle />,
    size: 'm'
  }
}`,...(v=(h=t.parameters)==null?void 0:h.docs)==null?void 0:v.source}}};var k,j,z;n.parameters={...n.parameters,docs:{...(k=n.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    children: <HelpCircle />,
    size: 'l'
  }
}`,...(z=(j=n.parameters)==null?void 0:j.docs)==null?void 0:z.source}}};var N,y,b;l.parameters={...l.parameters,docs:{...(N=l.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    children: <HelpCircle />,
    size: 'xl'
  }
}`,...(b=(y=l.parameters)==null?void 0:y.docs)==null?void 0:b.source}}};var f,S,I;c.parameters={...c.parameters,docs:{...(f=c.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    children: <HelpCircle />
  },
  render: () => <div className="inline-grid grid-cols-[auto_repeat(6,minmax(0,1fr))] items-center gap-x-8 gap-y-4 text-dk-white">
            <div />
            {([16, 20, 24, 32, 36, 40] as const).map(lb => <div key={lb} className="text-sm text-dk-gray-700">
                    line-box {lb}
                </div>)}
            {(['s', 'm', 'l', 'xl'] as const).map(size => <React.Fragment key={size}>
                    <div className="text-sm text-dk-gray-700">size {size}</div>
                    {([16, 20, 24, 32, 36, 40] as const).map(lb => ICON_SHIM[size][lb] ? <div key={\`\${size}-\${lb}\`} className="outline outline-1 outline-dark-border">
                                <Icon size={size} lineBox={lb}>
                                    <HelpCircle />
                                </Icon>
                            </div> : <div key={\`\${size}-\${lb}\`} className="text-sm text-dk-gray-700">
                                —
                            </div>)}
                </React.Fragment>)}
        </div>
}`,...(I=(S=c.parameters)==null?void 0:S.docs)==null?void 0:I.source}}};var $,H,L;d.parameters={...d.parameters,docs:{...($=d.parameters)==null?void 0:$.docs,source:{originalSource:`{
  args: {
    children: <HelpCircle />
  },
  render: () => <div className="flex flex-col gap-4 text-dk-white">
            {(['s', 'm', 'l', 'xl'] as const).map(size => <div key={size} style={{
      fontSize: LABEL_FONT[size].fontSize
    }}>
                    The quick brown fox
                    <Icon inline size={size} className="ml-1.5">
                        <HelpCircle />
                    </Icon>
                </div>)}
        </div>
}`,...(L=(H=d.parameters)==null?void 0:H.docs)==null?void 0:L.source}}};var C,B,_;o.parameters={...o.parameters,docs:{...(C=o.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    children: <HelpCircle />
  },
  render: () => <div className="inline-grid grid-cols-[auto_repeat(4,auto)] items-center gap-x-10 gap-y-4 text-dk-white">
            <div />
            {(['s', 'm', 'l', 'xl'] as const).map(size => <div key={size} className="text-sm text-dk-gray-700">
                    size {size}
                </div>)}
            {([16, 20, 24, 32, 36, 40] as const).map(lb => <React.Fragment key={lb}>
                    <div className="text-sm text-dk-gray-700">line-box {lb}</div>
                    {(['s', 'm', 'l', 'xl'] as const).map(size => ICON_SHIM[size][lb] ? <div key={\`\${size}-\${lb}\`} className="flex items-start gap-1.5 outline outline-1 outline-dark-border">
                                <Icon size={size} lineBox={lb}>
                                    <HelpCircle />
                                </Icon>
                                <Label size={size} lineBox={lb}>
                                    Verified Build
                                </Label>
                            </div> : <div key={\`\${size}-\${lb}\`} className="text-sm text-dk-gray-700">
                                —
                            </div>)}
                </React.Fragment>)}
        </div>
}`,...(_=(B=o.parameters)==null?void 0:B.docs)==null?void 0:_.source}}};const D=["Small","Medium","Large","XLarge","SizesAndLineBoxes","Inline","WithLabel"];export{d as Inline,n as Large,t as Medium,c as SizesAndLineBoxes,i as Small,o as WithLabel,l as XLarge,D as __namedExportsOrder,X as default};
