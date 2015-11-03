/*eslint no-invalid-this:0, no-console:0*/
'use strict';

var cheerio   = require('cheerio');
var util      = require('util');
var assert    = require('assert');
var urlParser = require('url');
var ent       = require('ent');

/**
 * 汎用関数 - エンティティのデコード
 *
 * @param str エンティティ化された文字列
 */
var decodeEntities = function (str) {
  // 文字列でない場合(cheerioオブジェクトなど)はそのまま返す
  if (typeof str !== 'string') {
    return str;
  }
  return ent.decode(str);
};

/**
 * 汎用関数 - パラメータの正規化
 *
 * @param val GET/POSTパラメータ
 */
var paramFilter = function (val) {
  // 0はパラメータとして有効なので残す
  // null/undefinedは空文字にして返す
  if (typeof val !== 'number' && ! val) {
    val = '';
  }
  return val;
};

/**
 * cheerioオブジェクト拡張モジュール(プロトタイプにメソッド追加)
 */
module.exports = function (encoding, client) {
  /**
   * cheerioデフォルトのtext(), html()メソッドはエンティティ表記をそのまま返すので
   * 上記メソッドを拡張してエンティティもデコードした状態で返すようにする
   *
   * @param str 指定した場合はその文字列を要素のテキスト(HTML)として設定
   *            指定しない場合は要素に設定されているテキスト(HTML)を返す
   */
  // cheerioデフォルトのメソッドを'_'付きで退避
  cheerio.prototype._text = cheerio.prototype.text;
  cheerio.prototype._html = cheerio.prototype.html;

  cheerio.prototype.text = function (str) {
    // cheerioデフォルトのtext()結果をデコード(エンティティ可読文字化)したものを返す
    return decodeEntities(this._text(str));
  };

  cheerio.prototype.html = function (str) {
    // cheerioデフォルトのhtml()結果をデコード(エンティティ可読文字化)したものを返す
    return decodeEntities(this._html(str));
  };

  /**
   * a要素のリンクのクリックをエミュレート(リンク先のページを取得)
   *
   * @param callback リクエスト完了時のコールバック関数(err, response, body(buffer))
   */
  cheerio.prototype.click = function (callback) {
    var doc = this._root[0]._documentInfo;
    var $ = cheerio;
    var $link = null;

    // a要素でなければエラー
    try {
      assert.ok(this.length > 0);
      // 複数ある場合は先頭の要素のみ
      $link = $(this[0]);
      // submit系要素の場合はsubmit()に飛ばす
      var type = $link.attr('type');
      var is = {
        input: $link.is('input'),
        button: $link.is('button')
      };
      if ((is.input || is.button) && [ 'submit', 'image' ].indexOf(type) !== -1) {
        var $form = $link.closest('form');
        $form._root = [{
          _documentInfo: this._root[0]._documentInfo
        }];
        var param = {};
        var name = paramFilter($link.attr('name'));
        if (name.length > 0) {
          if (type === 'submit') {
            // submit: 押したボタンのnameとvalueを送信する
            param[name] = $link.val() || $link.attr('value');
          } else {
            // image: 押したボタンのname.xとname.y座標を送信する(ダミーなので0)
            param[name + '.x'] = 0;
            param[name + '.y'] = 0;
          }
        }
        return $form.submit(param, callback);
      }
      // submit系要素でもa要素でもなければエラー
      assert.ok($link.is('a'));
    } catch (e) {
      return client.error('element is not clickable', {
        param: { uri: doc.url },
        callback: callback
      });
    }

    var url = urlParser.resolve(doc.url, $link.attr('href'));
    return client.run('GET', url, callback);
  };

  /**
   * form要素からの送信をエミュレート
   *
   * @param param      疑似設定するフォーム送信パラメータ
   * @param callback   リクエスト完了時のコールバック関数(err, response, body(buffer))
   */
  cheerio.prototype.submit = function (param, callback) {
    if (param instanceof Function) {
      callback = param;
      param = {};
    }
    param = param || {};

    var doc = this._root[0]._documentInfo;
    var $ = cheerio;
    var $form = null;

    // form要素でなければエラー
    try {
      assert.ok(this.length > 0);
      // 複数ある場合は先頭のフォームのみ
      $form = $(this[0]);
      assert.ok($form.is('form'));
    } catch (e) {
      return client.error('element is not form', {
        param: { uri: doc.url },
        callback: callback
      });
    }

    // フォーム送信パラメータ作成
    var formParam = {};
    $form.find('input,textarea,select').each(function (idx) {
      var name = $(this).attr('name');
      var type = $(this).attr('type');
      var value = $(this).val() || $(this).attr('value');
      if (! name) {
        return;
      }
      // submit系要素はjavascriptでform.submit()した時にはパラメータとして付加しない
      // (ブラウザと同じ挙動)
      if ([ 'submit', 'image' ].indexOf(type) !== -1) {
        return;
      }
      formParam[name] = formParam[name] || [];
      if (/(checkbox|radio)/i.test(type) && ! $(this).attr('checked')) {
        return;
      }
      if (util.isArray(value)) {
        formParam[name] = formParam[name].concat(value);
      } else {
        formParam[name].push(paramFilter(value));
      }
    });

    // フォーム内のデフォルトパラメータを引数で指定したパラメータで上書き
    Object.keys(param).forEach(function (p) {
      var fparam = paramFilter(param[p]);
      formParam[p] = (util.isArray(fparam)) ? fparam : [ fparam ];
    });

    // 空パラメータでもname=のみで送信するための仕込み
    Object.keys(formParam).forEach(function (p) {
      if (formParam[p].length === 0) {
        formParam[p].push('');
      }
    });

    // 各種エンコーディングに対応したURLエンコードをする必要があるのでパラメータ文字列を自力で作成
    var formParamStr = '';
    Object.keys(formParam).forEach(function (p) {
      var fp = formParam[p];
      for (var i = 0; i < fp.length; i++) {
        var escval = encoding.escape(doc.encoding, fp[i]);
        formParamStr += '&' + p + '=' + escval;
      }
    });
    if (formParamStr.length > 0) {
      formParamStr = formParamStr.substr(1);
    }

    var url = urlParser.resolve(doc.url, $form.attr('action') || '');
    var method = ($form.attr('method') || 'GET').toUpperCase();
    // GETの場合はURLに繋げてパラメータを空にする(そうしないと上手く動かないケースがたまにあった)
    if (method === 'GET') {
      var join = (url.indexOf('?') === -1) ? '?' : '&';
      if (formParamStr.length > 0) {
        url += join + formParamStr;
      }
      formParamStr = {};
    }
    return client.run(method, url, formParamStr, callback);
  };

  var emulateTick = function (elem, checked) {
    var $ = cheerio;

    // input[type=checkbox/radio]要素でなければ警告表示
    $(elem).each(function (i) {
      var type = $(this).attr('type');
      if (! $(this).is('input') || [ 'checkbox', 'radio' ].indexOf(type) === -1) {
        throw new Error('element is not checkbox and radio');
      }
      if (checked) {
        $(this).attr('checked', checked);
      } else {
        $(this).removeAttr('checked');
      }
    });

    return elem;
  };

  /**
   * チェックボックス/ラジオボタンの選択クリックをエミュレート(選択状態にする)
   */
  cheerio.prototype.tick = function () {
    return emulateTick(this, 'checked');
  };

  /**
   * チェックボックス/ラジオボタンの選択クリックをエミュレート(選択状態を解除する)
   */
  cheerio.prototype.untick = function () {
    return emulateTick(this);
  };

  return cheerio;
};
