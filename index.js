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
  TCon,
  TApp,
  TFun,
  TVar,
  TForall,
  showTy,
} = require('./types');
const { infer } = require('./inference');

const tv = TVar;
function tfun() { return Array.prototype.slice.call(arguments).reduceRight((x, y) => TFun(y, x)) }
function tapp() { return Array.prototype.slice.call(arguments).reduce(TApp) }

const v = Var;
function app() { return Array.prototype.slice.call(arguments).reduce(App) }
const abs = (ns, body) => ns.reduceRight((x, y) => Array.isArray(y) ? AbsT(y[0], y[1], x) : Abs(y, x), body);

const tid = TForall(['t'], tfun(tv('t'), tv('t')));
const ListC = TCon('List');
const List = t => tapp(ListC, t);

const env = {
  id: tid,
  singleton: TForall(['t'], TFun(tv('t'), List(tv('t')))),
};
const term = app(v('singleton'), v('id'));
try {
  console.log(showTerm(term));
  time = Date.now();
  const ty = infer(env, term);
  time = Date.now() - time;
  console.log(`${time}`);
  console.log(showTy(ty));
} catch (err) {
  console.log(`${err}`);
}
