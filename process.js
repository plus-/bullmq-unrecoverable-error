// eslint-disable-next-line @typescript-eslint/no-var-requires
const { UnrecoverableError } = require("bullmq");

module.exports = async (job) => {
  throw new UnrecoverableError("sandboxed processor");
};
