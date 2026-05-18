import { useState, useRef, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, onValue, serverTimestamp } from "firebase/database";

// ── Firebase Config ──────────────────────────────────────────────────
const firebaseConfig = {
apiKey: "AIzaSyByOBxpNbzyAHnM8kN8hWBpoyjahCfPUyo",
authDomain: "zerobarrier-5da51.firebaseapp.com",
databaseURL: "https://zerobarrier-5da51-default-rtdb.firebaseio.com",
projectId: "zerobarrier-5da51",
storageBucket: "zerobarrier-5da51.firebasestorage.app",
messagingSenderId: "10426675429406",
appId: "1:10426675429406:web:1aa91184280722369ebe0f",
measurementId: "G-3Z5QTH229Q"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ── Languages ────────────────────────────────────────────────────────
const LANGS = [
{ code:"en", label:"English", flag:"🇬🇧", native:"English" },
{ code:"hi", label:"Hindi", flag:"🇮🇳", native:"हिन्दी" },
{ code:"ur", label:"Urdu", flag:"🇵🇰", native:"اردو" },
{ code:"de", label:"German", flag:"🇩🇪", native:"Deutsch" },
{ code:"fr", label:"French", flag:"🇫🇷", native:"Français" },
{ code:"es", label:"Spanish", flag:"🇪🇸", native:"Español" },
{ code:"ar", label:"Arabic", flag:"🇸🇦", native:"العربية" },
{ code:"zh", label:"Chinese", flag:"🇨🇳", native:"中文" },
{ code:"ja", label:"Japanese", flag:"🇯🇵", native:"日本語" },
{ code:"pt", label:"Portuguese", flag:"🇧🇷", native:"Português" },
{ code:"ru", label:"Russian", flag:"🇷🇺", native:"Русский" },
{ code:"ko", label:"Korean", flag:"🇰🇷", native:"한국어" },
];

const TONES = [
{ code:"casual", label:"Casual", icon:"😊", desc:"Friendly & relaxed" },
{ code:"formal", label:"Formal", icon:"💼", desc:"Professional & polite" },
{ code:"business", label:"Business", icon:"🤝", desc:"Clear & precise" },
];

const getLang = (c) => LANGS.find(l => l.code === c) || LANGS[0];

const GREEN = "#00FFB2";
const BG = "#080612";
const BORDER = "rgba(255,255,255,0.09)";
const SUB = "rgba(255,255,255,0.45)";
const CARD = "rgba(255,255,255,0.05)";

// ── AI Translation ───────────────────────────────────────────────────
async function aiTranslate(text, from, to, tone = "casual") {
if (from === to || !text.trim()) return text;
const toneInstr = {
casual: "Use friendly, natural, conversational tone.",
formal: "Use formal, respectful, polished language.",
business: "Use clear, professional, concise business language.",
}[tone] || "";
try {
const res = await fetch("https://api.anthropic.com/v1/messages", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
model: "claude-sonnet-4-20250514",
max_tokens: 500,
messages: [{ role: "user",
content: `Translate from ${getLang(from).label} to ${getLang(to).label}. ${toneInstr} Return ONLY the translated text, nothing else.\n\nText: ${text}`
}]
})
});
const d = await res.json();
return d?.content?.[0]?.text?.trim() || text;
} catch { return text; }
}

// Generate unique user ID
function getUserId() {
let id = localStorage.getItem("zb_user_id");
if (!id) { id = "user_" + Math.random().toString(36).substr(2, 9); localStorage.setItem("zb_user_id", id); }
return id;
}

