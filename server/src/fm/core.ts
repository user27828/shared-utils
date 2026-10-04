/** File Manager service core and connector contracts without Express routers. */
export { FmServiceCore } from "./FmServiceCore.js";
export type { FmServiceCoreConfig, FmDeleteOutcome } from "./FmServiceCore.js";
export type {
  FmConnector,
  FmConnectorWithTransaction,
  FmConnectorWithBatchVariantDelete,
  FmConnectorWithEntityLinks,
} from "./FmConnector.js";
export {
  hasTransaction,
  hasBatchVariantDelete,
  hasEntityLinks,
} from "./FmConnector.js";
