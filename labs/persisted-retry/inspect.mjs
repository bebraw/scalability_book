import { parseArgs } from "node:util";
import {
  openReceiver,
  openWorker,
  receiverRecord,
  workerRecord,
} from "./store.mjs";
const { values } = parseArgs({
  options: { dir: { type: "string", default: ".lab-data" } },
});
const receiver = openReceiver(values.dir);
const worker = openWorker(values.dir);
try {
  console.log(
    JSON.stringify(
      { receiver: receiverRecord(receiver), worker: workerRecord(worker) },
      null,
      2,
    ),
  );
} finally {
  receiver.close();
  worker.close();
}
