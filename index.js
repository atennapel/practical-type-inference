const {
  Var,
  App,
  Abs,
  AbsT,
  Let,
  Ann,
  showTerm,
} = require('./terms');
const {
  TFun,
  TVar,
  TForall,
  showTy,
} = require('./types');
const inferHM = require('./HM').infer;
const inferHR = require('./HR').infer;

const tv = TVar;
function tfun() { return Array.prototype.slice.call(arguments).reduceRight((x, y) => TFun(y, x)) }

const v = Var;
function app() { return Array.prototype.slice.call(arguments).reduce(App) }
const abs = (ns, body) => ns.reduceRight((x, y) => Array.isArray(y) ? AbsT(y[0], y[1], x) : Abs(y, x), body);

const tid = TForall(['t'], tfun(tv('t'), tv('t')));

const env = {
  id: tid,
};
const term = Ann(v('id'), tid);
try {
  console.log(showTerm(term));
  time = Date.now();
  const ty = inferHR(env, term);
  time = Date.now() - time;
  console.log(`${time}`);
  console.log(showTy(ty));
} catch (err) {
  console.log(`${err}`);
}

