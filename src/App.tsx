import React from "react";
import { useState, useRef, useEffect } from "react";

/* ── LANGUAGES ─────────────────────────────────────────────────────── */
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
const getLang = c => LANGS.find(l => l.code === c) || LANGS[0];

const TONES = [
{ code:"casual", label:"Casual", icon:"😊", desc:"Friendly & relaxed" },
{ code:"formal", label:"Formal", icon:"💼", desc:"Professional & polite" },
{ code:"business", label:"Business", icon:"🤝", desc:"Clear & precise" },
];

/* ── SMART TRANSLATION ─────────────────────────────────────────────── */
// If user already understands the language — skip translation entirely
function userUnderstands(userLangs, msgLang) {
return userLangs.includes(msgLang);
}

// Get best display language for user
function getBestLang(userLangs, msgLang) {
// If user understands the message language already — show as-is
if (userUnderstands(userLangs, msgLang)) return null; // null = no translation needed
// Otherwise return their primary language (first in list)
return userLangs[0];
}

async function aiTranslate(text, from, to, tone = "casual") {
if (from === to || !text.trim()) return text;
const toneInstr = {
casual: "Use friendly, natural, conversational tone. Keep slang if appropriate.",
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

/* ── VOICE RECORDER ────────────────────────────────────────────────── */
function VoiceRecorder({ lang, tone, onSend, onCancel }) {
const [phase, setPhase] = useState("ready"); // ready|recording|processing|done
const [secs, setSecs] = useState(0);
const [transcript, setTranscript] = useState("");
const timerRef = useRef(null);
const recRef = useRef(null);
const chunksRef= useRef([]);

const MOCK = {
en:"Hello! I wanted to discuss the project timeline and the budget with you.",
hi:"नमस्ते! मैं आपके साथ प्रोजेक्ट की समयसीमा और बजट पर चर्चा करना चाहता था।",
ur:"ہیلو! میں آپ کے ساتھ پروجیکٹ ٹائم لائن اور بجٹ پر بات کرنا چاہتا تھا۔",
de:"Hallo! Ich wollte die Projektzeitleiste und das Budget mit Ihnen besprechen.",
ar:"مرحباً! أردت مناقشة الجدول الزمني للمشروع والميزانية معك.",
fr:"Bonjour! Je voulais discuter du calendrier du projet et du budget avec vous.",
es:"¡Hola! Quería hablar contigo sobre el cronograma y el presupuesto.",
};

function fmt(s) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; }

function startRec() {
setPhase("recording"); setSecs(0); chunksRef.current=[];
timerRef.current = setInterval(()=>setSecs(s=>s+1),1000);
navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
const mr = new MediaRecorder(stream);
recRef.current = mr;
mr.ondataavailable = e=>chunksRef.current.push(e.data);
mr.onstop = ()=>{ stream.getTracks().forEach(t=>t.stop()); finalize(); };
mr.start();
}).catch(()=>{ setTimeout(()=>{ clearInterval(timerRef.current); finalize(); },2000); });
}

function stopRec() {
clearInterval(timerRef.current);
if(recRef.current?.state==="recording") recRef.current.stop();
else finalize();
}

function finalize() {
setPhase("processing");
setTimeout(()=>{
setTranscript(MOCK[lang]||MOCK.en);
setPhase("done");
},1200);
}

return (
<div style={vr.wrap}>
{phase==="ready"&&(
<>
<div style={vr.hint}>Tap mic to record your voice message</div>
<button style={vr.micBtn} onClick={startRec}>🎙️</button>
<button style={vr.cancelBtn} onClick={onCancel}>Cancel</button>
</>
)}
{phase==="recording"&&(
<>
<div style={vr.timer}>{fmt(secs)}</div>
<div style={vr.waves}>
{[...Array(14)].map((_,i)=>(
<div key={i} style={{...vr.bar, height:`${8+Math.random()*22}px`, animationDelay:`${i*0.07}s`}}/>
))}
</div>
<button style={{...vr.micBtn,background:"linear-gradient(135deg,#FF6B6B,#ff9a3c)",boxShadow:"0 8px 24px rgba(255,107,107,0.4)"}} onClick={stopRec}>⏹</button>
<div style={vr.hint}>Tap to stop</div>
</>
)}
{phase==="processing"&&(
<div style={{textAlign:"center",padding:"8px 0"}}>
<div style={vr.spinner}/>
<div style={{color:"#00FFB2",fontWeight:700,marginBottom:4}}>Transcribing…</div>
<div style={vr.hint}>AI is converting your voice to text</div>
</div>
)}
{phase==="done"&&(
<>
<div style={vr.transcriptBox}>
<div style={{color:"#00FFB2",fontSize:9,letterSpacing:2,marginBottom:6,fontWeight:700}}>🎙️ TRANSCRIBED · {getLang(lang).flag} {getLang(lang).label}</div>
<div style={{color:"#fff",fontSize:13,lineHeight:1.6}}>{transcript}</div>
</div>
<div style={{display:"flex",gap:8,width:"100%"}}>
<button style={vr.sendBtn} onClick={()=>onSend(transcript,"voice")}>
⚡ Send Voice Note
</button>
<button style={vr.retryBtn} onClick={()=>{setPhase("ready");setSecs(0);}}>↩</button>
</div>
</>
)}
</div>
);
}