// ── CSS ──────────────────────────────────────────────────────────────
const globalCss = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:'Outfit',sans-serif; background:${BG}; color:#fff; }
::-webkit-scrollbar { width:3px; }
::-webkit-scrollbar-thumb { background:rgba(0,255,178,0.2); border-radius:4px; }
.card-in { animation:cardIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both; }
@keyframes cardIn { from{opacity:0;transform:scale(0.94) translateY(20px)} to{opacity:1;transform:none} }
.fade-in { animation:fadeIn 0.3s ease both; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
.dots span { animation:db 1s infinite; display:inline-block; }
.dots span:nth-child(2){animation-delay:0.15s}
.dots span:nth-child(3){animation-delay:0.3s}
@keyframes db{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
input::placeholder{color:rgba(255,255,255,0.2);}
input:focus{outline:none;border-color:rgba(0,255,178,0.4)!important;}
button:active{transform:scale(0.97);}
.bubble-hover:hover{filter:brightness(1.06);}
@keyframes wave{from{transform:scaleY(0.2)}to{transform:scaleY(1)}}
@keyframes spin2{to{transform:rotate(360deg)}}
@keyframes pulse2{0%,100%{box-shadow:0 0 0 0 rgba(0,255,178,0.4)}50%{box-shadow:0 0 0 10px rgba(0,255,178,0)}}
`;

// ── VOICE RECORDER ───────────────────────────────────────────────────
function VoiceRecorder({ lang, onSend, onCancel }) {
const [phase, setPhase] = useState("ready");
const [secs, setSecs] = useState(0);
const [transcript, setTranscript] = useState("");
const timerRef = useRef(null);
const recRef = useRef(null);

const MOCK = {
en:"Hello! I wanted to discuss the project timeline and budget with you.",
hi:"नमस्ते! मैं आपके साथ प्रोजेक्ट की समयसीमा और बजट पर चर्चा करना चाहता था।",
ur:"ہیلو! میں آپ کے ساتھ پروجیکٹ ٹائم لائن اور بجٹ پر بات کرنا چاہتا تھا۔",
de:"Hallo! Ich wollte die Projektzeitleiste und das Budget mit Ihnen besprechen.",
ar:"مرحباً! أردت مناقشة الجدول الزمني للمشروع والميزانية معك.",
fr:"Bonjour! Je voulais discuter du calendrier du projet et du budget avec vous.",
es:"¡Hola! Quería hablar contigo sobre el cronograma y el presupuesto.",
};

const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

function startRec() {
setPhase("recording"); setSecs(0);
timerRef.current = setInterval(() => setSecs(s => s+1), 1000);
navigator.mediaDevices.getUserMedia({audio:true}).then(stream => {
const mr = new MediaRecorder(stream);
recRef.current = mr;
mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); finalize(); };
mr.start();
}).catch(() => { setTimeout(() => { clearInterval(timerRef.current); finalize(); }, 2000); });
}

function stopRec() {
clearInterval(timerRef.current);
if (recRef.current?.state === "recording") recRef.current.stop();
else finalize();
}

function finalize() {
setPhase("processing");
setTimeout(() => { setTranscript(MOCK[lang] || MOCK.en); setPhase("done"); }, 1200);
}

const vs = {
wrap: { display:"flex", flexDirection:"column", alignItems:"center", gap:14, padding:"8px 0" },
hint: { color:SUB, fontSize:12, textAlign:"center" },
timer: { fontSize:32, fontWeight:800, color:"#FF6B6B", letterSpacing:1 },
micBtn: { width:72, height:72, borderRadius:"50%", background:`linear-gradient(135deg,${GREEN},#00B4D8)`, border:"none", fontSize:30, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 28px rgba(0,255,178,0.35)", animation:"pulse2 2s infinite" },
stopBtn: { width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,#FF6B6B,#ff9a3c)", border:"none", fontSize:30, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 28px rgba(255,107,107,0.4)" },
waves: { display:"flex", gap:3, alignItems:"center", height:40 },
bar: { width:3, borderRadius:3, background:"#FF6B6B", animation:"wave 0.5s ease-in-out infinite alternate", opacity:0.85 },
spinner: { width:40, height:40, border:"3px solid rgba(0,255,178,0.15)", borderTopColor:GREEN, borderRadius:"50%", animation:"spin2 1s linear infinite", margin:"0 auto 12px" },
txBox: { background:"rgba(0,255,178,0.07)", border:"1px solid rgba(0,255,178,0.2)", borderRadius:12, padding:"12px 14px", width:"100%", fontSize:13, color:"#fff", lineHeight:1.6 },
sendBtn: { flex:1, padding:"12px", background:`linear-gradient(135deg,${GREEN},#00B4D8)`, color:"#080612", border:"none", borderRadius:12, fontSize:14, fontWeight:700, cursor:"pointer" },
retryBtn:{ width:44, height:44, background:"rgba(255,255,255,0.07)", border:`1px solid ${BORDER}`, borderRadius:12, color:"#fff", fontSize:18, cursor:"pointer" },
cancelBtn:{ background:"none", border:"none", color:SUB, fontSize:13, cursor:"pointer" },
};

return (
<div style={vs.wrap}>
{phase==="ready"&&<>
<div style={vs.hint}>Tap mic to start recording</div>
<button style={vs.micBtn} onClick={startRec}>🎙️</button>
<button style={vs.cancelBtn} onClick={onCancel}>Cancel</button>
</>}
{phase==="recording"&&<>
<div style={vs.timer}>{fmt(secs)}</div>
<div style={vs.waves}>{[...Array(14)].map((_,i)=>(
<div key={i} style={{...vs.bar,height:`${8+Math.random()*22}px`,animationDelay:`${i*0.07}s`}}/>
))}</div>
<button style={vs.stopBtn} onClick={stopRec}>⏹</button>
<div style={vs.hint}>Tap to stop</div>
</>}
{phase==="processing"&&<div style={{textAlign:"center",padding:"8px 0"}}>
<div style={vs.spinner}/>
<div style={{color:GREEN,fontWeight:700,marginBottom:4}}>Transcribing…</div>
<div style={vs.hint}>AI is converting your voice to text</div>
</div>}
{phase==="done"&&<>
<div style={vs.txBox}>
<div style={{color:GREEN,fontSize:9,letterSpacing:2,marginBottom:6,fontWeight:700}}>🎙️ TRANSCRIBED · {getLang(lang).flag} {getLang(lang).label}</div>
{transcript}
</div>
<div style={{display:"flex",gap:8,width:"100%"}}>
<button style={vs.sendBtn} onClick={()=>onSend(transcript,"voice")}>⚡ Send Voice Note</button>
<button style={vs.retryBtn} onClick={()=>{setPhase("ready");setSecs(0);}}>↩</button>
</div>
</>}
</div>
);
}

// ── MESSAGE BUBBLE ───────────────────────────────────────────────────
function Bubble({ msg, myLangs, myPrimary, isMe }) {
const [showOrig, setShowOrig] = useState(false);
const [translated, setTranslated] = useState(null);
const [translating, setTranslating] = useState(false);

useEffect(() => {
if (myLangs.includes(msg.lang)) return;
if (msg.translations?.[myPrimary]) { setTranslated(msg.translations[myPrimary]); return; }
setTranslating(true);
aiTranslate(msg.text, msg.lang, myPrimary, msg.tone || "casual").then(t => {
setTranslated(t); setTranslating(false);
});
}, [msg.id, myPrimary]);

const alreadyUnderstands = myLangs.includes(msg.lang);
const displayText = showOrig || alreadyUnderstands ? msg.text : (translated || msg.text);
const wasTranslated = !alreadyUnderstands && translated;
const srcLang = getLang(msg.lang);
const myPrimaryLang = getLang(myPrimary);

const avatarColors = ["#FF6B6B","#4ECDC4","#FFD93D","#A78BFA","#00FFB2","#FF9A3C"];
const color = isMe ? GREEN : avatarColors[msg.senderName?.charCodeAt(0) % avatarColors.length] || "#4ECDC4";

return (
<div style={{display:"flex",flexDirection:isMe?"row-reverse":"row",gap:10,alignItems:"flex-end",marginBottom:18}}>
<div style={{width:34,height:34,borderRadius:10,background:color+"22",border:`2px solid ${color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
{msg.senderFlag || msg.senderName?.[0] || "?"}
</div>
<div style={{maxWidth:"70%",display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start"}}>
<div style={{display:"flex",gap:6,alignItems:"center",color:SUB,fontSize:10,marginBottom:5,flexWrap:"wrap"}}>
<span>{isMe?"You":msg.senderName}</span>
<span style={{opacity:0.4}}>{msg.time}</span>
{alreadyUnderstands && <span style={{background:"rgba(78,205,196,0.12)",color:"#4ECDC4",padding:"1px 7px",borderRadius:6,fontSize:9}}>✓ you understand {srcLang.label}</span>}
{!alreadyUnderstands && wasTranslated && <span style={{background:"rgba(0,255,178,0.1)",color:GREEN,padding:"1px 7px",borderRadius:6,fontSize:9}}>⚡ → {myPrimaryLang.label}</span>}
{translating && <span style={{color:SUB,fontSize:9}}>translating…</span>}
{msg.type==="voice" && <span style={{background:"rgba(255,107,107,0.12)",color:"#FF6B6B",padding:"1px 7px",borderRadius:6,fontSize:9}}>🎙️ voice</span>}
</div>

{msg.type==="voice" ? (
<div style={{padding:"11px 14px",borderRadius:16,borderTopRightRadius:isMe?4:16,borderTopLeftRadius:isMe?16:4,background:isMe?`linear-gradient(135deg,#007A55,#00B4D8)`:"rgba(255,255,255,0.08)",boxShadow:isMe?"0 4px 16px rgba(0,255,178,0.15)":"none",maxWidth:"100%"}}>
<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
<div style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,cursor:"pointer"}}>▶</div>
<div style={{flex:1}}>
<div style={{height:3,background:"rgba(255,255,255,0.15)",borderRadius:3}}><div style={{width:"45%",height:"100%",background:GREEN,borderRadius:3}}/></div>
<div style={{color:"rgba(255,255,255,0.4)",fontSize:10,marginTop:2}}>0:09</div>
</div>
</div>
<div style={{fontSize:12,color:"rgba(255,255,255,0.6)",borderTop:"1px solid rgba(255,255,255,0.1)",paddingTop:8}}>
<span style={{color:GREEN,fontSize:9,letterSpacing:1,fontWeight:700}}>TRANSCRIPT · </span>
{displayText}
</div>
</div>
) : (
<div className="bubble-hover" style={{padding:"11px 14px",borderRadius:16,borderTopRightRadius:isMe?4:16,borderTopLeftRadius:isMe?16:4,fontSize:14,lineHeight:1.55,color:"#fff",maxWidth:"100%",wordBreak:"break-word",background:isMe?`linear-gradient(135deg,#007A55,#00B4D8)`:"rgba(255,255,255,0.08)",boxShadow:isMe?"0 4px 16px rgba(0,255,178,0.15)":"none"}}>
{displayText}
</div>
)}

{wasTranslated && (
<button style={{marginTop:4,background:"none",border:"none",color:"rgba(255,255,255,0.25)",fontSize:10,cursor:"pointer",padding:0}} onClick={()=>setShowOrig(p=>!p)}>
{showOrig?`▲ hide original (${srcLang.label})`:`▼ original (${srcLang.label})`}
</button>
)}
{showOrig && !alreadyUnderstands && (
<div style={{marginTop:4,background:"rgba(255,255,255,0.04)",border:`1px solid ${BORDER}`,borderRadius:8,padding:"6px 10px",color:"rgba(255,255,255,0.35)",fontSize:12}}>
{msg.text}
</div>
)}
</div>
</div>
);
}

// ── ONBOARDING ───────────────────────────────────────────────────────
function Onboarding({ onStart }) {
const [step, setStep] = useState(1);
const [name, setName] = useState("");
const [selected, setSelected] = useState([]);
const [primary, setPrimary] = useState(null);
const [tone, setTone] = useState("casual");

function toggleLang(code) {
if (selected.includes(code)) {
setSelected(s => s.filter(c => c !== code));
if (primary === code) setPrimary(selected.filter(c => c !== code)[0] || null);
} else {
if (selected.length >= 3) return;
setSelected(s => [...s, code]);
if (!primary) setPrimary(code);
}
}

const s = {
wrap: { minHeight:"100vh", background:BG, display:"flex", alignItems:"center", justifyContent:"center", padding:20, position:"relative", overflow:"hidden" },
blob1: { position:"fixed", top:-150, left:-150, width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(0,255,178,0.12) 0%,transparent 70%)", pointerEvents:"none" },
blob2: { position:"fixed", bottom:-100, right:-100, width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,107,107,0.08) 0%,transparent 70%)", pointerEvents:"none" },
card: { width:"100%", maxWidth:480, background:CARD, backdropFilter:"blur(24px)", border:`1px solid ${BORDER}`, borderRadius:28, padding:"32px 28px", position:"relative", zIndex:2 },
prog: { display:"flex", justifyContent:"center", gap:8, marginBottom:28, alignItems:"center" },
dot: { width:8, height:8, borderRadius:"50%", transition:"all 0.3s" },
logo: { fontWeight:800, fontSize:22, color:"#fff", marginBottom:24, letterSpacing:-0.5 },
tag: { color:GREEN, fontSize:10, letterSpacing:2, fontWeight:700, marginBottom:8 },
title: { color:"#fff", fontSize:24, fontWeight:800, lineHeight:1.3, marginBottom:6, letterSpacing:-0.5 },
sub: { color:SUB, fontSize:13, lineHeight:1.6, marginBottom:20 },
input: { width:"100%", padding:"13px 16px", borderRadius:12, fontSize:15, background:"rgba(255,255,255,0.07)", border:`1.5px solid ${BORDER}`, color:"#fff", boxSizing:"border-box", marginBottom:16 },
btn: { width:"100%", padding:14, borderRadius:12, fontSize:15, fontWeight:700, background:`linear-gradient(135deg,${GREEN},#00B4D8)`, color:"#080612", border:"none", cursor:"pointer", boxShadow:"0 4px 20px rgba(0,255,178,0.25)" },
back: { width:48, height:48, borderRadius:12, background:"rgba(255,255,255,0.07)", border:`1px solid ${BORDER}`, color:"#fff", cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
grid: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 },
lBtn: { display:"flex", flexDirection:"column", alignItems:"center", padding:"10px 4px", borderRadius:12, background:"rgba(255,255,255,0.04)", border:`1.5px solid ${BORDER}`, cursor:"pointer", transition:"all 0.15s", position:"relative" },
tBtn: { display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:14, background:"rgba(255,255,255,0.04)", border:`1.5px solid ${BORDER}`, cursor:"pointer", transition:"all 0.18s", position:"relative", marginBottom:10 },
};

return (
<div style={s.wrap}>
<style>{globalCss}</style>
<div style={s.blob1}/><div style={s.blob2}/>
<div style={s.card} className="card-in">
<div style={s.prog}>
{[1,2,3].map(n=>(
<div key={n} style={{...s.dot, background:n<=step?GREEN:"rgba(255,255,255,0.15)", width:n===step?24:8}}/>
))}
</div>
<div style={s.logo}><span style={{color:GREEN}}>Zero</span>Barrier</div>

{step===1&&<div className="fade-in">
<div style={s.tag}>STEP 1 OF 3</div>
<div style={s.title}>What's your name?</div>
<div style={s.sub}>How others will see you in chats</div>
<input style={s.input} placeholder="Your name…" value={name} autoFocus
onChange={e=>setName(e.target.value)}
onKeyDown={e=>e.key==="Enter"&&name.trim()&&setStep(2)}/>
<button style={{...s.btn,opacity:name.trim()?1:0.4}} disabled={!name.trim()} onClick={()=>setStep(2)}>Continue →</button>
</div>}

{step===2&&<div className="fade-in">
<div style={s.tag}>STEP 2 OF 3</div>
<div style={s.title}>Which languages do you speak?</div>
<div style={s.sub}>Select up to <strong style={{color:GREEN}}>3 languages</strong>. Tap selected to set as primary.</div>
<div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
{[0,1,2].map(i=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:i<selected.length?GREEN:"rgba(255,255,255,0.1)"}}/>)}
<span style={{color:SUB,fontSize:12}}>{selected.length}/3 selected</span>
</div>
<div style={s.grid}>
{LANGS.map(l=>{
const isSel = selected.includes(l.code);
const isPri = primary===l.code;
return (
<button key={l.code} style={{...s.lBtn,
background:isPri?"linear-gradient(135deg,rgba(0,255,178,0.25),rgba(0,180,216,0.2))":isSel?"rgba(0,255,178,0.07)":"rgba(255,255,255,0.04)",
borderColor:isPri?GREEN:isSel?"rgba(0,255,178,0.35)":BORDER,
opacity:!isSel&&selected.length>=3?0.35:1,
}} onClick={()=>isSel?setPrimary(l.code):toggleLang(l.code)}>
<span style={{fontSize:22}}>{l.flag}</span>
<span style={{fontSize:11,marginTop:3,color:isPri?"#080612":isSel?GREEN:SUB}}>{l.label}</span>
{isPri&&<span style={{position:"absolute",top:-8,left:"50%",transform:"translateX(-50%)",background:GREEN,color:"#080612",fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:10,whiteSpace:"nowrap"}}>★ Primary</span>}
{isSel&&!isPri&&<span style={{position:"absolute",top:-6,right:-6,background:"rgba(0,255,178,0.2)",color:GREEN,fontSize:10,width:18,height:18,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${GREEN}`}}>✓</span>}
</button>
);
})}
</div>
{selected.length>0&&<div style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${BORDER}`,borderRadius:14,padding:"12px 14px",marginBottom:16,display:"flex",gap:8,flexWrap:"wrap"}}>
{selected.map(c=>{
const l=getLang(c);
return <div key={c} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:8,background:c===primary?"rgba(0,255,178,0.1)":"rgba(255,255,255,0.06)",border:`1px solid ${c===primary?"rgba(0,255,178,0.3)":BORDER}`,color:c===primary?GREEN:"rgba(255,255,255,0.6)",fontSize:12}}>
{l.flag} {l.label}{c===primary&&" ★"}
<button style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:16,padding:0}} onClick={()=>toggleLang(c)}>×</button>
</div>;
})}
</div>}
<div style={{display:"flex",gap:10}}>
<button style={s.back} onClick={()=>setStep(1)}>←</button>
<button style={{...s.btn,flex:1,opacity:selected.length&&primary?1:0.4}} disabled={!selected.length||!primary} onClick={()=>setStep(3)}>Continue →</button>
</div>
</div>}

