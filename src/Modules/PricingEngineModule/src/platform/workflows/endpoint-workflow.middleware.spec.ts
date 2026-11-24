import { EndpointWorkflowExecutor } from './endpoint-workflow.executor';
import { EndpointWorkflowMiddleware, shouldSkip } from './endpoint-workflow.middleware';
import { EndpointWorkflowRegistry } from './endpoint-workflow.registry';
import { EndpointWorkflowEntry } from './endpoint-workflow.types';
import { InMemoryIdempotencyStore } from './in-memory-idempotency-store';
import { InMemorySagaStore, sharedInMemorySagaStore } from './in-memory-saga-store';

jest.mock('../gateway-jwt.middleware', () => ({
  createGatewayServiceToken: (m: string) => `token-for-${m}`,
}));

function entry(overrides: Partial<EndpointWorkflowEntry>): EndpointWorkflowEntry {
  return {
    name: 'wf',
    moduleName: 'OrderModule',
    endpointPath: '/api/order-module/place-order',
    httpMethod: 'POST',
    description: '',
    isActive: true,
    workflowContent: 'kind: endpoint\nname: wf\nsteps:\n  ok:\n    transitions:\n      - condition: default\n        action: success\n',
    ...overrides,
  };
}

function registryWith(entries: EndpointWorkflowEntry[]): EndpointWorkflowRegistry {
  const registry = new EndpointWorkflowRegistry();
  registry.register(entries);
  return registry;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function mockRes() {
  const res: any = { statusCode: 0, body: undefined, headers: {} as Record<string, string>, headersSent: false };
  res.setHeader = (k: string, v: string) => { res.headers[k] = v; };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: unknown) => { res.body = b; return res; };
  res.send = (b: unknown) => { res.rawBody = b; res.body = typeof b === 'string' ? JSON.parse(b) : b; return res; };
  return res;
}

function mockReq(
  method: string,
  path: string,
  body?: unknown,
  query: Record<string, string> = {},
  headers: Record<string, string> = {},
): any {
  return { method, path, url: path, headers, query, body, readable: false };
}

describe('EndpointWorkflowRegistry path matching', () => {
  it('matches exact path case-insensitively, ignoring trailing slash', () => {
    const registry = registryWith([entry({})]);
    expect(registry.find('POST', '/api/order-module/place-order')?.entry.name).toBe('wf');
    expect(registry.find('post', '/API/Order-Module/Place-Order/')?.entry.name).toBe('wf');
    expect(registry.find('POST', 'api/order-module/place-order')?.entry.name).toBe('wf');
  });

  it('does not match a different method or path', () => {
    const registry = registryWith([entry({})]);
    expect(registry.find('GET', '/api/order-module/place-order')).toBeNull();
    expect(registry.find('POST', '/api/order-module/other')).toBeNull();
  });

  it('matches {param} templates and extracts parameters', () => {
    const registry = registryWith([
      entry({ endpointPath: '/api/orders/{orderId}/lines/{lineId}', httpMethod: 'GET' }),
    ]);
    const match = registry.find('GET', '/api/orders/42/lines/a%20b');
    expect(match?.pathParameters).toEqual({ orderId: '42', lineId: 'a b' });
    expect(registry.find('GET', '/api/orders/42')).toBeNull();
  });

  it('matches optional {param?} with and without the segment', () => {
    const registry = registryWith([
      entry({ endpointPath: '/api/list/{page?}', httpMethod: 'GET' }),
    ]);
    expect(registry.find('GET', '/api/list/3')?.pathParameters).toEqual({ page: '3' });
    expect(registry.find('GET', '/api/list')?.pathParameters).toEqual({});
  });

  it('skips inactive entries', () => {
    const registry = registryWith([entry({ isActive: false })]);
    expect(registry.size).toBe(0);
    expect(registry.find('POST', '/api/order-module/place-order')).toBeNull();
  });
});

describe('shouldSkip', () => {
  it.each(['/', '/hc', '/health', '/metrics', '/swagger/index.html', '/favicon.ico'])('skips %s', (p) => {
    expect(shouldSkip(p)).toBe(true);
  });
  it('does not skip api paths', () => {
    expect(shouldSkip('/api/x')).toBe(false);
  });
});

