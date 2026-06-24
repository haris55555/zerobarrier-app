export const config = { api: { bodyParser: { sizeLimit: "5mb" } } };

import crypto from "crypto";

export default async function handler(req, res) {
if (req.method !== "POST") {
return res.status(405).json({ error: "Method not allowed" });
}
try {
const { image, userId } = req.body;
if (!image || !userId) {
return res.status(400).json({ error: "Missing image or userId" });
}
const CLOUD_NAME = "drxghckvw";
const API_KEY = "763262575355478";
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
if (!API_SECRET) {
return res.status(500).json({ error: "No API secret found" });
}
const timestamp = Math.round(Date.now() / 1000);
const publicId = `zerobarrier/profiles/${userId}`;
const sigString = `overwrite=true&public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
const signature = crypto.createHash("sha1").update(sigString).digest("hex");

console.log("Attempting upload with publicId:", publicId);
console.log("Signature:", signature);

const body = new URLSearchParams();
body.append("file", image);
body.append("api_key", API_KEY);
body.append("timestamp", String(timestamp));
body.append("public_id", publicId);
body.append("signature", signature);
body.append("overwrite", "true");

const response = await fetch(
`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
{ method: "POST", body }
);
const data = await response.json();
console.log("Cloudinary response:", JSON.stringify(data));

if (data.error) {
return res.status(500).json({ error: data.error.message, cloudinaryResponse: data });
}
return res.status(200).json({ url: data.secure_url });
} catch (err) {
console.log("Caught error:", err.message);
return res.status(500).json({ error: err.message || "Unknown error" });
}
}