/* ── DEMO USERS ────────────────────────────────────────────────────── */
const DEMO_USERS = [
{ id:"u1", name:"Rahul", langs:["hi","en"], primaryLang:"hi", flag:"🇮🇳", color:"#FF6B6B", tone:"casual", role:"Freelancer · Mumbai" },
{ id:"u2", name:"Klaus", langs:["de"], primaryLang:"de", flag:"🇩🇪", color:"#4ECDC4", tone:"business", role:"Client · Berlin" },
{ id:"u3", name:"Fatima", langs:["ar","fr"], primaryLang:"ar", flag:"🇸🇦", color:"#FFD93D", tone:"formal", role:"Designer · Dubai" },
];

const DEMO_MSGS = [
{ id:"m1", uid:"u2", sender:"Klaus", flag:"🇩🇪", color:"#4ECDC4", lang:"de", langs:["de"], tone:"business",
text:"Guten Tag! Ich suche einen erfahrenen Entwickler für mein Projekt. Budget ist flexibel.",
tr:{ en:"Good day! I'm looking for an experienced developer for my project. Budget is flexible.", hi:"नमस्ते! मुझे अपने प्रोजेक्ट के लिए एक अनुभवी डेवलपर की तलाश है। बजट लचीला है।", ar:"مرحباً! أبحث عن مطور متمرس لمشروعي. الميزانية مرنة.", ur:"ہیلو! مجھے اپنے پراجیکٹ کے لیے ایک تجربہ کار ڈویلپر چاہیے۔ بجٹ لچکدار ہے۔", fr:"Bonjour! Je cherche un développeur expérimenté. Le budget est flexible." }},
{ id:"m2", uid:"u1", sender:"Rahul", flag:"🇮🇳", color:"#FF6B6B", lang:"hi", langs:["hi","en"], tone:"casual",
text:"नमस्ते Klaus! मैं 5 साल का अनुभव रखता हूँ। आपका प्रोजेक्ट किस बारे में है?",
tr:{ de:"Hallo Klaus! Ich habe 5 Jahre Erfahrung. Worum geht es bei Ihrem Projekt?", ar:"مرحباً كلاوس! لدي 5 سنوات خبرة. ما موضوع مشروعك؟", fr:"Bonjour Klaus! J'ai 5 ans d'expérience. De quoi parle votre projet?", ur:"ہیلو Klaus! میرے پاس 5 سال کا تجربہ ہے۔ آپ کا پراجیکٹ کس بارے میں ہے؟" }},
{ id:"m3", uid:"u3", sender:"Fatima", flag:"🇸🇦", color:"#FFD93D", lang:"ar", langs:["ar","fr"], tone:"formal",
text:"أنا مصممة واجهات متخصصة. يمكنني المساهمة في الجانب البصري للمشروع.",
tr:{ en:"I am a specialized UI designer. I can contribute to the visual aspect of the project.", hi:"मैं एक विशेष UI डिजाइनर हूँ। मैं प्रोजेक्ट के दृश्य पहलू में योगदान कर सकती हूँ।", de:"Ich bin eine spezialisierte UI-Designerin. Ich kann zum visuellen Aspekt des Projekts beitragen.", ur:"میں ایک خصوصی UI ڈیزائنر ہوں۔ میں پراجیکٹ کے بصری پہلو میں حصہ ڈال سکتی ہوں۔" }},
];

