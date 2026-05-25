function $(id) {
  return document.getElementById(id);
}

function setInt(id, v) {
  $(id).value = String(Math.trunc(Number(v)));
}

function setIntArray(prefix, arr) {
  for (let i = 1; i <= 5; i++) {
    $(prefix + i).value = String(Math.trunc(Number(arr[i - 1] ?? 0)));
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
      rem = rem % this.d;
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
  const v = Number($(id).value);
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

function actionText(a) {
  if (a === "DRAW") return "继续抽取下一张";
  if (a === "CLAIM") return "关闭翻倍开始演算";
  if (a === "DOUBLE_CLAIM") return "打开翻倍开始演算";
  if (a === "OVERLOAD_STOP") return "溢出放弃挑战（可勾选“计入溢出”最大化当前奖励）";
  if (a === "NO_CHALLENGE") return "无剩余奖励次数";
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
  const frac = x.toFractionString();
  if (x.d === 1n) {
    el.textContent = x.n.toString();
  } else {
    el.textContent = x.toDecimal(0);
  }
  el.title = "";
}

function pct(x) {
  return `${(x * 100).toFixed(2)}%`;
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
    rewards: readRewards(),
    count_overload: $("countOverload").checked,
  };
}

function evalState(payload) {
  const init = payload.initial_card_nums;
  const cur = payload.card_nums;
  const totalPoints = payload.total_points;
  const alreadyDrawn = payload.already_drawn;
  const remainingChallenges = payload.remaining_challenges;
  const remainingDoubles = payload.remaining_doubles;
  const rewards = payload.rewards;
  const countOverload = !!payload.count_overload;

  if (!Array.isArray(init) || init.length !== 5) throw new Error("initial_card_nums length must be 5");
  if (!Array.isArray(cur) || cur.length !== 5) throw new Error("card_nums length must be 5");
  if (init.some((x) => x < 0) || cur.some((x) => x < 0)) throw new Error("card nums must be >= 0");
  if (!Array.isArray(rewards) || rewards.length !== 11) throw new Error("rewards length must be 11");
  if (alreadyDrawn < 0 || alreadyDrawn > 5) throw new Error("already_drawn must be in [0,5]");
  if (remainingChallenges < 0 || remainingDoubles < 0) throw new Error("remaining_challenges and remaining_doubles must be >= 0");

  if (remainingChallenges === 0) {
    return {
      action: "NO_CHALLENGE",
      current_reward: rewards[((totalPoints % 11) + 11) % 11],
      expectation_current: Frac.zero(),
      expectation_total: Frac.zero(),
      expectation_future: Frac.zero(),
      distribution: Array.from({ length: 11 }, (_, i) => ({ i, p: Frac.zero() })),
    };
  }

  const t0 = Math.trunc(remainingChallenges);
  const k0 = Math.min(Math.trunc(remainingDoubles), t0);
  const initArr = init.slice();
  const memo = new Map();

  function solve(cardNums, pts, drawn, t, k) {
    const key = `${cardNums.join(",")}|${pts}|${drawn}|${t}|${k}`;
    const cached = memo.get(key);
    if (cached) return cached;

    if (t === 0) {
      const zdist = Array.from({ length: 11 }, () => Frac.zero());
      const out0 = { total: Frac.zero(), current: Frac.zero(), dist: zdist, action: "NO_CHALLENGE" };
      memo.set(key, out0);
      return out0;
    }

    if (!countOverload && pts > 10) {
      const future = solve(initArr, 0, 0, t - 1, k);
      const zdist = Array.from({ length: 11 }, () => Frac.zero());
      const outO = { total: future.total, current: Frac.zero(), dist: zdist, action: "OVERLOAD_STOP" };
      memo.set(key, outO);
      return outO;
    }

    const idx = ((pts % 11) + 11) % 11;
    const rNow = rewards[idx];
    const futureKeep = solve(initArr, 0, 0, t - 1, k).total;
    let bestTotal = rNow.add(futureKeep);
    let bestCurrent = rNow;
    let bestAction = "CLAIM";

    if (k > 0) {
      const futureUse = solve(initArr, 0, 0, t - 1, k - 1).total;
      const t2 = rNow.mul(2).add(futureUse);
      if (t2.cmp(bestTotal) > 0) {
        bestTotal = t2;
        bestCurrent = rNow.mul(2);
        bestAction = "DOUBLE_CLAIM";
      }
    }

    const distStop = Array.from({ length: 11 }, () => Frac.zero());
    distStop[idx] = Frac.one();
    let bestDist = distStop;

    const remainingCards = cardNums.reduce((a, b) => a + b, 0);
    const canDraw = drawn < 5 && remainingCards > 0;
    if (canDraw) {
      const denom = Frac.from(remainingCards);
      let drawTotal = Frac.zero();
      let drawCurrent = Frac.zero();
      const drawDist = Array.from({ length: 11 }, () => Frac.zero());

      for (let i = 0; i < 5; i++) {
        const cnt = cardNums[i];
        if (cnt <= 0) continue;
        const p = Frac.from(cnt).div(denom);
        const nextCards = cardNums.slice();
        nextCards[i] -= 1;
        const son = solve(nextCards, pts + (i + 1), drawn + 1, t, k);
        drawTotal = drawTotal.add(p.mul(son.total));
        drawCurrent = drawCurrent.add(p.mul(son.current));
        for (let j = 0; j < 11; j++) {
          drawDist[j] = drawDist[j].add(p.mul(son.dist[j]));
        }
      }

      if (drawTotal.cmp(bestTotal) > 0) {
        bestTotal = drawTotal;
        bestCurrent = drawCurrent;
        bestDist = drawDist;
        bestAction = "DRAW";
      }
    }

    const out = { total: bestTotal, current: bestCurrent, dist: bestDist, action: bestAction };
    memo.set(key, out);
    return out;
  }

  const res = solve(cur.slice(), Math.trunc(totalPoints), Math.trunc(alreadyDrawn), t0, k0);
  const currentReward = rewards[((totalPoints % 11) + 11) % 11];
  return {
    action: res.action,
    current_reward: currentReward,
    expectation_current: res.current,
    expectation_total: res.total,
    expectation_future: res.total.sub(res.current),
    distribution: res.dist.map((p, i) => ({ i, p })),
  };
}

function render(data) {
  $("action").textContent = actionText(data.action);
  applyRewardText($("curReward"), data.current_reward);
  applyFracText($("expCur"), data.expectation_current, 6);
  applyFracText($("expTotal"), data.expectation_total, 6);
  applyFracText($("expFuture"), data.expectation_future, 6);

  const dist = data.distribution || [];
  const container = $("dist");
  container.innerHTML = "";
  for (const row of dist) {
    const i = row.i;
    const pf = row.p.toProbNumber(6);
    const line = document.createElement("div");
    line.className = "bar";

    const lab = document.createElement("div");
    lab.className = "lab";
    lab.textContent = String(i).padStart(2, "0");

    const track = document.createElement("div");
    track.className = "track";
    const fill = document.createElement("div");
    fill.className = "fill";
    fill.style.width = `${Math.max(0, Math.min(1, pf)) * 100}%`;
    track.appendChild(fill);

    const num = document.createElement("div");
    num.className = "num";
    const frac = row.p.toFractionString();
    if (frac.length > 16) {
      num.textContent = `${pct(pf)}`;
      num.title = frac;
    } else {
      num.textContent = `${pct(pf)} (${frac})`;
      num.title = "";
    }

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
  computeAndRender();
}

function computeAndRender() {
  const payload = parsePayload();
  const data = evalState(payload);
  render(data);
  return { payload, data };
}

function drawPoint(point) {
  const already = readInt("alreadyDrawn");
  if (already >= 5) throw new Error("已抽卡数已到 5，不能继续抽");
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

function startNextChallenge() {
  resetRound();
}

function claimReward(useDouble) {
  const n = readInt("remainingChallenges");
  if (n <= 0) throw new Error("剩余挑战次数为 0，不能领取");
  if (useDouble) {
    const m = readInt("remainingDoubles");
    if (m <= 0) throw new Error("剩余双倍次数为 0，不能双倍领取");
    setInt("remainingDoubles", m - 1);
  }
  setInt("remainingChallenges", n - 1);
  startNextChallenge();
}

window.addEventListener("DOMContentLoaded", () => {
  $("btnEval").addEventListener("click", async () => {
    try {
      computeAndRender();
    } catch (e) {
      $("err").textContent = String(e && e.message ? e.message : e);
    }
  });
  $("btnReset").addEventListener("click", () => {
    try {
      $("err").textContent = "";
      resetRound();
    } catch (e) {
      $("err").textContent = String(e && e.message ? e.message : e);
    }
  });

  $("btnDraw1").addEventListener("click", () => {
    try {
      $("err").textContent = "";
      drawPoint(1);
    } catch (e) {
      $("err").textContent = String(e && e.message ? e.message : e);
    }
  });
  $("btnDraw2").addEventListener("click", () => {
    try {
      $("err").textContent = "";
      drawPoint(2);
    } catch (e) {
      $("err").textContent = String(e && e.message ? e.message : e);
    }
  });
  $("btnDraw3").addEventListener("click", () => {
    try {
      $("err").textContent = "";
      drawPoint(3);
    } catch (e) {
      $("err").textContent = String(e && e.message ? e.message : e);
    }
  });
  $("btnDraw4").addEventListener("click", () => {
    try {
      $("err").textContent = "";
      drawPoint(4);
    } catch (e) {
      $("err").textContent = String(e && e.message ? e.message : e);
    }
  });
  $("btnDraw5").addEventListener("click", () => {
    try {
      $("err").textContent = "";
      drawPoint(5);
    } catch (e) {
      $("err").textContent = String(e && e.message ? e.message : e);
    }
  });
  $("btnDrawRand").addEventListener("click", () => {
    try {
      $("err").textContent = "";
      drawRandom();
    } catch (e) {
      $("err").textContent = String(e && e.message ? e.message : e);
    }
  });
  $("btnClaim").addEventListener("click", () => {
    try {
      $("err").textContent = "";
      claimReward(false);
    } catch (e) {
      $("err").textContent = String(e && e.message ? e.message : e);
    }
  });
  $("btnDoubleClaim").addEventListener("click", () => {
    try {
      $("err").textContent = "";
      claimReward(true);
    } catch (e) {
      $("err").textContent = String(e && e.message ? e.message : e);
    }
  });
  $("btnNextChallenge").addEventListener("click", () => {
    try {
      $("err").textContent = "";
      startNextChallenge();
    } catch (e) {
      $("err").textContent = String(e && e.message ? e.message : e);
    }
  });

  try {
    computeAndRender();
  } catch (e) {
    $("err").textContent = String(e && e.message ? e.message : e);
  }
});