{step===3&&<div className="fade-in">
<div style={s.tag}>STEP 3 OF 3</div>
<div style={s.title}>Your communication style</div>
<div style={s.sub}>AI translates your messages in this tone</div>
{TONES.map(t=>(
<button key={t.code} style={{...s.tBtn,background:tone===t.code?"rgba(0,255,178,0.08)":"rgba(255,255,255,0.04)",borderColor:tone===t.code?"rgba(0,255,178,0.4)":BORDER}} onClick={()=>setTone(t.code)}>
<span style={{fontSize:28}}>{t.icon}</span>
<div style={{textAlign:"left"}}>
<div style={{color:tone===t.code?GREEN:"#fff",fontWeight:700,fontSize:15}}>{t.label}</div>
<div style={{color:SUB,fontSize:12,marginTop:2}}>{t.desc}</div>
</div>
{tone===t.code&&<div style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",color:GREEN,fontSize:18,fontWeight:700}}>✓</div>}
</button>
))}
<div style={{display:"flex",gap:10,marginTop:8}}>
<button style={s.back} onClick={()=>setStep(2)}>←</button>
<button style={{...s.btn,flex:1}} onClick={()=>onStart({name:name.trim(),langs:selected,primaryLang:primary,tone})}>Enter ZeroBarrier ⚡</button>
</div>
</div>}
</div>
</div>
);
}

