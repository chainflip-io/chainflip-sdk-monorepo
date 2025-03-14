import type { Environment } from 'vitest/environments';

export default {
  setup(global, options) {
    console.log('setup');
  },
  setupVM(options) {},
} as Environment;
