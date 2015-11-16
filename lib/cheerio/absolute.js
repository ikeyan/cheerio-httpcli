/*eslint no-invalid-this:0,no-undefined:0*/
'use strict';

var urlParser = require('url');
var cutil     = require('./util');

module.exports = function (encoding, client, cheerio) {
  /**
   * a要素/img要素の絶対URLを取得
   *
   * @return 絶対URLもしくはその配列
   */
  cheerio.prototype.absolutePath = function () {
    var doc = cutil.documentInfo(this);
    var $ = cheerio;
    var result = [];

    // a要素/img要素でなければエラー
    this.each(function () {
      var $elem = $(this);
      var is = {
        a: $elem.is('a'),
        img: $elem.is('img')
      };
      if (! is.a && ! is.img) {
        throw new Error('element is not link or img');
      }
      var url = $elem.attr((is.a) ? 'href' : 'src');
      result.push((url) ? urlParser.resolve(doc.url, url) : undefined);
    });

    // 要素数が1の場合は配列でなく文字列で返す
    return (this.length === 1) ? result[0] : result;
  };
};
