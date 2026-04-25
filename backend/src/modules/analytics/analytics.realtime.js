const subscribersByShop = new Map();

function getSet(shopUsername) {
  let set = subscribersByShop.get(shopUsername);
  if (!set) {
    set = new Set();
    subscribersByShop.set(shopUsername, set);
  }
  return set;
}

export function subscribeAnalyticsShop(shopUsername, sendFn) {
  const set = getSet(shopUsername);
  set.add(sendFn);
  return () => {
    const cur = subscribersByShop.get(shopUsername);
    if (!cur) return;
    cur.delete(sendFn);
    if (cur.size === 0) subscribersByShop.delete(shopUsername);
  };
}

export function publishAnalyticsEvent(shopUsername, payload) {
  const set = subscribersByShop.get(shopUsername);
  if (!set || set.size === 0) return;
  for (const sendFn of set) {
    try {
      sendFn(payload);
    } catch {
      // ignore broken subscribers; connection cleanup handles removal
    }
  }
}
