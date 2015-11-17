/*eslint no-invalid-this:0*/
'use strict';

var util      = require('util');
var urlParser = require('url');
var cutil     = require('./util');

module.exports = function (encoding, client, cheerio) {
  /**
   * ドロップダウンリストの選択をエミュレート
   */
  cheerio.prototype.select = function (values) {
    var $ = cheerio;

    // select要素でなければエラー
    if (this.length === 0) {
      throw new Error('no elements');
    }

    // 複数ある場合は先頭のselectのみ
    var $select = this.eq(0);
    if (! $select.is('select')) {
      throw new Error('element is not select');
    }

    // valuesの型をArrayに統一
    if (! (values instanceof Array)) {
      values = [ values ];
    }

    // values内の1つでもselect要素配下のoptionの中に存在しない場合はエラー
    var options = $select.find('option').map(function (idx) {
      return $(this).attr('value');
    }).get();
    values.forEach(function (v) {
      if (options.indexOf(v) === -1) {
        throw new Error('option "' + v + '" could not be found in this select element');
      }
    });

    // 単一選択selectの場合はvaluesの先頭の値を有効とする
    if (! $select.attr('multiple')) {
      values = values.shift();
    }
    $select.val(values);

    return this;
  };
};
