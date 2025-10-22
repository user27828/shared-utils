/**
 * Helper functions
 */

import { isDev as utilsIsDev } from "../../utils/index.js";

/**
 * @deprecated Use the consolidated `isDev` from '@shared-utils/utils' instead.
 * This version will be removed in a future release.
 */
export const isDev = ({
  xCriteria = null,
}: {
  xCriteria?: (() => boolean) | null;
} = {}): boolean => utilsIsDev({ xCriteria, environment: "server" });
