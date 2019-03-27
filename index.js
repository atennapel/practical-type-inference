const {
  Var,
  App,
  Abs,
  AbsT,
  Let,
  Ann,
  If,
  Lit,
  showTerm,
} = require('./terms');
const {
  TCon,
  TApp,
  TFun,
  TVar,
  TForall,
  showTy,
  tBool,
} = require('./types');
const { kType, KFun } = require('./kinds');
const { infer } = require('./inference');
const { Env, initialEnv } = require('./env');

function kfun() { return Array.prototype.slice.call(arguments).reduceRight((x, y) => KFun(y, x)) }

const tv = TVar;
function tfun() { return Array.prototype.slice.call(arguments).reduceRight((x, y) => TFun(y, x)) }
function tapp() { return Array.prototype.slice.call(arguments).reduce(TApp) }
const tforall = (tvs, ty) => TForall(tvs, null, ty);

const v = Var;
function app() { return Array.prototype.slice.call(arguments).reduce(App) }
const abs = (ns, body) => ns.reduceRight((x, y) => Array.isArray(y) ? AbsT(y[0], y[1], x) : Abs(y, x), body);

const tid = TForall(['t'], [kType], tfun(tv('t'), tv('t')));
const ListC = TCon('List');
const List = t => tapp(ListC, t);

const env = initialEnv;
env.vars.id = tid;
env.vars.singleton = TForall(['t'], [kType], TFun(tv('t'), List(tv('t'))));
env.vars.refl = TForall(['f', 'a', 'b'], [KFun(kType, kType), kType, kType], TFun(tapp(tv('f'), tv('a')), tapp(tv('f'), tv('b'))));
env.tcons.List = kfun(kType, kType);

const t1 = Ann(abs(['x', 'y', 'z'], v('z')), tfun(tBool, TForall(['a'], [], tfun(tBool, tv('a'), tv('a')))));
const t2 = Ann(abs(['x', 'y', 'z'], v('z')), tfun(tBool, tBool, TForall(['a'], [], tfun(tv('a'), tv('a')))));
const term = If(v('True'), t1, t2);
try {
  console.log(showTerm(term));
  time = Date.now();
  const ty = infer(env, term);
  time = Date.now() - time;
  console.log(`${time}`);
  console.log(showTy(ty));
} catch (err) {
  console.log(`${err}`);
  console.log(err);
}

