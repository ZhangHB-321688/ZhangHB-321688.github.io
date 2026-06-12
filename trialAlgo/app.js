function $(id) {
  return document.getElementById(id);
}

function setInt(id, v) {
  const el = $(id);
  if (el) el.value = String(Math.trunc(Number(v)));
}

function setIntArray(prefix, arr) {
  for (let i = 1; i <= 5; i++) {
    const el = $(prefix + i);
    if (el) el.value = String(Math.trunc(Number(arr[i - 1] ?? 0)));
  }
}

function gcd(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

class Frac {
  constructor(n, d = 1n) {
    if (d === 0n) throw new Error("division by zero");
    let nn = n;
    let dd = d;
    if (dd < 0n) {
      nn = -nn;
      dd = -dd;
    }
    if (nn === 0n) {
      this.n = 0n;
      this.d = 1n;
      return;
    }
    const g = gcd(nn, dd);
    this.n = nn / g;
    this.d = dd / g;
  }

  static zero() {
    return new Frac(0n, 1n);
  }

  static one() {
    return new Frac(1n, 1n);
  }

  static from(x) {
    if (x instanceof Frac) return x;
    if (typeof x === "bigint") return new Frac(x, 1n);
    if (typeof x === "number") {
      if (!Number.isFinite(x)) throw new Error("invalid number");
      return Frac.from(String(x));
    }
    const s = String(x).trim();
    if (!s) throw new Error("empty value");
    if (s.includes("/")) {
      const [a, b] = s.split("/", 2);
      return new Frac(BigInt(a.trim()), BigInt(b.trim()));
    }
    if (s.includes(".")) {
      let sign = 1n;
      let t = s;
      if (t.startsWith("-")) {
        sign = -1n;
        t = t.slice(1);
      } else if (t.startsWith("+")) {
        t = t.slice(1);
      }
      const [ip, fp] = t.split(".", 2);
      const fracPart = fp ?? "";
      const denom = 10n ** BigInt(fracPart.length);
      const num = BigInt((ip || "0") + fracPart);
      return new Frac(sign * num, denom);
    }
    return new Frac(BigInt(s), 1n);
  }

  add(o) {
    const b = Frac.from(o);
    return new Frac(this.n * b.d + b.n * this.d, this.d * b.d);
  }

  sub(o) {
    const b = Frac.from(o);
    return new Frac(this.n * b.d - b.n * this.d, this.d * b.d);
  }

  mul(o) {
    const b = Frac.from(o);
    return new Frac(this.n * b.n, this.d * b.d);
  }

  div(o) {
    const b = Frac.from(o);
    if (b.n === 0n) throw new Error("division by zero");
    return new Frac(this.n * b.d, this.d * b.n);
  }

  cmp(o) {
    const b = Frac.from(o);
    const left = this.n * b.d;
    const right = b.n * this.d;
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  }

  toFractionString() {
    return `${this.n}/${this.d}`;
  }

  toDecimal(places = 6) {
    const p = Math.max(0, Math.trunc(places));
    if (this.n === 0n) {
      return p === 0 ? "0" : `0.${"0".repeat(p)}`;
    }
    const neg = this.n < 0n;
    let nn = neg ? -this.n : this.n;
    const ip = nn / this.d;
    let rem = nn % this.d;
    if (p === 0) return `${neg ? "-" : ""}${ip}`;
    let out = "";
    for (let i = 0; i < p; i++) {
      rem *= 10n;
      const digit = rem / this.d;
      rem %= this.d;
      out += digit.toString();
    }
    return `${neg ? "-" : ""}${ip}.${out}`;
  }

  toProbNumber(places = 6) {
    const scale = 10n ** BigInt(Math.max(0, Math.trunc(places)));
    const nn = this.n < 0n ? -this.n : this.n;
    const scaled = (nn * scale) / this.d;
    const v = Number(scaled) / Number(scale);
    return this.n < 0n ? -v : v;
  }
}

function readInt(id) {
  const el = $(id);
  if (!el) throw new Error(`missing element: ${id}`);
  const v = Number(el.value);
  if (!Number.isFinite(v)) throw new Error(`invalid number: ${id}`);
  return Math.trunc(v);
}

function readIntArray(prefix) {
  return [1, 2, 3, 4, 5].map((i) => readInt(prefix + i));
}

function readRewards() {
  const raw = $("rewards").value.trim();
  if (!raw) throw new Error("rewards is empty");
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  if (parts.length !== 11) throw new Error("rewards must have 11 numbers");
  return parts.map((s) => Frac.from(s.trim()));
}

function mod11(x) {
  return ((x % 11) + 11) % 11;
}

function zeroDist() {
  return Array.from({ length: 11 }, () => Frac.zero());
}

function oneHot(index) {
  const dist = zeroDist();
  dist[index] = Frac.one();
  return dist;
}

function zeroResult(action) {
  return {
    total: Frac.zero(),
    current: Frac.zero(),
    dist: zeroDist(),
    action,
  };
}

function cloneResult(result, action) {
  return {
    total: result.total,
    current: result.current,
    dist: result.dist,
    action: action ?? result.action,
  };
}

function weightedResult(entries) {
  let total = Frac.zero();
  let current = Frac.zero();
  const dist = zeroDist();
  for (const entry of entries) {
    total = total.add(entry.prob.mul(entry.result.total));
    current = current.add(entry.prob.mul(entry.result.current));
    for (let i = 0; i < 11; i++) {
      dist[i] = dist[i].add(entry.prob.mul(entry.result.dist[i]));
    }
  }
  return { total, current, dist };
}

function compareResult(candidate, best) {
  if (!best) return true;
  return candidate.total.cmp(best.total) > 0;
}

function rewardAt(rewards, points) {
  return rewards[mod11(points)];
}

function overloadLimit(mode) {
  if (mode === "count_all") return null;
  if (mode === "ignore_two_layer") return 21;
  if (mode === "ignore_all") return 10;
  throw new Error(`unknown overload mode: ${mode}`);
}

function isOverloaded(points, mode) {
  const limit = overloadLimit(mode);
  return limit !== null && points > limit;
}

function actionText(a) {
  if (a === "DRAW") return "继续抽取下一张";
  if (a === "DRAW_LOCK_0") return "保持关闭翻倍并抽下一张";
  if (a === "DRAW_LOCK_1") return "先开启双倍，再抽下一张";
  if (a === "CLAIM") return "立即开始演算";
  if (a === "DOUBLE_CLAIM") return "立即开始演算";
  if (a === "GIVE_UP") return "放弃并重开";
  if (a === "NO_CHALLENGE") return "无剩余奖励次数";
  if (a === "OVERLOAD_ZERO") return "当前状态已被溢出规则记为0";
  return a;
}

function fmtFrac(x, decimals = 6) {
  if (!x) return "-";
  const frac = x.toFractionString();
  const dec = x.toDecimal(decimals);
  if (frac.length > 16) return dec;
  return `${dec}(${frac})`;
}

function applyFracText(el, x, decimals = 6) {
  if (!el) return;
  if (!x) {
    el.textContent = "-";
    el.title = "";
    return;
  }
  const frac = x.toFractionString();
  el.textContent = fmtFrac(x, decimals);
  el.title = frac.length > 16 ? frac : "";
}

function applyRewardText(el, x) {
  if (!el) return;
  if (!x) {
    el.textContent = "-";
    el.title = "";
    return;
  }
  el.textContent = x.d === 1n ? x.n.toString() : x.toDecimal(0);
  el.title = "";
}

function pct(x) {
  return `${(x * 100).toFixed(2)}%`;
}

function ensureExtraControls() {
  const firstCard = document.querySelector("main .card");
  if (!firstCard) return;

  if (!$("remainingGiveups")) {
    const actions = firstCard.querySelector(".actions");
    const row = document.createElement("div");
    row.className = "row two";
    row.innerHTML = `
      <div>
        <label>剩余放弃次数</label>
        <input id="remainingGiveups" type="number" value="3" min="0" />
      </div>
      <div>
        <label class="checkbox">
          <input id="lockedDouble" type="checkbox" />
          当前局双倍已锁定
        </label>
      </div>
    `;
    firstCard.insertBefore(row, actions);
  }

  const legacyCountOverload = $("countOverload");
  if (legacyCountOverload && !$("overloadMode")) {
    const checked = !!legacyCountOverload.checked;
    const row = legacyCountOverload.closest(".row");
    row.innerHTML = `
      <label>溢出计入方式</label>
      <select id="overloadMode">
        <option value="count_all">计入所有溢出部分</option>
        <option value="ignore_two_layer">不计入两层溢出部分</option>
        <option value="ignore_all">不计入溢出部分</option>
      </select>
    `;
    $("overloadMode").value = checked ? "count_all" : "ignore_all";
  }

  if (!$("btnGiveUp")) {
    const groups = firstCard.querySelectorAll(".actions");
    const targetGroup = groups[2] || groups[groups.length - 1];
    if (targetGroup) {
      const btn = document.createElement("button");
      btn.id = "btnGiveUp";
      btn.className = "secondary";
      btn.textContent = "放弃重开";
      targetGroup.appendChild(btn);
    }
  }
}

function readLockedDouble() {
  return !!($("lockedDouble") && $("lockedDouble").checked);
}

function setLockedDouble(v) {
  if ($("lockedDouble")) $("lockedDouble").checked = !!v;
}

function parsePayload() {
  $("err").textContent = "";
  return {
    initial_card_nums: readIntArray("init"),
    card_nums: readIntArray("cur"),
    total_points: readInt("totalPoints"),
    already_drawn: readInt("alreadyDrawn"),
    remaining_challenges: readInt("remainingChallenges"),
    remaining_doubles: readInt("remainingDoubles"),
    remaining_giveups: readInt("remainingGiveups"),
    current_locked_double: readLockedDouble(),
    rewards: readRewards(),
    overload_mode: $("overloadMode").value,
  };
}

function evalState(payload) {
  const init = payload.initial_card_nums.map((x) => Math.trunc(x));
  const cur = payload.card_nums.map((x) => Math.trunc(x));
  const totalPoints = Math.trunc(payload.total_points);
  const alreadyDrawn = Math.trunc(payload.already_drawn);
  const remainingChallenges = Math.trunc(payload.remaining_challenges);
  const remainingDoubles = Math.trunc(payload.remaining_doubles);
  const remainingGiveups = Math.trunc(payload.remaining_giveups);
  const currentLockedDouble = !!payload.current_locked_double;
  const rewards = payload.rewards;
  const overloadMode = payload.overload_mode;

  if (!Array.isArray(init) || init.length !== 5) throw new Error("initial_card_nums length must be 5");
  if (!Array.isArray(cur) || cur.length !== 5) throw new Error("card_nums length must be 5");
  if (init.some((x) => x < 0) || cur.some((x) => x < 0)) throw new Error("card nums must be >= 0");
  if (!Array.isArray(rewards) || rewards.length !== 11) throw new Error("rewards length must be 11");
  if (alreadyDrawn < 0 || alreadyDrawn > 5) throw new Error("already_drawn must be in [0,5]");
  if (remainingChallenges < 0 || remainingDoubles < 0 || remainingGiveups < 0) {
    throw new Error("remaining values must be >= 0");
  }
  if (currentLockedDouble && alreadyDrawn < 3) {
    throw new Error("当前局双倍只有在已抽到第 3 张及以后才会被锁定");
  }
  if (currentLockedDouble && remainingDoubles <= 0) {
    throw new Error("当前局双倍已锁定时，剩余双倍次数必须至少为 1");
  }

  const currentReward = rewardAt(rewards, totalPoints);
  if (remainingChallenges === 0) {
    return {
      action: "NO_CHALLENGE",
      current_reward: currentReward,
      expectation_current: Frac.zero(),
      expectation_total: Frac.zero(),
      expectation_future: Frac.zero(),
      distribution: Array.from({ length: 11 }, (_, i) => ({ i, p: Frac.zero() })),
    };
  }

  const t0 = remainingChallenges;
  const k0 = Math.min(remainingDoubles, t0);
  const a0 = remainingGiveups;
  const initArr = init.slice();
  const preMemo = new Map();
  const postMemo = new Map();

  function cardsKey(cards) {
    return cards.join(",");
  }

  function startState(t, k, a) {
    return solvePre(initArr, 0, 0, t, k, a);
  }

  function nextStates(cards) {
    const totalCards = cards.reduce((acc, v) => acc + v, 0);
    const out = [];
    if (totalCards <= 0) return out;
    const denom = Frac.from(totalCards);
    for (let i = 0; i < 5; i++) {
      const count = cards[i];
      if (count <= 0) continue;
      const nextCards = cards.slice();
      nextCards[i] -= 1;
      out.push({
        prob: Frac.from(count).div(denom),
        nextCards,
        point: i + 1,
      });
    }
    return out;
  }

  function solvePre(cards, points, drawn, t, k, a) {
    const key = `${cardsKey(cards)}|${points}|${drawn}|${t}|${k}|${a}`;
    const cached = preMemo.get(key);
    if (cached) return cached;

    if (isOverloaded(points, overloadMode)) {
      const out = zeroResult("OVERLOAD_ZERO");
      preMemo.set(key, out);
      return out;
    }
    if (t === 0) {
      const out = zeroResult("NO_CHALLENGE");
      preMemo.set(key, out);
      return out;
    }

    const stopDist = oneHot(mod11(points));
    const r = rewardAt(rewards, points);
    let best = {
      total: r.add(startState(t - 1, k, a).total),
      current: r,
      dist: stopDist,
      action: "CLAIM",
    };

    if (k > 0) {
      const candidate = {
        total: r.mul(2).add(startState(t - 1, k - 1, a).total),
        current: r.mul(2),
        dist: stopDist,
        action: "DOUBLE_CLAIM",
      };
      if (compareResult(candidate, best)) best = candidate;
    }

    const canDraw = drawn < 5 && cards.reduce((acc, v) => acc + v, 0) > 0;
    if (canDraw) {
      if (drawn <= 1) {
        const entries = nextStates(cards).map((state) => ({
          prob: state.prob,
          result: solvePre(state.nextCards, points + state.point, drawn + 1, t, k, a),
        }));
        const drawResult = weightedResult(entries);
        const candidate = { ...drawResult, action: "DRAW" };
        if (compareResult(candidate, best)) best = candidate;
      } else if (drawn === 2) {
        const draw0 = weightedResult(
          nextStates(cards).map((state) => ({
            prob: state.prob,
            result: solvePost(state.nextCards, points + state.point, 3, t, k, a, 0),
          }))
        );
        let bestDraw = { ...draw0, action: "DRAW_LOCK_0" };

        if (k > 0) {
          const draw1 = weightedResult(
            nextStates(cards).map((state) => ({
              prob: state.prob,
              result: solvePost(state.nextCards, points + state.point, 3, t, k, a, 1),
            }))
          );
          const candidate = { ...draw1, action: "DRAW_LOCK_1" };
          if (compareResult(candidate, bestDraw)) bestDraw = candidate;
        }

        if (compareResult(bestDraw, best)) best = bestDraw;
      }
    }

    if (a > 0 && drawn > 0) {
      const restarted = startState(t, k, a - 1);
      const candidate = cloneResult(restarted, "GIVE_UP");
      if (compareResult(candidate, best)) best = candidate;
    }

    preMemo.set(key, best);
    return best;
  }

  function solvePost(cards, points, drawn, t, k, a, lockedDouble) {
    const key = `${cardsKey(cards)}|${points}|${drawn}|${t}|${k}|${a}|${lockedDouble}`;
    const cached = postMemo.get(key);
    if (cached) return cached;

    if (isOverloaded(points, overloadMode)) {
      const out = zeroResult("OVERLOAD_ZERO");
      postMemo.set(key, out);
      return out;
    }
    if (t === 0) {
      const out = zeroResult("NO_CHALLENGE");
      postMemo.set(key, out);
      return out;
    }

    const stopDist = oneHot(mod11(points));
    const rewardNow = rewardAt(rewards, points).mul(lockedDouble ? 2 : 1);
    let best = {
      total: rewardNow.add(startState(t - 1, k - lockedDouble, a).total),
      current: rewardNow,
      dist: stopDist,
      action: lockedDouble ? "DOUBLE_CLAIM" : "CLAIM",
    };

    const canDraw = drawn < 5 && cards.reduce((acc, v) => acc + v, 0) > 0;
    if (canDraw) {
      const drawResult = weightedResult(
        nextStates(cards).map((state) => ({
          prob: state.prob,
          result: solvePost(state.nextCards, points + state.point, drawn + 1, t, k, a, lockedDouble),
        }))
      );
      const candidate = { ...drawResult, action: "DRAW" };
      if (compareResult(candidate, best)) best = candidate;
    }

    if (a > 0) {
      const restarted = startState(t, k, a - 1);
      const candidate = cloneResult(restarted, "GIVE_UP");
      if (compareResult(candidate, best)) best = candidate;
    }

    postMemo.set(key, best);
    return best;
  }

  const result =
    alreadyDrawn <= 2
      ? solvePre(cur.slice(), totalPoints, alreadyDrawn, t0, k0, a0)
      : solvePost(cur.slice(), totalPoints, alreadyDrawn, t0, k0, a0, currentLockedDouble ? 1 : 0);

  return {
    action: result.action,
    current_reward: currentReward,
    expectation_current: result.current,
    expectation_total: result.total,
    expectation_future: result.total.sub(result.current),
    distribution: result.dist.map((p, i) => ({ i, p })),
  };
}

function render(data) {
  $("action").textContent = actionText(data.action);
  applyRewardText($("curReward"), data.current_reward);
  applyFracText($("expCur"), data.expectation_current, 6);
  applyFracText($("expTotal"), data.expectation_total, 6);
  applyFracText($("expFuture"), data.expectation_future, 6);

  const container = $("dist");
  container.innerHTML = "";
  for (const row of data.distribution || []) {
    const pf = row.p.toProbNumber(6);
    const line = document.createElement("div");
    line.className = "bar";

    const lab = document.createElement("div");
    lab.className = "lab";
    lab.textContent = String(row.i).padStart(2, "0");

    const track = document.createElement("div");
    track.className = "track";
    const fill = document.createElement("div");
    fill.className = "fill";
    fill.style.width = `${Math.max(0, Math.min(1, pf)) * 100}%`;
    track.appendChild(fill);

    const num = document.createElement("div");
    num.className = "num";
    const frac = row.p.toFractionString();
    num.textContent = frac.length > 16 ? pct(pf) : `${pct(pf)} (${frac})`;
    num.title = frac.length > 16 ? frac : "";

    line.appendChild(lab);
    line.appendChild(track);
    line.appendChild(num);
    container.appendChild(line);
  }
}

function copyCurFromInit() {
  for (let i = 1; i <= 5; i++) {
    $("cur" + i).value = $("init" + i).value;
  }
}

function resetRound() {
  copyCurFromInit();
  setInt("totalPoints", 0);
  setInt("alreadyDrawn", 0);
  setLockedDouble(false);
  computeAndRender();
}

function computeAndRender() {
  const payload = parsePayload();
  const data = evalState(payload);
  render(data);
  return { payload, data };
}

function ensureCanDrawThirdWithCurrentLock() {
  const already = readInt("alreadyDrawn");
  if (already === 2 && readLockedDouble() && readInt("remainingDoubles") <= 0) {
    throw new Error("锁定双倍后再抽第 3 张前，剩余双倍次数必须至少为 1");
  }
}

function drawPoint(point) {
  const already = readInt("alreadyDrawn");
  if (already >= 5) throw new Error("已抽卡数已到 5，不能继续抽");
  ensureCanDrawThirdWithCurrentLock();
  const id = "cur" + point;
  const remain = readInt(id);
  if (remain <= 0) throw new Error(`点数${point}卡已用完`);
  setInt(id, remain - 1);
  setInt("totalPoints", readInt("totalPoints") + point);
  setInt("alreadyDrawn", already + 1);
  computeAndRender();
}

function drawRandom() {
  const already = readInt("alreadyDrawn");
  if (already >= 5) throw new Error("已抽卡数已到 5，不能继续抽");
  ensureCanDrawThirdWithCurrentLock();
  const weights = [1, 2, 3, 4, 5].map((i) => readInt("cur" + i));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) throw new Error("当前剩余卡组为空，不能继续抽");
  let r = Math.random() * total;
  let chosen = 1;
  for (let i = 0; i < 5; i++) {
    r -= weights[i];
    if (r < 0) {
      chosen = i + 1;
      break;
    }
  }
  drawPoint(chosen);
}

