import path from 'path';

const PROJECT_ROOT = process.cwd();

/** Directory containing clipped video outputs */
export const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');

/** Directory containing bulk-converted video outputs */
export const CONVERTED_DIR = path.join(PROJECT_ROOT, 'converted');

/** JSON file tracking per-video clip counters */
export const COUNTERS_FILE = path.join(PROJECT_ROOT, 'clip-counters.json');