describe('EndpointWorkflowMiddleware', () => {
  const yaml = `
kind: endpoint
name: Place order
steps:
  charge:
    url: "{{QuickcodeClients.PaymentApi}}/payments/{{input.orderId}}"
    method: POST
    headers:
      Authorization: "Bearer {{GatewayServiceToken.PaymentModule}}"
    body:
      amount: "{{input.amount}}"
    timeoutSeconds: 5
    transitions:
      - condition: charge.statusCode == 200
        action: notify
      - condition: default
        action: fail
  notify:
    url: "{{QuickcodeClients.NotifyApi}}/send"
    method: GET
    transitions:
      - condition: default
        action: success
output:
  ok: true
  orderId: "{{input.orderId}}"
  paymentId: "{{charge.response.id}}"
  code: "{{charge.statusCode}}"
  payment: "{{charge.response}}"
`;

  beforeEach(() => {
    process.env.QuickcodeClients__PaymentApi = 'http://payments/';
    process.env.QuickcodeClients__NotifyApi = 'http://notify';
  });
  afterEach(() => {
    delete process.env.QuickcodeClients__PaymentApi;
    delete process.env.QuickcodeClients__NotifyApi;
  });

  function build(
    entries: EndpointWorkflowEntry[],
    fetchImpl: jest.Mock,
    idempotencyStore: InMemoryIdempotencyStore = new InMemoryIdempotencyStore(),
  ) {
    const executor = new EndpointWorkflowExecutor();
    executor.fetchImpl = fetchImpl as any;
    return new EndpointWorkflowMiddleware(registryWith(entries), executor, idempotencyStore);
  }

  it('calls next() when nothing matches or path is skipped', async () => {
    const mw = build([entry({})], jest.fn());
    const next = jest.fn();
    await mw.use(mockReq('GET', '/api/none'), mockRes(), next);
    await mw.use(mockReq('POST', '/health'), mockRes(), next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('runs workflow and returns projected output', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { id: 'p-1' }))
      .mockResolvedValueOnce(jsonResponse(200, {}));
    const mw = build(
      [entry({ endpointPath: '/api/orders/{orderId}/place', workflowContent: yaml })],
      fetchImpl,
    );
    const res = mockRes();
    const next = jest.fn();

    await mw.use(mockReq('POST', '/api/orders/7/place', { amount: 12 }), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, orderId: 7, paymentId: 'p-1', code: 200, payment: { id: 'p-1' } });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://payments/payments/7');
    expect(init.method).toBe('POST');
    expect(init.headers.get('Authorization')).toBe('Bearer token-for-PaymentModule');
    expect(init.body).toBe(JSON.stringify({ amount: '12' }));
    expect(fetchImpl.mock.calls[1][0]).toBe('http://notify/send');
    expect(res.headers['X-Correlation-Id']).toBeTruthy();
  });

  it('returns 502 when a transition resolves to fail', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(jsonResponse(500, { error: 'boom' }));
    const mw = build([entry({ workflowContent: yaml })], fetchImpl);
    const res = mockRes();

    await mw.use(mockReq('POST', '/api/order-module/place-order', { amount: 1 }), res, jest.fn());

    expect(res.statusCode).toBe(502);
    expect(res.body.error).toBe('Endpoint workflow failed');
    expect(res.body.steps['charge.statusCode']).toBe(500);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns 502 when the HTTP call throws', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const mw = build([entry({ workflowContent: yaml })], fetchImpl);
    const res = mockRes();
    await mw.use(mockReq('POST', '/api/order-module/place-order', {}), res, jest.fn());
    expect(res.statusCode).toBe(502);
  });

  it('returns steps when workflow has no output', async () => {
    const content = `kind: endpoint
name: simple
steps:
  ping:
    url: http://svc/ping
    method: GET
    transitions:
      - condition: ping.statusCode == 200
        action: success
      - condition: default
        action: fail
`;
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, { pong: true }));
    const mw = build([entry({ httpMethod: 'GET', workflowContent: content })], fetchImpl);
    const res = mockRes();
    await mw.use(mockReq('GET', '/api/order-module/place-order'), res, jest.fn());
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ 'ping.statusCode': 200, 'ping.response': { pong: true } });
  });

  it('returns 500 on invalid YAML', async () => {
    const mw = build([entry({ workflowContent: 'steps: [unclosed' })], jest.fn());
    const res = mockRes();
    await mw.use(mockReq('POST', '/api/order-module/place-order', {}), res, jest.fn());
    expect(res.statusCode).toBe(500);
  });
});

