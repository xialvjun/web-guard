import path from 'path';

export const CONFIG = {
  PORT: 3000,
  DEFAULT_SCRIPT_TIMEOUT: 3e4,
  SCRIPT_PARALLEL: 8,
};

const config_file_relative_path = process.argv[2];
if (config_file_relative_path) {
  const config_file_absolute_path = path.join(process.cwd(), config_file_relative_path);
  const merge = require(config_file_absolute_path);
  Object.assign(CONFIG, merge);
}
