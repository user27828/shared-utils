/**
 * Helper functions
 */
import { isDev as utilsIsDev } from "../../utils/src/environment.js";
/**
 * @deprecated Use the consolidated `isDev` from '@user27828/shared-utils/utils/environment' instead.
 * This version will be removed in a future release.
 */
export const isDev = ({ xCriteria = null, } = {}) => utilsIsDev({ xCriteria, environment: "server" });
//# sourceMappingURL=functions.js.map