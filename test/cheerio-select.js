/*eslint-env mocha*/
/*eslint no-invalid-this:0, max-len:[1, 150, 2]*/
var assert = require('power-assert');
var type   = require('type-of');
var helper = require('./_helper');
var cli    = require('../index');

describe('cheerio:select', function () {
  before(function () {
    this.server = helper.server();
  });
  after(function () {
    this.server.close();
  });

  describe('select要素', function () {
    it('valueがそのselect要素に存在しない場合はエラーとなる', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $select = $('form[name=select] select').eq(0);
        try {
          $select.select('X');
          assert.fail('not thrown');
        } catch (e) {
          assert(e.message === 'option "X" could not be found in this select element');
        }
        done();
      });
    });

    it('何も指定されていなければ指定したvalueのoptionを選択状態にする', function (done) {
      cli.fetch(helper.url('form', 'utf-8'), function (err, $, res, body) {
        var $select = $('form[name=select] select').eq(0);
        $select.select('B');
        assert($select.val() === 'B');

        //var $select2 = $('form[name=select] select[name=multi]');
        //$select2.select([ '1', '3' ]);
        //console.log($select2.val());

        done();
      });
    });
  });
});
