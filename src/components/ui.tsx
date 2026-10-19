'use client';
import { X, ExternalLink, Inbox, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
export function Badge({children,tone='gray'}:{children:ReactNode;tone?:string}) {
  return <span className={'badge '+tone}>{children}</span>;
}
export function External({url,children='원문 열기'}:{url:string;children?:ReactNode}) {
  return <a className="external" href={url} target="_blank" rel="noopener noreferrer">{children}<ExternalLink size={13}/></a>;
}
export function Empty({title,description,action}:{title:string;description?:string;action?:ReactNode}) {
  return <div className="empty"><div className="empty-icon"><Inbox size={24}/></div><strong>{title}</strong>{description&&<p>{description}</p>}{action}</div>;
}
export function Spinner(){return <LoaderCircle size={16} className="spin"/>;}
export function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return ()=>dialog?.close();},[]);
  return <dialog ref={ref} className={'modal '+(wide?'wide':'')} onCancel={onClose} onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div className="modal-heading"><h2>{title}</h2><button className="icon-button" aria-label="닫기" onClick={onClose}><X size={20}/></button></div>
    {children}
  </dialog>;
}
export function CheckList({items,selected,onChange}:{items:{id:string;name:string}[];selected:string[];onChange:(value:string[])=>void}) {
  return <div className="check-list">{items.length?items.map(item=><label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={event=>onChange(event.target.checked?[...selected,item.id]:selected.filter(id=>id!==item.id))}/>{item.name}</label>):<span className="muted">등록된 항목이 없습니다.</span>}</div>;
}
