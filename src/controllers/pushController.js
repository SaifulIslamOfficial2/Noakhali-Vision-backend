import webpush from "web-push";
import PushSubscription from "../models/PushSubscription.js";

let vapidSet = false;
function initVapid() {
  if (vapidSet) return;
  const { VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[Push] VAPID keys missing — push notifications disabled");
    return;
  }
  webpush.setVapidDetails(
    `mailto:${VAPID_EMAIL}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  vapidSet = true;
}

export async function subscribe(req, res, next) {
  try {
    initVapid();
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth)
      return res.status(400).json({ message: "Invalid subscription payload" });

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { endpoint, keys },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
}

export async function unsubscribe(req, res, next) {
  try {
    const { endpoint } = req.body;
    await PushSubscription.deleteOne({ endpoint });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

export async function sendPushToAll({ title, body, url, tag }) {
  initVapid();
  if (!vapidSet) return { sent: 0, failed: 0 };

  const subs = await PushSubscription.find();
  const payload = JSON.stringify({ title, body, url, tag });
  const results = await Promise.allSettled(
    subs.map(s =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: s.keys },
        payload
      ).catch(async err => {
        if (err.statusCode === 410) await PushSubscription.deleteOne({ _id: s._id });
        throw err;
      })
    )
  );
  return {
    sent: results.filter(r => r.status === "fulfilled").length,
    failed: results.filter(r => r.status === "rejected").length,
  };
}