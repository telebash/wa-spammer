import { Router } from "express";
import { body } from "express-validator";
import requestValidator from "../middlewares/request-validator";
import sessionValidator from "../middlewares/session-validator";
import * as spamming from "../controllers/spamming";

const router = Router({ mergeParams: true });

router.post(
  '/start',
  body('numbers').isArray(),
  body('message').isString().notEmpty(),
  requestValidator,
  sessionValidator,
  spamming.start
);
