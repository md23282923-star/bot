/* =========================
   TTE CORE GAME LOGIC
   ========================= */

/* ---- CONFIG ---- */
const MAX_ENERGY = 1000;
const ENERGY_REFILL_PER_SEC = 1;
const SPIN_REWARD = 1000;
const AD_REWARD = 500;
const REF_PERCENT = 0.05; // 5%
let DAILY_CAP = 0;

/* ---- LOAD GLOBAL CONFIG ---- */
db.ref("config").on("value", s => {
  if (s.exists() && s.val().dailyCap) {
    DAILY_CAP = s.val().dailyCap;
  }
});

/* ---- ANTI CHEAT CHECK ---- */
function canEarn(amount) {
  if (!DAILY_CAP || DAILY_CAP === 0) return true;
  u.dailyEarn = u.dailyEarn || 0;
  return (u.dailyEarn + amount) <= DAILY_CAP;
}

/* ---- APPLY EARN ---- */
function addBalance(amount, source = "mine") {
  if (u.banned) {
    alert("Account banned");
    return false;
  }

  if (!canEarn(amount)) {
    alert("Daily earning limit reached");
    return false;
  }

  u.bal += amount;
  u.dailyEarn = (u.dailyEarn || 0) + amount;
  u.last = Date.now();

  // referral reward
  if (u.refBy && source === "mine") {
    const refReward = Math.floor(amount * REF_PERCENT);
    db.ref("users/" + u.refBy + "/bal")
      .transaction(b => (b || 0) + refReward);
  }

  save();
  return true;
}

/* ---- TAP ---- */
function tap() {
  if (u.energy <= 0) return;
  u.energy--;
  addBalance(1, "mine");
}

/* ---- PASSIVE INCOME ---- */
setInterval(() => {
  if (u.pph > 0) {
    const earn = u.pph / 3600;
    if (canEarn(earn)) {
      u.bal += earn;
      u.dailyEarn = (u.dailyEarn || 0) + earn;
    }
  }

  if (u.energy < MAX_ENERGY) u.energy += ENERGY_REFILL_PER_SEC;
  save(false);
}, 1000);

/* ---- SPIN ---- */
function spin() {
  if (u.spins <= 0) {
    alert("No spins left");
    return;
  }
  u.spins--;
  addBalance(SPIN_REWARD, "spin");
  alert("You won " + SPIN_REWARD + " TTE");
}

/* ---- ADS ---- */
function watchAd() {
  show_10499994().then(() => {
    addBalance(AD_REWARD, "ad");
    alert("Ad reward added");
  });
}

/* ---- REFERRAL INIT ---- */
function initReferral() {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get("start");
  if (ref && !u.refBy && ref !== uid) {
    u.refBy = ref;
    save();
  }
}

/* ---- SAVE ---- */
function save(updateUI = true) {
  db.ref("users/" + uid).update(u);
  if (updateUI && typeof render === "function") render();
}

/* ---- DAILY RESET ---- */
function dailyResetCheck() {
  const today = new Date().toDateString();
  if (u.lastDay !== today) {
    u.lastDay = today;
    u.dailyEarn = 0;
    u.spins = 1;
    save();
  }
}
setInterval(dailyResetCheck, 60000);
