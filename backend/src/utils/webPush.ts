import webPush from 'web-push';
import { env } from '../config/env';
import { PushSubscriptionModel } from '../modules/notifications/pushSubscription.model';

let initialised = false;

function init() {
  if (initialised || !env.vapidPublicKey || !env.vapidPrivateKey) return;
  webPush.setVapidDetails(
    `mailto:${env.vapidEmail}`,
    env.vapidPublicKey,
    env.vapidPrivateKey
  );
  initialised = true;
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  init();
  if (!initialised) return; // VAPID not configured — skip silently

  const subs = await PushSubscriptionModel.find({ userId });
  const json = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          json
        );
      } catch (err: unknown) {
        // Subscription expired or invalid — clean up
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await PushSubscriptionModel.deleteOne({ _id: sub._id });
        }
      }
    })
  );
}
