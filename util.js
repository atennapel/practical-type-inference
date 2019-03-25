const {
  TFun,
  TMeta,
  TSkol,
  showTy,
  prune,
  tmetas,
  substTVar,
  isTFun,
} = require('./types');
const { KMeta } = require('./kinds');

const terr = msg => { throw new TypeError(msg) };

let _id = 0;
const resetId = () => { _id = 0 };
const freshId = () => _id++;

const freshTMeta = () => TMeta(freshId());
const freshTSkol = name => TSkol(name, freshId());
const freshKMeta = () => KMeta(freshId());

const extend = (env, x, t) => {
  const n = Object.create(env);
  n[x] = t;
  return n;
};

const Check = type => ({ tag: 'Check', type });
const Infer = () => ({ tag: 'Infer', type: null });
const showEx = ex => {
  if (ex.tag === 'Check') return `Check(${showTy(ex.type)})`;
  if (ex.tag === 'Infer') return `Infer(${ex.type ? showTy(ex.type) : '...'})`;
};

const instantiate = ty => {
  if (ty.tag !== 'TForall') return ty;
  const m = {};
  for (let i = 0, l = ty.tvs.length; i < l; i++)
    m[ty.tvs[i]] = freshTMeta();
  return substTVar(m, ty.type);
};

const skolemise = (ty, sk = []) => {
  if (ty.tag === 'TForall') {
    const m = {};
    for (let i = 0, l = ty.tvs.length; i < l; i++) {
      const k = freshTSkol(ty.tvs[i]);
      m[ty.tvs[i]] = k;
      sk.push(k);
    }
    return skolemise(substTVar(m, ty.type), sk);
  }
  if (isTFun(ty)) {
    const { left: { right: left }, right } = ty;
    const b = skolemise(right, sk);
    return b === right ? ty : TFun(left, b);
  }
  return ty;
};

const tmetasEnv = (env, free = [], tms = []) => {
  for (let k in env) tmetas(prune(env[k]), free, tms);
  return tms;
};

const skolemCheck = (sk, ty) => {
  if (ty.tag === 'TSkol' && sk.indexOf(ty) >= 0)
    return terr(`skolem check failed: ${showTy(ty)}`);
  if (ty.tag === 'TApp') {
    skolemCheck(sk, ty.left);
    return skolemCheck(sk, ty.right);
  }
  if (ty.tag === 'TForall')
    return skolemCheck(sk, ty.type);
};
const skolemCheckEnv = (sk, env) => {
  for (let k in env) skolemCheck(sk, prune(env[k]));
};

module.exports = {
  terr,
  resetId,
  freshId,
  freshTMeta,
  freshTSkol,
  freshKMeta,

  extend,
  Check,
  Infer,
  showEx,

  instantiate,
  skolemise,

  tmetasEnv,
  skolemCheck,
  skolemCheckEnv,
};

