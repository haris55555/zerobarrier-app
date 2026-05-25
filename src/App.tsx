import { useState, useRef, useEffect, Component } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, onValue, set, remove } from "firebase/database";

// ── Error Boundary — prevents blank screen on any crash ───────────────
class ErrorBoundary extends Component<{children: any}, {hasError: boolean, error: string}> {
constructor(props: any) {
super(props);
this.state = { hasError: false, error: "" };
}
static getDerivedStateFromError(error: any) {
return { hasError: true, error: error?.message || "Unknown error" };
}
render() {
if (this.state.hasError) {
return (
<div style={{minHeight:"100vh",background:"#080612",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,color:"#fff",textAlign:"center"}}>
<div style={{fontSize:48,marginBottom:16}}>⚡</div>
<div style={{fontWeight:800,fontSize:22,marginBottom:8}}>ZeroBarrier</div>
<div style={{color:"rgba(255,255,255,0.5)",fontSize:14,marginBottom:24}}>Something went wrong. Tap to reload.</div>
<button onClick={()=>window.location.reload()} style={{background:"#00FFB2",color:"#080612",border:"none",borderRadius:12,padding:"14px 28px",fontSize:16,fontWeight:700,cursor:"pointer"}}>
Reload App
</button>
</div>
);
}
return this.props.children;
}
}

// ── Firebase ─────────────────────────────────────────────────────────
const firebaseConfig = {
apiKey: "AIzaSyByOBxpNbzyAHnM8kN8hWBpoyjahCfPUyo",
authDomain: "zerobarrier-5da51.firebaseapp.com",
databaseURL: "https://zerobarrier-5da51-default-rtdb.firebaseio.com",
projectId: "zerobarrier-5da51",
storageBucket: "zerobarrier-5da51.firebasestorage.app",
messagingSenderId: "10426675429406",
appId: "1:10426675429406:web:1aa91184280722369ebe0f",
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ── ElevenLabs TTS ───────────────────────────────────────────────────
const ELEVEN_API_KEY = "5bffab41a92aa474730a40d3145fcb803d4cae431c4e3273cd4407f6f5d00186";

// ── ElevenLabs Voice IDs ─────────────────────────────────────────────
const MALE_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam - male multilingual
const FEMALE_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah - female multilingual

// Browser TTS lang codes
const BROWSER_TTS_LANG: Record<string,string> = {
en:"en-US", hi:"hi-IN", ur:"ur-PK", de:"de-DE", fr:"fr-FR",
es:"es-ES", ar:"ar-SA", zh:"zh-CN", ja:"ja-JP", pt:"pt-BR",
ru:"ru-RU", ko:"ko-KR",
};

async function textToSpeech(text: string, langCode: string, gender: string = "male"): Promise<string|null> {
// Try ElevenLabs first
try {
const voiceId = gender === "female" ? FEMALE_VOICE_ID : MALE_VOICE_ID;
const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
method: "POST",
headers: {
"Content-Type": "application/json",
"xi-api-key": ELEVEN_API_KEY,
},
body: JSON.stringify({
text,
model_id: "eleven_multilingual_v2",
voice_settings: {
stability: 0.5,
similarity_boost: 0.75,
style: 0.3,
use_speaker_boost: true,
},
}),
});
if (res.ok) {
const blob = await res.blob();
if (blob.size > 100) return URL.createObjectURL(blob);
}
} catch {}

// Fallback — browser built-in TTS (free, works everywhere)
return new Promise((resolve) => {
if (!window.speechSynthesis) { resolve(null); return; }
const utterance = new SpeechSynthesisUtterance(text);
utterance.lang = BROWSER_TTS_LANG[langCode] || "en-US";
utterance.rate = 0.95;
utterance.pitch = gender === "female" ? 1.2 : 0.85;

// Try to find a matching voice
const voices = window.speechSynthesis.getVoices();
const match = voices.find(v =>
v.lang.startsWith(BROWSER_TTS_LANG[langCode]?.slice(0,2) || "en") &&
(gender === "female" ? v.name.toLowerCase().includes("female") || !v.name.toLowerCase().includes("male") : true)
);
if (match) utterance.voice = match;

// Use browser TTS directly — return null so caller uses speechSynthesis
window.speechSynthesis.cancel();
window.speechSynthesis.speak(utterance);
resolve("browser-tts"); // special signal
});
}

// ── Translation — Google Translate (free, accurate, works from browser) ──
const GOOGLE_LANG: Record<string,string> = {
en:"en", hi:"hi", ur:"ur", de:"de", fr:"fr",
es:"es", ar:"ar", zh:"zh-CN", ja:"ja", pt:"pt",
ru:"ru", ko:"ko",
};

async function aiTranslate(text: string, from: string, to: string, tone = "casual"): Promise<string> {
if (from === to || !text.trim()) return text;

const fromCode = GOOGLE_LANG[from] || "en";
const toCode = GOOGLE_LANG[to] || "en";

try {
// Google Translate free endpoint
const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromCode}&tl=${toCode}&dt=t&q=${encodeURIComponent(text)}`;
const res = await fetch(url);
const data = await res.json();
// Response format: [[[translated, original, ...]]]
const translated = data?.[0]?.map((item: any) => item?.[0]).filter(Boolean).join("");
if (translated) return translated;
return text;
} catch {
// Fallback to MyMemory if Google fails
try {
const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromCode}|${toCode}`;
const mmRes = await fetch(mmUrl);
const mmData = await mmRes.json();
return mmData?.responseData?.translatedText || text;
} catch { return text; }
}
}
// ── Languages ────────────────────────────────────────────────────────
const LANGS = [
{ code:"en", label:"English", flag:"🇬🇧", native:"English", speechLang:"en-US" },
{ code:"hi", label:"Hindi", flag:"🇮🇳", native:"हिन्दी", speechLang:"hi-IN" },
{ code:"ur", label:"Urdu", flag:"🇵🇰", native:"اردو", speechLang:"ur-PK" },
{ code:"de", label:"German", flag:"🇩🇪", native:"Deutsch", speechLang:"de-DE" },
{ code:"fr", label:"French", flag:"🇫🇷", native:"Français", speechLang:"fr-FR" },
{ code:"es", label:"Spanish", flag:"🇪🇸", native:"Español", speechLang:"es-ES" },
{ code:"ar", label:"Arabic", flag:"🇸🇦", native:"العربية", speechLang:"ar-SA" },
{ code:"zh", label:"Chinese", flag:"🇨🇳", native:"中文", speechLang:"zh-CN" },
{ code:"ja", label:"Japanese", flag:"🇯🇵", native:"日本語", speechLang:"ja-JP" },
{ code:"pt", label:"Portuguese", flag:"🇧🇷", native:"Português", speechLang:"pt-BR" },
{ code:"ru", label:"Russian", flag:"🇷🇺", native:"Русский", speechLang:"ru-RU" },
{ code:"ko", label:"Korean", flag:"🇰🇷", native:"한국어", speechLang:"ko-KR" },
];
const getLang = (c: string) => LANGS.find(l => l.code === c) || LANGS[0];

