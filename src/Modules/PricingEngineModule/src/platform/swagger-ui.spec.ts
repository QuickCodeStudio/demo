import {
  isSwaggerPath,
  rewriteSwaggerIndexHtmlUrl,
} from './swagger-ui';

describe('swagger-ui C# Gateway path contract', () => {
  it('rewrites Swashbuckle /swagger/index.html onto Nest /swagger', () => {
    expect(rewriteSwaggerIndexHtmlUrl('/swagger/index.html')).toBe('/swagger');
    expect(rewriteSwaggerIndexHtmlUrl('/swagger/index.html?foo=1')).toBe(
      '/swagger?foo=1',
    );
  });

  it('leaves other swagger URLs unchanged', () => {
    expect(rewriteSwaggerIndexHtmlUrl('/swagger')).toBe('/swagger');
    expect(rewriteSwaggerIndexHtmlUrl('/swagger/')).toBe('/swagger/');
    expect(rewriteSwaggerIndexHtmlUrl('/swagger/v1/swagger.json')).toBe(
      '/swagger/v1/swagger.json',
    );
    expect(rewriteSwaggerIndexHtmlUrl('/api/foo')).toBe('/api/foo');
  });

  it('detects swagger asset and spec paths', () => {
    expect(isSwaggerPath('/swagger')).toBe(true);
    expect(isSwaggerPath('/swagger/index.html')).toBe(true);
    expect(isSwaggerPath('/swagger/v1/swagger.json')).toBe(true);
    expect(isSwaggerPath('/hc')).toBe(false);
    expect(isSwaggerPath('/api/pricing-engine-module/campaigns')).toBe(false);
  });
});
