module.exports = function (val, err_text) {
  if (!val) throw new TypeError('Assert Error: ' + err_text + ', [VALUE HERE]: ' + val);
}