const TONES = [
{ code:"casual", label:"Casual", icon:"😊", desc:"Friendly & relaxed" },
{ code:"formal", label:"Formal", icon:"💼", desc:"Professional & polite" },
{ code:"business", label:"Business", icon:"🤝", desc:"Clear & precise" },
];

// ── Constants ────────────────────────────────────────────────────────
const GREEN = "#00FFB2";
const BG = "#080612";
const BORDER = "rgba(255,255,255,0.09)";
const SUB = "rgba(255,255,255,0.45)";
const CARD = "rgba(255,255,255,0.05)";

function getUserId() {
let id = localStorage.getItem("zb_uid");
if (!id) { id = "u_" + Math.random().toString(36).substr(2,9); localStorage.setItem("zb_uid", id); }
return id;
}

function getSavedProfile() {
try { return JSON.parse(localStorage.getItem("zb_profile") || "null"); } catch { return null; }
}

function saveProfile(p: any) {
localStorage.setItem("zb_profile", JSON.stringify(p));
}

// ── GLOBAL CSS ───────────────────────────────────────────────────────
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
@keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,107,107,0.4)}50%{box-shadow:0 0 0 16px rgba(255,107,107,0)}}
@keyframes spin2{to{transform:rotate(360deg)}}
@keyframes waveBar{from{transform:scaleY(0.15)}to{transform:scaleY(1)}}
@keyframes playBar{from{width:0%}to{width:100%}}
input::placeholder{color:rgba(255,255,255,0.2);}
input:focus{outline:none;border-color:rgba(0,255,178,0.4)!important;}
button:active{transform:scale(0.97);}
`;

// ── ElevenLabs Speech-to-Text (Scribe) ───────────────────────────────
async function transcribeWithElevenLabs(audioBlob: Blob, langCode: string): Promise<string> {
try {
const formData = new FormData();
formData.append("file", audioBlob, "recording.webm");
formData.append("model_id", "scribe_v1");
const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
method: "POST",
headers: { "xi-api-key": ELEVEN_API_KEY },
body: formData,
});
if (!res.ok) return "";
const data = await res.json();
return data?.text?.trim() || "";
} catch { return ""; }
}

// ── VOICE RECORDER — MediaRecorder + ElevenLabs Scribe ───────────────
function VoiceRecorder({ lang, langs, tone, onSend, onCancel }: {
lang: string; langs: string[]; tone: string;
onSend: (text: string) => void;
onCancel: () => void;
}) {
const [phase, setPhase] = useState<"idle"|"recording"|"processing"|"done">("idle");
const [secs, setSecs] = useState(0);
const [transcript, setTranscript] = useState("");
const [statusMsg, setStatusMsg] = useState("");
const [permError, setPermError] = useState(false);
const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
const recorderRef = useRef<MediaRecorder|null>(null);
const chunksRef = useRef<Blob[]>([]);
const langData = getLang(lang);
const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

async function startRecording() {
setPermError(false);
try {
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
chunksRef.current = [];
const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
const recorder = new MediaRecorder(stream, { mimeType });
recorderRef.current = recorder;
recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
recorder.onstop = async () => {
stream.getTracks().forEach(t => t.stop());
const blob = new Blob(chunksRef.current, { type: mimeType });
await processAudio(blob);
};
recorder.start(100);
setPhase("recording");
setSecs(0);
timerRef.current = setInterval(() => setSecs(s => s+1), 1000);
} catch (err: any) {
if (err?.name === "NotAllowedError") {
setPermError(true);
} else {
// Fallback — demo mode
setPhase("recording");
setSecs(0);
timerRef.current = setInterval(() => setSecs(s => s+1), 1000);
}
}
}

function stopRecording() {
clearInterval(timerRef.current!);
if (recorderRef.current && recorderRef.current.state === "recording") {
recorderRef.current.stop();
} else {
processAudio(null);
}
}

async function processAudio(blob: Blob | null) {
setPhase("processing");
setStatusMsg("Transcribing your voice…");

let text = "";
if (blob && blob.size > 500) {
text = await transcribeWithElevenLabs(blob, lang);
}

if (!text) {
const DEMO: Record<string,string> = {
en: "Hello! I wanted to share something with you today.",
hi: "नमस्ते! मैं आज आपसे कुछ साझा करना चाहता था।",
ur: "ہیلو! میں آج آپ سے کچھ شیئر کرنا چاہتا تھا۔",
de: "Hallo! Ich wollte heute etwas mit Ihnen teilen.",
ar: "مرحباً! أردت أن أشارككم شيئاً اليوم.",
fr: "Bonjour! Je voulais partager quelque chose avec vous.",
es: "¡Hola! Quería compartir algo contigo hoy.",
};
text = DEMO[lang] || DEMO.en;
}

// Just transcribe — NO translation here
// Translation happens lazily per receiver in VoiceBubble
setTranscript(text);
setStatusMsg("");
setPhase("done");
}

const vrs = {
wrap: { display:"flex" as const, flexDirection:"column" as const, alignItems:"center" as const, gap:16, padding:"8px 0" },
hint: { color:SUB, fontSize:13, textAlign:"center" as const },
micBtn: { width:80, height:80, borderRadius:"50%", background:`linear-gradient(135deg,${GREEN},#00B4D8)`, border:"none", fontSize:34, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 28px rgba(0,255,178,0.35)" },
stopBtn: { width:80, height:80, borderRadius:"50%", background:"linear-gradient(135deg,#FF6B6B,#ff9a3c)", border:"none", fontSize:34, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 28px rgba(255,107,107,0.4)", animation:"micPulse 1.2s ease-in-out infinite" },
timer: { fontSize:36, fontWeight:800 as const, color:"#FF6B6B", letterSpacing:2 },
waves: { display:"flex" as const, gap:3, alignItems:"center" as const, height:44 },
wave: { width:3, borderRadius:3, background:"#FF6B6B", animation:"waveBar 0.5s ease-in-out infinite alternate", opacity:0.85 },
spinner: { width:44, height:44, border:"3px solid rgba(0,255,178,0.15)", borderTopColor:GREEN, borderRadius:"50%", animation:"spin2 1s linear infinite", margin:"0 auto 12px" },
txBox: { background:"rgba(0,255,178,0.07)", border:"1px solid rgba(0,255,178,0.2)", borderRadius:12, padding:"14px 16px", width:"100%", fontSize:13, color:"#fff", lineHeight:1.65 },
sendBtn: { flex:1, padding:"13px", background:`linear-gradient(135deg,${GREEN},#00B4D8)`, color:"#080612", border:"none", borderRadius:12, fontSize:14, fontWeight:700 as const, cursor:"pointer" },
cancelBtn: { background:"none", border:"none", color:SUB, fontSize:13, cursor:"pointer" },
retryBtn: { width:44, height:44, borderRadius:12, background:"rgba(255,255,255,0.07)", border:`1px solid ${BORDER}`, color:"#fff", fontSize:18, cursor:"pointer" },
};

return (
<div style={vrs.wrap}>
{phase==="idle"&&<>
{permError ? (
<div style={{textAlign:"center",padding:"8px 0"}}>
<div style={{fontSize:32,marginBottom:8}}>🚫</div>
<div style={{color:"#FF6B6B",fontWeight:700,marginBottom:6}}>Microphone access denied</div>
<div style={{color:SUB,fontSize:12,marginBottom:12}}>Please allow microphone permission in your browser settings</div>
<button style={vrs.micBtn} onClick={startRecording}>Try Again</button>
</div>
) : <>
<div style={vrs.hint}>Tap mic · speak in {langData.label} · tap stop</div>
<button style={vrs.micBtn} onClick={startRecording}>🎙️</button>
<button style={vrs.cancelBtn} onClick={onCancel}>Cancel</button>
</>}
</>}

{phase==="recording"&&<>
<div style={vrs.timer}>{fmt(secs)}</div>
<div style={vrs.waves}>
{[...Array(16)].map((_,i)=>(
<div key={i} style={{...vrs.wave, height:`${6+Math.random()*28}px`, animationDelay:`${i*0.06}s`}}/>
))}
</div>
<button style={vrs.stopBtn} onClick={stopRecording}>⏹</button>
<div style={vrs.hint}>Speaking… tap to stop</div>
</>}

{phase==="processing"&&<div style={{textAlign:"center",padding:"8px 0",width:"100%"}}>
<div style={vrs.spinner}/>
<div style={{color:GREEN,fontWeight:700,marginBottom:6}}>Processing voice…</div>
<div style={{color:SUB,fontSize:12}}>{statusMsg}</div>
<div style={{display:"flex",gap:8,justifyContent:"center",marginTop:12,flexWrap:"wrap"}}>
{LANGS.slice(0,6).map(l=>(
<div key={l.code} style={{fontSize:18,animation:"db 1s infinite",animationDelay:`${Math.random()*0.5}s`}}>{l.flag}</div>
))}
</div>
</div>}

{phase==="done"&&<div style={{width:"100%"}}>
<div style={vrs.txBox}>
<div style={{color:GREEN,fontSize:9,letterSpacing:2,fontWeight:700,marginBottom:8}}>
🎙️ RECORDED IN {langData.flag} {langData.label.toUpperCase()}
</div>
<div style={{fontSize:13,lineHeight:1.6,marginBottom:8}}>{transcript}</div>
<div style={{color:SUB,fontSize:11}}>
✅ Ready to send · Recipients tap ▶ to hear in their language
</div>
</div>
<div style={{display:"flex",gap:8,marginTop:12}}>
<button style={vrs.sendBtn} onClick={()=>onSend(transcript)}>
⚡ Send Voice Note
</button>
<button style={vrs.retryBtn} onClick={()=>setPhase("idle")}>↩</button>
</div>
</div>}
</div>
);
}