/* ══════════════════════════════════════════════════════════════════════
ONBOARDING — 3 steps: Name → Languages → Tone
══════════════════════════════════════════════════════════════════════ */
function Onboarding({ onStart }) {
const [step, setStep] = useState(1);
const [name, setName] = useState("");
const [selected, setSelected] = useState([]); // up to 3 languages
const [primary, setPrimary] = useState(null);
const [tone, setTone] = useState("casual");

function toggleLang(code) {
if (selected.includes(code)) {
setSelected(s => s.filter(c => c !== code));
if (primary === code) setPrimary(selected.filter(c => c !== code)[0] || null);
} else {
if (selected.length >= 3) return; // max 3
setSelected(s => [...s, code]);
if (!primary) setPrimary(code);
}
}

function setPrimaryLang(code) {
if (!selected.includes(code)) return;
setPrimary(code);
}

const canNext1 = name.trim().length > 0;
const canNext2 = selected.length >= 1 && primary;

return (
<div style={ob.wrap}>
<style>{globalCss}</style>
<div style={ob.blob1}/><div style={ob.blob2}/>

<div style={ob.card} className="card-in">
{/* Progress bar */}
<div style={ob.progress}>
{[1,2,3].map(s => (
<div key={s} style={{...ob.progressStep, ...(s<=step?ob.progressActive:{})}}>
<div style={{...ob.progressDot, background: s<=step?"#00FFB2":"rgba(255,255,255,0.15)"}}>
{s < step ? "✓" : s}
</div>
<div style={{...ob.progressLabel, color: s<=step?"#00FFB2":"rgba(255,255,255,0.3)"}}>
{["Name","Languages","Style"][s-1]}
</div>
</div>
))}
<div style={ob.progressLine}/>
</div>

{/* Logo */}
<div style={ob.logo}><span style={{color:"#00FFB2"}}>Zero</span>Barrier</div>

{/* ── STEP 1: NAME ── */}
{step===1&&(
<div className="fade-in">
<div style={ob.stepTag}>STEP 1 OF 3</div>
<div style={ob.title}>What's your name?</div>
<div style={ob.sub}>How others will see you in chats</div>
<input style={ob.input} placeholder="Your name…" value={name} autoFocus
onChange={e=>setName(e.target.value)}
onKeyDown={e=>e.key==="Enter"&&canNext1&&setStep(2)}/>
<button style={{...ob.btn, opacity:canNext1?1:0.4}} disabled={!canNext1} onClick={()=>setStep(2)}>
Continue →
</button>
</div>
)}

{/* ── STEP 2: LANGUAGES ── */}
{step===2&&(
<div className="fade-in">
<div style={ob.stepTag}>STEP 2 OF 3</div>
<div style={ob.title}>Which languages do you speak?</div>
<div style={ob.sub}>
Select up to <strong style={{color:"#00FFB2"}}>3 languages</strong> you understand.
Then tap one to set it as your <strong style={{color:"#00FFB2"}}>preferred</strong> language.
</div>

{/* Selection counter */}
<div style={ob.counter}>
<div style={ob.counterBar}>
{[0,1,2].map(i=>(
<div key={i} style={{...ob.counterDot, background: i<selected.length?"#00FFB2":"rgba(255,255,255,0.1)"}}/>
))}
</div>
<span style={{color:"rgba(255,255,255,0.4)",fontSize:12}}>{selected.length}/3 selected</span>
</div>

{/* Language grid */}
<div style={ob.langGrid}>
{LANGS.map(l=>{
const isSelected = selected.includes(l.code);
const isPrimary = primary === l.code;
return (
<button key={l.code}
style={{...ob.langBtn,
...(isSelected ? ob.langSelected : {}),
...(isPrimary ? ob.langPrimary : {}),
opacity: !isSelected && selected.length>=3 ? 0.35 : 1,
}}
onClick={()=> isSelected ? setPrimaryLang(l.code) : toggleLang(l.code)}
>
<span style={{fontSize:22}}>{l.flag}</span>
<span style={{fontSize:11,marginTop:3,color:isPrimary?"#080612":isSelected?"#00FFB2":"rgba(255,255,255,0.5)"}}>{l.label}</span>
{isPrimary&&<span style={ob.primaryBadge}>★ Primary</span>}
{isSelected&&!isPrimary&&<span style={ob.understoodBadge}>✓</span>}
</button>
);
})}
</div>

<div style={ob.langHint}>
💡 <strong>Tap unselected</strong> to add · <strong>Tap selected</strong> to set as primary
</div>

{/* Selected preview */}
{selected.length>0&&(
<div style={ob.preview}>
<div style={{color:"rgba(255,255,255,0.4)",fontSize:11,marginBottom:8,letterSpacing:1}}>YOUR LANGUAGE PROFILE</div>
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
{selected.map(c=>{
const l = getLang(c);
return (
<div key={c} style={{...ob.previewTag,...(c===primary?ob.previewPrimary:{})}}>
{l.flag} {l.label}
{c===primary&&<span style={{marginLeft:4,fontSize:9}}>★ PRIMARY</span>}
<button style={ob.removeBtn} onClick={()=>toggleLang(c)}>×</button>
</div>
);
})}
</div>
</div>
)}

<div style={{display:"flex",gap:10}}>
<button style={ob.backBtn} onClick={()=>setStep(1)}>←</button>
<button style={{...ob.btn,flex:1,opacity:canNext2?1:0.4}} disabled={!canNext2} onClick={()=>setStep(3)}>
Continue →
</button>
</div>
</div>
)}

{/* ── STEP 3: TONE ── */}
{step===3&&(
<div className="fade-in">
<div style={ob.stepTag}>STEP 3 OF 3</div>
<div style={ob.title}>What's your communication style?</div>
<div style={ob.sub}>AI will translate your messages in this tone</div>

<div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>
{TONES.map(t=>(
<button key={t.code}
style={{...ob.toneBtn,...(tone===t.code?ob.toneBtnActive:{})}}
onClick={()=>setTone(t.code)}>
<span style={{fontSize:28}}>{t.icon}</span>
<div style={{textAlign:"left"}}>
<div style={{color:tone===t.code?"#00FFB2":"#fff",fontWeight:700,fontSize:15}}>{t.label}</div>
<div style={{color:"rgba(255,255,255,0.45)",fontSize:12,marginTop:2}}>{t.desc}</div>
</div>
{tone===t.code&&<div style={ob.toneCheck}>✓</div>}
</button>
))}
</div>

<div style={{display:"flex",gap:10}}>
<button style={ob.backBtn} onClick={()=>setStep(2)}>←</button>
<button style={{...ob.btn,flex:1}}
onClick={()=>onStart({name:name.trim(),langs:selected,primaryLang:primary,tone})}>
Enter ZeroBarrier ⚡
</button>
</div>
</div>
)}
</div>
</div>
);
}

