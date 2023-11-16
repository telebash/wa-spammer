import { RequestHandler } from "express";
import queue from "../queue";

export const start: RequestHandler = async (req, res) => {
  const { numbers, message } = req.body;
  const sessionId = req.params.sessionId;
  const job = await queue.add("startSpamming", { numbers, message, sessionId });
  res.status(200).json({ jobId: job.id })
} 