import { Queue } from "bullmq";
import env from "./env";

const queue = new Queue("wa", {
  connection: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    username: env.REDIS_USERNAME,
    password: env.REDIS_PASSWORD,
  }
});

export default queue;