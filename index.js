/* The maximum number of minutes in a period (a day) */

const MAX_IN_PERIOD = 1440;

/* Valid appliance states */

const States = Object.freeze({
  ON: 'on',
  OFF: 'off',
  AUTO_OFF: 'auto-off',
});

/* Basic input validation */

const isInteger = (number) => Number.isInteger(number);

const validateInput = (validStates, profile, day) => {
  // Validate day type and range
  if (day !== undefined) {
    if (!isInteger(day)) throw new Error('Day must be an integer');

    if (day < 1 || day > 365) throw new Error('Input day out of range');
  }

  const { initial, events } = profile;

  // Validate initial state
  if (!validStates.includes(initial))
    throw new Error(`Invalid initial state: ${initial}`);

  // Validate events
  for (const event of events) {
    const { timestamp, state } = event;

    if (!isInteger(timestamp) || timestamp < 0)
      throw new Error(`Invalid timestamp: ${timestamp}`);

    // Restrict timestamp for a single day
    if (!day && timestamp >= MAX_IN_PERIOD)
      throw new Error(`Timestamp exceeds daily range: ${timestamp}`);

    if (!validStates.includes(state))
      throw new Error(`Invalid event state: ${state}`);
  }
};

/**
 * PART 1
 *
 * You have an appliance that uses energy, and you want to calculate how
 * much energy it uses over a period of time.
 *
 * As an input to your calculations, you have a series of events that contain
 * a timestamp and the new state (on or off). You are also given the initial
 * state of the appliance. From this information, you will need to calculate
 * the energy use of the appliance i.e. the amount of time it is switched on.
 *
 * The amount of energy it uses is measured in 1-minute intervals over the
 * period of a day. Given there is 1440 minutes in a day (24 * 60), if the
 * appliance was switched on the entire time, its energy usage would be 1440.
 * To simplify calculations, timestamps range from 0 (beginning of the day)
 * to 1439 (last minute of the day).
 *
 * HINT: there is an additional complication with the last two tests that
 * introduce spurious state change events (duplicates at different time periods).
 * Focus on getting these tests working after satisfying the first tests.
 *
 * The structure for `profile` looks like this (as an example):
 * ```
 * {
 *    initial: 'on',
 *    events: [
 *      { state: 'off', timestamp: 50 },
 *      { state: 'on', timestamp: 304 },
 *      { state: 'off', timestamp: 600 },
 *    ]
 * }
 * ```
 */

const calculateEnergyUsageSimple = (profile) => {
  const { ON, OFF } = States;

  validateInput([ON, OFF], profile);

  const { initial, events } = profile;

  // If there are no events, return the energy used based on the initial state
  if (!events.length) return initial === ON ? MAX_IN_PERIOD : 0;

  let currentTime = 0;
  let currentState = initial;
  let energyUsed = 0;

  for (const event of events) {
    const { timestamp, state } = event;

    // If energy was used in the previous period, add it to the total
    if (currentState === ON) energyUsed += timestamp - currentTime;

    currentState = state;
    currentTime = timestamp;
  }

  // If the final state was 'on', add the energy used during remaining time in the period
  if (currentState === ON) energyUsed += MAX_IN_PERIOD - currentTime;

  return energyUsed;
};

/**
 * PART 2
 *
 * You purchase an energy-saving device for your appliance in order
 * to cut back on its energy usage. The device is smart enough to shut
 * off the appliance after it detects some period of disuse, but you
 * can still switch on or off the appliance as needed.
 *
 * You are keen to find out if your shiny new device was a worthwhile
 * purchase. Its success is measured by calculating the amount of
 * energy *saved* by device.
 *
 * To assist you, you now have a new event type that indicates
 * when the appliance was switched off by the device (as opposed to switched
 * off manually). Your new states are:
 * * 'on'
 * * 'off' (manual switch off)
 * * 'auto-off' (device automatic switch off)
 *
 * (The `profile` structure is the same, except for the new possible
 * value for `initial` and `state`.)
 *
 * Write a function that calculates the *energy savings* due to the
 * periods of time when the device switched off your appliance. You
 * should not include energy saved due to manual switch offs.
 *
 * You will need to account for redundant/non-sensical events e.g.
 * an off event after an auto-off event, which should still count as
 * an energy savings because the original trigger was the device
 * and not manual intervention.
 */

