import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EDGE_PROXY_ADDRESS, edgeAddressProblem } from '../scripts/lib/edge-address.mjs';

// What `docker inspect caddy --format '{{json .NetworkSettings.Networks.web}}'`
// prints, trimmed to the fields that matter.
const endpoint = (fields) => JSON.stringify({ Gateway: '172.18.0.1', IPPrefixLen: 16, ...fields });

test('the deploy accepts only an edge pinned to the address the portfolio trusts', () => {
  assert.equal(edgeAddressProblem(endpoint({ IPAMConfig: { IPv4Address: EDGE_PROXY_ADDRESS }, IPAddress: EDGE_PROXY_ADDRESS })), null);
  // The edge before the pin: a dynamic address that the next restart could move.
  assert.match(edgeAddressProblem(endpoint({ IPAMConfig: null, IPAddress: '172.18.0.2' })) ?? '', /pins no address on the web network, not 172\.18\.255\.254/);
  // A dynamic address that happens to match is still not pinned.
  assert.match(edgeAddressProblem(endpoint({ IPAMConfig: null, IPAddress: EDGE_PROXY_ADDRESS })) ?? '', /pins no address/);
  assert.match(edgeAddressProblem(endpoint({ IPAMConfig: {}, IPAddress: EDGE_PROXY_ADDRESS })) ?? '', /pins no address/);
  assert.match(
    edgeAddressProblem(endpoint({ IPAMConfig: { IPv4Address: '172.18.0.2' }, IPAddress: '172.18.0.2' })) ?? '',
    /pins 172\.18\.0\.2 on the web network, not 172\.18\.255\.254/,
  );
  // Pinned but stopped: Docker keeps the endpoint without an address.
  assert.match(edgeAddressProblem(endpoint({ IPAMConfig: { IPv4Address: EDGE_PROXY_ADDRESS }, IPAddress: '' })) ?? '', /at no address on the web network/);
  assert.match(edgeAddressProblem('null') ?? '', /isn't on the web network/);
  assert.match(edgeAddressProblem('Error: No such object: caddy') ?? '', /could not read the edge's address/);
});
