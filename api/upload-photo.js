// api/upload-photo.js
// Receives a base64 image from the app, uploads to Cloudinary securely,
// returns the photo URL. API Secret never exposed to the browser.

export const config = { api: { bodyParser: { sizeLimit: "5mb" } } };

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
return res.status(500).json({ error: "Server misconfigured" });
}

// Generate signature for secure upload
const timestamp = Math.round(Date.now() / 1000);
const publicId = `zerobarrier/profiles/${userId}`;

// Create signature string
const crypto = await import("crypto");
const sigString = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
const signature = crypto
.createHash("sha1")
.update(sigString)
.digest("hex");

// Upload to Cloudinary
const formData = new URLSearchParams();
formData.append("file", image);
formData.append("api_key", API_KEY);
formData.append("timestamp", timestamp.toString());
formData.append("public_id", publicId);
formData.append("signature", signature);
formData.append("overwrite", "true");

const response = await fetch(
`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
{
method: "POST",
headers: { "Content-Type": "application/x-www-form-urlencoded" },
body: formData.toString(),
}
);

const data = await response.json();

if (!response.ok || data.error) {
return res.status(500).json({ error: data.error?.message || "Upload failed" });
}

return res.status(200).json({ url: data.secure_url });
} catch (err) {
return res.status(500).json({ error: err.message || "Unknown error" });
}
}

