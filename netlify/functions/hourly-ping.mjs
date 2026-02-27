import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  schedule: '0 * * * *', // every hour on the hour
};

export default async function handler() {
  console.log(`[${new Date().toISOString()}] Sending hourly photo challenge ping...`);

  webPush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:fordaboys@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const { data: users } = await supabase
    .from('users')
    .select('id, name, push_subscription')
    .not('push_subscription', 'is', null);

  if (!users || users.length === 0) {
    console.log('No users with push subscriptions');
    return;
  }

  const payload = JSON.stringify({
    title: "IT'S GO TIME",
    body: 'New hour, new photo. Send it for the boys.',
    icon: '/icon-192.png',
    tag: 'hourly-challenge',
  });

  for (const user of users) {
    try {
      const sub = user.push_subscription;
      await webPush.sendNotification(sub, payload);
      console.log(`Sent push to ${user.name}`);
    } catch (err) {
      if (err.statusCode === 410) {
        await supabase
          .from('users')
          .update({ push_subscription: null })
          .eq('id', user.id);
        console.log(`Removed expired subscription for ${user.name}`);
      } else {
        console.error(`Push failed for ${user.name}:`, err.message);
      }
    }
  }
}