// ── MAIN CHAT ────────────────────────────────────────────────────────
function Chat({ user, onLogout }) {
const [messages, setMessages] = useState([]);
const [input, setInput] = useState("");
const [busy, setBusy] = useState(false);
const [tab, setTab] = useState("chat");
const [tone, setTone] = useState(user.tone);
const [showTone, setShowTone] = useState(false);
const [showVoice, setShowVoice] = useState(false);
const [onlineCount, setOnlineCount] = useState(1);
const bottomRef = useRef(null);
const userId = useRef(getUserId());

const myL = getLang(user.primaryLang);

// Subscribe to Firebase messages
useEffect(() => {
const msgsRef = ref(db, "messages");
const unsub = onValue(msgsRef, (snapshot) => {
const data = snapshot.val();
if (!data) return;
const msgs = Object.entries(data).map(([id, m]) => ({ id, ...m }))
.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
.slice(-100);
setMessages(msgs);
});

// Track online presence
const presenceRef = ref(db, `presence/${userId.current}`);
push(presenceRef, { name: user.name, lang: user.primaryLang, online: true });

const onlineRef = ref(db, "presence");
const onlineUnsub = onValue(onlineRef, (snap) => {
setOnlineCount(Object.keys(snap.val() || {}).length);
});

return () => { unsub(); onlineUnsub(); };
}, []);

useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages, showVoice]);