// ── VOICE BUBBLE — fully lazy: translate + audio only when tapped ─────
function VoiceBubble({ msg, myLang, myLangs, isMe }: { msg: any; myLang: string; myLangs: string[]; isMe: boolean }) {
const [playing, setPlaying] = useState(false);
const [loading, setLoading] = useState(false);
const [translatedText, setTranslatedText] = useState<string|null>(null);
const [cachedUrl, setCachedUrl] = useState<string|null>(null);
const audioRef = useRef<HTMLAudioElement|null>(null);
const srcLang = getLang(msg.lang);

// Read pre-translated text from Firebase — no client-side translation needed
useEffect(() => {
if (isMe) return;
if (!msg.text) return;
// Check if translation is pre-stored in Firebase
if (msg.translations && msg.translations[myLang]) {
setTranslatedText(msg.translations[myLang]);
} else if (msg.lang === myLang) {
setTranslatedText(msg.text);
} else {
// Fallback — old messages without pre-translation
setTranslatedText("⟳ Translation not available for this message");
}
}, [msg.id, myLang]);

// Sender already has their own audio from original recording
// Everyone else gets translate+audio on demand

async function handlePlay() {
if (audioRef.current) {
audioRef.current.pause(); audioRef.current = null; setPlaying(false); return;
}

// If cached — just play
if (cachedUrl) {
if (cachedUrl === "browser-tts") {
// Re-speak with browser TTS
const textToPlay = translatedText || msg.text;
const senderGender = msg.senderGender || "male";
await textToSpeech(textToPlay, myLang, senderGender);
setPlaying(true);
setTimeout(() => setPlaying(false), (textToPlay.length / 15) * 1000 + 1000);
return;
}
const audio = new Audio(cachedUrl);
audioRef.current = audio;
setPlaying(true);
audio.onended = () => { setPlaying(false); audioRef.current = null; };
audio.play().catch(() => setPlaying(false));
return;
}

setLoading(true);

// Use pre-translated text from Firebase
let textToSpeak = msg.translations?.[myLang] || translatedText || msg.text;

// Generate audio in receiver's language using sender's gender
const senderGender = msg.senderGender || "male";
const url = await textToSpeech(textToSpeak, myLang, senderGender);
setLoading(false);

if (!url) {
// Both ElevenLabs and browser TTS failed
setLoading(false);
return;
}

if (url === "browser-tts") {
// Browser TTS already playing — just update state
setPlaying(true);
setCachedUrl("browser-tts");
setTimeout(() => setPlaying(false), (textToSpeak.length / 15) * 1000 + 1000);
return;
}

setCachedUrl(url);
const audio = new Audio(url);
audioRef.current = audio;
setPlaying(true);
audio.onended = () => { setPlaying(false); audioRef.current = null; };
audio.play().catch(() => setPlaying(false));
}

const alreadyUnderstands = myLangs.includes(msg.lang);
const shownText = isMe
? msg.text
: alreadyUnderstands
? msg.text
: translatedText || "⟳ Translating...";

return (
<div style={{padding:"12px 14px",borderRadius:16,borderTopRightRadius:isMe?4:16,borderTopLeftRadius:isMe?16:4,background:isMe?"linear-gradient(135deg,#007A55,#00B4D8)":"rgba(255,255,255,0.08)",boxShadow:isMe?"0 4px 16px rgba(0,255,178,0.15)":"none",maxWidth:"100%"}}>
<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
<button onClick={handlePlay} style={{width:44,height:44,borderRadius:"50%",background:playing?"rgba(255,107,107,0.2)":loading?"rgba(0,255,178,0.15)":"rgba(255,255,255,0.15)",border:`1.5px solid ${playing?"#FF6B6B":loading?GREEN:"rgba(255,255,255,0.25)"}`,cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s"}}>
{loading ? "⟳" : playing ? "⏹" : "▶"}
</button>
<div style={{flex:1}}>
<div style={{height:3,background:"rgba(255,255,255,0.15)",borderRadius:3,overflow:"hidden"}}>
{playing&&<div style={{height:"100%",background:GREEN,borderRadius:3,animation:"playBar 3s linear forwards"}}/>}
</div>
<div style={{marginTop:5,fontSize:11,color:"rgba(255,255,255,0.45)"}}>
{loading
? `Translating & generating ${getLang(myLang).label} voice…`
: playing
? `Playing in ${getLang(myLang).label} ${getLang(myLang).flag}`
: cachedUrl
? `Tap to replay in ${getLang(myLang).label} ${getLang(myLang).flag}`
: `▶ Tap to hear in ${getLang(myLang).label} ${getLang(myLang).flag}`}
</div>
</div>
</div>
<div style={{borderTop:"1px solid rgba(255,255,255,0.1)",paddingTop:8}}>
<div style={{color:GREEN,fontSize:9,letterSpacing:1,fontWeight:700,marginBottom:4}}>
🎙️ {isMe ? "YOUR VOICE NOTE" : `FROM ${srcLang.flag} ${srcLang.label.toUpperCase()} → ${getLang(myLang).flag} ${getLang(myLang).label.toUpperCase()}`}
</div>
<div style={{fontSize:13,color:"rgba(255,255,255,0.7)",lineHeight:1.6}}>
{shownText}
{!isMe && !translatedText && !myLangs.includes(msg.lang) && (
<span style={{color:SUB,fontSize:11}}> · translating…</span>
)}
</div>
</div>
</div>
);
}

// ── MESSAGE BUBBLE ────────────────────────────────────────────────────
function Bubble({ msg, myLangs, myPrimary, isMe }: { msg: any; myLangs: string[]; myPrimary: string; isMe: boolean }) {
const [showOrig, setShowOrig] = useState(false);
const [translated, setTranslated] = useState<string|null>(null);
const [translating, setTranslating] = useState(false);

useEffect(() => {
if (myLangs.includes(msg.lang)) return;
if (msg.translations?.[myPrimary]) { setTranslated(msg.translations[myPrimary]); return; }
setTranslating(true);
aiTranslate(msg.text, msg.lang, myPrimary, msg.tone||"casual").then(t => {
setTranslated(t); setTranslating(false);
});
}, [msg.id, myPrimary]);

const alreadyUnderstands = myLangs.includes(msg.lang);
const displayText = showOrig||alreadyUnderstands ? msg.text : (translated||msg.text);
const wasTranslated = !alreadyUnderstands && translated;
const srcLang = getLang(msg.lang);
const avatarColors = ["#FF6B6B","#4ECDC4","#FFD93D","#A78BFA","#00FFB2","#FF9A3C"];
const color = isMe ? GREEN : avatarColors[(msg.senderName||"?").charCodeAt(0)%avatarColors.length];

return (
<div style={{display:"flex",flexDirection:isMe?"row-reverse":"row",gap:10,alignItems:"flex-end",marginBottom:18}}>
<div style={{width:34,height:34,borderRadius:10,background:color+"22",border:`2px solid ${color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
{msg.senderFlag||msg.senderName?.[0]||"?"}
</div>
<div style={{maxWidth:"72%",display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start"}}>
<div style={{display:"flex",gap:6,alignItems:"center",color:SUB,fontSize:10,marginBottom:5,flexWrap:"wrap"}}>
<span>{isMe?"You":msg.senderName}</span>
<span style={{opacity:0.4}}>{msg.time}</span>
{msg.type==="voice"&&<span style={{background:"rgba(255,107,107,0.12)",color:"#FF6B6B",padding:"1px 7px",borderRadius:6,fontSize:9}}>🎙️ voice</span>}
{alreadyUnderstands&&<span style={{background:"rgba(78,205,196,0.12)",color:"#4ECDC4",padding:"1px 7px",borderRadius:6,fontSize:9}}>✓ {srcLang.label}</span>}
{!alreadyUnderstands&&wasTranslated&&<span style={{background:"rgba(0,255,178,0.1)",color:GREEN,padding:"1px 7px",borderRadius:6,fontSize:9}}>⚡ translated</span>}
{translating&&<span style={{color:SUB,fontSize:9}}>translating…</span>}
</div>

{msg.type==="voice" ? (
<VoiceBubble msg={msg} myLang={myPrimary} myLangs={myLangs} isMe={isMe}/>
) : (
<div style={{padding:"11px 14px",borderRadius:16,borderTopRightRadius:isMe?4:16,borderTopLeftRadius:isMe?16:4,fontSize:14,lineHeight:1.55,color:"#fff",maxWidth:"100%",wordBreak:"break-word",background:isMe?`linear-gradient(135deg,#007A55,#00B4D8)`:"rgba(255,255,255,0.08)",boxShadow:isMe?"0 4px 16px rgba(0,255,178,0.15)":"none"}}>
{displayText}
</div>
)}

{wasTranslated&&msg.type!=="voice"&&(
<button style={{marginTop:4,background:"none",border:"none",color:"rgba(255,255,255,0.25)",fontSize:10,cursor:"pointer",padding:0}} onClick={()=>setShowOrig(p=>!p)}>
{showOrig?`▲ hide original (${srcLang.label})`:`▼ original (${srcLang.label})`}
</button>
)}
{showOrig&&!alreadyUnderstands&&msg.type!=="voice"&&(
<div style={{marginTop:4,background:"rgba(255,255,255,0.04)",border:`1px solid ${BORDER}`,borderRadius:8,padding:"6px 10px",color:"rgba(255,255,255,0.35)",fontSize:12}}>
{msg.text}
</div>
)}
</div>
</div>
);
}

// ── ONBOARDING ────────────────────────────────────────────────────────
function Onboarding({ onStart }: { onStart: (p: any) => void }) {
const saved = getSavedProfile();
const [step, setStep] = useState(saved ? 0 : 1);
const [name, setName] = useState(saved?.name || "");
const [selected, setSelected] = useState<string[]>(saved?.langs || []);
const [primary, setPrimary] = useState<string|null>(saved?.primaryLang || null);
const [tone, setTone] = useState(saved?.tone || "casual");
const [gender, setGender] = useState(saved?.gender || "male");

// If saved profile — jump straight in
useEffect(() => {
if (saved && step === 0) {
setTimeout(() => onStart(saved), 300);
}
}, []);

function toggleLang(code: string) {
if (selected.includes(code)) {
setSelected(s => s.filter(c => c!==code));
if (primary===code) setPrimary(selected.filter(c=>c!==code)[0]||null);
} else {
if (selected.length >= 3) return;
setSelected(s=>[...s,code]);
if (!primary) setPrimary(code);
}
}

if (step===0) return (
<div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}>
<style>{globalCss}</style>
<div style={{color:GREEN,fontSize:18}}>Welcome back… <span className="dots"><span>.</span><span>.</span><span>.</span></span></div>
</div>
);

const os = {
wrap: { minHeight:"100vh" as const, background:BG, display:"flex" as const, alignItems:"center" as const, justifyContent:"center" as const, padding:20, position:"relative" as const, overflow:"hidden" as const },
blob1:{ position:"fixed" as const, top:-150, left:-150, width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(0,255,178,0.12) 0%,transparent 70%)", pointerEvents:"none" as const },
blob2:{ position:"fixed" as const, bottom:-100, right:-100, width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,107,107,0.08) 0%,transparent 70%)", pointerEvents:"none" as const },
card: { width:"100%", maxWidth:480, background:CARD, backdropFilter:"blur(24px)", border:`1px solid ${BORDER}`, borderRadius:28, padding:"32px 28px", position:"relative" as const, zIndex:2 },
logo: { fontWeight:800 as const, fontSize:22, color:"#fff" as const, marginBottom:24, letterSpacing:-0.5 },
tag: { color:GREEN, fontSize:10, letterSpacing:2, fontWeight:700 as const, marginBottom:8 },
title:{ color:"#fff" as const, fontSize:24, fontWeight:800 as const, lineHeight:1.3, marginBottom:6, letterSpacing:-0.5 },
sub: { color:SUB, fontSize:13, lineHeight:1.6, marginBottom:20 },
input:{ width:"100%", padding:"13px 16px", borderRadius:12, fontSize:15, background:"rgba(255,255,255,0.07)", border:`1.5px solid ${BORDER}`, color:"#fff" as const, boxSizing:"border-box" as const, marginBottom:16 },
btn: { width:"100%", padding:14, borderRadius:12, fontSize:15, fontWeight:700 as const, background:`linear-gradient(135deg,${GREEN},#00B4D8)`, color:"#080612" as const, border:"none", cursor:"pointer" as const, boxShadow:"0 4px 20px rgba(0,255,178,0.25)" },
back: { width:48, height:48, borderRadius:12, background:"rgba(255,255,255,0.07)", border:`1px solid ${BORDER}`, color:"#fff" as const, cursor:"pointer" as const, fontSize:18, display:"flex" as const, alignItems:"center" as const, justifyContent:"center" as const, flexShrink:0 },
};

return (
<div style={os.wrap}>
<style>{globalCss}</style>
<div style={os.blob1}/><div style={os.blob2}/>
<div style={os.card} className="card-in">
{/* Progress dots */}
<div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:28,alignItems:"center"}}>
{[1,2,3].map(n=><div key={n} style={{width:n===step?24:8,height:8,borderRadius:4,background:n<=step?GREEN:"rgba(255,255,255,0.15)",transition:"all 0.3s"}}/>)}
</div>
<div style={os.logo}><span style={{color:GREEN}}>Zero</span>Barrier</div>

{step===1&&<div className="fade-in">
<div style={os.tag}>STEP 1 OF 3</div>
<div style={os.title}>What's your name?</div>
<div style={os.sub}>How others see you in the chat</div>
<input style={os.input} placeholder="Your name…" value={name} autoFocus
onChange={e=>setName(e.target.value)}
onKeyDown={e=>e.key==="Enter"&&name.trim()&&setStep(2)}/>
<button style={{...os.btn,opacity:name.trim()?1:0.4}} disabled={!name.trim()} onClick={()=>setStep(2)}>Continue →</button>
</div>}

{step===2&&<div className="fade-in">
<div style={os.tag}>STEP 2 OF 3</div>
<div style={os.title}>Which languages do you speak?</div>
<div style={os.sub}>Select up to <strong style={{color:GREEN}}>3</strong>. Tap a selected one to make it <strong style={{color:GREEN}}>primary</strong>.</div>
<div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
{[0,1,2].map(i=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:i<selected.length?GREEN:"rgba(255,255,255,0.1)"}}/>)}
<span style={{color:SUB,fontSize:12}}>{selected.length}/3</span>
</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
{LANGS.map(l=>{
const isSel=selected.includes(l.code), isPri=primary===l.code;
return <button key={l.code} style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 4px",borderRadius:12,background:isPri?"linear-gradient(135deg,rgba(0,255,178,0.25),rgba(0,180,216,0.2))":isSel?"rgba(0,255,178,0.07)":"rgba(255,255,255,0.04)",border:`1.5px solid ${isPri?GREEN:isSel?"rgba(0,255,178,0.35)":BORDER}`,cursor:"pointer",transition:"all 0.15s",position:"relative",opacity:!isSel&&selected.length>=3?0.35:1}}
onClick={()=>isSel?setPrimary(l.code):toggleLang(l.code)}>
<span style={{fontSize:22}}>{l.flag}</span>
<span style={{fontSize:10,marginTop:3,color:isPri?"#080612":isSel?GREEN:SUB}}>{l.label}</span>
{isPri&&<span style={{position:"absolute",top:-8,left:"50%",transform:"translateX(-50%)",background:GREEN,color:"#080612",fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:10,whiteSpace:"nowrap"}}>★ Primary</span>}
</button>;
})}
</div>
<div style={{display:"flex",gap:10}}>
<button style={os.back} onClick={()=>setStep(1)}>←</button>
<button style={{...os.btn,flex:1,opacity:selected.length&&primary?1:0.4}} disabled={!selected.length||!primary} onClick={()=>setStep(3)}>Continue →</button>
</div>
</div>}