function claimReward(useDouble) {
  const n = readInt("remainingChallenges");
  const drawn = readInt("alreadyDrawn");
  const lockedDouble = readLockedDouble();
  if (n <= 0) throw new Error("剩余奖励次数为 0，不能领取");

  if (drawn >= 3) {
    if (lockedDouble && !useDouble) {
      throw new Error("当前局双倍已锁定，本局只能双倍领取或放弃");
    }
    if (!lockedDouble && useDouble) {
      throw new Error("抽到第 3 张后已不能临时开启双倍");
    }
  }

  if (useDouble) {
    const m = readInt("remainingDoubles");
    if (m <= 0) throw new Error("剩余双倍次数为 0，不能双倍领取");
    setInt("remainingDoubles", m - 1);
  }

  setInt("remainingChallenges", n - 1);
  copyCurFromInit();
  setInt("totalPoints", 0);
  setInt("alreadyDrawn", 0);
  setLockedDouble(false);
  computeAndRender();
}

function giveUpRound() {
  const drawn = readInt("alreadyDrawn");
  const giveups = readInt("remainingGiveups");
  if (drawn <= 0) throw new Error("当前尚未抽牌，不能放弃重开");
  if (giveups <= 0) throw new Error("剩余放弃次数为 0");
  setInt("remainingGiveups", giveups - 1);
  copyCurFromInit();
  setInt("totalPoints", 0);
  setInt("alreadyDrawn", 0);
  setLockedDouble(false);
  computeAndRender();
}