async function send(textOverride, type = "text") {
const text = textOverride || input.trim();
if (!text || busy) return;
setInput(""); setShowVoice(false); setBusy(true);

// Pre-translate to all other languages
const targets = LANGS.filter(l => !user.langs.includes(l.code));
const pairs = await Promise.all(targets.map(async l => [l.code, await aiTranslate(text, user.primaryLang, l.code, tone)]));
const translations = Object.fromEntries(pairs);
user.langs.forEach(c => { translations[c] = text; });

await push(ref(db, "messages"), {
text,
type,
lang: user.primaryLang,
langs: user.langs,
tone,
translations,
senderName: user.name,
senderFlag: myL.flag,
senderId: userId.current,
time: new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),
timestamp: Date.now(),
});

setBusy(false);
}

const cs = {
wrap: { height:"100vh", display:"flex", flexDirection:"column", background:BG, position:"relative", overflow:"hidden" },
header: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:"rgba(255,255,255,0.03)", borderBottom:`1px solid ${BORDER}`, position:"relative", zIndex:3 },
logo: { width:36, height:36, borderRadius:10, background:`linear-gradient(135deg,${GREEN},#00B4D8)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 },
pill: { background:"rgba(0,255,178,0.08)", border:"1px solid rgba(0,255,178,0.2)", borderRadius:20, padding:"5px 12px", color:"rgba(255,255,255,0.7)", fontSize:12, display:"flex", alignItems:"center" },
iBtn: { width:34, height:34, borderRadius:8, background:"rgba(255,255,255,0.06)", border:`1px solid ${BORDER}`, color:SUB, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 },
tabs: { display:"flex", borderBottom:`1px solid ${BORDER}`, position:"relative", zIndex:3 },
tab: { flex:1, padding:"10px", background:"none", border:"none", color:SUB, cursor:"pointer", fontSize:12, borderBottom:"2px solid transparent", transition:"all 0.2s" },
notice: { background:"rgba(0,255,178,0.05)", borderBottom:"1px solid rgba(0,255,178,0.1)", padding:"7px 14px", display:"flex", gap:8, alignItems:"center", color:SUB, fontSize:11, position:"relative", zIndex:2, flexWrap:"wrap" },
msgs: { flex:1, overflowY:"auto", padding:"16px 14px", position:"relative", zIndex:1 },
tPop: { background:"rgba(12,10,28,0.97)", backdropFilter:"blur(20px)", border:`1px solid ${BORDER}`, borderRadius:16, padding:"16px 14px", margin:"0 12px", position:"relative", zIndex:10 },
tOpt: { display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:12, background:"none", border:"none", cursor:"pointer", width:"100%", transition:"all 0.15s", marginBottom:4 },
vOver: { background:"rgba(8,6,18,0.97)", backdropFilter:"blur(16px)", padding:"20px 16px", borderTop:`1px solid ${BORDER}`, position:"relative", zIndex:5 },
iBar: { display:"flex", gap:8, padding:"10px 12px", background:"rgba(255,255,255,0.03)", borderTop:`1px solid ${BORDER}`, position:"relative", zIndex:3 },
iWrap: { flex:1, display:"flex", alignItems:"center", background:"rgba(255,255,255,0.07)", border:`1.5px solid ${BORDER}`, borderRadius:12, padding:"0 14px", gap:8 },
tInput: { flex:1, background:"none", border:"none", color:"#fff", fontSize:13, outline:"none", padding:"13px 0" },
sBtn: { width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${GREEN},#00B4D8)`, border:"none", cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 14px rgba(0,255,178,0.25)", flexShrink:0 },
};

