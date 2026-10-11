const User = require("../models/user.model");

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const fail = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// Throws unless `pin` is correct for this user. Locks after repeated failures.
async function verifyUserPin(userId, pin) {
  if (!/^\d{4}$/.test(String(pin || ""))) {
    throw fail("PIN must be exactly 4 digits", 400);
  }

  const user = await User.findById(userId).select("+pinHash");
  if (!user || !user.pinHash) {
    throw fail("No PIN is set for you. Ask HR to set your PIN.", 400);
  }

  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    const mins = Math.ceil((user.pinLockedUntil - new Date()) / 60000);
    throw fail(`Too many wrong attempts. Try again in ${mins} min.`, 429);
  }

  if (await user.verifyPin(pin)) {
    if (user.pinFailedAttempts || user.pinLockedUntil) {
      await User.updateOne(
        { _id: userId },
        { $set: { pinFailedAttempts: 0, pinLockedUntil: null } },
      );
    }
    return;
  }

  // Atomic increment so parallel guesses are still counted.
  const updated = await User.findByIdAndUpdate(
    userId,
    { $inc: { pinFailedAttempts: 1 } },
    { new: true },
  );

  if (updated.pinFailedAttempts >= MAX_ATTEMPTS) {
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          pinFailedAttempts: 0,
          pinLockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000),
        },
      },
    );
    throw fail(`Too many wrong attempts. Locked for ${LOCK_MINUTES} min.`, 429);
  }

  throw fail(
    `Incorrect PIN. ${MAX_ATTEMPTS - updated.pinFailedAttempts} attempts left.`,
    400,
  );
}

module.exports = { verifyUserPin };