function runSafely(fn) {
  try {
    $("err").textContent = "";
    fn();
  } catch (e) {
    $("err").textContent = String(e && e.message ? e.message : e);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  ensureExtraControls();

  $("btnEval").addEventListener("click", () => runSafely(() => computeAndRender()));
  $("btnReset").addEventListener("click", () => runSafely(() => resetRound()));

  $("btnDraw1").addEventListener("click", () => runSafely(() => drawPoint(1)));
  $("btnDraw2").addEventListener("click", () => runSafely(() => drawPoint(2)));
  $("btnDraw3").addEventListener("click", () => runSafely(() => drawPoint(3)));
  $("btnDraw4").addEventListener("click", () => runSafely(() => drawPoint(4)));
  $("btnDraw5").addEventListener("click", () => runSafely(() => drawPoint(5)));
  $("btnDrawRand").addEventListener("click", () => runSafely(() => drawRandom()));
  $("btnClaim").addEventListener("click", () => runSafely(() => claimReward(false)));
  $("btnDoubleClaim").addEventListener("click", () => runSafely(() => claimReward(true)));
  if ($("btnGiveUp")) $("btnGiveUp").addEventListener("click", () => runSafely(() => giveUpRound()));

  if ($("alreadyDrawn")) {
    $("alreadyDrawn").addEventListener("change", () => {
      if (readInt("alreadyDrawn") < 3) setLockedDouble(false);
    });
  }

  runSafely(() => computeAndRender());
});