return (
<div style={cs.wrap}>
<style>{globalCss}</style>

{/* Header */}
<div style={cs.header}>
<div style={{display:"flex",alignItems:"center",gap:10}}>
<div style={cs.logo}>⚡</div>
<div>
<div style={{color:"#fff",fontWeight:700,fontSize:16}}>ZeroBarrier</div>
<div style={{color:SUB,fontSize:11}}>
Global Room · <span style={{color:GREEN}}>{onlineCount} online</span>
</div>
</div>
</div>
<div style={{display:"flex",gap:8,alignItems:"center"}}>
<div style={cs.pill}>
{user.langs.map(c=>getLang(c).flag).join(" ")}
<span style={{marginLeft:6,color:GREEN,fontSize:11}}>→ {myL.label}</span>
</div>
<button style={cs.iBtn} onClick={onLogout}>✕</button>
</div>
</div>

{/* Tabs */}
<div style={cs.tabs}>
{[["chat","💬 Chat"],["profile","👤 Profile"],["share","🔗 Share"]].map(([t,l])=>(
<button key={t} style={{...cs.tab,color:tab===t?GREEN:SUB,borderBottomColor:tab===t?GREEN:"transparent"}} onClick={()=>setTab(t)}>{l}</button>
))}
</div>

{tab==="chat"&&<>
<div style={cs.notice}>
<span>⚡</span>
<span>You speak <strong style={{color:GREEN}}>{user.langs.map(c=>getLang(c).label).join(", ")}</strong>. Messages you already understand won't be translated.</span>
</div>

<div style={cs.msgs}>
{messages.length===0&&(
<div style={{textAlign:"center",padding:"40px 20px",color:SUB}}>
<div style={{fontSize:40,marginBottom:12}}>💬</div>
<div style={{fontWeight:700,color:"#fff",marginBottom:6}}>Start the conversation!</div>
<div style={{fontSize:13}}>Share the link below so others can join and chat in their language.</div>
</div>
)}
{messages.map(m=>(
<Bubble key={m.id} msg={m} myLangs={user.langs} myPrimary={user.primaryLang} isMe={m.senderId===userId.current}/>
))}
<div ref={bottomRef}/>
</div>

{showTone&&(
<div style={cs.tPop}>
<div style={{color:SUB,fontSize:11,marginBottom:10,letterSpacing:1}}>TRANSLATION TONE</div>
{TONES.map(t=>(
<button key={t.code} style={{...cs.tOpt,background:tone===t.code?"rgba(0,255,178,0.08)":"none"}} onClick={()=>{setTone(t.code);setShowTone(false);}}>
<span>{t.icon}</span>
<div>
<div style={{color:tone===t.code?GREEN:"#fff",fontSize:13,fontWeight:600}}>{t.label}</div>
<div style={{color:SUB,fontSize:11}}>{t.desc}</div>
</div>
{tone===t.code&&<span style={{color:GREEN,marginLeft:"auto"}}>✓</span>}
</button>
))}
</div>
)}

{showVoice&&(
<div style={cs.vOver}>
<VoiceRecorder lang={user.primaryLang} onSend={(t,type)=>send(t,type)} onCancel={()=>setShowVoice(false)}/>
</div>
)}

{!showVoice&&(
<div style={cs.iBar}>
<button style={{...cs.iBtn,fontSize:16}} onClick={()=>setShowTone(p=>!p)} title="Change tone">
{TONES.find(t=>t.code===tone)?.icon||"😊"}
</button>
<div style={cs.iWrap}>
<span style={{fontSize:16,flexShrink:0}}>{myL.flag}</span>
<input style={cs.tInput} placeholder={`Type in ${myL.label}…`} value={input}
onChange={e=>setInput(e.target.value)}
onKeyDown={e=>e.key==="Enter"&&send()}/>
</div>
<button style={{...cs.iBtn,fontSize:18,width:44,height:44,flexShrink:0}} onClick={()=>{setShowTone(false);setShowVoice(true);}}>🎙️</button>
<button style={{...cs.sBtn,opacity:input.trim()&&!busy?1:0.4}} onClick={()=>send()} disabled={!input.trim()||busy}>
{busy?"⏳":"⚡"}
</button>
</div>
)}
</>}

{tab==="profile"&&(
<div style={{flex:1,overflowY:"auto",padding:14,position:"relative",zIndex:1}}>
<div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:"20px 16px",marginBottom:12}}>
<div style={{width:64,height:64,borderRadius:18,background:"rgba(0,255,178,0.1)",border:"2px solid rgba(0,255,178,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 12px"}}>{myL.flag}</div>
<div style={{color:"#fff",fontWeight:800,fontSize:22,textAlign:"center",letterSpacing:-0.5}}>{user.name}</div>
<div style={{color:SUB,fontSize:12,textAlign:"center",marginTop:4}}>ZeroBarrier Member</div>
<div style={{height:1,background:BORDER,margin:"16px 0"}}/>
<div style={{color:GREEN,fontSize:10,letterSpacing:2,fontWeight:700,marginBottom:12}}>YOUR LANGUAGE PROFILE</div>
{user.langs.map(c=>{
const l=getLang(c);
return <div key={c} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"rgba(255,255,255,0.04)",borderRadius:12,marginBottom:8}}>
<span style={{fontSize:22}}>{l.flag}</span>
<div style={{flex:1}}><div style={{color:"#fff",fontWeight:600}}>{l.label}</div><div style={{color:SUB,fontSize:11}}>{l.native}</div></div>
<span style={{background:c===user.primaryLang?"rgba(0,255,178,0.15)":"rgba(78,205,196,0.12)",color:c===user.primaryLang?GREEN:"#4ECDC4",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{c===user.primaryLang?"★ Primary":"✓ Understood"}</span>
</div>;
})}
<div style={{height:1,background:BORDER,margin:"16px 0"}}/>
<div style={{color:GREEN,fontSize:10,letterSpacing:2,fontWeight:700,marginBottom:10}}>SMART TRANSLATION</div>
{user.langs.map(c=><div key={c} style={{display:"flex",gap:10,marginBottom:8,fontSize:13,color:SUB}}>
<span style={{color:"#4ECDC4"}}>✓</span> Messages in <strong style={{color:"#fff",margin:"0 4px"}}>{getLang(c).label}</strong> won't be translated
</div>)}
<div style={{display:"flex",gap:10,fontSize:13,color:SUB}}>
<span style={{color:GREEN}}>⚡</span> All others → <strong style={{color:"#fff",margin:"0 4px"}}>{myL.label}</strong>
</div>
</div>
</div>
)}