const isInvalidTransition = (from, to) => {
  const { OFF, AUTO_OFF } = States;
  return (from === AUTO_OFF && to === OFF) || (from === OFF && to === AUTO_OFF);
};

const calculateEnergySavings = (profile) => {
  const { ON, OFF, AUTO_OFF } = States;

  validateInput([ON, OFF, AUTO_OFF], profile);

  const { initial, events } = profile;

  // If there are no events, return full day if 'auto-off', else 0
  if (!events.length) return initial === AUTO_OFF ? MAX_IN_PERIOD : 0;

  let currentTime = 0;
  let currentState = initial;
  let energySaved = 0;

  for (const event of events) {
    const { timestamp, state } = event;

    // Only count energy savings for 'auto_off' to 'on transitions
    if (currentState === AUTO_OFF && state === ON)
      energySaved += timestamp - currentTime;

    // Skip duplicate events and invalid transitions
    if (currentState !== state && !isInvalidTransition(currentState, state)) {
      currentState = state;
      currentTime = timestamp;
    }
  }

  // If the final state was 'auto_off', add the energy saved during remaining time in the period
  if (currentState === AUTO_OFF) energySaved += MAX_IN_PERIOD - currentTime;

  return energySaved;
};

/**
 * PART 3
 *
 * The process of producing metrics usually requires handling multiple days of data. The
 * examples so far have produced a calculation assuming the day starts at '0' for a single day.
 *
 * In this exercise, the timestamp field contains the number of minutes since a
 * arbitrary point in time (the "Epoch"). To simplify calculations, assume:
 *  - the Epoch starts at the beginning of the month (i.e. midnight on day 1 is timestamp 0)
 *  - our calendar simply has uniform length 'days' - the first day is '1' and the last day is '365'
 *  - the usage profile data will not extend more than one month
 *
 * Your function should calculate the energy usage over a particular day, given that
 * day's number. It will have access to the usage profile over the month.
 *
 * It should also throw an error if the day value is invalid i.e. if it is out of range
 * or not an integer. Specific error messages are expected - see the tests for details.
 *
 * (The `profile` structure is the same as part 1, but remember that timestamps now extend
 * over multiple days)
 *
 * HINT: You are encouraged to re-use `calculateEnergyUsageSimple` from PART 1 by
 * constructing a usage profile for that day by slicing up and rewriting up the usage profile you have
 * been given for the month.
 */

const calculateEnergyUsageForDay = (monthUsageProfile, day) => {
  const { ON, OFF } = States;

  validateInput([ON, OFF], monthUsageProfile, day);

  // Calculate the start and end timestamps for the given day
  const { initial, events } = monthUsageProfile;
  const startOfDay = (day - 1) * MAX_IN_PERIOD;
  const endOfDay = day * MAX_IN_PERIOD;

  let currentState = initial;

  // Determine the state at the start of the day
  for (const event of events) {
    if (event.timestamp >= startOfDay) break;

    currentState = event.state;
  }

  // Slice events that fall within the day
  const dayEvents = events
    .filter(
      (event) => event.timestamp >= startOfDay && event.timestamp < endOfDay
    )
    .map((event) => ({
      timestamp: event.timestamp - startOfDay,
      state: event.state,
    }));

  // Build the single day profile
  const dayProfile = {
    initial: currentState,
    events: dayEvents,
  };

  return calculateEnergyUsageSimple(dayProfile);
};

module.exports = {
  calculateEnergyUsageSimple,
  calculateEnergySavings,
  calculateEnergyUsageForDay,
  MAX_IN_PERIOD,
};