describe('EndpointWorkflowMiddleware idempotency', () => {
  const yaml = `kind: endpoint
name: Place order
steps:
  charge:
    url: http://payments/charge
    method: POST
    transitions:
      - condition: charge.statusCode == 200
        action: success
      - condition: default
        action: fail
output:
  ok: true
  paymentId: "{{charge.response.id}}"
`;
  const path = '/api/order-module/place-order';

  function build(fetchImpl: jest.Mock, store = new InMemoryIdempotencyStore(), content = yaml) {
    const executor = new EndpointWorkflowExecutor(new InMemorySagaStore());
    executor.fetchImpl = fetchImpl as any;
    const mw = new EndpointWorkflowMiddleware(
      registryWith([entry({ name: 'wf-idem', workflowContent: content })]),
      executor,
      store,
    );
    return { mw, store };
  }

  it('replays the cached response for the same Idempotency-Key', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, { id: 'p-1' }));
    const { mw } = build(fetchImpl);

    const first = mockRes();
    await mw.use(mockReq('POST', path, {}, {}, { 'idempotency-key': 'abc' }), first, jest.fn());
    expect(first.statusCode).toBe(200);
    expect(first.body).toEqual({ ok: true, paymentId: 'p-1' });
    expect(first.headers['X-Idempotency-Replayed']).toBeUndefined();

    const second = mockRes();
    const next = jest.fn();
    await mw.use(mockReq('POST', path, {}, {}, { 'idempotency-key': 'abc' }), second, next);

    expect(next).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(second.statusCode).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(second.headers['Content-Type']).toBe('application/json');
    expect(second.headers['X-Idempotency-Replayed']).toBe('true');
  });

  it('accepts X-Idempotency-Key and stores under endpoint|workflow|raw', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, { id: 'p-2' }));
    const { mw, store } = build(fetchImpl);

    await mw.use(mockReq('POST', path, {}, {}, { 'x-idempotency-key': 'k-x' }), mockRes(), jest.fn());
    const record = await store.tryGet('endpoint|wf-idem|k-x');
    expect(record?.statusCode).toBe(200);
    expect(JSON.parse(record!.body)).toEqual({ ok: true, paymentId: 'p-2' });

    const replay = mockRes();
    await mw.use(mockReq('POST', path, {}, {}, { 'x-idempotency-key': 'k-x' }), replay, jest.fn());
    expect(replay.headers['X-Idempotency-Replayed']).toBe('true');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('executes again for a different key', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, { id: 'p-1' }));
    const { mw } = build(fetchImpl);

    await mw.use(mockReq('POST', path, {}, {}, { 'idempotency-key': 'one' }), mockRes(), jest.fn());
    const res = mockRes();
    await mw.use(mockReq('POST', path, {}, {}, { 'idempotency-key': 'two' }), res, jest.fn());

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(res.headers['X-Idempotency-Replayed']).toBeUndefined();
  });

  it('does not cache or replay when no key is supplied', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, { id: 'p-1' }));
    const { mw } = build(fetchImpl);
    await mw.use(mockReq('POST', path, {}), mockRes(), jest.fn());
    await mw.use(mockReq('POST', path, {}), mockRes(), jest.fn());
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('caches 502 failures including sagaId and compensatedSteps', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(500, { error: 'boom' }));
    const { mw } = build(fetchImpl);

    const first = mockRes();
    await mw.use(mockReq('POST', path, {}, {}, { 'idempotency-key': 'f1' }), first, jest.fn());
    expect(first.statusCode).toBe(502);
    expect(first.body.sagaId).toEqual(expect.any(String));
    expect(first.body.compensatedSteps).toEqual([]);

    const second = mockRes();
    await mw.use(mockReq('POST', path, {}, {}, { 'idempotency-key': 'f1' }), second, jest.fn());
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(second.statusCode).toBe(502);
    expect(second.body).toEqual(first.body);
    expect(second.headers['X-Idempotency-Replayed']).toBe('true');
  });

  it('does not cache unexpected 500 errors', async () => {
    const { mw, store } = build(jest.fn(), new InMemoryIdempotencyStore(), 'steps: [unclosed');

    const res = mockRes();
    await mw.use(mockReq('POST', path, {}, {}, { 'idempotency-key': 'e1' }), res, jest.fn());
    expect(res.statusCode).toBe(500);
    expect(await store.tryGet('endpoint|wf-idem|e1')).toBeUndefined();

    const again = mockRes();
    await mw.use(mockReq('POST', path, {}, {}, { 'idempotency-key': 'e1' }), again, jest.fn());
    expect(again.statusCode).toBe(500);
    expect(again.headers['X-Idempotency-Replayed']).toBeUndefined();
  });
});

