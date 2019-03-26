const {
  TApp,
  TForall,
} = require('./types');
const {
  showKind,
  pruneKind,
  occursKMeta,
} = require('./kinds');
const {
  freshKMeta,
} = require('./util');

const bindKMeta = (env, x, t) => {
  if (x.kind) return unifyKind(env, x.kind, t);
  if (t.tag === 'KMeta' && t.kind) return unifyKind(env, x, t.kind);
  if (occursKMeta(x, t)) return terr(`${showTy(x)} occurs in ${showTy(t)}`);
  x.kind = t;
};
const unifyKind = (a, b) => {
  if (a === b) return;
  if (a.tag === 'KMeta') return bindKMeta(env, a, b);
  if (b.tag === 'KMeta') return bindKMeta(env, b, a);
  if (a.tag === 'KFun' && b.tag === 'KFun') {
    unifyKind(env, a.left, b.left);
    return unifyKind(env, a.right, b.right);
  }
  if (a.tag === 'KCon' && b.tag === 'KCon' && a.name === b.name) return;
  return terr(`failed to unify kinds: ${showKind(a)} ~ ${showKind(b)}`);
};

const inferKindR = t => {
  if (t.tag === 'TMeta')
  if (t.tag === 'TVar')
  if (t.tag === 'TSkol')
  if (t.tag === 'TCon')
  if (t.tag === 'TApp')
  if (t.tag === 'TForall')
  return terr('unimplemented');
};

const defaultKind = t => {
  if (t.tag === 'TApp') {
    const l = defaultKind(t.left);
    const r = defaultKind(t.right);
    return l === t.left && r === t.right ? t : TApp(l, r);
  }
  if (t.tag === 'TForall') {
    
  }
  return t;
};

const inferKind = ty => {
  const ti = inferKindR(ty);
  return defaultKind(ti);
};

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

module.exports = {
  inferKind,
  kindOf,
};

