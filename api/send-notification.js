// api/send-notification.js
//
// This is a NEW, separate file. It does not touch App.tsx, chat,
// translation, or voice recording logic in any way.
//
// What it does: receives a sender name + message preview from the app,
// then calls OneSignal's REST API to push a notification to everyone
// EXCEPT the sender. The secret REST API key is read from the Vercel
// environment variable we just added — it never appears in this file
// or in the browser.

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
    }
    
    try {
    const { senderName, message, senderId } = req.body;
    
    if (!senderName || !message) {
    return res.status(400).json({ error: "Missing senderName or message" });
    }
    
    const ONESIGNAL_APP_ID = "d7da8125-4084-4463-bca4-68dfd3581c4b";
    const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
    
    if (!REST_API_KEY) {
    return res.status(500).json({ error: "Server misconfigured: missing API key" });
    }
    
    // Truncate long messages for the notification preview
    const preview = message.length > 80 ? message.slice(0, 80) + "…" : message;
    
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
    "Content-Type": "application/json",
    "Authorization": `Basic ${REST_API_KEY}`,
    },
    body: JSON.stringify({
    app_id: ONESIGNAL_APP_ID,
    included_segments: ["Subscribed Users"],
    headings: { en: "ZeroBarrier ⚡" },
    contents: { en: `${senderName}: ${preview}` },
    // Excludes the sender's own device from receiving their own notification
    ...(senderId ? { filters: [{ field: "tag", key: "uid", relation: "!=", value: senderId }] } : {}),
    }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
    return res.status(response.status).json({ error: data });
    }
    
    return res.status(200).json({ success: true, result: data });
    } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown server error" });
    }
    }
    
    