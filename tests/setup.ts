import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// jsdom doesn't implement URL.createObjectURL / revokeObjectURL. Provide
// minimal shims so component code (and tests) can use them.
if (typeof URL.createObjectURL !== 'function') {
  let counter = 0;
  // @ts-expect-error jsdom augment
  URL.createObjectURL = () => {
    counter += 1;
    return `blob:fake-${counter}`;
  };
  // @ts-expect-error jsdom augment
  URL.revokeObjectURL = () => {
    /* no-op in tests */
  };
}