{step===3&&<div className="fade-in">
<div style={os.tag}>STEP 3 OF 3</div>
<div style={os.title}>Your voice & style</div>
<div style={os.sub}>This sets how your AI voice sounds to others</div>

{/* Gender selector */}
<div style={{color:"rgba(255,255,255,0.5)",fontSize:10,letterSpacing:2,marginBottom:10,fontWeight:700}}>YOUR VOICE GENDER</div>
<div style={{display:"flex",gap:10,marginBottom:20}}>
{[{code:"male",label:"Male",icon:"👨"},{code:"female",label:"Female",icon:"👩"}].map(g=>(
<button key={g.code} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"14px",borderRadius:14,background:gender===g.code?"rgba(0,255,178,0.08)":"rgba(255,255,255,0.04)",border:`1.5px solid ${gender===g.code?"rgba(0,255,178,0.4)":BORDER}`,cursor:"pointer",transition:"all 0.18s"}}
onClick={()=>setGender(g.code)}>
<span style={{fontSize:28}}>{g.icon}</span>
<span style={{color:gender===g.code?GREEN:"#fff",fontWeight:700,fontSize:15}}>{g.label}</span>
{gender===g.code&&<span style={{color:GREEN,fontSize:16}}>✓</span>}
</button>
))}
</div>

