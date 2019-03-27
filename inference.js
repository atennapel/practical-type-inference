const {
  TFun,
  tmetas,
  prune,
  quantify,
  isTFun,
  tFloat,
  tBool,
} = require('./types');
const { kType } = require('./kinds');
const {
  terr,
  resetId,
  freshTMeta,
  Check,
  Infer,
  instantiate,
  skolemise,
  skolemCheck,
} = require('./util');
const {
  unify,
  unifyTFun,
} = require('./unification');
const {
  skolemCheckEnv,
  tmetasEnv,
  extendVar,
} = require('./env');
const { inferKind } = require('./kindInference');

const checkRho = (env, term, ty) => {
  // console.log(`checkRho ${showTerm(term)} : ${showTy(ty)}`);
  return tcRho(env, term, Check(ty));
};
const inferRho = (env, term) => {
  // console.log(`inferRho ${showTerm(term)}`);
  const i = Infer();
  tcRho(env, term, i);
  if (!i.type) return terr(`inferRho failed`);
  return i.type;
};

const tcRho = (env, term, ex) => {
  // console.log(`tcRho ${showTerm(term)} : ${showEx(ex)}`);
  if (term.tag === 'Var') {
    const ty = env.vars[term.name];
    if (!ty) return terr(`undefined var: ${term.name}`);
    return instSigma(env, ty, ex);
  }
  if (term.tag === 'Lit')
    return instSigma(env, tFloat, ex);
  if (term.tag === 'App') {
    const ty = inferRho(env, term.left);
    const { left: { right: left }, right } = unifyTFun(env, ty);
    checkSigma(env, term.right, left);
    return instSigma(env, right, ex);
  }
  if (term.tag === 'Abs') {
    if (ex.tag === 'Check') {
      const { left: { right: left }, right } = unifyTFun(env, ex.type);
      const nenv = extendVar(env, term.name, left);
      return checkRho(nenv, term.body, right);
    } else if (ex.tag === 'Infer') {
      const ty = freshTMeta(kType);
      const nenv = extendVar(env, term.name, ty);
      const bty = inferRho(nenv, term.body);
      return ex.type = TFun(ty, bty);
    }
  }
  if (term.tag === 'AbsT') {
    const type = inferKind(env, term.type);
    if (ex.tag === 'Check') {
      const { left: { right: left }, right } = unifyTFun(env, ex.type);
      subsCheck(env, left, type);
      const nenv = extendVar(env, term.name, type);
      return checkRho(nenv, term.body, right);
    } else if (ex.tag === 'Infer') {
      const nenv = extendVar(env, term.name, type);
      const bty = inferRho(nenv, term.body);
      return ex.type = TFun(type, bty);
    }
  }
  if (term.tag === 'If') {
    if (ex.tag === 'Check') {
      checkRho(env, term.cond, tBool);
      tcRho(env, term.then_, ex);
      tcRho(env, term.else_, ex);
      return;
    } else if (ex.tag === 'Infer') {
      checkRho(env, term.cond, tBool);
      const ty1 = inferRho(env, term.then_);
      const ty2 = inferRho(env, term.else_);
      subsCheck(env, ty1, ty2);
      subsCheck(env, ty2, ty1);
      return ex.type = ty1;
    }
  }
  if (term.tag === 'Let') {
    const ty = inferSigma(env, term.val);
    const nenv = extendVar(env, term.name, ty);
    return tcRho(nenv, term.body, ex);
  }
  if (term.tag === 'Ann') {
    const type = inferKind(env, term.type);
    checkSigma(env, term.term, type);
    return instSigma(env, type, ex);
  }
};

const inferSigma = (env, term) => {
  // console.log(`inferSigma ${showTerm(term)}`);
  const ty = inferRho(env, term);
  const etms = tmetasEnv(env);
  const tms = tmetas(prune(ty), etms);
  return quantify(tms, ty);
};

const checkSigma = (env, term, ty) => {
  // console.log(`checkSigma ${showTerm(term)} : ${showTy(ty)}`);
  const sk = [];
  const rho = skolemise(ty, sk);
  checkRho(env, term, rho);
  skolemCheck(sk, prune(ty));
  skolemCheckEnv(sk, env);
};

const subsCheck = (env, a, b) => {
  // console.log(`subsCheck ${showTy(a)} <: ${showTy(b)}`);
  const sk = [];
  const rho = skolemise(b, sk);
  subsCheckRho(env, a, rho);
  skolemCheck(sk, prune(a));
  skolemCheck(sk, prune(b));
};
const subsCheckRho = (env, a, b) => {
  // console.log(`subsCheckRho ${showTy(a)} <: ${showTy(b)}`);
  if (a.tag === 'TForall')
    return subsCheckRho(env, instantiate(a), b);
  if (isTFun(b))
    return subsCheckTFun(env, unifyTFun(env, a), b);
  if (isTFun(a))
    return subsCheckTFun(env, a, unifyTFun(env, b));
  return unify(env, a, b);
};
const subsCheckTFun = (env, a, b) => {
  // console.log(`subsCheckTFun ${showTy(a)} <: ${showTy(b)}`);
  subsCheck(env, b.left.right, a.left.right);
  return subsCheck(env, a.right, b.right);
};

const instSigma = (env, ty, ex) => {
  // console.log(`instSigma ${showTy(ty)} @ ${showEx(ex)}`);
  if (ex.tag === 'Check')
    return subsCheckRho(env, ty, ex.type);
  return ex.type = instantiate(ty);
};

const infer = (env, term) => {
  resetId();
  return prune(inferSigma(env, term));
};

module.exports = {
  infer,
};