/* ── SMART MESSAGE DISPLAY ─────────────────────────────────────────── */
function Bubble({ msg, myLangs, myPrimary, isMe }) {
const [showOrig, setShowOrig] = useState(false);

// Smart logic: if I already understand this language — don't translate
const alreadyUnderstands = myLangs.includes(msg.lang);
const displayText = showOrig || alreadyUnderstands
? msg.text
: (msg.tr?.[myPrimary] || msg.tr?.[myLangs[0]] || msg.text);

const wasTranslated = !alreadyUnderstands && msg.tr?.[myPrimary];
const srcLang = getLang(msg.lang);
const myPrimaryLang = getLang(myPrimary);

return (
<div style={{display:"flex",flexDirection:isMe?"row-reverse":"row",gap:10,alignItems:"flex-end",marginBottom:18}}>
<div style={{...ch.avatar,background:msg.color+"22",border:`2px solid ${msg.color}55`,flexShrink:0}}>
{msg.flag}
</div>
<div style={{maxWidth:"70%",display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start"}}>
<div style={ch.meta}>
<span>{isMe?"You":msg.sender}</span>
<span style={{opacity:0.4,fontSize:10}}>{msg.time}</span>
{alreadyUnderstands
? <span style={{...ch.tag,background:"rgba(78,205,196,0.12)",color:"#4ECDC4"}}>✓ you understand {srcLang.label}</span>
: wasTranslated
? <span style={{...ch.tag,background:"rgba(0,255,178,0.1)",color:"#00FFB2"}}>⚡ → {myPrimaryLang.label}</span>
: null
}
</div>

<div style={{...ch.bubble,...(isMe?ch.bubbleMe:ch.bubbleThem)}} className="bubble">
{msg.type==="voice" ? (
<>
<div style={ch.voicePlayer}>
<div style={ch.voiceIcon}>▶</div>
<div style={{flex:1}}>
<div style={ch.voiceBar}><div style={{...ch.voiceProgress,width:"45%"}}/></div>
<div style={{color:"rgba(255,255,255,0.4)",fontSize:10,marginTop:2}}>{msg.duration||"0:05"}</div>
</div>
<span style={{...ch.tag,background:"rgba(255,107,107,0.15)",color:"#FF6B6B",padding:"2px 7px",borderRadius:6,fontSize:9}}>🎙️ voice</span>
</div>
<div style={ch.voiceTranscript}>
<span style={{color:"#00FFB2",fontSize:9,letterSpacing:1,fontWeight:700}}>TRANSCRIPT · </span>
{displayText}
{msg.loading&&<span className="dots"><span>.</span><span>.</span><span>.</span></span>}
</div>
</>
) : (
<>
{displayText}
{msg.loading&&<span className="dots"><span>.</span><span>.</span><span>.</span></span>}
</>
)}
</div>

{wasTranslated&&(
<button style={ch.origBtn} onClick={()=>setShowOrig(p=>!p)}>
{showOrig?`▲ hide original (${srcLang.label})`:`▼ original (${srcLang.label})`}
</button>
)}
{showOrig&&!alreadyUnderstands&&(
<div style={ch.origBox}>{msg.text}</div>
)}
</div>
</div>
);
}

/* ── CHAT ──────────────────────────────────────────────────────────── */
function Chat({ user, onLogout }) {
const [msgs, setMsgs] = useState(DEMO_MSGS);
const [input, setInput] = useState("");
const [busy, setBusy] = useState(false);
const [tab, setTab] = useState("chat");
const [tone, setTone] = useState(user.tone);
const [showTone, setShowTone] = useState(false);
const [showVoice, setShowVoice] = useState(false);
const bottomRef = useRef(null);

useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

const myPrimary = user.primaryLang;
const myLangs = user.langs;
const myL = getLang(myPrimary);

async function send(textOverride, type="text") {
const text = textOverride || input.trim();
if (!text || busy) return;
setInput(""); setShowVoice(false); setBusy(true);
const tempId = "m_"+Date.now();
const newMsg = {
id:tempId, uid:"me", sender:user.name, flag:myL.flag, color:"#00FFB2",
lang:myPrimary, langs:myLangs, tone, type,
duration: type==="voice" ? `0:0${Math.floor(Math.random()*8+3)}` : undefined,
text, time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
tr:{}, loading:true,
};
setMsgs(p=>[...p,newMsg]);

// Translate to all languages EXCEPT ones user already knows
const targets = LANGS.filter(l=>!myLangs.includes(l.code));
const pairs = await Promise.all(targets.map(async l=>[l.code, await aiTranslate(text,myPrimary,l.code,tone)]));
const tr = Object.fromEntries(pairs);
myLangs.forEach(c=>{ tr[c]=text; }); // no translation needed for langs user knows

setMsgs(p=>p.map(m=>m.id===tempId?{...m,tr,loading:false}:m));
setBusy(false);
}

return (
<div style={ch.wrap}>
<style>{globalCss}</style>
<div style={ob.blob1}/><div style={ob.blob2}/>

{/* Header */}
<div style={ch.header}>
<div style={ch.headerL}>
<div style={ch.logo}>⚡</div>
<div>
<div style={ch.title}>ZeroBarrier</div>
<div style={ch.sub}>Global Room · {DEMO_USERS.length+1} online</div>
</div>
</div>
<div style={{display:"flex",gap:8,alignItems:"center"}}>
{/* My language profile pill */}
<div style={ch.profilePill}>
{myLangs.map(c=>getLang(c).flag).join(" ")}
<span style={{marginLeft:6,color:"#00FFB2",fontSize:11}}>→ {myL.label}</span>
</div>
<button style={ch.iconBtn} onClick={onLogout}>✕</button>
</div>
</div>

{/* Tabs */}
<div style={ch.tabs}>
{[["chat","💬 Chat"],["profile","👤 My Profile"],["members","👥 Members"]].map(([t,l])=>(
<button key={t} style={{...ch.tab,...(tab===t?ch.tabOn:{})}} onClick={()=>setTab(t)}>{l}</button>
))}
</div>

{/* ── CHAT TAB ── */}
{tab==="chat"&&(
<>
<div style={ch.notice}>
<span>⚡</span>
<span>
You speak <strong style={{color:"#00FFB2"}}>{myLangs.map(c=>getLang(c).label).join(", ")}</strong>.
Messages you already understand won't be translated.
</span>
</div>

<div style={ch.msgs}>
{msgs.map(m=>(
<Bubble key={m.id} msg={m} myLangs={myLangs} myPrimary={myPrimary} isMe={m.uid==="me"}/>
))}
<div ref={bottomRef}/>
</div>

{/* Tone selector popup */}
{showTone&&(
<div style={ch.tonePopup}>
<div style={{color:"rgba(255,255,255,0.5)",fontSize:11,marginBottom:10,letterSpacing:1}}>TRANSLATION TONE</div>
{TONES.map(t=>(
<button key={t.code} style={{...ch.toneOption,...(tone===t.code?ch.toneActive:{})}}
onClick={()=>{setTone(t.code);setShowTone(false);}}>
<span>{t.icon}</span>
<div>
<div style={{color:tone===t.code?"#00FFB2":"#fff",fontSize:13,fontWeight:600}}>{t.label}</div>
<div style={{color:"rgba(255,255,255,0.4)",fontSize:11}}>{t.desc}</div>
</div>
{tone===t.code&&<span style={{color:"#00FFB2",marginLeft:"auto"}}>✓</span>}
</button>
))}
</div>
)}

{/* Voice recorder overlay */}
{showVoice&&(
<div style={ch.voiceOverlay}>
<VoiceRecorder lang={myPrimary} tone={tone}
onSend={(t,type)=>send(t,type)}
onCancel={()=>setShowVoice(false)}/>
</div>
)}

{/* Input bar */}
{!showVoice&&(
<div style={ch.inputBar}>
<button style={{...ch.iconBtn,fontSize:16}} onClick={()=>setShowTone(p=>!p)}
title="Change tone">
{TONES.find(t=>t.code===tone)?.icon||"😊"}
</button>
<div style={ch.inputWrap}>
<span style={{fontSize:16,flexShrink:0}}>{myL.flag}</span>
<input style={ch.textInput}
placeholder={`Type in ${myL.label} (${TONES.find(t=>t.code===tone)?.label} tone)…`}
value={input} onChange={e=>setInput(e.target.value)}
onKeyDown={e=>e.key==="Enter"&&send()}/>
</div>
<button style={{...ch.iconBtn,fontSize:18,width:44,height:44,flexShrink:0}}
onClick={()=>{setShowTone(false);setShowVoice(true);}}
title="Send voice message">🎙️</button>
<button style={{...ch.sendBtn,opacity:input.trim()&&!busy?1:0.4}}
onClick={()=>send()} disabled={!input.trim()||busy}>
{busy?"⏳":"⚡"}
</button>
</div>
)}
</>
)}

{/* ── PROFILE TAB ── */}
{tab==="profile"&&(
<div style={info.wrap}>
<div style={info.card}>
<div style={info.avatar}>{myL.flag}</div>
<div style={info.name}>{user.name}</div>
<div style={info.roleText}>ZeroBarrier Member</div>

<div style={info.divider}/>

<div style={info.sectionLabel}>YOUR LANGUAGE PROFILE</div>
<div style={info.langList}>
{myLangs.map((c,i)=>{
const l = getLang(c);
return (
<div key={c} style={info.langRow}>
<span style={{fontSize:22}}>{l.flag}</span>
<div style={{flex:1}}>
<div style={{color:"#fff",fontWeight:600}}>{l.label}</div>
<div style={{color:"rgba(255,255,255,0.4)",fontSize:11}}>{l.native}</div>
</div>
{c===myPrimary
? <span style={info.primaryTag}>★ Primary</span>
: <span style={info.understoodTag}>✓ Understood</span>
}
</div>
);
})}
</div>

<div style={info.divider}/>

<div style={info.sectionLabel}>SMART TRANSLATION BEHAVIOUR</div>
<div style={info.ruleBox}>
{myLangs.map(c=>{
const l = getLang(c);
return (
<div key={c} style={info.rule}>
<span style={{color:"#4ECDC4"}}>✓</span>
<span style={{color:"rgba(255,255,255,0.6)",fontSize:13}}>
Messages in <strong style={{color:"#fff"}}>{l.label}</strong> won't be translated — you already understand it
</span>
</div>
);
})}
<div style={info.rule}>
<span style={{color:"#00FFB2"}}>⚡</span>
<span style={{color:"rgba(255,255,255,0.6)",fontSize:13}}>
All other languages → translated to <strong style={{color:"#fff"}}>{getLang(myPrimary).label}</strong>
</span>
</div>
</div>

<div style={info.divider}/>

<div style={info.sectionLabel}>YOUR TRANSLATION TONE</div>
<div style={{display:"flex",gap:8,marginTop:8}}>
{TONES.map(t=>(
<div key={t.code} style={{...info.toneChip,...(tone===t.code?info.toneChipActive:{})}}>
{t.icon} {t.label}
{tone===t.code&&<span style={{color:"#00FFB2",marginLeft:4}}>✓</span>}
</div>
))}
</div>
</div>
</div>
)}

{/* ── MEMBERS TAB ── */}
{tab==="members"&&(
<div style={info.wrap}>
{[...DEMO_USERS,{id:"me",name:user.name,langs:myLangs,primaryLang:myPrimary,flag:myL.flag,color:"#00FFB2",tone,role:"You · Member"}].map(u=>(
<div key={u.id} style={info.memberCard}>
<div style={{...info.memberAvatar,background:u.color+"22",border:`2px solid ${u.color}55`}}>
{u.flag}
</div>
<div style={{flex:1}}>
<div style={{display:"flex",alignItems:"center",gap:8}}>
<span style={{color:"#fff",fontWeight:700,fontSize:15}}>{u.name}</span>
{u.id==="me"&&<span style={{background:"rgba(0,255,178,0.15)",color:"#00FFB2",fontSize:9,padding:"2px 8px",borderRadius:20,letterSpacing:1}}>YOU</span>}
</div>
<div style={{color:"rgba(255,255,255,0.4)",fontSize:11,marginTop:2}}>{u.role}</div>
<div style={{display:"flex",gap:5,marginTop:8,flexWrap:"wrap"}}>
{u.langs.map(c=>{
const l = getLang(c);
return (
<span key={c} style={{...info.memberLang,...(c===u.primaryLang?info.memberPrimary:{})}}>
{l.flag} {l.label}
{c===u.primaryLang&&<span style={{fontSize:9,marginLeft:3}}>★</span>}
</span>
);
})}
</div>
</div>
<div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
<div style={{width:8,height:8,borderRadius:"50%",background:"#00FFB2",boxShadow:"0 0 6px #00FFB2"}}/>
<div style={{color:"rgba(255,255,255,0.3)",fontSize:10}}>online</div>
<div style={{...info.toneChip,fontSize:10,padding:"2px 8px"}}>
{TONES.find(t=>t.code===u.tone)?.icon} {TONES.find(t=>t.code===u.tone)?.label}
</div>
</div>
</div>
))}

<div style={{...info.card,marginTop:4}}>
<div style={info.sectionLabel}>HOW IT WORKS FOR THIS GROUP</div>
<div style={{color:"rgba(255,255,255,0.5)",fontSize:13,lineHeight:1.7,marginTop:8}}>
Each member has their own language profile. When anyone sends a message, ZeroBarrier checks each member's languages individually and translates only when needed — skipping unnecessary translations for people who already understand.
</div>
</div>
</div>
)}
</div>
);
}

/* ══════════════════════════════════════════════════════════════════════
ROOT
══════════════════════════════════════════════════════════════════════ */
export default function ZeroBarrier() {
const [user, setUser] = useState(null);
if (!user) return <Onboarding onStart={setUser}/>;
return <Chat user={user} onLogout={()=>setUser(null)}/>;
}

/* ══════════════════════════════════════════════════════════════════════
STYLES
══════════════════════════════════════════════════════════════════════ */
const T: Record<string,string> = { bg:"#080612", green:"#00FFB2", red:"#FF6B6B", teal:"#4ECDC4", card:"rgba(255,255,255,0.05)", border:"rgba(255,255,255,0.09)", sub:"rgba(255,255,255,0.45)" };

const ob: Record<string,React.CSSProperties> = {
wrap: { minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20, position:"relative", overflow:"hidden", fontFamily:"'Outfit',sans-serif" },
blob1: { position:"fixed", top:-150, left:-150, width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(0,255,178,0.12) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 },
blob2: { position:"fixed", bottom:-100, right:-100, width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,107,107,0.08) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 },
card: { width:"100%", maxWidth:480, background:T.card, backdropFilter:"blur(24px)", border:`1px solid ${T.border}`, borderRadius:28, padding:"32px 28px", position:"relative", zIndex:2 },
progress:{ display:"flex", alignItems:"flex-start", justifyContent:"center", gap:0, marginBottom:28, position:"relative" },
progressLine:{ position:"absolute", top:16, left:"20%", right:"20%", height:1, background:"rgba(255,255,255,0.08)", zIndex:0 },
progressStep:{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flex:1, position:"relative", zIndex:1 },
progressActive:{},
progressDot:{ width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#080612", transition:"all 0.3s" },
progressLabel:{ fontSize:10, letterSpacing:0.5, transition:"color 0.3s" },
logo: { fontWeight:800, fontSize:22, color:"#fff", marginBottom:24, letterSpacing:-0.5 },
stepTag:{ color:T.green, fontSize:10, letterSpacing:2, fontWeight:700, marginBottom:8 },
title: { color:"#fff", fontSize:24, fontWeight:800, lineHeight:1.3, marginBottom:6, letterSpacing:-0.5 },
sub: { color:T.sub, fontSize:13, lineHeight:1.6, marginBottom:20 },
input: { width:"100%", padding:"13px 16px", borderRadius:12, fontSize:15, background:"rgba(255,255,255,0.07)", border:`1.5px solid ${T.border}`, color:"#fff", fontFamily:"'Outfit',sans-serif", boxSizing:"border-box", outline:"none", marginBottom:16 },
btn: { width:"100%", padding:14, borderRadius:12, fontSize:15, fontWeight:700, background:`linear-gradient(135deg,${T.green},#00B4D8)`, color:"#080612", border:"none", cursor:"pointer", fontFamily:"'Outfit',sans-serif", boxShadow:"0 4px 20px rgba(0,255,178,0.25)", transition:"all 0.2s" },
backBtn:{ width:48, height:48, borderRadius:12, background:"rgba(255,255,255,0.07)", border:`1px solid ${T.border}`, color:"#fff", cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
counter:{ display:"flex", alignItems:"center", gap:10, marginBottom:14 },
counterBar:{ display:"flex", gap:6 },
counterDot:{ width:10, height:10, borderRadius:"50%", transition:"background 0.2s" },
langGrid:{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 },
langBtn:{ display:"flex", flexDirection:"column", alignItems:"center", padding:"10px 4px", borderRadius:12, background:"rgba(255,255,255,0.04)", border:`1.5px solid ${T.border}`, cursor:"pointer", transition:"all 0.15s", position:"relative" },
langSelected:{ background:"rgba(0,255,178,0.07)", borderColor:"rgba(0,255,178,0.35)" },
langPrimary: { background:"linear-gradient(135deg,rgba(0,255,178,0.25),rgba(0,180,216,0.2))", borderColor:T.green },
primaryBadge:{ position:"absolute", top:-8, left:"50%", transform:"translateX(-50%)", background:T.green, color:"#080612", fontSize:8, fontWeight:700, padding:"2px 6px", borderRadius:10, whiteSpace:"nowrap" },
understoodBadge:{ position:"absolute", top:-6, right:-6, background:"rgba(0,255,178,0.2)", color:T.green, fontSize:10, width:18, height:18, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${T.green}` },
langHint:{ color:"rgba(255,255,255,0.3)", fontSize:11, textAlign:"center", marginBottom:14, lineHeight:1.6 },
preview:{ background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`, borderRadius:14, padding:"12px 14px", marginBottom:16 },
previewTag:{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", borderRadius:8, background:"rgba(255,255,255,0.06)", border:`1px solid ${T.border}`, color:"rgba(255,255,255,0.6)", fontSize:12 },
previewPrimary:{ background:"rgba(0,255,178,0.1)", borderColor:"rgba(0,255,178,0.3)", color:T.green },
removeBtn:{ background:"none", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:16, marginLeft:4, padding:0, lineHeight:1 },
toneBtn:{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:14, background:"rgba(255,255,255,0.04)", border:`1.5px solid ${T.border}`, cursor:"pointer", transition:"all 0.18s", position:"relative" },
toneBtnActive:{ background:"rgba(0,255,178,0.08)", borderColor:"rgba(0,255,178,0.4)" },
toneCheck:{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", color:T.green, fontSize:18, fontWeight:700 },
};

const ch: Record<string,React.CSSProperties> = {
wrap: { height:"100vh", display:"flex", flexDirection:"column", background:T.bg, fontFamily:"'Outfit',sans-serif", position:"relative", overflow:"hidden" },
header: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:"rgba(255,255,255,0.03)", borderBottom:`1px solid ${T.border}`, position:"relative", zIndex:3 },
headerL:{ display:"flex", alignItems:"center", gap:10 },
logo: { width:36, height:36, borderRadius:10, background:`linear-gradient(135deg,${T.green},#00B4D8)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 },
title: { color:"#fff", fontWeight:700, fontSize:16 },
sub: { color:T.sub, fontSize:11 },
profilePill:{ background:"rgba(0,255,178,0.08)", border:"1px solid rgba(0,255,178,0.2)", borderRadius:20, padding:"5px 12px", color:"rgba(255,255,255,0.7)", fontSize:12, display:"flex", alignItems:"center" },
iconBtn:{ width:34, height:34, borderRadius:8, background:"rgba(255,255,255,0.06)", border:`1px solid ${T.border}`, color:"rgba(255,255,255,0.5)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 },
tabs: { display:"flex", borderBottom:`1px solid ${T.border}`, position:"relative", zIndex:3 },
tab: { flex:1, padding:"10px", background:"none", border:"none", color:T.sub, cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:12, borderBottom:"2px solid transparent", transition:"all 0.2s" },
tabOn: { color:T.green, borderBottomColor:T.green },
notice: { background:"rgba(0,255,178,0.05)", borderBottom:"1px solid rgba(0,255,178,0.1)", padding:"7px 14px", display:"flex", gap:8, alignItems:"center", color:T.sub, fontSize:11, position:"relative", zIndex:2, flexWrap:"wrap" },
msgs: { flex:1, overflowY:"auto", padding:"16px 14px", position:"relative", zIndex:1 },
avatar: { width:34, height:34, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 },
meta: { display:"flex", gap:6, alignItems:"center", color:T.sub, fontSize:10, marginBottom:5, flexWrap:"wrap" },
tag: { padding:"2px 7px", borderRadius:6, fontSize:9, fontWeight:600 },
bubble: { padding:"11px 14px", borderRadius:16, fontSize:14, lineHeight:1.55, color:"#fff", maxWidth:"100%", wordBreak:"break-word" },
bubbleMe: { background:"linear-gradient(135deg,#007A55,#00B4D8)", borderTopRightRadius:4, boxShadow:"0 4px 16px rgba(0,255,178,0.15)" },
bubbleThem:{ background:"rgba(255,255,255,0.08)", borderTopLeftRadius:4 },
origBtn:{ marginTop:4, background:"none", border:"none", color:"rgba(255,255,255,0.25)", fontSize:10, cursor:"pointer", fontFamily:"'Outfit',sans-serif", padding:0 },
origBox:{ marginTop:4, background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 10px", color:"rgba(255,255,255,0.35)", fontSize:12 },
voiceOverlay:{ background:"rgba(8,6,18,0.97)", backdropFilter:"blur(16px)", padding:"20px 16px", borderTop:`1px solid ${T.border}`, position:"relative", zIndex:5 },
voicePlayer:{ display:"flex", alignItems:"center", gap:10, marginBottom:8 },
voiceIcon:{ width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,cursor:"pointer",flexShrink:0 },
voiceBar:{ height:3,background:"rgba(255,255,255,0.15)",borderRadius:3,flex:1 },
voiceProgress:{ height:"100%",background:"#00FFB2",borderRadius:3 },
voiceTranscript:{ fontSize:12,color:"rgba(255,255,255,0.55)",lineHeight:1.55,borderTop:"1px solid rgba(255,255,255,0.1)",paddingTop:8,marginTop:2 },
toneOption:{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:12, background:"none", border:"none", cursor:"pointer", width:"100%", transition:"all 0.15s", marginBottom:4 },
toneActive:{ background:"rgba(0,255,178,0.08)" },
inputBar:{ display:"flex", gap:8, padding:"10px 12px", background:"rgba(255,255,255,0.03)", borderTop:`1px solid ${T.border}`, position:"relative", zIndex:3 },
inputWrap:{ flex:1, display:"flex", alignItems:"center", background:"rgba(255,255,255,0.07)", border:`1.5px solid ${T.border}`, borderRadius:12, padding:"0 14px", gap:8 },
textInput:{ flex:1, background:"none", border:"none", color:"#fff", fontFamily:"'Outfit',sans-serif", fontSize:13, outline:"none", padding:"13px 0" },
sendBtn:{ width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${T.green},#00B4D8)`, border:"none", cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 14px rgba(0,255,178,0.25)", transition:"all 0.2s", flexShrink:0 },
};

const info: Record<string,React.CSSProperties> = {
wrap: { flex:1, overflowY:"auto", padding:14, display:"flex", flexDirection:"column", gap:12, position:"relative", zIndex:1 },
card: { background:T.card, border:`1px solid ${T.border}`, borderRadius:18, padding:"20px 16px" },
avatar: { width:64, height:64, borderRadius:18, background:"rgba(0,255,178,0.1)", border:"2px solid rgba(0,255,178,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 12px" },
name: { color:"#fff", fontWeight:800, fontSize:22, textAlign:"center", letterSpacing:-0.5 },
roleText: { color:T.sub, fontSize:12, textAlign:"center", marginTop:4 },
divider: { height:1, background:T.border, margin:"16px 0" },
sectionLabel:{ color:T.green, fontSize:10, letterSpacing:2, fontWeight:700, marginBottom:12 },
langList: { display:"flex", flexDirection:"column", gap:10 },
langRow: { display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:"rgba(255,255,255,0.04)", borderRadius:12 },
primaryTag: { background:"rgba(0,255,178,0.15)", color:T.green, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20 },
understoodTag:{ background:"rgba(78,205,196,0.12)", color:T.teal, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20 },
ruleBox: { display:"flex", flexDirection:"column", gap:10 },
rule: { display:"flex", gap:10, alignItems:"flex-start" },
toneChip: { padding:"5px 12px", borderRadius:20, background:"rgba(255,255,255,0.06)", border:`1px solid ${T.border}`, color:T.sub, fontSize:12, display:"flex", alignItems:"center", gap:4 },
toneChipActive:{ background:"rgba(0,255,178,0.1)", borderColor:"rgba(0,255,178,0.3)", color:T.green },
memberCard: { background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:"16px 14px", display:"flex", gap:12, alignItems:"flex-start" },
memberAvatar:{ width:46, height:46, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 },
memberLang: { padding:"3px 9px", borderRadius:8, background:"rgba(255,255,255,0.06)", border:`1px solid ${T.border}`, color:"rgba(255,255,255,0.5)", fontSize:11, display:"flex", alignItems:"center" },
memberPrimary:{ background:"rgba(0,255,178,0.1)", borderColor:"rgba(0,255,178,0.3)", color:T.green },
};

const vr: Record<string,React.CSSProperties> = {
wrap: { display:"flex", flexDirection:"column", alignItems:"center", gap:14, padding:"4px 0" },
hint: { color:T.sub, fontSize:12, textAlign:"center" },
timer: { fontSize:32, fontWeight:800, color:"#FF6B6B", letterSpacing:1, fontVariantNumeric:"tabular-nums" },
micBtn: { width:72, height:72, borderRadius:"50%", background:`linear-gradient(135deg,${T.green},#00B4D8)`, border:"none", fontSize:30, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 28px rgba(0,255,178,0.35)", transition:"all 0.2s" },
cancelBtn: { background:"none", border:"none", color:T.sub, fontSize:13, cursor:"pointer", fontFamily:"'Outfit',sans-serif" },
waves: { display:"flex", gap:3, alignItems:"center", height:40 },
bar: { width:3, borderRadius:3, background:"#FF6B6B", animation:"waveAnim 0.5s ease-in-out infinite alternate", opacity:0.85 },
spinner: { width:40, height:40, border:"3px solid rgba(0,255,178,0.15)", borderTopColor:T.green, borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 12px" },
transcriptBox:{ background:"rgba(0,255,178,0.07)", border:"1px solid rgba(0,255,178,0.2)", borderRadius:12, padding:"12px 14px", width:"100%", boxSizing:"border-box" },
sendBtn: { flex:1, padding:"12px", background:`linear-gradient(135deg,${T.green},#00B4D8)`, color:"#080612", border:"none", borderRadius:12, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'Outfit',sans-serif" },
retryBtn: { width:44, height:44, background:"rgba(255,255,255,0.07)", border:`1px solid ${T.border}`, borderRadius:12, color:"#fff", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
};

const globalCss = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
* { box-sizing:border-box; margin:0; padding:0; }
::-webkit-scrollbar { width:3px; }
::-webkit-scrollbar-thumb { background:rgba(0,255,178,0.2); border-radius:4px; }
.card-in { animation: cardIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both; }
@keyframes cardIn { from{opacity:0;transform:scale(0.94) translateY(20px)} to{opacity:1;transform:none} }
.fade-in { animation: fadeIn 0.3s ease both; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
.bubble:hover { filter:brightness(1.06); }
.dots span { animation:dotBounce 1s infinite; display:inline-block; }
.dots span:nth-child(2){animation-delay:0.15s}
.dots span:nth-child(3){animation-delay:0.3s}
@keyframes dotBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
@keyframes waveAnim{from{transform:scaleY(0.2)}to{transform:scaleY(1)}}
@keyframes spin{to{transform:rotate(360deg)}}
input::placeholder { color:rgba(255,255,255,0.2); }
input:focus { border-color:rgba(0,255,178,0.4) !important; }
button:active { transform:scale(0.97); }
`;
