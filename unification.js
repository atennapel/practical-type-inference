const {
  isTFun,
  TFun,
  showTy,
  occursTMeta,
} = require('./types');
const {
  kType,
  eqKind,
  showKind,
} = require('./kinds');
const {
  terr,
  freshTMeta,
} = require('./util');

const kindOf = (env, t) => {
  if (t.tag === 'TMeta') return t.kind;
  if (t.tag === 'TSkol') return t.kind;
  if (t.tag === 'TCon')
    return env.tcons[t.name] || terr(`undefined type constructor ${showTy(t)}`);
  if (t.tag === 'TApp') {
    const f = kindOf(env, t.left);
    if (f.tag !== 'KFun')
      return terr(`not a kind fun in left side of type application (${showTy(t)}): ${showKind(f)}`);
    return f.right;
  }
  if (t.tag === 'TForall') return terr(`tforall ${showTy(t)} in kindOf`);
  if (t.tag === 'TVar') return terr(`tvar ${showTy(t)} in kindOf`);
};

const bindVar = (env, x, t) => {
  if (x.type) return unify(env, x.type, t);
  if (t.tag === 'TMeta' && t.type) return unify(env, x, t.type);
  if (occursTMeta(x, t)) return terr(`${showTy(x)} occurs in ${showTy(t)}`);
  const k1 = kindOf(env, x);
  const k2 = kindOf(env, t);
  if (!eqKind(k1, k2))
    return terr(`kind mismatch in unification of ${showTy(x)} ~ ${showTy(t)}: ${showKind(k1)} ~ ${showKind(k2)}`);
  x.type = t;
};
const unify = (env, a, b) => {
  if (a.tag === 'TVar' || b.tag === 'TVar')
    return terr(`tvar in unify: ${showTy(a)} ~ ${showTy(b)}`);
  if (a === b) return;
  if (a.tag === 'TMeta') return bindVar(env, a, b);
  if (b.tag === 'TMeta') return bindVar(env, b, a);
  if (a.tag === 'TApp' && b.tag === 'TApp') {
    unify(env, a.left, b.left);
    return unify(env, a.right, b.right);
  }
  if (a.tag === 'TSkol' && b.tag === 'TSkol' && a.id === b.id) return;
  if (a.tag === 'TCon' && b.tag === 'TCon' && a.name === b.name) return;
  return terr(`failed to unify: ${showTy(a)} ~ ${showTy(b)}`);
};

const unifyTFun = (env, ty) => {
  if (isTFun(ty)) return ty;
  const fn = TFun(freshTMeta(kType), freshTMeta(kType));
  unify(env, ty, fn);
  return fn;
};

module.exports = {
  unify,
  unifyTFun,
};

