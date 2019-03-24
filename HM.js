const { showTerm } = require('./terms');
const {
  TFun,
  tmetas,
  prune,
  quantify,
} = require('./types');
const {
  terr,
  resetId,
  freshTMeta,
  extend,
  Check,
  Infer,
  showEx,
  instantiate,
  skolemise,
  tmetasEnv,
  skolemCheck,
  skolemCheckEnv,
} = require('./util');
const {
  unify,
  unifyTFun,
} = require('./unification');

const checkRho = (env, term, ty) => tcRho(env, term, Check(ty));
const inferRho = (env, term) => {
  const i = Infer();
  tcRho(env, term, i);
  if (!i.type) return terr(`inferRho failed`);
  return i.type;
};

const tcRho = (env, term, ex) => {
  // console.log(`tcRho ${showTerm(term)} : ${showEx(ex)}`);
  if (term.tag === 'Var') {
    const ty = env[term.name];
    if (!ty) return terr(`undefined var: ${term.name}`);
    return instSigma(ty, ex);
  }
  if (term.tag === 'App') {
    const ty = inferRho(env, term.left);
    const fn = unifyTFun(ty);
    checkSigma(env, term.right, fn.left);
    return instSigma(fn.right, ex);
  }
  if (term.tag === 'Abs') {
    if (ex.tag === 'Check') {
      const fn = unifyTFun(ex.type);
      const nenv = extend(env, term.name, fn.left);
      return checkRho(nenv, term.body, fn.right);
    } else if (ex.tag === 'Infer') {
      const ty = freshTMeta();
      const nenv = extend(env, term.name, ty);
      const bty = inferRho(nenv, term.body);
      return ex.type = TFun(ty, bty);
    }
  }
  if (term.tag === 'AbsT')
    return terr(`annotated abstractions not supported by hindley-milner`);
  if (term.tag === 'Let') {
    const ty = inferSigma(env, term.val);
    const nenv = extend(env, term.name, ty);
    return tcRho(nenv, term.body, ex);
  }
  if (term.tag === 'Ann') {
    checkSigma(env, term.term, term.type);
    return instSigma(term.type, ex);
  }
};

const inferSigma = (env, term) => {
  const ty = inferRho(env, term);
  const etms = tmetasEnv(env);
  const tms = tmetas(prune(ty), etms);
  return quantify(tms, ty);
};

const checkSigma = (env, term, ty) => {
  const sk = [];
  const rho = skolemise(ty, sk);
  checkRho(env, term, rho);
  skolemCheck(sk, prune(ty));
  skolemCheckEnv(sk, env);
};

const instSigma = (ty, ex) => {
  const ity = instantiate(ty);
  if (ex.tag === 'Check') return unify(ity, ex.type);
  return ex.type = ity;
};

const infer = (env, term) => {
  resetId();
  return prune(inferSigma(env, term));
};

module.exports = {
  infer,
};

