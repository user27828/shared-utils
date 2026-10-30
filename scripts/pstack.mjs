#!/usr/bin/env node

import { main } from "./agent-plugin-manager.mjs";

main(process.argv.slice(2), "pstack");
