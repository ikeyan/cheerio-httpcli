/*eslint-env mocha*/
/*eslint no-invalid-this:0, quote-props:0, no-undefined:0, max-len:[1, 150, 2]*/
/*jscs:disable requireDotNotation*/
var assert = require('power-assert');
var type   = require('type-of');
var helper = require('./_helper');
var cli    = require('../index');

//TODO: img, a/img, absolutePath(true)
describe('cheerio:absolutePath', function () {
  before(function () {
    this.server = helper.server();
  });
  after(function () {
    this.server.close();
  });

  describe('対応していない要素のabsolutePathはエラーとなる', function () {
    [
      'html',
      'body',
      'div',
      'form',
      'textarea',
      'input[type=reset]',
      'input[type=checkbox]',
      'input[type=radio]',
      'select'
    ].forEach(function (elem) {
      it(elem, function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          try {
            $(elem).eq(0).absolutePath();
            assert.fail('not thrown');
          } catch (e) {
            assert(e.message === 'element is not link or img');
          }
          done();
        });
      });
    });
  });

  describe('要素数0のabsolutePathは[]を返す', function () {
    [
      'header',
      'p',
      'span',
      'input[type=button]'
    ].forEach(function (elem) {
      it(elem, function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var actual = $(elem).eq(0).absolutePath();
          assert(type(actual) === 'array');
          assert(actual.length === 0);
          done();
        });
      });
    });
  });

  it('相対パスリンクのabsolutePathは現在のページを基準にした絶対URLを返す', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var actual = $('.rel').eq(0).absolutePath();
      assert(actual === helper.url('auto', 'euc-jp'));
      done();
    });
  });

  it('外部URLリンクのabsolutePathはそのURLをそのまま返す', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var actual = $('.external').absolutePath();
      assert(actual === 'http://www.yahoo.co.jp/');
      done();
    });
  });

  it('ルートからの絶対パスリンクのabsolutePathはドキュメントルートを基準にした絶対URLを返す', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var actual = $('.root').absolutePath();
      assert(actual === helper.url('~info') + '?hoge=fuga&piyo=');
      done();
    });
  });

  it('javascriptリンクのabsolutePathはそのまま返す(javascript:...)', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var actual = $('.js').absolutePath();
      assert(actual === 'javascript:history.back();');
      done();
    });
  });

  it('ハッシュリンクのabsolutePathは現在のページのURLの末尾にハッシュを追加して返す', function (done) {
    var url = helper.url('form', 'utf-8');
    cli.fetch(url, function (err, $, res, body) {
      var actual = $('.hash').absolutePath();
      assert(actual === url + '#hoge');
      done();
    });
  });

  it('複数のa要素を指定してabsolutePathすると絶対URLの配列を返す', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var expcted = [
        helper.url('auto', 'euc-jp'),
        helper.url('auto', 'euc-jp'),
        helper.url('auto', 'euc-jp'),
        undefined,
        helper.url('~info?hoge=fuga&piyo='),
        'http://www.yahoo.co.jp/',
        'javascript:history.back();',
        helper.url('form', 'utf-8') + '#hoge',
        helper.url('form', 'xxx')
      ];
      var actual = $('a').absolutePath();
      assert.deepEqual(actual, expcted);
      done();
    });
  });

  it('hrefが指定されたいないa要素を指定してabsolutePathするとundefinedを返す', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var actual = $('.empty').absolutePath();
      assert(type(actual) === 'undefined');
      done();
    });
  });

  [ 0, 1, 2 ].forEach(function (idx) {
    it('生のa要素のabsolutePathでも絶対URLを取得できる(' + idx + '番目)', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var actual = $($('.rel')[idx]).absolutePath();
        assert(actual === helper.url('auto', 'euc-jp'));
        done();
      });
    });
  });

  it('無から作成したa要素のabsolutePathでも絶対URLを取得できる(jQuery形式)', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var actual = $('<a/>').attr('href', '../auto/shift_jis.html').absolutePath();
      assert(actual === helper.url('auto', 'shift_jis'));
      done();
    });
  });

  it('無から作成したa要素をclickしてもリンク先を取得できる(HTML形式)', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var actual = $('<a href="/top.php?login=1">link</a>').absolutePath();
      assert(actual === helper.url('top.php?login=1'));
      done();
    });
  });
});