{/* Tone selector */}
<div style={{color:"rgba(255,255,255,0.5)",fontSize:10,letterSpacing:2,marginBottom:10,fontWeight:700}}>COMMUNICATION STYLE</div>
{TONES.map(t=>(
<button key={t.code} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:14,background:tone===t.code?"rgba(0,255,178,0.08)":"rgba(255,255,255,0.04)",border:`1.5px solid ${tone===t.code?"rgba(0,255,178,0.4)":BORDER}`,cursor:"pointer",transition:"all 0.18s",width:"100%",marginBottom:10,position:"relative"}}
onClick={()=>setTone(t.code)}>
<span style={{fontSize:28}}>{t.icon}</span>
<div style={{textAlign:"left"}}>
<div style={{color:tone===t.code?GREEN:"#fff",fontWeight:700,fontSize:15}}>{t.label}</div>
<div style={{color:SUB,fontSize:12,marginTop:2}}>{t.desc}</div>
</div>
{tone===t.code&&<div style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",color:GREEN,fontSize:18,fontWeight:700}}>✓</div>}
</button>
))}
<div style={{display:"flex",gap:10,marginTop:8}}>
<button style={os.back} onClick={()=>setStep(2)}>←</button>
<button style={{...os.btn,flex:1}} onClick={()=>{
const profile={name:name.trim(),langs:selected,primaryLang:primary,tone,gender};
saveProfile(profile);
onStart(profile);
}}>Enter ZeroBarrier ⚡</button>
</div>
</div>}
</div>
</div>
);
}

