import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Option, OptionGroup } from '@elgato/utils';
import { JsonRpcRequest, JsonRpcResponse, JsonRpcError } from '@elgato/utils/rpc';

// Resolve the validator from the SDK utility package, so a separately installed
// root validator cannot mask an incompatible or vulnerable transitive version.
const { z } = createRequire(import.meta.resolve('@elgato/utils'))('zod/v4-mini');

test('SDK options retain primitive values and reject invalid settings', () => {
  for (const value of [false, 0, 'Synthetic scene']) {
    const option = { type: 'option', label: 'Synthetic option', value, disabled: false };
    const result = Option.safeParse({ ...option, ignored: true });
    assert.equal(result.success, true);
    assert.deepEqual(result.data, option);
  }
  for (const value of [{}, [], null, undefined]) {
    assert.equal(Option.safeParse({ type: 'option', label: 'Synthetic option', value }).success, false);
  }
  assert.equal(Option.safeParse({ type: 'option', label: 'Synthetic option', value: 'scene', disabled: 'false' }).success, false);
});

test('SDK option groups validate nested choices without changing their data', () => {
  const option = { type: 'option', label: 'Synthetic option', value: 'Synthetic scene' };
  const group = { type: 'option-group', label: 'Synthetic group', options: [option] };
  const nested = { ...group, options: [group, option], disabled: true };
  const result = OptionGroup.safeParse(nested);
  assert.equal(result.success, true);
  assert.deepEqual(result.data, nested);
  for (const options of [null, [{ ...option, value: {} }], [{ ...group, label: false }]]) {
    assert.equal(OptionGroup.safeParse({ ...group, options }).success, false);
  }
});

test('SDK RPC requests accept notifications and both parameter forms', () => {
  for (const request of [
    { jsonrpc: '2.0', method: 'synthetic' },
    { jsonrpc: '2.0', method: 'synthetic', id: 'test', params: { enabled: false } },
    { jsonrpc: '2.0', method: 'synthetic', id: 'test', params: [0, false, null] },
  ]) {
    const result = JsonRpcRequest.safeParse(request);
    assert.equal(result.success, true);
    assert.deepEqual(result.data, request);
  }
  for (const request of [
    { jsonrpc: '1.0', method: 'synthetic' },
    { jsonrpc: '2.0', method: 'synthetic', id: 1 },
    { jsonrpc: '2.0', method: 'synthetic', params: 'invalid' },
    { jsonrpc: '2.0', method: false },
  ]) assert.equal(JsonRpcRequest.safeParse(request).success, false);
});

test('SDK RPC responses retain results and reject malformed or extra fields', () => {
  for (const response of [
    { jsonrpc: '2.0', result: false, id: 'test' },
    { jsonrpc: '2.0', result: null, id: 'test' },
    { jsonrpc: '2.0', error: { code: -1, message: 'Synthetic error' }, id: 'test' },
    { jsonrpc: '2.0', error: { code: -1, message: 'Synthetic error' } },
  ]) {
    const result = JsonRpcResponse.safeParse(response);
    assert.equal(result.success, true);
    assert.deepEqual(result.data, response);
    assert.equal(JsonRpcResponse.safeParse({ ...response, extra: true }).success, false);
  }
  assert.equal(JsonRpcResponse.safeParse({ jsonrpc: '2.0', result: 0, id: 1 }).success, false);
  assert.equal(JsonRpcResponse.safeParse({ jsonrpc: '2.0', error: { code: 'invalid', message: 'Synthetic error' } }).success, false);
});

test('SDK RPC errors preserve optional data and require a numeric code', () => {
  for (const error of [
    { code: -1, message: 'Synthetic error' },
    { code: 0, message: 'Synthetic error', data: { synthetic: true } },
  ]) {
    const result = JsonRpcError.safeParse(error);
    assert.equal(result.success, true);
    assert.deepEqual(result.data, error);
  }
  for (const error of [null, {}, 'invalid', { code: '0', message: 'Synthetic error' }]) {
    assert.equal(JsonRpcError.safeParse(error).success, false);
  }
});

test('SDK validator rejects oversized bounded arrays before collecting element errors', () => {
  // GHSA-mrhx-c7xc-m3w5: a tiny fixture tests early rejection without a
  // resource-exhaustion workload. Unbounded collections are a separate concern.
  const schema = z.array(z.string()).check(z.maxLength(2));
  const result = schema.safeParse([0, 0, 0, 0]);
  assert.equal(result.success, false);
  assert.equal(result.error.issues.length, 1);
  assert.equal(result.error.issues[0].code, 'too_big');
  assert.deepEqual(schema.parse(['one', 'two']), ['one', 'two']);
});
