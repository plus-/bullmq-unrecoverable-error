import {
  Queue,
  QueueEvents,
  QueueScheduler,
  Job,
  delay,
  Worker,
  UnrecoverableError,
} from "bullmq";
import Redis from "ioredis";

const redis = new Redis();

beforeAll(() => {
  redis.flushdb();
});

afterAll(() => {
  redis.disconnect();
});

it("should not retry unrecoverable-error in standard processor", async () => {
  const connection = { host: "localhost" };

  const queueName = "queue1";

  const queue = new Queue(queueName, {
    connection,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 10,
    },
  });

  const queueEvents = new QueueEvents(queue.name, {
    connection,
  });

  const queueScheduler = new QueueScheduler(queueName, { connection });
  await queueScheduler.waitUntilReady();

  const worker = new Worker(
    queueName,
    () => {
      throw new UnrecoverableError("standard processor");
    },
    {
      connection,
    }
  );

  queueEvents.on("retries-exhausted", async ({ jobId }) => {
    const job = await queue.getJob(jobId);

    if (job) {
      console.log("retries-exhausted", job.attemptsMade, job.failedReason);
    }
  });

  worker.on("failed", async (job, err) => {
    console.log("failed", job.attemptsMade, err.message, err.name);
  });

  await worker.waitUntilReady();

  await queue.add(
    "test",
    { foo: "bar" },
    {
      attempts: 4,
    }
  );

  await delay(400);

  await worker.close();
  await queueEvents.close();
  await queueScheduler.close();
  await queue.close();
});

it("should not retry unrecoverable-error in sandboxed processor", async () => {
  const connection = { host: "localhost" };

  const queueName = "queue2";

  const queue = new Queue(queueName, {
    connection,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 10,
    },
  });

  const queueEvents = new QueueEvents(queue.name, {
    connection,
  });

  const queueScheduler = new QueueScheduler(queueName, { connection });
  await queueScheduler.waitUntilReady();

  const processFile = __dirname + "/process.js";

  const worker = new Worker(queueName, processFile, {
    connection,
  });

  queueEvents.on("retries-exhausted", async ({ jobId }) => {
    const job = await queue.getJob(jobId);

    if (job) {
      console.log("retries-exhausted", job.attemptsMade, job.failedReason);
    }
  });

  worker.on("failed", async (job, err) => {
    console.log("failed", job.attemptsMade, err.message, err.name);
  });

  await worker.waitUntilReady();

  await queue.add(
    "test",
    { foo: "bar" },
    {
      attempts: 4,
    }
  );

  await delay(400);

  await worker.close();
  await queueEvents.close();
  await queueScheduler.close();
  await queue.close();
});
