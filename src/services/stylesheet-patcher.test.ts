import { describe, expect, it } from 'vitest';
import { neutralizeFixedPositioning } from './stylesheet-patcher';

describe('neutralizeFixedPositioning', () => {
  it('rewrites position:fixed to position:static, case/spacing-insensitive', () => {
    expect(neutralizeFixedPositioning('.pane { position: fixed; top: 0; }')).toBe('.pane { position: static; top: 0; }');
    expect(neutralizeFixedPositioning('.pane{POSITION:FIXED}')).toBe('.pane{position: static}');
  });

  it('leaves other position values untouched', () => {
    expect(neutralizeFixedPositioning('.pane { position: absolute; }')).toBe('.pane { position: absolute; }');
  });
});