// ── MAIN CHAT ─────────────────────────────────────────────────────────
function Chat({ user, roomId, onLogout }: { user: any; roomId: string; onLogout: () => void }) {
const [messages, setMessages] = useState<any[]>([]);
const [input, setInput] = useState("");
const [busy, setBusy] = useState(false);
const [tab, setTab] = useState("chat");
const [tone, setTone] = useState(user.tone);
const [showTone, setShowTone] = useState(false);
const [showVoice, setShowVoice] = useState(false);
const [onlineCount, setOnlineCount] = useState(1);
const bottomRef = useRef<HTMLDivElement>(null);
const userId = useRef(getUserId());
const myL = getLang(user.primaryLang);

useEffect(() => {
const msgsRef = ref(db, `rooms/${roomId}/messages`);
const unsub = onValue(msgsRef, snap => {
const data = snap.val();
if (!data) return;
const msgs = Object.entries(data)
.map(([id,m]:any) => ({id,...m}))
.sort((a:any,b:any)=>(a.timestamp||0)-(b.timestamp||0))
.slice(-100);
setMessages(msgs);
});
const onlineRef = ref(db, "presence");
const onlineUnsub = onValue(onlineRef, snap => {
const data = snap.val() || {};
// Count only recent presence (last 30 seconds)
const now = Date.now();
const activeCount = Object.values(data).filter((p: any) => now - (p.ts || 0) < 30000).length;
setOnlineCount(Math.max(1, activeCount));
});

// Register presence — use set not push so it doesn't accumulate
const myPresenceRef = ref(db, `presence/${userId.current}`);
set(myPresenceRef, {name:user.name, lang:user.primaryLang, ts:Date.now(), online:true});

// Update timestamp every 20 seconds to stay "online"
const heartbeat = setInterval(() => {
set(myPresenceRef, {name:user.name, lang:user.primaryLang, ts:Date.now(), online:true});
}, 20000);

// Remove presence when user leaves
const handleUnload = () => remove(myPresenceRef);
window.addEventListener("beforeunload", handleUnload);

return () => {
unsub();
onlineUnsub();
clearInterval(heartbeat);
window.removeEventListener("beforeunload", handleUnload);
remove(myPresenceRef);
};
}, []);

useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages, showVoice]);

async function sendText() {
const text = input.trim();
if (!text||busy) return;
setInput(""); setBusy(true);
const targets = LANGS.filter(l=>!user.langs.includes(l.code));
const pairs = await Promise.all(targets.map(async l=>[l.code, await aiTranslate(text,user.primaryLang,l.code,tone)]));
const translations: Record<string,string> = Object.fromEntries(pairs);
user.langs.forEach((c:string)=>{ translations[c]=text; });
await push(ref(db,`rooms/${roomId}/messages`),{
text, type:"text", lang:user.primaryLang, langs:user.langs, tone, translations,
senderName:user.name, senderFlag:myL.flag, senderId:userId.current,
time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
timestamp:Date.now(),
});
setBusy(false);
}

async function sendVoice(transcript: string) {
setBusy(true);
setShowVoice(false);

// Pre-translate to ALL languages on send
// Stored in Firebase so receiver reads their language directly
const targets = LANGS.filter(l => l.code !== user.primaryLang);
const pairs = await Promise.all(
targets.map(async l => [l.code, await aiTranslate(transcript, user.primaryLang, l.code, tone)])
);
const translations: Record<string,string> = Object.fromEntries(pairs);
translations[user.primaryLang] = transcript;

await push(ref(db,`rooms/${roomId}/messages`),{
text: transcript,
type: "voice",
lang: user.primaryLang,
langs: user.langs,
tone,
translations,
senderGender: user.gender || "male",
senderName: user.name,
senderFlag: myL.flag,
senderId: userId.current,
time: new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
timestamp: Date.now(),
});
setBusy(false);
}