describe('EndpointWorkflowExecutor advanced steps', () => {
  function run(content: string, fetchImpl: jest.Mock, input: Record<string, unknown> = {}, store = new InMemorySagaStore()) {
    const executor = new EndpointWorkflowExecutor(store);
    executor.fetchImpl = fetchImpl as any;
    return executor.execute(entry({ workflowContent: content }), input, 'corr-1').then((result) => ({ result, store }));
  }

  const urls = (fetchImpl: jest.Mock): string[] => fetchImpl.mock.calls.map((c) => c[0] as string);

  describe('parallel', () => {
    const yaml = (join: string) => `kind: endpoint
name: par
steps:
  fan:
    parallel: [a, b]
    join: ${join}
    transitions:
      - condition: fan.statusCode == 200
        action: after
      - condition: default
        action: fail
  a:
    url: http://svc/a
  b:
    url: http://svc/b
  after:
    url: http://svc/after
`;

    it('join all: both children succeed -> coordinator continues', async () => {
      const fetchImpl = jest.fn().mockImplementation(async () => jsonResponse(200, { ok: 1 }));
      const { result } = await run(yaml('all'), fetchImpl);
      expect(result.success).toBe(true);
      expect(urls(fetchImpl).sort()).toEqual(['http://svc/a', 'http://svc/after', 'http://svc/b']);
      expect(result.steps['fan.statusCode']).toBe(200);
      expect(result.steps['fan.response']).toEqual({ ok: true });
    });

    it('join all: a failing child fails the coordinator (500)', async () => {
      const fetchImpl = jest.fn().mockImplementation(async (url: string) =>
        url.endsWith('/b') ? jsonResponse(500, {}) : jsonResponse(200, {}),
      );
      const { result } = await run(yaml('all'), fetchImpl);
      expect(result.success).toBe(false);
      expect(result.steps['fan.statusCode']).toBe(500);
      expect(urls(fetchImpl)).not.toContain('http://svc/after');
    });

    it('join any: one success is enough', async () => {
      const fetchImpl = jest.fn().mockImplementation(async (url: string) =>
        url.endsWith('/b') ? jsonResponse(500, {}) : jsonResponse(200, {}),
      );
      const { result } = await run(yaml('any'), fetchImpl);
      expect(result.success).toBe(true);
      expect(result.steps['fan.statusCode']).toBe(200);
    });

    it('join failFast: first failure cancels slow siblings', async () => {
      let aborted = false;
      const fetchImpl = jest.fn().mockImplementation((url: string, init: RequestInit) => {
        if (url.endsWith('/b')) return Promise.resolve(jsonResponse(500, {}));
        return new Promise((_, reject) => {
          init.signal!.addEventListener('abort', () => {
            aborted = true;
            reject(new Error('aborted'));
          });
        });
      });
      const { result } = await run(yaml('failFast'), fetchImpl);
      expect(result.success).toBe(false);
      expect(aborted).toBe(true);
      expect(result.steps['fan.statusCode']).toBe(500);
    });

    it('returns join result without transitions', async () => {
      const content = `kind: endpoint
name: par
steps:
  fan:
    parallel: [a]
  a:
    url: http://svc/a
`;
      const fetchImpl = jest.fn().mockImplementation(async () => jsonResponse(200, {}));
      const { result } = await run(content, fetchImpl);
      expect(result.success).toBe(true);
    });
  });

  describe('foreach', () => {
    const yaml = (extra = '') => `kind: endpoint
name: each
steps:
  loop:
    foreach: "{{input.items}}"
    step: send
    ${extra}
    transitions:
      - condition: loop.statusCode == 200
        action: done
  send:
    url: http://svc/items/{{item.id}}
    method: POST
    body:
      sku: "{{item.sku}}"
  done:
    url: http://svc/done
`;

    it('sequential: resolves {{item.*}} per item and stores indexed results', async () => {
      const fetchImpl = jest.fn().mockImplementation(async () => jsonResponse(200, { saved: true }));
      const items = [{ id: 1, sku: 'a' }, { id: 2, sku: 'b' }];
      const { result } = await run(yaml(), fetchImpl, { items });
      expect(result.success).toBe(true);
      expect(urls(fetchImpl)).toEqual(['http://svc/items/1', 'http://svc/items/2', 'http://svc/done']);
      expect(fetchImpl.mock.calls[1][1].body).toBe(JSON.stringify({ sku: 'b' }));
      expect(result.steps['send.0.statusCode']).toBe(200);
      expect(result.steps['send.1.response']).toEqual({ saved: true });
    });

    it('sequential: stops on first failing item', async () => {
      const fetchImpl = jest.fn().mockImplementation(async (url: string) =>
        url.endsWith('/1') ? jsonResponse(500, {}) : jsonResponse(200, {}),
      );
      const { result } = await run(yaml(), fetchImpl, { items: [{ id: 1 }, { id: 2 }] });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(result.steps['loop.statusCode']).toBe(500);
    });

    it('parallel mode runs all items and reports failures', async () => {
      const fetchImpl = jest.fn().mockImplementation(async (url: string) =>
        url.endsWith('/3') ? jsonResponse(500, {}) : jsonResponse(200, {}),
      );
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const { result } = await run(yaml('mode: parallel'), fetchImpl, { items });
      expect(fetchImpl).toHaveBeenCalledTimes(3);
      expect(result.steps['send.2.statusCode']).toBe(500);
      expect(result.steps['loop.statusCode']).toBe(500);
    });

    it('honours as: alias and maxItems', async () => {
      const content = `kind: endpoint
name: each
steps:
  loop:
    foreach: "{{input.rows}}"
    as: row
    maxItems: 2
    step: send
  send:
    url: http://svc/{{row.id}}
`;
      const fetchImpl = jest.fn().mockImplementation(async () => jsonResponse(200, {}));
      const { result } = await run(content, fetchImpl, { rows: [{ id: 'x' }, { id: 'y' }, { id: 'z' }] });
      expect(result.success).toBe(true);
      expect(urls(fetchImpl)).toEqual(['http://svc/x', 'http://svc/y']);
    });

    it('empty array: success and continues to coordinator transitions', async () => {
      const fetchImpl = jest.fn().mockImplementation(async () => jsonResponse(200, {}));
      const { result } = await run(yaml(), fetchImpl, { items: [] });
      expect(result.success).toBe(true);
      expect(urls(fetchImpl)).toEqual(['http://svc/done']);
    });

    it('fails when the expression is not an array', async () => {
      const fetchImpl = jest.fn();
      const { result } = await run(yaml(), fetchImpl, { items: 'nope' });
      expect(result.success).toBe(false);
      expect(fetchImpl).not.toHaveBeenCalled();
    });
  });

  describe('compensate + saga', () => {
    const yaml = `kind: endpoint
name: order
steps:
  charge:
    url: http://svc/charge
    method: POST
    compensate: refund
    transitions:
      - condition: default
        action: reserve
  reserve:
    url: http://svc/reserve
    method: POST
    compensate: release
    transitions:
      - condition: default
        action: ship
  ship:
    url: http://svc/ship
    method: POST
    transitions:
      - condition: ship.statusCode == 200
        action: success
      - condition: default
        action: fail
  refund:
    url: http://svc/refund
    method: POST
    transitions:
      - condition: default
        action: ship
  release:
    url: http://svc/release
    method: POST
`;

    it('runs compensations LIFO on failure without following their transitions', async () => {
      const fetchImpl = jest.fn().mockImplementation(async (url: string) =>
        url.endsWith('/ship') ? jsonResponse(500, {}) : jsonResponse(200, {}),
      );
      const { result, store } = await run(yaml, fetchImpl);
      expect(result.success).toBe(false);
      expect(urls(fetchImpl)).toEqual([
        'http://svc/charge',
        'http://svc/reserve',
        'http://svc/ship',
        'http://svc/release',
        'http://svc/refund',
      ]);
      expect(result.compensatedSteps).toEqual(['release', 'refund']);
      const saga = await store.get(result.sagaId!);
      expect(saga?.status).toBe('Compensated');
      expect(saga?.completedSteps).toEqual(['charge', 'reserve']);
      expect(saga?.compensatedSteps).toEqual(['reserve', 'charge']);
      expect(saga?.completedAt).toBeInstanceOf(Date);
    });

    it('does not compensate on success; saga Completed', async () => {
      const fetchImpl = jest.fn().mockImplementation(async () => jsonResponse(200, {}));
      const { result, store } = await run(yaml, fetchImpl);
      expect(result.success).toBe(true);
      expect(result.compensatedSteps).toEqual([]);
      expect(urls(fetchImpl)).not.toContain('http://svc/refund');
      expect((await store.get(result.sagaId!))?.status).toBe('Completed');
    });

    it('saga is Failed when nothing was registered for compensation', async () => {
      const content = `kind: endpoint
name: f
steps:
  only:
    url: http://svc/only
`;
      const fetchImpl = jest.fn().mockImplementation(async () => jsonResponse(500, {}));
      const { result, store } = await run(content, fetchImpl);
      expect(result.success).toBe(false);
      expect((await store.get(result.sagaId!))?.status).toBe('Failed');
    });

    it('continues compensating when one compensation fails', async () => {
      const fetchImpl = jest.fn().mockImplementation(async (url: string) =>
        url.endsWith('/ship') || url.endsWith('/release') ? jsonResponse(500, {}) : jsonResponse(200, {}),
      );
      const { result } = await run(yaml, fetchImpl);
      expect(urls(fetchImpl)).toContain('http://svc/refund');
      expect(result.compensatedSteps).toEqual(['refund']);
    });

    it('uses the shared default saga store when none is injected', async () => {
      const executor = new EndpointWorkflowExecutor();
      executor.fetchImpl = jest.fn().mockImplementation(async () => jsonResponse(200, {})) as any;
      const result = await executor.execute(entry({ workflowContent: yaml }), {});
      expect((await sharedInMemorySagaStore.get(result.sagaId!))?.status).toBe('Completed');
    });
  });

  describe('repeat', () => {
    it('retries then succeeds and exposes currentRetryCount', async () => {
      const content = `kind: endpoint
name: retry
variables:
  retryBaseDelayMs:
    type: int
    value: 1
steps:
  flaky:
    url: http://svc/flaky?n={{variables.currentRetryCount}}
    repeat: 3
`;
      const fetchImpl = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse(503, {}))
        .mockResolvedValueOnce(jsonResponse(503, {}))
        .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
      const { result } = await run(content, fetchImpl);
      expect(result.success).toBe(true);
      expect(fetchImpl).toHaveBeenCalledTimes(3);
      expect(urls(fetchImpl)).toEqual([
        'http://svc/flaky?n=0',
        'http://svc/flaky?n=1',
        'http://svc/flaky?n=2',
      ]);
    });

    it('gives up after repeat retries (repeat + 1 attempts)', async () => {
      const content = `kind: endpoint
name: retry
variables:
  retryBaseDelayMs:
    type: int
    value: 1
steps:
  flaky:
    url: http://svc/flaky
    repeat: 2
`;
      const fetchImpl = jest.fn().mockImplementation(async () => jsonResponse(500, {}));
      const { result } = await run(content, fetchImpl);
      expect(result.success).toBe(false);
      expect(fetchImpl).toHaveBeenCalledTimes(3);
    });
  });
});
