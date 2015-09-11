export const PROFILER_ACTIVE = process.env.INTERLOCK_PROFILER === "true";

const invocations = [];

function getStats () {
  const deduped = {};
  invocations.forEach(({ name, sec, nsec }) => {
    if (!(name in deduped)) {
      deduped[name] = { total: 0, events: 0 };
    }
    deduped[name].total += sec * 1000000000 + nsec;
    deduped[name].events += 1;
  });

  const sorted = {};
  Object.keys(deduped)
    .sort((fnA, fnB) => deduped[fnB].total - deduped[fnA].total)
    .map(name => sorted[name] = deduped[name])
    .forEach(record => {
      record.avg = record.total / record.events;
    });

  return sorted;
}

function printReport () {
  const stats = getStats();
  Object.keys(stats).forEach(name => {
    const stat = stats[name];
    const totalMs = (stat.total / 1000000).toFixed(3);
    const avg = stat.avg.toFixed();
    const avgMs = (stat.avg / 1000000).toFixed(3);

    /* eslint-disable no-console */
    console.log(`
${name}:
  number of events: ${stat.events}
  total time: ~${totalMs} ms (${stat.total} ns)
  average time: ${avgMs} ms (${avg} ns)`);
    /* eslint-enable no-console */
  });

}

if (PROFILER_ACTIVE) {
  process.on("exit", function (err) {
    if (err) {
      console.log(err); // eslint-disable-line no-console
    }
    printReport();
  });
}

export function createEvent (name) {
  const startTime = process.hrtime();
  return function () {
    const [sec, nsec] = process.hrtime(startTime);
    invocations.push({ name, sec, nsec });
  };
}