{tab==="share"&&(
<div style={{flex:1,overflowY:"auto",padding:14,position:"relative",zIndex:1}}>
<div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:"24px 20px",marginBottom:12,textAlign:"center"}}>
<div style={{fontSize:40,marginBottom:12}}>🔗</div>
<div style={{color:"#fff",fontWeight:700,fontSize:18,marginBottom:8}}>Invite anyone — no app needed</div>
<div style={{color:SUB,fontSize:13,lineHeight:1.65,marginBottom:20}}>Share this link. They open it in any browser. Pick their language. You both chat — each in your own language.</div>
<div style={{display:"flex",alignItems:"center",background:"rgba(0,255,178,0.07)",border:"1px solid rgba(0,255,178,0.2)",borderRadius:12,padding:"12px 16px",gap:10,marginBottom:16}}>
<span style={{color:GREEN,fontSize:13,flex:1,textAlign:"left",fontFamily:"monospace"}}>zerobarrier-app.vercel.app</span>
<button style={{background:GREEN,color:"#080612",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}} onClick={()=>navigator.clipboard?.writeText("https://zerobarrier-app.vercel.app")}>Copy</button>
</div>
<div style={{color:SUB,fontSize:12}}>Works on any phone, any browser, anywhere in the world 🌍</div>
</div>

<div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:"20px 16px"}}>
<div style={{color:GREEN,fontSize:10,letterSpacing:2,fontWeight:700,marginBottom:16}}>HOW IT WORKS</div>
{[["1.","Share the link with anyone worldwide"],["2.","They open it — no account, no download needed"],["3.","They pick their language"],["4.","You both chat. AI translates everything instantly."]].map(([n,t])=>(
<div key={n} style={{display:"flex",gap:10,marginBottom:12,fontSize:13}}>
<span style={{color:GREEN,fontWeight:700}}>{n}</span>
<span style={{color:SUB}}>{t}</span>
</div>
))}
</div>
</div>
)}
</div>
);
}

// ── ROOT ─────────────────────────────────────────────────────────────
export default function ZeroBarrier() {
const [user, setUser] = useState(null);
if (!user) return <Onboarding onStart={setUser}/>;
return <Chat user={user} onLogout={()=>setUser(null)}/>;
}