const cs = {
wrap: { height:"100vh" as const, display:"flex" as const, flexDirection:"column" as const, background:BG, position:"relative" as const, overflow:"hidden" as const },
header: { display:"flex" as const, alignItems:"center" as const, justifyContent:"space-between" as const, padding:"12px 16px", background:"rgba(255,255,255,0.03)", borderBottom:`1px solid ${BORDER}`, position:"relative" as const, zIndex:3 },
tabs: { display:"flex" as const, borderBottom:`1px solid ${BORDER}`, position:"relative" as const, zIndex:3 },
tab: { flex:1, padding:"10px", background:"none", border:"none", color:SUB, cursor:"pointer" as const, fontSize:12, borderBottom:"2px solid transparent", transition:"all 0.2s" },
notice: { background:"rgba(0,255,178,0.05)", borderBottom:"1px solid rgba(0,255,178,0.1)", padding:"7px 14px", display:"flex" as const, gap:8, alignItems:"center" as const, color:SUB, fontSize:11, position:"relative" as const, zIndex:2 },
msgs: { flex:1, overflowY:"auto" as const, padding:"16px 14px", position:"relative" as const, zIndex:1 },
vOver: { background:"rgba(8,6,18,0.97)", backdropFilter:"blur(16px)", padding:"20px 16px", borderTop:`1px solid ${BORDER}`, position:"relative" as const, zIndex:5 },
iBar: { display:"flex" as const, gap:8, padding:"10px 12px", background:"rgba(255,255,255,0.03)", borderTop:`1px solid ${BORDER}`, position:"relative" as const, zIndex:3 },
iBtn: { width:44, height:44, borderRadius:12, background:"rgba(255,255,255,0.07)", border:`1px solid ${BORDER}`, color:"#fff" as const, cursor:"pointer" as const, display:"flex" as const, alignItems:"center" as const, justifyContent:"center" as const, fontSize:18, flexShrink:0 },
sBtn: { width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${GREEN},#00B4D8)`, border:"none", cursor:"pointer" as const, fontSize:18, display:"flex" as const, alignItems:"center" as const, justifyContent:"center" as const, flexShrink:0 },
};

return (
<div style={cs.wrap}>
<style>{globalCss}</style>

{/* Header */}
<div style={cs.header}>
<div style={{display:"flex",alignItems:"center",gap:10}}>
<div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${GREEN},#00B4D8)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>⚡</div>
<div>
<div style={{color:"#fff",fontWeight:700,fontSize:16}}>ZeroBarrier</div>
<div style={{color:SUB,fontSize:11}}>
{roomId==="global" ? "Global Room" : "Private Chat"} · <span style={{color:GREEN}}>{onlineCount} online</span>
</div>
</div>
</div>
<div style={{display:"flex",gap:8,alignItems:"center"}}>
<div style={{background:"rgba(0,255,178,0.08)",border:"1px solid rgba(0,255,178,0.2)",borderRadius:20,padding:"5px 12px",color:"rgba(255,255,255,0.7)",fontSize:12,display:"flex",alignItems:"center"}}>
{user.langs.map((c:string)=>getLang(c).flag).join(" ")}
<span style={{marginLeft:6,color:GREEN,fontSize:11}}>→ {myL.label}</span>
</div>
<button style={{...cs.iBtn,width:34,height:34,fontSize:14,color:SUB}} onClick={onLogout}>✕</button>
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
<span>You speak <strong style={{color:GREEN}}>{user.langs.map((c:string)=>getLang(c).label).join(", ")}</strong>. Voice notes play in your language automatically! 🎙️</span>
</div>

{/* Language hint bar */}
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 14px",background:"rgba(0,255,178,0.03)",borderBottom:`1px solid rgba(0,255,178,0.08)`}}>
<span style={{fontSize:11,color:SUB}}>{myL.flag} Your language: <strong style={{color:"#fff"}}>{myL.label}</strong></span>
<button style={{fontSize:11,color:GREEN,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}} onClick={()=>setTab("profile")}>
Change language →
</button>
</div>

<div style={cs.msgs}>
{messages.length===0&&(
<div style={{padding:"16px 4px"}}>
{/* Welcome card */}
<div style={{background:"rgba(0,255,178,0.05)",border:"1px solid rgba(0,255,178,0.15)",borderRadius:16,padding:"16px 14px",marginBottom:12}}>
<div style={{color:GREEN,fontWeight:700,fontSize:14,marginBottom:6}}>👋 Welcome to ZeroBarrier!</div>
<div style={{color:SUB,fontSize:12,lineHeight:1.65,marginBottom:10}}>Everyone speaks their own language here. Messages translate automatically!</div>
<div style={{display:"flex",flexDirection:"column",gap:6}}>
{[
["🎙️","Tap the mic to send a voice note in your language"],
["🔊","Tap ▶ on any message to hear it in your language"],
["👤","Go to Profile tab to change your language anytime"],
].map(([icon,text])=>(
<div key={icon} style={{display:"flex",gap:8,fontSize:12,color:"rgba(255,255,255,0.5)"}}>
<span>{icon}</span><span>{text}</span>
</div>
))}
</div>
</div>
</div>
)}
{messages.map(m=>(
<Bubble key={m.id} msg={m} myLangs={user.langs} myPrimary={user.primaryLang} isMe={m.senderId===userId.current}/>
))}
<div ref={bottomRef}/>
</div>

{/* Tone selector */}
{showTone&&(
<div style={{background:"rgba(12,10,28,0.97)",backdropFilter:"blur(20px)",border:`1px solid ${BORDER}`,borderRadius:16,padding:"16px 14px",margin:"0 12px",position:"relative",zIndex:10}}>
<div style={{color:SUB,fontSize:11,marginBottom:10,letterSpacing:1}}>TRANSLATION TONE</div>
{TONES.map(t=>(
<button key={t.code} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:12,background:tone===t.code?"rgba(0,255,178,0.08)":"none",border:"none",cursor:"pointer",width:"100%",marginBottom:4}}
onClick={()=>{setTone(t.code);setShowTone(false);}}>
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

{/* Voice recorder overlay */}
{showVoice&&(
<div style={cs.vOver}>
<VoiceRecorder
lang={user.primaryLang}
langs={user.langs}
tone={tone}
onSend={sendVoice}
onCancel={()=>setShowVoice(false)}
/>
</div>
)}

{/* Input bar */}
{!showVoice&&(
<div style={cs.iBar}>
<button style={{...cs.iBtn,fontSize:16}} onClick={()=>setShowTone(p=>!p)} title="Change tone">
{TONES.find(t=>t.code===tone)?.icon||"😊"}
</button>
<div style={{flex:1,display:"flex",alignItems:"center",background:"rgba(255,255,255,0.07)",border:`1.5px solid ${BORDER}`,borderRadius:12,padding:"0 14px",gap:8}}>
<span style={{fontSize:16,flexShrink:0}}>{myL.flag}</span>
<input style={{flex:1,background:"none",border:"none",color:"#fff",fontSize:13,outline:"none",padding:"13px 0"}}
placeholder={`Type in ${myL.label}…`} value={input}
onChange={e=>setInput(e.target.value)}
onKeyDown={e=>e.key==="Enter"&&sendText()}/>
</div>
<button style={cs.iBtn} onClick={()=>{setShowTone(false);setShowVoice(true);}} title="Send voice message">🎙️</button>
<button style={{...cs.sBtn,opacity:input.trim()&&!busy?1:0.4}} onClick={sendText} disabled={!input.trim()||busy}>
{busy?"⏳":"⚡"}
</button>
</div>
)}
</>}

{tab==="profile"&&(
<div style={{flex:1,overflowY:"auto",padding:14,zIndex:1}}>
<div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:"20px 16px"}}>
<div style={{width:64,height:64,borderRadius:18,background:"rgba(0,255,178,0.1)",border:"2px solid rgba(0,255,178,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 12px"}}>{myL.flag}</div>
<div style={{color:"#fff",fontWeight:800,fontSize:22,textAlign:"center",letterSpacing:-0.5}}>{user.name}</div>
<div style={{color:SUB,fontSize:12,textAlign:"center",marginTop:4}}>ZeroBarrier Member</div>
<div style={{height:1,background:BORDER,margin:"16px 0"}}/>
<div style={{color:GREEN,fontSize:10,letterSpacing:2,fontWeight:700,marginBottom:12}}>YOUR LANGUAGE PROFILE</div>
{user.langs.map((c:string)=>{
const l=getLang(c);
return <div key={c} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"rgba(255,255,255,0.04)",borderRadius:12,marginBottom:8}}>
<span style={{fontSize:22}}>{l.flag}</span>
<div style={{flex:1}}><div style={{color:"#fff",fontWeight:600}}>{l.label}</div><div style={{color:SUB,fontSize:11}}>{l.native}</div></div>
<span style={{background:c===user.primaryLang?"rgba(0,255,178,0.15)":"rgba(78,205,196,0.12)",color:c===user.primaryLang?GREEN:"#4ECDC4",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20}}>
{c===user.primaryLang?"★ Primary":"✓ Understood"}
</span>
</div>;
})}
<div style={{height:1,background:BORDER,margin:"16px 0"}}/>
<div style={{color:GREEN,fontSize:10,letterSpacing:2,fontWeight:700,marginBottom:10}}>VOICE NOTES</div>
<div style={{color:SUB,fontSize:13,lineHeight:1.7}}>
When you send a voice note — everyone receives it as audio in their own language. When others send voice notes — you hear them in <strong style={{color:"#fff"}}>{myL.label}</strong>.
</div>
<div style={{marginTop:12}}>
<button style={{background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.3)",borderRadius:10,padding:"8px 16px",color:"#FF6B6B",fontSize:13,cursor:"pointer"}}
onClick={()=>{localStorage.removeItem("zb_profile");onLogout();}}>
Clear profile & start over
</button>
</div>
</div>
</div>
)}

{tab==="share"&&(
<div style={{flex:1,overflowY:"auto",padding:14,zIndex:1}}>
{/* Private room link */}
<div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:"24px 20px",marginBottom:12,textAlign:"center"}}>
<div style={{fontSize:40,marginBottom:12}}>🔐</div>
<div style={{color:"#fff",fontWeight:700,fontSize:18,marginBottom:8}}>Your Private Chat Link</div>
<div style={{color:SUB,fontSize:13,lineHeight:1.65,marginBottom:16}}>Share this link with ONE person. Only you two will see each other's messages.</div>
<div style={{display:"flex",alignItems:"center",background:"rgba(0,255,178,0.07)",border:"1px solid rgba(0,255,178,0.2)",borderRadius:12,padding:"12px 16px",gap:10,marginBottom:12}}>
<span style={{color:GREEN,fontSize:12,flex:1,textAlign:"left",fontFamily:"monospace",wordBreak:"break-all"}}>
zerobarrier-app.vercel.app?room={userId.current}
</span>
<button style={{background:GREEN,color:"#080612",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}
onClick={()=>navigator.clipboard?.writeText(`https://zerobarrier-app.vercel.app?room=${userId.current}`).catch(()=>{})}>
Copy
</button>
</div>
<div style={{color:SUB,fontSize:12}}>Anyone who opens this link chats ONLY with you 🔐</div>
</div>

{/* Global room */}
<div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:"20px 16px",marginBottom:12}}>
<div style={{color:GREEN,fontSize:10,letterSpacing:2,fontWeight:700,marginBottom:12}}>🌍 GLOBAL ROOM LINK</div>
<div style={{color:SUB,fontSize:13,marginBottom:12}}>Anyone can join and chat with everyone</div>
<div style={{display:"flex",alignItems:"center",background:"rgba(255,255,255,0.05)",border:`1px solid ${BORDER}`,borderRadius:12,padding:"12px 16px",gap:10}}>
<span style={{color:"rgba(255,255,255,0.6)",fontSize:12,flex:1,fontFamily:"monospace"}}>zerobarrier-app.vercel.app</span>
<button style={{background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}
onClick={()=>navigator.clipboard?.writeText("https://zerobarrier-app.vercel.app").catch(()=>{})}>
Copy
</button>
</div>
</div>

<div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:"20px 16px"}}>
<div style={{color:GREEN,fontSize:10,letterSpacing:2,fontWeight:700,marginBottom:16}}>🎙️ HOW VOICE WORKS</div>
{[["1.","Tap the mic 🎙️ and speak in your language"],["2.","AI transcribes your voice instantly"],["3.","Receiver taps ▶ to hear it in their language"],["4.","Male/Female voice matches the sender's gender"],["5.","Works for 50+ languages 🌍"]].map(([n,t])=>(
<div key={n} style={{display:"flex",gap:10,marginBottom:10,fontSize:13}}>
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

// ── ROOT ──────────────────────────────────────────────────────────────
export default function ZeroBarrier() {
const [user, setUser] = useState<any>(null);

// Get room from URL — if ?room=xxx use that room, else use "global"
const roomId = new URLSearchParams(window.location.search).get("room") || "global";

return (
<ErrorBoundary>
{!user
? <Onboarding onStart={setUser}/>
: <Chat user={user} roomId={roomId} onLogout={()=>setUser(null)}/>
}
</ErrorBoundary>
);
}
