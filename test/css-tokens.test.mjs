import assert from 'node:assert/strict';
import test from 'node:test';
import { cssTokens, preprocessCss } from '../scripts/lib/css-tokens.mjs';

const summary = (css) => cssTokens(css).filter((token) => token.type !== 'whitespace').map((token) => `${token.type}:${token.value}`);

// The nineteenth drain review: comments were cut without regard to escapes,
// strings or url(), so an escaped `\/*` hid the rules after it.
test('comments, strings and url() come apart as the CSS tokenizer takes them', () => {
  assert.deepEqual(summary('a{} /* x */ b{}'), ['ident:a', '{:{', '}:}', 'ident:b', '{:{', '}:}']);
  assert.deepEqual(summary('url/**/(x)'), ['ident:url', '(:(', 'ident:x', '):)'], 'a comment still separates tokens');
  assert.deepEqual(summary('a\\/* url(x) */'), ['ident:a/', 'delim:*', 'url:x', 'delim:*', 'delim:/'], 'an escaped slash opens no comment');
  assert.deepEqual(summary('@import "data:text/css,/*";@import "b.css";'), ['at-keyword:import', 'string:data:text/css,/*', ';:;', 'at-keyword:import', 'string:b.css', ';:;'], 'nor does one in a string');
  assert.deepEqual(summary('b{background:url(https://z.example/*.png)} /* gone */'), ['ident:b', '{:{', 'ident:background', ':::', 'url:https://z.example/*.png', '}:}'], 'nor in an unquoted url()');
  assert.deepEqual(summary('c{content:"\\"/*"} /* gone */ d{}'), ['ident:c', '{:{', 'ident:content', ':::', 'string:"/*', '}:}', 'ident:d', '{:{', '}:}']);
  assert.deepEqual(summary('e{} /* unterminated'), ['ident:e', '{:{', '}:}']);
  assert.deepEqual(summary('myurl(/* x */)'), ['function:myurl', '):)'], 'a function other than url() takes comments');
});

// The twenty-third: an escaped CRLF continued a string the scanner ended, a
// lone CR or form feed didn't end one, and url( was looked for within 64
// characters only.
test('CRLF, CR and form feed are newlines first, and url( is read at any distance', () => {
  assert.equal(preprocessCss('a\r\nb\rc\fd\0'), `a\nb\nc\nd${String.fromCharCode(0xfffd)}`);
  assert.deepEqual(summary('"a\\\r\nb"'), ['string:ab'], 'an escaped CRLF continues the string');
  assert.deepEqual(summary('"a\rb"').slice(0, 2), ['bad-string:a', 'ident:b'], 'a lone CR ends it');
  assert.deepEqual(summary(`url(${' '.repeat(61)}"x)/*")`), ['function:url', 'string:x)/*', '):)']);
  assert.deepEqual(summary('url(  x  )'), ['url:x']);
  assert.deepEqual(summary('url(x y)'), ['bad-url:']);
  assert.deepEqual(summary('url(a"b)c'), ['bad-url:', 'ident:c'], 'a quote inside an unquoted url() makes it bad up to the paren');
  assert.deepEqual(summary('u\\72l(x)'), ['url:x'], 'an escaped name is still url');
  assert.deepEqual(summary('url(https\\3a //x.example/a)'), ['url:https://x.example/a']);
  assert.deepEqual(summary('@\\69mport "a"'), ['at-keyword:import', 'string:a']);
});
