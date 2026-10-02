/* Pure wheel math and portable data. Also loaded by Node tests. */
(function (root) {
  "use strict";
  const TAU = Math.PI * 2;
  const MAX_ITEMS = 1000;
  const DEFAULT_ICON = { type: "lucide", name: "droplets" };
  const ICON_NAME = /^[a-z0-9]+(?:-[a-z0-9]+){0,5}$/;
  const normalizeAngle = (angle) => ((angle % TAU) + TAU) % TAU;
  const unit = (value) => Math.min(1 - Number.EPSILON, Math.max(0, value));
  const text = (value, limit) =>
    typeof value === "string" ? value.trim().slice(0, limit) : "";
  function safeLink(value) {
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) &&
        !url.username &&
        !url.password
        ? url.href
        : null;
    } catch {
      return null;
    }
  }
  function weight(value) {
    if (value === null || value === undefined || value === "") return 1;
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(1000000, Math.max(0, number)) : 1;
  }
  function normalizeIcon(value) {
    if (!value || typeof value !== "object") return null;
    if (value.type === "lucide") {
      const name = text(value.name, 40).toLowerCase();
      return ICON_NAME.test(name) ? { type: "lucide", name } : null;
    }
    if (value.type === "emoji") {
      const emoji = text(value.value, 16);
      return emoji ? { type: "emoji", value: emoji } : null;
    }
    if (value.type === "notion") {
      const kind = ["emoji", "external", "file", "custom_emoji"].includes(
        value.kind,
      )
        ? value.kind
        : "";
      if (kind === "emoji") {
        const emoji = text(value.value, 16);
        return emoji ? { type: "notion", kind, value: emoji } : null;
      }
      const url = safeLink(value.url);
      return url ? { type: "notion", kind, url: url.slice(0, 4000) } : null;
    }
    return null;
  }
  function normalizeItems(items) {
    if (!Array.isArray(items) || items.length > MAX_ITEMS)
      throw new Error(`Use a list of at most ${MAX_ITEMS} options.`);
    return items.map((item, index) => {
      if (!item || typeof item !== "object" || !text(item.label, 300))
        throw new Error(`Option ${index + 1} needs a label.`);
      return {
        id: `item-${index}`,
        label: text(item.label, 300),
        desc: text(item.desc, 4000),
        link: safeLink(item.link),
        weight: weight(item.weight),
        icon: normalizeIcon(item.icon) || { ...DEFAULT_ICON },
      };
    });
  }
  function portableIcon(value) {
    const icon = normalizeIcon(value);
    if (!icon) return { ...DEFAULT_ICON };
    if (icon.type === "lucide" || icon.type === "emoji") return icon;
    if (icon.type === "notion" && icon.kind === "emoji")
      return { type: "emoji", value: icon.value };
    return { ...DEFAULT_ICON };
  }
  function snapshot(wheel) {
    return {
      version: 2,
      name: text(wheel.name, 100) || "Untitled wheel",
      items: normalizeItems(wheel.items).map(
        ({ label, desc, link, weight, icon }) => ({
          label,
          desc,
          link,
          weight,
          icon: portableIcon(icon),
        }),
      ),
    };
  }
  function parseWheel(value) {
    if (Array.isArray(value))
      return {
        version: 2,
        name: "Imported wheel",
        items: normalizeItems(value),
      };
    if (!value || value.version !== 2)
      throw new Error("This wheel format is not supported.");
    return {
      version: 2,
      name: text(value.name, 100) || "Untitled wheel",
      items: normalizeItems(value.items),
    };
  }
  function indexAtNeedle(items, angle) {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    if (!total) return -1;
    const target = (normalizeAngle(Math.PI * 1.5 - angle) / TAU) * total;
    let cursor = 0;
    for (let i = 0; i < items.length; i++) {
      cursor += items[i].weight;
      if (target < cursor) return i;
    }
    return items.findLastIndex((item) => item.weight > 0);
  }
  // Build the visual segments separately from the source options. In the
  // default mode there is one segment per option, so a larger weight creates a
  // larger arc. In dispersed mode a heavier option is split into equal virtual
  // segments and interleaved with the other options. Every virtual segment
  // still points to its source option, so the probability stays exact while
  // the wheel can show repeated chances around its circumference.
  function visualSegments(items, mode = "proportional") {
    if (!Array.isArray(items)) return [];
    const active = items
      .map((item, itemIndex) => ({ item, itemIndex, weight: weight(item?.weight) }))
      .filter((segment) => segment.weight > 0);
    if (mode !== "dispersed")
      return active.map((segment) => ({ ...segment, firstForItem: true }));

    const buckets = active.map((segment) => {
      const count = Math.max(1, Math.min(12, Math.round(segment.weight)));
      const segmentWeight = segment.weight / count;
      return Array.from({ length: count }, (_, segmentIndex) => ({
        ...segment,
        weight: segmentWeight,
        firstForItem: segmentIndex === 0,
      }));
    });
    const result = [];
    let added = true;
    while (added) {
      added = false;
      buckets.forEach((bucket) => {
        if (bucket.length) {
          result.push(bucket.shift());
          added = true;
        }
      });
    }
    return result;
  }
  function spinPlan(items, angle, random = Math.random) {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    if (!total) return null;
    let ticket = unit(random()) * total;
    let winner = items.findLastIndex((item) => item.weight > 0);
    for (let i = 0; i < items.length; i++) {
      ticket -= items[i].weight;
      if (ticket < 0) {
        winner = i;
        break;
      }
    }
    const before = items
      .slice(0, winner)
      .reduce((sum, item) => sum + item.weight, 0);
    const landing =
      ((before + items[winner].weight * (0.18 + unit(random()) * 0.64)) /
        total) *
      TAU;
    const target = normalizeAngle(Math.PI * 1.5 - landing);
    const turns = 5 + Math.floor(unit(random()) * 4);
    return {
      winner,
      target,
      distance: turns * TAU + normalizeAngle(target - normalizeAngle(angle)),
      duration: 4400 + turns * 180,
    };
  }
  // Integral of a smooth impulse followed by quadratic drag. Velocity is
  // continuous at the join and reaches zero at the exact weighted landing.
  function gentleDistance(current, target) {
    const alignment = normalizeAngle(target - current);
    return alignment < Math.PI ? alignment + TAU : alignment;
  }
  function spinProgress(time) {
    const t = Math.min(1, Math.max(0, time));
    const impulse = 0.08;
    const total = impulse / 2 + (1 - impulse) / 3;
    if (t < impulse)
      return (
        (t / 2 -
          (impulse / (2 * Math.PI)) * Math.sin((Math.PI * t) / impulse)) /
        total
      );
    const coast = (t - impulse) / (1 - impulse);
    return (
      (impulse / 2 + (1 - impulse) * (coast - coast * coast + coast ** 3 / 3)) /
      total
    );
  }
  const api = {
    MAX_ITEMS,
    DEFAULT_ICON,
    safeLink,
    weight,
    normalizeIcon,
    normalizeItems,
    snapshot,
    parseWheel,
    normalizeAngle,
    indexAtNeedle,
    visualSegments,
    spinPlan,
    spinProgress,
    gentleDistance,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WheelCore = api;
})(typeof window === "undefined" ? globalThis : window);
