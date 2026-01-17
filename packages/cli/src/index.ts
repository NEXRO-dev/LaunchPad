#!/usr/bin/env node
import { Command } from 'commander';
import { config } from 'dotenv';
import { iosCommand } from './commands/ios.js';
import { statusCommand } from './commands/status.js';
import { logsCommand } from './commands/logs.js';
import { loginCommand } from './commands/login.js';

// Load .env from current directory
config();

const program = new Command();

program
    .name('launchpad')
    .description('CLI for iOS Build & Submit to App Store Connect')
    .version('1.0.0');

// Register commands
iosCommand(program);
statusCommand(program);
logsCommand(program);
loginCommand(program);

program.parse();
