/*eslint-env mocha*/
/*eslint no-invalid-this:0, no-undefined:0*/
var assert = require('power-assert');
var type   = require('type-of');
var helper = require('./_helper');
var cli    = require('../index');

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
        '',
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
      var actual = $('.undef').absolutePath();
      assert(type(actual) === 'undefined');
      done();
    });
  });

  it('hrefが空のa要素を指定してabsolutePathすると空文字を返す', function (done) {
    cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
      var actual = $('.empty').absolutePath();
      assert(actual === '');
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

  describe('filterオプション', function () {
    describe('absolute: false => 絶対URLリンクは除外される', function () {
      it('単一要素 => undefined', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var actual = $('.external').absolutePath({ absolute: false });
          assert(type(actual) === 'undefined');
          done();
        });
      });

      it('複数要素 => 絶対URLリンクを除外したURL配列を返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var expcted = [
            helper.url('auto', 'euc-jp'),
            helper.url('auto', 'euc-jp'),
            helper.url('auto', 'euc-jp'),
            undefined,
            '',
            helper.url('~info?hoge=fuga&piyo='),
            'javascript:history.back();',
            helper.url('form', 'utf-8') + '#hoge',
            helper.url('form', 'xxx')
          ];
          var actual = $('a').absolutePath({ absolute: false });
          assert.deepEqual(actual, expcted);
          done();
        });
      });
    });

    describe('relative: false => 相対URLリンクは除外される', function () {
      it('単一要素 => undefined', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var actual = $('.rel').eq(0).absolutePath({ relative: false });
          assert(type(actual) === 'undefined');
          done();
        });
      });

      it('複数要素 => 相対URLリンクを除外したURL配列を返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var expcted = [
            undefined,
            '',
            'http://www.yahoo.co.jp/',
            'javascript:history.back();'
          ];
          var actual = $('a').absolutePath({ relative: false });
          assert.deepEqual(actual, expcted);
          done();
        });
      });
    });

    describe('invalid: false => URLでないものは除外される', function () {
      it('単一要素(hrefなし) => undefined', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var actual = $('.undef').absolutePath({ invalid: false });
          assert(type(actual) === 'undefined');
          done();
        });
      });

      it('単一要素(空) => undefined', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var actual = $('.empty').absolutePath({ invalid: false });
          assert(type(actual) === 'undefined');
          done();
        });
      });

      it('単一要素(javascript) => undefined', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var actual = $('.js').absolutePath({ invalid: false });
          assert(type(actual) === 'undefined');
          done();
        });
      });

      it('複数要素 => URLでないものを除外したURL配列を返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var expcted = [
            helper.url('auto', 'euc-jp'),
            helper.url('auto', 'euc-jp'),
            helper.url('auto', 'euc-jp'),
            helper.url('~info?hoge=fuga&piyo='),
            'http://www.yahoo.co.jp/',
            helper.url('form', 'utf-8') + '#hoge',
            helper.url('form', 'xxx')
          ];
          var actual = $('a').absolutePath({ invalid: false });
          assert.deepEqual(actual, expcted);
          done();
        });
      });
    });

    describe('複合 => それぞれのfilterが組み合わせる', function () {
      it('absolute:false & relative: false => URLでないもののみ返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var expcted = [
            undefined,
            '',
            'javascript:history.back();'
          ];
          var actual = $('a').absolutePath({
            absolute: false,
            relative: false
          });
          assert.deepEqual(actual, expcted);
          done();
        });
      });

      it('absolute:false & invalid: false => 相対URLのみ返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var expcted = [
            helper.url('auto', 'euc-jp'),
            helper.url('auto', 'euc-jp'),
            helper.url('auto', 'euc-jp'),
            helper.url('~info?hoge=fuga&piyo='),
            helper.url('form', 'utf-8') + '#hoge',
            helper.url('form', 'xxx')
          ];
          var actual = $('a').absolutePath({
            absolute: false,
            invalid: false
          });
          assert.deepEqual(actual, expcted);
          done();
        });
      });

      it('relative:false & invalid: false => 絶対URLのみ返す', function (done) {
        cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
          var expcted = [
            'http://www.yahoo.co.jp/'
          ];
          var actual = $('a').absolutePath({
            relative: false,
            invalid: false
          });
          assert.deepEqual(actual, expcted);
          done();
        });
      });
    });
  });

  describe('img要素', function () {
    before(function () {
      this.base64img = helper.toBase64('fixtures/img/img/sports.jpg');
    });
    after(function () { });

    it('単一要素 => srcに指定したURLを絶対URLにして返す', function (done) {
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        var expected = helper.url('img', 'img/cat').replace(/\.html/, '.png');
        var actual = $('.rel').absolutePath();
        assert(actual === expected);
        done();
      });
    });

    it('複数要素 => 各要素のsrcのURLを絶対URLにした配列を返す', function (done) {
      var _this = this;
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        var base = helper.url('img', '').replace(/\.html/, '');
        var expected = [
          base + '/img/cat.png',
          undefined,
          '',
          base + '/img/food.jpg?hoge=fuga&piyo=',
          'http://www.yahoo.co.jp/favicon.ico',
          'javascript:getPicture();',
          base + '/not-found.gif',
          'data:image/jpg;base64,' + _this.base64img
        ];
        var actual = $('img').absolutePath();
        assert.deepEqual(actual, expected);
        done();
      });
    });

    it('base64はURLでないものとして扱われる', function (done) {
      var _this = this;
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        var actual = $('.base64').absolutePath({ invalid: false });
        assert(type(actual) === 'undefined');
        done();
      });
    });
  });

  describe('a要素とimg要素の複合', function () {
    before(function () {
      this.base64img = helper.toBase64('fixtures/img/img/sports.jpg');
    });
    after(function () { });

    it('各要素のhref/srcのURLを絶対URLにした配列を返す', function (done) {
      var _this = this;
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        var base = helper.url('img', '').replace(/\.html/, '');
        var expected = [
          base + '/img/cat.png',
          undefined,
          '',
          base + '/img/food.jpg?hoge=fuga&piyo=',
          'http://www.yahoo.co.jp/favicon.ico',
          'javascript:getPicture();',
          base + '/not-found.gif',
          'data:image/jpg;base64,' + _this.base64img,
          'http://www.google.co.jp/',
          helper.url('~info?foo=1&bar=2&baz=3')
        ];
        var actual = $('img, a').absolutePath();
        assert.deepEqual(actual, expected);
        done();
      });
    });

    it('filterオプション(外部リンクのみ取得)', function (done) {
      var _this = this;
      cli.fetch(helper.url('img', 'index'), function (err, $, res, body) {
        var base = helper.url('img', '').replace(/\.html/, '');
        var expected = [
          'http://www.yahoo.co.jp/favicon.ico',
          'http://www.google.co.jp/'
        ];
        var actual = $('img, a').absolutePath({ relative: false, invalid: false });
        assert.deepEqual(actual, expected);
        done();
      });
    });
  });
});
